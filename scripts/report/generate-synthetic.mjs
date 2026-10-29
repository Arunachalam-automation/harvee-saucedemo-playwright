#!/usr/bin/env node
/**
 * Writes a synthetic Playwright-like JSON report with >= 1000 tests for
 * scalability checks. Does not touch real project test results under
 * build/json-report/results.json unless explicitly asked.
 *
 * Usage:
 *   node scripts/report/generate-synthetic.mjs
 *   node scripts/report/generate-synthetic.mjs --count 1200 --output build/synthetic-json/results.json
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateCustomReport } from './generate-report.mjs';

const DEFAULT_COUNT = 1200;
const DEFAULT_OUTPUT = path.join('build', 'synthetic-json', 'results.json');
const DEFAULT_REPORT_DIR = path.join('build', 'synthetic-custom-report');

/**
 * Parses CLI args for count/output/report-dir.
 * @param {string[]} argv Process argv slice.
 * @returns {{ count: number, output: string, reportDir: string }}
 */
function parseArgs(argv) {
  let count = DEFAULT_COUNT;
  let output = DEFAULT_OUTPUT;
  let reportDir = DEFAULT_REPORT_DIR;

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    const next = argv[i + 1];
    if ((token === '--count' || token === '-n') && next) {
      count = Number(next);
      i += 1;
    } else if (token === '--output' && next) {
      output = next;
      i += 1;
    } else if (token === '--report-dir' && next) {
      reportDir = next;
      i += 1;
    }
  }

  if (!Number.isFinite(count) || count < 1) {
    throw new Error(`Invalid --count value: ${count}`);
  }

  return { count: Math.floor(count), output, reportDir };
}

/**
 * Builds a Playwright-shaped JSON report with many synthetic cases.
 * @param {number} count Number of tests to synthesize.
 * @returns {object}
 */
function buildSyntheticPlaywrightJson(count) {
  const projects = ['chromium', 'firefox', 'webkit'];
  const statuses = ['expected', 'unexpected', 'skipped', 'flaky'];
  const tagsPool = ['@sanity', '@regression', '@smoke', '@e2e', '@P1', '@P2', '@priority:high'];

  /** @type {object[]} */
  const specs = [];
  for (let i = 0; i < count; i += 1) {
    const project = projects[i % projects.length];
    const outcome = statuses[i % statuses.length];
    const title = `Synthetic test case ${String(i + 1).padStart(4, '0')} <script>alert(${i})</script>`;
    const tags = [tagsPool[i % tagsPool.length], tagsPool[(i + 3) % tagsPool.length]];
    const failed = outcome === 'unexpected' || outcome === 'flaky';
    const results = [];

    if (outcome === 'flaky') {
      results.push({
        workerIndex: 0,
        status: 'failed',
        duration: 40 + (i % 50),
        retry: 0,
        errors: [{ message: `Flaky failure ${i}`, stack: `Error: Flaky failure ${i}\n    at synthetic.js:1:1` }],
        error: { message: `Flaky failure ${i}`, stack: `Error: Flaky failure ${i}\n    at synthetic.js:1:1` },
        attachments: [
          { name: 'screenshot', contentType: 'image/png', path: `build/test-results/synthetic-${i}/test-failed-1.png` }
        ],
        stdout: [],
        stderr: [],
        startTime: new Date(Date.now() - 100000 + i).toISOString()
      });
      results.push({
        workerIndex: 0,
        status: 'passed',
        duration: 30 + (i % 40),
        retry: 1,
        errors: [],
        attachments: [],
        stdout: [],
        stderr: [],
        startTime: new Date(Date.now() - 90000 + i).toISOString()
      });
    } else {
      const status = outcome === 'expected' ? 'passed' : outcome === 'skipped' ? 'skipped' : 'failed';
      results.push({
        workerIndex: 0,
        status,
        duration: 25 + (i % 120),
        retry: 0,
        errors: failed
          ? [
              {
                message: `Assertion failed for case ${i} & special <chars>`,
                stack: `Error: Assertion failed\n    at test.spec.ts:${(i % 200) + 1}:1`
              }
            ]
          : [],
        error: failed
          ? {
              message: `Assertion failed for case ${i} & special <chars>`,
              stack: `Error: Assertion failed\n    at test.spec.ts:${(i % 200) + 1}:1`
            }
          : undefined,
        attachments: failed
          ? [
              {
                name: 'screenshot',
                contentType: 'image/png',
                path: `build/test-results/synthetic-${i}/test-failed-1.png`
              },
              { name: 'trace', contentType: 'application/zip', path: `build/test-results/synthetic-${i}/trace.zip` }
            ]
          : [],
        stdout: [],
        stderr: [],
        startTime: new Date(Date.now() - 100000 + i).toISOString()
      });
    }

    specs.push({
      title,
      ok: outcome === 'expected' || outcome === 'flaky' || outcome === 'skipped',
      tags,
      id: `synthetic-spec-${i}`,
      file: `tests/synthetic/group-${Math.floor(i / 100)}.spec.ts`,
      line: (i % 200) + 1,
      column: 1,
      tests: [
        {
          timeout: 30000,
          annotations: [],
          expectedStatus: 'passed',
          projectName: project,
          results,
          status: outcome
        }
      ]
    });
  }

  return {
    config: {
      configFile: 'playwright.config.ts',
      rootDir: '.',
      version: '1.64.1'
    },
    suites: [
      {
        title: 'synthetic',
        file: '',
        column: 0,
        line: 0,
        specs: [],
        suites: [
          {
            title: 'Synthetic Suite',
            file: 'tests/synthetic/group-0.spec.ts',
            column: 1,
            line: 1,
            specs,
            suites: []
          }
        ]
      }
    ],
    errors: [],
    stats: {
      startTime: new Date().toISOString(),
      duration: count * 35,
      expected: Math.floor(count * 0.25),
      skipped: Math.floor(count * 0.25),
      unexpected: Math.floor(count * 0.25),
      flaky: Math.floor(count * 0.25)
    }
  };
}

/**
 * Writes synthetic JSON and generates a custom report from it.
 * @returns {Promise<void>}
 */
async function main() {
  const { count, output, reportDir } = parseArgs(process.argv.slice(2));
  const payload = buildSyntheticPlaywrightJson(count);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify(payload), 'utf8');

  const result = generateCustomReport({
    inputPath: output,
    outputDir: reportDir,
    quiet: true
  });

  console.log(`Synthetic JSON written: ${output.split(path.sep).join('/')} (${count} tests)`);
  console.log(`Synthetic custom report: ${path.relative(process.cwd(), result.htmlPath).split(path.sep).join('/')}`);
  console.log(`Normalized test count: ${result.testCount}`);
}

const invokedDirectly =
  Boolean(process.argv[1]) && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (invokedDirectly) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
