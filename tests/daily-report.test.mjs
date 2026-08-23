import assert from "node:assert/strict";
import { dailyReport, formatReportDate, formatReportMoney } from "../www/js/report.js";

assert.equal(formatReportDate("2026-07-15"), "ngày 15 tháng 7 năm 2026");
assert.equal(formatReportMoney(1500000), "1.500.000 đồng");

const report = dailyReport(
  [
    { ngay: "2026-07-15", loai: "thu", soTien: 10000, phuongThuc: "tien_mat" },
    { ngay: "2026-07-15", loai: "thu", soTien: 25000, phuongThuc: "chuyen_khoan" },
    { ngay: "2026-07-15", loai: "chi", soTien: 5000 },
    { ngay: "2026-07-15", loai: "chi", soTien: 9000, deleted: true },
    { ngay: "2026-07-14", loai: "thu", soTien: 999000 },
  ],
  "2026-07-15",
  null,
  500000, // Opening cash float
);

assert.equal(report.income, 35000);
assert.equal(report.cashIncome, 10000);
assert.equal(report.transferIncome, 25000);
assert.equal(report.expense, 5000);
assert.equal(report.cashBalance, 5000); // 10k cash - 5k expense = 5k cash surplus today
assert.equal(report.openingCash, 500000);
assert.equal(report.expectedCashInDrawer, 505000); // 500k float + 5k surplus = 505k total cash in drawer
assert.equal(report.balance, 30000); // 35k total - 5k expense = 30k net

console.log("PASS daily revenue voice report with cash, bank transfer and opening cash float");
