/**
 * Normalizes Playwright JSON reporter output into a flat, UI-friendly shape.
 * Handles missing fields, nested suites, retries, skipped tests, and attachments safely.
 */

import path from 'node:path';

/**
 * @typedef {'passed' | 'failed' | 'skipped' | 'flaky' | 'timedOut' | 'interrupted'} ReportStatus
 */

/**
 * @typedef {object} NormalizedAttachment
 * @property {string} name
 * @property {string} [path]
 * @property {string} [reportPath]
 * @property {string} contentType
 * @property {string} [bodyPreview]
 * @property {string} [bodyBase64]
 */

/**
 * @typedef {object} NormalizedAttempt
 * @property {number} retry
 * @property {string} status
 * @property {number} duration
 * @property {string} [errorMessage]
 * @property {string} [errorStack]
 * @property {string} [errorLocation]
 * @property {NormalizedAttachment[]} attachments
 */

/**
 * @typedef {object} NormalizedTest
 * @property {string} id
 * @property {string} title
 * @property {string} fullTitle
 * @property {string} project
 * @property {string} file
 * @property {number} [line]
 * @property {ReportStatus} status
 * @property {number} duration
 * @property {string[]} tags
 * @property {string} [priority]
 * @property {number} retries
 * @property {string} [errorMessage]
 * @property {string} [errorStack]
 * @property {string} [errorLocation]
 * @property {NormalizedAttachment[]} attachments
 * @property {NormalizedAttempt[]} attempts
 * @property {number} order
 */

/**
 * @typedef {object} ProjectBreakdown
 * @property {string} project
 * @property {number} total
 * @property {number} passed
 * @property {number} failed
 * @property {number} skipped
 * @property {number} flaky
 */

/**
 * @typedef {object} NormalizedReport
 * @property {string} generatedAt
 * @property {string} [startTime]
 * @property {number} duration
 * @property {{ total: number, passed: number, failed: number, skipped: number, flaky: number, timedOut: number, interrupted: number, passRate: number }} summary
 * @property {ProjectBreakdown[]} projects
 * @property {string[]} allTags
 * @property {string[]} allPriorities
 * @property {NormalizedTest[]} tests
 */

/**
 * Normalizes a Playwright JSON report object into dashboard-ready data.
 * Safely handles empty suites, skipped-only runs, and missing stats.
 * @param {unknown} raw Parsed Playwright JSON reporter payload.
 * @returns {NormalizedReport}
 */
export function normalizePlaywrightJson(raw) {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('JSON report root must be a non-null object.');
  }

  const report = /** @type {Record<string, unknown>} */ (raw);
  const suites = Array.isArray(report.suites) ? report.suites : [];
  const stats =
    report.stats && typeof report.stats === 'object' ? /** @type {Record<string, unknown>} */ (report.stats) : {};

  /** @type {NormalizedTest[]} */
  const collected = [];
  for (const suite of suites) {
    collectTests(suite, [], '', collected);
  }

  // Group by browser (project) then spec filename, preserving first-seen order within each level.
  const tests = groupTestsByBrowserThenFile(collected).map((test, index) => ({
    ...test,
    order: index
  }));

  const summary = {
    total: tests.length,
    passed: 0,
    failed: 0,
    skipped: 0,
    flaky: 0,
    timedOut: 0,
    interrupted: 0,
    passRate: 0
  };

  /** @type {Map<string, ProjectBreakdown>} */
  const projectMap = new Map();
  /** @type {Set<string>} */
  const tagSet = new Set();
  /** @type {Set<string>} */
  const prioritySet = new Set();

  for (const test of tests) {
    switch (test.status) {
      case 'passed':
        summary.passed += 1;
        break;
      case 'failed':
        summary.failed += 1;
        break;
      case 'skipped':
        summary.skipped += 1;
        break;
      case 'flaky':
        summary.flaky += 1;
        break;
      case 'timedOut':
        summary.timedOut += 1;
        summary.failed += 1;
        break;
      case 'interrupted':
        summary.interrupted += 1;
        summary.failed += 1;
        break;
      default:
        summary.failed += 1;
        break;
    }

    for (const tag of test.tags) {
      tagSet.add(tag);
    }
    if (test.priority) {
      prioritySet.add(test.priority);
    }

    const projectKey = test.project || 'unknown';
    const bucket = projectMap.get(projectKey) ?? {
      project: projectKey,
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      flaky: 0
    };
    bucket.total += 1;
    if (test.status === 'passed') bucket.passed += 1;
    else if (test.status === 'skipped') bucket.skipped += 1;
    else if (test.status === 'flaky') bucket.flaky += 1;
    else bucket.failed += 1;
    projectMap.set(projectKey, bucket);
  }

  const executed = summary.passed + summary.failed + summary.flaky;
  summary.passRate = executed === 0 ? 0 : Number((((summary.passed + summary.flaky) / executed) * 100).toFixed(2));

  const durationFromStats = typeof stats.duration === 'number' ? stats.duration : NaN;
  const durationFromTests = tests.reduce((sum, t) => sum + (Number.isFinite(t.duration) ? t.duration : 0), 0);
  const duration = Number.isFinite(durationFromStats) ? durationFromStats : durationFromTests;

  return {
    generatedAt: new Date().toISOString(),
    startTime: typeof stats.startTime === 'string' ? stats.startTime : undefined,
    duration,
    summary,
    projects: [...projectMap.values()].sort((a, b) => compareProjectNames(a.project, b.project)),
    allTags: [...tagSet].sort((a, b) => a.localeCompare(b)),
    allPriorities: [...prioritySet].sort((a, b) => a.localeCompare(b)),
    tests
  };
}

