import { defineConfig, devices } from '@playwright/test';
import { env } from './config/env';

/**
 * SauceDemo Playwright configuration.
 *
 * Suite selection (smoke / regression / E2E / Sanity) is driven by npm scripts via
 * `--grep` tags (@smoke, @regression, @e2e, @sanity), not by separate projects.
 *
 * The `setup` project is wired for `tests/auth.setup.ts` .
 * Until that file and its storage state exist, test runs will not succeed.
 */
export default defineConfig({
  testDir: './tests',
  outputDir: 'build/test-results',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: [
    // Explicit list reporter: Playwright otherwise injects `line` (TTY single-line \r updates),
    // which overwrites "[n/m] setup" progress and looks broken with test.only / short runs.
    ['list'],
    ['html', { outputFolder: 'build/html-report', open: 'never' }],
    ['junit', { outputFile: 'build/junit/results.xml' }],
    ['./reporters/console-summary-reporter.ts']
  ],
  use: {
    baseURL: env.baseURL,
    testIdAttribute: 'data-test',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure'
  },
  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Written by tests/auth.setup.ts in the next implementation step
        storageState: '.auth/user.json'
      },
      dependencies: ['setup'],
      testIgnore: /auth\.setup\.ts/
    }
  ]
});
