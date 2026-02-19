import { Controller, Post, Body, HttpCode } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Payment')
@Controller('payment')
export class PaymentController {
  @Post('webhook')
  @HttpCode(200)
  @ApiOperation({ summary: 'Razorpay webhook endpoint' })
  handleWebhook(): { success: boolean; message: string } {
    // TODO: Add webhook handling logic based on project requirements
    // Example events: payment.captured, payment.failed, order.paid
    // 1. Extract orderId, paymentId, and notes from body.payload
    // 2. Verify webhook signature using razorpay webhook secret
    // 3. Update payment status in database
    // 4. Handle enrollment / appointment specific logic

    return {
      success: true,
      message: 'Webhook received',
    };
  }
}
