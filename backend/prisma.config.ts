import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// Prisma 7 moved the datasource connection URL out of schema.prisma. The CLI
// (migrate/db) reads it from here; the runtime PrismaClient uses the pg driver
// adapter in src/prisma/prisma.service.ts.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
