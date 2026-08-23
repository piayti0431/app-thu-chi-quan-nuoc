import assert from "node:assert/strict";

const store = new Map();
global.window = {
  localStorage: {
    getItem(key) {
      return store.get(key) || null;
    },
    setItem(key, value) {
      store.set(key, value);
    },
  },
};
global.localStorage = global.window.localStorage;

const { docDuLieu, luuDuLieu, xoaTatCaDuLieu } = await import("../www/js/db.js");
const { pendingTransactions, toRemoteTransaction } = await import("../www/js/sync-model.js");

await luuDuLieu({
  sync: {
    supabaseUrl: "https://example.supabase.co",
    supabaseAnon: "anon-key",
    deviceId: "device-a",
    lastPulledAt: "2026-07-15T01:00:00.000Z",
  },
  quickPrices: [10000, 16000, 15000],
  ds: [
    {
      id: 1001,
      ngay: "2026-07-15",
      gio: "08:00",
      loai: "thu",
      soTien: 10000,
      danhMuc: "Ban nuoc mia",
      ghiChu: "",
      cauNoiGoc: "1 ly nuoc mia",
      daSuaTay: false,
      daSync: true,
      deleted: false,
      updatedAt: "2026-07-15T01:00:00.000Z",
    },
    {
      id: 1002,
      ngay: "2026-07-15",
      gio: "08:10",
      loai: "thu",
      soTien: 16000,
      danhMuc: "Nuoc mia 1 lit",
      ghiChu: "",
      cauNoiGoc: "1 ly nuoc mia 1 lit",
      daSuaTay: false,
      daSync: true,
      deleted: false,
      updatedAt: "2026-07-15T01:10:00.000Z",
    },
  ],
});

await xoaTatCaDuLieu();
const data = await docDuLieu();
const pending = pendingTransactions(data.ds);
const remoteDeletes = pending.map((item) => toRemoteTransaction(item, data.sync.deviceId));

assert.equal(data.sync.deviceId, "device-a");
assert.deepEqual(data.quickPrices, [10000, 16000, 15000]);
assert.equal(data.ds.length, 2);
assert.equal(pending.length, 2);
assert.equal(data.ds.every((item) => item.deleted === true), true);
assert.equal(data.ds.every((item) => item.daSync === false), true);
assert.equal(data.ds.every((item) => Date.parse(item.updatedAt) > Date.parse("2026-07-15T01:10:00.000Z")), true);
assert.equal(remoteDeletes.every((row) => row.deleted === true), true);
assert.equal(remoteDeletes.every((row) => row.device_id === "device-a"), true);

console.log("PASS clear-all sync: bulk delete keeps tombstones for Supabase sync");
