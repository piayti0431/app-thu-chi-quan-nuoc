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
  const session = sessionResult.data?.session;
  if (!session) return { ok: false, message: "Chưa đăng nhập Supabase" };

  const userId = session.user?.id || "";
  let data = await docDuLieu();
  const currentDeviceId = data.sync?.deviceId || "local_device";
  const pending = pendingTransactions(data.ds);

  // 1. PUSH PENDING TRANSACTIONS TO SUPABASE (RESILIENT ADAPTIVE SCHEMA)
  if (pending.length) {
    let pushError = null;
    try {
      const { error } = await activeClient
        .from("giao_dich")
        .upsert(
          pending.map((item) => toRemoteTransaction(item, currentDeviceId, true, userId)),
          { onConflict: "id" }
        );
      if (error) pushError = error;
    } catch (e) {
      pushError = e;
    }

    if (pushError) {
      const errMsg = String(pushError?.message || pushError || "");
      if (errMsg.includes("column") || errMsg.includes("schema cache") || errMsg.includes("42703") || errMsg.includes("chi_nhanh")) {
        console.warn("Supabase lacks extended columns, automatically falling back to packed metadata in ghi_chu:", errMsg);
        const { error: fallbackError } = await activeClient
          .from("giao_dich")
          .upsert(
            pending.map((item) => toRemoteTransaction(item, currentDeviceId, false, userId)),
            { onConflict: "id" }
          );
        if (fallbackError) throw fallbackError;
      } else {
        throw pushError;
      }
    }

    data.ds = data.ds.map((item) =>
      pending.some((queued) => queued.id === item.id) ? { ...item, daSync: true } : item,
    );
    await luuDuLieu(data);
  }

  // 2. PULL ALL TRANSACTIONS FOR THIS ACCOUNT FROM SUPABASE
  const { data: remoteRows, error: pullError } = await activeClient
    .from("giao_dich")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(5000);
  if (pullError) throw pullError;

  data = await docDuLieu();
  const merged = mergeTransactions(data.ds, remoteRows || []);
  data.ds = merged.items;

  // 3. FETCH FRESH USER METADATA FROM SUPABASE SERVER
  let freshUser = session.user;
  try {
    const userRes = await activeClient.auth.getUser();
    if (userRes.data?.user) {
      freshUser = userRes.data.user;
    }
  } catch (userErr) {
    console.warn("Could not fetch fresh user object, falling back to session user:", userErr);
  }

  // 4. SYNC SETTINGS & CONFIG ACROSS DEVICES (MENU, BRANCHES, COST, OPENING CASH, CRM)
  const remoteSettings = freshUser?.user_metadata?.app_settings;
  const localSettingsVersion = Number(data.settingsVersion) || 0;

  if (remoteSettings && Number(remoteSettings.version) > localSettingsVersion) {
    // Remote has newer settings -> pull to this device
    if (Array.isArray(remoteSettings.quickItems) && remoteSettings.quickItems.length > 0) {
      data.quickItems = remoteSettings.quickItems;
    }
    if (Array.isArray(remoteSettings.branches) && remoteSettings.branches.length > 0) {
      data.branches = remoteSettings.branches;
    }
    if (remoteSettings.overheadConfig) {
      data.overheadConfig = remoteSettings.overheadConfig;
    }
    if (remoteSettings.packagingConfig) {
      data.packagingConfig = remoteSettings.packagingConfig;
    }
    if (remoteSettings.costFormulas) {
      data.costFormulas = remoteSettings.costFormulas;
    }
    if (remoteSettings.defaultOpeningCash) {
      data.defaultOpeningCash = remoteSettings.defaultOpeningCash;
    }
    if (remoteSettings.openingCashByDate) {
      data.openingCashByDate = { ...(data.openingCashByDate || {}), ...remoteSettings.openingCashByDate };
    }
    if (Array.isArray(remoteSettings.crmCustomers)) {
      data.crmCustomers = remoteSettings.crmCustomers;
    }
    if (Array.isArray(remoteSettings.aiChatHistory)) {
      data.aiChatHistory = remoteSettings.aiChatHistory;
    }
    if (Array.isArray(remoteSettings.restartLogs)) {
      data.restartLogs = remoteSettings.restartLogs;
    }
    if (Array.isArray(remoteSettings.dailyClosings)) {
      data.dailyClosings = remoteSettings.dailyClosings;
    }
    if (remoteSettings.knowledgeBase) {
      data.knowledgeBase = remoteSettings.knowledgeBase;
    }
    if (remoteSettings.danhMuc) {
      data.danhMuc = remoteSettings.danhMuc;
    }
    data.settingsVersion = remoteSettings.version;
  } else if (!remoteSettings || localSettingsVersion > (Number(remoteSettings?.version) || 0)) {
    // Local has newer settings -> push to user metadata on Supabase
    const newVersion = Date.now();
    try {
      await activeClient.auth.updateUser({
        data: {
          app_settings: {
            version: newVersion,
            quickItems: data.quickItems || [],
            branches: data.branches || [],
            overheadConfig: data.overheadConfig || {},
            packagingConfig: data.packagingConfig || {},
            costFormulas: data.costFormulas || {},
            defaultOpeningCash: data.defaultOpeningCash || 500000,
            openingCashByDate: data.openingCashByDate || {},
            crmCustomers: data.crmCustomers || [],
            aiChatHistory: (data.aiChatHistory || []).slice(-100),
            restartLogs: data.restartLogs || [],
            dailyClosings: data.dailyClosings || [],
            knowledgeBase: data.knowledgeBase || {},
            danhMuc: data.danhMuc || {},
          },
        },
      });
      data.settingsVersion = newVersion;
    } catch (metaErr) {
      console.warn("Sync settings to user metadata warning:", metaErr);
    }
  }

  data.sync = { ...(data.sync || {}), lastPulledAt: new Date().toISOString(), accountEmail: session.user?.email || "" };
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

export async function phatTinHieuSync() {
  try {
    if (realtimeChannel && typeof realtimeChannel.send === "function") {
      const data = await docDuLieu();
      await realtimeChannel.send({
        type: "broadcast",
        event: "sync_ping",
        payload: { deviceId: data.sync?.deviceId || "device", time: Date.now() },
      });
    }
  } catch (err) {
    console.warn("Could not broadcast sync ping:", err);
  }
}

export async function batDauRealtime(onRemoteChange) {
  const activeClient = await ensureClient();
  if (!activeClient?.channel) return { ok: false, message: "Supabase không hỗ trợ realtime" };

  const sessionResult = await activeClient.auth.getSession();
  const session = sessionResult.data?.session;
  if (!session) return { ok: false, message: "Chưa đăng nhập Supabase" };

  const data = await docDuLieu();
  const currentDeviceId = data.sync?.deviceId || "";
  const userId = session.user?.id || "account";
  await dungRealtime();

  // Scoped to User ID so all devices of the same account connect to the EXACT SAME realtime channel
  realtimeChannel = activeClient
    .channel(`giao-dich-${userId}`)
    .on(
      "broadcast",
      { event: "sync_ping" },
      async (payload) => {
        if (payload?.payload?.deviceId && payload.payload.deviceId === currentDeviceId) return;
        if (realtimeSyncing) return;
        realtimeSyncing = true;
        try {
          await onRemoteChange?.(payload);
        } finally {
          realtimeSyncing = false;
        }
      },
    )
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
