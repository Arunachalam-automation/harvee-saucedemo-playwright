import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestError,
  TestResult
} from '@playwright/test/reporter';
import path from 'path';

/**
 * Per-file outcome counters.
 *
 * Counting rules (unique tests, not retries):
 * - Each TestCase is counted once using its final Playwright outcome after all retries.
 * - `passed`: outcome === 'expected' (passed on first attempt or expected failure).
 * - `failed`: outcome === 'unexpected' (still failing after retries).
 * - `flaky`: outcome === 'flaky' (failed at least once, then passed on a later retry).
 * - `skipped`: outcome === 'skipped'.
 * - `interrupted`: last attempt status === 'interrupted' (counted separately when present).
 * - Retries do not inflate Total; only the final unique-test outcome is counted.
 */
type FileStats = {
  passed: number;
  failed: number;
  skipped: number;
  flaky: number;
  interrupted: number;
  total: number;
};

type FailedTestInfo = {
  title: string;
  location: string;
  error: string;
  flakyOrRetry: string | undefined;
};

const LINE = '='.repeat(65);
const DASH = '-'.repeat(65);
const MAX_FAILURES_SHOWN = 50;
const MAX_ERROR_LENGTH = 160;

/**
 * Custom Playwright reporter that prints a structured console summary once per run.
 *
 * Live `[n/m]` progress comes from the explicit `list` reporter in playwright.config.ts.
 * This reporter returns printsToStdio() === false so it does not replace `list` or
 * trigger Playwright's fallback `line` reporter (which overwrites progress via \\r).
 */
class ConsoleSummaryReporter implements Reporter {
  private config: FullConfig | undefined;
  private suite: Suite | undefined;
  private startedAt: Date | undefined;

  /**
   * Captures the resolved config, root suite, and execution start time.
   * @param config Resolved Playwright full configuration for this run.
   * @param suite Root suite containing all tests selected for execution.
   */
  onBegin(config: FullConfig, suite: Suite): void {
    this.config = config;
    this.suite = suite;
    this.startedAt = new Date();
  }

  /**
   * Declares that this reporter does not own live stdio progress output.
   * Must stay false so the configured `list` reporter keeps printing `[n/m]` lines.
   */
  printsToStdio(): boolean {
    return false;
  }

  /**
   * Builds and prints the automation console summary after the run finishes.
   * @param result Aggregate Playwright run result (status and total duration).
   */
  onEnd(result: FullResult): void {
    if (!this.config || !this.suite || !this.startedAt) {
      return;
    }

    // Ensure summary starts on a fresh line after the list reporter's last status line.
    if (process.stdout.isTTY) {
      process.stdout.write('\n');
    }

    const tests = this.suite.allTests();
    const byFile = new Map<string, FileStats>();
    const failures: FailedTestInfo[] = [];

    let passed = 0;
    let failed = 0;
    let skipped = 0;
    let flaky = 0;
    let interrupted = 0;

    for (const test of tests) {
      const fileKey = toRelativePath(test.location.file);
      const stats = byFile.get(fileKey) ?? emptyStats();
      const outcome = test.outcome();
      const lastResult = test.results[test.results.length - 1];
      const wasInterrupted = lastResult?.status === 'interrupted';

      if (wasInterrupted) {
        interrupted += 1;
        stats.interrupted += 1;
      } else if (outcome === 'flaky') {
        flaky += 1;
        stats.flaky += 1;
      } else if (outcome === 'unexpected') {
        failed += 1;
        stats.failed += 1;
      } else if (outcome === 'skipped') {
        skipped += 1;
        stats.skipped += 1;
      } else {
        passed += 1;
        stats.passed += 1;
      }

      stats.total += 1;
      byFile.set(fileKey, stats);

      if (outcome === 'unexpected' || wasInterrupted) {
        failures.push(buildFailureInfo(test, lastResult));
      }
    }

    const total = tests.length;
    const executed = passed + failed + flaky + interrupted;
    const passRate = executed === 0 ? 'N/A' : `${(((passed + flaky) / executed) * 100).toFixed(1)}%`;

    const lines: string[] = [];
    lines.push('');
    lines.push(LINE);
    lines.push(center('PLAYWRIGHT AUTOMATION REPORT'));
    lines.push(LINE);
    lines.push('');
    lines.push(...this.buildEnvironmentSection(result));
    lines.push('');
    lines.push(DASH);
    lines.push('TEST EXECUTION SUMMARY');
    lines.push(DASH);
    lines.push(formatField('Total Tests', String(total)));
    lines.push(formatField('Passed', String(passed)));
    lines.push(formatField('Failed', String(failed)));
    lines.push(formatField('Skipped', String(skipped)));
    lines.push(formatField('Flaky', String(flaky)));
    if (interrupted > 0) {
      lines.push(formatField('Interrupted', String(interrupted)));
    }
    lines.push('');
    lines.push(formatField('Pass Rate', passRate));
    lines.push('');
    lines.push(...buildFileBreakdown(byFile));
    lines.push(...buildFailureSection(failures, failed, flaky, interrupted));
    lines.push(...this.buildArtifactsSection());
    lines.push(LINE);
    lines.push(`Execution completed: ${toStatusLabel(result.status)}`);
    lines.push(LINE);
    lines.push('');

    console.log(lines.join('\n'));
  }

