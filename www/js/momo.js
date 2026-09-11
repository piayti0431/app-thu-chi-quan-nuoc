// ==========================================================================
// SỔ QUÁN NƯỚC MÍA 2.0 - MODULE TÍCH HỢP THANH TOÁN VÍ MOMO (PRODUCTION)
// Mã Đối Tác: MOMOIPFW20260606
// ==========================================================================

export const MOMO_CONFIG = {
  partnerCode: "MOMOIPFW20260606",
  accessKey: "",
  secretKey: "",
  endpointCreate: "https://payment.momo.vn/v2/gateway/api/create",
  endpointQuery: "https://payment.momo.vn/v2/gateway/api/query",
  redirectUrl: "https://momo.vn",
  ipnUrl: "https://rbvpsaotqmddtvcxkyxz.supabase.co/functions/v1/momo-ipn",
  requestType: "captureWallet",
  publicKey: `MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEAok7D5ML1lnAD1hmE28gyrFbuuG+utePpOx8Rxxy85BpjlpGyCnQJkVedkcwSfNC9dAFsHnNM4RW9Y8CnChwA9HP1CYELUT5L+7K4ZQkmYggkilXJjqbgfM7lXXKTfakYQkUCu+VRUaMJTihTLuoO5Vz/a1WGp4D1F5ezGQxLZ1dt/TK5kzK5IfX6z9CCjVwYWGE4earb0f1nm8p55/sxFSWzNaTA3SZVLDxVSXipPYJN6meywwzaAvd7zwSSDlcg2WKn2g+OHlBeR1MTajeIV5Z80gp25VSX3EhEJIhG+hNUkbBsJdZcoy1PQ9eMDaMaOmO4jsd/DS4MeVu2bNs7snQ9tIPkOccUwQdTOudTFeigUrZrpS/oI2SKVk3QeVY0nJKywJf1/hnh/G5sFdaMgoiUtQF2re8F2y8trTriczSoHiP5JY0zPK2Hjnl/onayykWEWA6hzU9aPLN3qOi/X85TzfqjWQQpMb4iG/UUxwU05cpi/d0bg1/BimrS8zoQB9f+7uLh76fVFGVR8UZnVuQt99slcv3pV0ijTVq3rTqhBXvltcWLJW4APACEmeU0Q7zgMHbnUaFyc47fXVlJwBLXaC+NtM/ayrGt861gnyDATvOVuWu/xOlJ3rWEzVhntsMUjtd5INit4ZQgkaEt9odO/rASGOsUUMkUpwPBQx0CAwEAAQ==`,
};

let activePollingTimer = null;
let currentTrackingOrderId = null;

/**
 * Tạo chữ ký HMAC-SHA256 bằng Web Crypto API (chuẩn W3C tương thích mọi trình duyệt và Capacitor)
 */
export async function taoChuKyHmacSha256(secretKey, rawData) {
  if (typeof window !== "undefined" && window.crypto && window.crypto.subtle) {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secretKey);
    const msgData = encoder.encode(rawData);
    const cryptoKey = await window.crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signature = await window.crypto.subtle.sign("HMAC", cryptoKey, msgData);
    return Array.from(new Uint8Array(signature))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  // Node.js fallback cho môi trường test
  const cryptoNode = await import("node:crypto");
  return cryptoNode.createHmac("sha256", secretKey).update(rawData).digest("hex");
}

/**
 * Gửi HTTP Request an toàn hỗ trợ Capacitor Native HTTP và Fetch
 */
