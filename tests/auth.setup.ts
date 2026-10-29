import fs from 'node:fs/promises';
import path from 'node:path';
import { expect, test as setup } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { ProductsPage } from '../pages/ProductsPage';
import authUsers from '../test-data/auth/users.json';

/** Matches storageState in playwright.config.ts. */
const storageStatePath = path.resolve(__dirname, '..', '.auth', 'user.json');

setup('authenticate as standard user', async ({ page }) => {
  const loginPage = new LoginPage(page);
  const productsPage = new ProductsPage(page);

  await loginPage.goto();
  await loginPage.login(
    process.env.STANDARD_USER || authUsers.standard.username,
    process.env.USER_PASSWORD || authUsers.standard.password
  );

  const inventory = productsPage.inventoryContainer;
  const loginError = loginPage.errorMessage;

  await expect(
    inventory.or(loginError),
    'Login did not reach the inventory page or show a login error. Check BASE_URL and network access. Storage state was not saved.'
  ).toBeVisible();

  if (await loginError.isVisible()) {
    const message = (await loginError.innerText()).trim();
    throw new Error(
      `Authentication failed for the configured STANDARD_USER. SauceDemo reported: "${message}". Storage state was not saved. Check BASE_URL, STANDARD_USER, and USER_PASSWORD in .env.`
    );
  }

  await expect(inventory).toBeVisible();

  await fs.mkdir(path.dirname(storageStatePath), { recursive: true });
  await page.context().storageState({ path: storageStatePath });
});
