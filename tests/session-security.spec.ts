import { env } from '../config/env';
import { expect, test } from '../fixtures/test-fixtures';

test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Session', () => {
  test('Verify a logged out user cannot open the Products page by its URL',{ tag: ['@TC19', '@sanity', '@regression'] },
    async ({ loginPage, productsPage, page }) => {

      const accessError = "Epic sadface: You can only access '/inventory.html' when you are logged in.";

      await test.step('Log in with valid credentials, then click Logout', async () => {
        await loginPage.goto();
        await loginPage.login(env.standardUser, env.userPassword);
        await expect(page).toHaveURL(/\/inventory\.html$/);
        await productsPage.logout();
      });

      await test.step('Verify the user is logged out and the Login page is shown', async () => {
        await expect(page).toHaveURL(/\/$/);
        await expect(page.getByText('Swag Labs', { exact: true })).toBeVisible();
        await expect(loginPage.usernameInput).toBeVisible();
        await expect(loginPage.passwordInput).toBeVisible();
        await expect(loginPage.loginButton).toBeVisible();
      });

      await test.step('Open the Products page URL directly', async () => {
        await productsPage.goto();
      });

      await test.step('Verify the browser returns to the Login page', async () => {
        await expect(page).toHaveURL(/\/$/);
        await expect(page.getByText('Swag Labs', { exact: true })).toBeVisible();
        await expect(loginPage.loginButton).toBeVisible();
      });

      await test.step('Verify the products access error', async () => {
        await expect(loginPage.errorMessage).toContainText(accessError);
      });

      await test.step('Verify the all products, prices, and Add to cart buttons are not shown', async () => {
        await expect(productsPage.inventoryItems).toHaveCount(0);
        await expect(productsPage.prices).toHaveCount(0);
        await expect(productsPage.addToCartButtons).toHaveCount(0);
      });
    },
  );
});