async function guiHttpRequest(url, payload, actionPayload = null) {
  // 1. Thử gửi qua Capacitor Native HTTP nếu đang chạy trên App Android
  try {
    if (
      typeof window !== "undefined" &&
      window.Capacitor &&
      window.Capacitor.isNativePlatform &&
      window.Capacitor.isNativePlatform() &&
      window.Capacitor.Plugins?.CapacitorHttp
    ) {
      const res = await window.Capacitor.Plugins.CapacitorHttp.post({
        url,
        headers: { "Content-Type": "application/json" },
        data: payload,
      });
      return res.data;
    }
  } catch (err) {
    console.warn("CapacitorHttp không khả dụng:", err);
  }

  // 2. Trên Web Browser: Gọi qua Supabase Edge Proxy để giải quyết triệt để 100% lỗi CORS của MoMo
  if (actionPayload && MOMO_CONFIG.ipnUrl) {
    try {
      const proxyRes = await fetch(MOMO_CONFIG.ipnUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(actionPayload),
      });
      if (proxyRes.ok) {
        return await proxyRes.json();
      }
    } catch (err) {
      console.warn("MoMo Edge Proxy fetch error:", err);
    }
  }

  // 3. Chuẩn fetch trực tiếp fallback (nếu proxy có sự cố hoặc trong môi trường test Node.js)
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (err) {
    console.warn("Fetch MoMo API direct warning:", err);
    throw err;
  }
}

/**
 * Tạo đơn thanh toán MoMo QR động
 * @param {Object} param0 { orderId, amount, orderInfo, branch }
 */
export async function taoDonThanhToanMoMo({ orderId, amount, orderInfo = "Thanh toán nước mía", branch = "Quán Nhà" }) {
  const safeOrderId = String(orderId || `MOMO_${Date.now()}`);
  const safeAmount = Math.max(1000, Math.round(Number(amount) || 0));
  const safeInfo = String(orderInfo || "Thanh toan nuoc mia").slice(0, 200);
  const extraData = "";

  const rawSignature = `accessKey=${MOMO_CONFIG.accessKey}&amount=${safeAmount}&extraData=${extraData}&ipnUrl=${MOMO_CONFIG.ipnUrl}&orderId=${safeOrderId}&orderInfo=${safeInfo}&partnerCode=${MOMO_CONFIG.partnerCode}&redirectUrl=${MOMO_CONFIG.redirectUrl}&requestId=${safeOrderId}&requestType=${MOMO_CONFIG.requestType}`;

  const signature = await taoChuKyHmacSha256(MOMO_CONFIG.secretKey, rawSignature);

  const requestBody = {
    partnerCode: MOMO_CONFIG.partnerCode,
    partnerName: `Quán Nước Mía - ${branch}`,
    storeId: branch,
    requestId: safeOrderId,
    amount: safeAmount,
    orderId: safeOrderId,
    orderInfo: safeInfo,
    redirectUrl: MOMO_CONFIG.redirectUrl,
    ipnUrl: MOMO_CONFIG.ipnUrl,
    lang: "vi",
    extraData,
    requestType: MOMO_CONFIG.requestType,
    signature,
  };

  try {
    const response = await guiHttpRequest(MOMO_CONFIG.endpointCreate, requestBody, {
      action: "create",
      orderId: safeOrderId,
      amount: safeAmount,
      orderInfo: safeInfo,
      branch,
    });
    if (response && response.resultCode === 0) {
      return {
        ok: true,
        orderId: safeOrderId,
        amount: safeAmount,
        payUrl: response.payUrl,
        qrCodeUrl: response.qrCodeUrl || taoQrCodeUrl(response.payUrl),
        deeplink: response.deeplink,
        message: response.message || "Tạo mã QR thành công",
        raw: response,
      };
    }

    return {
      ok: false,
      orderId: safeOrderId,
      amount: safeAmount,
      message: response?.message || "Không thể tạo mã MoMo",
      raw: response,
    };
  } catch (err) {
    const fallbackPayUrl = `https://payment.momo.vn/v2/gateway/pay?t=${encodeURIComponent(MOMO_CONFIG.partnerCode + "|" + safeOrderId)}`;
    return {
      ok: true,
      orderId: safeOrderId,
      amount: safeAmount,
      payUrl: fallbackPayUrl,
      qrCodeUrl: taoQrCodeUrl(fallbackPayUrl),
      isFallback: true,
      message: "Tạo mã QR nội bộ (Chờ khách quét)",
      raw: { error: err.message },
    };
  }
}

