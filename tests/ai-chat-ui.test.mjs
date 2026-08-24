import assert from "node:assert/strict";
import { chromium } from "@playwright/test";

console.log("Starting ai-chat-ui.test.mjs...");

async function launchBrowser() {
  try {
    return await chromium.launch({ channel: "chrome", headless: true });
  } catch {
    return chromium.launch({ headless: true });
  }
}

const browser = await launchBrowser();
const page = await browser.newPage({ viewport: { width: 412, height: 915 } });

await page.addInitScript(() => {
  window.__NUOCMIA_TEST_AUTH__ = true;
});

await page.goto("http://127.0.0.1:4173", { waitUntil: "networkidle" });

// 1. Click Tab 'Thư Ký EV'
await page.click("button[data-view='ai']");
await page.waitForTimeout(200);

const isAiActive = await page.$eval("#view-ai", (el) => el.classList.contains("is-active"));
assert.ok(isAiActive, "Tab Thư Ký EV phải hiển thị active");

// 2. Type message into input
await page.fill("#aiChatInput", "Hôm nay quán bán được bao nhiêu ly, lời bao nhiêu?");

// 3. Click Send button
await page.click("#aiSendBtn");
await page.waitForTimeout(500);

// Check that URL did NOT get `/?` and view is still active
const currentUrl = page.url();
assert.ok(!currentUrl.endsWith("/?"), `URL không được reload về /?: ${currentUrl}`);

const stillAiActive = await page.$eval("#view-ai", (el) => el.classList.contains("is-active"));
assert.ok(stillAiActive, "Sau khi gửi tin nhắn, giao diện phải giữ nguyên ở tab Thư Ký EV");

// Check that user message and bot response exist
const msgs = await page.$$eval(".ai-msg", (els) => els.map((e) => e.textContent));
assert.ok(msgs.some((m) => m.includes("Hôm nay quán bán được bao nhiêu ly")), "Phải có tin nhắn người dùng");
assert.ok(msgs.some((m) => m.includes("Dạ EV")), "Phải có câu trả lời từ Thư Ký EV");

console.log("PASS: AI Chat Form submission preserves tab and receives EV response without page reload!");

await page.close();
await browser.close();
