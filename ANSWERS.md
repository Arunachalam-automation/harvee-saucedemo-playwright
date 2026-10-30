# Section B – AI output and client communication

## B1. Review AI-generated code

### Problems in the Existing Playwright Test

**Purpose:** Review the current test line by line, explain what can go wrong in a real test run, and suggest a practical fix for each issue.

### Existing test

```typescript
test('cart total is correct', async ({ page }) => {
  await page.goto('https://www.saucedemo.com');
  await page.fill('#user-name', 'standard_user');
  await page.fill('#password', 'secret_sauce');
  await page.click('#login-button');
  await page.click('text=Add to cart');
  await page.waitForTimeout(3000);
  await page.click('.shopping_cart_link');
  await page.click('#checkout');
  await page.fill('#first-name', 'A');
  await page.fill('#last-name', 'B');
  await page.fill('#postal-code', '1');
  await page.click('#continue');
  const total = await page.locator('.summary_total_label').textContent();
  expect(total).toBeTruthy();
});
```

### Issues Found

| No. | Issue                                           | Why it matters in a real run                                                                                                                                 | Suggested fix                                                                                                                                             |
| --- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Test title is unclear                           | The title says the cart total is correct, but the test reads the total on the checkout overview page. The title does not explain what is being checked.      | Rename it to describe the checkout total, including whether tax is part of the expected amount.                                                           |
| 2   | Playwright imports are missing                  | As shown, the file does not import `test` and `expect`. It will not run as a standalone spec unless the project supplies them through another setup.         | Import `test` and `expect` from `@playwright/test`, or use the project's custom fixture import.                                                           |
| 3   | The URL is hardcoded                            | The test always opens the same URL. Moving between test, staging, and other environments means changing the test code.                                       | Set `baseURL` in `playwright.config.ts` and use the configured base URL.                                                                                  |
| 4   | Credentials are hardcoded                       | The username and password are written directly in the test. This makes credentials harder to manage and can expose them if real secrets are committed.       | Use environment variables or the project's approved authentication setup. For Sauce Demo's public sample credentials, follow the team's test-data policy. |
| 5   | Login success is not checked                    | If login fails, the test still tries to add a product. The eventual failure may happen later and make the real problem less obvious.                         | After login, verify the Products page or its heading is visible.                                                                                          |
| 6   | The product is not specified                    | The test does not say which product should be added. Without a known product and price, the expected total cannot be worked out.                             | Choose a named product with a known price and use it consistently in the test.                                                                            |
| 7   | The Add to cart locator is ambiguous            | Several products have an Add to cart button. The text selector may click the first matching button, so the test can cover a different product than intended. | Locate the product card by its name, then click the Add to cart button inside that card.                                                                  |
| 8   | Adding the product is not verified              | The test does not check that the cart badge changes or that the product was actually added. A failed click may only be noticed much later.                   | Verify the cart badge or confirm that the selected product appears in the cart.                                                                           |
| 9   | A fixed wait is used                            | `waitForTimeout(3000)` always pauses for three seconds. It slows down a successful run and may still be too short on a slower run.                           | Remove the fixed wait and rely on Playwright auto-waiting plus an assertion for the expected UI state.                                                    |
| 10  | Cart navigation is not verified                 | After clicking the cart icon, the test does not check that the cart page opened.                                                                             | Verify the cart URL or a visible cart heading.                                                                                                            |
| 11  | Cart contents are not checked                   | The test does not confirm the product name or quantity before starting checkout. It could continue with an empty or incorrect cart.                          | Check the expected product and quantity on the cart page.                                                                                                 |
| 12  | Checkout starts without a cart check            | The test clicks Checkout without first proving the cart contains the intended item.                                                                          | Validate the cart contents before proceeding.                                                                                                             |
| 13  | Checkout data is weak                           | Single-character values such as A and B are hard to understand and do not represent useful test data. The postal code 1 is also unclear.                     | Use readable test data that is accepted by the application, such as a full first name, last name, and suitable postal code.                               |
| 14  | Checkout submission is not verified             | The test fills in the checkout form and clicks Continue but does not confirm that the overview page is loaded.                                               | Check for the checkout overview heading or another reliable element after Continue.                                                                       |
| 15  | The subtotal is not checked                     | The test does not check whether the listed product prices add up to the displayed subtotal.                                                                  | Calculate the expected subtotal from the selected products and compare it with the displayed subtotal.                                                    |
| 16  | The tax is not checked                          | The test does not verify the tax amount, so an incorrect tax calculation could go unnoticed.                                                                 | Check the tax against the application's documented calculation rule.                                                                                      |
| 17  | The final total is not calculated independently | The test never checks whether subtotal plus tax equals the final total. A wrong total could still pass.                                                      | Calculate the expected final total independently and compare it with the displayed total.                                                                 |
| 18  | The assertion only checks that text exists      | `toBeTruthy()` does not check the amount. Values such as `Total: $0.00` could pass because the text is non-empty.                                            | Assert the exact expected total or compare the parsed amount with the calculated value.                                                                   |
| 19  | Money text is not handled clearly               | The test reads the full label as text but does not extract the numeric amount. This makes a precise comparison impossible.                                   | Extract the amount and compare it consistently. For calculations, using integer cents helps avoid floating-point rounding issues.                         |
| 20  | Currency and formatting are not checked         | The test does not confirm that the displayed total has the expected currency symbol and decimal places.                                                      | Where formatting is part of the requirement, verify the complete expected label or currency format.                                                       |
| 21  | Only one product is covered                     | A single-item scenario does not check whether the application adds several product prices correctly.                                                         | Add a separate multiple-product scenario and verify the subtotal and final total.                                                                         |
| 22  | The starting state is not controlled            | The test does not explain how the session and cart are reset. Shared or reused state can affect results in some setups.                                      | Make sure the test starts from a predictable state and does not depend on another test's changes.                                                         |
| 23  | Login logic is included in the test             | The login steps may be repeated across many tests, creating duplicate code and extra maintenance.                                                            | Reuse a login fixture or authentication setup when that fits the project.                                                                                 |
| 24  | Selectors could be more stable                  | General text selectors and CSS selectors can become harder to maintain when the page changes, even if they work today.                                       | Prefer stable `data-test` attributes, or accessible role and label locators where suitable.                                                               |
| 25  | Page objects or fixtures are not used           | All page actions are written directly in the test. In a project that already has page objects or fixtures, this bypasses reusable code.                      | Follow the existing framework and use its page objects or fixtures where available.                                                                       |
| 26  | Test steps are not separated                    | Login, product selection, cart, and checkout are all in one continuous flow. A failure can be harder to locate in the report.                                | Use meaningful `test.step()` blocks or clear helper methods for the main actions.                                                                         |
| 27  | Failure messages may not be useful              | The current assertion does not show which amount was expected, so the report gives little help when the total is wrong.                                      | Use assertions that make the expected value clear and keep checks close to the action they validate.                                                      |
| 28  | The test has several responsibilities           | A login or navigation failure can prevent the total calculation from being reached. This makes the calculation harder to diagnose on its own.                | Keep focused calculation tests separate where practical, while keeping an end-to-end test if the full checkout flow is required.                          |

