import { expect, test } from '../fixtures/test-fixtures';
import cartItems from '../test-data/cart/items.json';
import checkoutCustomer from '../test-data/checkout/customer.json';
import checkoutMessages from '../test-data/checkout/messages.json';
import checkoutShipping from '../test-data/checkout/shipping.json';

test.describe('Checkout', () => {
  test(
    'Verify checkout shows an error when first name, last name, or postal code is missing',
    { tag: ['@TC13', '@regression'] },
    async ({ productsPage, cartPage, checkoutPage }) => {
      const { productA } = cartItems;
      const { firstName, lastName } = checkoutCustomer;

      await test.step('Open the Products page', async () => {
        await productsPage.goto();
        await expect(productsPage.inventoryItems.first()).toBeVisible();
      });

      await test.step('Add Product A to the cart', async () => {
        await productsPage.addToCart(productA);
        await productsPage.expectCartBadgeCount(1);
      });

      await test.step('Open the cart', async () => {
        await productsPage.openCart();
        await cartPage.expectYourCartHeading();
      });

      await test.step('Click Checkout and open Checkout: Your Information', async () => {
        await cartPage.checkout();
        await checkoutPage.expectYourInformationHeading();
      });

      await test.step('Leave First Name, Last Name, and Zip/Postal Code empty and click Continue', async () => {
        await checkoutPage.continue();
      });

      await test.step('Verify the error Error: First Name is required and the page stays on Checkout: Your Information', async () => {
        await checkoutPage.expectErrorMessage(checkoutMessages.firstNameRequired);
        await checkoutPage.expectYourInformationHeading();
      });

      await test.step('Enter First Name and Leave Last Name and Zip/Postal Code empty. Click Continue', async () => {
        await checkoutPage.enterFirstName(firstName);
        await checkoutPage.continue();
      });

      await test.step('Verify the error Error: Last Name is required', async () => {
        await checkoutPage.expectErrorMessage(checkoutMessages.lastNameRequired);
      });

      await test.step('Enter Last Name and Leave Zip/Postal Code empty. Click Continue', async () => {
        await checkoutPage.enterLastName(lastName);
        await checkoutPage.continue();
      });

      await test.step('Verify the error Error: Postal Code is required', async () => {
        await checkoutPage.expectErrorMessage(checkoutMessages.postalCodeRequired);
      });

      await test.step('Verify First Name, Last Name, and Zip/Postal Code all show the red error mark, including the filled fields', async () => {
        await expect(checkoutPage.firstNameInput).toHaveValue(firstName);
        await expect(checkoutPage.lastNameInput).toHaveValue(lastName);
        await expect(checkoutPage.postalCodeInput).toHaveValue('');
        await checkoutPage.expectAllFieldsShowErrorMarks();
      });

      await test.step('Verify Checkout: Overview is not shown and the cart badge is unchanged', async () => {
        await checkoutPage.expectOverviewNotShown();
        await checkoutPage.expectCartBadgeCount(1);
      });

      await test.step('Click Dismiss error and verify the red banner closes', async () => {
        await checkoutPage.dismissError();
        await checkoutPage.expectErrorBannerClosed();
      });
    }
  );

  test(
    'Verify a full checkout totals the item price plus tax and then empties the cart',
    { tag: ['@TC14', '@smoke', '@e2e', '@regression'] },
    async ({ productsPage, cartPage, checkoutPage }) => {
      const { productA, productB } = cartItems;
      const { firstName, lastName, postalCode } = checkoutCustomer;

      await productsPage.goto();
      await expect(productsPage.inventoryItems.first()).toBeVisible();
      await expect(productsPage.cartBadge).toHaveCount(0);

      const productAPrice = await productsPage.getProductPrice(productA);
      const productBPrice = await productsPage.getProductPrice(productB);
      const itemTotalAmount = `$${(
        Number(productAPrice.replace(/[^0-9.]/g, '')) + Number(productBPrice.replace(/[^0-9.]/g, ''))
      ).toFixed(2)}`;

      await test.step('Add Product A and Product B', async () => {
        await productsPage.addToCart(productA);
        await productsPage.addToCart(productB);
      });

      await test.step('Open the cart, verify badge 2, and click Checkout', async () => {
        await productsPage.openCart();
        await cartPage.expectYourCartHeading();
        await cartPage.expectCartBadgeCount(2);
        await cartPage.checkout();
        await checkoutPage.expectYourInformationHeading();
      });

      await test.step('Enter First Name, Last Name, and Zip/Postal Code', async () => {
        await checkoutPage.fillYourInformation(firstName, lastName, postalCode);
      });

      await test.step('Click Continue', async () => {
        await checkoutPage.continue();
      });

      await test.step('Verify the heading Checkout: Overview', async () => {
        await checkoutPage.expectOverviewHeading();
      });

      await test.step('Verify Payment Information is SauceCard #<dynamic order id>', async () => {
        await checkoutPage.expectPaymentInformation();
      });

      await test.step('Verify Shipping Information is the delivery partner', async () => {
        await checkoutPage.expectShippingInformation(checkoutShipping.deliveryPartner);
      });

      await test.step('Verify Item total', async () => {
        await checkoutPage.expectItemTotal(itemTotalAmount);
        await checkoutPage.expectTotalEqualsItemPlusTax();
      });

      await test.step('Click Finish', async () => {
        await checkoutPage.finish();
      });

      await test.step('Verify the heading Checkout: Complete!, Thank you for your order!, and dispatch message', async () => {
        await checkoutPage.expectCompleteHeading();
        await checkoutPage.expectOrderCompleteMessages();
      });

      await test.step('Verify the cart badge is gone', async () => {
        await checkoutPage.expectCartBadgeGone();
      });

      await test.step('Click Back Home', async () => {
        await checkoutPage.backHome();
      });

      await test.step('Verify Products is shown and both buttons read Add to cart', async () => {
        await expect(productsPage.title).toHaveText('Products');
        await productsPage.expectProductButtonLabel(productA, 'Add to cart');
        await productsPage.expectProductButtonLabel(productB, 'Add to cart');
      });

      await test.step('Open the cart and verify there are no product lines', async () => {
        await productsPage.openCart();
        await cartPage.expectYourCartHeading();
        await cartPage.expectNoProductLines();
        await cartPage.expectCartBadgeGone();
      });
    }
  );
});
