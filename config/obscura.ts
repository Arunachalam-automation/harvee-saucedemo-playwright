/**
 * Helpers for the opt-in Obscura CDP project (`--project=obscura`).
 * Obscura is never part of the default multi-browser `npm test` matrix.
 */

/** Default local CDP WebSocket when `OBSCURA_CDP_URL` is unset or blank. */
export const DEFAULT_OBSCURA_CDP_URL = 'ws://127.0.0.1:9222';

/**
 * Returns true when CLI args request the Playwright project named `obscura`.
 * @param argv Process arguments to inspect (defaults to `process.argv`).
 */
export function isObscuraProjectRequested(argv: string[] = process.argv): boolean {
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--project=obscura' || arg === '-p=obscura') {
      return true;
    }
    if ((arg === '--project' || arg === '-p') && argv[i + 1] === 'obscura') {
      return true;
    }
  }
  return false;
}

/**
 * Returns true when this process should register / drive the Obscura project.
 * Honors `RUN_OBSCURA=1` (set by config or the report orchestrator) and CLI `--project=obscura`.
 * @param argv Process arguments to inspect (defaults to `process.argv`).
 */
export function isObscuraRunEnabled(argv: string[] = process.argv): boolean {
  if (process.env.RUN_OBSCURA === '1') {
    return true;
  }
  return isObscuraProjectRequested(argv);
}

/**
 * Marks the current process (and child workers) as an Obscura-only run.
 * Call from `playwright.config.ts` when Obscura is requested so workers inherit the flag.
 */
export function enableObscuraRun(): void {
  process.env.RUN_OBSCURA = '1';
}

/**
 * Resolves the Obscura CDP endpoint URL.
 * Prefers `OBSCURA_CDP_URL` when set; otherwise the local default.
 */
export function resolveObscuraCdpUrl(): string {
  const fromEnv = process.env.OBSCURA_CDP_URL?.trim();
  return fromEnv || DEFAULT_OBSCURA_CDP_URL;
}

/**
 * Builds optional CDP HTTP headers for non-loopback Obscura auth.
 * Uses `OBSCURA_CDP_TOKEN` as `Authorization: Bearer <token>` when present.
 */
export function resolveObscuraCdpHeaders(): Record<string, string> | undefined {
  const token = process.env.OBSCURA_CDP_TOKEN?.trim();
  if (!token) {
    return undefined;
  }
  return { Authorization: `Bearer ${token}` };
}