### Main Finding

The main problem is the final assertion: the test checks only whether total text exists. It does not prove that the product was correct or that the subtotal, tax, and final amount were calculated correctly. The test should use a known product, confirm the cart and checkout state, calculate the expected amount, and compare it with the UI.

### Real-run example

For example, if the page displays “Total: $0.00” or an incorrect amount, the current test can still pass because the text exists. A useful test should fail with a clear message showing the expected total and the actual total.

### Rewritten test

Standards applied · original stable `#…` locators kept · unstable locators upgraded

```typescript
import { test, expect } from '@playwright/test';

/**
 * Assumes playwright.config.ts sets:
 *   use: {
 *     baseURL: process.env.BASE_URL || 'https://www.saucedemo.com',
 *     testIdAttribute: 'data-test',
 *   }
 */
const PRODUCT = {
  name: 'Sauce Labs Backpack',
  price: '$29.99',
  itemTotal: 'Item total: $29.99',
  tax: 'Tax: $2.40',
  total: 'Total: $32.39'
};

const CUSTOMER = { firstName: 'Arun', lastName: 'L', postalCode: '641046' };

test('checkout totals are correct and the order completes', async ({ page }) => {
  const username = process.env.STANDARD_USER ?? 'standard_user';
  const password = process.env.USER_PASSWORD ?? 'secret_sauce';

  await test.step('Log in', async () => {
    await page.goto('/');
    await page.getByTestId('username').fill(username);
    await page.getByTestId('password').fill(password);
    await page.getByTestId('login-button').click();
    await expect(page.getByTestId('title')).toHaveText('Products');
  });

  await test.step('Add the product', async () => {
    const card = page.getByTestId('inventory-item').filter({
      has: page.getByTestId('inventory-item-name').getByText(PRODUCT.name, { exact: true })
    });
    await expect(card.getByTestId('inventory-item-price')).toHaveText(PRODUCT.price);
    await card.getByRole('button', { name: 'Add to cart' }).click();
    await expect(card.getByRole('button', { name: 'Remove' })).toBeVisible();
    await expect(page.getByTestId('shopping-cart-badge')).toHaveText('1');
  });

  await test.step('Verify the cart', async () => {
    await page.getByTestId('shopping-cart-link').click();
    await expect(page).toHaveURL(/\/cart\.html$/);
    await expect(page.getByTestId('title')).toHaveText('Your Cart');
    const line = page.getByTestId('inventory-item');
    await expect(line).toHaveCount(1);
    await expect(line.getByTestId('inventory-item-name')).toHaveText(PRODUCT.name);
    await expect(line.getByTestId('item-quantity')).toHaveText('1');
    await expect(line.getByTestId('inventory-item-price')).toHaveText(PRODUCT.price);
  });

  await test.step('Enter checkout details', async () => {
    await page.getByTestId('checkout').click();
    await expect(page.getByTestId('title')).toHaveText('Checkout: Your Information');
    await page.getByTestId('firstName').fill(CUSTOMER.firstName);
    await page.getByTestId('lastName').fill(CUSTOMER.lastName);
    await page.getByTestId('postalCode').fill(CUSTOMER.postalCode);
    await page.getByTestId('continue').click();
    await expect(page).toHaveURL(/\/checkout-step-two\.html$/);
    await expect(page.getByTestId('title')).toHaveText('Checkout: Overview');
  });

  await test.step('Verify item total, tax and total', async () => {
    await expect(page.getByTestId('subtotal-label')).toHaveText(PRODUCT.itemTotal);
    await expect(page.getByTestId('tax-label')).toHaveText(PRODUCT.tax);
    await expect(page.getByTestId('total-label')).toHaveText(PRODUCT.total);
  });

  await test.step('Finish the order', async () => {
    await page.getByTestId('finish').click();
    await expect(page).toHaveURL(/\/checkout-complete\.html$/);
    await expect(page.getByTestId('complete-header')).toHaveText('Thank you for your order!');
    await expect(page.getByTestId('shopping-cart-badge')).toHaveCount(0);
  });
});
```

