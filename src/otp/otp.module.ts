import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OtpService } from './otp.service';
// import { OtpController } from './otp.controller'; // Removed
import { BullModule } from '@nestjs/bullmq';
import { UsersModule } from '../users/users.module';
import { RedisModule } from '../redis/redis.module';
import { Otp, OtpSchema } from './schemas/otp.schema';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Otp.name, schema: OtpSchema }]),
    BullModule.registerQueue({
      name: 'email',
    }),
    UsersModule,
    RedisModule,
    forwardRef(() => AuthModule),
  ],
  controllers: [], // OtpController removed
  providers: [OtpService],
  exports: [OtpService],
})
export class OtpModule { }
