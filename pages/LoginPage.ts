import { type Locator, type Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class LoginPage extends BasePage {
  readonly appHeading: Locator;
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly errorMessage: Locator;
  readonly usernameErrorMark: Locator;
  readonly passwordErrorMark: Locator;

  constructor(page: Page) {
    super(page);
    this.appHeading = page.getByText('Swag Labs', { exact: true });
    this.usernameInput = page.getByTestId('username');
    this.passwordInput = page.getByTestId('password');
    this.loginButton = page.getByTestId('login-button');
    this.errorMessage = page.getByTestId('error');
    this.usernameErrorMark = page.locator('.form_group').filter({ has: this.usernameInput }).locator('.error_icon');
    this.passwordErrorMark = page.locator('.form_group').filter({ has: this.passwordInput }).locator('.error_icon');
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
