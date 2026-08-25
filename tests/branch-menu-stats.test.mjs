import assert from "node:assert/strict";
import { DEFAULT_DATA, taoGiaoDich, mergeData } from "../www/js/db.js";
import { phanTich, phanTichNhieu, DEFAULT_QUICK_ITEMS } from "../www/js/parser.js";
import { dailyReport } from "../www/js/report.js";

console.log("Starting branch-menu-stats.test.mjs...");

// Test 1: Check DEFAULT_DATA setup with branches, menu & cost price
assert.ok(Array.isArray(DEFAULT_DATA.branches));
assert.equal(DEFAULT_DATA.branches.length >= 2, true);
assert.equal(DEFAULT_DATA.currentBranch, "Quán Nhà (Chính)");

const menuMap = new Map(DEFAULT_DATA.quickItems.map((item) => [item.id, item]));
assert.equal(menuMap.get("nuoc_mia")?.price, 8000);
assert.equal(menuMap.get("nuoc_mia")?.costPrice, 4000);
assert.equal(menuMap.get("nuoc_mia_1l")?.price, 16000);
assert.equal(menuMap.get("nuoc_mia_1l")?.costPrice, 10000);
assert.equal(menuMap.get("mia_tac")?.price, 10000);
assert.equal(menuMap.get("mia_tac")?.costPrice, 5000);
assert.equal(menuMap.get("mia_thom")?.price, 12000);
assert.equal(menuMap.get("mia_thom")?.costPrice, 7000);
assert.equal(menuMap.get("mia_cam")?.price, 17000);
assert.equal(menuMap.get("mia_cam")?.costPrice, 10000);
assert.equal(menuMap.get("rau_ma")?.price, 10000);
assert.equal(menuMap.get("rau_ma")?.costPrice, 4000);
assert.equal(menuMap.get("rau_ma_sua")?.price, 15000);
assert.equal(menuMap.get("rau_ma_sua")?.costPrice, 6000);
assert.equal(menuMap.get("rau_ma_dau_xanh")?.price, 15000);
assert.equal(menuMap.get("rau_ma_dau_xanh")?.costPrice, 6000);
assert.equal(menuMap.get("tra_tac")?.price, 12000);
assert.equal(menuMap.get("tra_tac")?.costPrice, 7000);
assert.equal(menuMap.get("nuoc_cam")?.price, 15000);
assert.equal(menuMap.get("nuoc_cam")?.costPrice, 7000);

// Check ingredient expense categories
assert.ok(DEFAULT_DATA.danhMuc.chi.includes("Mía cây"));
assert.ok(DEFAULT_DATA.danhMuc.chi.includes("Cam tươi"));
assert.ok(DEFAULT_DATA.danhMuc.chi.includes("Rau má tươi"));
assert.ok(DEFAULT_DATA.danhMuc.chi.includes("Sữa đặc"));
assert.ok(DEFAULT_DATA.danhMuc.chi.includes("Đậu xanh"));
assert.ok(DEFAULT_DATA.danhMuc.chi.includes("Tiền đá"));
console.log("PASS DEFAULT_DATA branch, menu pricing & cost prices");

// Test 2: Voice parsing with default menu and cost prices
assert.equal(phanTich("1 ly nước mía").soTien, 8000);
assert.equal(phanTich("1 ly nước mía").giaCostDonVi, 4000);
assert.equal(phanTich("2 ly nước mía").soTien, 16000);
assert.equal(phanTich("2 ly nước mía").tongGiaCost, 8000);
assert.equal(phanTich("3 mía").soTien, 24000);
assert.equal(phanTich("1 mía lít").soTien, 16000);
assert.equal(phanTich("2 mía lít").soTien, 32000);
assert.equal(phanTich("1 mía cam").soTien, 17000);
assert.equal(phanTich("2 mía cam").soTien, 34000);
assert.equal(phanTich("1 ly rau má").soTien, 10000);
assert.equal(phanTich("2 rau má").soTien, 20000);
assert.equal(phanTich("1 rau má sữa").soTien, 15000);
assert.equal(phanTich("2 rau má sữa").soTien, 30000);
assert.equal(phanTich("1 rau má đậu xanh").soTien, 15000);
assert.equal(phanTich("2 má đậu xanh").soTien, 30000);
assert.equal(phanTich("3 má đậu").soTien, 45000);
assert.equal(phanTich("1 ly trà tắc").soTien, 12000);
assert.equal(phanTich("2 trà tắc").soTien, 24000);
assert.equal(phanTich("3 ly tắc").soTien, 36000);
console.log("PASS Voice parsing for all menu items with default prices & costs");

