import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class ProductsPage extends BasePage {
  readonly openMenuButton: Locator;
  readonly logoutButton: Locator;
  readonly inventoryItems: Locator;
  readonly prices: Locator;
  readonly addToCartButtons: Locator;
  readonly sortProducts: Locator;
  readonly shoppingCartLink: Locator;
  readonly cartBadge: Locator;
  readonly title: Locator;

  constructor(page: Page) {
    super(page);
    this.openMenuButton = page.getByRole('button', { name: 'Open Menu' });
    this.logoutButton = page.getByRole('button', { name: 'Logout' });
    this.inventoryItems = page.locator('[data-test="inventory-item"]');
    this.prices = page.locator('[data-test="inventory-item-price"]');
    this.addToCartButtons = page.getByRole('button', { name: 'Add to cart', exact: true });
    this.sortProducts = page.getByRole('combobox', { name: 'Sort products' });
    this.shoppingCartLink = page.getByTestId('shopping-cart-link');
    this.cartBadge = page.getByTestId('shopping-cart-badge');
    this.title = page.getByTestId('title');
  }

  /**
   * Opens the Products page.
   */
  async goto(): Promise<void> {
    await this.page.goto('/inventory.html');
  }

  /**
   * Returns the inventory card for a product by its visible name.
   * @param productName - The product name shown on the card.
   */
  productCard(productName: string): Locator {
    return this.inventoryItems.filter({
      has: this.page.getByTestId('inventory-item-name').filter({ hasText: productName })
    });
  }

  /**
   * Returns the Add to cart / Remove button for a product card.
   * @param productName - The product name shown on the card.
   */
  productActionButton(productName: string): Locator {
    return this.productCard(productName).getByRole('button', {
      name: /^(Add to cart|Remove)$/
    });
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

      const sorted = [...prices].sort((left, right) => (direction === 'ascending' ? left - right : right - left));
      expect(prices).toEqual(sorted);
    }).toPass();
  }

  /**
   * Returns the price text shown on a product card.
   * @param productName - The product name shown on the card.
   */
  async getProductPrice(productName: string): Promise<string> {
    return (await this.productCard(productName).getByTestId('inventory-item-price').innerText()).trim();
  }

  /**
   * Clicks Add to cart on the named product.
   * @param productName - The product to add.
   */
  async addToCart(productName: string): Promise<void> {
    await this.productCard(productName).getByRole('button', { name: 'Add to cart', exact: true }).click();
  }

  /**
   * Clicks Remove on the named product.
   * @param productName - The product to remove from the cart.
   */
  async removeFromCart(productName: string): Promise<void> {
    await this.productCard(productName).getByRole('button', { name: 'Remove', exact: true }).click();
  }

  /**
   * Opens the shopping cart from the header link.
   */
  async openCart(): Promise<void> {
    await this.shoppingCartLink.click();
  }

  /**
   * Verifies the cart badge shows the expected item count.
   * @param count - The expected badge number.
   */
  async expectCartBadgeCount(count: number): Promise<void> {
    await expect(this.cartBadge).toHaveText(String(count));
  }

  /**
   * Verifies the product card action button shows the expected label.
   * @param productName - The product name shown on the card.
   * @param label - The expected button label, Add to cart or Remove.
   */
  async expectProductButtonLabel(productName: string, label: 'Add to cart' | 'Remove'): Promise<void> {
    await expect(this.productActionButton(productName)).toHaveText(label);
  }
}
