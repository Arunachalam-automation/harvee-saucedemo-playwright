import dotenv from 'dotenv';
import path from 'path';

// quiet: true suppresses dotenv's "injected env" banner; values still load normally.
// Playwright workers re-import this module, so without quiet the banner repeats per process.
dotenv.config({ path: path.resolve(__dirname, '..', '.env'), quiet: true });

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