// Test 3: Batch Voice parsing
const batch1 = phanTichNhieu("1 mía lít và 2 trà tắc");
assert.equal(batch1.isBatch, true);
assert.equal(batch1.items.length, 2);
assert.equal(batch1.total, 40000); // 16k + 24k
assert.equal(batch1.items[0].soTien, 16000);
assert.equal(batch1.items[1].soTien, 24000);
assert.equal(batch1.tongGiaCost, 24000); // 10k + 2*7k = 24k

const batch2 = phanTichNhieu("2 mía thường, 1 má đậu xanh và 1 trà tắc");
assert.equal(batch2.isBatch, true);
assert.equal(batch2.total, 43000); // 16k + 15k + 12k
console.log("PASS Multi-item batch voice parsing");

// Test 4: Expense parsing for specific ingredients
assert.equal(phanTich("mua 10kg cam 100k").danhMuc, "Cam tươi");
assert.equal(phanTich("mua 10kg cam 100k").soTien, 100000);
assert.equal(phanTich("mua 2 lon sữa 40k").danhMuc, "Sữa đặc");
assert.equal(phanTich("mua 2 lon sữa 40k").soTien, 40000);
assert.equal(phanTich("mua 1kg đậu xanh 30k").danhMuc, "Đậu xanh");
assert.equal(phanTich("mua 1kg đậu xanh 30k").soTien, 30000);
assert.equal(phanTich("mua đá ba chục").danhMuc, "Mua đá");
assert.equal(phanTich("mua đá ba chục").soTien, 30000);
console.log("PASS Ingredient expense categorization");

// Test 5: Dynamic Menu Customization & Cost
const customMenu = [
  { id: "nuoc_mia", name: "Nước mía thường", category: "Nước mía thường", price: 10000, costPrice: 4000 },
  { id: "tra_tac", name: "Trà tắc", category: "Trà tắc", price: 12000, costPrice: 5000 },
];
assert.equal(phanTich("3 ly nước mía", customMenu).soTien, 30000);
assert.equal(phanTich("3 ly nước mía", customMenu).tongGiaCost, 15000); // 3 ly x 5k vốn = 15k
assert.equal(phanTich("2 trà tắc", customMenu).soTien, 24000);
assert.equal(phanTich("2 trà tắc", customMenu).tongGiaCost, 10000);
console.log("PASS Custom menu dynamic pricing & cost");

// Test 6: Multi-branch transaction generation & snapshot cost
const tx1 = taoGiaoDich({ loai: "thu", soTien: 16000, danhMuc: "Nước mía thường", soLuong: 2, giaCostDonVi: 3000, chiNhanh: "Quán Nhà (Chính)" });
const tx2 = taoGiaoDich({ loai: "thu", soTien: 30000, danhMuc: "Trà tắc", soLuong: 2, giaCostDonVi: 4000, chiNhanh: "Chi nhánh 2" });
const tx3 = taoGiaoDich({ loai: "chi", soTien: 40000, danhMuc: "Tiền đá", chiNhanh: "Chi nhánh 2" });

assert.equal(tx1.chiNhanh, "Quán Nhà (Chính)");
assert.equal(tx1.soLuong, 2);
assert.equal(tx1.giaCostDonVi, 3000);
assert.equal(tx1.tongGiaCost, 6000);
assert.equal(tx2.chiNhanh, "Chi nhánh 2");
assert.equal(tx2.tongGiaCost, 8000);

const merged = mergeData({
  ds: [tx1, tx2, tx3],
  currentBranch: "Chi nhánh 2",
  branches: [
    { id: "main", name: "Quán Nhà (Chính)" },
    { id: "branch_2", name: "Chi nhánh 2" },
    { id: "branch_3", name: "Xe 3 - Chợ" },
  ],
});
assert.equal(merged.branches.length, 3);
assert.equal(merged.currentBranch, "Chi nhánh 2");
assert.equal(merged.ds.length, 3);
console.log("PASS Multi-branch storage and merge with cost");

// Test 7: Daily report calculation with gross profit & net profit
const today = tx1.ngay;
const reportAll = dailyReport([tx1, tx2, tx3], today);
assert.equal(reportAll.income, 46000);
assert.equal(reportAll.cost, 14000);
assert.equal(reportAll.grossProfit, 32000); // 46k - 14k
assert.equal(reportAll.expense, 40000);
assert.equal(reportAll.balance, 6000); // 46k - 40k = 6k net
assert.equal(reportAll.totalDrinks, 4);

const reportBranch2 = dailyReport([tx1, tx2, tx3], today, "Chi nhánh 2");
assert.equal(reportBranch2.income, 30000);
assert.equal(reportBranch2.cost, 8000);
assert.equal(reportBranch2.grossProfit, 22000);
assert.equal(reportBranch2.expense, 40000);
assert.equal(reportBranch2.balance, -10000);
assert.equal(reportBranch2.totalDrinks, 2);
console.log("PASS Daily report with cost, gross profit and branch filtering");

