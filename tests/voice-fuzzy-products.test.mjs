import assert from "node:assert/strict";
import { phanTich } from "../www/js/parser.js";

const quickItems = [
  { id: "nuoc_mia", category: "Bán nước mía", price: 10000 },
  { id: "nuoc_mia_1l", category: "Nước mía 1 lít", price: 16000 },
  { id: "nuoc_cam", category: "Nước cam", price: 15000 },
];

const cases = [
  ["nước cam 5 ly", 75000, "Nước cam", "bán 5 ly nước cam"],
  ["cam 5 ly", 75000, "Nước cam", "bán 5 ly nước cam"],
  ["cam tươi 5 ly", 75000, "Nước cam", "bán 5 ly nước cam"],
  ["nước cam hai ly", 30000, "Nước cam", "bán 2 ly nước cam"],
  ["cam tươi hai ly mười lăm", 30000, "Nước cam", "bán 2 ly nước cam"],

  ["nước mía 5 ly", 50000, "Bán nước mía", "bán 5 ly nước mía"],
  ["mía 5 ly", 50000, "Bán nước mía", "bán 5 ly nước mía"],

  ["nước mía một lịch", 16000, "Nước mía 1 lít", "bán 1 ly nước mía 1 lít"],
  ["mía một lịch", 16000, "Nước mía 1 lít", "bán 1 ly nước mía 1 lít"],
  ["5 chai mía một lịch", 80000, "Nước mía 1 lít", "bán 5 ly nước mía 1 lít"],
  ["nước mía 1 lid", 16000, "Nước mía 1 lít", "bán 1 ly nước mía 1 lít"],
  ["5 ly nước mía 1 ít", 80000, "Nước mía 1 lít", "bán 5 ly nước mía 1 lít"],
  ["nước mía một lít 5 chai", 80000, "Nước mía 1 lít", "bán 5 ly nước mía 1 lít"],
];

for (const [text, soTien, danhMuc, moTaXacNhan] of cases) {
  const actual = phanTich(text, quickItems);
  assert.equal(actual.loai, "thu", text);
  assert.equal(actual.soTien, soTien, text);
  assert.equal(actual.danhMuc, danhMuc, text);
  assert.equal(actual.moTaXacNhan, moTaXacNhan, text);
  console.log(`PASS fuzzy product voice: ${text} -> ${soTien}`);
}
