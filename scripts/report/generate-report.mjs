#!/usr/bin/env node
/**
 * Generates the standalone custom HTML report from Playwright JSON results.
 *
 * Usage:
 *   node scripts/report/generate-report.mjs
 *   node scripts/report/generate-report.mjs --input path/to/results.json --output-dir build/html-report
 *
 * This module never invokes the test runner (prevents recursive npm test loops).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildHtmlReport } from './build-html.mjs';
import { normalizePlaywrightJson } from './normalize.mjs';
import {
  CUSTOM_REPORT_DIR,
  CUSTOM_REPORT_HTML,
  JSON_REPORT_FILE,
  NORMALIZED_REPORT_JSON,
  SHOW_REPORT_COMMAND
} from './paths.mjs';

/**
 * Parses simple CLI flags of the form `--key value` or `--key=value`.
 * @param {string[]} argv Process arguments excluding node and script path.
 * @returns {Record<string, string | boolean>}
 */
function parseArgs(argv) {
  /** @type {Record<string, string | boolean>} */
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) {
      continue;
    }
    const body = token.slice(2);
    const eq = body.indexOf('=');
    if (eq >= 0) {
      out[body.slice(0, eq)] = body.slice(eq + 1);
      continue;
    }
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
      out[body] = next;
      i += 1;
    } else {
      out[body] = true;
    }
  }
  return out;
}

/**
 * Reads and parses the Playwright JSON report file with actionable diagnostics.
 * @param {string} inputPath Path to the Playwright JSON reporter output.
 * @returns {unknown}
 */
