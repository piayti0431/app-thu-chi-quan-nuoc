import assert from "node:assert/strict";
import { phanTich } from "../www/js/parser.js";

const quickItems = [
  { id: "nuoc_mia", category: "Nước mía", price: 10000 },
  { id: "nuoc_mia_1l", category: "Nước mía 1 lít", price: 16000 },
  { id: "nuoc_cam", category: "Nước cam", price: 15000 },
];

const cases = [
  ["5 ly nuoc mia 1 lit", 80000, "Nước mía 1 lít", "bán 5 chai nước mía 1 lít"],
  ["nam ly nuoc mia mot lit", 80000, "Nước mía 1 lít", "bán 5 chai nước mía 1 lít"],
  ["5 ly nuoc mia lit", 80000, "Nước mía 1 lít", "bán 5 chai nước mía 1 lít"],
  ["5 nuoc mia lit", 80000, "Nước mía 1 lít", "bán 5 chai nước mía 1 lít"],
  ["5 chai nuoc mia lit 16k", 80000, "Nước mía 1 lít", "bán 5 chai nước mía 1 lít"],
  ["5 ly nuoc cam", 75000, "Nước cam", "bán 5 ly nước cam"],
  ["nam ly nuoc cam", 75000, "Nước cam", "bán 5 ly nước cam"],
  ["5 nuoc cam", 75000, "Nước cam", "bán 5 ly nước cam"],
  ["5 ly nuoc cam 15k", 75000, "Nước cam", "bán 5 ly nước cam"],
];

for (const [text, soTien, danhMuc, moTaXacNhan] of cases) {
  const actual = phanTich(text, quickItems);
  assert.equal(actual.loai, "thu", text);
  assert.equal(actual.soTien, soTien, text);
  assert.equal(actual.danhMuc, danhMuc, text);
  assert.equal(actual.moTaXacNhan, moTaXacNhan, text);
  console.log(`PASS sensitive mic transcript: ${text} -> ${soTien}`);
}
