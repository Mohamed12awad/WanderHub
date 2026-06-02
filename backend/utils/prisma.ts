// Shared PrismaClient for seed/util scripts. Prisma 7 connects via a driver
// adapter rather than a schema `url`, so the connection string is passed here.
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';

dotenv.config();

export const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