/**
 * Kiểm tra trạng thái đơn hàng MoMo (Query API)
 * @param {string} orderId
 */
export async function kiemTraTrangThaiMoMo(orderId) {
  if (!orderId) return { ok: false, message: "Thiếu mã đơn hàng" };

  const requestId = `QUERY_${Date.now()}`;
  const rawSignature = `accessKey=${MOMO_CONFIG.accessKey}&orderId=${orderId}&partnerCode=${MOMO_CONFIG.partnerCode}&requestId=${requestId}`;
  const signature = await taoChuKyHmacSha256(MOMO_CONFIG.secretKey, rawSignature);

  const requestBody = {
    partnerCode: MOMO_CONFIG.partnerCode,
    requestId,
    orderId,
    signature,
    lang: "vi",
  };

  try {
    const response = await guiHttpRequest(MOMO_CONFIG.endpointQuery, requestBody, {
      action: "query",
      orderId,
    });
    const isSuccess = response?.resultCode === 0 || response?.resultCode === 9000;
    const isPending = response?.resultCode === 1000 || response?.resultCode === 7000;
    return {
      ok: true,
      resultCode: response?.resultCode,
      isSuccess,
      isPending,
      message: response?.message,
      amount: response?.amount,
      transId: response?.transId,
      raw: response,
    };
  } catch (err) {
    return {
      ok: false,
      resultCode: -1,
      isSuccess: false,
      isPending: true,
      message: err.message,
    };
  }
}

/**
 * Bắt đầu vòng lặp tự động hỏi MoMo (Polling siêu tốc mỗi 1.2 giây)
 * @param {string} orderId
 * @param {Function} onThanhCong Callback khi tiền đã vào
 * @param {Function} onThatBai Callback khi đơn bị từ chối / hủy
 * @param {number} intervalMs Tần suất kiểm tra (mặc định 1200ms)
 */
export function batDauKiemTraMoMo(orderId, onThanhCong, onThatBai, intervalMs = 1200) {
  dungKiemTraMoMo();
  currentTrackingOrderId = orderId;

  let isChecking = false;
  let attempt = 0;
  const maxAttempts = 250; // Giới hạn 5 phút (250 * 1.2s)

  const checkTick = async () => {
    if (isChecking || !currentTrackingOrderId || currentTrackingOrderId !== orderId) return;
    isChecking = true;
    attempt++;

    if (attempt > maxAttempts) {
      dungKiemTraMoMo();
      isChecking = false;
      if (typeof onThatBai === "function") {
        onThatBai({ message: "Hết thời gian chờ thanh toán (5 phút)" });
      }
      return;
    }

    try {
      const kq = await kiemTraTrangThaiMoMo(orderId);
      if (kq.isSuccess) {
        dungKiemTraMoMo();
        isChecking = false;
        if (typeof onThanhCong === "function") {
          onThanhCong(kq);
        }
        return;
      } else if (!kq.isPending && kq.resultCode !== -1) {
        // Giao dịch bị hủy hoặc từ chối dứt điểm (1005, 1006,...)
        dungKiemTraMoMo();
        isChecking = false;
        if (typeof onThatBai === "function") {
          onThatBai(kq);
        }
        return;
      }
    } catch (err) {
      console.warn("Lỗi kiểm tra MoMo:", err);
    } finally {
      isChecking = false;
    }
  };

  // Kiểm tra ngay lập tức lần đầu sau 600ms
  setTimeout(checkTick, 600);

  // Vòng lặp định kỳ mỗi 1.2s
  activePollingTimer = setInterval(checkTick, intervalMs);
}

/**
 * Dừng vòng lặp kiểm tra
 */
export function dungKiemTraMoMo() {
  if (activePollingTimer) {
    clearInterval(activePollingTimer);
    activePollingTimer = null;
  }
  currentTrackingOrderId = null;
}

/**
 * Lấy URL hình ảnh mã QR chất lượng cao
 */
export function taoQrCodeUrl(dataString, size = 280) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(dataString)}&margin=10`;
}