// Test 8: Opening Cash Float and Drawer Reconciliation
const reportWithFloat = dailyReport([tx1, tx2, tx3], today, null, 500000);
assert.equal(reportWithFloat.openingCash, 500000);
assert.equal(reportWithFloat.cashIncome, 46000);
assert.equal(reportWithFloat.expense, 40000);
assert.equal(reportWithFloat.expectedCashInDrawer, 506000); // 500k float + (46k cash - 40k expense)
console.log("PASS Opening cash float and drawer reconcile calculation");

// Test 9: Exact User Real-Life Scenario (582k Revenue, 100k Float, 51k Ice, 65k Kumquat)
const userDate = "2026-08-24";
const userOpeningFloat = 100000;
const userTransactions = [
  taoGiaoDich({ ngay: userDate, loai: "thu", danhMuc: "Nước mía thường", soLuong: 30, soTien: 300000, phuongThuc: "tien_mat" }),
  taoGiaoDich({ ngay: userDate, loai: "thu", danhMuc: "Nước mía 1 lít", soLuong: 10, soTien: 150000, phuongThuc: "tien_mat" }),
  taoGiaoDich({ ngay: userDate, loai: "thu", danhMuc: "Mía cam", soLuong: 5, soTien: 75000, phuongThuc: "tien_mat" }),
  taoGiaoDich({ ngay: userDate, loai: "thu", danhMuc: "Nước cam", soLuong: 3, soTien: 57000, phuongThuc: "tien_mat" }),
  taoGiaoDich({ ngay: userDate, loai: "chi", danhMuc: "Tiền đá", soLuong: 2, donViTinh: "bao", soTien: 51000 }),
  taoGiaoDich({ ngay: userDate, loai: "chi", danhMuc: "Tắc tươi (Quất)", soLuong: 4, donViTinh: "kg", soTien: 65000 }),
];

const userReport = dailyReport(userTransactions, userDate, null, userOpeningFloat);
assert.equal(userReport.income, 582000, "Doanh thu đúng 582k");
assert.equal(userReport.cashIncome, 582000, "Tiền mặt đúng 582k");
assert.equal(userReport.transferIncome, 0, "Chuyển khoản 0");
assert.equal(userReport.expense, 116000, "Tổng chi đúng 116k (51k đá + 65k tắc)");
assert.equal(userReport.balance, 466000, "Tiền lời đúng 466k (582k - 116k)");
assert.equal(userReport.openingCash, 100000, "Tiền thối đầu ngày đúng 100k");
assert.equal(userReport.expectedCashInDrawer, 566000, "Tiền trong két đúng 566k (100k + 582k - 116k)");
console.log("PASS Exact user real-life scenario: 582k rev, 100k float, 116k exp -> 566k in drawer, 466k net profit");

// Test 10: Real-life scenario with bank transfer (57k QR Bank, 525k Cash)
const userTransactionsWithTransfer = [
  taoGiaoDich({ ngay: userDate, loai: "thu", danhMuc: "Nước mía thường", soLuong: 30, soTien: 300000, phuongThuc: "tien_mat" }),
  taoGiaoDich({ ngay: userDate, loai: "thu", danhMuc: "Nước mía 1 lít", soLuong: 10, soTien: 150000, phuongThuc: "tien_mat" }),
  taoGiaoDich({ ngay: userDate, loai: "thu", danhMuc: "Mía cam", soLuong: 5, soTien: 75000, phuongThuc: "tien_mat" }),
  taoGiaoDich({ ngay: userDate, loai: "thu", danhMuc: "Nước cam", soLuong: 3, soTien: 57000, phuongThuc: "chuyen_khoan" }),
  taoGiaoDich({ ngay: userDate, loai: "chi", danhMuc: "Tiền đá", soLuong: 2, donViTinh: "bao", soTien: 51000 }),
  taoGiaoDich({ ngay: userDate, loai: "chi", danhMuc: "Tắc tươi (Quất)", soLuong: 4, donViTinh: "kg", soTien: 65000 }),
];
const userReportWithTransfer = dailyReport(userTransactionsWithTransfer, userDate, null, userOpeningFloat);
assert.equal(userReportWithTransfer.income, 582000);
assert.equal(userReportWithTransfer.cashIncome, 525000);
assert.equal(userReportWithTransfer.transferIncome, 57000);
assert.equal(userReportWithTransfer.expense, 116000);
assert.equal(userReportWithTransfer.balance, 466000);
assert.equal(userReportWithTransfer.expectedCashInDrawer, 509000); // 100k + 525k - 116k = 509k in drawer
console.log("PASS User scenario with QR Transfer: 525k cash + 57k QR -> 509k in drawer, 57k in bank");

console.log("ALL branch, menu, cost & real-life stats tests passed successfully!");
