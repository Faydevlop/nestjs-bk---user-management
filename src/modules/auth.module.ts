import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from '../services/auth/auth.service';
import { AuthController } from '../controller/auth/auth.controller';
import { UsersModule } from './users.module';
import { JwtStrategy } from '../guards/jwt.strategy';
import { OtpModule } from './otp.module';
import { forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  AccessToken,
  AccessTokenSchema,
} from '../db/models/access-token.schema';
import {
  RefreshToken,
  RefreshTokenSchema,
} from '../db/models/refresh-token.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AccessToken.name, schema: AccessTokenSchema },
      { name: RefreshToken.name, schema: RefreshTokenSchema },
    ]),
    UsersModule,
    PassportModule,
    forwardRef(() => OtpModule), // Circular dependency likely if OtpModule imports AuthModule
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '60m' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
