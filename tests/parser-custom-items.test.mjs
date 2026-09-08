import assert from "node:assert/strict";
import { phanTichChiTiet, phanTichNhieu } from "../www/js/parser.js";
import { DEFAULT_DATA } from "../www/js/db.js";

console.log("Starting tests/parser-custom-items.test.mjs...");

// Test 1: Dynamic Custom Menu Items Recognition
{
  const customQuickItems = [
    ...DEFAULT_DATA.quickItems,
    {
      id: "custom_sam_dua",
      name: "Sâm dứa sữa",
      shortName: "Sâm dứa",
      price: 18000,
      costPrice: 8000,
      category: "Sâm dứa sữa",
    },
    {
      id: "custom_tra_dau",
      name: "Trà dâu tây",
      shortName: "Trà dâu",
      price: 22000,
      costPrice: 10000,
      category: "Trà dâu tây",
    },
    {
      id: "custom_cf_muoi",
      name: "Cà phê muối",
      shortName: "Cà phê muối",
      price: 25000,
      costPrice: 9000,
      category: "Cà phê muối",
    },
  ];

  // Voice transcript with custom drinks
  const res1 = phanTichChiTiet("2 ly sâm dứa 36k", { quickItems: customQuickItems });
  assert.equal(res1.loai, "thu");
  assert.equal(res1.soLuong, 2);
  assert.equal(res1.soTien, 36000);
  assert.ok(res1.danhMuc.toLowerCase().includes("sâm dứa") || res1.tenMon?.toLowerCase().includes("sâm dứa"));

  const res2 = phanTichChiTiet("3 ly cà phê muối", { quickItems: customQuickItems });
  assert.equal(res2.loai, "thu");
  assert.equal(res2.soLuong, 3);
  assert.equal(res2.soTien, 75000); // 3 * 25k

  console.log("PASS 1: Dynamic user-created custom drinks successfully recognized with correct pricing");
}

// Test 2: Batch Mixed Thu & Chi Detection
{
  const transcript = "bán 5 ly mía 40k, mua 2 bao đá 30k";
  const batch = phanTichNhieu(transcript, DEFAULT_DATA.quickItems);

  assert.ok(batch.isBatch);
  assert.equal(batch.hasMixed, true, "Should flag mixed thu and chi in batch");
  assert.equal(batch.thuTotal, 40000, "Should aggregate thuTotal accurately");
  assert.equal(batch.chiTotal, 30000, "Should aggregate chiTotal accurately");

  console.log("PASS 2: Mixed thu & chi batch orders detected and segregated accurately");
}

console.log("ALL parser-custom-items tests passed successfully!");
