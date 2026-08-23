import assert from "node:assert/strict";
import { chromium } from "@playwright/test";

async function launchBrowser() {
  try {
    return await chromium.launch({ channel: "chrome", headless: true });
  } catch {
    return chromium.launch({ headless: true });
  }
}

async function newPage(browser, mode) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.addInitScript(() => {
    window.__NUOCMIA_TEST_AUTH__ = true;
  });
  const errors = [];
  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type())) errors.push(`${message.type()}: ${message.text()}`);
  });
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  await page.addInitScript((speechMode) => {
    window.__micStarts = 0;
    window.__micStops = 0;
    window.__micOptions = [];
    window.SpeechRecognition = class MockSpeechRecognition {
      constructor() {
        this.lang = "";
        this.interimResults = false;
        this.continuous = false;
      }

      start() {
        window.__micStarts += 1;
        window.__micOptions.push({
          lang: this.lang,
          interimResults: this.interimResults,
          continuous: this.continuous,
        });
        if (speechMode !== "result") return;
        setTimeout(() => {
          const result = [{ transcript: "5 ly nuoc mia 1 lit" }];
          result.isFinal = true;
          this.onresult?.({ results: [result] });
        }, 60);
      }

      stop() {
        window.__micStops += 1;
        setTimeout(() => this.onend?.(), 0);
      }
    };
  }, mode);
  return { page, errors };
}

const browser = await launchBrowser();

{
  const { page, errors } = await newPage(browser, "silent");
  await page.goto("http://127.0.0.1:4173", { waitUntil: "networkidle" });

  for (let index = 0; index < 4; index += 1) {
    await page.locator("#micBtn").click();
    await page.waitForTimeout(25);
    await page.locator("#micBtn").click();
    await page.waitForTimeout(80);
  }

  assert.equal(await page.locator("#confirmDialog").evaluate((dialog) => dialog.open), false);
  assert.match(await page.locator("#micText").innerText(), /Bấm|Báº¥m|noi|nói/i);
  assert.equal(errors.length, 0, errors.join("\n"));
  console.log("PASS mic rapid on/off without transcript");
  await page.close();
}

{
  const { page, errors } = await newPage(browser, "result");
  await page.goto("http://127.0.0.1:4173", { waitUntil: "networkidle" });

  for (let index = 0; index < 3; index += 1) {
    await page.locator("#micBtn").click();
    await page.waitForTimeout(160);
    assert.equal(await page.locator("#confirmDialog").evaluate((dialog) => dialog.open), true);
    assert.equal(await page.locator("#confirmAmount").inputValue(), "80000");
    assert.match(await page.locator("#voiceDetail").innerText(), /5.*chai.*1/i);
    await page.locator('#confirmDialog button[value="cancel"]').click();
    await page.waitForFunction(() => !document.querySelector("#confirmDialog").open);
    await page.waitForTimeout(60);
  }

  const counters = await page.evaluate(() => ({ starts: window.__micStarts, stops: window.__micStops }));
  assert.equal(counters.starts, 3);
  assert.ok(counters.stops >= 3);
  const options = await page.evaluate(() => window.__micOptions);
  assert.ok(options.every((item) => item.lang === "vi-VN" && item.interimResults === true && item.continuous === true));
  assert.equal(errors.length, 0, errors.join("\n"));
  console.log("PASS mic repeated recognition popup flow");
  await page.close();
}

await browser.close();
