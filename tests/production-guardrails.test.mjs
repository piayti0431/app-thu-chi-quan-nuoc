import assert from "node:assert/strict";

const store = new Map();
global.window = {
  Capacitor: null,
  crypto,
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

const { docDuLieu, luuDuLieu, nhapDuLieuTuJson, taoGiaoDich } = await import("../www/js/db.js");

{
  const data = await docDuLieu();
  assert.match(data.sync.deviceId, /^device_/);
}

{
  const transaction = taoGiaoDich({ loai: "thu", soTien: 10000, danhMuc: "Ban nuoc mia" });
  assert.ok(transaction.id > Date.now() * 100);
  assert.equal(transaction.daSync, false);
}

{
  await luuDuLieu({
    ds: [{ id: 1, ngay: "2026-07-15", gio: "08:00", loai: "thu", soTien: 10000, danhMuc: "Ban nuoc mia" }],
  });
  await luuDuLieu({
    ds: [{ id: 2, ngay: "2026-07-15", gio: "09:00", loai: "thu", soTien: 15000, danhMuc: "Nuoc cam" }],
  });
  store.set("nuocmia_v1", "{broken json");
  const recovered = await docDuLieu();
  assert.equal(recovered.ds.length, 1);
  assert.equal(recovered.ds[0].id, 2);
}

{
  await assert.rejects(() => nhapDuLieuTuJson(JSON.stringify({ ds: [{ loai: "thu", soTien: 0 }] })), /khong hop le/);
  await assert.rejects(() => nhapDuLieuTuJson(JSON.stringify({ items: [] })), /dinh dang/);
}

console.log("PASS production guardrails: device id, ids, backup recovery, import validation");
