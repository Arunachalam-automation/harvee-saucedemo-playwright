import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { LoginPage } from './LoginPage';
import { ProductsPage } from './ProductsPage';

export class CheckoutPage extends BasePage {
  readonly title: Locator;
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly postalCodeInput: Locator;
  readonly continueButton: Locator;
  readonly finishButton: Locator;
  readonly errorMessage: Locator;
  readonly errorDismissButton: Locator;
  readonly firstNameErrorMark: Locator;
  readonly lastNameErrorMark: Locator;
  readonly postalCodeErrorMark: Locator;
  readonly paymentInfoValue: Locator;
  readonly shippingInfoValue: Locator;
  readonly itemTotalLabel: Locator;
  readonly taxLabel: Locator;
  readonly totalLabel: Locator;
  readonly completeHeader: Locator;
  readonly completeText: Locator;
  readonly backHomeButton: Locator;
  readonly cartBadge: Locator;
  readonly overviewSummary: Locator;
  private readonly productsPage: ProductsPage;

  constructor(page: Page) {
    super(page);
    this.productsPage = new ProductsPage(page);
    const loginPage = new LoginPage(page);

    this.title = this.productsPage.title;
    this.cartBadge = this.productsPage.cartBadge;
    this.errorMessage = loginPage.errorMessage;

    this.firstNameInput = page.getByTestId('firstName');
    this.lastNameInput = page.getByTestId('lastName');
    this.postalCodeInput = page.getByTestId('postalCode');
    this.continueButton = page.getByRole('button', { name: 'Continue', exact: true });
    this.finishButton = page.getByRole('button', { name: 'Finish', exact: true });
    this.errorDismissButton = page.getByTestId('error-button');
    this.firstNameErrorMark = page.locator('.form_group:has([data-test="firstName"]) .error_icon');
    this.lastNameErrorMark = page.locator('.form_group:has([data-test="lastName"]) .error_icon');
    this.postalCodeErrorMark = page.locator('.form_group:has([data-test="postalCode"]) .error_icon');
    this.paymentInfoValue = page.getByTestId('payment-info-value');
    this.shippingInfoValue = page.getByTestId('shipping-info-value');
    this.itemTotalLabel = page.getByTestId('subtotal-label');
    this.taxLabel = page.getByTestId('tax-label');
    this.totalLabel = page.getByTestId('total-label');
    this.completeHeader = page.getByTestId('complete-header');
    this.completeText = page.getByTestId('complete-text');
    this.backHomeButton = page.getByRole('button', { name: 'Back Home', exact: true });
    this.overviewSummary = page.getByTestId('checkout-summary-container');
  }

  /**
   * Opens the Checkout: Your Information page.
   */
  async gotoInformation(): Promise<void> {
    await this.page.goto('/checkout-step-one.html');
  }

  /**
   * Fills the First Name field.
   * @param firstName - The first name to enter.
   */
  async enterFirstName(firstName: string): Promise<void> {
    await this.firstNameInput.fill(firstName);
  }

  /**
   * Fills the Last Name field.
   * @param lastName - The last name to enter.
   */
  async enterLastName(lastName: string): Promise<void> {
    await this.lastNameInput.fill(lastName);
  }

  /**
   * Fills the Zip/Postal Code field.
   * @param postalCode - The postal code to enter.
   */
  async enterPostalCode(postalCode: string): Promise<void> {
    await this.postalCodeInput.fill(postalCode);
  }

  /**
   * Fills First Name, Last Name, and Zip/Postal Code.
   * @param firstName - The first name to enter.
   * @param lastName - The last name to enter.
   * @param postalCode - The postal code to enter.
   */
  async fillYourInformation(firstName: string, lastName: string, postalCode: string): Promise<void> {
    await this.enterFirstName(firstName);
    await this.enterLastName(lastName);
    await this.enterPostalCode(postalCode);
  }

  /**
   * Clicks Continue on the checkout information form.
   */
  async continue(): Promise<void> {
    await this.continueButton.click();
  }

  /**
   * Clicks Finish on the checkout overview.
   */
  async finish(): Promise<void> {
    await this.finishButton.click();
  }

  /**
   * Clicks the dismiss control on the checkout error banner.
   */
  async dismissError(): Promise<void> {
    await this.errorDismissButton.click();
  }

