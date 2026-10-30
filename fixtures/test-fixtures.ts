import fs from 'node:fs/promises';
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

type SavedCookie = {
  name: string;
  value: string;
  path: string;
  expires: number;
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'Strict' | 'Lax' | 'None';
};

type SavedStorageState = {
  cookies: SavedCookie[];
  origins: { origin: string; localStorage: { name: string; value: string }[] }[];
};

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
 * Writes cookies and localStorage from a Playwright storage-state file.
 * Obscura rejects `Network.setBypassServiceWorker`, which Playwright sends for `storageState`.
 * @param page Page already opened in the Obscura context.
 * @param storageStatePath Path to `.auth/user.json`.
 */
async function restoreAuthOnObscura(page: Page, storageStatePath: string): Promise<void> {
  const state = JSON.parse(await fs.readFile(storageStatePath, 'utf8')) as SavedStorageState;
  const origin = state.origins[0]?.origin;
  if (!origin) {
    throw new Error(`Obscura auth restore found no origin in ${storageStatePath}.`);
  }

  const localStorageItems = state.origins.find((entry) => entry.origin === origin)?.localStorage ?? [];
  await page.goto(origin);
  await page.evaluate(
    ({ cookies, items }) => {
      for (const cookie of cookies) {
        if (cookie.httpOnly) {
          continue;
        }
        const parts = [`${cookie.name}=${cookie.value}`, `path=${cookie.path}`];
        if (cookie.expires > 0) {
          parts.push(`expires=${new Date(cookie.expires * 1000).toUTCString()}`);
        }
        if (cookie.secure) {
          parts.push('Secure');
        }
        if (cookie.sameSite) {
          parts.push(`SameSite=${cookie.sameSite}`);
        }
        document.cookie = parts.join('; ');
      }
      for (const item of items) {
        localStorage.setItem(item.name, item.value);
      }
    },
    { cookies: state.cookies, items: localStorageItems }
  );
}

/**
 * Opens a page in a fresh browser context, optionally with saved auth storage.
 * Obscura restores `.auth/user.json` in the page. Other browsers use Playwright `storageState`.
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
  const restoreManually = Boolean(storageState) && isObscuraRunEnabled();
  const context = await browser.newContext({
    baseURL,
    ...(storageState && !restoreManually ? { storageState } : {})
  });
  const page = await context.newPage();
  try {
    if (restoreManually && storageState) {
      await restoreAuthOnObscura(page, storageState);
    }
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
