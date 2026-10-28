import { defineConfig, devices } from '@playwright/test';
import { env } from './config/env';

/**
 * SauceDemo Playwright configuration.
 *
 * Suite selection (smoke / regression / E2E) is driven by npm scripts via
 * `--grep` tags (@smoke, @regression, @e2e), not by separate projects.
 *
 * The `setup` project is wired for `tests/auth.setup.ts` (created in a later
 * step). Until that file and its storage state exist, test runs will not succeed.
 */
export default defineConfig({
  testDir: './tests',
  outputDir: 'build/test-results',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: [
    ['html', { outputFolder: 'build/html-report', open: 'never' }],
    ['junit', { outputFile: 'build/junit/results.xml' }],
  ],
  use: {
    baseURL: env.baseURL,
    testIdAttribute: 'data-test',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Written by tests/auth.setup.ts in the next implementation step
        storageState: '.auth/user.json',
      },
      dependencies: ['setup'],
      testIgnore: /auth\.setup\.ts/,
    },
  ],
});
