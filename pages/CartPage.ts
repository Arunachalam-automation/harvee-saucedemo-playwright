import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class CartPage extends BasePage {
  readonly title: Locator;
  readonly cartItems: Locator;
  readonly continueShoppingButton: Locator;
  readonly cartBadge: Locator;

  constructor(page: Page) {
    super(page);
    this.title = page.getByTestId('title');
    this.cartItems = page.locator('[data-test="inventory-item"]');
    this.continueShoppingButton = page.getByRole('button', {
      name: 'Continue Shopping',
      exact: true
    });
    this.cartBadge = page.getByTestId('shopping-cart-badge');
  }

  /**
   * Opens the cart page.
   */
  async goto(): Promise<void> {
    await this.page.goto('/cart.html');
  }

  /**
   * Returns the cart line that contains the given product name.
   * @param productName - The product name shown in the cart line.
   */
  cartItem(productName: string): Locator {
    return this.cartItems.filter({
      has: this.page.getByTestId('inventory-item-name').filter({ hasText: productName })
    });
  }

  /**
   * Clicks Continue Shopping to return to the Products page.
   */
  async continueShopping(): Promise<void> {
    await this.continueShoppingButton.click();
  }

  /**
   * Verifies the cart page heading is Your Cart.
   */
  async expectYourCartHeading(): Promise<void> {
    await expect(this.title).toHaveText('Your Cart');
  }

  /**
   * Finds the cart card for the product name, then verifies its quantity and price.
   * @param productName - Product name used to locate the cart card.
   * @param quantity - Expected quantity text listed on that card.
   * @param price - Expected price text listed on that card, such as $29.99.
   */
  async expectCartLine(productName: string, quantity: string, price: string): Promise<void> {
    const card = this.cartItem(productName);
    await expect(card).toBeVisible();
    await expect(card.getByTestId('item-quantity')).toHaveText(quantity);
    await expect(card.getByTestId('inventory-item-price')).toHaveText(price);
  }

  /**
   * Verifies the cart lists only the given product.
   * @param productName - The only product expected in the cart.
   */
  async expectOnlyProductListed(productName: string): Promise<void> {
    await expect(this.cartItems).toHaveCount(1);
    await expect(this.cartItem(productName)).toBeVisible();
  }

  /**
   * Verifies the named product is not listed in the cart.
   * @param productName - The product that must not appear.
   */
  async expectProductNotListed(productName: string): Promise<void> {
    await expect(this.cartItem(productName)).toHaveCount(0);
  }

  /**
   * Verifies the cart badge shows the expected item count.
   * @param count - The expected badge number.
   */
  async expectCartBadgeCount(count: number): Promise<void> {
    await expect(this.cartBadge).toHaveText(String(count));
  }
}
