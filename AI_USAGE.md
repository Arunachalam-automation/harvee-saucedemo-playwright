# AI Usage

**Tool:** Cursor.

I used AI for the harder framework pieces, not as a substitute for owning the suite. Below is what I asked for, what changed, and how I checked it.

| What I asked for                                                                  | What changed                                                                                                             | How I checked                                                                                                                                                                          |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth + login foundation (base/login pages, storage-state setup, fixtures)         | `pages/BasePage.ts`, `pages/LoginPage.ts`, `tests/auth.setup.ts`, `fixtures/test-fixtures.ts`, login specs for TC01–TC03 | Ran auth setup and login against SauceDemo; confirmed `.auth` storage state; mapped titles/tags to Excel; fixed locators and URL checks when the draft was off                         |
| Complex flows (cart TC09, checkout TC13–TC14, session security with `testNoAuth`) | `CartPage` / `CheckoutPage` / `ProductsPage`, cart & checkout specs, session-security spec, related `test-data/` JSON    | Compared steps to Excel; ran Chromium with `@TC` greps; reworked AI drafts (e.g. cart line by product name, empty storage via `testNoAuth`) until assertions matched real UI behaviour |
| Reporting / multi-browser / optional Obscura (where the design was non-trivial)   | Console + custom HTML reporters, browser projects, `config/obscura.ts`                                                   | Real test runs; opened the HTML report after generate; kept Obscura opt-in so default runs stayed unchanged                                                                            |
| Section B: review a weak AI “cart total” test                                     | `ANSWERS.md` B1 (problem list + rewrite sample only—not merged as a suite test)                                          | Line-by-line review; rejected `toBeTruthy()` on totals; rewrite asserts item total, tax, and total                                                                                     |

**How I drove AI:** prompts pointed at `AGENTS.md` and Playwright skills (POM, tags, `getByTestId`, test-data). I treated every draft as a PR: keep structure that fit the repo, reject weak assertions or wrong naming, then re-run before accepting.
