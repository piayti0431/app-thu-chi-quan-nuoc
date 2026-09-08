import assert from "node:assert/strict";
import { escapeHtml } from "../www/js/ui/components.js";

console.log("Starting tests/xss-sanitize.test.mjs...");

// Test 1: Basic characters escaping
{
  assert.equal(escapeHtml("<script>alert('xss')</script>"), "&lt;script&gt;alert(&#039;xss&#039;)&lt;/script&gt;");
  assert.equal(escapeHtml('<img src=x onerror="alert(1)">'), "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
  assert.equal(escapeHtml("Mía & Cam"), "Mía &amp; Cam");
  assert.equal(escapeHtml(""), "");
  assert.equal(escapeHtml(null), "");
  assert.equal(escapeHtml(undefined), "");

  console.log("PASS 1: Core HTML entities correctly escaped");
}

// Test 2: Safe string preservation
{
  const normalText = "Nước mía 1 lít - 16.000 đ (Quán Nhà)";
  assert.equal(escapeHtml(normalText), normalText);

  const vietnameseText = "Bào 4 bó mía dài 12 cây ra 60kg thành phẩm";
  assert.equal(escapeHtml(vietnameseText), vietnameseText);

  console.log("PASS 2: Normal Vietnamese text preserved accurately");
}

// Test 3: Event handler / HTML injection payloads
{
  const maliciousInputs = [
    '<svg onload="alert(1)">',
    '"><script>alert(document.cookie)</script>',
    "javascript:/*--></title></style></textarea></script></xmp><svg/onload='+/\"/+/onmouseover=1/+/[*/[]/+alert(1)//'>",
    '<iframe src="javascript:alert(1)">',
  ];

  for (const input of maliciousInputs) {
    const sanitized = escapeHtml(input);
    assert.ok(!sanitized.includes("<script"), `Must not contain unescaped script tag: ${sanitized}`);
    assert.ok(!sanitized.includes("<svg"), `Must not contain unescaped svg tag: ${sanitized}`);
    assert.ok(!sanitized.includes("<iframe"), `Must not contain unescaped iframe tag: ${sanitized}`);
  }

  console.log("PASS 3: Malicious XSS vectors sanitized reliably");
}

console.log("ALL xss-sanitize tests passed successfully!");
