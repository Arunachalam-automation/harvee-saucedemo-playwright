import { expect, testNoAuth as test } from '../fixtures/test-fixtures';
import authUsers from '../test-data/auth/users.json';
import sessionSecurityMessages from '../test-data/session-security/messages.json';

test.describe('Session', () => {
  test(
    'Verify a logged out user cannot open the Products page by its URL',
    { tag: ['@TC19', '@sanity', '@regression'] },
    async ({ loginPage, productsPage, page }) => {
      await test.step('Log in with valid credentials, then click Logout', async () => {
        await loginPage.goto();
        await loginPage.login(
          process.env.STANDARD_USER || authUsers.standard.username,
          process.env.USER_PASSWORD || authUsers.standard.password
        );
        await expect(page).toHaveURL(/\/inventory\.html$/);
        await productsPage.logout();
      });

      await test.step('Verify the user is logged out and the Login page is shown', async () => {
        await expect(page).toHaveURL(/\/$/);
        await expect(loginPage.appHeading).toBeVisible();
        await expect(loginPage.usernameInput).toBeVisible();
        await expect(loginPage.passwordInput).toBeVisible();
        await expect(loginPage.loginButton).toBeVisible();
      });

      await test.step('Open the Products page URL directly', async () => {
        await productsPage.goto();
      });

      await test.step('Verify the browser returns to the Login page', async () => {
        await expect(page).toHaveURL(/\/$/);
        await expect(loginPage.appHeading).toBeVisible();
        await expect(loginPage.loginButton).toBeVisible();
      });

      await test.step('Verify the products access error', async () => {
        await expect(loginPage.errorMessage).toContainText(sessionSecurityMessages.inventoryAccessDenied);
      });

      await test.step('Verify the all products, prices, and Add to cart buttons are not shown', async () => {
        await expect(productsPage.inventoryItems).toHaveCount(0);
        await expect(productsPage.prices).toHaveCount(0);
        await expect(productsPage.addToCartButtons).toHaveCount(0);
      });
    }
  );
});