  /**
   * Formats run metadata (environment, URL, browser, workers, mode, timing).
   * @param result Aggregate Playwright run result used for total duration.
   */
  private buildEnvironmentSection(result: FullResult): string[] {
    const config = this.config!;
    const startedAt = this.startedAt!;
    const browser = resolveBrowserLabel(config, this.suite!);
    const executionMode = resolveExecutionMode(config);
    const baseURL = resolveBaseURL(config);
    const environment = resolveEnvironmentName(baseURL);

    return [
      formatField('Environment', environment),
      formatField('Base URL', baseURL),
      formatField('Browser', browser),
      formatField('Workers', String(config.workers)),
      formatField('Execution', executionMode),
      formatField('Started At', formatDateTime(startedAt)),
      formatField('Duration', formatDuration(result.duration))
    ];
  }

  /**
   * Prints a single open-report command for every run (browser, grep, file, etc.).
   * The custom HTML report is written to build/html-report after the run.
   */
  private buildArtifactsSection(): string[] {
    return [DASH, 'REPORT ARTIFACTS', DASH, 'Open report: npm run report', ''];
  }
}

/**
 * Creates empty per-file counters.
 */
function emptyStats(): FileStats {
  return { passed: 0, failed: 0, skipped: 0, flaky: 0, interrupted: 0, total: 0 };
}

/**
 * Builds a concise failure entry for the FAILED TESTS section.
 * @param test Playwright test case that failed or was interrupted.
 * @param result Final result attempt used for error extraction (may be undefined).
 */
function buildFailureInfo(test: TestCase, result: TestResult | undefined): FailedTestInfo {
  const location = `${toRelativePath(test.location.file)}:${test.location.line}`;
  const retryNote = result && result.retry > 0 ? `retry #${result.retry}` : undefined;

  return {
    title: test.titlePath().slice(1).join(' › '),
    location,
    error: shortenError(result?.error),
    flakyOrRetry: retryNote
  };
}

/**
 * Builds the per-file results table and totals row.
 * @param byFile Map of relative file path to outcome counters.
 */