/**
 * Sorts project/browser names with `setup` always first, then alphabetical.
 * @param {string} a Left project name.
 * @param {string} b Right project name.
 * @returns {number}
 */
function compareProjectNames(a, b) {
  if (a === 'setup' && b !== 'setup') return -1;
  if (b === 'setup' && a !== 'setup') return 1;
  return a.localeCompare(b);
}

/**
 * Groups tests by browser/project, then by spec filename.
 * `setup` is always first; other projects keep first-seen order, then files keep first-seen order.
 * @param {NormalizedTest[]} tests Flat list in Playwright walk order.
 * @returns {NormalizedTest[]}
 */
function groupTestsByBrowserThenFile(tests) {
  /** @type {string[]} */
  const projectOrder = [];
  /** @type {Map<string, { fileOrder: string[], byFile: Map<string, NormalizedTest[]> }>} */
  const byProject = new Map();

  for (const test of tests) {
    const project = test.project || 'unknown';
    const file = test.file || 'unknown';

    if (!byProject.has(project)) {
      projectOrder.push(project);
      byProject.set(project, { fileOrder: [], byFile: new Map() });
    }

    const bucket = byProject.get(project);
    if (!bucket.byFile.has(file)) {
      bucket.fileOrder.push(file);
      bucket.byFile.set(file, []);
    }
    bucket.byFile.get(file).push(test);
  }

  projectOrder.sort(compareProjectNames);

  return projectOrder.flatMap((project) => {
    const bucket = byProject.get(project);
    return bucket.fileOrder.flatMap((file) => bucket.byFile.get(file) ?? []);
  });
}

/**
 * Returns a display-friendly spec filename (basename only).
 * @param {string} filePath Spec file path from Playwright JSON.
 * @returns {string}
 */
function toSpecFileName(filePath) {
  if (!filePath || typeof filePath !== 'string') {
    return 'unknown';
  }
  const trimmed = filePath.trim();
  if (!trimmed) {
    return 'unknown';
  }
  return path.basename(trimmed.replace(/\\/g, '/'));
}

/**
 * Recursively walks Playwright suite trees and appends normalized tests.
 * @param {unknown} suiteNode Suite or nested suite node from the JSON report.
 * @param {string[]} parentTitles Parent suite titles for fullTitle construction.
 * @param {string} parentFile Fallback file path from the parent suite.
 * @param {NormalizedTest[]} out Accumulator for normalized tests.
 */
