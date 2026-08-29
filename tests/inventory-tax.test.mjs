import assert from "node:assert/strict";
import { DEFAULT_DATA, layDanhSachTonKho, kiemTraCanhBaoTonKho, truKhoNguyenLieuTheoDonHang, tinhBaoCaoThue, xuatToKhaiThue01CNKD } from "../www/js/db.js";
import { phanTichTaiChinhNoiBo } from "../www/js/ai-assistant.js";

console.log("Starting inventory-tax.test.mjs...");

// Test 1: Initial Stock listing for branch
{
  const state = JSON.parse(JSON.stringify(DEFAULT_DATA));
  const b1Stock = layDanhSachTonKho(state, "Quán Nhà (Chính)");
  assert.ok(b1Stock.length >= 10);
  const mia = b1Stock.find((i) => i.id === "mia_cay");
  assert.equal(mia.stockQty, 20);
  console.log("PASS 1: layDanhSachTonKho -> initial stock loaded properly");
}

// Test 2: Recipe BOM Inventory Deduction on Sale
{
  const state = JSON.parse(JSON.stringify(DEFAULT_DATA));
  const txSale = {
    loai: "thu",
    danhMuc: "Mía tắc",
    soLuong: 10,
    soTien: 100000,
    chiNhanh: "Quán Nhà (Chính)",
    slots: { productId: "mia_tac" },
  };

  truKhoNguyenLieuTheoDonHang(state, txSale);
  const b1Stock = layDanhSachTonKho(state, "Quán Nhà (Chính)");
  const mia = b1Stock.find((i) => i.id === "mia_cay");
  const tac = b1Stock.find((i) => i.id === "tac_tuoi");
  const ly = b1Stock.find((i) => i.id === "ly_nhua");

  // 10 ly Mía tắc -> deducts 10 ly, 10 * 0.022 mia = 0.22 bó (20 - 0.22 = 19.78), 10 * 0.05 tac = 0.5kg (10 - 0.5 = 9.5)
  assert.equal(ly.stockQty, 990);
  assert.equal(mia.stockQty, 19.78);
  assert.equal(tac.stockQty, 9.5);
  console.log("PASS 2: truKhoNguyenLieuTheoDonHang -> deducted BOM ingredients (mía, tắc, ly nhựa)");
}

// Test 3: Low Stock Warning Detection
{
  const state = JSON.parse(JSON.stringify(DEFAULT_DATA));
  // artificially lower mia_cay stock to 3 (minQty is 5)
  state.inventoryStock["Quán Nhà (Chính)"][0].stockQty = 3;

  const warnings = kiemTraCanhBaoTonKho(state, "Quán Nhà (Chính)");
  assert.equal(warnings.length, 1);
  assert.equal(warnings[0].id, "mia_cay");
  assert.equal(warnings[0].stockQty, 3);
  console.log("PASS 3: kiemTraCanhBaoTonKho -> detected stock under min threshold");
}

// Test 4: Tax Calculation - F&B GTGT 3% + TNCN 1.5% = 4.5%
{
  const mockTransactions = [
    { id: "tx1", loai: "thu", soTien: 10000000, ngay: "2026-08-01", chiNhanh: "Quán Nhà (Chính)" },
    { id: "tx2", loai: "thu", soTien: 20000000, ngay: "2026-08-15", chiNhanh: "Chi nhánh 2" },
    { id: "tx3", loai: "chi", soTien: 5000000, ngay: "2026-08-10", chiNhanh: "Quán Nhà (Chính)" },
  ];

  const taxMonth = tinhBaoCaoThue(mockTransactions, "month", "2026-08", null);
  assert.equal(taxMonth.revenue, 30000000); // 30 triệu
  assert.equal(taxMonth.vatTax, 900000);   // 3% = 900k
  assert.equal(taxMonth.pitTax, 450000);   // 1.5% = 450k
  assert.equal(taxMonth.totalTax, 1350000); // 4.5% = 1.35tr
  assert.equal(taxMonth.transactionCount, 2);

  const formText = xuatToKhaiThue01CNKD(taxMonth, { shopName: "Quán Nước Nhà Mình", owner: "Nguyễn Văn A" });
  assert.ok(formText.includes("Mẫu số: 01/CNKD"));
  assert.ok(formText.includes("1.350.000 đ"));
  console.log("PASS 4: tinhBaoCaoThue & xuatToKhaiThue01CNKD -> accurate 4.5% calculation and Form 01");
}

// Test 5: EV Voice Queries for Inventory & Warnings
{
  const state = JSON.parse(JSON.stringify(DEFAULT_DATA));
  const res1 = phanTichTaiChinhNoiBo("EV kiểm tra kho còn bao nhiêu mía?", state);
  assert.equal(res1.type, "inventory");
  assert.ok(res1.reply.includes("Mía cây tươi"));

  const res2 = phanTichTaiChinhNoiBo("EV báo cáo nguyên liệu sắp hết", state);
  assert.equal(res2.type, "inventory");
  console.log("PASS 5: EV Inventory Voice Commands");
}

// Test 6: EV Voice Queries for Tax & Loa Alert
{
  const state = JSON.parse(JSON.stringify(DEFAULT_DATA));
  state.ds = [
    { id: "tx1", loai: "thu", soTien: 10000000, ngay: "2026-08-01", chiNhanh: "Quán Nhà (Chính)" },
  ];

  const resTax = phanTichTaiChinhNoiBo("EV thuế tháng này hết bao nhiêu?", state);
  assert.equal(resTax.type, "tax");
  assert.ok(resTax.reply.includes("300.000")); // 3% of 10tr = 300k
  assert.ok(resTax.reply.includes("150.000")); // 1.5% of 10tr = 150k
  assert.ok(resTax.reply.includes("450.000")); // total 4.5% = 450k

  const resLoa = phanTichTaiChinhNoiBo("EV bật loa thông báo chuyển khoản", state);
  assert.equal(resLoa.type, "action");
  assert.equal(resLoa.action, "toggle_audio_payment_alert");
  assert.equal(resLoa.enabled, true);

  console.log("PASS 6: EV Tax and Loa AI Alert Commands");
}

console.log("ALL Inventory & Tax tests passed successfully!");
