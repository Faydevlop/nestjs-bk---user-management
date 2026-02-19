import { Module } from '@nestjs/common';
import { RazorpayService } from '../services/razorpay/razorpay.service';
import { PaymentController } from '../controller/payment/payment.controller';

@Module({
  controllers: [PaymentController],
  providers: [RazorpayService],
  exports: [RazorpayService],
})
export class PaymentModule {}
