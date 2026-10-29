import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

// quiet: true suppresses dotenv's "injected env" banner; values still load normally.
// Playwright workers re-import this module, so without quiet the banner repeats per process.
dotenv.config({ path: path.resolve(__dirname, '.env'), quiet: true });

/** Default SauceDemo origin when BASE_URL is missing or blank. */
const DEFAULT_BASE_URL = 'https://www.saucedemo.com';

/**
 * Shared settings for every browser project that depends on auth setup.
 * SauceDemo session cookies are portable across Chromium, Firefox, and WebKit,
 * so all branded and bundled browsers reuse `.auth/user.json` from the setup project.
 */
const authenticatedBrowserUse = {
  storageState: '.auth/user.json'
} as const;

/**
 * SauceDemo Playwright configuration.
 *
 * Suite selection (smoke / regression / E2E / Sanity) is driven by npm scripts via
 * `--grep` tags (@smoke, @regression, @e2e, @sanity), not by separate projects.
 *
 * Browser selection is driven by Playwright projects (chromium, firefox, webkit,
 * edge, chrome) and matching npm scripts (`test:chromium`, etc.).
 *
 * The `setup` project runs `tests/auth.setup.ts` once (bundled Chromium) and
 * writes `.auth/user.json`. Login and session-security specs clear storage state
 * so they still start signed out.
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
    [
      'junit',
      {
        outputFile: 'build/junit/results.xml',
        // Include project name so multi-browser JUnit results stay distinguishable.
        includeProjectInTestName: true
      }
    ],
    ['./reporters/console-summary-reporter.ts']
  ],
  use: {
    baseURL: process.env.BASE_URL || DEFAULT_BASE_URL,
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
        ...authenticatedBrowserUse
      },
      dependencies: ['setup'],
      testIgnore: /auth\.setup\.ts/
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        ...authenticatedBrowserUse
      },
      dependencies: ['setup'],
      testIgnore: /auth\.setup\.ts/
    },
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        ...authenticatedBrowserUse
      },
      dependencies: ['setup'],
      testIgnore: /auth\.setup\.ts/
    },
    {
      name: 'edge',
      use: {
        ...devices['Desktop Edge'],
        channel: 'msedge',
        ...authenticatedBrowserUse
      },
      dependencies: ['setup'],
      testIgnore: /auth\.setup\.ts/
    },
    {
      name: 'chrome',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
        ...authenticatedBrowserUse
      },
      dependencies: ['setup'],
      testIgnore: /auth\.setup\.ts/
    }
  ]
});
