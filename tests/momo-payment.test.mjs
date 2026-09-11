import assert from "node:assert/strict";
import {
  taoChuKyHmacSha256,
  MOMO_CONFIG,
  taoDonThanhToanMoMo,
  kiemTraTrangThaiMoMo,
  batDauKiemTraMoMo,
  dungKiemTraMoMo,
} from "../www/js/momo.js";

console.log("Starting tests/momo-payment.test.mjs...");

// Test 1: Chữ ký số HMAC-SHA256
{
  const secretKey = "testSecret";
  const rawData = "accessKey=123&amount=10000&partnerCode=MOMO123";
  const sig = await taoChuKyHmacSha256(secretKey, rawData);
  assert.equal(typeof sig, "string");
  assert.equal(sig.length, 64);
  console.log("PASS 1: taoChuKyHmacSha256 produces valid 64-char hex string");
}

// Test 2: Tạo đơn MoMo
{
  const orderId = "TEST_ORDER_" + Date.now();
  const res = await taoDonThanhToanMoMo({
    orderId,
    amount: 20000,
    orderInfo: "Bán 2 ly mía tắc",
    branch: "Quán Nhà",
  });

  assert.equal(res.ok, true);
  assert.equal(res.amount, 20000);
  assert.ok(res.payUrl.includes("momo.vn"));
  assert.ok(res.qrCodeUrl.includes("create-qr-code"));
  console.log("PASS 2: taoDonThanhToanMoMo returns valid payUrl and qrCodeUrl");
}

// Test 3: Kiểm tra trạng thái đơn MoMo (Query API)
{
  const orderId = "TEST_ORDER_QUERY";
  const kq = await kiemTraTrangThaiMoMo(orderId);
  assert.equal(typeof kq.ok, "boolean");
  console.log("PASS 3: kiemTraTrangThaiMoMo executed without exception, result:", kq.message || kq.resultCode);
}

// Test 4: Polling hết hạn sau thời gian tối đa quy định (30s)
{
  const orderId = "TEST_EXPIRE_" + Date.now();
  await taoDonThanhToanMoMo({
    orderId,
    amount: 10000,
    orderInfo: "Bán nước mía test",
    branch: "Quán Nhà",
  });
  
  const expireResult = await new Promise((resolve) => {
    // Chạy thử với cấu hình timeout nhanh 100ms (interval 20ms) để kiểm tra cơ chế hết hạn
    batDauKiemTraMoMo(
      orderId,
      () => {},
      (err) => resolve(err),
      20,
      100
    );
  });

  assert.equal(expireResult?.isExpired, true);
  dungKiemTraMoMo();
  console.log("PASS 4: batDauKiemTraMoMo terminates with isExpired: true when reaching max duration");
}


console.log("ALL MoMo Payment tests passed successfully!");

