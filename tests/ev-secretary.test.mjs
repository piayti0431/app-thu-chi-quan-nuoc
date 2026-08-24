import assert from "node:assert/strict";
import { phanTichChiTiet, stripWakeWordAndBranch } from "../www/js/parser.js";
import { phanTichTaiChinhNoiBo } from "../www/js/ai-assistant.js";

console.log("Starting ev-secretary.test.mjs...");

// Test 1: Wake word stripping
{
  const t1 = stripWakeWordAndBranch("i vi bán 2 ly nước mía");
  assert.equal(t1.cleanText, "bán 2 ly nước mía");

  const t2 = stripWakeWordAndBranch("ê vi ơi mua 3 bao đá 30k");
  assert.equal(t2.cleanText, "mua 3 bao đá 30k");

  const t3 = stripWakeWordAndBranch("EV chi nhánh 2 bán 1 lít mía 16k");
  assert.equal(t3.branch, "Chi nhánh 2");
  assert.ok(t3.cleanText.includes("bán 1 lít mía 16k"));

  const t4 = stripWakeWordAndBranch("ê-vi Quán Nhà bán 3 ly nước cam");
  assert.equal(t4.branch, "Quán Nhà (Chính)");

  console.log("PASS EV Wake Word & Branch Stripper: i vi, ê vi, EV, e-vi");
}

// Test 2: Voice parsing with EV wake-word
{
  const res1 = phanTichChiTiet("i vi bán 2 ly nước mía 20k");
  assert.equal(res1.loai, "thu");
  assert.equal(res1.soTien, 20000);
  assert.equal(res1.soLuong, 2);
  assert.equal(res1.danhMuc, "Nước mía thường");

  const res2 = phanTichChiTiet("ê vi ơi chi nhánh 2 mua 3 bao đá 30 nghìn");
  assert.equal(res2.loai, "chi");
  assert.equal(res2.soTien, 30000);
  assert.equal(res2.danhMuc, "Mua đá");
  assert.equal(res2.chiNhanh, "Chi nhánh 2");

  console.log("PASS EV Voice Transaction Parsing with Branch Binding");
}

// Test 3: Multi-branch financial report with EV persona
{
  const mockState = {
    currentBranch: "Quán Nhà (Chính)",
    defaultOpeningCash: 500000,
    quickItems: [{ id: "nuoc_mia", name: "Nước mía thường", price: 10000, costPrice: 3000 }],
    ds: [
      {
        id: 1,
        ngay: new Date().toISOString().split("T")[0],
        loai: "thu",
        danhMuc: "Nước mía thường",
        soLuong: 10,
        soTien: 100000,
        giaCostDonVi: 3000,
        tongGiaCost: 30000,
        chiNhanh: "Quán Nhà (Chính)",
        deleted: false,
      },
      {
        id: 2,
        ngay: new Date().toISOString().split("T")[0],
        loai: "thu",
        danhMuc: "Nước mía thường",
        soLuong: 5,
        soTien: 50000,
        giaCostDonVi: 3000,
        tongGiaCost: 15000,
        chiNhanh: "Chi nhánh 2",
        deleted: false,
      },
    ],
  };

  const res = phanTichTaiChinhNoiBo("i vi hôm nay 2 chi nhánh lời bao nhiêu?", mockState);
  assert.equal(res.type, "financial_multi_branch");
  assert.ok(res.reply.includes("Dạ EV"), "Phải có xưng hô Dạ EV");
  assert.ok(res.reply.includes("Quán Nhà (Chính)"), "Phải có báo cáo Quán Nhà");
  assert.ok(res.reply.includes("Chi nhánh 2"), "Phải có báo cáo Chi nhánh 2");
  assert.ok(res.reply.includes("150.000"), "Tổng cộng 2 quán phải bằng 150k");

  console.log("PASS EV Multi-branch 2-branch combined financial report");
}

console.log("ALL EV Secretary tests passed successfully!");
