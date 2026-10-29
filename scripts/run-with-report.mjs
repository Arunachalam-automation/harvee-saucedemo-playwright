#!/usr/bin/env node
/**
 * Runs Playwright tests via the local CLI (never `npm test`) to avoid recursion.
 * Custom HTML report generation is handled by `reporters/custom-html-report-reporter.ts`
 * onExit so every invocation path (orchestrated or raw) refreshes build/html-report.
 * Preserves the original Playwright exit code for CI.
 */

import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);

/**
 * Resolves the local Playwright CLI entrypoint.
 * @returns {string}
 */
function resolvePlaywrightCli() {
  return path.resolve(process.cwd(), 'node_modules', '@playwright', 'test', 'cli.js');
}

/**
 * Returns true when CLI args request the Obscura Playwright project.
 * @param {string[]} args Arguments forwarded to `playwright test`.
 * @returns {boolean}
 */
function wantsObscuraProject(args) {
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--project=obscura' || arg === '-p=obscura') {
      return true;
    }
    if ((arg === '--project' || arg === '-p') && args[i + 1] === 'obscura') {
      return true;
    }
  }
  return false;
}

/**
 * Spawns Playwright with the provided CLI args and inherits stdio.
 * @param {string[]} args Arguments forwarded to `playwright test`.
 * @returns {Promise<number>} Process exit code.
 */
function runPlaywright(args) {
  const cli = resolvePlaywrightCli();
  /** @type {NodeJS.ProcessEnv} */
  const env = {
    ...process.env,
    // Marker so nested tooling can detect an orchestrated run if needed.
    SAUCEDEMO_REPORT_ORCHESTRATOR: '1'
  };

  // Opt-in Obscura matrix: workers must inherit this so fixtures use connectOverCDP.
  if (wantsObscuraProject(args) || process.env.RUN_OBSCURA === '1') {
    env.RUN_OBSCURA = '1';
  }

  return new Promise((resolve) => {
    const child = spawn(process.execPath, [cli, 'test', ...args], {
      stdio: 'inherit',
      env
    });

    child.on('error', (error) => {
      console.error('Failed to start Playwright:', error.message);
      resolve(1);
    });

    child.on('close', (code, signal) => {
      if (signal) {
        resolve(1);
        return;
      }
      resolve(code ?? 1);
    });
  });
}

/**
 * Forwards CLI args to Playwright and exits with the same code.
 * @returns {Promise<void>}
 */
async function main() {
  const exitCode = await runPlaywright(process.argv.slice(2));
  process.exit(exitCode);
}

// Prevent accidental import loops from treating this file as a library entry.
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  main();
}
