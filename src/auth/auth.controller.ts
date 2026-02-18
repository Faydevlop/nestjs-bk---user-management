import { Controller, Post, Body, UseGuards, Get, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { OtpService } from '../otp/otp.service';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
    constructor(
        private otpService: OtpService,
        private authService: AuthService
    ) { }

    @Post('login')
    @ApiOperation({ summary: 'Login with email and password' })
    @ApiBody({
        type: LoginDto,
        examples: {
            default: {
                summary: 'Login example',
                value: { email: 'user@example.com', password: 'password123' }
            }
        }
    })
    @ApiResponse({ status: 200, description: 'Tokens returned.' })
    @ApiResponse({ status: 401, description: 'Invalid credentials.' })
    async login(@Body() body: LoginDto) {
        return this.authService.login(body);
    }

    @Post('reset-password')
    @ApiOperation({ summary: 'Reset password using OTP (send OTP first with type PASSWORD)' })
    @ApiBody({
        type: ResetPasswordDto,
        examples: {
            default: {
                summary: 'Reset password example',
                value: { email: 'user@example.com', otp: '123456', newPassword: 'newPassword123' }
            }
        }
    })
    @ApiResponse({ status: 200, description: 'Password reset successfully.' })
    @ApiResponse({ status: 400, description: 'Invalid OTP or parameters.' })
    async resetPassword(@Body() body: ResetPasswordDto) {
        return this.authService.resetPassword(body);
    }

    @Post('send-otp')
    @ApiOperation({ summary: 'Send OTP — type SIGNUP (with password) or PASSWORD (for reset)' })
    @ApiBody({
        type: SendOtpDto,
        examples: {
            signup: {
                summary: 'Signup OTP',
                value: { email: 'user@example.com', password: 'password123', type: 'SIGNUP' }
            },
            resetPassword: {
                summary: 'Reset Password OTP',
                value: { email: 'user@example.com', type: 'PASSWORD' }
            }
        }
    })
    @ApiResponse({ status: 200, description: 'OTP sent successfully.' })
    @ApiResponse({ status: 400, description: 'Bad Request.' })
    @ApiResponse({ status: 409, description: 'OTP already sent or email conflict.' })
    async sendOtp(@Body() body: SendOtpDto) {
        return this.otpService.sendOtp(body.email, body.password, body.type);
    }

    @Post('verify-otp')
    @ApiOperation({ summary: 'Verify OTP — for SIGNUP returns tokens; for PASSWORD returns verified:true' })
    @ApiBody({
        type: VerifyOtpDto,
        examples: {
            default: {
                summary: 'Verify OTP example',
                value: { email: 'user@example.com', otp: '123456' }
            }
        }
    })
    @ApiResponse({ status: 200, description: 'Tokens returned (SIGNUP) or verified:true (PASSWORD).' })
    @ApiResponse({ status: 400, description: 'Invalid OTP or parameters.' })
    async verifyOtp(@Body() body: VerifyOtpDto) {
        return this.otpService.verifyOtp(body.email, body.otp);
    }

    @UseGuards(JwtAuthGuard)
    @Get('profile')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get user profile' })
    @ApiResponse({ status: 200, description: 'Return user profile.' })
    getProfile(@Request() req) {
        return req.user;
    }

    @Post('refresh')
    @ApiOperation({ summary: 'Refresh access token using refresh token' })
    @ApiBody({
        type: RefreshTokenDto,
        examples: {
            default: {
                summary: 'Refresh token example',
                value: { refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' }
            }
        }
    })
    @ApiResponse({ status: 200, description: 'New tokens returned.' })
    @ApiResponse({ status: 401, description: 'Invalid refresh token.' })
    async refresh(@Body() body: RefreshTokenDto) {
        return this.authService.refreshTokens(body.refreshToken);
    }

    @UseGuards(JwtAuthGuard)
    @Post('logout')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Logout user (revokes all tokens)' })
    @ApiResponse({ status: 200, description: 'Logged out successfully.' })
    async logout(@Request() req) {
        return this.authService.logout(req.user.userId);
    }
}

