### Mandatory skill usage

Before implementing anything:

1. Inspect the project's `.agents/` directory, `skills-lock.json`, and any applicable Cursor rules or skill configuration.
2. Identify and read all relevant installed skills for Playwright, TypeScript, test automation, Page Object Model, and test validation.
3. Follow the instructions in those skills while implementing or changing tests and framework code.
4. Prefer the project's existing skills and conventions over introducing new frameworks or dependencies.
5. If a relevant skill is installed, use it. Do not merely mention the skill; follow its instructions.
6. If no relevant skill is installed or accessible, report that clearly and proceed using the existing project conventions. Do not invent skill names or claim a skill was used when it was not.
7. When modifying test cases (steps, assertions, tags, or expected results), use `Assessment Testcases.xlsx` as the reference for validating behavior. Do not require reading the workbook for unrelated framework or configuration changes.
8. In the final report, list the skills and rules actually used, files changed, and validation results. When test cases were changed, include the Excel test-case mapping.
9. Add appropriate documentation comments to every asynchronous method, explaining what the method does. If the method accepts parameters, document each parameter using the `@param` format.
10. Do not declare a global variable in a spec file unless it is used by more than one test case in that file.
11. Add test case IDs and applicable classification tags to the Playwright test details object's `tag` property, **not to the test title**.
12. Each test must include its test case ID (for example, `@TC01`) and the applicable classification tags from the Excel workbook, such as `@sanity`, `@regression`, `@e2e`, and `@smoke`. Only apply classifications that are relevant to that test case.
13. Follow this format for test tags:

    ```typescript
    {
      tag: ['@TC02', '@sanity', '@regression'];
    }
    ```

14. Keep test titles descriptive and aligned with the titles in the Excel workbook. Do not append test case IDs or classification tags to test titles.
15. Ensure tags can be used to filter tests through Playwright commands, such as `--grep "@sanity"`, without changing the test titles.

### Environment configuration

1. Use a local `.env` file as the primary environment configuration. `.env` is gitignored and must never be committed.
2. Document placeholders and safe defaults in `.env.template` (no secrets). Copy or extend `.env` from that file when needed.
3. Load `.env` with `dotenv` in `playwright.config.ts`. Prefer `process.env` (or a minimal helper) over environment abstraction modules.
4. Configure Playwright `use.baseURL` from `process.env.BASE_URL`, defaulting to `https://www.saucedemo.com` when the variable is missing or blank.
5. Provide sensible fallbacks for required variables (`BASE_URL`, `STANDARD_USER`, `LOCKED_USER`, `USER_PASSWORD`) when they are missing or intentionally empty. Do not silently run against an empty base URL.
6. If `.env` does not exist, create it with the required defaults. If it already exists, preserve user-provided values and append only missing required keys. Never overwrite existing user configuration unnecessarily.
7. Do not put credentials or secrets into source control, logs, or committed files. Public SauceDemo demo account names may appear as documented defaults only.

### Locators (`getByTestId`)

1. SauceDemo exposes stable `data-test` attributes. Playwright is configured with `testIdAttribute: 'data-test'`.
2. Prefer `page.getByTestId('…')` for elements that have a `data-test` attribute (for example `getByTestId('inventory-container')`).
3. Do not use brittle CSS attribute selectors such as `[data-test="inventory-container"]` when `getByTestId()` can be used instead.
4. Prefer role/label/text locators when they are clearer and stable. Use CSS/XPath only when no suitable test ID or semantic locator exists.
5. Do not modify the external SauceDemo application source to add test IDs.

### Test data

1. Keep reusable values in the feature-organized `test-data/` directory. When you create a new spec file, also create (or extend) a matching `test-data/` folder named for that feature/spec area, and declare the values that spec needs there. Examples:
   - `tests/login.spec.ts` / auth flows → `test-data/auth/`
   - `tests/catalog.spec.ts` → `test-data/products/`
   - `tests/cart.spec.ts` → `test-data/cart/`
   - `tests/checkout.spec.ts` → `test-data/checkout/`
   - `tests/session-security.spec.ts` → `test-data/session-security/`
   - New `tests/<feature>.spec.ts` → `test-data/<feature>/` (or the closest existing feature folder)
2. Use a data-driven approach: put inputs and expected values in `test-data/`, then import and consume them from the spec (including loops/`test.each` / parameterized cases when covering multiple rows). Do not hardcode the same literals repeatedly inside specs.
3. Store test-data files in JSON format (for example `test-data/auth/users.json`, `test-data/cart/items.json`). Ensure `resolveJsonModule` is enabled in `tsconfig.json` when importing JSON. Specs may import JSON directly or via a thin typed wrapper; the source of truth for values must remain JSON.
4. Pass `process.env` values directly at the call site, with fallbacks to the imported test-data defaults when the env var is missing or blank. Example:

   ```typescript
   await loginPage.login(
     process.env.STANDARD_USER || authUsers.standard.username,
     process.env.USER_PASSWORD || authUsers.standard.password
   );
   ```

5. Keep test data separate from page-object implementation. Do not move assertions, locators, or browser interaction logic into `test-data/` files.
6. Avoid unnecessary duplication and excessive fragmentation of test-data modules.

### Waiting and stability

1. Do not use fixed waits such as `page.waitForTimeout()`. Prefer Playwright auto-waiting, web-first assertions, and `expect(…).toPass()` when polling is required.

### Git

Do not commit or push anything unless the user explicitly asks you to.
