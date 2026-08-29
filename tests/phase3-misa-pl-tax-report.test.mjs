import assert from "node:assert/strict";
import { DEFAULT_DATA, tinhBaoCaoThue, xuatToKhaiThue01CNKD, tinhBaoCaoPL } from "../www/js/db.js";
import { phanTichTaiChinhNoiBo } from "../www/js/ai-assistant.js";

console.log("Starting phase3-misa-pl-tax-report.test.mjs...");

// Test 1: MISA 01/CNKD Tax Report Calculation (3% VAT + 1.5% PIT = 4.5%)
{
  const state = JSON.parse(JSON.stringify(DEFAULT_DATA));
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  state.ds = [
    { id: "tx1", loai: "thu", soTien: 10000000, soLuong: 1000, ngay: `${currentMonth}-01`, chiNhanh: "Quán Nhà (Chính)", tongGiaCost: 4000000, phuongThuc: "tien_mat" },
    { id: "tx2", loai: "thu", soTien: 5000000, soLuong: 500, ngay: `${currentMonth}-02`, chiNhanh: "Chi nhánh 2", tongGiaCost: 2000000, phuongThuc: "chuyen_khoan" },
    { id: "tx3", loai: "chi", soTien: 2000000, ngay: `${currentMonth}-03`, chiNhanh: "Quán Nhà (Chính)", danhMuc: "Tiền điện nước", phuongThuc: "tien_mat" },
  ];

  const taxAll = tinhBaoCaoThue(state.ds, "month", currentMonth, "all");
  assert.equal(taxAll.revenue, 15000000); // 15 triệu
  assert.equal(taxAll.vatTax, 450000);   // 3% = 450k
  assert.equal(taxAll.pitTax, 225000);   // 1.5% = 225k
  assert.equal(taxAll.totalTax, 675000); // 4.5% = 675k
  assert.equal(taxAll.transactionCount, 2);

  const formText = xuatToKhaiThue01CNKD(taxAll, { shopName: "Quán Nước Mía 24/7", owner: "Chủ Quán" });
  assert.ok(formText.includes("Mẫu số: 01/CNKD"));
  assert.ok(formText.includes("Thông tư số 40/2021/TT-BTC"));
  assert.ok(formText.includes("675.000 đ"));

  console.log("PASS 1: MISA Form 01/CNKD Tax calculations & official template verified");
}

// Test 2: MISA Profit & Loss (P&L) Statement Generator
{
  const state = JSON.parse(JSON.stringify(DEFAULT_DATA));
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  state.ds = [
    { id: "t1", loai: "thu", soTien: 10000000, soLuong: 1000, ngay: `${currentMonth}-05`, chiNhanh: "Quán Nhà (Chính)", tongGiaCost: 4000000, phuongThuc: "tien_mat" },
    { id: "t2", loai: "chi", soTien: 3000000, ngay: `${currentMonth}-06`, chiNhanh: "Quán Nhà (Chính)", danhMuc: "Mặt bằng", phuongThuc: "tien_mat" },
  ];

  const pl = tinhBaoCaoPL(state.ds, "month", currentMonth, "Quán Nhà (Chính)");
  assert.equal(pl.revenue, 10000000); // 10 triệu
  assert.equal(pl.cogs, 4000000);     // Giá vốn BOM 4 triệu
  assert.equal(pl.grossProfit, 6000000); // Lãi gộp 6 triệu
  assert.equal(pl.grossMarginPct, 60);   // 60%
  assert.equal(pl.operatingExpenses, 3000000); // OPEX 3 triệu
  assert.equal(pl.ebit, 3000000);        // EBIT 3 triệu
  assert.equal(pl.totalTax, 450000);     // Thuế 4.5% = 450k
  assert.equal(pl.netProfit, 2550000);   // Lợi nhuận ròng 2.55 triệu
  assert.equal(pl.netMarginPct, 25.5);   // 25.5%

  // Cash Flow
  assert.equal(pl.cashFlow.cashIn, 10000000);
  assert.equal(pl.cashFlow.cashOut, 3000000);
  assert.equal(pl.cashFlow.netCashFlow, 7000000);

  console.log("PASS 2: MISA P&L Statement and Cash Flow breakdown verified accurately");
}

// Test 3: EV Voice Assistant P&L and Tax Commands
{
  const state = JSON.parse(JSON.stringify(DEFAULT_DATA));
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  state.ds = [
    { id: "t1", loai: "thu", soTien: 20000000, soLuong: 2000, ngay: `${currentMonth}-10`, chiNhanh: "Quán Nhà (Chính)", tongGiaCost: 8000000, phuongThuc: "tien_mat" },
    { id: "t2", loai: "chi", soTien: 4000000, ngay: `${currentMonth}-11`, chiNhanh: "Quán Nhà (Chính)", danhMuc: "Điện nước", phuongThuc: "chuyen_khoan" },
  ];

  const resPL = phanTichTaiChinhNoiBo("EV báo cáo lãi lỗ P&L tháng này", state);
  assert.equal(resPL.type, "financial_report");
  assert.ok(resPL.reply.includes("20.000.000"));
  assert.ok(resPL.reply.includes("LỢI NHUẬN RÒNG"));

  const resTax = phanTichTaiChinhNoiBo("EV tính thuế tháng này", state);
  assert.equal(resTax.type, "tax");
  assert.ok(resTax.reply.includes("900.000")); // 4.5% of 20M = 900k

  const resExport = phanTichTaiChinhNoiBo("EV xuất mẫu tờ khai 01/CNKD", state);
  assert.equal(resExport.type, "tax");
  assert.equal(resExport.action, "export_tax_form");
  assert.ok(resExport.formText.includes("01/CNKD"));

  console.log("PASS 3: EV Voice Assistant P&L, Tax & Form 01/CNKD commands verified");
}

console.log("ALL Phase 3 MISA P&L & Tax Report tests passed successfully!");
