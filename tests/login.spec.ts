import { expect, testNoAuth as test } from '../fixtures/test-fixtures';
import authMessages from '../test-data/auth/messages.json';
import authUsers from '../test-data/auth/users.json';

test.describe('Login', () => {
  test(
    'Verify the Valid user logs in and the products page is shown',
    { tag: ['@TC01', '@smoke', '@e2e', '@regression'] },
    async ({ loginPage, productsPage, page }) => {
      await test.step('Hit the application URL', async () => {
        await loginPage.goto();
      });

      await test.step('Validate the heading Swag Labs', async () => {
        await expect(loginPage.appHeading).toBeVisible();
      });

      await test.step('Validate Username, Password, and Login', async () => {
        await expect(loginPage.usernameInput).toBeVisible();
        await expect(loginPage.usernameInput).toHaveAttribute('placeholder', 'Username');
        await expect(loginPage.passwordInput).toBeVisible();
        await expect(loginPage.passwordInput).toHaveAttribute('placeholder', 'Password');
        await expect(loginPage.loginButton).toBeVisible();
        await expect(loginPage.loginButton).toHaveValue('Login');
      });

      await test.step('Enter the valid username and password', async () => {
        await loginPage.enterCredentials(
          process.env.STANDARD_USER || authUsers.standard.username,
          process.env.USER_PASSWORD || authUsers.standard.password
        );
      });

      await test.step('Click the Login button', async () => {
        await loginPage.submitLogin();
      });

      await test.step('Verify navigation to the Products page', async () => {
        await expect(page).toHaveURL(/\/inventory\.html$/);
        await expect(loginPage.errorMessage).toBeHidden();
      });

      await test.step('Verify the Products heading and displayed products', async () => {
        await expect(productsPage.title).toHaveText('Products');
        await expect(productsPage.inventoryItems.first()).toBeVisible();

        const productCount = await productsPage.inventoryItems.count();
        await expect(productsPage.productNames).toHaveCount(productCount);
        await expect(productsPage.prices).toHaveCount(productCount);

        for (let index = 0; index < productCount; index += 1) {
          expect(await productsPage.productNames.nth(index).textContent()).not.toBeNull();
          expect(await productsPage.prices.nth(index).textContent()).not.toBeNull();
        }
      });
    }
  );

  test(
    'Verify the invalid user credentials unable to login',
    { tag: ['@TC02', '@sanity', '@regression'] },
    async ({ loginPage, productsPage, page }) => {
      await test.step('Hit the application URL', async () => {
        await loginPage.goto();
      });

      await test.step('Validate the heading, fields, and Login button', async () => {
        await expect(loginPage.appHeading).toBeVisible();
        await expect(loginPage.usernameInput).toBeVisible();
        await expect(loginPage.usernameInput).toHaveAttribute('placeholder', 'Username');
        await expect(loginPage.passwordInput).toBeVisible();
        await expect(loginPage.passwordInput).toHaveAttribute('placeholder', 'Password');
        await expect(loginPage.loginButton).toBeVisible();
        await expect(loginPage.loginButton).toHaveValue('Login');
      });

      await test.step('Enter the locked-out username and valid password', async () => {
        await loginPage.enterCredentials(
          process.env.LOCKED_USER || authUsers.locked.username,
          process.env.USER_PASSWORD || authUsers.locked.password
        );
      });

      await test.step('Click the Login button', async () => {
        await loginPage.submitLogin();
      });

      await test.step('Verify the locked-out error message', async () => {
        await expect(loginPage.errorMessage).toContainText(authMessages.lockedOut);
      });

      await test.step('Verify the typed values and red error marks remain', async () => {
        await expect(loginPage.usernameInput).toHaveValue(authUsers.locked.username);
        await expect(loginPage.passwordInput).toHaveValue(authUsers.locked.password);
        await expect(loginPage.usernameInput).toHaveClass(/input_error/);
        await expect(loginPage.passwordInput).toHaveClass(/input_error/);
        await expect(loginPage.usernameErrorMark).toBeVisible();
        await expect(loginPage.passwordErrorMark).toBeVisible();
      });

      await test.step('Verify the user stays on Login and Products is not shown', async () => {
        await expect(page).toHaveURL(/\/$/);
        await expect(productsPage.inventoryContainer).toHaveCount(0);
        await expect(productsPage.inventoryItems).toHaveCount(0);
        await expect(productsPage.title).toHaveCount(0);
      });
    }
  );

  test(
    'Verify the valid user is not logged in with an invalid password',
    { tag: ['@TC03', '@sanity', '@regression'] },
    async ({ loginPage, productsPage, page }) => {
      await test.step('Hit the application URL', async () => {
        await loginPage.goto();
      });

      await test.step('Enter the valid username', async () => {
        await loginPage.enterUsername(process.env.STANDARD_USER || authUsers.standard.username);
      });

      await test.step('Enter the invalid password', async () => {
        await loginPage.enterPassword(authUsers.invalidPassword);
      });

      await test.step('Click the Login button', async () => {
        await loginPage.submitLogin();
      });

      await test.step('Verify the credential mismatch error message', async () => {
        await expect(loginPage.errorMessage).toContainText(authMessages.credentialMismatch);
      });

      await test.step('Verify both fields keep the typed values and show the red error mark', async () => {
        await expect(loginPage.usernameInput).toHaveValue(process.env.STANDARD_USER || authUsers.standard.username);
        await expect(loginPage.passwordInput).toHaveValue(authUsers.invalidPassword);
        await expect(loginPage.usernameInput).toHaveClass(/input_error/);
        await expect(loginPage.passwordInput).toHaveClass(/input_error/);
        await expect(loginPage.usernameErrorMark).toBeVisible();
        await expect(loginPage.passwordErrorMark).toBeVisible();
      });

      await test.step('Verify the user stays on Login and Products is not shown', async () => {
        await expect(page).toHaveURL(/\/$/);
        await expect(productsPage.inventoryContainer).toHaveCount(0);
        await expect(productsPage.inventoryItems).toHaveCount(0);
        await expect(productsPage.title).toHaveCount(0);
      });
    }
  );
});
