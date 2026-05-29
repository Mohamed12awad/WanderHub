import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: true, bufferLogs: true });
  app.useLogger(app.get(Logger));
  app.setGlobalPrefix('api');
  app.enableCors({ origin: process.env.FRONTEND_URL, credentials: true });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: false }),
  );
  const port = process.env.PORT || 3000;
  await app.listen(port);
}
void bootstrap();
