import assert from "node:assert/strict";
import { phanTich, phanTichChiTiet } from "../www/js/parser.js";

const quickItems = [
  { id: "nuoc_mia", category: "Bán nước mía", price: 10000, voiceName: "nước mía", voiceUnit: "ly" },
  { id: "nuoc_mia_1l", category: "Nước mía 1 lít", price: 16000, voiceName: "nước mía 1 lít", voiceUnit: "chai" },
  { id: "nuoc_cam", category: "Nước cam", price: 15000, voiceName: "nước cam", voiceUnit: "ly" },
];

const incomeCases = [
  {
    text: "lấy cho khách 5 ly nước cam",
    soTien: 75000,
    productId: "nuoc_cam",
    quantity: 5,
    unit: "ly",
    priceMode: "auto",
    confidence: "high",
  },
  {
    text: "nước cam 5 ly tổng bảy mươi lăm nghìn",
    soTien: 75000,
    productId: "nuoc_cam",
    quantity: 5,
    unit: "ly",
    priceMode: "total",
    confidence: "high",
  },
  {
    text: "hai ly cam tươi mỗi ly 15",
    soTien: 30000,
    productId: "nuoc_cam",
    quantity: 2,
    unit: "ly",
    priceMode: "unit",
    confidence: "high",
  },
  {
    text: "năm chai mía một lịch",
    soTien: 80000,
    productId: "nuoc_mia_1l",
    quantity: 5,
    unit: "chai",
    priceMode: "auto",
    confidence: "high",
  },
  {
    text: "nước mía 1 lít năm chai tổng tám chục",
    soTien: 80000,
    productId: "nuoc_mia_1l",
    quantity: 5,
    unit: "chai",
    priceMode: "total",
    confidence: "high",
  },
  {
    text: "3 ly nước mía giá 25k",
    soTien: 25000,
    productId: "nuoc_mia",
    quantity: 3,
    unit: "ly",
    priceMode: "total",
    confidence: "medium",
  },
  {
    text: "bán nước",
    soTien: 0,
    productId: null,
    quantity: 1,
    unit: "",
    priceMode: "missing",
    confidence: "low",
  },
];

for (const item of incomeCases) {
  const actual = phanTichChiTiet(item.text, quickItems);
  assert.equal(actual.loai, "thu", item.text);
  assert.equal(actual.soTien, item.soTien, item.text);
  assert.equal(actual.slots.productId, item.productId, item.text);
  assert.equal(actual.slots.quantity, item.quantity, item.text);
  assert.equal(actual.slots.unit, item.unit, item.text);
  assert.equal(actual.slots.priceMode, item.priceMode, item.text);
  assert.equal(actual.confidence, item.confidence, item.text);
  assert.ok(Array.isArray(actual.tokens), item.text);
  assert.ok(actual.tokens.length > 0, item.text);
  assert.ok(Array.isArray(actual.alternatives), item.text);
  console.log(`PASS semantic thu: ${item.text} -> ${item.soTien}`);
}

const expenseCases = [
  {
    text: "mua đá 3 bao hết 30k",
    soTien: 30000,
    danhMuc: "Mua đá",
    confidence: "high",
  },
  {
    text: "trả tiền điện nước một triệu rưỡi",
    soTien: 1500000,
    danhMuc: "Điện nước",
    confidence: "high",
  },
  {
    text: "mua đồ linh tinh",
    soTien: 0,
    danhMuc: "Chi khác",
    confidence: "low",
  },
];

for (const item of expenseCases) {
  const actual = phanTichChiTiet(item.text, quickItems);
  assert.equal(actual.loai, "chi", item.text);
  assert.equal(actual.soTien, item.soTien, item.text);
  assert.equal(actual.danhMuc, item.danhMuc, item.text);
  assert.equal(actual.confidence, item.confidence, item.text);
  console.log(`PASS semantic chi: ${item.text} -> ${item.soTien}`);
}

const legacyShape = phanTich("2 ly nước cam", quickItems);
assert.equal(legacyShape.soTien, 30000);
assert.equal(legacyShape.danhMuc, "Nước cam");
assert.equal(legacyShape.slots.productId, "nuoc_cam");
