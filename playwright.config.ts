import { defineConfig, devices, type Project } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';
import { enableObscuraRun, isObscuraRunEnabled } from './config/obscura';

// quiet: true suppresses dotenv's "injected env" banner; values still load normally.
// Playwright workers re-import this module, so without quiet the banner repeats per process.
dotenv.config({ path: path.resolve(__dirname, '.env'), quiet: true });

/** Default SauceDemo origin when BASE_URL is missing or blank. */
const DEFAULT_BASE_URL = 'https://www.saucedemo.com';

/**
 * Shared settings for every browser project that depends on auth setup.
 * Session storage is applied in `fixtures/test-fixtures.ts` via `page` overrides
 * (`test` loads `.auth/user.json`; `testNoAuth` opens a signed-out context).
 *
 * Specs that must start signed out (login, session-security) import `testNoAuth`
 * instead of needing a separate Playwright project.
 */
const authenticatedBrowserUse = {} as const;

/** Setup-only file; regular browser projects must not pick it up as a suite. */
const regularSuiteIgnore = [/auth\.setup\.ts/];

const setupProject: Project = {
  name: 'setup',
  testMatch: /auth\.setup\.ts/
};

const standardBrowserProjects: Project[] = [
  {
    name: 'chromium',
    use: {
      ...devices['Desktop Chrome'],
      ...authenticatedBrowserUse
    },
    dependencies: ['setup'],
    testIgnore: regularSuiteIgnore
  },
  {
    name: 'firefox',
    use: {
      ...devices['Desktop Firefox'],
      ...authenticatedBrowserUse
    },
    dependencies: ['setup'],
    testIgnore: regularSuiteIgnore
  },
  {
    name: 'webkit',
    use: {
      ...devices['Desktop Safari'],
      ...authenticatedBrowserUse
    },
    dependencies: ['setup'],
    testIgnore: regularSuiteIgnore
  },
  {
    name: 'edge',
    use: {
      ...devices['Desktop Edge'],
      channel: 'msedge',
      ...authenticatedBrowserUse
    },
    dependencies: ['setup'],
    testIgnore: regularSuiteIgnore
  },
  {
    name: 'chrome',
    use: {
      ...devices['Desktop Chrome'],
      channel: 'chrome',
      ...authenticatedBrowserUse
    },
    dependencies: ['setup'],
    testIgnore: regularSuiteIgnore
  }
];

/**
 * Opt-in Obscura CDP project. Registered only when `--project=obscura` (or RUN_OBSCURA=1)
 * so default `npm test` never launches Obscura. Auth setup still uses bundled Chromium.
 * Trace/video stay off — Obscura does not implement Playwright desktop capture.
 */
const obscuraProject: Project = {
  name: 'obscura',
  use: {
    ...devices['Desktop Chrome'],
    ...authenticatedBrowserUse,
    trace: 'off',
    video: 'off'
  },
  dependencies: ['setup'],
  testIgnore: regularSuiteIgnore
};

const obscuraRun = isObscuraRunEnabled();
if (obscuraRun) {
  enableObscuraRun();
}

/**
 * SauceDemo Playwright configuration.
 *
 * Suite selection (smoke / regression / E2E / Sanity) is driven by npm scripts via
 * `--grep` tags (@smoke, @regression, @e2e, @sanity), not by separate projects.
 *
 * Browser selection is driven by Playwright projects (chromium, firefox, webkit,
 * edge, chrome) and matching npm scripts (`test:chromium`, etc.).
 *
 * Obscura is opt-in only: `npm run test:obscura` / `--project=obscura`. It is not
 * part of the default multi-browser matrix. Connect with `connectOverCDP` via fixtures.
 *
 * The `setup` project runs `tests/auth.setup.ts` once (bundled Chromium) and
 * writes `.auth/user.json`. Authenticated specs use fixtures `test` (page with
 * storage); login and session-security use `testNoAuth` (page without storage).
 *
 * Reporting: JSON (custom HTML input) + list + console summary.
 * The custom HTML report is generated after the run by `scripts/run-with-report.mjs`.
 */
export default defineConfig({
  testDir: './tests',
  outputDir: 'build/test-results',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 1, // One automatic re-run for failures (initial attempt + 1 retry).
  reporter: [
    // Explicit list reporter: Playwright otherwise injects `line` (TTY single-line \r updates),
    // which overwrites "[n/m] setup" progress and looks broken with test.only / short runs.
    ['list'],
    ['json', { outputFile: 'build/json-report/results.json' }],
    ['./reporters/console-summary-reporter.ts'],
    // After JSON is flushed (onExit), rebuild build/html-report so show-report always matches the last run.
    ['./reporters/custom-html-report-reporter.ts']
  ],
  use: {
    baseURL: process.env.BASE_URL || DEFAULT_BASE_URL,
    testIdAttribute: 'data-test',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure'
  },
  projects: obscuraRun ? [setupProject, obscuraProject] : [setupProject, ...standardBrowserProjects]
});