function collectTests(suiteNode, parentTitles, parentFile, out) {
  if (!suiteNode || typeof suiteNode !== 'object') {
    return;
  }

  const suite = /** @type {Record<string, unknown>} */ (suiteNode);
  const title = typeof suite.title === 'string' ? suite.title : '';
  const suiteFile = typeof suite.file === 'string' && suite.file.trim() !== '' ? suite.file : parentFile;
  // File-level suite titles often repeat the filename; omit them from the title path.
  const suiteFileName = toSpecFileName(suiteFile);
  const isFileSuiteTitle =
    Boolean(title) && (title === suiteFile || title === suiteFileName || toSpecFileName(title) === suiteFileName);
  const nextParents = title && !isFileSuiteTitle ? [...parentTitles, title] : parentTitles;

  const specs = Array.isArray(suite.specs) ? suite.specs : [];
  for (const spec of specs) {
    normalizeSpec(spec, nextParents, suiteFile, out);
  }

  const nested = Array.isArray(suite.suites) ? suite.suites : [];
  for (const child of nested) {
    collectTests(child, nextParents, suiteFile, out);
  }
}

/**
 * Converts one Playwright spec (and its project variants) into normalized rows.
 * @param {unknown} specNode Spec node from the JSON report.
 * @param {string[]} parentTitles Parent suite titles.
 * @param {string} parentFile Fallback file path from the parent suite.
 * @param {NormalizedTest[]} out Accumulator for normalized tests.
 */
function normalizeSpec(specNode, parentTitles, parentFile, out) {
  if (!specNode || typeof specNode !== 'object') {
    return;
  }

  const spec = /** @type {Record<string, unknown>} */ (specNode);
  const title = typeof spec.title === 'string' ? spec.title : 'Untitled test';
  const rawFile = typeof spec.file === 'string' && spec.file.trim() !== '' ? spec.file : parentFile || '';
  const file = toSpecFileName(rawFile);
  const line = typeof spec.line === 'number' ? spec.line : undefined;
  const specId = typeof spec.id === 'string' ? spec.id : `${file}:${line ?? 0}:${title}`;
  const tags = extractTags(spec);
  const priority = extractPriority(tags);
  // Keep fullTitle for search/export, but strip file/suite noise from the leaf title path.
  const fullTitle = [...parentTitles, title].filter(Boolean).join(' › ');

  const tests = Array.isArray(spec.tests) ? spec.tests : [];

  // Specs with no project variants still belong in the report (common for skipped-only collection).
  if (tests.length === 0) {
    const skippedFromOk = spec.ok === true;
    out.push({
      id: specId,
      title,
      fullTitle,
      project: 'unknown',
      file,
      line,
      status: skippedFromOk || spec.ok === undefined ? 'skipped' : 'failed',
      duration: 0,
      tags,
      priority,
      retries: 0,
      attachments: [],
      attempts: [],
      order: 0
    });
    return;
  }

  tests.forEach((testNode, index) => {
    if (!testNode || typeof testNode !== 'object') {
      return;
    }
    const test = /** @type {Record<string, unknown>} */ (testNode);
    const project = typeof test.projectName === 'string' && test.projectName ? test.projectName : 'unknown';
    const outcome = typeof test.status === 'string' ? test.status : '';
    const expectedStatus = typeof test.expectedStatus === 'string' ? test.expectedStatus : undefined;
    const results = Array.isArray(test.results) ? test.results : [];
    const attempts = results.map((result, attemptIndex) => normalizeAttempt(result, attemptIndex));
    const lastAttempt = attempts[attempts.length - 1];
    const status = mapOutcomeToStatus(outcome, lastAttempt?.status, expectedStatus);

    // Only surface errors for real failures / flaky attempts — never for skipped or clean passes.
    const shouldExposeError =
      status === 'failed' || status === 'timedOut' || status === 'interrupted' || status === 'flaky';
    const failingAttempt = shouldExposeError
      ? ([...attempts].reverse().find((a) => a.errorMessage || a.errorStack) ??
        (status === 'flaky' ? attempts.find((a) => a.errorMessage || a.errorStack) : undefined))
      : undefined;

    const duration = attempts.reduce((sum, a) => sum + (Number.isFinite(a.duration) ? a.duration : 0), 0);
    const attachments = shouldExposeError || status === 'passed' ? mergeAttachments(attempts) : [];

    out.push({
      id: `${specId}::${project}::${index}`,
      title,
      fullTitle,
      project,
      file,
      line,
      status,
      duration,
      tags,
      priority,
      retries: Math.max(0, attempts.length - 1),
      errorMessage: failingAttempt?.errorMessage,
      errorStack: failingAttempt?.errorStack,
      errorLocation: failingAttempt?.errorLocation,
      attachments,
      attempts,
      order: 0
    });
  });
}

