import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OtpService } from '../services/otp/otp.service';
// import { OtpController } from '../controller/otp/otp.controller'; // Removed
import { BullModule } from '@nestjs/bullmq';
import { UsersModule } from './users.module';
import { RedisModule } from './redis.module';
import { Otp, OtpSchema } from '../db/models/otp.schema';
import { AuthModule } from './auth.module';

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
export class OtpModule {}
