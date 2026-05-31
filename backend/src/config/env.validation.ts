import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET:   z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  FRONTEND_URL: z.string().optional().default('http://localhost:5173'),
  PORT:         z.coerce.number().optional().default(3000),
  NODE_ENV:     z.enum(['development', 'production', 'test']).optional().default('development'),
  SENTRY_DSN:   z.string().optional(),
  SMTP_HOST:    z.string().optional(),
  SMTP_PORT:    z.coerce.number().optional(),
  SMTP_USER:    z.string().optional(),
  SMTP_PASS:    z.string().optional(),
  SMTP_FROM:    z.string().optional(),
  APP_URL:      z.string().optional(),
});

export function validateEnv(): void {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const lines = result.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`);
    console.error('❌ Invalid environment configuration:\n' + lines.join('\n'));
    process.exit(1);
  }
}
