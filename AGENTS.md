### Mandatory skill usage

Before implementing anything:

1. Inspect the project's `.agents/` directory, `skills-lock.json`, and any applicable Cursor rules or skill configuration.
2. Identify and read all relevant installed skills for Playwright, TypeScript, test automation, Page Object Model, test-case analysis, and test validation.
3. Follow the instructions in those skills while implementing the assessment test cases.
4. Prefer the project's existing skills and conventions over introducing new frameworks or dependencies.
5. If a relevant skill is installed, use it. Do not merely mention the skill; follow its instructions.
6. If no relevant skill is installed or accessible, report that clearly and proceed using the existing project conventions. Do not invent skill names or claim a skill was used when it was not.
7. Read `Assessment Testcases.xlsx` and map the actual test steps and expected results before writing code.
8. In the final report, list the skills and rules actually used, the Excel test-case mapping, files changed, and validation results.
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

Do not commit or push anything.
