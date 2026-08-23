const FALLBACK_VERSION = { versionName: "1.4", versionCode: 5 };
const TRUSTED_APK_HOST = "rbvpsaotqmddtvcxkyxz.supabase.co";
const TRUSTED_APK_PATH_PREFIX = "/storage/v1/object/public/app-releases/";
const SHA256_PATTERN = /^[a-f0-9]{64}$/i;

function nativeUpdater() {
  return window.Capacitor?.Plugins?.AppUpdater || null;
}

export function laUrlApkTinCay(url) {
  try {
    const parsed = new URL(String(url || ""));
    return (
      parsed.protocol === "https:" &&
      parsed.hostname === TRUSTED_APK_HOST &&
      parsed.pathname.startsWith(TRUSTED_APK_PATH_PREFIX) &&
      parsed.pathname.endsWith(".apk")
    );
  } catch {
    return false;
  }
}

export function laSha256HopLe(value) {
  return SHA256_PATTERN.test(String(value || ""));
}

export async function layPhienBanHienTai() {
  const plugin = nativeUpdater();
  if (!plugin?.getVersion) return FALLBACK_VERSION;
  const version = await plugin.getVersion();
  return {
    versionName: String(version?.versionName || FALLBACK_VERSION.versionName),
    versionCode: Number(version?.versionCode || FALLBACK_VERSION.versionCode),
  };
}

export async function kiemTraCapNhat(syncConfig = {}) {
  if (!syncConfig.supabaseUrl || !syncConfig.supabaseAnon || !window.supabase?.createClient) return null;

  const current = await layPhienBanHienTai();
  const client = window.supabase.createClient(syncConfig.supabaseUrl, syncConfig.supabaseAnon);
  const sessionResult = await client.auth?.getSession?.();
  if (!sessionResult?.data?.session) return null;

  const { data, error } = await client
    .from("app_updates")
    .select("version_code, version_name, apk_url, apk_sha256, release_notes, force_update")
    .eq("platform", "android")
    .eq("enabled", true)
    .gt("version_code", current.versionCode)
    .order("version_code", { ascending: false })
    .limit(1);

  if (error) throw error;
  const update = data?.[0];
  if (!update) return null;
  if (!laUrlApkTinCay(update.apk_url)) throw new Error("Đường dẫn bản cập nhật không hợp lệ");
  if (!laSha256HopLe(update.apk_sha256)) throw new Error("Mã kiểm tra bản cập nhật không hợp lệ");

  return {
    versionCode: Number(update.version_code),
    versionName: String(update.version_name || ""),
    apkUrl: String(update.apk_url || ""),
    apkSha256: String(update.apk_sha256 || "").toLowerCase(),
    releaseNotes: String(update.release_notes || ""),
    forceUpdate: Boolean(update.force_update),
    currentVersion: current,
  };
}

export async function caiCapNhat(update) {
  if (!update?.apkUrl) throw new Error("Thiếu đường dẫn APK cập nhật");
  if (!laUrlApkTinCay(update.apkUrl)) throw new Error("Đường dẫn bản cập nhật không hợp lệ");
  if (!laSha256HopLe(update.apkSha256)) throw new Error("Mã kiểm tra bản cập nhật không hợp lệ");
  const plugin = nativeUpdater();
  if (plugin?.installApk) return plugin.installApk({ url: update.apkUrl, sha256: update.apkSha256 });
  window.open(update.apkUrl, "_blank");
  return { opened: true };
}
