#!/usr/bin/env node
/**
 * Regenerates the custom HTML report from the latest JSON results, then serves it
 * with Playwright's show-report (cyan "Serving HTML report…" line, FORCE_COLOR on).
 *
 * Usage:
 *   node scripts/show-report.mjs
 *   npm run report
 */

import { spawn } from 'node:child_process';
import path from 'node:path';
import { generateCustomReport } from './report/generate-report.mjs';
import { CUSTOM_REPORT_DIR } from './report/paths.mjs';

/**
 * Resolves the local Playwright CLI entrypoint.
 * @returns {string}
 */
function resolvePlaywrightCli() {
  return path.resolve(process.cwd(), 'node_modules', '@playwright', 'test', 'cli.js');
}

/**
 * Refreshes the HTML report from JSON, then opens Playwright show-report.
 * @returns {Promise<void>}
 */
async function main() {
  try {
    generateCustomReport({ quiet: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Custom HTML report generation failed.');
    console.error(message);
    console.error(
      'Troubleshooting: run tests to produce JSON results, verify build/json-report/results.json exists, then retry.'
    );
    process.exitCode = 1;
    return;
  }

  const cli = resolvePlaywrightCli();
  const child = spawn(process.execPath, [cli, 'show-report', CUSTOM_REPORT_DIR, ...process.argv.slice(2)], {
    stdio: 'inherit',
    env: {
      ...process.env,
      // Ensure Playwright's cyan "Serving HTML report at …" line is colored in Windows terminals.
      FORCE_COLOR: process.env.FORCE_COLOR && process.env.FORCE_COLOR !== '0' ? process.env.FORCE_COLOR : '1'
    }
  });

  child.on('error', (error) => {
    console.error('Failed to start Playwright show-report:', error.message);
    process.exitCode = 1;
  });

  child.on('close', (code, signal) => {
    if (signal) {
      process.exitCode = 1;
      return;
    }
    process.exitCode = code ?? 1;
  });
}

main();
