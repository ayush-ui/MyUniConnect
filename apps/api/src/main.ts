import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { AppExceptionFilter } from './presentation/filters/app-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.useGlobalFilters(new AppExceptionFilter());

  app.setGlobalPrefix('api/v1');

  const swaggerConfig = new DocumentBuilder()
    .setTitle('UniSync API')
    .setDescription(
      'University-exclusive student platform. All endpoints (except auth) require a verified student account.',
    )
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', description: 'Access token (15m TTL)' },
      'access-token',
    )
    .addCookieAuth('refresh_token', { type: 'apiKey', in: 'cookie', name: 'refresh_token' })
    .addTag('Auth', 'Registration, email verification, login, token refresh')
    .addTag('Marketplace', 'Buy and sell listings')
    .addTag('Clubs', 'University clubs and communities')
    .addTag('Housing', 'Rental and sublet listings')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  logger.log(`API running on http://localhost:${port}/api/v1`);
  logger.log(`Swagger docs at http://localhost:${port}/docs`);
}

bootstrap();
