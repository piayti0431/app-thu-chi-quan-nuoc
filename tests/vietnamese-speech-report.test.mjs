import assert from "node:assert/strict";
import { docSoTiengViet, docSoTienTiengViet, dailyReport } from "../www/js/report.js";
import { chuanHoaLoiNoiTiengViet } from "../www/js/speech.js";

// Test 1: docSoTiengViet & docSoTienTiengViet
assert.equal(docSoTiengViet(0), "không");
assert.equal(docSoTiengViet(8000), "tám nghìn");
assert.equal(docSoTiengViet(51000), "năm mươi mốt nghìn");
assert.equal(docSoTiengViet(65000), "sáu mươi lăm nghìn");
assert.equal(docSoTiengViet(100000), "một trăm nghìn");
assert.equal(docSoTiengViet(505000), "năm trăm lẻ năm nghìn");
assert.equal(docSoTiengViet(582000), "năm trăm tám mươi hai nghìn");
assert.equal(docSoTiengViet(1500000), "một triệu năm trăm nghìn");
assert.equal(docSoTienTiengViet(582000), "năm trăm tám mươi hai nghìn đồng");

// Test 2: chuanHoaLoiNoiTiengViet
const spokenReport = chuanHoaLoiNoiTiengViet("Doanh thu hôm nay 582.000 đ, tiền mặt 525k, CK 57k, tiền chi 116k.");
assert.ok(spokenReport.includes("năm trăm tám mươi hai nghìn đồng"));
assert.ok(spokenReport.includes("chuyển khoản"));
assert.ok(spokenReport.includes("năm mươi bảy nghìn đồng"));
assert.ok(!spokenReport.includes("582.000"));
assert.ok(!spokenReport.includes("CK"));

// Test 3: dailyReport detailedText
const report = dailyReport(
  [
    { ngay: "2026-08-24", loai: "thu", soTien: 525000, phuongThuc: "tien_mat", soLuong: 10 },
    { ngay: "2026-08-24", loai: "thu", soTien: 57000, phuongThuc: "chuyen_khoan", soLuong: 2 },
    { ngay: "2026-08-24", loai: "chi", soTien: 116000 },
  ],
  "2026-08-24",
  null,
  100000,
);

assert.equal(report.income, 582000);
assert.ok(report.text.includes("năm trăm tám mươi hai nghìn đồng"));
assert.ok(report.detailedText.includes("năm trăm lẻ chín nghìn đồng")); // 100k + (525k - 116k) = 509k

console.log("PASS 100% pure Vietnamese speech report normalization!");
