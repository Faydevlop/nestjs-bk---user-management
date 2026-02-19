import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ResponseInterceptor } from './utils/interceptors/response.interceptor';
import { HttpExceptionFilter } from './utils/filters/http-exception.filter';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import hpp from 'hpp';
import rateLimit from 'express-rate-limit';
import { apiReference } from '@scalar/nestjs-api-reference';
import { ConfigService } from '@nestjs/config';
import { TallyService } from './services/tally/tally.service';
import { ZohoService } from './services/zoho/zoho.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  const configService = app.get(ConfigService);
  const logger = app.get(Logger);
  app.useLogger(logger);

  // Security Middleware
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", 'cdn.jsdelivr.net'],
          styleSrc: [
            "'self'",
            "'unsafe-inline'",
            'cdn.jsdelivr.net',
            'fonts.googleapis.com',
          ],
          imgSrc: ["'self'", 'data:', 'cdn.jsdelivr.net'],
          fontSrc: ["'self'", 'fonts.gstatic.com'],
        },
      },
    }),
  );
  app.use(hpp());

  // CORS Configuration
  const environ = configService.get<string>('ENVIRONMENT') || 'development';
  const corsUrls = configService.get<string>('CORS_URLS') || '';

  if (environ === 'development') {
    // nosemgrep: typescript.nestjs.security.audit.nestjs-header-cors-any.nestjs-header-cors-any
    app.enableCors({
      origin: true,
      credentials: false,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Origin',
        'Authorization',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'X-Demo',
        'X-Request-URL',
        'X-Transaction-Id',
        'X-Response-Time',
        'X-Environment',
        'ngrok-skip-browser-warning',
      ],
      exposedHeaders: ['X-Transaction-Id', 'X-Response-Time'],
    });
    logger.log('CORS: Development mode - allowing all origins');
  } else {
    const allowedOrigins = corsUrls
      ? corsUrls
          .split(',')
          .map((url) => url.trim())
          .filter(Boolean)
      : [];

    if (allowedOrigins.length > 0) {
      logger.log(
        `CORS: Allowed origins configured: ${allowedOrigins.join(', ')}`,
      );
    } else {
      logger.warn(
        'CORS: No allowed origins configured - CORS will reject all requests with origin header',
      );
    }

    app.enableCors({
      origin: (
        origin: string | undefined,
        callback: (err: Error | null, allow?: boolean) => void,
      ) => {
        if (!origin) {
          callback(null, true);
          return;
        }
        if (allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          logger.warn(`CORS: Origin ${origin} not allowed`);
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Origin',
        'Authorization',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'X-Demo',
        'X-Request-URL',
        'X-Transaction-Id',
        'X-Response-Time',
        'X-Environment',
        'ngrok-skip-browser-warning',
      ],
      exposedHeaders: ['X-Transaction-Id', 'X-Response-Time'],
    });
  }

  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
    }),
  );

  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());

  // Swagger Configuration
  const config = new DocumentBuilder()
    .setTitle('User Management API')
    .setDescription('API documentation for User Management System')
    .setVersion('1.0')
    .addBearerAuth()
    .addGlobalParameters({
      name: 'X-Demo',
      in: 'header',
      required: false,
      schema: { type: 'string', default: 'false', enum: ['true', 'false'] },
      description: 'Run request in demo mode',
    })
    .build();
  const document = SwaggerModule.createDocument(app, config);

  // Scalar Setup
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  app.use('/reference', apiReference({ spec: { content: document } } as any));

  // Initialize external service connections
  const tallyService = app.get(TallyService);
  const zohoService = app.get(ZohoService);
  logger.log(`Tally connection ready: ${await tallyService.testConnection()}`);
  logger.log(`Zoho connection ready: ${await zohoService.testConnection()}`);

  const port = configService.get<number>('PORT') || 3000;
  await app.listen(port);
  logger.log(`Application is running on: http://localhost:${port}`);
  logger.log(`API Reference available at: http://localhost:${port}/reference`);
}
bootstrap().catch((err: unknown) => {
  console.error('Bootstrap failed:', err);
});
