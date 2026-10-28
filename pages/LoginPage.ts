import { type Locator, type Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class LoginPage extends BasePage {
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly errorMessage: Locator;
  readonly usernameErrorMark: Locator;
  readonly passwordErrorMark: Locator;

  constructor(page: Page) {
    super(page);
    this.usernameInput = page.locator('[data-test="username"]');
    this.passwordInput = page.locator('[data-test="password"]');
    this.loginButton = page.locator('[data-test="login-button"]');
    this.errorMessage = page.locator('[data-test="error"]');
    this.usernameErrorMark = page.locator('.form_group:has([data-test="username"]) .error_icon');
    this.passwordErrorMark = page.locator('.form_group:has([data-test="password"]) .error_icon');
  }

  /**
   * Fills the username field.
   * @param username - The username to enter.
   */
  async enterUsername(username: string): Promise<void> {
    await this.usernameInput.fill(username);
  }

  /**
   * Fills the password field.
   * @param password - The password to enter.
   */
  async enterPassword(password: string): Promise<void> {
    await this.passwordInput.fill(password);
  }

  /**
   * Fills the username and password fields.
   * @param username - The username to enter.
   * @param password - The password to enter.
   */
  async enterCredentials(username: string, password: string): Promise<void> {
    await this.enterUsername(username);
    await this.enterPassword(password);
  }

  /**
   * Clicks the Login button.
   */
  async submitLogin(): Promise<void> {
    await this.loginButton.click();
  }

  /**
   * Enters the credentials and submits the login form.
   * @param username - The username to enter.
   * @param password - The password to enter.
   */
  async login(username: string, password: string): Promise<void> {
    await this.enterCredentials(username, password);
    await this.submitLogin();
  }

  /**
   * Returns the visible login error message.
   */
  async getErrorMessage(): Promise<string> {
    return (await this.errorMessage.innerText()).trim();
  }
}
