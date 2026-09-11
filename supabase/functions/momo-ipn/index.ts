import "@supabase/functions-js/edge-runtime.d.ts";

Deno.serve(async (req) => {
  // CORS Preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
        "Access-Control-Allow-Headers": "*",
      },
    });
  }

  // Health check
  if (req.method === "GET") {
    return new Response(JSON.stringify({ status: "ok", service: "momo-ipn" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const payload = await req.json();
    console.log(
      `[MoMo IPN] Received callback for order: ${payload?.orderId}, resultCode: ${payload?.resultCode}, amount: ${payload?.amount}, transId: ${payload?.transId}`
    );

    // Trả về HTTP 204 No Content đúng theo chuẩn bắt buộc của MoMo Developer
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      },
    });
  } catch (err) {
    console.warn("[MoMo IPN] Error reading body:", err);
    return new Response(null, { status: 204 });
  }
});
