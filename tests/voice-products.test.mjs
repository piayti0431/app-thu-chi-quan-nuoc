import assert from "node:assert/strict";
import { phanTich } from "../www/js/parser.js";

const quickItems = [
  { id: "nuoc_mia", category: "Bán nước mía", price: 10000 },
  { id: "nuoc_mia_1l", category: "Nước mía 1 lít", price: 16000 },
  { id: "nuoc_cam", category: "Nước cam", price: 15000 },
];

const customQuickItems = [
  { id: "nuoc_mia", category: "Bán nước mía", price: 12000 },
  { id: "nuoc_mia_1l", category: "Nước mía 1 lít", price: 18000 },
  { id: "nuoc_cam", category: "Nước cam", price: 17000 },
];

const cases = [
  ["1 ly nước mía", quickItems, 10000, "Bán nước mía", "bán 1 ly nước mía"],
  ["2 ly nước mía", quickItems, 20000, "Bán nước mía", "bán 2 ly nước mía"],
  ["3 ly nước mía", quickItems, 30000, "Bán nước mía", "bán 3 ly nước mía"],
  ["hai ly nước mía", quickItems, 20000, "Bán nước mía", "bán 2 ly nước mía"],
  ["ba ly nước mía", quickItems, 30000, "Bán nước mía", "bán 3 ly nước mía"],
  ["2 nước mía", quickItems, 20000, "Bán nước mía", "bán 2 ly nước mía"],
  ["2 ly nước mía 10k", quickItems, 20000, "Bán nước mía", "bán 2 ly nước mía"],
  ["3 ly nước mía 10 nghìn", quickItems, 30000, "Bán nước mía", "bán 3 ly nước mía"],
  ["3 ly nước mía mỗi ly 10k", quickItems, 30000, "Bán nước mía", "bán 3 ly nước mía"],
  ["3 ly nước mía 30k", quickItems, 30000, "Bán nước mía", "bán 3 ly nước mía"],
  ["3 ly nước mía 25k", quickItems, 25000, "Bán nước mía", "bán 3 ly nước mía"],

  ["1 nước mía 1 lít", quickItems, 16000, "Nước mía 1 lít", "bán 1 ly nước mía 1 lít"],
  ["2 nước mía 1 lít", quickItems, 32000, "Nước mía 1 lít", "bán 2 ly nước mía 1 lít"],
  ["2 chai nước mía 1 lít", quickItems, 32000, "Nước mía 1 lít", "bán 2 ly nước mía 1 lít"],
  ["hai chai nước mía 1 lít", quickItems, 32000, "Nước mía 1 lít", "bán 2 ly nước mía 1 lít"],
  ["2 chai nước mía 1 lít 16k", quickItems, 32000, "Nước mía 1 lít", "bán 2 ly nước mía 1 lít"],
  ["2 chai nước mía 1 lít 32k", quickItems, 32000, "Nước mía 1 lít", "bán 2 ly nước mía 1 lít"],
  ["3 chai nước mía 1 lít 48k", quickItems, 48000, "Nước mía 1 lít", "bán 3 ly nước mía 1 lít"],
  ["3 chai nước mía 1 lít 45k", quickItems, 45000, "Nước mía 1 lít", "bán 3 ly nước mía 1 lít"],

  ["1 ly nước cam", quickItems, 15000, "Nước cam", "bán 1 ly nước cam"],
  ["2 ly nước cam", quickItems, 30000, "Nước cam", "bán 2 ly nước cam"],
  ["3 ly nước cam", quickItems, 45000, "Nước cam", "bán 3 ly nước cam"],
  ["2 nước cam", quickItems, 30000, "Nước cam", "bán 2 ly nước cam"],
  ["hai nước cam", quickItems, 30000, "Nước cam", "bán 2 ly nước cam"],
  ["2 ly nước cam 15k", quickItems, 30000, "Nước cam", "bán 2 ly nước cam"],
  ["3 ly nước cam 15 nghìn", quickItems, 45000, "Nước cam", "bán 3 ly nước cam"],
  ["3 ly nước cam 45k", quickItems, 45000, "Nước cam", "bán 3 ly nước cam"],
  ["3 ly nước cam 40k", quickItems, 40000, "Nước cam", "bán 3 ly nước cam"],

  ["2 ly nước mía", customQuickItems, 24000, "Bán nước mía", "bán 2 ly nước mía"],
  ["2 ly nước mía 12k", customQuickItems, 24000, "Bán nước mía", "bán 2 ly nước mía"],
  ["2 nước mía 1 lít", customQuickItems, 36000, "Nước mía 1 lít", "bán 2 ly nước mía 1 lít"],
  ["2 chai nước mía 1 lít 18k", customQuickItems, 36000, "Nước mía 1 lít", "bán 2 ly nước mía 1 lít"],
  ["2 ly nước cam", customQuickItems, 34000, "Nước cam", "bán 2 ly nước cam"],
  ["2 ly nước cam 17k", customQuickItems, 34000, "Nước cam", "bán 2 ly nước cam"],
];

for (const [text, items, soTien, danhMuc, moTaXacNhan] of cases) {
  const actual = phanTich(text, items);
  assert.equal(actual.loai, "thu", text);
  assert.equal(actual.soTien, soTien, text);
  assert.equal(actual.danhMuc, danhMuc, text);
  assert.equal(actual.moTaXacNhan, moTaXacNhan, text);
  console.log(`PASS ${text} -> ${soTien}`);
}