function buildFileBreakdown(byFile: Map<string, FileStats>): string[] {
  const lines = [
    DASH,
    'TEST RESULTS BY FILE / FOLDER',
    DASH,
    formatTableRow('File / Folder', 'Passed', 'Failed', 'Skipped', 'Flaky', 'Total'),
    DASH
  ];

  const sortedFiles = [...byFile.keys()].sort((a, b) => a.localeCompare(b));
  let totalPassed = 0;
  let totalFailed = 0;
  let totalSkipped = 0;
  let totalFlaky = 0;
  let totalTests = 0;

  for (const file of sortedFiles) {
    const stats = byFile.get(file)!;
    lines.push(
      formatTableRow(
        truncate(file, 31),
        String(stats.passed),
        String(stats.failed + stats.interrupted),
        String(stats.skipped),
        String(stats.flaky),
        String(stats.total)
      )
    );
    totalPassed += stats.passed;
    totalFailed += stats.failed + stats.interrupted;
    totalSkipped += stats.skipped;
    totalFlaky += stats.flaky;
    totalTests += stats.total;
  }

  lines.push(DASH);
  lines.push(
    formatTableRow(
      'TOTAL',
      String(totalPassed),
      String(totalFailed),
      String(totalSkipped),
      String(totalFlaky),
      String(totalTests)
    )
  );
  lines.push('');
  return lines;
}

/**
 * Builds the failure details section (or a concise no-failure message).
 * @param failures Collected hard-failure entries.
 * @param failed Hard-failure count.
 * @param flaky Flaky-test count (recovered after retry).
 * @param interrupted Interrupted-test count.
 */
function buildFailureSection(failures: FailedTestInfo[], failed: number, flaky: number, interrupted: number): string[] {
  if (failed === 0 && interrupted === 0) {
    const lines = [DASH, 'FAILED TESTS', DASH, 'No failed tests'];
    if (flaky > 0) {
      lines.push(`Flaky tests recovered after retry: ${flaky}`);
    }
    lines.push('');
    return lines;
  }

  const toShow = failures.slice(0, MAX_FAILURES_SHOWN);
  const lines = [DASH, 'FAILED TESTS', DASH];

  toShow.forEach((entry, index) => {
    lines.push(`${index + 1}. ${entry.title}`);
    lines.push(`   File     : ${entry.location}`);
    lines.push(`   Error    : ${entry.error}`);
    if (entry.flakyOrRetry) {
      lines.push(`   Retry    : ${entry.flakyOrRetry}`);
    }
    lines.push('');
  });

  if (failures.length > MAX_FAILURES_SHOWN) {
    lines.push(`...and ${failures.length - MAX_FAILURES_SHOWN} more failed tests`);
    lines.push('');
  }

  if (flaky > 0) {
    lines.push(`Flaky (recovered) tests: ${flaky} — see custom HTML report for details`);
    lines.push('');
  }

  return lines;
}

/**
 * Resolves a human-readable environment label without logging secrets.
 * Prefers TEST_ENV / ENVIRONMENT; otherwise CI / local; else base URL host.
 * @param baseURL Configured application base URL.
 */
function resolveEnvironmentName(baseURL: string): string {
  const explicit = process.env.TEST_ENV?.trim() || process.env.ENVIRONMENT?.trim();
  if (explicit) {
    return explicit;
  }
  if (process.env.CI) {
    return 'CI';
  }
  try {
    if (baseURL && baseURL !== 'Not configured') {
      return new URL(baseURL).hostname;
    }
  } catch {
    // Ignore invalid URL and fall through.
  }
  return 'local';
}

/**
 * Reads baseURL from the resolved Playwright config projects / use options.
 * @param config Resolved Playwright full configuration.
 */
function resolveBaseURL(config: FullConfig): string {
  for (const project of config.projects) {
    const value = project.use?.baseURL;
    if (typeof value === 'string' && value.trim() !== '') {
      return value;
    }
  }
  return 'Not configured';
}

/**
 * Resolves browser / project names from executed tests (fallback: configured projects).
 * @param config Resolved Playwright full configuration.
 * @param suite Root suite for this run.
 */
function resolveBrowserLabel(config: FullConfig, suite: Suite): string {
  const fromTests = new Set(
    suite
      .allTests()
      .map((t) => t.parent.project()?.name)
      .filter((name): name is string => !!name && name !== 'setup')
  );

  if (fromTests.size > 0) {
    return [...fromTests].sort().join(', ');
  }

  const configured = config.projects.map((p) => p.name).filter((name) => name && name !== 'setup');
  return configured.length > 0 ? configured.join(', ') : 'Not configured';
}

/**
 * Detects headed vs headless from the resolved project use options.
 * @param config Resolved Playwright full configuration.
 */
