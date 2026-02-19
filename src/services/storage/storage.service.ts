import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  S3Client,
  S3ClientConfig,
  DeleteObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  HeadBucketCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3Client: S3Client;
  private readonly bucket: string;
  private readonly uploadMethod: string;

  constructor(private readonly configService: ConfigService) {
    this.uploadMethod =
      this.configService.get<string>('UPLOAD_METHOD') || 'env';
    this.bucket = this.configService.get<string>('S3_BUCKET') || '';

    const endpoint = this.configService.get<string>('AWS_ENDPOINT') || '';
    const region = this.configService.get<string>('AWS_REGION') || '';

    // Configure S3 client based on UPLOAD_METHOD
    // If UPLOAD_METHOD is "sso", use AWS SSO / IAM role (no credentials needed)
    // Otherwise, use credentials from environment variables
    const s3Configuration: S3ClientConfig =
      this.uploadMethod === 'sso'
        ? { endpoint, region }
        : {
            credentials: {
              accessKeyId:
                this.configService.get<string>('AWS_ACCESS_KEY_ID') || '',
              secretAccessKey:
                this.configService.get<string>('AWS_SECRET_ACCESS_KEY') || '',
            },
            endpoint,
            region,
          };

    this.s3Client = new S3Client(s3Configuration);
  }

  async onModuleInit() {
    this.logger.log(
      `Storage service initialized — method: ${this.uploadMethod}, bucket: ${this.bucket}`,
    );
    try {
      await this.testConnection();
      this.logger.log('S3 connection verified successfully');
    } catch (error: unknown) {
      const err = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`S3 connection check failed: ${err}`);
    }
  }

  /**
   * Generate a presigned PUT URL for uploading a file.
   * @param key - The S3 object key (e.g. "uploads/image-123.png")
   * @returns Presigned URL valid for 1 hour
   */
  async getPresignedUrl(key: string): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    const signedUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn: 3600,
    });

    return signedUrl;
  }

  /**
   * Delete a file from S3.
   * @param key - The S3 object key to delete
   * @returns true if deleted successfully
   */
  async deleteFile(key: string): Promise<boolean> {
    try {
      // Verify object exists first
      const headCommand = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });
      await this.s3Client.send(headCommand);

      // Delete the object
      const deleteCommand = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });
      await this.s3Client.send(deleteCommand);

      this.logger.log(`Successfully deleted file: ${key}`);
      return true;
    } catch (error: unknown) {
      const err = error as { name?: string };
      if (err.name === 'NotFound') {
        this.logger.error(`File not found in S3: ${key}`);
      } else {
        this.logger.error(`Error deleting from S3: ${key}`);
      }
      throw error;
    }
  }

  /**
   * Test S3 connectivity and validate configuration.
   * Checks required env vars and verifies bucket access.
   */
  async testConnection(): Promise<void> {
    const requiredVars = ['AWS_ENDPOINT', 'AWS_REGION', 'S3_BUCKET'] as const;

    // If using env method, also require credentials
    if (this.uploadMethod !== 'sso') {
      const accessKeyId =
        this.configService.get<string>('AWS_ACCESS_KEY_ID') || '';
      const secretAccessKey =
        this.configService.get<string>('AWS_SECRET_ACCESS_KEY') || '';

      if (!accessKeyId || !secretAccessKey) {
        throw new Error(
          "Missing S3 credentials: AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are required when UPLOAD_METHOD is not 'sso'",
        );
      }
    }

    // Check for missing required env vars
    const missingVars = requiredVars.filter(
      (key) => !this.configService.get<string>(key),
    );

    if (missingVars.length > 0) {
      throw new Error(
        `Missing S3 environment variables: ${missingVars.join(', ')}`,
      );
    }

    // Test AWS S3 connection by checking bucket existence
    const command = new HeadBucketCommand({ Bucket: this.bucket });
    await this.s3Client.send(command);

    const method =
      this.uploadMethod === 'sso' ? 'SSO' : 'environment variables';
    this.logger.log(`S3 connection successful using ${method}`);
  }
}
