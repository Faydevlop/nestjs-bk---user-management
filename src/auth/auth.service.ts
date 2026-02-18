import { Injectable, UnauthorizedException, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AccessToken, AccessTokenDocument } from './schemas/access-token.schema';
import { RefreshToken, RefreshTokenDocument } from './schemas/refresh-token.schema';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { OtpService } from '../otp/otp.service';

@Injectable()
export class AuthService {
    constructor(
        private usersService: UsersService,
        private jwtService: JwtService,
        @InjectModel(AccessToken.name) private accessTokenModel: Model<AccessTokenDocument>,
        @InjectModel(RefreshToken.name) private refreshTokenModel: Model<RefreshTokenDocument>,
        @Inject(forwardRef(() => OtpService)) private otpService: OtpService,
    ) { }

    async validateUser(email: string, pass: string): Promise<any> {
        const user = await this.usersService.findByEmail(email);
        if (user && (await bcrypt.compare(pass, user.password))) {
            // Convert to object to safely strip password and keep other fields
            const userObj = (user as any).toObject ? (user as any).toObject() : user;
            const { password, ...result } = userObj;
            return result;
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
        return this.generateTokens(user._id, user.email);
    }

    async resetPassword(resetPasswordDto: ResetPasswordDto) {
        // Verify OTP (throws if invalid)
        await this.otpService.verifyOtp(resetPasswordDto.email, resetPasswordDto.otp);

        // Update user password
        const user = await this.usersService.findByEmail(resetPasswordDto.email);
        if (!user) {
            throw new NotFoundException('User not found');
        }

        // Update password (hashing handled by UsersService.update or schema hook?)
        // UsersService.update handles hashing if password field is present.
        await this.usersService.update((user as any)._id, { password: resetPasswordDto.newPassword } as any);

        return { message: 'Password reset successfully' };
    }

    async generateTokens(userId: string, email: string) {
        const payload = { sub: userId, email: email };

        const accessToken = this.jwtService.sign(payload, { expiresIn: '1h' });
        const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

        await this.accessTokenModel.deleteMany({ userId });
        await this.accessTokenModel.create({
            token: accessToken,
            userId,
            role: 'USER', // Kept in DB for reference, but not in token payload
        });

        await this.refreshTokenModel.deleteMany({ userId });
        await this.refreshTokenModel.create({
            token: refreshToken,
            userId,
            role: 'USER',
        });

        return {
            accessToken,
            refreshToken,
            expiryTime: new Date(Date.now() + 3600 * 1000)
        };
    }

    async refreshTokens(token: string) {
        try {
            const payload = this.jwtService.verify(token);

            // Explicitly cast sub to ObjectId for query
            const userId = new Types.ObjectId(payload.sub);


            const tokenDoc = await this.refreshTokenModel.findOne({ token, userId });

            if (!tokenDoc) {
                console.log('Refresh Token not found by { token, userId }');
                // Debug: Check if token exists at all
                const anyToken = await this.refreshTokenModel.findOne({ token });
                if (anyToken) {
                    console.log('Token DOES exist in DB, but userId mismatch.');
                    console.log('Token DB userId:', anyToken.userId, typeof anyToken.userId);
                    console.log('Payload userId:', userId, typeof userId);
                } else {
                    console.log('Token NOT found in DB at all.');
                }

                throw new UnauthorizedException('Invalid refresh token');
            }

            // Revoke old tokens
            await this.accessTokenModel.deleteMany({ userId });
            await this.refreshTokenModel.deleteMany({ userId });

            // Generate new ones
            return this.generateTokens(userId.toString(), payload.email);
        } catch (e) {
            console.error('Refresh Token Error:', e.message);
            throw new UnauthorizedException('Invalid or expired refresh token');
        }
    }

    async logout(userId: string) {
        await this.accessTokenModel.deleteMany({ userId });
        await this.refreshTokenModel.deleteMany({ userId });
        return { message: 'Logged out successfully' };
    }
}
