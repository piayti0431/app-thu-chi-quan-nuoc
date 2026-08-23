import assert from "node:assert/strict";
import { chromium } from "@playwright/test";

async function launchBrowser() {
  try {
    return await chromium.launch({ channel: "chrome", headless: true });
  } catch {
    return chromium.launch({ headless: true });
  }
}

const d = new Date();
const todayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const seedData = {
  ds: [
    {
      id: 1,
      ngay: todayKey,
      gio: "09:10",
      loai: "thu",
      soTien: 10000,
      danhMuc: "Bán nước mía",
      ghiChu: "Không có ghi chú",
    },
  ],
};

const browser = await launchBrowser();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.addInitScript((data) => {
  window.__NUOCMIA_TEST_AUTH__ = true;
  localStorage.setItem("nuocmia_v1", JSON.stringify(data));
}, seedData);

await page.goto("http://127.0.0.1:4173", { waitUntil: "networkidle" });

const todayText = await page.locator("#todayList").innerText();
assert.match(todayText, /Nước mía/);

await page.locator('[data-view="stats"]').click();
await page.waitForSelector("#view-stats.is-active");

const selectedMonth = await page.locator("#statsMonthSelect option:checked").innerText();
const selectedYear = await page.locator("#statsYearSelect option:checked").innerText();
assert.equal(selectedMonth, `Tháng ${d.getMonth() + 1}`);
assert.equal(selectedYear, `${d.getFullYear()}`);

const visibleText = await page.locator("body").innerText();
const quickAriaLabels = await page.locator(".quick-btn, .quick-button").evaluateAll((buttons) =>
  buttons.map((button) => button.getAttribute("aria-label") || "").join("\n"),
);
const combinedText = `${visibleText}\n${quickAriaLabels}`;

assert.doesNotMatch(combinedText, /Ã|Â|Ä‘|Ä|Æ|áº|á»|â‚|â–|â—|âš|â›|ðŸ/);
assert.doesNotMatch(combinedText, /Khong ghi chu|Chi theo danh muc|Ban nhanh/);
assert.match(quickAriaLabels, /Bán nhanh Nước mía/);

await browser.close();
console.log("PASS Vietnamese UI localization");