/**
 * Maps a single Playwright result attempt into a normalized attempt record.
 * @param {unknown} resultNode Result object from the JSON report.
 * @param {number} fallbackRetry Fallback retry index when the result omits retry.
 * @returns {NormalizedAttempt}
 */
function normalizeAttempt(resultNode, fallbackRetry) {
  if (!resultNode || typeof resultNode !== 'object') {
    return {
      retry: fallbackRetry,
      status: 'skipped',
      duration: 0,
      attachments: []
    };
  }

  const result = /** @type {Record<string, unknown>} */ (resultNode);
  const error = pickError(result);
  const attachments = normalizeAttachments(result.attachments);

  return {
    retry: typeof result.retry === 'number' ? result.retry : fallbackRetry,
    status: typeof result.status === 'string' ? result.status : 'unknown',
    duration: typeof result.duration === 'number' && Number.isFinite(result.duration) ? result.duration : 0,
    errorMessage: error.message,
    errorStack: error.stack,
    errorLocation: error.location,
    attachments
  };
}

/**
 * Extracts a safe error message/stack/location from a result object.
 * @param {Record<string, unknown>} result Playwright result object.
 * @returns {{ message?: string, stack?: string, location?: string }}
 */
function pickError(result) {
  const primary =
    result.error && typeof result.error === 'object'
      ? /** @type {Record<string, unknown>} */ (result.error)
      : undefined;
  const list = Array.isArray(result.errors) ? result.errors : [];
  const firstList = list.find((e) => e && typeof e === 'object');
  const source = primary ?? (firstList ? /** @type {Record<string, unknown>} */ (firstList) : undefined);
  if (!source) {
    return {};
  }

  const message =
    typeof source.message === 'string'
      ? stripAnsi(source.message)
      : typeof source.value === 'string'
        ? stripAnsi(source.value)
        : undefined;
  const stack = typeof source.stack === 'string' ? stripAnsi(source.stack) : undefined;
  const location = formatErrorLocation(source.location) || formatErrorLocation(result.errorLocation);
  return { message, stack, location };
}

/**
 * Formats a Playwright error location as `file:line` (basename + line).
 * @param {unknown} locationRaw Playwright location object (`file`, `line`, optional `column`).
 * @returns {string | undefined}
 */
function formatErrorLocation(locationRaw) {
  if (!locationRaw || typeof locationRaw !== 'object') {
    return undefined;
  }
  const location = /** @type {Record<string, unknown>} */ (locationRaw);
  const file = typeof location.file === 'string' ? toSpecFileName(location.file) : '';
  if (!file || file === 'unknown') {
    return undefined;
  }
  const line = typeof location.line === 'number' && location.line > 0 ? location.line : undefined;
  const column = typeof location.column === 'number' && location.column > 0 ? location.column : undefined;
  if (line == null) {
    return file;
  }
  return column == null ? `${file}:${line}` : `${file}:${line}:${column}`;
}

/**
 * Normalizes attachment metadata without embedding large binary bodies.
 * @param {unknown} attachmentsRaw Attachments array from a result.
 * @returns {NormalizedAttachment[]}
 */
function normalizeAttachments(attachmentsRaw) {
  if (!Array.isArray(attachmentsRaw)) {
    return [];
  }

  /** @type {NormalizedAttachment[]} */
  const out = [];
  for (const item of attachmentsRaw) {
    if (!item || typeof item !== 'object') {
      continue;
    }
    const attachment = /** @type {Record<string, unknown>} */ (item);
    const name = typeof attachment.name === 'string' ? attachment.name : 'attachment';
    const contentType =
      typeof attachment.contentType === 'string' ? attachment.contentType : 'application/octet-stream';
    /** @type {NormalizedAttachment} */
    const normalized = { name, contentType };
    if (typeof attachment.path === 'string' && attachment.path.trim() !== '') {
      normalized.path = attachment.path;
    }
    if (typeof attachment.body === 'string' && attachment.body.length > 0) {
      // Playwright may store inline attachment bodies as base64.
      if (attachment.body.length <= 2_000_000) {
        normalized.bodyBase64 = attachment.body;
      }
      if (attachment.body.length <= 4000) {
        normalized.bodyPreview = attachment.body.slice(0, 4000);
      }
    }
    out.push(normalized);
  }
  return out;
}

