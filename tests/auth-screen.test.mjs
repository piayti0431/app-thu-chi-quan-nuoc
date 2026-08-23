import assert from "node:assert/strict";
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
  localStorage.clear();
});
const errors = [];

page.on("console", (message) => {
  if (["error", "warning"].includes(message.type())) {
    errors.push(`${message.type()}: ${message.text()}`);
  }
});
page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));

await page.goto("http://127.0.0.1:4173", { waitUntil: "networkidle" });

await assert.doesNotReject(() => page.getByRole("heading", { name: /Đăng nhập/ }).waitFor());
await assert.doesNotReject(() => page.getByRole("button", { name: /Đăng nhập/ }).waitFor());
await assert.doesNotReject(() => page.getByRole("button", { name: /Tạo tài khoản/ }).waitFor());

const logoBox = await page.locator(".auth-logo").boundingBox();
const appLocked = await page.locator(".app-shell").evaluate((node) => node.classList.contains("is-auth-locked"));
const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);

await browser.close();

assert.ok(logoBox?.width > 40 && logoBox?.height > 40, "auth logo should be visible");
assert.equal(appLocked, true, "main app should be locked before login");
assert.equal(overflow, false, "auth screen should not overflow horizontally");
assert.deepEqual(errors, []);

console.log("PASS auth screen: login page, logo, locked app, no overflow");
