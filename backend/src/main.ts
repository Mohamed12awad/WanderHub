import 'reflect-metadata';
import './config/load-env';
import * as Sentry from '@sentry/node';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { validateEnv } from './config/env.validation';

validateEnv();

if (process.env.SENTRY_DSN) {
  Sentry.init({ dsn: process.env.SENTRY_DSN, environment: process.env.NODE_ENV ?? 'development' });
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: true, bufferLogs: true });
  app.useLogger(app.get(Logger));
  app.use(helmet());
  app.use(cookieParser());
  app.setGlobalPrefix('api');
  app.enableCors({ origin: process.env.FRONTEND_URL, credentials: true });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
  );
  const port = process.env.PORT || 3000;
  await app.listen(port);
}
void bootstrap();