  /**
   * Clicks Back Home on the checkout complete page.
   */
  async backHome(): Promise<void> {
    await this.backHomeButton.click();
  }

  /**
   * Verifies the heading is Checkout: Your Information.
   */
  async expectYourInformationHeading(): Promise<void> {
    await expect(this.title).toHaveText('Checkout: Your Information');
  }

  /**
   * Verifies the heading is Checkout: Overview.
   */
  async expectOverviewHeading(): Promise<void> {
    await expect(this.title).toHaveText('Checkout: Overview');
  }

  /**
   * Verifies the heading is Checkout: Complete!.
   */
  async expectCompleteHeading(): Promise<void> {
    await expect(this.title).toHaveText('Checkout: Complete!');
  }

  /**
   * Verifies the visible checkout form error message.
   * @param message - The expected error text.
   */
  async expectErrorMessage(message: string): Promise<void> {
    await expect(this.errorMessage).toHaveText(message);
  }

  /**
   * Verifies the checkout error banner is closed.
   */
  async expectErrorBannerClosed(): Promise<void> {
    await expect(this.errorMessage).toBeHidden();
  }

  /**
   * Verifies First Name, Last Name, and Zip/Postal Code show the red error mark.
   */
  async expectAllFieldsShowErrorMarks(): Promise<void> {
    await expect(this.firstNameInput).toHaveClass(/input_error/);
    await expect(this.lastNameInput).toHaveClass(/input_error/);
    await expect(this.postalCodeInput).toHaveClass(/input_error/);
    await expect(this.firstNameErrorMark).toBeVisible();
    await expect(this.lastNameErrorMark).toBeVisible();
    await expect(this.postalCodeErrorMark).toBeVisible();
  }

  /**
   * Verifies Checkout: Overview is not shown.
   */
  async expectOverviewNotShown(): Promise<void> {
    await expect(this.page).toHaveURL(/\/checkout-step-one\.html$/);
    await expect(this.title).toHaveText('Checkout: Your Information');
    await expect(this.overviewSummary).toHaveCount(0);
  }

  /**
   * Verifies the cart badge shows the expected item count.
   * @param count - The expected badge number.
   */
  async expectCartBadgeCount(count: number): Promise<void> {
    await this.productsPage.expectCartBadgeCount(count);
  }

  /**
   * Verifies Payment Information matches SauceCard with a dynamic order id.
   */
  async expectPaymentInformation(): Promise<void> {
    await expect(this.paymentInfoValue).toHaveText(/SauceCard #\d+/);
  }

  /**
   * Verifies Shipping Information shows the delivery partner text.
   * @param deliveryPartner - The expected shipping/delivery partner text.
   */
  async expectShippingInformation(deliveryPartner: string): Promise<void> {
    await expect(this.shippingInfoValue).toHaveText(deliveryPartner);
  }

  /**
   * Verifies the Item total label matches the expected amount.
   * @param amount - The expected item total text including currency, such as $39.98.
   */
  async expectItemTotal(amount: string): Promise<void> {
    await expect(this.itemTotalLabel).toHaveText(`Item total: ${amount}`);
  }

  /**
   * Verifies Total equals the displayed Item total plus Tax.
   */
  async expectTotalEqualsItemPlusTax(): Promise<void> {
    await expect(async () => {
      const itemTotal = Number((await this.itemTotalLabel.innerText()).replace(/[^0-9.]/g, ''));
      const tax = Number((await this.taxLabel.innerText()).replace(/[^0-9.]/g, ''));
      const total = Number((await this.totalLabel.innerText()).replace(/[^0-9.]/g, ''));
      expect(itemTotal).toBeGreaterThan(0);
      expect(tax).toBeGreaterThan(0);
      expect(total).toBeCloseTo(itemTotal + tax, 2);
    }).toPass();
  }

  /**
   * Verifies the order completion messages on Checkout: Complete!.
   */
  async expectOrderCompleteMessages(): Promise<void> {
    await expect(this.completeHeader).toHaveText('Thank you for your order!');
    await expect(this.completeText).toHaveText(
      'Your order has been dispatched, and will arrive just as fast as the pony can get there!'
    );
  }

  /**
   * Verifies the cart badge is gone.
   */
  async expectCartBadgeGone(): Promise<void> {
    await this.productsPage.expectCartBadgeGone();
  }
}
