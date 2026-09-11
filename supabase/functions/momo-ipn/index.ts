import "@supabase/functions-js/edge-runtime.d.ts";

const MOMO_CONFIG = {
  partnerCode: "MOMOIPFW20260606",
  accessKey: "",
  secretKey: "",
  endpointCreate: "https://payment.momo.vn/v2/gateway/api/create",
  endpointQuery: "https://payment.momo.vn/v2/gateway/api/query",
  redirectUrl: "https://momo.vn",
  ipnUrl: "https://rbvpsaotqmddtvcxkyxz.supabase.co/functions/v1/momo-ipn",
  requestType: "captureWallet",
};

async function taoChuKyHmacSha256(secretKey: string, rawData: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secretKey);
  const msgData = encoder.encode(rawData);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, msgData);
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey",
};

Deno.serve(async (req) => {
  // CORS Preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  // Health check
  if (req.method === "GET") {
    return new Response(JSON.stringify({ status: "ok", service: "momo-ipn-proxy" }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json().catch(() => ({}));

    // 1. PROXY TẠO ĐƠN HÀNG MOMO TỪ TRÌNH DUYỆT (GIẢI QUYẾT TRIỆT ĐỂ CORS TRÊN BROWSER)
    if (body.action === "create") {
      const safeOrderId = String(body.orderId || `MOMO_${Date.now()}`);
      const safeAmount = Math.max(1000, Math.round(Number(body.amount) || 0));
      const safeInfo = String(body.orderInfo || "Thanh toan nuoc mia").slice(0, 200);
      const branch = body.branch || "Quán Nhà";
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

      const momoRes = await fetch(MOMO_CONFIG.endpointCreate, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      const data = await momoRes.json();
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // 2. PROXY KIỂM TRA TRẠNG THÁI MOMO TỪ TRÌNH DUYỆT (GIẢI QUYẾT TRIỆT ĐỂ CORS TRÊN BROWSER)
    if (body.action === "query") {
      const orderId = body.orderId;
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

      const momoRes = await fetch(MOMO_CONFIG.endpointQuery, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      const data = await momoRes.json();
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // 3. MOMO IPN WEBHOOK (MoMo máy chủ gọi về khi khách thanh toán thành công)
    console.log(
      `[MoMo IPN] Received callback for order: ${body?.orderId}, resultCode: ${body?.resultCode}, amount: ${body?.amount}, transId: ${body?.transId}`
    );

    // Bắt buộc trả về HTTP 204 No Content cho MoMo
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  } catch (err) {
    console.warn("[MoMo Function] Error:", err);
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
});
