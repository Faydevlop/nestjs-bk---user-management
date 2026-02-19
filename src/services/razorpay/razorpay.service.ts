import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Razorpay from 'razorpay';
import crypto from 'crypto';

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  notes: Record<string, string>;
}

@Injectable()
export class RazorpayService implements OnModuleInit {
  private readonly logger = new Logger(RazorpayService.name);
  private razorpay: Razorpay;

  constructor(private readonly configService: ConfigService) {
    const keyId = this.configService.get<string>('RAZORPAY_KEY_ID') || '';
    const keySecret =
      this.configService.get<string>('RAZORPAY_KEY_SECRET') || '';

    this.razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.testConnection();
      this.logger.log('Razorpay connection ready: true');
    } catch (error) {
      this.logger.warn(
        `Razorpay connection ready: false — ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Create a Razorpay order
   */
  async createOrder(
    amount: number,
    notes: Record<string, string> = {},
  ): Promise<RazorpayOrder> {
    const roundedAmount = Math.round(amount * 100); // Convert to paise
    const order = await this.razorpay.orders.create({
      amount: roundedAmount,
      currency: 'INR',
      notes,
    });
    return order as unknown as RazorpayOrder;
  }

  /**
   * Verify Razorpay payment signature (HMAC-SHA256)
   */
  verifySignature(
    orderId: string,
    paymentId: string,
    signature: string,
  ): boolean {
    const keySecret =
      this.configService.get<string>('RAZORPAY_KEY_SECRET') || '';
    const body = `${orderId}|${paymentId}`;
    const generated = crypto
      .createHmac('sha256', keySecret)
      .update(body)
      .digest('hex');
    return generated === signature;
  }

  /**
   * Test Razorpay credentials by fetching one order
   */
  async testConnection(): Promise<void> {
    const keyId = this.configService.get<string>('RAZORPAY_KEY_ID');
    const keySecret = this.configService.get<string>('RAZORPAY_KEY_SECRET');

    if (!keyId || !keySecret) {
      throw new Error('Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET');
    }

    await this.razorpay.orders.all({ count: 1 });
  }
}
