import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  Inject,
  forwardRef,
  Logger,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  AccessToken,
  AccessTokenDocument,
} from '../../db/models/access-token.schema';
import {
  RefreshToken,
  RefreshTokenDocument,
} from '../../db/models/refresh-token.schema';
import { LoginDto } from '../../dto/login.dto';
import { ResetPasswordDto } from '../../dto/reset-password.dto';
import { OtpService } from '../otp/otp.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    @InjectModel(AccessToken.name)
    private accessTokenModel: Model<AccessTokenDocument>,
    @InjectModel(RefreshToken.name)
    private refreshTokenModel: Model<RefreshTokenDocument>,
    @Inject(forwardRef(() => OtpService)) private otpService: OtpService,
  ) {}

  async validateUser(
    email: string,
    pass: string,
  ): Promise<Record<string, any> | null> {
    const user = await this.usersService.findByEmail(email);
    if (user && (await bcrypt.compare(pass, user.password))) {
      const userObj = user.toObject() as Record<string, any>;
      delete userObj.password;
      return userObj;
    }
    return null;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (!user.isVerified) {
      throw new UnauthorizedException('User not verified');
    }
    const userCast = user as { _id: Types.ObjectId; email: string };
    return this.generateTokens(userCast._id.toString(), userCast.email);
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    // Verify OTP (throws if invalid)
    await this.otpService.verifyOtp(
      resetPasswordDto.email,
      resetPasswordDto.otp,
    );

    // Update user password
    const user = await this.usersService.findByEmail(resetPasswordDto.email);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Update password (hashing handled by UsersService.update or schema hook?)
    // UsersService.update handles hashing if password field is present.
    const userId = (user as unknown as { _id: Types.ObjectId })._id.toString();
    await this.usersService.update(userId, {
      password: resetPasswordDto.newPassword,
    });

    return { message: 'Password reset successfully' };
  }

  async generateTokens(userId: string, email: string) {
    const payload = { sub: userId, email: email };

    const accessToken = this.jwtService.sign(payload, { expiresIn: '1h' });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    try {
      await this.accessTokenModel.deleteMany({ userId });
      await this.accessTokenModel.create({
        token: accessToken,
        userId,
        role: 'USER',
      });
      this.logger.log(`AccessToken SAVED for userId: ${userId}`);
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `FAILED to save AccessToken for userId: ${userId}`,
        err.stack,
      );
    }

    try {
      await this.refreshTokenModel.deleteMany({ userId });
      await this.refreshTokenModel.create({
        token: refreshToken,
        userId,
        role: 'USER',
      });
      this.logger.log(`RefreshToken SAVED for userId: ${userId}`);
    } catch (error: unknown) {
      this.logger.error(
        `FAILED to save RefreshToken for userId: ${userId}`,
        (error as Error).stack,
      );
    }

    return {
      accessToken,
      refreshToken,
      expiryTime: new Date(Date.now() + 3600 * 1000),
    };
  }

  async refreshTokens(token: string) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const verified = this.jwtService.verify(token);
      const payload = {
        sub: String((verified as Record<string, unknown>).sub),
        email: String((verified as Record<string, unknown>).email),
      };

      // Explicitly cast sub to ObjectId for query
      const userId = new Types.ObjectId(payload.sub);

      // Debug: Check if token exists at all
      const anyToken = await this.refreshTokenModel.findOne({ token });

      const tokenDoc = await this.refreshTokenModel.findOne({ token, userId });

      if (!tokenDoc) {
        this.logger.warn(
          `Refresh Token lookup failed for user [${userId.toString()}]. Token exists in DB? ${!!anyToken}`,
        );
        if (anyToken) {
          this.logger.warn(
            `Token exists but userId mismatch. DB: ${anyToken.userId.toString()}, Payload: ${userId.toString()}`,
          );
        }
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Revoke old tokens
      await this.accessTokenModel.deleteMany({ userId });
      await this.refreshTokenModel.deleteMany({ userId });

      // Generate new ones
      return this.generateTokens(userId.toString(), payload.email);
    } catch (e: unknown) {
      const err = e as Error;
      this.logger.error(`Refresh Token Error: ${err.message}`, err.stack);
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async logout(userId: string) {
    await this.accessTokenModel.deleteMany({ userId });
    await this.refreshTokenModel.deleteMany({ userId });
    return { message: 'Logged out successfully' };
  }
}
