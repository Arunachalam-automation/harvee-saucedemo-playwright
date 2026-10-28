import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

function requireEnv(name: string): string {
  const value = process.env[name];

  if (value === undefined || value.trim() === '') {
    throw new Error(
      `Missing required environment variable: ${name}. ` + `Copy .env.example to .env and provide a value for ${name}.`
    );
  }

  return value;
}

/**
 * Validated runtime environment for SauceDemo tests.
 * No fallbacks or hard-coded secrets — all values must come from .env.
 */
export const env = {
  baseURL: requireEnv('BASE_URL'),
  standardUser: requireEnv('STANDARD_USER'),
  lockedUser: requireEnv('LOCKED_USER'),
  userPassword: requireEnv('USER_PASSWORD')
} as const;
