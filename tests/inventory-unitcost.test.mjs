import assert from "node:assert/strict";
import { setupTestEnv } from "./setup.mjs";

setupTestEnv();
const { docDuLieu, luuDuLieu, nhapKhoNguyenLieu, mergeData, DEFAULT_DATA } = await import("../www/js/db.js");

console.log("Starting tests/inventory-unitcost.test.mjs...");

// Test 1: Subtracting inventory does not recalculate unitCost or make it negative (Bug 1)
{
  const data = JSON.parse(JSON.stringify(DEFAULT_DATA));
  // Set initial stock: 20 bó @ 80,000 đ
  data.inventoryStock["Quán Nhà (Chính)"] = [
    { id: "mia_cay", name: "Mía cây", unit: "bó", stockQty: 20, unitCost: 80000 },
  ];
  await luuDuLieu(data);

  // Subtract 5 bundles (addQty = -5)
  await nhapKhoNguyenLieu("Quán Nhà (Chính)", "mia_cay", -5, 0);

  const afterSubtract = await docDuLieu();
  const item = afterSubtract.inventoryStock["Quán Nhà (Chính)"].find((x) => x.id === "mia_cay");
  assert.equal(item.stockQty, 15);
  assert.equal(item.unitCost, 80000, "unitCost should remain unchanged when deducting stock");
  assert.ok(item.unitCost > 0, "unitCost must not become negative");

  console.log("PASS 1: Deducting inventory preserves unitCost without turning negative");
}

// Test 2: Adding inventory with zero cost does not zero out unitCost
{
  // If receiving stock transfer without cost specified (costPrice = 0)
  await nhapKhoNguyenLieu("Quán Nhà (Chính)", "mia_cay", 5, 0);

  const afterZeroCostAdd = await docDuLieu();
  const item = afterZeroCostAdd.inventoryStock["Quán Nhà (Chính)"].find((x) => x.id === "mia_cay");
  assert.equal(item.stockQty, 20);
  assert.equal(item.unitCost, 80000, "unitCost should be preserved if addCost is 0");

  console.log("PASS 2: Zero-cost stock additions preserve existing unit cost");
}

// Test 3: Moving weighted average cost calculation on new stock purchase
{
  // Current: 20 bó @ 80,000 đ. Restock 10 bó @ 110,000 đ
  // Expected: (20 * 80000 + 10 * 110000) / 30 = (1600000 + 1100000) / 30 = 2700000 / 30 = 90,000 đ
  await nhapKhoNguyenLieu("Quán Nhà (Chính)", "mia_cay", 10, 110000);

  const afterPurchase = await docDuLieu();
  const item = afterPurchase.inventoryStock["Quán Nhà (Chính)"].find((x) => x.id === "mia_cay");
  assert.equal(item.stockQty, 30);
  assert.equal(item.unitCost, 90000);

  console.log("PASS 3: Moving weighted average cost correctly calculated");
}

// Test 4: mergeData sanitizes corrupt/negative unitCost
{
  const corruptData = {
    inventoryStock: {
      "Quán Nhà (Chính)": [
        { id: "mia_cay", name: "Mía cây", unit: "bó", stockQty: 10, unitCost: -50000 },
        { id: "da_vien", name: "Đá viên", unit: "bao", stockQty: 5, unitCost: NaN },
      ],
    },
  };

  const sanitized = mergeData(corruptData);
  const mia = sanitized.inventoryStock["Quán Nhà (Chính)"].find((x) => x.id === "mia_cay");
  const da = sanitized.inventoryStock["Quán Nhà (Chính)"].find((x) => x.id === "da_vien");

  assert.equal(mia.unitCost, 0, "Negative unitCost must be sanitized to 0");
  assert.equal(da.unitCost, 0, "NaN unitCost must be sanitized to 0");

  console.log("PASS 4: mergeData sanitizes corrupt or negative unit costs to 0");
}

console.log("ALL inventory-unitcost tests passed successfully!");
