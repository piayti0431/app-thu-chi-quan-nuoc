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

for (const viewport of [
  { width: 320, height: 740, name: "narrow" },
  { width: 390, height: 844, name: "mobile" },
]) {
  const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
  await page.addInitScript(() => {
    window.__NUOCMIA_TEST_AUTH__ = true;
  });
  const errors = [];

  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type())) errors.push(`${message.type()}: ${message.text()}`);
  });
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));

  await page.addInitScript(() => {
    localStorage.setItem(
      "nuocmia_v1",
      JSON.stringify({
        danhMuc: {
          thu: ["Ban nuoc mia", "Nuoc mia 1 lit", "Nuoc cam", "Thu khac"],
          chi: ["Mua mia", "Mua da", "Dien nuoc", "Xang xe", "Chi khac"],
        },
      }),
    );
  });

  await page.goto("http://127.0.0.1:4173", { waitUntil: "networkidle" });
  await page.locator('[data-category-trigger="manualCategory"]').click();

  const choices = await page.locator("#categoryPickerList .category-choice").evaluateAll((nodes) =>
    nodes.map((node) => node.textContent.replace(/\s+/g, " ").trim()),
  );
  const box = await page.locator("#categoryPickerDialog").boundingBox();
  const sheetBox = await page.locator(".category-picker-sheet").boundingBox();

  assert.equal(await page.locator("#categoryPickerDialog").evaluate((dialog) => dialog.open), true);
  assert.ok(box, `${viewport.name} picker must render`);
  assert.ok(sheetBox, `${viewport.name} picker sheet must render`);
  assert.ok(box.x >= -0.5, `${viewport.name} picker overflows left: ${box.x}`);
  assert.ok(box.x + box.width <= viewport.width + 0.5, `${viewport.name} picker overflows right`);
  assert.ok(sheetBox.x >= -0.5, `${viewport.name} picker sheet overflows left: ${sheetBox.x}`);
  assert.ok(sheetBox.x + sheetBox.width <= viewport.width + 0.5, `${viewport.name} picker sheet overflows right`);
  assert.ok(sheetBox.width >= viewport.width - 1, `${viewport.name} picker sheet is not full width`);
  assert.equal(choices.filter((text) => text.includes("Bán nước mía")).length, 1);
  assert.equal(choices.some((text) => text.includes("Ban nuoc mia")), false);
  assert.equal(choices.some((text) => text.includes("Nước cam")), true);

  await page.locator("#categoryPickerList").getByRole("option", { name: /Nước cam/ }).click();
  assert.equal(await page.locator("#manualCategory").inputValue(), "Nước cam");
  assert.match(await page.locator('[data-category-trigger="manualCategory"]').innerText(), /Nước cam/);
  assert.equal(errors.length, 0, errors.join("\n"));

  await page.screenshot({ path: `tests/category-picker-${viewport.name}.png`, fullPage: true });
  await page.close();
}

await browser.close();

console.log("PASS category picker stays inside viewport and dedupes legacy labels");
