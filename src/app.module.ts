import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { LoggerModule } from 'nestjs-pino';
import { AppController } from './controller/app/app.controller';
import { AppService } from './services/app/app.service';
import { AuthModule } from './modules/auth.module';
import { UsersModule } from './modules/users.module';
import { OtpModule } from './modules/otp.module';
import { QueueModule } from './modules/queue.module';
import { DatabaseModule } from './db/database.module';
import { DatabaseActivityInterceptor } from './utils/interceptors/database-activity.interceptor';
import { APP_INTERCEPTOR } from '@nestjs/core';
import configuration from './config/configuration';
import { TallyModule } from './modules/tally.module';
import { ZohoModule } from './modules/zoho.module';
import { StorageModule } from './modules/storage.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
      isGlobal: true,
    }),
    DatabaseModule,
    LoggerModule.forRoot({
      pinoHttp: {
        customProps: () => ({
          context: 'HTTP',
        }),
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { colorize: true } }
            : undefined,
      },
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        return {
          uri: await Promise.resolve(configService.get<string>('MONGODB_URI')),
        };
      },
      inject: [ConfigService],
    }),
    AuthModule,
    UsersModule,
    OtpModule,
    QueueModule,
    TallyModule,
    ZohoModule,
    StorageModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: DatabaseActivityInterceptor,
    },
  ],
})
export class AppModule {}
