import { type Page } from '@playwright/test';

/**
 * Shared navigation for page objects.
 * Paths are resolved against Playwright `use.baseURL` (from `process.env.BASE_URL`).
 */
export class BasePage {
  protected readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Opens a path relative to the configured base URL.
   * @param path - The path to open. Defaults to the application root.
   */
  async goto(path = '/'): Promise<void> {
    await this.page.goto(path);
  }
}
