import { expect, test } from '../fixtures/test-fixtures';

test.describe('Catalog', () => {
  test(
    'Verify the products can be sorted by price from low to high and from high to low',
    { tag: ['@TC07', '@regression'] },
    async ({ productsPage }) => {
      await productsPage.goto();
      await expect(productsPage.inventoryItems.first()).toBeVisible();

      await test.step('Open the sort list Sort products', async () => {
        await productsPage.openSortList();
        await expect(productsPage.sortProducts).toBeVisible();
      });

      await test.step('Choose Price (low to high)', async () => {
        await productsPage.sortBy('Price (low to high)');
      });

      await test.step('Verify the full order price is shown from low to high', async () => {
        await productsPage.expectPricesSorted('ascending');
      });

      await test.step('Choose Price (high to low)', async () => {
        await productsPage.sortBy('Price (high to low)');
      });

      await test.step('Verify the full order price is shown from high to low', async () => {
        await productsPage.expectPricesSorted('descending');
      });
    }
  );
});