---

## B2. Test an AI feature

### CI Failure Triage Bot

**Scenario:** a tool reads each failed test log, labels it as a product defect, flaky test or environment problem, and posts the result in Slack.

| Concern                    | Scored by                          | How / why                                                                                                                                                                     |
| -------------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Accuracy for each label    | Automatically (against a gold set) | Compute precision and recall separately for product defect, flaky and environment. A single overall accuracy number hides which label is weak.                                |
| Which mistake costs more   | By rubric (weights set by humans)  | People decide the cost order once, e.g. missing a product defect is worse than confusing env with flaky. A weighted score then applies those weights to every result.         |
| Failures never seen before | Automatically                      | Track the abstain / "unknown" / low-confidence rate. Prefer "needs human" over a forced wrong label. Add occasional human spot-checks.                                        |
| Secrets in logs            | Automatically                      | Pattern-based detection and redaction before the model sees the log and before Slack. One leak fails the test. Slack output is limited to the label plus a sanitized summary. |

### Evaluation Method Summary

- **Accuracy per label:** automatically (use "by rubric" only if the form defines rubric as scoring against a gold set)
- **Cost of mistakes:** by rubric
- **Unseen failures:** automatically
- **Secrets in logs:** automatically

**Key point:**  
Humans define the cost weights and spot-check unknown cases, but they don't score every result, since that wouldn't scale. The checks that can be computed by script (label accuracy, abstain rate, secret leaks) should be automatic.

**Acceptance criteria:** Zero secrets may appear in Slack output. Label precision/recall thresholds and the maximum acceptable unknown rate must be agreed with stakeholders before evaluation.

---

## B3. Defect Report

**Title:** [Regression] Products are not sorted correctly by price (low to high)

### Environment

- **Application:** SauceDemo
- **Release:** 4.2.0
- **Browser:** Google Chrome

### Steps to Reproduce

1. Open the SauceDemo application in Google Chrome.
2. Verify that the login page loads properly and displays the Swag Labs heading, Username and Password fields, and the Login button.
3. Enter a valid username and password.
4. Click the Login button.
5. Verify that the login is successful and the Products page opens.
6. Verify that the Products page loads properly and displays the Products heading and the list of products.
7. Select Price (low to high) from the sorting dropdown.
8. Verify that the products are arranged from the lowest price to the highest price.

### Expected Result

All products should be displayed in order, starting with the lowest price and ending with the highest price.

### Actual Result

After selecting Price (low to high), the displayed products are not in ascending price order. Record the exact out-of-order product names and prices from the captured run in the linked evidence.

### Severity

Major – Incorrect sorting makes it difficult for users to find products by price.

### Priority

High – Needs to be fixed promptly because the issue occurs consistently in release 4.2.0.

### Evidence to Attach (only when available)

- Screenshot showing the selected sorting option and the product list.
- Screen recording showing the issue.
- Browser console errors, if any.

---

## B4. Message to the client

Hi [Product Manager Name], quick update on Friday’s release.

**Findings:**

- **Sorting:** Products appear in the wrong price order.
- **Checkout:** The checkout test failed intermittently (approximately 1 in 10 runs) and passed on retry. The root cause is not yet confirmed.

My recommendation: Hold the release decision until I complete the checkout root cause analysis by Friday noon.

- If this is an automation-only issue and customer checkout is verified reliable, we can consider releasing after assessing the sorting risk.
- If this is a product checkout defect, I recommend postponing the release to protect customer trust.
- If checkout is confirmed reliable and Friday must be maintained, consider temporarily hiding sorting, a limited rollout, active monitoring and a rollback plan.

I’ll provide a clear go/no-go recommendation by noon.
