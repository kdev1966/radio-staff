import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
// import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  // Cookie parser for CSRF protection - disabled for now
  // app.use(cookieParser());

  app.setGlobalPrefix('api');

  app.useGlobalFilters(new GlobalExceptionFilter(configService));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // CORS configuration using environment variables
  const allowedOrigins = (
    configService.get<string>('ALLOWED_ORIGINS', 'http://localhost:3000')
  ).split(',').map(origin => origin.trim());

  app.enableCors({
    origin: true, // Allow all origins for testing (change to allowedOrigins in production)
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Requested-With'],
    exposedHeaders: ['X-CSRF-Token'],
    maxAge: 3600,
  });

  const config = new DocumentBuilder()
    .setTitle('Radio Staff Manager API')
    .setDescription('API de gestion du personnel radiologie')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`Backend running on http://localhost:${port}`);
  console.log(`Swagger docs on http://localhost:${port}/api/docs`);
}

bootstrap();
