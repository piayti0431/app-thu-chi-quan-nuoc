import assert from "node:assert/strict";
import { chayTest, phanTich } from "../www/js/parser.js";

const results = chayTest();
for (const result of results) {
  const status = result.pass ? "PASS" : "FAIL";
  console.log(`${status} ${result.text}`);
  if (!result.pass) {
    console.log("  expected:", result.expected);
    console.log("  actual:", result.actual);
  }
}

if (results.some((result) => !result.pass)) {
  process.exit(1);
}

const customQuickItems = [
  { id: "nuoc_mia", category: "Bán nước mía", price: 12000 },
  { id: "nuoc_mia_1l", category: "Nước mía 1 lít", price: 18000 },
  { id: "nuoc_cam", category: "Nước cam", price: 17000 },
];

assert.equal(phanTich("2 ly nước mía", customQuickItems).soTien, 24000);
assert.equal(phanTich("2 ly nước mía 12k", customQuickItems).soTien, 24000);
assert.equal(phanTich("2 ly nước mía 20k", customQuickItems).soTien, 20000);
assert.equal(phanTich("2 ly nước cam", customQuickItems).soTien, 34000);
console.log("PASS custom quick price voice math");
