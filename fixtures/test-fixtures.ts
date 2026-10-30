import path from 'node:path';
import { test as base, expect, type Browser, type Page, type PlaywrightWorkerArgs } from '@playwright/test';
import {
  enableObscuraRun,
  isObscuraRunEnabled,
  resolveObscuraCdpHeaders,
  resolveObscuraCdpUrl
} from '../config/obscura';
import { CartPage } from '../pages/CartPage';
import { CheckoutPage } from '../pages/CheckoutPage';
import { LoginPage } from '../pages/LoginPage';
import { ProductsPage } from '../pages/ProductsPage';

type TestFixtures = {
  loginPage: LoginPage;
  productsPage: ProductsPage;
  cartPage: CartPage;
  checkoutPage: CheckoutPage;
};

type ObscuraWorkerFixtures = {
  browser: Browser;
};

/** Matches `storageState` path written by `tests/auth.setup.ts`. */
const authStorageStatePath = path.resolve(__dirname, '..', '.auth', 'user.json');

// Workers inherit RUN_OBSCURA from the config/orchestrator; also honor CLI when present.
if (isObscuraRunEnabled()) {
  enableObscuraRun();
}

/**
 * Connects the worker to Obscura over CDP (not Playwright's `connect` protocol).
 * @param playwright Playwright API used to open the CDP connection.
 * @param use Fixture callback that receives the connected browser.
 */
async function connectObscuraBrowser(
  { playwright }: Pick<PlaywrightWorkerArgs, 'playwright'>,
  use: (browser: Browser) => Promise<void>
): Promise<void> {
  const endpointURL = resolveObscuraCdpUrl();
  const headers = resolveObscuraCdpHeaders();

  let browser: Browser;
  try {
    browser = await playwright.chromium.connectOverCDP({
      endpointURL,
      headers
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to connect to Obscura CDP at ${endpointURL}. ` +
        `Start Obscura first (e.g. \`obscura serve --port 9222\`) or set OBSCURA_CDP_URL. ` +
        `Cause: ${detail}`
    );
  }

  await use(browser);
  await browser.close();
}

/**
 * Opens a page in a fresh browser context, optionally with saved auth storage.
 * @param browser - Browser used to open the context.
 * @param baseURL - Playwright base URL for relative navigation.
 * @param storageState - Path to auth storage, or `undefined` for a signed-out session.
 * @param use - Fixture callback that receives the page.
 */
async function usePage(
  browser: Browser,
  baseURL: string | undefined,
  storageState: string | undefined,
  use: (page: Page) => Promise<void>
): Promise<void> {
  const context = await browser.newContext({
    baseURL,
    ...(storageState ? { storageState } : {})
  });
  const page = await context.newPage();
  try {
    await use(page);
  } finally {
    await context.close();
  }
}

const pageObjectFixtures: Parameters<typeof base.extend<TestFixtures>>[0] = {
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  productsPage: async ({ page }, use) => {
    await use(new ProductsPage(page));
  },
  cartPage: async ({ page }, use) => {
    await use(new CartPage(page));
  },
  checkoutPage: async ({ page }, use) => {
    await use(new CheckoutPage(page));
  }
};

/**
 * Authenticated fixtures. Overrides `page` with `.auth/user.json` storage state.
 * On Obscura runs, the worker browser is CDP-connected; otherwise Playwright
 * launches the project browser as usual.
 */
export const test = isObscuraRunEnabled()
  ? base.extend<TestFixtures, ObscuraWorkerFixtures>({
      browser: [connectObscuraBrowser, { scope: 'worker' }],
      page: async ({ browser, baseURL }, use) => {
        await usePage(browser, baseURL, authStorageStatePath, use);
      },
      ...pageObjectFixtures
    })
  : base.extend<TestFixtures>({
      page: async ({ browser, baseURL }, use) => {
        await usePage(browser, baseURL, authStorageStatePath, use);
      },
      ...pageObjectFixtures
    });

/**
 * Same page-object fixtures as `test`, but overrides `page` without storage state
 * so login and session-security specs start signed out.
 */
export const testNoAuth = test.extend({
  page: async ({ browser, baseURL }, use) => {
    await usePage(browser, baseURL, undefined, use);
  }
});

export { expect };
