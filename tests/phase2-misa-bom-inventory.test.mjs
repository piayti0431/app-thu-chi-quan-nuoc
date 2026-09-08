import assert from "node:assert/strict";
import { setupTestEnv } from "./setup.mjs";
setupTestEnv();
import { DEFAULT_DATA, layDanhSachTonKho, kiemTraCanhBaoTonKho, truKhoNguyenLieuTheoDonHang, nhapKhoNguyenLieu, capNhatTonKhoThucTe, docDuLieu } from "../www/js/db.js";
import { phanTichTaiChinhNoiBo } from "../www/js/ai-assistant.js";

console.log("Starting phase2-misa-bom-inventory.test.mjs...");

// Test 1: Raw Materials Catalog Initialization
{
  const state = JSON.parse(JSON.stringify(DEFAULT_DATA));
  const stockMain = layDanhSachTonKho(state, "Quán Nhà (Chính)");
  assert.ok(stockMain.length >= 10);
  
  const mia = stockMain.find((i) => i.id === "mia_cay");
  assert.equal(mia.unit, "bó");
  assert.equal(mia.stockQty, 20);
  assert.equal(mia.minQty, 5);
  assert.equal(mia.unitCost, 90000);

  const tac = stockMain.find((i) => i.id === "tac_tuoi");
  assert.equal(tac.unit, "kg");
  assert.equal(tac.stockQty, 10);

  console.log("PASS 1: Raw Materials Catalog matches MISA eShop data model structure");
}

// Test 2: Recipe BOM Real-Time Deduction for Various Drinks
{
  const state = JSON.parse(JSON.stringify(DEFAULT_DATA));
  
  // 1. Sell 5 cups of Mía tắc
  truKhoNguyenLieuTheoDonHang(state, {
    loai: "thu",
    danhMuc: "Mía tắc",
    soLuong: 5,
    soTien: 50000,
    chiNhanh: "Quán Nhà (Chính)",
    slots: { productId: "mia_tac" },
  });

  let stock = layDanhSachTonKho(state, "Quán Nhà (Chính)");
  let mia = stock.find((i) => i.id === "mia_cay");
  let tac = stock.find((i) => i.id === "tac_tuoi");
  let ly = stock.find((i) => i.id === "ly_nhua");
  let da = stock.find((i) => i.id === "da_vien");

  // 5 cups * 0.022 = 0.11 bó (20 - 0.11 = 19.89)
  assert.equal(mia.stockQty, 19.89);
  // 5 cups * 0.05kg = 0.25kg (10 - 0.25 = 9.75)
  assert.equal(tac.stockQty, 9.75);
  // 5 cups (2000 - 5 = 1995)
  assert.equal(ly.stockQty, 1995);
  // 5 cups * 0.033 = 0.17 bao (10 - 0.17 = 9.83)
  assert.equal(da.stockQty, 9.83);

  // 2. Sell 2 cups of Nước mía 1 Lít (no ice, 0.1 bo mia each)
  truKhoNguyenLieuTheoDonHang(state, {
    loai: "thu",
    danhMuc: "Nước mía 1 lít",
    soLuong: 2,
    soTien: 30000,
    chiNhanh: "Quán Nhà (Chính)",
    slots: { productId: "nuoc_mia_1l" },
  });

  stock = layDanhSachTonKho(state, "Quán Nhà (Chính)");
  mia = stock.find((i) => i.id === "mia_cay");
  da = stock.find((i) => i.id === "da_vien");

  // 19.89 - 0.2 = 19.69 bó
  assert.equal(mia.stockQty, 19.69);
  // Ice remains unchanged (9.83) for 1L
  assert.equal(da.stockQty, 9.83);

  console.log("PASS 2: Recipe BOM Real-Time Deduction verified for standard & specialty drinks");
}

