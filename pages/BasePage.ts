import { type Page } from '@playwright/test';
import { env } from '../config/env';

/**
 * Shared navigation for page objects.
 * Routes are resolved against BASE_URL from config/env.ts.
 */
export class BasePage {
  protected readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Opens a path on the configured BASE_URL.
   * @param path - The path to open. Defaults to the application root.
   */
  async goto(path = '/'): Promise<void> {
    const base = env.baseURL.endsWith('/') ? env.baseURL : `${env.baseURL}/`;
    await this.page.goto(new URL(path, base).href);
  }
}