/**
 * Merges attachments across attempts, preferring later retries when names collide.
 * @param {NormalizedAttempt[]} attempts Normalized attempts in order.
 * @returns {NormalizedAttachment[]}
 */
function mergeAttachments(attempts) {
  /** @type {Map<string, NormalizedAttachment>} */
  const map = new Map();
  for (const attempt of attempts) {
    for (const attachment of attempt.attachments) {
      map.set(`${attachment.name}::${attachment.path ?? attachment.bodyBase64?.slice(0, 32) ?? ''}`, attachment);
    }
  }
  return [...map.values()];
}

/**
 * Maps Playwright outcome + last attempt status to a dashboard status.
 * @param {string} outcome Test-level outcome (expected / unexpected / flaky / skipped).
 * @param {string} [lastStatus] Last attempt status.
 * @param {string} [expectedStatus] Playwright expectedStatus (passed / skipped / failed).
 * @returns {ReportStatus}
 */
function mapOutcomeToStatus(outcome, lastStatus, expectedStatus) {
  if (outcome === 'flaky') {
    return 'flaky';
  }
  if (outcome === 'skipped' || expectedStatus === 'skipped') {
    return 'skipped';
  }
  if (outcome === 'expected') {
    return 'passed';
  }
  // Empty outcome with a skipped last attempt (or no attempts) → skipped, not failed.
  if (!outcome && (lastStatus === 'skipped' || lastStatus === undefined)) {
    return 'skipped';
  }
  if (lastStatus === 'timedOut') {
    return 'timedOut';
  }
  if (lastStatus === 'interrupted') {
    return 'interrupted';
  }
  if (lastStatus === 'skipped') {
    return 'skipped';
  }
  if (lastStatus === 'passed') {
    return 'passed';
  }
  return 'failed';
}

/**
 * Collects tags from a spec node (tags array and annotation fallbacks).
 * @param {Record<string, unknown>} spec Spec object.
 * @returns {string[]}
 */
function extractTags(spec) {
  /** @type {Set<string>} */
  const tags = new Set();
  if (Array.isArray(spec.tags)) {
    for (const tag of spec.tags) {
      if (typeof tag === 'string' && tag.trim() !== '') {
        tags.add(tag.startsWith('@') ? tag : `@${tag}`);
      }
    }
  }

  const tests = Array.isArray(spec.tests) ? spec.tests : [];
  for (const testNode of tests) {
    if (!testNode || typeof testNode !== 'object') continue;
    const test = /** @type {Record<string, unknown>} */ (testNode);
    const annotations = Array.isArray(test.annotations) ? test.annotations : [];
    for (const annotation of annotations) {
      if (!annotation || typeof annotation !== 'object') continue;
      const ann = /** @type {Record<string, unknown>} */ (annotation);
      if (ann.type === 'tag' && typeof ann.description === 'string' && ann.description.trim() !== '') {
        const value = ann.description.trim();
        tags.add(value.startsWith('@') ? value : `@${value}`);
      }
    }
  }

  return [...tags];
}

/**
 * Derives a priority label from tags when present (@P1, @priority:high, etc.).
 * @param {string[]} tags Test tags.
 * @returns {string | undefined}
 */
function extractPriority(tags) {
  for (const tag of tags) {
    const bare = tag.replace(/^@/, '');
    if (/^p[0-9]+$/i.test(bare)) {
      return bare.toUpperCase();
    }
    const priorityMatch = /^priority[:_-]?(.+)$/i.exec(bare);
    if (priorityMatch?.[1]) {
      return priorityMatch[1].trim();
    }
  }
  return undefined;
}

/**
 * Strips common ANSI color sequences from error text.
 * @param {string} value Raw string that may contain ANSI codes.
 * @returns {string}
 */
function stripAnsi(value) {
  return value.replace(/\u001b\[[0-9;]*m/g, '');
}
