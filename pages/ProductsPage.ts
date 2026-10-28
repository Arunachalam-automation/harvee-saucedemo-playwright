import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class ProductsPage extends BasePage {
  readonly openMenuButton: Locator;
  readonly logoutButton: Locator;
  readonly inventoryItems: Locator;
  readonly prices: Locator;
  readonly addToCartButtons: Locator;
  readonly sortProducts: Locator;

  constructor(page: Page) {
    super(page);
    this.openMenuButton = page.getByRole('button', { name: 'Open Menu' });
    this.logoutButton = page.getByRole('button', { name: 'Logout' });
    this.inventoryItems = page.locator('[data-test="inventory-item"]');
    this.prices = page.locator('[data-test="inventory-item-price"]');
    this.addToCartButtons = page.getByRole('button', { name: 'Add to cart', exact: true });
    this.sortProducts = page.getByRole('combobox', { name: 'Sort products' });
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

  /**
   * Opens the Sort products list.
   */
  async openSortList(): Promise<void> {
    await this.sortProducts.click();
  }

  /**
   * Chooses a visible option from the Sort products list.
   * @param option - The sort option to choose, such as Price (low to high).
   */
  async sortBy(option: string): Promise<void> {
    await this.sortProducts.selectOption({ label: option });
  }

  /**
   * Returns the displayed product prices in the current list order.
   */
  async getDisplayedPrices(): Promise<number[]> {
    const texts = await this.prices.allTextContents();
    return texts.map((text) => Number(text.replace(/[^0-9.]/g, '')));
  }

  /**
   * Verifies that every displayed product price is in the requested order.
   * @param direction - The price order to validate, ascending or descending.
   */
  async expectPricesSorted(direction: 'ascending' | 'descending'): Promise<void> {
    await expect(async () => {
      const prices = await this.getDisplayedPrices();
      const itemCount = await this.inventoryItems.count();
      expect(prices).toHaveLength(itemCount);
      expect(prices.length).toBeGreaterThan(0);

      const sorted = [...prices].sort((left, right) =>
        direction === 'ascending' ? left - right : right - left,
      );
      expect(prices).toEqual(sorted);
    }).toPass();
  }
}
