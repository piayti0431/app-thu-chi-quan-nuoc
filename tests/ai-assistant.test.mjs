import assert from "node:assert/strict";
import { phanTichTaiChinhNoiBo } from "../www/js/ai-assistant.js";

const mockState = {
  defaultOpeningCash: 500000,
  quickItems: [
    { id: "item_1", name: "Nước mía thường", price: 10000, costPrice: 3000 },
    { id: "item_2", name: "Nước cam", price: 15000, costPrice: 6000 },
  ],
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
      phuongThuc: "tien_mat",
      deleted: false,
    },
    {
      id: 2,
      ngay: new Date().toISOString().split("T")[0],
      loai: "thu",
      danhMuc: "Nước cam",
      soLuong: 4,
      soTien: 60000,
      giaCostDonVi: 6000,
      tongGiaCost: 24000,
      phuongThuc: "chuyen_khoan",
      deleted: false,
    },
    {
      id: 3,
      ngay: new Date().toISOString().split("T")[0],
      loai: "chi",
      danhMuc: "Mua đá",
      soLuong: 1,
      soTien: 30000,
      deleted: false,
    },
  ],
};

console.log("Starting ai-assistant.test.mjs...");

// Test 1: Hôm nay bán được bao nhiêu, lời bao nhiêu
{
  const res = phanTichTaiChinhNoiBo("Hôm nay bán được bao nhiêu ly, lời bao nhiêu?", mockState);
  assert.equal(res.type, "financial");
  assert.ok(res.reply.includes("160.000"), "Phải chứa tổng doanh thu 160k");
  assert.ok(res.reply.includes("14 ly"), "Phải chứa tổng 14 ly nước");
  assert.ok(res.reply.includes("130.000"), "Phải chứa tiền lời thực tế 130k (160k - 30k)");
  console.log("PASS AI Financial Analysis: Today revenue & profit calculation");
}

// Test 2: Món bán chạy nhất
{
  const res = phanTichTaiChinhNoiBo("Món nào bán chạy nhất hôm nay?", mockState);
  assert.equal(res.type, "menu");
  assert.ok(res.reply.includes("Nước mía thường"), "Món số 1 phải là Nước mía thường (10 ly)");
  assert.ok(res.reply.includes("10 ly"), "Phải có 10 ly nước mía");
  console.log("PASS AI Menu Analysis: Best selling items ranking");
}

// Test 3: Chi phí mua đá & nguyên liệu
{
  const res = phanTichTaiChinhNoiBo("Tổng tiền mua đá và nguyên liệu hôm nay?", mockState);
  assert.equal(res.type, "expense");
  assert.ok(res.reply.includes("30.000"), "Phải chứa tiền chi mua đá 30k");
  console.log("PASS AI Expense Analysis: Ingredient expenses breakdown");
}

// Test 4: Kiểm tra két tiền mặt
{
  const res = phanTichTaiChinhNoiBo("Kiểm tra tiền két hôm nay cần có bao nhiêu?", mockState);
  assert.equal(res.type, "drawer");
  // 500k opening + 100k cash - 30k exp = 570k
  assert.ok(res.reply.includes("570.000"), "Két tiền mặt phải bằng 570k (500k float + 100k cash - 30k exp)");
  console.log("PASS AI Drawer Reconcile: Cash drawer expected calculation");
}

// Test 5: Lệnh ghi nhanh giao dịch
{
  const res = phanTichTaiChinhNoiBo("Ghi chi 50k tiền đá", mockState);
  assert.equal(res.type, "command");
  assert.equal(res.action, "add_transaction");
  console.log("PASS AI Command: Natural language transaction recording");
}

// Test 6: Tư vấn chiến lược quán
{
  const res = phanTichTaiChinhNoiBo("Tư vấn chiến lược kinh doanh cho quán", mockState);
  assert.equal(res.type, "advice");
  assert.ok(res.reply.includes("Chiến lược"), "Phải có gợi ý chiến lược F&B");
  console.log("PASS AI Business Advice: Strategy and operations consulting");
}

console.log("ALL AI Assistant tests passed successfully!");