function resolveExecutionMode(config: FullConfig): string {
  const projects = config.projects.filter((p) => p.name !== 'setup');
  const target = projects[0] ?? config.projects[0];
  if (!target) {
    return 'Not configured';
  }
  // Playwright sets headless=false when --headed is passed.
  return target.use.headless === false ? 'headed' : 'headless';
}

/**
 * Converts an absolute path to a cwd-relative path using forward-friendly separators.
 * @param filePath Absolute or relative filesystem path.
 */
function toRelativePath(filePath: string): string {
  const relative = path.relative(process.cwd(), filePath);
  return (relative || filePath).split(path.sep).join('/');
}

/**
 * Formats a labeled field with aligned columns.
 * @param label Field label.
 * @param value Field value.
 */
function formatField(label: string, value: string): string {
  return `${label.padEnd(14)}: ${value}`;
}

/**
 * Formats one row of the file-breakdown table.
 * @param file File or folder label.
 * @param passed Passed count (final expected outcome; excludes flaky).
 * @param failed Failed count (includes interrupted).
 * @param skipped Skipped count.
 * @param flaky Flaky count (failed then passed on retry).
 * @param total Total unique tests in the file.
 */
function formatTableRow(
  file: string,
  passed: string,
  failed: string,
  skipped: string,
  flaky: string,
  total: string
): string {
  return `${file.padEnd(32)}${passed.padStart(7)}${failed.padStart(8)}${skipped.padStart(9)}${flaky.padStart(7)}${total.padStart(7)}`;
}

/**
 * Centers text within the report width.
 * @param text Text to center.
 */
function center(text: string): string {
  const width = LINE.length;
  if (text.length >= width) {
    return text;
  }
  const left = Math.floor((width - text.length) / 2);
  return `${' '.repeat(left)}${text}`;
}

/**
 * Formats a Date as a locale-friendly timestamp string.
 * @param date Date to format.
 */
function formatDateTime(date: Date): string {
  return date.toLocaleString();
}

/**
 * Formats a millisecond duration as a compact human-readable string.
 * @param durationMs Duration in milliseconds from Playwright.
 */
function formatDuration(durationMs: number): string {
  if (!Number.isFinite(durationMs) || durationMs < 0) {
    return 'Not available';
  }
  const totalSeconds = durationMs / 1000;
  if (totalSeconds < 60) {
    return `${totalSeconds.toFixed(1)}s`;
  }
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds - minutes * 60;
  return `${minutes}m ${seconds.toFixed(1)}s`;
}

/**
 * Maps Playwright's aggregate status to a console label.
 * @param status FullResult.status value.
 */
function toStatusLabel(status: FullResult['status']): string {
  switch (status) {
    case 'passed':
      return 'PASSED';
    case 'failed':
      return 'FAILED';
    case 'timedout':
      return 'TIMED OUT';
    case 'interrupted':
      return 'INTERRUPTED';
    default:
      return String(status).toUpperCase();
  }
}

/**
 * Extracts a short, single-line error message suitable for the console summary.
 * @param error Playwright test error object, if present.
 */
function shortenError(error: TestError | undefined): string {
  if (!error) {
    return 'No error message available';
  }
  const raw =
    (error.message ?? error.value ?? 'Unknown error')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .find((line) => !line.startsWith('at ')) ?? 'Unknown error';

  // Strip common ANSI sequences for CI / Windows logs without color support.
  const plain = raw.replace(/\u001b\[[0-9;]*m/g, '');
  return plain.length > MAX_ERROR_LENGTH ? `${plain.slice(0, MAX_ERROR_LENGTH - 3)}...` : plain;
}

/**
 * Truncates a string with an ellipsis when it exceeds maxLen.
 * @param value Original string.
 * @param maxLen Maximum length including ellipsis.
 */
function truncate(value: string, maxLen: number): string {
  if (value.length <= maxLen) {
    return value;
  }
  return `${value.slice(0, maxLen - 3)}...`;
}

export default ConsoleSummaryReporter;
