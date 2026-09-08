// Sổ Quán Nước Mía - Unified Test Runner
// Runs all 32 unit and integration test suites sequentially and reports consolidated results.

import { spawn } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const TEST_SUITES = [
  "branch-menu-stats.test.mjs",
  "daily-report.test.mjs",
  "vietnamese-speech-report.test.mjs",
  "parser.test.mjs",
  "voice-products.test.mjs",
  "voice-sensitive.test.mjs",
  "voice-fuzzy-products.test.mjs",
  "voice-semantic-parser.test.mjs",
  "voice-batch.test.mjs",
  "voice-resilience.test.mjs",
  "voice-expenses.test.mjs",
  "speech.test.mjs",
  "speech-stress.test.mjs",
  "sync-model.test.mjs",
  "clear-all-sync.test.mjs",
  "auth-remember.test.mjs",
  "production-guardrails.test.mjs",
  "realtime-sync.test.mjs",
  "updater.test.mjs",
  "ai-assistant.test.mjs",
  "ev-secretary.test.mjs",
  "inventory-tax.test.mjs",
  "phase1-knote-ai-speech.test.mjs",
  "phase2-misa-bom-inventory.test.mjs",
  "comprehensive-audit-bom-misa.test.mjs",
  "phase3-misa-pl-tax-report.test.mjs",
  "test-inventory-workflow.test.mjs",
  "db-backup-restore.test.mjs",
  "db-race-condition.test.mjs",
  "xss-sanitize.test.mjs",
  "inventory-unitcost.test.mjs",
  "parser-custom-items.test.mjs",
];

async function runSuite(suiteFile) {
  const filePath = resolve(__dirname, suiteFile);
  const start = Date.now();
  return new Promise((res) => {
    const proc = spawn(process.execPath, [filePath], {
      stdio: "inherit",
      cwd: resolve(__dirname, ".."),
    });

    proc.on("close", (code) => {
      const elapsed = Date.now() - start;
      res({
        file: suiteFile,
        passed: code === 0,
        code,
        elapsed,
      });
    });
  });
}

async function main() {
  console.log(`\n🧪 Executing ${TEST_SUITES.length} test suites...\n`);
  const startTime = Date.now();
  let passedCount = 0;
  const failedSuites = [];

  for (let i = 0; i < TEST_SUITES.length; i++) {
    const suite = TEST_SUITES[i];
    const result = await runSuite(suite);
    if (result.passed) {
      passedCount++;
    } else {
      failedSuites.push(result);
      console.error(`\n❌ FAILED suite: ${suite} (exit code ${result.code})\n`);
      process.exit(1);
    }
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log("\n=======================================================");
  console.log(`🎉 ALL ${passedCount}/${TEST_SUITES.length} TEST SUITES PASSED! (${totalTime}s)`);
  console.log("=======================================================\n");
  process.exit(0);
}

main().catch((err) => {
  console.error("Test runner encountered an error:", err);
  process.exit(1);
});
