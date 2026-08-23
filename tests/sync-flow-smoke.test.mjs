import assert from "node:assert/strict";

const store = new Map();
global.window = {
  addEventListener() {},
  Capacitor: null,
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

const remoteRows = [
  {
    id: 9002,
    device_id: "phone-b",
    ngay: "2026-07-15",
    gio: "10:20",
    loai: "thu",
    so_tien: 15000,
    danh_muc: "Nước cam",
    ghi_chu: "máy phụ",
    cau_noi_goc: "1 ly nước cam",
    da_sua_tay: false,
    deleted: false,
    updated_at: "2026-07-15T03:20:00.000Z",
  },
];
const upsertedRows = [];

global.window.supabase = {
  createClient() {
    return {
      auth: {
        async getSession() {
          return { data: { session: { user: { id: "user-1" } } } };
        },
        async signInWithPassword() {
          return { error: null };
        },
      },
      from(table) {
        assert.equal(table, "giao_dich");
        return {
          async upsert(rows) {
            upsertedRows.push(...rows);
            return { error: null };
          },
          select() {
            return {
              order() {
                return {
                  async limit() {
                    return { data: remoteRows, error: null };
                  },
                };
              },
            };
          },
        };
      },
    };
  },
};

const { docDuLieu, luuDuLieu } = await import("../www/js/db.js");
const { dongBo } = await import("../www/js/sync.js");

await luuDuLieu({
  sync: {
    supabaseUrl: "https://example.supabase.co",
    supabaseAnon: "anon-key",
  },
  ds: [
    {
      id: 9001,
      ngay: "2026-07-15",
      gio: "10:00",
      loai: "thu",
      soTien: 10000,
      danhMuc: "Bán nước mía",
      ghiChu: "máy nhà",
      cauNoiGoc: "1 ly nước mía",
      daSuaTay: false,
      daSync: false,
      deleted: false,
      updatedAt: "2026-07-15T03:00:00.000Z",
    },
  ],
});

const result = await dongBo();
const data = await docDuLieu();

assert.equal(result.ok, true);
assert.equal(upsertedRows.length, 1);
assert.equal(upsertedRows[0].so_tien, 10000);
assert.equal(data.ds.some((item) => item.id === 9002 && item.soTien === 15000), true);
assert.equal(data.ds.some((item) => item.id === 9001 && item.daSync === true), true);
assert.ok(data.sync.lastPulledAt);

console.log("PASS sync flow smoke: local push + remote pull + local merge");
