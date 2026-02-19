import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import * as dns from 'dns';

dns.setServers(['8.8.8.8', '8.8.4.4']);

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private lastActivity: number = Date.now();
  private idleTimeout = 30 * 60 * 1000; // 30 minutes in ms
  private checkInterval = 1 * 60 * 1000; // 1 minute in ms
  private timer: NodeJS.Timeout;

  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit() {
    const uri = this.configService.get<string>('MONGODB_URI');
    this.logger.log(
      `DatabaseService initiated. Target URI: ${uri?.replace(/\/\/.*@/, '//****@')}`,
    );

    this.connection.on('connected', () => {
      this.logger.log(
        `Mongoose connected to database: ${this.connection.name}`,
      );
    });

    this.connection.on('error', (err) => {
      this.logger.error(`Mongoose connection error: ${err}`);
    });

    this.timer = setInterval(() => {
      void this.checkIdle();
    }, this.checkInterval);
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  recordActivity() {
    this.lastActivity = Date.now();
    if (Number(this.connection.readyState) === 0) {
      this.logger.log('Reconnecting to database due to activity...');
      const uri = this.configService.get<string>('MONGODB_URI');
      if (uri) {
        this.connection.openUri(uri);
      }
    }
  }

  private async checkIdle() {
    const now = Date.now();
    if (
      now - this.lastActivity > this.idleTimeout &&
      Number(this.connection.readyState) === 1
    ) {
      this.logger.log('Database connection idle for 30 minutes. Closing...');
      await this.connection.close();
    }
  }
}
