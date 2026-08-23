import { chromium } from "@playwright/test";

async function launchBrowser() {
  try {
    return await chromium.launch({ channel: "chrome", headless: true });
  } catch {
    return chromium.launch({ headless: true });
  }
}

const browser = await launchBrowser();

for (const shot of [
  { name: "mobile", width: 390, height: 844 },
  { name: "desktop", width: 1280, height: 900 },
]) {
  const page = await browser.newPage({ viewport: { width: shot.width, height: shot.height } });
  await page.addInitScript(() => {
    window.__NUOCMIA_TEST_AUTH__ = true;
  });
  await page.goto("http://127.0.0.1:4173", { waitUntil: "networkidle" });
  await page.screenshot({ path: `tests/${shot.name}-ui.png`, fullPage: true });

  await page.evaluate(() => {
    document.querySelector("input[name='confirmType'][value='thu']").checked = true;
    document.querySelector("#voiceTypeBadge").textContent = "+ Thu";
    document.querySelector("#voiceAmount").textContent = "20.000 đ";
    document.querySelector("#voiceDetail").textContent = "bán 2 ly nước mía";
    document.querySelector("#voiceCategory").textContent = "Bán nước mía";
    document.querySelector("#heardText").textContent = "Nghe được: 2 ly nước mía 10k";
    document.querySelector("#confirmAmount").value = "20000";
    document.querySelector("#confirmNote").value = "2 ly nước mía 10k";
    const category = document.querySelector("#confirmCategory");
    category.innerHTML = `<option selected>Bán nước mía</option>`;
    document.querySelector("#confirmDialog").showModal();
  });
  const dialogBox = await page.locator("#confirmDialog").boundingBox();
  if (!dialogBox || dialogBox.width > shot.width || dialogBox.height > shot.height) {
    throw new Error(`${shot.name} dialog overflows viewport`);
  }
  await page.screenshot({ path: `tests/${shot.name}-dialog.png`, fullPage: true });
  await page.close();
}

await browser.close();
