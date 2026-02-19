import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';

@Processor('email')
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    super();
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('MAIL_HOST'),
      port: this.configService.get<number>('MAIL_PORT'),
      secure: false, // true for 465, false for other ports
      auth: {
        user: this.configService.get<string>('MAIL_USER'),
        pass: this.configService.get<string>('MAIL_PASS'),
      },
    });
  }

  async process(
    job: Job<{ email: string; otp: string }, any, string>,
  ): Promise<any> {
    this.logger.log(`Processing job ${job.id} of type ${job.name}`);
    switch (job.name) {
      case 'send-otp':
        await this.sendOtpEmail(job.data);
        break;
      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
    }
  }

  private async sendOtpEmail(data: { email: string; otp: string }) {
    const { email, otp } = data;
    const mailOptions = {
      from: this.configService.get<string>('MAIL_FROM'),
      to: email,
      subject: 'Your OTP Code',
      text: `Your OTP code is ${otp}. It will expire in 5 minutes.`,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`OTP sent to ${email}`);
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to send OTP to ${email}`, err.stack);
      throw error;
    }
  }
}
