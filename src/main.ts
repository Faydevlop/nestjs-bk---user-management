import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as dns from 'dns';

dns.setServers(['8.8.8.8', '8.8.4.4']);

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());

  const config = new DocumentBuilder()
    .setTitle('User Management API')
    .setDescription('API documentation for User Management System')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);

  // Serve the OpenAPI JSON at /api-json
  // SwaggerModule.setup doesn't just serve JSON, it serves UI. 
  // We can just use the document object directly or let SwaggerModule serve it.
  // Let's use SwaggerModule to serve JSON at /api-json and disable UI if possible, or just ignore its UI.
  // Actually, easiest is to just serve JSON manually.
  app.use('/api-json', (req, res) => {
    res.send(document);
  });

  // Serve Stoplight Elements at /api
  app.use('/api', (req, res) => {
    res.send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    <title>User Management API</title>
    <script src="https://unpkg.com/@stoplight/elements/web-components.min.js"></script>
    <link rel="stylesheet" href="https://unpkg.com/@stoplight/elements/styles.min.css">
  </head>
  <body>
    <elements-api
      apiDescriptionUrl="/api-json"
      router="hash"
      layout="sidebar"
    />
  </body>
</html>`);
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
