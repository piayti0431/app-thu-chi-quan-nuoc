import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { chromium } from "@playwright/test";

const MIME_TYPES = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

const server = http.createServer((req, res) => {
  let reqPath = req.url.split("?")[0];
  if (reqPath === "/") reqPath = "/index.html";
  const filePath = path.join(process.cwd(), "www", reqPath);

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end(`Not found: ${reqPath}`);
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME_TYPES[ext] || "application/octet-stream" });
    fs.createReadStream(filePath).pipe(res);
  });
});

const PORT = 4789;

server.listen(PORT, async () => {
  try {
    let browser;
    try {
      browser = await chromium.launch({ channel: "chrome", headless: true });
    } catch {
      browser = await chromium.launch({ headless: true });
    }

    console.log("=== STARTING MOBILE VERIFICATION AUDIT ===");

    // Test across viewports
    for (const width of [360, 375, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 750 } });
      const page = await context.newPage();
      await page.addInitScript(() => {
        window.__NUOCMIA_TEST_AUTH__ = true;
      });

      await page.goto(`http://127.0.0.1:${PORT}`, { waitUntil: "networkidle" });
      await page.waitForTimeout(300);

      // Check Bottom Nav tabs count on mobile
      const visibleTabs = await page.evaluate(() => {
        const tabs = Array.from(document.querySelectorAll(".tabs .tab")).filter((t) => {
          const s = window.getComputedStyle(t);
          return s.display !== "none" && s.visibility !== "hidden";
        });
        return tabs.map((t) => t.textContent.trim().replace(/\s+/g, " "));
      });

      console.log(`[${width}px] Visible Tabs Count:`, visibleTabs.length, visibleTabs);
      assert.equal(visibleTabs.length, 5, `Expected exactly 5 tabs on mobile (${width}px), got: ${visibleTabs.length}`);

      // Check tab label clippings
      const tabLabels = await page.evaluate(() => {
        const labels = Array.from(document.querySelectorAll(".tabs .tab:not([style*='display: none']) .tab-label"));
        return labels.map((l) => ({
          text: l.textContent.trim(),
          scrollWidth: l.scrollWidth,
          clientWidth: l.clientWidth,
          isClipped: l.scrollWidth > l.clientWidth + 1,
        }));
      });
      const clipped = tabLabels.filter((t) => t.isClipped);
      assert.equal(clipped.length, 0, `Tab labels clipped on ${width}px: ${JSON.stringify(clipped)}`);
      console.log(`[${width}px] Zero tab labels clipped! All fit nicely.`);

      // Check Settings View (Menu & Ingredient Editor Cards)
      // Open settings via More sheet
      await page.click("#moreNavBtn");
      await page.waitForTimeout(200);
      await page.screenshot({ path: `tests/verify_${width}_more_sheet.png` });
      
      // Click Settings in More sheet
      await page.click("#moreNavSheet [data-more-view='settings']");
      await page.waitForTimeout(300);

      const settingsMetrics = await page.evaluate((winW) => {
        const docW = document.documentElement.offsetWidth;
        const scrollW = document.documentElement.scrollWidth;
        const overflows = [];
        document.querySelectorAll("#view-settings *").forEach((el) => {
          if (el.offsetParent === null) return;
          const r = el.getBoundingClientRect();
          if (r.right > winW + 1) {
            overflows.push({
              tag: el.tagName,
              id: el.id || undefined,
              className: typeof el.className === "string" ? el.className.slice(0, 35) : "",
              text: el.textContent?.trim().slice(0, 30),
              width: Math.round(r.width),
              right: Math.round(r.right),
              overflow: Math.round(r.right - winW),
            });
          }
        });
        return { docW, scrollW, overflowCount: overflows.length, overflows };
      }, width);

      if (settingsMetrics.overflowCount > 0) {
        console.log(`[${width}px] Settings Overflows Detail:`, JSON.stringify(settingsMetrics.overflows, null, 2));
      }

      assert.equal(settingsMetrics.overflowCount, 0, `Settings view has overflows on ${width}px: ${JSON.stringify(settingsMetrics)}`);
      console.log(`[${width}px] Settings View has ZERO overflow! Table successfully transformed into cards.`);
      await page.screenshot({ path: `tests/verify_${width}_settings_cards.png` });

      // Check #confirmDialog
      const confirmInfo = await page.evaluate((winW) => {
        const d = document.getElementById("confirmDialog");
        d.showModal();
        const r = d.getBoundingClientRect();
        const qInput = document.getElementById("confirmQuantity");
        const qr = qInput ? qInput.getBoundingClientRect() : null;
        const overflows = [];
        d.querySelectorAll("*").forEach((el) => {
          const cr = el.getBoundingClientRect();
          if (cr.right > winW + 2) {
            overflows.push({ tag: el.tagName, id: el.id, right: cr.right, overflow: cr.right - winW });
          }
        });
        d.close();
        return {
          dialogWidth: r.width,
          dialogRight: r.right,
          quantityInputRight: qr ? qr.right : null,
          overflowCount: overflows.length,
          overflows,
        };
      }, width);

      assert.equal(confirmInfo.overflowCount, 0, `Confirm dialog has overflows on ${width}px: ${JSON.stringify(confirmInfo)}`);
      console.log(`[${width}px] Confirm Dialog has ZERO overflow! Input quantity fits.`);

      // Check #costCalculatorDialog
      const costInfo = await page.evaluate((winW) => {
        const d = document.getElementById("costCalculatorDialog");
        d.showModal();
        const overflows = [];
        d.querySelectorAll("*").forEach((el) => {
          const cr = el.getBoundingClientRect();
          if (cr.right > winW + 2) {
            overflows.push({ tag: el.tagName, id: el.id, right: cr.right, overflow: cr.right - winW });
          }
        });
        d.close();
        return { overflowCount: overflows.length, overflows };
      }, width);

      assert.equal(costInfo.overflowCount, 0, `Cost calculator has overflows on ${width}px: ${JSON.stringify(costInfo)}`);
      console.log(`[${width}px] Cost Calculator Dialog has ZERO overflow!`);

      // Check #voiceSettingsDialog
      const voiceInfo = await page.evaluate((winW) => {
        const d = document.getElementById("voiceSettingsDialog");
        d.showModal();
        const overflows = [];
        d.querySelectorAll("*").forEach((el) => {
          const cr = el.getBoundingClientRect();
          if (cr.right > winW + 2) {
            overflows.push({ tag: el.tagName, id: el.id, right: cr.right, overflow: cr.right - winW });
          }
        });
        d.close();
        return { overflowCount: overflows.length, overflows };
      }, width);

      assert.equal(voiceInfo.overflowCount, 0, `Voice settings has overflows on ${width}px: ${JSON.stringify(voiceInfo)}`);
      console.log(`[${width}px] Voice Settings Dialog has ZERO overflow!`);

      // Check #fastCheckoutDialog
      const fastCheckoutInfo = await page.evaluate((winW) => {
        const d = document.getElementById("fastCheckoutDialog");
        d.showModal();
        const overflows = [];
        d.querySelectorAll("*").forEach((el) => {
          const cr = el.getBoundingClientRect();
          if (cr.right > winW + 2) {
            overflows.push({ tag: el.tagName, id: el.id, right: cr.right, overflow: cr.right - winW });
          }
        });
        d.close();
        return { overflowCount: overflows.length, overflows };
      }, width);

      assert.equal(fastCheckoutInfo.overflowCount, 0, `Fast checkout dialog has overflows on ${width}px: ${JSON.stringify(fastCheckoutInfo)}`);
      console.log(`[${width}px] Fast Checkout Dialog (with MoMo button) has ZERO overflow!`);

      // Check #momoPaymentDialog
      const momoDialogInfo = await page.evaluate((winW) => {
        const d = document.getElementById("momoPaymentDialog");
        d.showModal();
        const overflows = [];
        d.querySelectorAll("*").forEach((el) => {
          const cr = el.getBoundingClientRect();
          if (cr.right > winW + 2) {
            overflows.push({ tag: el.tagName, id: el.id, right: cr.right, overflow: cr.right - winW });
          }
        });
        d.close();
        return { overflowCount: overflows.length, overflows };
      }, width);

      assert.equal(momoDialogInfo.overflowCount, 0, `MoMo payment dialog has overflows on ${width}px: ${JSON.stringify(momoDialogInfo)}`);
      console.log(`[${width}px] MoMo Payment Dialog has ZERO overflow!`);

      await context.close();
    }

    console.log("==================================================");
    console.log("🎉 ALL MOBILE AUDIT VERIFICATIONS PASSED 100%!");
    console.log("==================================================");

    await browser.close();
  } catch (err) {
    console.error("Verification failed:", err);
    process.exit(1);
  } finally {
    server.close();
  }
});