function readJsonReport(inputPath) {
  const resolved = path.resolve(inputPath);
  if (!fs.existsSync(resolved)) {
    throw new Error(
      [
        `Playwright JSON results file not found: ${resolved}`,
        'Run tests first so the JSON reporter can write results, then re-run report generation.',
        `Expected default path: ${path.resolve(JSON_REPORT_FILE)}`,
        'Configured via playwright.config.ts reporter: json → build/json-report/results.json'
      ].join('\n')
    );
  }

  let rawText;
  try {
    rawText = fs.readFileSync(resolved, 'utf8');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Unable to read JSON results file at ${resolved}: ${message}`);
  }

  if (!rawText.trim()) {
    throw new Error(`JSON results file is empty: ${resolved}`);
  }

  try {
    return JSON.parse(rawText);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      [
        `JSON results file is malformed and could not be parsed: ${resolved}`,
        message,
        'Ensure the Playwright JSON reporter finished writing the file after the test run.'
      ].join('\n')
    );
  }
}

/**
 * Builds a filesystem-safe unique attachment filename.
 * @param {string} testId Normalized test id.
 * @param {string} attachmentName Attachment display name.
 * @param {string} sourcePath Original attachment path or fallback extension hint.
 * @param {number} index Attachment index within the test.
 * @returns {string}
 */
function buildAssetFileName(testId, attachmentName, sourcePath, index) {
  const ext = path.extname(sourcePath) || guessExtension(attachmentName);
  const safeTest = testId.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 80);
  const safeName = attachmentName.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 40) || 'attachment';
  return `${safeTest}_${index}_${safeName}${ext}`;
}

/**
 * Guesses a file extension from an attachment name when the source path has none.
 * @param {string} attachmentName Attachment name.
 * @returns {string}
 */
function guessExtension(attachmentName) {
  const lower = attachmentName.toLowerCase();
  if (lower.includes('screenshot') || lower.endsWith('.png')) return '.png';
  if (lower.includes('trace') || lower.endsWith('.zip')) return '.zip';
  if (lower.includes('video') || lower.endsWith('.webm')) return '.webm';
  return '';
}

/**
 * Materializes one attachment into the report assets directory and sets reportPath.
 * @param {object} attachment Normalized attachment (may include path/bodyBase64).
 * @param {string} testId Parent test id for unique asset naming.
 * @param {number} index Running attachment index within the test.
 * @param {string} assetsDir Destination assets directory.
 * @returns {object} Attachment safe for the HTML UI (no raw filesystem paths).
 */
function materializeOneAttachment(attachment, testId, index, assetsDir) {
  const next = { ...attachment };
  let written = false;

  if (next.path) {
    const absolute = path.resolve(next.path);
    if (fs.existsSync(absolute) && fs.statSync(absolute).isFile()) {
      const fileName = buildAssetFileName(testId, next.name, absolute, index);
      const dest = path.join(assetsDir, fileName);
      try {
        fs.copyFileSync(absolute, dest);
        next.reportPath = `assets/${fileName}`;
        written = true;
      } catch {
        // Keep going; UI will show that the attachment could not be copied.
      }
    }
  }

  if (!written && next.bodyBase64) {
    const fileName = buildAssetFileName(testId, next.name, guessExtension(next.name) || '.bin', index);
    const dest = path.join(assetsDir, fileName);
    try {
      fs.writeFileSync(dest, Buffer.from(next.bodyBase64, 'base64'));
      next.reportPath = `assets/${fileName}`;
    } catch {
      // Ignore write failures for individual attachments.
    }
  }

  // Do not expose raw filesystem paths as primary UI content.
  delete next.path;
  delete next.bodyBase64;
  delete next.bodyPreview;
  return next;
}

/**
 * Copies or materializes attachments into the report assets directory and sets reportPath.
 * Materializes per attempt first so the details dialog can show retry-scoped cards,
 * then rebuilds the flat test.attachments list from those attempts.
 * @param {ReturnType<typeof normalizePlaywrightJson>} normalized Normalized report.
 * @param {string} outputDir Custom report output directory.
 */
function materializeAttachments(normalized, outputDir) {
  const assetsDir = path.join(outputDir, 'assets');
  fs.mkdirSync(assetsDir, { recursive: true });

  for (const test of normalized.tests) {
    let assetIndex = 0;

    for (const attempt of test.attempts || []) {
      attempt.attachments = (attempt.attachments || []).map((attachment) => {
        const materialized = materializeOneAttachment(attachment, test.id, assetIndex, assetsDir);
        assetIndex += 1;
        return materialized;
      });
    }

    // Flat list kept for search/export; UI prefers per-attempt attachments.
    test.attachments = (test.attempts || []).flatMap((attempt) => attempt.attachments || []);
  }
}

/**
 * Writes the custom HTML report and normalized JSON sidecar.
 * Always produces a valid report for empty, skipped-only, mixed, and full runs.
 * @param {{ inputPath?: string, outputDir?: string, quiet?: boolean }} [options] Generator options.
 * @returns {{ htmlPath: string, normalizedJsonPath: string, testCount: number }}
 */
export function generateCustomReport(options = {}) {
  const inputPath = options.inputPath || JSON_REPORT_FILE;
  const outputDir = options.outputDir || CUSTOM_REPORT_DIR;
  const htmlPath = path.join(outputDir, 'index.html');
  const normalizedJsonPath = path.join(outputDir, 'normalized-results.json');

  const raw = readJsonReport(inputPath);
  let normalized;
  try {
    normalized = normalizePlaywrightJson(raw);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to normalize Playwright JSON results: ${message}`);
  }

  fs.mkdirSync(outputDir, { recursive: true });
  materializeAttachments(normalized, outputDir);

  const html = buildHtmlReport(normalized);
  fs.writeFileSync(htmlPath, html, 'utf8');
  fs.writeFileSync(normalizedJsonPath, JSON.stringify(normalized, null, 2), 'utf8');

  if (!options.quiet) {
    console.log('Custom HTML report generated successfully.');
    console.log(`Open report: ${SHOW_REPORT_COMMAND}`);
  }

  return {
    htmlPath,
    normalizedJsonPath,
    testCount: normalized.summary.total
  };
}

/**
 * CLI entrypoint when this file is executed directly.
 * @returns {Promise<void>}
 */
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const input = typeof args.input === 'string' ? args.input : JSON_REPORT_FILE;
  const outputDir = typeof args['output-dir'] === 'string' ? args['output-dir'] : CUSTOM_REPORT_DIR;

  try {
    generateCustomReport({ inputPath: input, outputDir });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Custom HTML report generation failed.');
    console.error(message);
    console.error(
      'Troubleshooting: run tests to produce JSON results, verify build/json-report/results.json exists, then retry `npm run report:generate`.'
    );
    process.exitCode = 1;
  }
}

const invokedDirectly =
  Boolean(process.argv[1]) && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (invokedDirectly) {
  main();
}

// Re-export defaults for orchestrator convenience.
export { CUSTOM_REPORT_HTML, CUSTOM_REPORT_DIR, JSON_REPORT_FILE, NORMALIZED_REPORT_JSON };
