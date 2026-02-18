import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export enum OtpType {
    SIGNUP = 'SIGNUP',
    PASSWORD = 'PASSWORD',
}

export class SendOtpDto {
    @ApiProperty({ example: 'user@example.com', description: 'User email address' })
    @IsEmail()
    email: string;

    @ApiProperty({ example: 'password123', description: 'User password (Required for SIGNUP)', required: false })
    @IsOptional()
    @IsString()
    password?: string;

    @ApiProperty({ enum: OtpType, example: 'SIGNUP', description: 'Type of OTP request: SIGNUP or PASSWORD (for reset)' })
    @IsEnum(OtpType)
    type: OtpType;
}
