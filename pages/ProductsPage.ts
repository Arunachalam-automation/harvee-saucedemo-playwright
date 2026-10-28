import { type Locator, type Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class ProductsPage extends BasePage {
  readonly openMenuButton: Locator;
  readonly logoutButton: Locator;
  readonly inventoryItems: Locator;
  readonly prices: Locator;
  readonly addToCartButtons: Locator;

  constructor(page: Page) {
    super(page);
    this.openMenuButton = page.getByRole('button', { name: 'Open Menu' });
    this.logoutButton = page.getByRole('button', { name: 'Logout' });
    this.inventoryItems = page.locator('[data-test="inventory-item"]');
    this.prices = page.locator('[data-test="inventory-item-price"]');
    this.addToCartButtons = page.getByRole('button', { name: 'Add to cart', exact: true });
  }

  /**
   * Opens the Products page.
   */
  async goto(): Promise<void> {
    await this.page.goto('/inventory.html');
  }

  /**
   * Opens the menu and logs out.
   */
  async logout(): Promise<void> {
    await this.openMenuButton.click();
    await this.logoutButton.click();
  }
}
