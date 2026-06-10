import { existsSync } from 'fs';
import { resolve } from 'path';
import { config } from 'dotenv';

const backendRoot = resolve(__dirname, '..', '..');
const profile = process.env.APP_ENV || process.env.NODE_ENV;
const envFiles = [
  profile ? `.env.${profile}` : undefined,
  '.env',
].filter(Boolean) as string[];

for (const file of envFiles) {
  const envPath = resolve(backendRoot, file);
  if (existsSync(envPath)) {
    config({ path: envPath, quiet: true });
  }
}
