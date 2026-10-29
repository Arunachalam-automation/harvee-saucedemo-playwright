import { expect, test } from '../fixtures/test-fixtures';
import cartItems from '../test-data/cart/items.json';

test.describe('Cart', () => {
  test(
    'Verify adding two items and removing one updates the cart badge and the cart',
    { tag: ['@TC09', '@smoke', '@e2e', '@regression'] },
    async ({ productsPage, cartPage }) => {
      const { productA, productB } = cartItems;

      await productsPage.goto();
      await expect(productsPage.inventoryItems.first()).toBeVisible();
      await expect(productsPage.sortProducts).toHaveValue('az');
      await expect(productsPage.cartBadge).toHaveCount(0);

      const productAPrice = await productsPage.getProductPrice(productA);
      const productBPrice = await productsPage.getProductPrice(productB);

      await test.step('On Products, click Add to cart on Product A', async () => {
        await productsPage.addToCart(productA);
      });

      await test.step('Verify the Add to cart button changes to Remove and the cart badge is 1', async () => {
        await productsPage.expectProductButtonLabel(productA, 'Remove');
        await productsPage.expectCartBadgeCount(1);
      });

      await test.step('Click Add to cart on Product B', async () => {
        await productsPage.addToCart(productB);
      });

      await test.step('Verify that button changes to Remove and the cart badge is 2', async () => {
        await productsPage.expectProductButtonLabel(productB, 'Remove');
        await productsPage.expectCartBadgeCount(2);
      });

      await test.step('Open the cart and verify the heading Your Cart', async () => {
        await productsPage.openCart();
        await cartPage.expectYourCartHeading();
      });

      await test.step('Verify line 1 is Product A, quantity 1, price', async () => {
        await cartPage.expectCartLine(productA, '1', productAPrice);
      });

      await test.step('Verify line 2 is Product B, quantity 1, price', async () => {
        await cartPage.expectCartLine(productB, '1', productBPrice);
      });

      await test.step('Go back to Products and click Remove on Product B', async () => {
        await cartPage.continueShopping();
        await expect(productsPage.title).toHaveText('Products');
        await productsPage.removeFromCart(productB);
      });

      await test.step('Verify the backpack button reads Remove, the bike light button reads Add to cart, and the badge is 1', async () => {
        await productsPage.expectProductButtonLabel(productA, 'Remove');
        await productsPage.expectProductButtonLabel(productB, 'Add to cart');
        await productsPage.expectCartBadgeCount(1);
      });

      await test.step('Open the cart and verify only Product A is listed', async () => {
        await productsPage.openCart();
        await cartPage.expectYourCartHeading();
        await cartPage.expectOnlyProductListed(productA);
        await cartPage.expectCartBadgeCount(1);
      });

      await test.step('Verify Product B is not in the cart', async () => {
        await cartPage.expectProductNotListed(productB);
      });
    }
  );
});
