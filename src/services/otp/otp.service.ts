import {
  Injectable,
  BadRequestException,
  ConflictException,
  Inject,
  forwardRef,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { UsersService } from '../users/users.service';
import { InjectModel } from '@nestjs/mongoose';
import { Otp, OtpDocument } from '../../db/models/otp.schema';
import { Model } from 'mongoose';
import { AuthService } from '../auth/auth.service';
import { CreateUserDto } from '../../dto/create-user.dto';
import { UpdateUserDto } from '../../dto/update-user.dto';

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  constructor(
    @InjectModel(Otp.name) private otpModel: Model<OtpDocument>,
    @InjectQueue('email') private emailQueue: Queue,
    private usersService: UsersService,
    @Inject(forwardRef(() => AuthService)) private authService: AuthService,
    private configService: ConfigService,
    @Inject('REDIS_CLIENT') private readonly redisClient: Redis,
  ) {}

  generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async sendOtp(email: string, password?: string, type: string = 'SIGNUP') {
    const existingOtp = await this.otpModel.findOne({ email });

    if (existingOtp) {
      throw new ConflictException('OTP already sent, please check your email');
    }

    const user = await this.usersService.findByEmail(email);

    if (type === 'SIGNUP') {
      if (user && user.isVerified) {
        throw new ConflictException('Email already present, please login');
      }
      if (!password) {
        throw new BadRequestException('Password is required for signup');
      }

      if (!user) {
        // Create new user with isVerified: false
        await this.usersService.create({
          email,
          password,
        } as CreateUserDto);
      } else {
        // User exists but is not verified: Update password
        await this.usersService.update(user._id.toString(), {
          password,
        } as UpdateUserDto);
      }
    } else if (type === 'PASSWORD') {
      // Password reset: user must exist
      if (!user) {
        throw new NotFoundException('No account found with this email');
      }
    } else {
      throw new BadRequestException('Invalid type. Use SIGNUP or PASSWORD');
    }

    const otp = this.generateOtp();

    try {
      await this.otpModel.create({
        email,
        otp,
        type,
      });
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `FAILED to save OTP for email [${email}] to database: ${err.message}`,
        err.stack,
      );
      throw new BadRequestException('Database error while saving OTP');
    }

    await this.emailQueue.add('send-otp', {
      email,
      otp,
    });

    return { message: 'OTP sent successfully' };
  }

  async verifyOtp(email: string, otp: string) {
    const otpRecord = await this.otpModel.findOne({ email, otp });

    if (!otpRecord) {
      throw new BadRequestException('Invalid or expired OTP');
    }
    if (otpRecord.otp !== otp) {
      throw new BadRequestException('Invalid OTP');
    }

    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (otpRecord.type === 'SIGNUP') {
      if (!user.isVerified) {
        await this.usersService.update(user._id.toString(), {
          isVerified: true,
        } as UpdateUserDto);
      }
      await this.otpModel.deleteOne({ _id: otpRecord._id });
      return this.authService.generateTokens(user._id.toString(), user.email);
    } else if (otpRecord.type === 'PASSWORD') {
      // OTP verified — delete it. Caller (reset-password) handles the password update.
      await this.otpModel.deleteOne({ _id: otpRecord._id });
      return { verified: true };
    }

    // Fallback
    await this.otpModel.deleteOne({ _id: otpRecord._id });
    return { verified: true };
  }
}
