import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AxiosRequestConfig, Method } from 'axios';

interface ZohoTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  error?: string;
}

@Injectable()
export class ZohoService implements OnModuleInit {
  private readonly logger = new Logger(ZohoService.name);

  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly refreshToken: string;
  private readonly inventoryRefreshToken: string;
  private readonly tokenUrl = 'https://accounts.zoho.in/oauth/v2/token';

  /** Cached access tokens */
  private accessToken: string | null = null;
  private inventoryAccessToken: string | null = null;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.clientId = this.configService.get<string>('ZOHO_CLIENT_ID') || '';
    this.clientSecret =
      this.configService.get<string>('ZOHO_CLIENT_SECRET') || '';
    this.refreshToken =
      this.configService.get<string>('ZOHO_REFRESH_TOKEN') || '';
    this.inventoryRefreshToken =
      this.configService.get<string>('ZOHO_INVENTORY_REFRESH_TOKEN') || '';
  }

  async onModuleInit() {
    if (!this.clientId || !this.clientSecret) {
      this.logger.warn(
        'Zoho credentials not configured — set ZOHO_CLIENT_ID and ZOHO_CLIENT_SECRET in .env',
      );
      return;
    }

    this.logger.log('Zoho service initialized — attempting token refresh');
    const isConnected = await this.testConnection();
    if (isConnected) {
      this.logger.log('Zoho API connection verified');
    } else {
      this.logger.warn(
        'Zoho API connection failed — check credentials in .env',
      );
    }
  }

  /**
   * Refresh an OAuth access token using the given refresh token.
   * Defaults to the primary refresh token if none is provided.
   */
  async refreshAccessToken(overrideRefreshToken?: string): Promise<string> {
    const token = overrideRefreshToken || this.refreshToken;

    if (!token) {
      throw new Error('No Zoho refresh token available');
    }

    const params = new URLSearchParams({
      refresh_token: token,
      client_id: this.clientId,
      client_secret: this.clientSecret,
      grant_type: 'refresh_token',
    });

    const response = await firstValueFrom(
      this.httpService.post<ZohoTokenResponse>(
        this.tokenUrl,
        params.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      ),
    );

    if (response.data.error) {
      throw new Error(`Zoho token error: ${response.data.error}`);
    }

    return response.data.access_token;
  }

  /**
   * Get a valid access token, refreshing if necessary.
   * @param useInventoryToken - If true, use the inventory refresh token.
   */
  private async getAccessToken(useInventoryToken = false): Promise<string> {
    if (useInventoryToken) {
      if (!this.inventoryAccessToken) {
        this.inventoryAccessToken = await this.refreshAccessToken(
          this.inventoryRefreshToken,
        );
      }
      return this.inventoryAccessToken;
    }

    if (!this.accessToken) {
      this.accessToken = await this.refreshAccessToken();
    }
    return this.accessToken;
  }

  /**
   * Make an authenticated request to a Zoho API endpoint.
   * Auto-refreshes the access token and retries once on 401.
   */
  async request<T>(
    method: Method,
    url: string,
    data?: unknown,
    useInventoryToken = false,
  ): Promise<T> {
    let token = await this.getAccessToken(useInventoryToken);

    const makeRequest = async (accessToken: string) => {
      const config: AxiosRequestConfig = {
        method,
        url,
        data,
        headers: {
          Authorization: `Zoho-oauthtoken ${accessToken}`,
          'Content-Type': 'application/json',
        },
      };
      const response = await firstValueFrom(
        this.httpService.request<T>(config),
      );
      return response.data;
    };

    try {
      return await makeRequest(token);
    } catch (error: unknown) {
      const err = error as { response?: { status?: number } };
      if (err.response?.status === 401) {
        // Token expired — refresh and retry once
        this.logger.warn('Zoho token expired, refreshing…');
        if (useInventoryToken) {
          this.inventoryAccessToken = null;
        } else {
          this.accessToken = null;
        }
        token = await this.getAccessToken(useInventoryToken);
        return await makeRequest(token);
      }
      throw error;
    }
  }

  /**
   * Test connectivity by attempting a token refresh.
   */
  async testConnection(): Promise<boolean> {
    try {
      if (!this.refreshToken) return false;
      this.accessToken = await this.refreshAccessToken();
      return true;
    } catch {
      return false;
    }
  }
}
