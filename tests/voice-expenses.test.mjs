import assert from "node:assert/strict";
import { phanTich } from "../www/js/parser.js";

const cases = [
  ["mua mía 200k", 200000, "Mua mía", "mua mía"],
  ["mua mía hai trăm nghìn", 200000, "Mua mía", "mua mía"],
  ["mua 5 bó mía 150 nghìn", 150000, "Mua mía", "mua mía"],
  ["trả tiền đá 30 nghìn", 30000, "Mua đá", "mua đá"],
  ["mua đá ba mươi nghìn", 30000, "Mua đá", "mua đá"],
  ["mua đá 30k", 30000, "Mua đá", "mua đá"],
  ["mua ống hút 25 nghìn", 25000, "Ly/ống hút/túi", "mua ống hút"],
  ["mua túi 20 ngàn", 20000, "Ly/ống hút/túi", "mua túi"],
  ["mua ly 50k", 50000, "Ly/ống hút/túi", "mua ly, ống hút hoặc túi"],
  ["tiền điện 1 triệu rưỡi", 1500000, "Điện nước", "trả tiền điện"],
  ["tiền điện một triệu rưỡi", 1500000, "Điện nước", "trả tiền điện"],
  ["trả tiền nước 200 nghìn", 200000, "Điện nước", "trả tiền nước"],
  ["đổ xăng 50", 50000, "Xăng xe", "đổ xăng"],
  ["đổ xăng 50k", 50000, "Xăng xe", "đổ xăng"],
  ["đổ xăng năm mươi nghìn", 50000, "Xăng xe", "đổ xăng"],
];

for (const [text, soTien, danhMuc, moTaXacNhan] of cases) {
  const actual = phanTich(text);
  assert.equal(actual.loai, "chi", text);
  assert.equal(actual.soTien, soTien, text);
  assert.equal(actual.danhMuc, danhMuc, text);
  assert.equal(actual.moTaXacNhan, moTaXacNhan, text);
  console.log(`PASS ${text} -> ${soTien}`);
}
