import path from 'node:path';

/** Playwright JSON reporter output (machine-readable input for the custom report). */
export const JSON_REPORT_FILE = path.join('build', 'json-report', 'results.json');

/**
 * Standalone custom HTML report directory.
 * Served/opened with: `npx playwright show-report build/html-report`
 */
export const CUSTOM_REPORT_DIR = path.join('build', 'html-report');

/** Standalone custom HTML report entry file. */
export const CUSTOM_REPORT_HTML = path.join(CUSTOM_REPORT_DIR, 'index.html');

/** Normalized results JSON written next to the HTML report (for tooling). */
export const NORMALIZED_REPORT_JSON = path.join(CUSTOM_REPORT_DIR, 'normalized-results.json');

/** Single command printed after every run to open the latest HTML report. */
export const SHOW_REPORT_COMMAND = 'npm run report';
