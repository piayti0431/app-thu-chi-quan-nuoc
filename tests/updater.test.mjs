import assert from "node:assert/strict";

let requestedTable = "";
let installUrl = "";
let installSha256 = "";
const trustedApkUrl =
  "https://rbvpsaotqmddtvcxkyxz.supabase.co/storage/v1/object/public/app-releases/app-thu-chi-quan-nuoc-v1.4-5.apk";
const trustedSha256 = "a".repeat(64);

global.window = {
  open(url) {
    installUrl = url;
  },
  Capacitor: {
    Plugins: {
      AppUpdater: {
        async getVersion() {
          return { versionName: "1.2", versionCode: 3 };
        },
        async installApk({ url, sha256 }) {
          installUrl = url;
          installSha256 = sha256;
          return { path: "/tmp/update.apk" };
        },
      },
    },
  },
  supabase: {
    createClient(url, anon) {
      assert.equal(url, "https://example.supabase.co");
      assert.equal(anon, "anon-key");
      return {
        auth: {
          async getSession() {
            return { data: { session: { user: { id: "user-1" } } }, error: null };
          },
        },
        from(table) {
          requestedTable = table;
          return {
            select() {
              return this;
            },
            eq() {
              return this;
            },
            gt(column, value) {
              assert.equal(column, "version_code");
              assert.equal(value, 3);
              return this;
            },
            order() {
              return this;
            },
            async limit() {
              return {
                data: [
                  {
                    platform: "android",
                    version_code: 5,
                    version_name: "1.4",
                    apk_url: trustedApkUrl,
                    apk_sha256: trustedSha256,
                    release_notes: "Security update",
                    force_update: false,
                  },
                ],
                error: null,
              };
            },
          };
        },
      };
    },
  },
};

const { kiemTraCapNhat, caiCapNhat } = await import("../www/js/updater.js");

const update = await kiemTraCapNhat({
  supabaseUrl: "https://example.supabase.co",
  supabaseAnon: "anon-key",
});

assert.equal(requestedTable, "app_updates");
assert.equal(update.versionCode, 5);
assert.equal(update.versionName, "1.4");
assert.equal(update.apkUrl, trustedApkUrl);
assert.equal(update.apkSha256, trustedSha256);

await caiCapNhat(update);
assert.equal(installUrl, trustedApkUrl);
assert.equal(installSha256, trustedSha256);

await assert.rejects(
  () => caiCapNhat({ apkUrl: "https://cdn.example.com/app.apk", apkSha256: trustedSha256 }),
  /không hợp lệ/i,
);

await assert.rejects(
  () => caiCapNhat({ apkUrl: trustedApkUrl, apkSha256: "not-a-hash" }),
  /không hợp lệ/i,
);

console.log("PASS updater: detects newer version, verifies checksum, and launches installer");
