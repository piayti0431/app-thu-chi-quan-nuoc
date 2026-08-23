import { chromium } from "@playwright/test";

async function launchBrowser() {
  try {
    return await chromium.launch({ channel: "chrome", headless: true });
  } catch {
    return chromium.launch({ headless: true });
  }
}

const browser = await launchBrowser();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.addInitScript(() => {
  window.__NUOCMIA_TEST_AUTH__ = true;
});
const errors = [];

page.on("console", (message) => {
  if (["error", "warning"].includes(message.type())) {
    errors.push(`${message.type()}: ${message.text()}`);
  }
});
page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));

await page.goto("http://127.0.0.1:4173", { waitUntil: "networkidle" });
await page.locator("#quickButtons button").first().click();
await page.waitForTimeout(300);

const income = await page.locator("#todayIncome").innerText();
const transactionCount = await page.locator("#todayList .transaction-item").count();

await browser.close();

console.log(JSON.stringify({ income, transactionCount, errors }, null, 2));

if (errors.length || transactionCount < 1) {
  process.exit(1);
}
