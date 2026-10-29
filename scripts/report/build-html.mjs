/**
 * Builds a standalone custom HTML report with embedded normalized data.
 * Designed for file:// opening: no fetch() of local JSON files.
 */

/**
 * Escapes a value for safe embedding inside a JSON script payload.
 * Prevents `</script>` breakouts while preserving JSON.parse compatibility.
 * @param {unknown} data Normalized report data to embed.
 * @returns {string}
 */
export function serializeReportData(data) {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

/**
 * Builds the full standalone HTML document for the custom report.
 * @param {object} normalizedReport Normalized report produced by normalizePlaywrightJson.
 * @returns {string}
 */
export function buildHtmlReport(normalizedReport) {
  const payload = serializeReportData(normalizedReport);
  return `<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
  <meta http-equiv="Pragma" content="no-cache" />
  <meta http-equiv="Expires" content="0" />
  <title>Test Report</title>
  <style>${REPORT_CSS}</style>
</head>
<body>
  <div class="app">
    <header class="topbar">
      <div class="topbar-title">
        <h1>Test Report</h1>
        <p class="muted" id="generatedAt"></p>
      </div>
      <div class="topbar-actions">
        <button type="button" id="themeToggle" class="btn">Theme</button>
      </div>
    </header>

    <section class="stats" id="stats"></section>

    <section class="toolbar card" id="toolbar">
      <div class="toolbar-header">
        <div class="toolbar-heading">
          <span class="toolbar-title">Filters</span>
          <span id="filterBadge" class="filter-badge hidden">Filters applied</span>
        </div>
        <button type="button" id="clearFilters" class="btn btn-clear" disabled>Clear filters</button>
      </div>
      <div class="toolbar-grid">
        <label>Search<input id="search" type="search" placeholder="Title, tags, file, browser…" /></label>
        <label>Browser
          <select id="browserFilter">
            <option value="">All</option>
          </select>
        </label>
        <label>Status
          <select id="statusFilter">
            <option value="">All</option>
            <option value="passed">Passed</option>
            <option value="failed">Failed</option>
            <option value="skipped">Skipped</option>
            <option value="flaky">Flaky</option>
            <option value="timedOut">Timed out</option>
            <option value="interrupted">Interrupted</option>
          </select>
        </label>
        <label>Page size
          <select id="pageSize">
            <option value="25">25</option>
            <option value="50" selected>50</option>
            <option value="100">100</option>
            <option value="200">200</option>
            <option value="0">All</option>
          </select>
        </label>
      </div>
    </section>

    <section class="card table-card">
      <div class="table-meta">
        <div class="table-meta-left">
          <span id="resultCount"></span>
          <div class="tree-actions">
            <button type="button" class="btn" id="expandAll">Expand all</button>
            <button type="button" class="btn" id="collapseAll">Collapse all</button>
          </div>
        </div>
        <div class="pager">
          <button type="button" class="btn" id="prevPage">Previous</button>
          <span id="pageInfo"></span>
          <button type="button" class="btn" id="nextPage">Next</button>
        </div>
      </div>
      <div class="table-wrap">
        <table id="resultsTable">
          <thead></thead>
          <tbody></tbody>
        </table>
      </div>
    </section>
  </div>

  <dialog id="detailDialog">
    <form method="dialog" class="dialog-head">
      <h2 id="detailTitle">Test details</h2>
      <button type="submit" class="btn">Close</button>
    </form>
    <div id="detailBody" class="dialog-body"></div>
  </dialog>

  <script id="report-data" type="application/json">${payload}</script>
  <script>${REPORT_JS}</script>
</body>
</html>`;
}

const REPORT_CSS = `
:root {
  --bg: #e8eef5;
  --surface: #f7fafc;
  --card: #ffffff;
  --card-tint: #f0f7ff;
  --text: #15202b;
  --muted: #5b6b7c;
  --border: #c5d0dc;
  --accent: #0f766e;
  --accent-soft: rgba(15, 118, 110, 0.12);
  --passed: #047857;
  --passed-bg: #ecfdf5;
  --failed: #b91c1c;
  --failed-bg: #fef2f2;
  --skipped: #4b5563;
  --skipped-bg: #f3f4f6;
  --flaky: #b45309;
  --flaky-bg: #fffbeb;
  --filter-badge-border: #67e8f9;
  --shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
}
html[data-theme="dark"] {
  --bg: #0b1220;
  --surface: #111827;
  --card: #1a2436;
  --card-tint: #1e2a40;
  --text: #e8eef7;
  --muted: #9aa8bc;
  --border: #334155;
  --accent: #2dd4bf;
  --accent-soft: rgba(45, 212, 191, 0.16);
  --passed: #34d399;
  --passed-bg: rgba(16, 185, 129, 0.16);
  --failed: #f87171;
  --failed-bg: rgba(248, 113, 113, 0.14);
  --skipped: #cbd5e1;
  --skipped-bg: rgba(148, 163, 184, 0.14);
  --flaky: #fbbf24;
  --flaky-bg: rgba(251, 191, 36, 0.14);
  --filter-badge-border: #2dd4bf;
  --shadow: 0 1px 3px rgba(0, 0, 0, 0.45);
}
* { box-sizing: border-box; }
html, body { width: 100%; max-width: 100%; }
body {
  margin: 0;
  font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
  background: linear-gradient(180deg, var(--bg) 0%, var(--surface) 100%);
  background-attachment: fixed;
  color: var(--text);
  overflow-x: hidden;
}
.app {
  width: 100%;
  max-width: none;
  margin: 0;
  padding: 1rem 1.5rem 2rem;
}
.topbar {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}
.topbar h1 { margin: 0 0 0.25rem; font-size: clamp(1.25rem, 2vw, 1.75rem); }
.topbar-actions { display: flex; flex-wrap: wrap; gap: 0.5rem; }
.muted { color: var(--muted); margin: 0; }
.card, .stats article {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: var(--shadow);
}
.stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}
.stats article {
  padding: 0.9rem 1rem;
  background: var(--card-tint);
  border-left: 4px solid var(--border);
}
.stats article.stat-passed { border-left-color: var(--passed); background: var(--passed-bg); }
.stats article.stat-failed { border-left-color: var(--failed); background: var(--failed-bg); }
.stats article.stat-skipped { border-left-color: var(--skipped); background: var(--skipped-bg); }
.stats article.stat-flaky { border-left-color: var(--flaky); background: var(--flaky-bg); }
.stats article.stat-total,
.stats article.stat-rate,
.stats article.stat-duration {
  border-left-color: var(--accent);
  background: var(--accent-soft);
}
.stats .label { color: var(--muted); font-size: 0.8rem; font-weight: 600; }
.stats .value { font-size: 1.35rem; font-weight: 700; margin-top: 0.25rem; color: var(--text); }
.toolbar { padding: 1rem; margin-bottom: 0.75rem; background: var(--card); }
.toolbar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-bottom: 0.75rem;
}
.toolbar-heading { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
.toolbar-title { font-weight: 700; color: var(--text); }
.filter-badge {
  display: inline-block;
  padding: 0.15rem 0.55rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--accent);
  background: var(--accent-soft);
  border: 1px solid var(--filter-badge-border);
}
.toolbar-grid {
  display: grid;
  grid-template-columns: minmax(180px, 2fr) repeat(3, minmax(120px, 1fr));
  gap: 0.75rem;
}
label { display: flex; flex-direction: column; gap: 0.35rem; font-size: 0.85rem; color: var(--muted); font-weight: 600; }
input, select, button, textarea {
  font: inherit;
  color: var(--text);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 0.45rem 0.6rem;
}
html[data-theme="dark"] input,
html[data-theme="dark"] select,
html[data-theme="dark"] button:not(.linkish) {
  background: #0f172a;
}
.btn { cursor: pointer; background: var(--card); }
.btn:hover { border-color: var(--accent); }
.btn:disabled { opacity: 0.45; cursor: not-allowed; }
.btn-clear {
  background: var(--accent-soft);
  border-color: var(--accent);
  color: var(--accent);
  font-weight: 700;
}
.btn-clear:not(:disabled):hover {
  background: var(--accent);
  color: #fff;
}
html[data-theme="dark"] .btn-clear:not(:disabled):hover { color: #0b1220; }
.hidden { display: none !important; }
.table-card { padding: 0.75rem; width: 100%; background: var(--card); }
.table-meta {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 0.5rem;
}
.table-meta-left {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  flex-wrap: wrap;
}
.tree-actions { display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; }
.pager { display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; }
.table-wrap {
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  max-height: min(70vh, 900px);
  border-radius: 8px;
  background: var(--surface);
}
table {
  width: 100%;
  min-width: 720px;
  border-collapse: collapse;
  font-size: 0.92rem;
  table-layout: auto;
}
th, td {
  border-bottom: 1px solid var(--border);
  padding: 0.55rem 0.6rem;
  text-align: left;
  vertical-align: top;
  word-break: break-word;
}
th {
  position: sticky;
  top: 0;
  background: var(--card-tint);
  z-index: 1;
  white-space: nowrap;
}
th:nth-child(1), td:nth-child(1) { width: 42%; min-width: 200px; }
th:nth-child(2), td:nth-child(2) { width: 10%; white-space: nowrap; }
th:nth-child(3), td:nth-child(3) { width: 10%; white-space: nowrap; }
th:nth-child(4), td:nth-child(4) { width: 20%; }
th:nth-child(5), td:nth-child(5) { width: 8%; white-space: nowrap; }
th:nth-child(6), td:nth-child(6) { width: 10%; white-space: nowrap; }
tr:hover td { background: var(--accent-soft); }
tr.row-browser td {
  background: var(--accent-soft);
  font-weight: 700;
}
tr.row-spec td {
  background: var(--card-tint);
  font-weight: 600;
}
tr.row-browser:hover td,
tr.row-spec:hover td { background: color-mix(in srgb, var(--accent) 18%, var(--card-tint)); }
.tree-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  margin-right: 0.35rem;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--card);
  color: var(--text);
  cursor: pointer;
  font-size: 0.7rem;
  line-height: 1;
  vertical-align: middle;
  padding: 0;
  flex-shrink: 0;
}
.tree-toggle:hover { border-color: var(--accent); color: var(--accent); }
.tree-label {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  flex-wrap: wrap;
  vertical-align: middle;
}
.tree-indent-spec { padding-left: 1.25rem !important; }
.tree-indent-test { padding-left: 2.5rem !important; }
.group-meta {
  color: var(--muted);
  font-weight: 600;
  font-size: 0.8rem;
  margin-left: 0.35rem;
}
.group-counts {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  margin-left: 0.5rem;
}
.group-counts .badge { font-weight: 700; }
.badge {
  display: inline-block;
  border-radius: 999px;
  padding: 0.15rem 0.6rem;
  font-size: 0.75rem;
  font-weight: 700;
  border: 1px solid transparent;
}
.badge.passed { color: var(--passed); background: var(--passed-bg); border-color: color-mix(in srgb, var(--passed) 35%, transparent); }
.badge.failed, .badge.timedOut, .badge.interrupted {
  color: var(--failed);
  background: var(--failed-bg);
  border-color: color-mix(in srgb, var(--failed) 35%, transparent);
}
.badge.skipped { color: var(--skipped); background: var(--skipped-bg); border-color: color-mix(in srgb, var(--skipped) 35%, transparent); }
.badge.flaky { color: var(--flaky); background: var(--flaky-bg); border-color: color-mix(in srgb, var(--flaky) 35%, transparent); }
.tag {
  display: inline-block;
  margin: 0.1rem 0.2rem 0.1rem 0;
  padding: 0.05rem 0.4rem;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: var(--card-tint);
  font-size: 0.75rem;
}
.linkish {
  background: transparent;
  border: none;
  color: var(--accent);
  cursor: pointer;
  padding: 0.15rem 0.35rem;
  text-decoration: underline;
  font: inherit;
  font-weight: 700;
  border-radius: 6px;
}
.linkish:hover,
.linkish:focus-visible {
  color: var(--accent);
  background: var(--accent-soft);
  outline: none;
}
html[data-theme="dark"] .linkish,
html[data-theme="dark"] .linkish:hover,
html[data-theme="dark"] .linkish:focus-visible {
  background: var(--accent-soft);
  color: var(--accent);
}
html[data-theme="dark"] .linkish:hover,
html[data-theme="dark"] .linkish:focus-visible {
  background: rgba(45, 212, 191, 0.28);
}
dialog {
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--card);
  color: var(--text);
  width: min(960px, 96vw);
  max-width: 96vw;
  padding: 0;
}
.dialog-head {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
  padding: 0.85rem 1rem;
  border-bottom: 1px solid var(--border);
  margin: 0;
  background: var(--card-tint);
}
.dialog-head h2 {
  margin: 0;
  font-size: 1.05rem;
  line-height: 1.35;
  word-break: break-word;
}
.dialog-body { padding: 1rem; max-height: min(75vh, 800px); overflow: auto; background: var(--card); }
.dialog-meta {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  margin: 0 0 1rem;
  padding: 0.85rem 1rem;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--card-tint);
}
.meta-row {
  display: grid;
  grid-template-columns: 7.5rem minmax(0, 1fr);
  gap: 0.65rem 1rem;
  align-items: start;
}
.meta-row dt {
  margin: 0;
  color: var(--muted);
  font-weight: 700;
  font-size: 0.85rem;
}
.meta-row dd {
  margin: 0;
  word-break: break-word;
  overflow-wrap: anywhere;
  line-height: 1.4;
}
pre {
  white-space: pre-wrap;
  word-break: break-word;
  background: var(--surface);
  border: 1px solid var(--border);
  padding: 0.75rem;
  border-radius: 8px;
  font-size: 0.82rem;
}
.error-block { margin: 0.75rem 0 1rem; }
.retry-cards { display: grid; gap: 0.75rem; margin-top: 0.5rem; }
.retry-card {
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface);
  overflow: hidden;
}
.retry-card > summary {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  cursor: pointer;
  list-style: none;
  padding: 0.75rem 0.85rem;
  background: var(--card-tint);
  font-weight: 700;
  user-select: none;
}
.retry-card > summary::-webkit-details-marker { display: none; }
.retry-card > summary::before {
  content: '▶';
  display: inline-block;
  width: 1rem;
  font-size: 0.7rem;
  color: var(--muted);
}
.retry-card[open] > summary::before { content: '▼'; }
.retry-card-body {
  padding: 0.85rem;
  border-top: 1px solid var(--border);
  display: grid;
  gap: 0.75rem;
}
.retry-card-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  align-items: center;
}
.attachments { list-style: none; padding: 0; margin: 0; display: grid; gap: 0.75rem; }
.attachment-card {
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 0.75rem;
  background: var(--card);
}
.attachment-card h4 { margin: 0 0 0.5rem; font-size: 0.95rem; }
.attachment-card img {
  display: block;
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  border: 1px solid var(--border);
}
.attachment-actions { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.5rem; }
.attachment-actions a {
  color: var(--accent);
  text-decoration: underline;
  font-weight: 600;
}
@media (max-width: 900px) {
  .app { padding: 0.75rem; }
  .toolbar-grid { grid-template-columns: 1fr; }
  table { min-width: 640px; font-size: 0.85rem; }
  .meta-row { grid-template-columns: 1fr; gap: 0.2rem; }
}
@media (max-width: 600px) {
  .topbar { flex-direction: column; }
  .stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .stats .value { font-size: 1.15rem; }
  dialog { width: 100vw; max-width: 100vw; border-radius: 0; }
}
`;

const REPORT_JS = `
(function () {
  const dataNode = document.getElementById('report-data');
  let report;
  try {
    report = JSON.parse(dataNode.textContent || '{}');
  } catch (error) {
    document.body.innerHTML = '<main style="padding:2rem;font-family:sans-serif"><h1>Report data is malformed</h1><p>Embedded JSON could not be parsed.</p></main>';
    return;
  }

  const tests = Array.isArray(report.tests) ? report.tests : [];
  const state = {
    search: '',
    status: '',
    browser: '',
    page: 1,
    pageSize: 50,
    defaultExpanded: true,
    /** @type {Record<string, boolean>} */
    expanded: {}
  };

  const els = {
    generatedAt: document.getElementById('generatedAt'),
    stats: document.getElementById('stats'),
    toolbar: document.getElementById('toolbar'),
    filterBadge: document.getElementById('filterBadge'),
    clearFilters: document.getElementById('clearFilters'),
    search: document.getElementById('search'),
    browserFilter: document.getElementById('browserFilter'),
    statusFilter: document.getElementById('statusFilter'),
    pageSize: document.getElementById('pageSize'),
    resultCount: document.getElementById('resultCount'),
    expandAll: document.getElementById('expandAll'),
    collapseAll: document.getElementById('collapseAll'),
    pageInfo: document.getElementById('pageInfo'),
    prevPage: document.getElementById('prevPage'),
    nextPage: document.getElementById('nextPage'),
    tableHead: document.querySelector('#resultsTable thead'),
    tableBody: document.querySelector('#resultsTable tbody'),
    themeToggle: document.getElementById('themeToggle'),
    detailDialog: document.getElementById('detailDialog'),
    detailTitle: document.getElementById('detailTitle'),
    detailBody: document.getElementById('detailBody')
  };

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatDuration(ms) {
    if (!Number.isFinite(ms) || ms < 0) return 'n/a';
    if (ms < 1000) return Math.round(ms) + 'ms';
    const seconds = ms / 1000;
    if (seconds < 60) {
      const rounded = Math.round(seconds * 10) / 10;
      return String(rounded) + 's';
    }
    const minutes = Math.floor(seconds / 60);
    const rem = Math.round((seconds - minutes * 60) * 10) / 10;
    return minutes + 'm ' + rem + 's';
  }

  function formatStatus(status) {
    const labels = {
      passed: 'Passed',
      failed: 'Failed',
      skipped: 'Skipped',
      flaky: 'Flaky',
      timedOut: 'Timed out',
      interrupted: 'Interrupted'
    };
    return labels[status] || String(status || 'Unknown');
  }

  function formatLocalDateTime(value) {
    if (!value) return 'n/a';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'n/a';
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    if (hours === 0) hours = 12;
    return day + ' ' + month + ' ' + year + ', ' + hours + ':' + minutes + ' ' + ampm;
  }

  function formatTags(tags) {
    if (!Array.isArray(tags) || tags.length === 0) return 'NA';
    return tags;
  }

  function filtersAreActive() {
    return Boolean(state.search.trim() || state.status || state.browser);
  }

  function updateFilterChrome() {
    const active = filtersAreActive();
    els.filterBadge.classList.toggle('hidden', !active);
    els.clearFilters.disabled = !active;
  }

  function compareProjectNames(a, b) {
    if (a === 'setup' && b !== 'setup') return -1;
    if (b === 'setup' && a !== 'setup') return 1;
    return String(a).localeCompare(String(b));
  }

  function collectBrowsers() {
    const fromProjects = Array.isArray(report.projects)
      ? report.projects.map(function (item) { return item && item.project; }).filter(Boolean)
      : [];
    const seen = new Set(fromProjects);
    for (const test of tests) {
      const name = test.project || 'unknown';
      if (!seen.has(name)) {
        seen.add(name);
        fromProjects.push(name);
      }
    }
    // Keep setup at the top of the browser/project hierarchy and filter dropdown.
    return fromProjects.sort(compareProjectNames);
  }

  function initBrowserFilter() {
    const browsers = collectBrowsers();
    els.browserFilter.innerHTML =
      '<option value="">All</option>' +
      browsers.map(function (name) {
        return '<option value="' + escapeHtml(name) + '">' + escapeHtml(name) + '</option>';
      }).join('');
  }

  function isExpanded(key) {
    if (Object.prototype.hasOwnProperty.call(state.expanded, key)) {
      return state.expanded[key];
    }
    return state.defaultExpanded;
  }

  function setExpanded(key, value) {
    state.expanded[key] = value;
  }

  /**
   * Collects every browser and spec tree key for the given hierarchy.
   * @param {{ project: string, files: { file: string, tests: any[] }[] }[]} hierarchy Browser → spec groups.
   * @returns {string[]}
   */
  function collectTreeKeys(hierarchy) {
    const keys = [];
    for (const browserGroup of hierarchy) {
      const browserKey = 'browser:' + browserGroup.project;
      keys.push(browserKey);
      for (const fileGroup of browserGroup.files) {
        keys.push(browserKey + '|spec:' + fileGroup.file);
      }
    }
    return keys;
  }

  function setAllExpanded(expanded) {
    state.defaultExpanded = expanded;
    const keys = collectTreeKeys(buildHierarchy(getFiltered()));
    state.expanded = {};
    for (const key of keys) {
      setExpanded(key, expanded);
    }
    renderTable();
  }

  function summarizeStatuses(rows) {
    const counts = { passed: 0, failed: 0, skipped: 0, flaky: 0, timedOut: 0, interrupted: 0 };
    let duration = 0;
    for (const row of rows) {
      if (counts[row.status] != null) counts[row.status] += 1;
      else counts.failed += 1;
      duration += Number.isFinite(row.duration) ? row.duration : 0;
    }
    return { counts: counts, duration: duration, total: rows.length };
  }

  function renderCountBadges(counts) {
    const parts = [];
    if (counts.passed) parts.push('<span class="badge passed">' + counts.passed + ' passed</span>');
    if (counts.failed) parts.push('<span class="badge failed">' + counts.failed + ' failed</span>');
    if (counts.timedOut) parts.push('<span class="badge timedOut">' + counts.timedOut + ' timed out</span>');
    if (counts.interrupted) parts.push('<span class="badge interrupted">' + counts.interrupted + ' interrupted</span>');
    if (counts.skipped) parts.push('<span class="badge skipped">' + counts.skipped + ' skipped</span>');
    if (counts.flaky) parts.push('<span class="badge flaky">' + counts.flaky + ' flaky</span>');
    return parts.length ? '<span class="group-counts">' + parts.join('') + '</span>' : '';
  }

  function buildHierarchy(filteredTests) {
    const projectOrder = collectBrowsers();
    /** @type {Map<string, Map<string, any[]>>} */
    const byProject = new Map();

    for (const test of filteredTests) {
      const project = test.project || 'unknown';
      const file = test.file || 'unknown';
      if (!byProject.has(project)) byProject.set(project, new Map());
      const byFile = byProject.get(project);
      if (!byFile.has(file)) byFile.set(file, []);
      byFile.get(file).push(test);
    }

    const projects = [];
    for (const name of projectOrder) {
      if (byProject.has(name)) projects.push(name);
    }
    for (const name of byProject.keys()) {
      if (projects.indexOf(name) === -1) projects.push(name);
    }

    return projects.map(function (project) {
      const byFile = byProject.get(project);
      const files = [];
      for (const entry of byFile.entries()) {
        files.push({ file: entry[0], tests: entry[1] });
      }
      return { project: project, files: files };
    });
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('saucedemo-report-theme', theme); } catch (_) {}
    els.themeToggle.textContent = theme === 'dark' ? 'Light theme' : 'Dark theme';
  }

  function initTheme() {
    let theme = 'light';
    try {
      theme = localStorage.getItem('saucedemo-report-theme') || theme;
    } catch (_) {}
    applyTheme(theme === 'dark' ? 'dark' : 'light');
  }

  function renderSummary() {
    const s = report.summary || {};
    const cards = [
      ['Total', s.total || 0, 'stat-total'],
      ['Passed', s.passed || 0, 'stat-passed'],
      ['Failed', s.failed || 0, 'stat-failed'],
      ['Skipped', s.skipped || 0, 'stat-skipped'],
      ['Flaky', s.flaky || 0, 'stat-flaky'],
      ['Pass rate', (s.passRate || 0).toFixed(2) + '%', 'stat-rate'],
      ['Duration', formatDuration(report.duration || 0), 'stat-duration']
    ];
    els.stats.innerHTML = cards.map(function (pair) {
      return '<article class="' + escapeHtml(pair[2]) + '"><div class="label">' + escapeHtml(pair[0]) +
        '</div><div class="value">' + escapeHtml(pair[1]) + '</div></article>';
    }).join('');

    els.generatedAt.textContent =
      'Generated: ' + formatLocalDateTime(report.generatedAt) +
      ' · Run started: ' + formatLocalDateTime(report.startTime);
  }

  function getFiltered() {
    const q = state.search.trim().toLowerCase();
    return tests.filter(function (test) {
      if (state.browser && (test.project || 'unknown') !== state.browser) return false;
      if (state.status && test.status !== state.status) return false;
      if (!q) return true;
      const haystack = [
        test.title,
        test.fullTitle,
        test.file,
        test.project,
        (test.tags || []).join(' '),
        test.errorMessage || ''
      ].join(' ').toLowerCase();
      return haystack.indexOf(q) !== -1;
    });
  }

  function renderToggle(key, expanded) {
    return '<button type="button" class="tree-toggle" data-toggle="' + escapeHtml(key) + '" aria-expanded="' +
      (expanded ? 'true' : 'false') + '" title="' + (expanded ? 'Collapse' : 'Expand') + '">' +
      (expanded ? '▼' : '▶') + '</button>';
  }

  function renderTagsCell(tags) {
    const formatted = formatTags(tags);
    if (formatted === 'NA') return 'NA';
    return formatted.map(function (tag) {
      return '<span class="tag">' + escapeHtml(tag) + '</span>';
    }).join('');
  }

  function renderTable() {
    updateFilterChrome();
    const filtered = getFiltered();
    const pageSize = state.pageSize === 0 ? Math.max(filtered.length, 1) : state.pageSize;
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    if (state.page > totalPages) state.page = totalPages;
    if (state.page < 1) state.page = 1;
    const start = (state.page - 1) * pageSize;
    const pageRows = filtered.slice(start, start + pageSize);
    const hierarchy = buildHierarchy(pageRows);
    /** @type {Map<string, any>} */
    const testById = new Map(pageRows.map(function (test) { return [test.id, test]; }));

    const columns = [
      { key: 'name', label: 'Browser / Spec / Test' },
      { key: 'status', label: 'Status' },
      { key: 'duration', label: 'Duration' },
      { key: 'tags', label: 'Tags' },
      { key: 'retries', label: 'Retries' },
      { key: 'details', label: 'Details' }
    ];

    els.tableHead.innerHTML = '<tr>' + columns.map(function (col) {
      return '<th>' + escapeHtml(col.label) + '</th>';
    }).join('') + '</tr>';

    if (!pageRows.length) {
      els.tableBody.innerHTML = '<tr><td colspan="6">No tests match the current filters.</td></tr>';
    } else {
      const rowsHtml = [];
      for (const browserGroup of hierarchy) {
        const browserKey = 'browser:' + browserGroup.project;
        const browserTests = browserGroup.files.reduce(function (acc, fileGroup) {
          return acc.concat(fileGroup.tests);
        }, []);
        const browserSummary = summarizeStatuses(browserTests);
        const browserExpanded = isExpanded(browserKey);

        rowsHtml.push(
          '<tr class="row-browser">' +
          '<td><span class="tree-label">' + renderToggle(browserKey, browserExpanded) +
          '<span>Browser - ' + escapeHtml(browserGroup.project) + '</span>' +
          '<span class="group-meta">(' + browserSummary.total + ')</span>' +
          renderCountBadges(browserSummary.counts) +
          '</span></td>' +
          '<td></td>' +
          '<td>' + escapeHtml(formatDuration(browserSummary.duration)) + '</td>' +
          '<td></td><td></td><td></td>' +
          '</tr>'
        );

        if (!browserExpanded) continue;

        for (const fileGroup of browserGroup.files) {
          const specKey = browserKey + '|spec:' + fileGroup.file;
          const specSummary = summarizeStatuses(fileGroup.tests);
          const specExpanded = isExpanded(specKey);

          rowsHtml.push(
            '<tr class="row-spec">' +
            '<td class="tree-indent-spec"><span class="tree-label">' + renderToggle(specKey, specExpanded) +
            '<span>' + escapeHtml(fileGroup.file) + '</span>' +
            '<span class="group-meta">(' + specSummary.total + ')</span>' +
            renderCountBadges(specSummary.counts) +
            '</span></td>' +
            '<td></td>' +
            '<td>' + escapeHtml(formatDuration(specSummary.duration)) + '</td>' +
            '<td></td><td></td><td></td>' +
            '</tr>'
          );

          if (!specExpanded) continue;

          for (const test of fileGroup.tests) {
            rowsHtml.push(
              '<tr class="row-test">' +
              '<td class="tree-indent-test">' + escapeHtml(test.title || '') + '</td>' +
              '<td><span class="badge ' + escapeHtml(test.status) + '">' + escapeHtml(formatStatus(test.status)) + '</span></td>' +
              '<td>' + escapeHtml(formatDuration(test.duration)) + '</td>' +
              '<td>' + renderTagsCell(test.tags) + '</td>' +
              '<td>' + escapeHtml(test.retries == null ? 0 : test.retries) + '</td>' +
              '<td><button type="button" class="linkish" data-detail="' + escapeHtml(test.id) + '">View</button></td>' +
              '</tr>'
            );
          }
        }
      }
      els.tableBody.innerHTML = rowsHtml.join('');
    }

    els.resultCount.textContent = filtered.length + ' of ' + tests.length + ' tests';
    els.pageInfo.textContent = 'Page ' + state.page + ' / ' + totalPages;
    els.prevPage.disabled = state.page <= 1;
    els.nextPage.disabled = state.page >= totalPages;

    els.tableBody.querySelectorAll('[data-toggle]').forEach(function (button) {
      button.addEventListener('click', function () {
        const key = button.getAttribute('data-toggle');
        if (!key) return;
        setExpanded(key, !isExpanded(key));
        renderTable();
      });
    });

    els.tableBody.querySelectorAll('[data-detail]').forEach(function (button) {
      button.addEventListener('click', function () {
        const id = button.getAttribute('data-detail');
        const row = testById.get(id) || filtered.find(function (test) { return test.id === id; });
        if (row) openDetails(row);
      });
    });
  }

  function isImageAttachment(item) {
    const type = String(item.contentType || '').toLowerCase();
    const href = String(item.reportPath || '').toLowerCase();
    return type.indexOf('image/') === 0 || /\\.(png|jpe?g|gif|webp|bmp)$/.test(href);
  }

  function isTraceAttachment(item) {
    const name = String(item.name || '').toLowerCase();
    const type = String(item.contentType || '').toLowerCase();
    const href = String(item.reportPath || '').toLowerCase();
    return name.indexOf('trace') >= 0 || type.indexOf('zip') >= 0 || href.endsWith('.zip');
  }

  function renderAttachments(attachments) {
    if (!attachments || !attachments.length) {
      return '<p class="muted">No attachments for this retry.</p>';
    }

    return '<ul class="attachments">' + attachments.map(function (item) {
      const label = escapeHtml(item.name || 'attachment');
      const href = item.reportPath ? escapeHtml(item.reportPath) : '';
      let preview = '';
      let actions = '';

      if (href && isImageAttachment(item)) {
        preview = '<img src="' + href + '" alt="' + label + '" loading="lazy" />';
        actions = '<div class="attachment-actions"><a href="' + href + '" target="_blank" rel="noopener">Open image</a></div>';
      } else if (href && isTraceAttachment(item)) {
        actions =
          '<div class="attachment-actions">' +
          '<a href="' + href + '" download>Download trace</a>' +
          '<a href="https://trace.playwright.dev" target="_blank" rel="noopener">Open Playwright Trace Viewer</a>' +
          '</div>' +
          '<p class="muted">Download the trace zip, then open it in the Trace Viewer.</p>';
      } else if (href) {
        actions = '<div class="attachment-actions"><a href="' + href + '" target="_blank" rel="noopener">Open attachment</a></div>';
      } else {
        actions = '<p class="muted">Attachment unavailable in this report package.</p>';
      }

      return '<li class="attachment-card"><h4>' + label + '</h4>' + preview + actions + '</li>';
    }).join('') + '</ul>';
  }

  /**
   * Renders one expand/collapse card per retry/attempt with that attempt's attachments.
   * Card labels are 1-based (Retry - 1, Retry - 2, …) from the attempt list order.
   * @param {any[]} attempts Normalized attempts for the test.
   * @returns {string}
   */
  function renderRetryAttachmentCards(attempts) {
    if (!attempts || !attempts.length) {
      return '<p class="muted">No retry attempts recorded.</p>';
    }

    return '<div class="retry-cards">' + attempts.map(function (attempt, index) {
      const cardNumber = index + 1;
      const retryIndex = attempt.retry == null ? index : attempt.retry;
      const attachmentCount = (attempt.attachments || []).length;
      const openAttr = index === attempts.length - 1 ? ' open' : '';
      const errorText = formatErrorText(attempt);
      const errorHtml = errorText
        ? '<div class="error-block"><h4>Error</h4><pre>' + escapeHtml(errorText) + '</pre></div>'
        : '';

      return '<details class="retry-card"' + openAttr + '>' +
        '<summary>' +
        '<span>Retry - ' + escapeHtml(cardNumber) + '</span>' +
        '<span class="badge ' + escapeHtml(attempt.status) + '">' + escapeHtml(formatStatus(attempt.status)) + '</span>' +
        '<span class="group-meta">' + escapeHtml(formatDuration(attempt.duration)) +
        ' · attempt #' + escapeHtml(retryIndex) +
        ' · ' + escapeHtml(attachmentCount) + ' attachment' + (attachmentCount === 1 ? '' : 's') +
        '</span>' +
        '</summary>' +
        '<div class="retry-card-body">' +
        errorHtml +
        '<h4>Attachments</h4>' +
        renderAttachments(attempt.attachments || []) +
        '</div>' +
        '</details>';
    }).join('') + '</div>';
  }

  function metaRow(label, valueHtml) {
    return '<div class="meta-row"><dt>' + escapeHtml(label) + '</dt><dd>' + valueHtml + '</dd></div>';
  }

  function formatFileLocation(file, line) {
    const name = file ? String(file) : '';
    if (!name) return 'n/a';
    if (line == null || line === '' || Number(line) <= 0) return name;
    return name + ':' + line;
  }

  function formatErrorText(entry) {
    if (!entry) return '';
    const message = entry.errorMessage || '';
    const stack = entry.errorStack || '';
    const location = entry.errorLocation || '';
    let text = message || stack || '';
    if (!text) return '';
    if (location && text.indexOf(location) === -1) {
      text = text.replace(/\\s+$/, '') + '\\n\\n    at ' + location;
    }
    return text;
  }

  function openDetails(test) {
    els.detailTitle.textContent = test.title || 'Test details';

    const tags = formatTags(test.tags);
    const tagsHtml = tags === 'NA'
      ? 'NA'
      : tags.map(function (tag) {
          return '<span class="tag">' + escapeHtml(tag) + '</span>';
        }).join(' ');

    els.detailBody.innerHTML =
      '<dl class="dialog-meta">' +
      metaRow('Status', '<span class="badge ' + escapeHtml(test.status) + '">' + escapeHtml(formatStatus(test.status)) + '</span>') +
      metaRow('Browser', escapeHtml(test.project || 'unknown')) +
      metaRow('Duration', escapeHtml(formatDuration(test.duration))) +
      metaRow('File', escapeHtml(formatFileLocation(test.file, test.line))) +
      metaRow('Retries', escapeHtml(test.retries == null ? 0 : test.retries)) +
      metaRow('Tags', tagsHtml) +
      '</dl>' +
      '<h3>Retries / attachments</h3>' +
      renderRetryAttachmentCards(test.attempts || []);

    if (typeof els.detailDialog.showModal === 'function') {
      els.detailDialog.showModal();
    } else {
      els.detailDialog.setAttribute('open', 'open');
    }
  }

  function clearFilters() {
    state.search = '';
    state.status = '';
    state.browser = '';
    state.page = 1;
    els.search.value = '';
    els.statusFilter.value = '';
    els.browserFilter.value = '';
    renderTable();
  }

  function bindEvents() {
    els.search.addEventListener('input', function () {
      state.search = els.search.value;
      state.page = 1;
      renderTable();
    });
    els.browserFilter.addEventListener('change', function () {
      state.browser = els.browserFilter.value;
      state.page = 1;
      renderTable();
    });
    els.statusFilter.addEventListener('change', function () {
      state.status = els.statusFilter.value;
      state.page = 1;
      renderTable();
    });
    els.pageSize.addEventListener('change', function () {
      state.pageSize = Number(els.pageSize.value) || 0;
      state.page = 1;
      renderTable();
    });
    els.clearFilters.addEventListener('click', clearFilters);
    els.expandAll.addEventListener('click', function () {
      setAllExpanded(true);
    });
    els.collapseAll.addEventListener('click', function () {
      setAllExpanded(false);
    });
    els.prevPage.addEventListener('click', function () {
      state.page -= 1;
      renderTable();
    });
    els.nextPage.addEventListener('click', function () {
      state.page += 1;
      renderTable();
    });
    els.themeToggle.addEventListener('click', function () {
      const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
      applyTheme(current === 'dark' ? 'light' : 'dark');
    });
  }

  initTheme();
  initBrowserFilter();
  renderSummary();
  bindEvents();
  renderTable();
})();
`;
