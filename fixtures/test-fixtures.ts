import { test as base, expect, type Browser, type PlaywrightWorkerArgs } from '@playwright/test';
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

/** Empty storage so unauthenticated specs ignore project-level `.auth/user.json`. */
const emptyStorageState = { cookies: [], origins: [] };

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
 * Authenticated fixtures. On Obscura runs, the worker browser is CDP-connected;
 * otherwise Playwright launches the project browser as usual.
 */
export const test = isObscuraRunEnabled()
  ? base.extend<TestFixtures, ObscuraWorkerFixtures>({
      browser: [connectObscuraBrowser, { scope: 'worker' }],
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
    })
  : base.extend<TestFixtures>({
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
    });

/**
 * Same page-object fixtures as `test`, but without auth storage state.
 * Used by login and session-security specs inside the same browser projects.
 */
export const testNoAuth = test.extend({});

testNoAuth.use({ storageState: emptyStorageState });

export { expect };
