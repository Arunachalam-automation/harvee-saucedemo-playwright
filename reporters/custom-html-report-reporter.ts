import type { FullResult, Reporter } from '@playwright/test/reporter';
import path from 'path';
import { pathToFileURL } from 'url';

/**
 * Generates the standalone custom HTML report after Playwright finishes writing
 * the JSON results file. Runs for every invocation path (npm scripts, raw CLI).
 *
 * Generation is deferred to onExit so the JSON reporter has already flushed
 * `build/json-report/results.json`.
 */
class CustomHtmlReportReporter implements Reporter {
  private runCompleted = false;

  /**
   * Declares that this reporter does not own live stdio progress output.
   */
  printsToStdio(): boolean {
    return false;
  }

  /**
   * Marks that the run reached a terminal aggregate result.
   * @param _result Aggregate Playwright run result (unused).
   */
  onEnd(_result: FullResult): void {
    this.runCompleted = true;
  }

  /**
   * Builds the custom HTML report from the latest JSON results after all
   * reporters have finished their onEnd hooks (JSON file is on disk).
   */
  async onExit(): Promise<void> {
    if (!this.runCompleted || process.env.SAUCEDEMO_SKIP_CUSTOM_REPORT === '1') {
      return;
    }

    try {
      const generatorPath = path.resolve(__dirname, '../scripts/report/generate-report.mjs');
      const mod = await import(pathToFileURL(generatorPath).href);
      mod.generateCustomReport({ quiet: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('');
      console.error('Custom HTML report generation failed.');
      console.error(message);
      console.error(
        'Troubleshooting: confirm build/json-report/results.json exists after the run, then retry `npm run report:generate`.'
      );
      console.error('');
    }
  }
}

export default CustomHtmlReportReporter;
