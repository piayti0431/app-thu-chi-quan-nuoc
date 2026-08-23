import { docDuLieu, luuDuLieu } from "./db.js";
import { mergeTransactions, pendingTransactions, toRemoteTransaction } from "./sync-model.js";

let client = null;
let realtimeChannel = null;
let realtimeSyncing = false;
const AUTH_REMEMBER_KEY = "nuocmia_auth_remember_until";
export const AUTH_REMEMBER_DAYS = 45;

export function syncErrorMessage(error) {
  const message = String(error?.message || error || "");
  if (/failed to fetch|networkerror|network request failed|load failed/i.test(message)) {
    return "Không kết nối được Supabase. Kiểm tra Internet, URL Supabase hoặc anon key rồi thử đồng bộ lại.";
  }
  return message || "Đồng bộ thất bại";
}

function getSupabaseGlobal() {
  return window.supabase || window.supabaseJs || null;
}

function rememberUntilIso() {
  return new Date(Date.now() + AUTH_REMEMBER_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

function storage() {
  return window.localStorage || localStorage;
}

function markRemembered() {
  storage()?.setItem(AUTH_REMEMBER_KEY, rememberUntilIso());
}

function clearRemembered() {
  storage()?.removeItem(AUTH_REMEMBER_KEY);
}

function rememberIsValid() {
  const value = storage()?.getItem(AUTH_REMEMBER_KEY);
  if (!value) return false;
  return Date.parse(value) > Date.now();
}

async function ensureClient() {
  const data = await docDuLieu();
  const { supabaseUrl, supabaseAnon } = data.sync || {};
  if (!supabaseUrl || !supabaseAnon) return null;
  const supabaseGlobal = getSupabaseGlobal();
  if (!supabaseGlobal?.createClient) throw new Error("Chưa tải được Supabase JS");
  if (!client) {
    client = supabaseGlobal.createClient(supabaseUrl, supabaseAnon, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }
  return client;
}

export async function daDangNhap() {
  const activeClient = await ensureClient();
  if (!activeClient) return false;
  try {
    const sessionPromise = activeClient.auth.getSession();
    const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve({ data: { session: null } }), 2000));
    const result = await Promise.race([sessionPromise, timeoutPromise]);
    if (!result?.data?.session) {
      clearRemembered();
      return false;
    }
    if (!rememberIsValid()) {
      markRemembered();
    }
    return true;
  } catch {
    clearRemembered();
    return false;
  }
}

export async function dangNhap(email, matKhau) {
  const activeClient = await ensureClient();
  if (!activeClient) throw new Error("Chưa cấu hình Supabase URL và anon key");
  const { error } = await activeClient.auth.signInWithPassword({
    email,
    password: matKhau,
  });
  if (error) throw error;
  markRemembered();
}

export async function dangKy(email, matKhau) {
  const activeClient = await ensureClient();
  if (!activeClient) throw new Error("Chưa cấu hình Supabase URL và anon key");
  const { error } = await activeClient.auth.signUp({
    email,
    password: matKhau,
  });
  if (error) throw error;
  const { data } = await activeClient.auth.getSession();
  if (data?.session) markRemembered();
}

export async function dangXuat() {
  const activeClient = await ensureClient();
  if (!activeClient) return;
  await dungRealtime();
  const { error } = await activeClient.auth.signOut();
  if (error) throw error;
  clearRemembered();
}

export async function dongBo() {
  const activeClient = await ensureClient();
  if (!activeClient) return { ok: false, message: "Chưa cấu hình Supabase" };

  const sessionResult = await activeClient.auth.getSession();
  if (!sessionResult.data?.session) return { ok: false, message: "Chưa đăng nhập Supabase" };

  let data = await docDuLieu();
  const pending = pendingTransactions(data.ds);

  if (pending.length) {
    const { error } = await activeClient
      .from("giao_dich")
      .upsert(pending.map((item) => toRemoteTransaction(item, data.sync?.deviceId)), { onConflict: "id" });
    if (error) throw error;

    data.ds = data.ds.map((item) =>
      pending.some((queued) => queued.id === item.id) ? { ...item, daSync: true } : item,
    );
    await luuDuLieu(data);
  }

  const { data: remoteRows, error: pullError } = await activeClient
    .from("giao_dich")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(5000);
  if (pullError) throw pullError;

  data = await docDuLieu();
  const merged = mergeTransactions(data.ds, remoteRows || []);
  data.ds = merged.items;
  data.sync = { ...(data.sync || {}), lastPulledAt: new Date().toISOString() };
  await luuDuLieu(data);

  const changed = pending.length + merged.stats.pulled + merged.stats.removed;
  if (!changed) return { ok: true, message: "Đã đồng bộ hết" };
  return {
    ok: true,
    message: `Đã sync ${pending.length} lưu, ${merged.stats.pulled} tải về, ${merged.stats.removed} xóa`,
  };
}

export async function dungRealtime() {
  if (!realtimeChannel || !client?.removeChannel) {
    realtimeChannel = null;
    return;
  }
  const channel = realtimeChannel;
  realtimeChannel = null;
  await client.removeChannel(channel);
}

export async function batDauRealtime(onRemoteChange) {
  const activeClient = await ensureClient();
  if (!activeClient?.channel) return { ok: false, message: "Supabase không hỗ trợ realtime" };

  const sessionResult = await activeClient.auth.getSession();
  if (!sessionResult.data?.session) return { ok: false, message: "Chưa đăng nhập Supabase" };

  const data = await docDuLieu();
  const currentDeviceId = data.sync?.deviceId || "";
  await dungRealtime();

  realtimeChannel = activeClient
    .channel(`giao-dich-${currentDeviceId || "device"}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "giao_dich" },
      async (payload) => {
        const changedDeviceId = payload?.new?.device_id || payload?.old?.device_id || "";
        if (changedDeviceId && changedDeviceId === currentDeviceId) return;
        if (realtimeSyncing) return;
        realtimeSyncing = true;
        try {
          await onRemoteChange?.(payload);
        } finally {
          realtimeSyncing = false;
        }
      },
    )
    .subscribe();

  return { ok: true, message: "Realtime sync sẵn sàng" };
}

window.addEventListener("online", () => {
  dongBo().catch((error) => console.warn("Đồng bộ online thất bại", error));
});
