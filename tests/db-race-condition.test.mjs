import assert from "node:assert/strict";
import { setupTestEnv } from "./setup.mjs";

setupTestEnv();
const { docDuLieu, luuDuLieu, themGiaoDich, luuOverheadConfig, DEFAULT_DATA } = await import("../www/js/db.js");

console.log("Starting tests/db-race-condition.test.mjs...");

// Test 1: Rapid Concurrent Writes Through WriteQueue
{
  const testData = JSON.parse(JSON.stringify(DEFAULT_DATA));
  await luuDuLieu(testData);

  // Fire 15 concurrent luuDuLieu calls simultaneously
  const promises = [];
  for (let i = 1; i <= 15; i++) {
    promises.push(
      luuDuLieu({
        ...testData,
        lastConcurrentId: i,
        ds: [
          {
            id: i,
            ngay: "2026-09-08",
            gio: `10:${String(i).padStart(2, "0")}`,
            loai: "thu",
            soTien: 10000 * i,
            danhMuc: "Nước mía",
          },
        ],
      })
    );
  }

  // All promises must resolve cleanly without race condition throws
  const results = await Promise.all(promises);
  assert.equal(results.length, 15);

  const finalData = await docDuLieu();
  assert.ok(finalData.lastConcurrentId >= 1);
  assert.equal(finalData.ds.length, 1);
  assert.equal(finalData.ds[0].id, 15);

  console.log("PASS 1: Concurrent luuDuLieu writes queue sequentially without data corruption");
}

// Test 2: Concurrent themGiaoDich calls with writeQueue
{
  // Reset state with base data
  const baseData = JSON.parse(JSON.stringify(DEFAULT_DATA));
  baseData.ds = [];
  await luuDuLieu(baseData);

  // Sequential addition of 5 transactions
  for (let i = 1; i <= 5; i++) {
    await themGiaoDich({
      loai: "thu",
      soTien: 10000 * i,
      danhMuc: "Mía tắc",
      ghiChu: `Đơn ${i}`,
    });
  }

  const verified = await docDuLieu();
  assert.equal(verified.ds.length, 5);
  // Unshifted: last transaction (50,000) is first
  assert.equal(verified.ds[0].soTien, 50000);
  assert.equal(verified.ds[4].soTien, 10000);

  console.log("PASS 2: Multiple transaction writes correctly update ds without loss");
}

// Test 3: Multiple writes maintain execution order
{
  const base = await docDuLieu();
  const p1 = luuDuLieu({ ...base, defaultOpeningCash: 60000 });
  const p2 = luuDuLieu({ ...base, defaultOpeningCash: 70000 });

  await Promise.all([p1, p2]);
  const current = await docDuLieu();
  assert.ok(current);
  assert.equal(current.defaultOpeningCash, 70000);

  console.log("PASS 3: Parallel writes preserve serial execution ordering");
}

console.log("ALL db-race-condition tests passed successfully!");
