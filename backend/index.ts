import "reflect-metadata";
import "./src/config/load-env";
import { NestFactory } from "@nestjs/core";
import { ExpressAdapter } from "@nestjs/platform-express";
import { ValidationPipe } from "@nestjs/common";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import express from "express";
import { AppModule } from "./src/app.module";
import { validateEnv } from "./src/config/env.validation";

validateEnv();

const server = express();
let appReady: Promise<void>;

function getApp() {
  if (!appReady) {
    appReady = (async () => {
      const app = await NestFactory.create(
        AppModule,
        new ExpressAdapter(server),
        {
          bodyParser: true,
        },
      );

      app.use(helmet());
      app.use(cookieParser());
      app.setGlobalPrefix("api");

      const allowedOrigins = process.env.CORS_ORIGINS
        ? process.env.CORS_ORIGINS.split(",").map((o) => o.trim())
        : [process.env.FRONTEND_URL || "http://localhost:5173"];

      app.enableCors({
        origin: (
          origin: string | undefined,
          callback: (err: Error | null, allow?: boolean) => void,
        ) => {
          // ✅ typed
          if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
          } else {
            callback(new Error(`Blocked: ${origin}`));
          }
        },
        credentials: true,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
      });

      app.useGlobalPipes(
        new ValidationPipe({
          whitelist: true,
          transform: true,
          forbidNonWhitelisted: true,
        }),
      );

      await app.init();
    })();
  }
  return appReady;
}

export default async function handler(req: any, res: any) {
  await getApp();
  server(req, res);
}
