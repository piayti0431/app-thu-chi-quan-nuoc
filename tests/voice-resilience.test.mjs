import assert from "node:assert/strict";
import { phanTichChiTiet } from "../www/js/parser.js";

const quickItems = [
  { id: "nuoc_mia", category: "Bán nước mía", price: 10000, voiceName: "nước mía", voiceUnit: "ly" },
  { id: "nuoc_mia_1l", category: "Nước mía 1 lít", price: 16000, voiceName: "nước mía 1 lít", voiceUnit: "ly" },
  { id: "nuoc_cam", category: "Nước cam", price: 15000, voiceName: "nước cam", voiceUnit: "ly" },
];

const cases = [
  ["5 ly nước mía 1 lít", "nuoc_mia_1l", 5, 80000, "auto"],
  ["năm chai nước mía một lid", "nuoc_mia_1l", 5, 80000, "auto"],
  ["5 chai mia mot lich 16k", "nuoc_mia_1l", 5, 80000, "unit"],
  ["nước cam 5 ly tổng bảy mươi lăm ngàn", "nuoc_cam", 5, 75000, "total"],
  ["nướt cam hai ly 15k", "nuoc_cam", 2, 30000, "unit"],
  ["cam tươi 3 ly", "nuoc_cam", 3, 45000, "auto"],
  ["1 ly nước mía 10 ngàn", "nuoc_mia", 1, 10000, "total"],
  ["2 ly nước mía mười nghìn", "nuoc_mia", 2, 20000, "unit"],
];

for (const [text, productId, quantity, amount, priceMode] of cases) {
  const actual = phanTichChiTiet(text, quickItems);
  assert.equal(actual.loai, "thu", text);
  assert.equal(actual.slots.productId, productId, text);
  assert.equal(actual.slots.quantity, quantity, text);
  assert.equal(actual.soTien, amount, text);
  assert.equal(actual.slots.priceMode, priceMode, text);
  assert.notEqual(actual.confidence, "low", text);
  console.log(`PASS voice resilience: ${text} -> ${amount}`);
}

const expenses = [
  ["chi mua đá cây ba bao 30 nghìn", "Mua đá", 30000],
  ["mua ống hút 25 ngàn", "Ly/ống hút/túi", 25000],
  ["tiền điện nước một triệu rưỡi", "Điện nước", 1500000],
  ["đổ xăng 50k", "Xăng xe", 50000],
];

for (const [text, category, amount] of expenses) {
  const actual = phanTichChiTiet(text, quickItems);
  assert.equal(actual.loai, "chi", text);
  assert.equal(actual.danhMuc, category, text);
  assert.equal(actual.soTien, amount, text);
  assert.notEqual(actual.confidence, "low", text);
  console.log(`PASS expense resilience: ${text} -> ${amount}`);
}
