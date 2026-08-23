import assert from "node:assert/strict";
import { phanTichNhieu } from "../www/js/parser.js";

const quickItems = [
  { id: "nuoc_mia", category: "Bán nước mía", price: 10000, voiceName: "nước mía", voiceUnit: "ly" },
  { id: "nuoc_mia_1l", category: "Nước mía 1 lít", price: 16000, voiceName: "nước mía 1 lít", voiceUnit: "chai" },
  { id: "nuoc_cam", category: "Nước cam", price: 15000, voiceName: "nước cam", voiceUnit: "ly" },
];

const batch = phanTichNhieu("3 lý nước mía, 2 ly nước mía 1 lít, 3 ly nước cam", quickItems);

assert.equal(batch.isBatch, true);
assert.equal(batch.items.length, 3);
assert.deepEqual(
  batch.items.map((item) => [item.slots.productId, item.slots.quantity, item.soTien]),
  [
    ["nuoc_mia", 3, 30000],
    ["nuoc_mia_1l", 2, 32000],
    ["nuoc_cam", 3, 45000],
  ],
);
assert.equal(batch.total, 107000);
assert.match(batch.moTaXacNhan, /3 ly/);
assert.match(batch.moTaXacNhan, /2 chai/);
assert.match(batch.moTaXacNhan, /3 ly/);

const single = phanTichNhieu("2 ly nước cam", quickItems);
assert.equal(single.isBatch, false);
assert.equal(single.items.length, 1);
assert.equal(single.items[0].soTien, 30000);

console.log("PASS voice batch parser: multiple products in one transcript");
