import { existsSync } from 'fs';
import { resolve } from 'path';
import { config } from 'dotenv';
import { defineConfig } from 'prisma/config';

const profile = process.env.APP_ENV || process.env.NODE_ENV;
const envFiles = [
  profile ? `.env.${profile}` : undefined,
  '.env',
].filter(Boolean) as string[];

for (const file of envFiles) {
  const envPath = resolve(__dirname, file);
  if (existsSync(envPath)) {
    config({ path: envPath, quiet: true });
  }
}

// Prisma 7 moved the datasource connection URL out of schema.prisma. The CLI
// (migrate/db) reads it from here; the runtime PrismaClient uses the pg driver
// adapter in src/prisma/prisma.service.ts.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  },
});