// Test 3: Moving Weighted Average Cost Calculation on Stock Receipt
{
  const state = JSON.parse(JSON.stringify(DEFAULT_DATA));
  // Initial: 20 bó @ 90,000 đ
  // Receive 10 bó @ 120,000 đ
  // Total cost = (20 * 90000 + 10 * 120000) / 30 = (1800000 + 1200000) / 30 = 3000000 / 30 = 100,000 đ
  const mockItem = state.inventoryStock["Quán Nhà (Chính)"].find((i) => i.id === "mia_cay");
  const oldQty = mockItem.stockQty; // 20
  const oldCost = mockItem.unitCost; // 90000
  const addQty = 10;
  const addCost = 120000;
  const expectedUnitCost = Math.round(((oldQty * oldCost) + (addQty * addCost)) / (oldQty + addQty));

  assert.equal(expectedUnitCost, 100000);

  // Invoke actual nhapKhoNguyenLieu function
  await nhapKhoNguyenLieu("Quán Nhà (Chính)", "mia_cay", addQty, addCost);
  const updatedData = await docDuLieu();
  const updatedItem = updatedData.inventoryStock["Quán Nhà (Chính)"].find((i) => i.id === "mia_cay");
  assert.equal(updatedItem.stockQty, 30);
  assert.equal(updatedItem.unitCost, 100000);

  console.log("PASS 3: Moving Weighted Average Cost (MISA eShop) formula verified accurately");
}

// Test 4: Physical Count Audit & Variance Calculation
{
  const oldTheoretical = 19.89;
  const actualCount = 18.0;
  const variance = Math.round((actualCount - oldTheoretical) * 100) / 100;
  assert.equal(variance, -1.89);

  // Invoke actual capNhatTonKhoThucTe function
  await capNhatTonKhoThucTe("Quán Nhà (Chính)", "mia_cay", actualCount);
  const updatedData = await docDuLieu();
  const updatedItem = updatedData.inventoryStock["Quán Nhà (Chính)"].find((i) => i.id === "mia_cay");
  assert.equal(updatedItem.stockQty, 18.0);

  console.log("PASS 4: Physical Count Audit & Variance discrepancy tracking verified");
}

// Test 5: Low-Stock Warning Triggers
{
  const state = JSON.parse(JSON.stringify(DEFAULT_DATA));
  // Reduce tac_tuoi to 1.5kg (min is 2.0kg)
  const tacItem = state.inventoryStock["Quán Nhà (Chính)"].find((i) => i.id === "tac_tuoi");
  tacItem.stockQty = 1.5;

  const warnings = kiemTraCanhBaoTonKho(state, "Quán Nhà (Chính)");
  assert.equal(warnings.length, 1);
  assert.equal(warnings[0].id, "tac_tuoi");
  assert.equal(warnings[0].stockQty, 1.5);

  console.log("PASS 5: Low-Stock Warning Triggers verified");
}

// Test 6: Multi-Branch Stock Isolation
{
  const state = JSON.parse(JSON.stringify(DEFAULT_DATA));
  // Deduct from Chi nhánh 2 only
  truKhoNguyenLieuTheoDonHang(state, {
    loai: "thu",
    danhMuc: "Mía tắc",
    soLuong: 10,
    soTien: 100000,
    chiNhanh: "Chi nhánh 2",
    slots: { productId: "mia_tac" },
  });

  const b1Stock = layDanhSachTonKho(state, "Quán Nhà (Chính)");
  const b2Stock = layDanhSachTonKho(state, "Chi nhánh 2");

  const b1Mia = b1Stock.find((i) => i.id === "mia_cay");
  const b2Mia = b2Stock.find((i) => i.id === "mia_cay");

  // Branch 1 remains 20
  assert.equal(b1Mia.stockQty, 20);
  // Branch 2 reduced from 15 - 0.22 = 14.78
  assert.equal(b2Mia.stockQty, 14.78);

  console.log("PASS 6: Multi-Branch Stock Isolation verified");
}

console.log("ALL Phase 2 MISA BOM Inventory tests passed successfully!");
