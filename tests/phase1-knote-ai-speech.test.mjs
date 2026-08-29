import assert from "node:assert/strict";
import { phanTichChiTiet, detectDrinkModifiers } from "../www/js/parser.js";
import { phanTichTaiChinhNoiBo } from "../www/js/ai-assistant.js";
import { DEFAULT_DATA } from "../www/js/db.js";
import { phatTiengChuongTingTing } from "../www/js/speech.js";

console.log("Starting phase1-knote-ai-speech.test.mjs...");

// Test 1: Chime sound function availability & safety in non-DOM environment
{
  assert.equal(typeof phatTiengChuongTingTing, "function");
  // Should run without throwing errors even when window is undefined in node
  assert.doesNotThrow(() => phatTiengChuongTingTing());
  console.log("PASS 1: phatTiengChuongTingTing -> function exists and safe in node/browser");
}

// Test 2: Modifier detection standalone unit test
{
  const mod1 = detectDrinkModifiers("3 mia tac it duong");
  assert.deepEqual(mod1, ["Ít đường"]);

  const mod2 = detectDrinkModifiers("2 ly mia khong da mang ve");
  assert.deepEqual(mod2, ["Không đá", "Mang về"]);

  const mod3 = detectDrinkModifiers("1 tra tac it duong nhieu da uong tai quan");
  assert.deepEqual(mod3, ["Ít đường", "Nhiều đá", "Uống tại quán"]);

  const mod4 = detectDrinkModifiers("1 ly mia lon nhieu duong da rieng");
  assert.deepEqual(mod4, ["Nhiều đường", "Đá riêng", "Ly lớn"]);

  console.log("PASS 2: detectDrinkModifiers -> accurately extracted sugar, ice, mode, and size notes");
}

// Test 3: Full parsing with drink modifiers attached to order
{
  const res1 = phanTichChiTiet("3 mía tắc ít đường 30k");
  assert.equal(res1.loai, "thu");
  assert.equal(res1.danhMuc, "Mía tắc");
  assert.equal(res1.soLuong, 3);
  assert.equal(res1.soTien, 30000);
  assert.deepEqual(res1.modifiers, ["Ít đường"]);
  assert.ok(res1.moTaXacNhan.includes("Ít đường"));

  const res2 = phanTichChiTiet("2 ly mía không đá mang về");
  assert.equal(res2.loai, "thu");
  assert.equal(res2.danhMuc, "Nước mía thường");
  assert.equal(res2.soLuong, 2);
  assert.equal(res2.soTien, 16000);
  assert.deepEqual(res2.modifiers, ["Không đá", "Mang về"]);
  assert.ok(res2.ghiChu.includes("Không đá, Mang về"));

  console.log("PASS 3: phanTichChiTiet -> seamlessly bound modifiers into transaction note & confirmation");
}

// Test 4: EV Period Comparison: Today vs Yesterday
{
  const state = JSON.parse(JSON.stringify(DEFAULT_DATA));
  const now = new Date();
  const todayKey = now.toISOString().slice(0, 10);
  const yestDt = new Date(now);
  yestDt.setDate(yestDt.getDate() - 1);
  const yestKey = yestDt.toISOString().slice(0, 10);

  state.ds = [
    { id: "tx1", loai: "thu", soTien: 300000, soLuong: 30, ngay: todayKey, chiNhanh: "Quán Nhà (Chính)" },
    { id: "tx2", loai: "thu", soTien: 200000, soLuong: 20, ngay: yestKey, chiNhanh: "Quán Nhà (Chính)" },
  ];

  const resComp1 = phanTichTaiChinhNoiBo("EV so sánh hôm nay với hôm qua", state);
  assert.equal(resComp1.type, "financial_report");
  assert.ok(resComp1.reply.includes("300.000"));
  assert.ok(resComp1.reply.includes("200.000"));
  assert.ok(resComp1.reply.includes("TĂNG TRƯỞNG"));

  const resComp2 = phanTichTaiChinhNoiBo("EV hôm nay bán chạy hơn hôm qua không?", state);
  assert.equal(resComp2.type, "financial_report");
  assert.ok(resComp2.reply.includes("TĂNG TRƯỞNG"));

  console.log("PASS 4: EV Period Comparison -> today vs yesterday financial metrics analyzed");
}

console.log("ALL Phase 1 tests passed successfully!");
