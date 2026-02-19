import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class TallyService implements OnModuleInit {
  private readonly logger = new Logger(TallyService.name);
  private readonly tallyUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.tallyUrl =
      this.configService.get<string>('TALLY_URL') || 'http://localhost:9000';
  }

  async onModuleInit() {
    this.logger.log(`Tally service initialized — gateway: ${this.tallyUrl}`);
    const isConnected = await this.testConnection();
    if (isConnected) {
      this.logger.log('Tally gateway is reachable');
    } else {
      this.logger.warn(
        'Tally gateway is NOT reachable — requests will fail until Tally is started',
      );
    }
  }

  /**
   * Send a raw XML request to the Tally gateway.
   * @param xmlPayload - The XML string to POST to Tally.
   * @returns The raw XML response from Tally as a string.
   */
  async sendRequest(xmlPayload: string): Promise<string> {
    const response = await firstValueFrom(
      this.httpService.post<string>(this.tallyUrl, xmlPayload, {
        headers: { 'Content-Type': 'application/xml' },
        responseType: 'text',
      }),
    );
    return response.data;
  }

  /**
   * Test connectivity to the Tally gateway.
   * @returns `true` if the gateway responds, `false` otherwise.
   */
  async testConnection(): Promise<boolean> {
    try {
      await firstValueFrom(
        this.httpService.get(this.tallyUrl, { timeout: 5000 }),
      );
      return true;
    } catch {
      return false;
    }
  }
}
