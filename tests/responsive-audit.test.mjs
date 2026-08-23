import assert from "node:assert/strict";
import { chromium } from "@playwright/test";

async function launchBrowser() {
  try {
    return await chromium.launch({ channel: "chrome", headless: true });
  } catch {
    return chromium.launch({ headless: true });
  }
}

function legacyData() {
  return {
    ds: [
      {
        id: 1,
        ngay: "2026-07-15",
        gio: "09:10",
        loai: "thu",
        soTien: 15000,
        danhMuc: "Nuoc cam",
        ghiChu: "Ban nhanh nuoc cam",
      },
      {
        id: 2,
        ngay: "2026-07-15",
        gio: "09:12",
        loai: "chi",
        soTien: 1500000,
        danhMuc: "Mua mia",
        ghiChu: "Nhap mia dau ngay",
      },
      {
        id: 3,
        ngay: "2026-07-15",
        gio: "09:15",
        loai: "thu",
        soTien: 80000,
        danhMuc: "Nuoc mia 1 lit",
        ghiChu: "5 chai nuoc mia 1 lit",
      },
    ],
    danhMuc: {
      thu: ["Ban nuoc mia", "Nuoc mia 1 lit", "Nuoc cam", "Thu khac"],
      chi: ["Mua mia", "Mua da", "Dien nuoc", "Xang xe", "Chi khac"],
    },
  };
}

async function assertNoViewportOverflow(page, viewport, label) {
  const metrics = await page.evaluate(() => {
    const doc = document.documentElement;
    const body = document.body;
    const selectors = [
      ".app-shell",
      ".topbar",
      ".summary-card",
      ".tabs",
      ".quick-button",
      ".mic-button",
      ".panel",
      ".transaction-item",
      ".entry-form",
      ".category-trigger",
      ".confirm-dialog[open]",
      "#categoryPickerDialog.is-open",
      ".category-picker-sheet",
    ];
    const items = [];
    for (const selector of selectors) {
      document.querySelectorAll(selector).forEach((element) => {
        const rect = element.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) return;
        items.push({
          selector,
          text: element.textContent.replace(/\s+/g, " ").trim().slice(0, 80),
          left: rect.left,
          right: rect.right,
          width: rect.width,
          height: rect.height,
        });
      });
    }
    return {
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
      bodyScrollWidth: body.scrollWidth,
      items,
    };
  });

  assert.ok(
    metrics.scrollWidth <= metrics.clientWidth + 1,
    `${label} has horizontal scroll: ${metrics.scrollWidth} > ${metrics.clientWidth}`,
  );
  assert.ok(
    metrics.bodyScrollWidth <= viewport.width + 1,
    `${label} body overflows horizontally: ${metrics.bodyScrollWidth} > ${viewport.width}`,
  );

  for (const item of metrics.items) {
    assert.ok(item.left >= -1, `${label} ${item.selector} overflows left (${item.left}): ${item.text}`);
    assert.ok(
      item.right <= viewport.width + 1,
      `${label} ${item.selector} overflows right (${item.right} > ${viewport.width}): ${item.text}`,
    );
  }
}

async function openDailyClosingDialog(page) {
  await page.locator("#openDailyClosingBtn").click();
  await page.waitForFunction(() => document.querySelector("#dailyClosingDialog")?.open === true);
}

async function openConfirmDialog(page) {
  await page.evaluate(() => {
    document.querySelector("input[name='confirmType'][value='thu']").checked = true;
    document.querySelector("#voiceTypeBadge").textContent = "+ Thu";
    document.querySelector("#voiceAmount").textContent = "80.000 đ";
    document.querySelector("#voiceDetail").textContent = "bán 5 chai nước mía 1 lít";
    document.querySelector("#voiceCategory").textContent = "Nước mía 1 lít";
    document.querySelector("#heardText").textContent = "Nghe được: 5 ly nước mía 1 lít";
    document.querySelector("#confirmAmount").value = "80000";
    document.querySelector("#confirmNote").value = "5 ly nước mía 1 lít";
    const category = document.querySelector("#confirmCategory");
    category.innerHTML = `<option selected>Nước mía 1 lít</option>`;
    document.querySelector("#confirmDialog").showModal();
  });
}

const browser = await launchBrowser();
const viewports = [
  { width: 320, height: 740, name: "320" },
  { width: 360, height: 800, name: "360" },
  { width: 390, height: 844, name: "390" },
  { width: 768, height: 1024, name: "tablet" },
  { width: 1024, height: 768, name: "laptop" },
  { width: 1440, height: 900, name: "desktop" },
];

for (const viewport of viewports) {
  const page = await browser.newPage({ viewport });
  await page.addInitScript(() => {
    window.__NUOCMIA_TEST_AUTH__ = true;
  });
  const errors = [];
  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type())) errors.push(`${message.type()}: ${message.text()}`);
  });
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  await page.addInitScript((data) => {
    localStorage.setItem("nuocmia_v1", JSON.stringify(data));
  }, legacyData());

  await page.goto("http://127.0.0.1:4173", { waitUntil: "networkidle" });
  await assertNoViewportOverflow(page, viewport, `${viewport.name} main`);

  await openDailyClosingDialog(page);
  await assertNoViewportOverflow(page, viewport, `${viewport.name} daily closing dialog`);
  await page.screenshot({ path: `tests/responsive-${viewport.name}-closing.png`, fullPage: true });
  await page.locator("#closeDailyClosingTopBtn").click();

  await openConfirmDialog(page);
  await assertNoViewportOverflow(page, viewport, `${viewport.name} confirm dialog`);
  await page.screenshot({ path: `tests/responsive-${viewport.name}-confirm.png`, fullPage: true });

  assert.equal(errors.length, 0, `${viewport.name} console errors:\n${errors.join("\n")}`);
  await page.close();
}

await browser.close();
console.log("PASS responsive audit: no horizontal overflow across core views");
