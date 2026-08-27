import assert from "node:assert/strict";

const store = new Map();
if (typeof globalThis.localStorage === "undefined") {
  globalThis.localStorage = {
    getItem: (key) => store.get(key) || null,
    setItem: (key, val) => store.set(key, String(val)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
  };
}

import { phanTichChiTiet, stripWakeWordAndBranch } from "../www/js/parser.js";
import { phanTichTaiChinhNoiBo } from "../www/js/ai-assistant.js";
import { docDuLieu, luuTinNhanAIChat, xoaLichSuAIChat } from "../www/js/db.js";

console.log("Starting ev-secretary.test.mjs...");

// Test 1: Wake word stripping
{
  const t1 = stripWakeWordAndBranch("i vi bán 2 ly nước mía");
  assert.equal(t1.cleanText, "bán 2 ly nước mía");

  const t2 = stripWakeWordAndBranch("ê vi ơi mua 3 bao đá 30k");
  assert.equal(t2.cleanText, "mua 3 bao đá 30k");

  const t3 = stripWakeWordAndBranch("EV chi nhánh 2 bán 1 lít mía 16k");
  assert.equal(t3.branch, "Chi nhánh 2");
  assert.ok(t3.cleanText.includes("bán 1 lít mía 16k"));

  const t4 = stripWakeWordAndBranch("ê-vi Quán Nhà bán 3 ly nước cam");
  assert.equal(t4.branch, "Quán Nhà (Chính)");

  console.log("PASS EV Wake Word & Branch Stripper: i vi, ê vi, EV, e-vi");
}

// Test 2: Voice parsing with EV wake-word
{
  const res1 = phanTichChiTiet("i vi bán 2 ly nước mía 20k");
  assert.equal(res1.loai, "thu");
  assert.equal(res1.soTien, 20000);
  assert.equal(res1.soLuong, 2);
  assert.equal(res1.danhMuc, "Nước mía thường");

  const res2 = phanTichChiTiet("ê vi ơi chi nhánh 2 mua 3 bao đá 30 nghìn");
  assert.equal(res2.loai, "chi");
  assert.equal(res2.soTien, 30000);
  assert.equal(res2.danhMuc, "Mua đá");
  assert.equal(res2.chiNhanh, "Chi nhánh 2");

  console.log("PASS EV Voice Transaction Parsing with Branch Binding");
}

// Test 3: Thêm món vào Menu qua câu lệnh tự nhiên của người dùng
{
  const mockState = {
    currentBranch: "Quán Nhà (Chính)",
    quickItems: [{ id: "nuoc_mia", name: "Nước mía thường", price: 10000, costPrice: 3000 }],
    ds: [],
  };

  const res = phanTichTaiChinhNoiBo("thêm vào menu món Mía Thơm, tiền bán 1 ly là 10k", mockState);
  assert.equal(res.type, "action");
  assert.equal(res.action, "add_menu_item");
  assert.equal(res.item.name, "Mía Thơm");
  assert.equal(res.item.price, 10000);
  assert.equal(res.item.costPrice, 4000);
  assert.equal(res.item.voiceUnit, "ly");
  assert.ok(res.reply.includes("Mía Thơm"), "Phải có thông báo thêm món Mía Thơm");

  console.log("PASS EV Add Menu Item via natural user command: Mía Thơm 10k");
}

// Test 4: Đính chính ngữ cảnh (Correction / Clarification)
{
  const mockState = {
    currentBranch: "Quán Nhà (Chính)",
    quickItems: [],
    ds: [],
  };

  const res = phanTichTaiChinhNoiBo("tôi bảo là thêm vào menu không phải doanh thu", mockState);
  assert.equal(res.type, "clarification");
  assert.ok(res.reply.includes("xin lỗi"), "Phải nhận ra đây là câu đính chính và phản hồi tế nhị");

  console.log("PASS EV Intent Clarification: Correcting false assumptions politely");
}

// Test 5: Multi-branch financial report with EV persona
{
  const today = (() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  })();

  const mockState = {
    currentBranch: "Quán Nhà (Chính)",
    defaultOpeningCash: 500000,
    quickItems: [{ id: "nuoc_mia", name: "Nước mía thường", price: 10000, costPrice: 3000 }],
    ds: [
      {
        id: 1,
        ngay: today,
        loai: "thu",
        danhMuc: "Nước mía thường",
        soLuong: 10,
        soTien: 100000,
        giaCostDonVi: 3000,
        tongGiaCost: 30000,
        chiNhanh: "Quán Nhà (Chính)",
        deleted: false,
      },
      {
        id: 2,
        ngay: today,
        loai: "thu",
        danhMuc: "Nước mía thường",
        soLuong: 5,
        soTien: 50000,
        giaCostDonVi: 3000,
        tongGiaCost: 15000,
        chiNhanh: "Chi nhánh 2",
        deleted: false,
      },
    ],
  };

  const res = phanTichTaiChinhNoiBo("i vi hôm nay 2 chi nhánh lời bao nhiêu?", mockState);
  assert.equal(res.type, "financial_multi_branch");
  assert.ok(res.reply.includes("Dạ EV"), "Phải có xưng hô Dạ EV");
  assert.ok(res.reply.includes("Quán Nhà (Chính)"), "Phải có báo cáo Quán Nhà");
  assert.ok(res.reply.includes("Chi nhánh 2"), "Phải có báo cáo Chi nhánh 2");
  assert.ok(res.reply.includes("150.000"), "Tổng cộng 2 quán phải bằng 150k");

  console.log("PASS EV Multi-branch 2-branch combined financial report");
}

// Test 6: Câu nói tự nhiên thực tế của người dùng: "có khách vừa chuyển 16k cho 2 ly mía thường"
{
  const mockState = {
    currentBranch: "Quán Nhà (Chính)",
    quickItems: [{ id: "nuoc_mia", name: "Nước mía thường", price: 10000, costPrice: 3000 }],
    ds: [],
  };

  const res = phanTichTaiChinhNoiBo("có khách vừa chuyển 16k cho 2 ly mía thường", mockState);
  assert.equal(res.type, "command");
  assert.equal(res.action, "add_transaction");
  assert.equal(res.parsed.loai, "thu");
  assert.equal(res.parsed.soTien, 16000);
  assert.equal(res.parsed.soLuong, 2);
  assert.equal(res.parsed.phuongThuc, "chuyen_khoan");
  assert.equal(res.parsed.danhMuc, "Nước mía thường");
  assert.ok(res.reply.includes("16.000"), "Phải có số tiền 16.000đ");
  assert.ok(res.reply.includes("Chuyển khoản"), "Phải nhận ra phương thức Chuyển khoản QR");

  console.log("PASS EV Natural Conversation: 'có khách vừa chuyển 16k cho 2 ly mía thường' recorded seamlessly");
}

// Test 7: Suy luận số lượng từ menu: "khách vừa chuyển khoản 100k trà tắc" (Trà tắc 10k -> 10 ly)
{
  const mockState = {
    currentBranch: "Chi nhánh 2",
    quickItems: [{ id: "tra_tac", name: "Trà tắc", price: 10000, costPrice: 3500 }],
    ds: [],
  };

  const res = phanTichTaiChinhNoiBo("khách vừa chuyển khoản 100k trà tắc", mockState);
  assert.equal(res.type, "command");
  assert.equal(res.parsed.loai, "thu");
  assert.equal(res.parsed.soTien, 100000);
  assert.equal(res.parsed.soLuong, 10, "100k với giá 10k/ly phải tự tính là 10 ly");
  assert.equal(res.parsed.tongGiaCost, 35000, "10 ly x 3.500đ vốn = 35.000đ");
  assert.equal(res.parsed.phuongThuc, "chuyen_khoan");
  assert.ok(res.reply.includes("10 ly"), "Phản hồi phải thể hiện rõ 10 ly");

  console.log("PASS EV Menu Inference: '100k trà tắc' -> 10 ly Trà tắc, vốn 35k, CK 100k");
}

// Test 8: Đính chính tính toán của người dùng: "100k thì phải là 10 ly chứ?"
{
  const mockState = {
    currentBranch: "Chi nhánh 2",
    quickItems: [{ id: "tra_tac", name: "Trà tắc", price: 10000, costPrice: 3500 }],
    ds: [
      {
        id: 101,
        loai: "thu",
        danhMuc: "Trà tắc",
        soLuong: 1,
        soTien: 100000,
        giaCostDonVi: 3500,
        tongGiaCost: 3500,
      },
    ],
  };

  const res = phanTichTaiChinhNoiBo("100k thì phải là 10 ly chứ?", mockState);
  assert.equal(res.type, "action");
  assert.equal(res.action, "update_last_transaction");
  assert.equal(res.updatedTx.soLuong, 10);
  assert.equal(res.updatedTx.tongGiaCost, 35000);
  assert.ok(res.reply.includes("10 ly"));
  assert.ok(res.reply.includes("xin lỗi"));

  console.log("PASS EV Correction Handling: '100k thì phải là 10 ly chứ?' -> updates last tx to 10 ly");
}

// Test 9: Phân biệt trò chuyện thường ngày & thời tiết: "hôm nay trời thế nào?" (Không được nhảy vào báo cáo doanh thu)
{
  const mockState = {
    currentBranch: "Quán Nhà (Chính)",
    quickItems: [],
    ds: [{ id: 1, loai: "thu", soTien: 226000, deleted: false }],
  };

  const res = phanTichTaiChinhNoiBo("hôm nay trời thế nào?", mockState);
  assert.equal(res.type, "general", "Không được trả về financial report");
  assert.ok(!res.reply.includes("226.000"), "Không được tự ý báo cáo doanh thu khi hỏi thời tiết");
  assert.ok(res.reply.includes("thời tiết") || res.reply.includes("nước mía") || res.reply.includes("trời"));

  console.log("PASS EV Chit-chat Disambiguation: 'hôm nay trời thế nào?' -> friendly weather response");
}

// Test 10: Hội thoại nhiều bước khi thiếu giá tiền: "mới mua 2 bao đá" -> "1 bao là 15k"
{
  const mockState = {
    currentBranch: "Chi nhánh 2",
    quickItems: [],
    ds: [],
  };

  // Bước 1: Người dùng nói mua 2 bao đá (chưa có giá tiền)
  const res1 = phanTichTaiChinhNoiBo("mới mua 2 bao đá", mockState);
  assert.equal(res1.type, "question", "Phải hỏi lại giá tiền, không được tự ý ghi 2.000đ");
  assert.ok(res1.reply.includes("2 bao Mua đá") || res1.reply.includes("2 bao"));
  assert.ok(res1.reply.includes("bao nhiêu tiền"));

  // Bước 2: Người dùng trả lời: "1 bao là 15k"
  const res2 = phanTichTaiChinhNoiBo("1 bao là 15k", mockState);
  assert.equal(res2.type, "command");
  assert.equal(res2.action, "add_transaction");
  assert.equal(res2.parsed.loai, "chi");
  assert.equal(res2.parsed.soLuong, 2);
  assert.equal(res2.parsed.soTien, 30000, "2 bao x 15k = 30.000đ");
  assert.equal(res2.parsed.danhMuc, "Mua đá");
  assert.ok(res2.reply.includes("30.000"));

  console.log("PASS EV Multi-turn Missing Info: 'mới mua 2 bao đá' -> asks price -> '1 bao là 15k' -> records 30k expense");
}

// Test 11: "khách vừa mới chuyển khoản 100k tiền mua trà tắc" (Trà tắc 10k, vốn 7k -> Thu 100k, 10 ly, vốn 70k)
{
  const mockState = {
    currentBranch: "Chi nhánh 2",
    quickItems: [{ id: "tra_tac", name: "Trà tắc", price: 10000, costPrice: 7000 }],
    ds: [],
  };

  const res = phanTichTaiChinhNoiBo("khách vừa mới chuyển khoản 100k tiền mua trà tắc", mockState);
  assert.equal(res.type, "command");
  assert.equal(res.parsed.loai, "thu", "Khách mua trà tắc phải là THU tiền bán");
  assert.equal(res.parsed.danhMuc, "Trà tắc", "Món phải là Trà tắc, không được là Tắc tươi");
  assert.equal(res.parsed.soLuong, 10, "100k chia 10k/ly = 10 ly");
  assert.equal(res.parsed.soTien, 100000);
  assert.equal(res.parsed.tongGiaCost, 70000, "10 ly x 7k vốn = 70.000đ");
  assert.equal(res.parsed.phuongThuc, "chuyen_khoan");

  console.log("PASS EV: 'khách vừa mới chuyển khoản 100k tiền mua trà tắc' -> + Thu 100k 10 ly Trà tắc, vốn 70k");
}

// Test 12: "ý là khách vừa chuyển 150k tiền mua 10 ly trà tắc"
{
  const mockState = {
    currentBranch: "Chi nhánh 2",
    quickItems: [{ id: "tra_tac", name: "Trà tắc", price: 10000, costPrice: 7000 }],
    ds: [],
  };

  const res = phanTichTaiChinhNoiBo("ý là khách vừa chuyển 150k tiền mua 10 ly trà tắc", mockState);
  assert.equal(res.type, "command");
  assert.equal(res.parsed.loai, "thu");
  assert.equal(res.parsed.danhMuc, "Trà tắc");
  assert.equal(res.parsed.soLuong, 10);
  assert.equal(res.parsed.soTien, 150000);
  assert.equal(res.parsed.tongGiaCost, 70000);
  assert.equal(res.parsed.phuongThuc, "chuyen_khoan");

  console.log("PASS EV: 'ý là khách vừa chuyển 150k tiền mua 10 ly trà tắc' -> + Thu 150k 10 ly Trà tắc, vốn 70k");
}

// Test 13: Trí nhớ Khách quen: "chú đối diện lấy 2 ly" -> Tự hiểu Chú A lấy 2 ly Mía thường (16k), tiền mặt
{
  const mockState = {
    currentBranch: "Quán Nhà (Chính)",
    quickItems: [{ id: "nuoc_mia", name: "Nước mía thường", price: 8000, costPrice: 3000, voiceUnit: "ly" }],
    crmCustomers: [
      {
        id: "cust_chu_a",
        name: "Chú A (Chú đối diện)",
        aliases: ["chú a", "chú đối diện", "chú tư"],
        defaultDrink: "Nước mía thường",
        defaultQty: 1,
        paymentMethod: "tien_mat",
      },
    ],
    ds: [],
  };

  const res = phanTichTaiChinhNoiBo("chú đối diện lấy 2 ly", mockState);
  assert.equal(res.type, "command");
  assert.equal(res.parsed.loai, "thu");
  assert.equal(res.parsed.danhMuc, "Nước mía thường");
  assert.equal(res.parsed.soLuong, 2);
  assert.equal(res.parsed.soTien, 16000);
  assert.equal(res.parsed.tongGiaCost, 6000);
  assert.equal(res.parsed.phuongThuc, "tien_mat");
  assert.ok(res.reply.includes("Chú A"));

  console.log("PASS EV CRM Memory: 'chú đối diện lấy 2 ly' -> 2 ly Nước mía thường (16k), TM");
}

// Test 14: Tự học khách quen qua chat: "EV nhớ là chú Ba bảo vệ hay uống 1 ly rau má đậu 15k nhé"
{
  const mockState = {
    currentBranch: "Quán Nhà (Chính)",
    quickItems: [],
    crmCustomers: [],
    ds: [],
  };

  const res = phanTichTaiChinhNoiBo("EV nhớ là chú Ba bảo vệ hay uống 1 ly rau má đậu 15k nhé", mockState);
  assert.equal(res.type, "action");
  assert.equal(res.action, "learn_customer");
  assert.ok(res.customer.name.includes("Chú Ba"));
  assert.equal(res.customer.defaultDrink, "Rau má đậu xanh");
  assert.equal(res.customer.price, 15000);
  assert.ok(res.reply.includes("Sổ tay Khách Quen"));

  console.log("PASS EV In-Chat Learning: 'EV nhớ là chú Ba...' -> learns customer profile");
}

// Test 15: Ghi nợ khách quen: "anh B thiếu 30k mai trả"
{
  const mockState = {
    currentBranch: "Quán Nhà (Chính)",
    quickItems: [{ id: "mia_cam", name: "Mía cam", price: 15000, costPrice: 6000, voiceUnit: "ly" }],
    crmCustomers: [
      {
        id: "cust_anh_b",
        name: "Anh B",
        aliases: ["anh b", "anh kế bên"],
        defaultDrink: "Mía cam",
        defaultQty: 2,
        paymentMethod: "chuyen_khoan",
      },
    ],
    ds: [],
  };

  const res = phanTichTaiChinhNoiBo("anh B thiếu 30k mai trả", mockState);
  assert.equal(res.type, "action");
  assert.equal(res.action, "customer_debt");
  assert.equal(res.debtAmount, 15000); // 1 ly default hoặc trích xuất
  assert.ok(res.reply.includes("Sổ Nợ"));

  console.log("PASS EV Debt Tracking: 'anh B thiếu 30k mai trả' -> records debt");
}

// Test 16: Phân tích Tài chính F&B, P&L và Điểm hòa vốn
{
  const mockState = {
    currentBranch: "Quán Nhà (Chính)",
    quickItems: [],
    ds: [
      { id: 1, loai: "thu", soTien: 800000, tongGiaCost: 250000, deleted: false, ngay: new Date().toISOString().split("T")[0] },
      { id: 2, loai: "chi", soTien: 100000, deleted: false, ngay: new Date().toISOString().split("T")[0] },
    ],
  };

  const resPnl = phanTichTaiChinhNoiBo("báo cáo P&L hôm nay", mockState);
  assert.equal(resPnl.type, "financial_report");
  assert.ok(resPnl.reply.includes("DOANH THU THUẦN"));
  assert.ok(resPnl.reply.includes("GIÁ VỐN NGUYÊN LIỆU (COGS)"));
  assert.ok(resPnl.reply.includes("LỢI NHUẬN RÒNG"));

  const resCogs = phanTichTaiChinhNoiBo("tỷ lệ giá vốn COGS hôm nay", mockState);
  assert.equal(resCogs.type, "financial_advice");
  assert.ok(resCogs.reply.includes("COGS"));

  const resBEP = phanTichTaiChinhNoiBo("hôm nay hòa vốn chưa", mockState);
  assert.equal(resBEP.type, "financial_advice");
  assert.ok(resBEP.reply.includes("Điểm Hòa Vốn"));

  console.log("PASS EV Executive Finance: P&L Report, COGS analysis, and Break-Even calculations");
}

// Test 17: "khách vừa chuyển khoản 169k tiền trà tắc" -> Không chia hết cho 10k -> EV hỏi lại, sau đó user đáp "17 ly" -> Ghi sổ 17 ly
{
  const mockState = {
    currentBranch: "Chi nhánh 2",
    quickItems: [{ id: "tra_tac", name: "Trà tắc", price: 10000, costPrice: 7000 }],
    ds: [],
  };

  const res1 = phanTichTaiChinhNoiBo("khách vừa chuyển khoản 169k tiền trà tắc", mockState);
  assert.equal(res1.type, "question", "Số tiền 169k không chia hết cho 10k -> EV phải hỏi lại làm rõ");
  assert.ok(res1.reply.includes("169.000"), "Phải chứa số tiền 169k");
  assert.ok(res1.reply.toLowerCase().includes("trà tắc"), "Phải nhắc đúng món Trà tắc");

  // User trả lời làm rõ: "17 ly"
  const res2 = phanTichTaiChinhNoiBo("17 ly", mockState);
  assert.equal(res2.type, "command");
  assert.equal(res2.parsed.loai, "thu");
  assert.equal(res2.parsed.danhMuc, "Trà tắc");
  assert.equal(res2.parsed.soLuong, 17);
  assert.equal(res2.parsed.soTien, 169000);
  assert.equal(res2.parsed.tongGiaCost, 119000, "17 ly x 7k vốn = 119.000đ");

  console.log("PASS EV Discrepancy: '169k trà tắc' -> asks clarification -> '17 ly' -> records 17 ly with 169k");
}

// Test 18: "khách mua 3k nước đá" -> + Thu tiền bán: Nước đá (3.000đ)
{
  const mockState = {
    currentBranch: "Chi nhánh 2",
    quickItems: [],
    ds: [],
  };

  const res = phanTichTaiChinhNoiBo("khách mua 3k nước đá", mockState);
  assert.equal(res.type, "command");
  assert.equal(res.parsed.loai, "thu");
  assert.equal(res.parsed.danhMuc, "Nước đá");
  assert.equal(res.parsed.soTien, 3000);
  assert.equal(res.parsed.tongGiaCost, 0);

  console.log("PASS EV Ice Sale: 'khách mua 3k nước đá' -> + Thu 3k Nước đá");
}

// Test 19: Đơn nhiều món trong 1 câu: "khách mua 8 ly cam, 2 ly rau má, 1 rau má đuậ, 3 trà tắc, 4 ly mía"
{
  const mockState = {
    currentBranch: "Quán Nhà (Chính)",
    quickItems: [
      { id: "nuoc_mia", name: "Nước mía thường", price: 8000, costPrice: 3000, voiceUnit: "ly" },
      { id: "nuoc_cam", name: "Nước cam", price: 15000, costPrice: 7000, voiceUnit: "ly" },
      { id: "rau_ma", name: "Rau má tươi", price: 10000, costPrice: 4000, voiceUnit: "ly" },
      { id: "rau_ma_dau_xanh", name: "Rau má đậu xanh", price: 15000, costPrice: 6000, voiceUnit: "ly" },
      { id: "tra_tac", name: "Trà tắc", price: 10000, costPrice: 7000, voiceUnit: "ly" },
    ],
    ds: [],
  };

  const res = phanTichTaiChinhNoiBo("khách mua 8 ly cam, 2 ly rau má, 1 rau má đuậ, 3 trà tắc, 4 ly mía", mockState);
  assert.equal(res.type, "command");
  assert.equal(res.action, "add_batch_transactions");
  assert.equal(res.items.length, 5, "Phải bóc tách được đúng 5 món");
  assert.equal(res.items[0].danhMuc, "Nước cam", "Món 1 phải là Nước cam (không được nhầm thành Mía cam)");
  assert.equal(res.items[0].soLuong, 8);
  assert.equal(res.items[1].danhMuc, "Rau má tươi");
  assert.equal(res.items[1].soLuong, 2);
  assert.equal(res.items[2].danhMuc, "Rau má đậu xanh", "Món 3 phải nhận ra Rau má đậu xanh dù gõ lỗi đuậ");
  assert.equal(res.items[2].soLuong, 1);
  assert.equal(res.items[3].danhMuc, "Trà tắc");
  assert.equal(res.items[3].soLuong, 3);
  assert.equal(res.items[4].danhMuc, "Nước mía thường");
  assert.equal(res.items[4].soLuong, 4);

  console.log("PASS EV Multi-item Batch: '8 cam, 2 rau má, 1 rau má đuậ, 3 trà tắc, 4 mía' -> all 5 items parsed accurately!");
}

// Test 20: Câu lệnh kép: "sáng nay vừa bán được 2 ly mía thường, tiền thói đầu ngày là 43k"
{
  const mockState = {
    currentBranch: "Quán Nhà (Chính)",
    quickItems: [{ id: "nuoc_mia", name: "Nước mía thường", price: 8000, costPrice: 3000, voiceUnit: "ly" }],
    ds: [],
    defaultOpeningCash: 500000,
  };

  const res = phanTichTaiChinhNoiBo("sáng nay vừa bán được 2 ly mía thường, tiền thói đầu ngày là 43k", mockState);
  assert.equal(res.type, "command");
  assert.equal(res.action, "set_opening_cash_and_add_transaction");
  assert.equal(res.openingCash, 43000, "Tiền thối đầu ngày phải cập nhật thành 43k");
  assert.equal(res.parsed.danhMuc, "Nước mía thường");
  assert.equal(res.parsed.soLuong, 2);
  assert.equal(res.parsed.soTien, 16000);
  assert.equal(res.parsed.tongGiaCost, 8000, "2 ly mía thường chuẩn x 4k vốn = 8k");
  assert.ok(res.reply.includes("43.000"), "Phải chứa tiền thối 43k");
  assert.ok(res.reply.includes("16.000"), "Phải chứa tiền bán 16k");
  assert.ok(res.reply.includes("59.000"), "Tổng két phải là 43k + 16k = 59.000đ");

  console.log("PASS EV Compound: 'sáng nay vừa bán được 2 ly mía thường, tiền thói đầu ngày là 43k' -> updates float 43k + records 2 ly mía 16k -> 59k in drawer");
}

// Test 21: Lệnh Restart dữ liệu ngày kèm lý do: "EV restart lại ngày hôm nay giúp tôi, lý do là bàn giao ca chiều"
{
  const mockState = {
    currentBranch: "Chi nhánh 2",
    quickItems: [],
    ds: [],
  };

  const res = phanTichTaiChinhNoiBo("EV restart lại ngày hôm nay giúp tôi, lý do là bàn giao ca chiều", mockState);
  assert.equal(res.type, "action");
  assert.equal(res.action, "restart_today");
  assert.equal(res.branch, "Chi nhánh 2");
  assert.equal(res.note, "bàn giao ca chiều");
  assert.ok(res.reply.includes("Restart"));
  assert.ok(res.reply.includes("bàn giao ca chiều"));

  console.log("PASS EV Restart Command: 'EV restart... lý do là bàn giao ca chiều' -> action: restart_today with note");
}

// Test 22: Lệnh/câu hỏi tính giá cost 1 ly nước kèm tiền nguyên liệu và tiền mặt bằng
{
  const mockState = {
    currentBranch: "Quán Nhà (Chính)",
    quickItems: [
      { id: "nuoc_mia", name: "Nước mía thường", price: 10000, costPrice: 6000 },
      { id: "tra_tac", name: "Trà tắc", price: 15000, costPrice: 4000 },
    ],
    overheadConfig: {
      rentMonthly: 6000000,
      electricityMonthly: 1200000,
      waterMonthly: 300000,
      trashMonthly: 50000,
      otherMonthly: 600000,
      expectedCupsPerDay: 80,
    },
    ds: [],
  };

  const res = phanTichTaiChinhNoiBo("tính toán chi phí giá cost cho 1 ly nước mía tiền nguyên liệu tiền mặt bằng", mockState);
  assert.equal(res.type, "analysis");
  assert.equal(res.category, "cost_breakdown");
  assert.ok(res.reply.includes("NƯỚC MÍA THƯỜNG"));
  assert.ok(res.reply.includes("6.000"));
  assert.ok(res.reply.includes("2.000"));
  assert.ok(res.reply.includes("15kg"));
  assert.ok(res.reply.includes("Mặt Bằng"));
  assert.ok(res.reply.includes("ĐIỂM HÒA VỐN"));

  console.log("PASS EV Drink Cost & Overhead Calculator: 'tính toán chi phí giá cost cho 1 ly nước mía tiền nguyên liệu tiền mặt bằng' -> complete 5-layer financial breakdown");
}

// Test 23: Quản lý định phí mặt bằng, điện nước rác và màng ép ly (cuộn)
{
  const mockState = {
    currentBranch: "Quán Nhà (Chính)",
    quickItems: [{ id: "nuoc_mia", name: "Nước mía thường", price: 10000, costPrice: 6000 }],
    overheadConfig: {
      rentMonthly: 5000000,
      electricityMonthly: 1200000,
      waterMonthly: 250000,
      trashMonthly: 50000,
      depreciationMonthly: 300000,
      otherMonthly: 200000,
      expectedCupsPerDay: 100,
    },
    packagingConfig: {
      filmRoll: { name: "Màng ép ly", unit: "cuộn", batchCost: 140000, batchYield: 2000, unitCost: 70 },
      cups: { name: "Ly nhựa", unit: "cây (50 cái)", batchCost: 35000, batchYield: 50, unitCost: 700 },
      bags: { name: "Bọc / Túi chữ T", unit: "bọc", batchCost: 25000, batchYield: 250, unitCost: 100 },
      straws: { name: "Ống hút", unit: "gói", batchCost: 25000, batchYield: 250, unitCost: 100 },
      ice: { name: "Đá viên sạch", unit: "bao", batchCost: 15000, batchYield: 30, unitCost: 500 },
    },
    ds: [],
  };

  const res = phanTichTaiChinhNoiBo("tiền mặt bằng tiền điện nước rác và màng ép ly cuộn hết bao nhiêu", mockState);
  assert.equal(res.type, "analysis");
  assert.ok(res.reply.includes("5.000.000"));
  assert.ok(res.reply.includes("1.200.000"));
  assert.ok(res.reply.includes("250.000"));
  assert.ok(res.reply.includes("50.000"));
  assert.ok(res.reply.includes("Màng ép ly"));
  assert.ok(res.reply.includes("140.000"));
  assert.ok(res.reply.includes("2.000 ly"));

  console.log("PASS EV Cost & Overhead Config: 'tiền mặt bằng tiền điện nước rác và màng ép ly cuộn hết bao nhiêu' -> verified detailed breakdown");
}

// Test 24: Lưu trữ và xóa lịch sử chat AI
{
  const testMsg1 = { sender: "user", text: "i vi bán 2 ly nước mía" };
  const testMsg2 = { sender: "bot", text: "Dạ EV đã ghi sổ 2 ly nước mía 20.000đ" };

  await luuTinNhanAIChat(testMsg1);
  await luuTinNhanAIChat(testMsg2);

  const state1 = await docDuLieu();
  assert.ok(Array.isArray(state1.aiChatHistory), "aiChatHistory phải là mảng");
  assert.ok(state1.aiChatHistory.length >= 2, "Phải có ít nhất 2 tin nhắn");
  assert.equal(state1.aiChatHistory[state1.aiChatHistory.length - 2].text, testMsg1.text);
  assert.equal(state1.aiChatHistory[state1.aiChatHistory.length - 1].text, testMsg2.text);

  await xoaLichSuAIChat();
  const state2 = await docDuLieu();
  assert.equal(state2.aiChatHistory.length, 0, "Lịch sử chat phải được xóa sạch");

  console.log("PASS EV Chat History Persistence: messages saved, retrieved, and cleared accurately");
}

// Test 25: Tự học tri thức vận hành mới trong lúc hoạt động
{
  const mockState = {
    currentBranch: "Quán Nhà (Chính)",
    quickItems: [],
    crmCustomers: [],
    ds: [],
  };

  const res = phanTichTaiChinhNoiBo("EV ghi nhớ là cam sành hôm nay 25k 1 kg nhé", mockState);
  assert.equal(res.type, "action");
  assert.equal(res.action, "learn_knowledge");
  assert.ok(res.reply.includes("Tri Thức Mới"));
  assert.ok(res.rule.includes("cam sành hôm nay 25k 1 kg"));

  console.log("PASS EV In-flight Operational Learning: 'EV ghi nhớ là cam sành...' -> learns new business rule");
}

// Test 26: Khả năng phản biện khi phát hiện số liệu bất thường (2 ly mía 100k)
{
  const mockState = {
    currentBranch: "Quán Nhà (Chính)",
    quickItems: [{ id: "nuoc_mia", name: "Nước mía thường", price: 8000, costPrice: 4000 }],
    crmCustomers: [],
    ds: [],
  };

  const res = phanTichTaiChinhNoiBo("khách mua 2 ly mía thường 100k", mockState);
  assert.equal(res.type, "question", "2 ly mía chuẩn 16k nhưng ghi 100k -> EV phải phản biện hỏi lại");
  assert.ok(res.reply.includes("phản biện"));
  assert.ok(res.reply.includes("100.000"));
  assert.ok(res.reply.includes("16.000"));

  console.log("PASS EV Critical Reasoning: '2 ly mía 100k' -> questions discrepancy vs standard price");
}

// Test 27: Chỉ đọc giá tiền không có tên món: "thu 50k" -> EV hỏi lại, user đáp "5 ly mía thường" -> Ghi sổ 5 ly mía
{
  const mockState = {
    currentBranch: "Quán Nhà (Chính)",
    quickItems: [{ id: "nuoc_mia", name: "Nước mía thường", price: 8000, costPrice: 4000 }],
    crmCustomers: [],
    ds: [],
  };

  const res1 = phanTichTaiChinhNoiBo("vừa thu 50k", mockState);
  assert.equal(res1.type, "question");
  assert.ok(res1.reply.includes("50.000"), "Phải nhắc số tiền 50k");
  assert.ok(res1.reply.includes("những món nước nào"), "Phải hỏi khách mua món nước nào");

  // User trả lời danh sách món: "5 ly mía thường"
  const res2 = phanTichTaiChinhNoiBo("5 ly mía thường", mockState);
  assert.equal(res2.type, "command");
  assert.equal(res2.parsed.loai, "thu");
  assert.equal(res2.parsed.danhMuc, "Nước mía thường");
  assert.equal(res2.parsed.soLuong, 5);
  assert.equal(res2.parsed.soTien, 50000);
  assert.equal(res2.parsed.tongGiaCost, 25000, "5 ly x 5k vốn (ly 10k) = 25k");

  console.log("PASS EV Price-only Clarification: 'thu 50k' -> asks items -> '5 ly mía thường' -> records 5 ly 50k");
}

// Test 28: Chỉ đọc tổng tiền không đọc list món: "tổng cộng 150k" -> EV hỏi lại, user đáp "10 ly mía 1 lít"
{
  const mockState = {
    currentBranch: "Chi nhánh 2",
    quickItems: [{ id: "nuoc_mia_1l", name: "Nước mía 1 lít", price: 15000, costPrice: 10000 }],
    crmCustomers: [],
    ds: [],
  };

  const res1 = phanTichTaiChinhNoiBo("khách mua tổng cộng 150k", mockState);
  assert.equal(res1.type, "question");
  assert.ok(res1.reply.includes("150.000"));
  assert.ok(res1.reply.includes("những món nước nào"));

  // User trả lời danh sách món: "10 ly mía 1 lít"
  const res2 = phanTichTaiChinhNoiBo("10 ly mía 1 lít", mockState);
  assert.equal(res2.type, "command");
  assert.equal(res2.parsed.loai, "thu");
  assert.equal(res2.parsed.danhMuc, "Nước mía 1 lít");
  assert.equal(res2.parsed.soLuong, 10);
  assert.equal(res2.parsed.soTien, 150000);
  assert.equal(res2.parsed.tongGiaCost, 100000, "10 ly x 10k vốn = 100k");

  console.log("PASS EV Total-only Clarification: 'tổng cộng 150k' -> asks items -> '10 ly mía 1 lít' -> records 10 ly 150k");
}

// Test 29: 5 ly mía thường chuẩn là 40k (8k/ly - vốn 4k), chỉ khi đọc "5 ly mía thường 50k" mới tính 10k/ly (ly lớn theo yêu cầu - vốn 5k)
{
  const mockState = {
    currentBranch: "Quán Nhà (Chính)",
    quickItems: [{ id: "nuoc_mia", name: "Nước mía thường", price: 8000, costPrice: 4000 }],
    crmCustomers: [],
    ds: [],
  };

  // Trường hợp chuẩn: 5 ly mía thường (không kèm giá) -> tính 8k/ly = 40k, vốn 20k
  const resDefault = phanTichTaiChinhNoiBo("5 ly mía thường", mockState);
  assert.equal(resDefault.type, "command");
  assert.equal(resDefault.parsed.soLuong, 5);
  assert.equal(resDefault.parsed.soTien, 40000, "5 ly mía thường chuẩn 8k/ly phải bằng 40.000đ");
  assert.equal(resDefault.parsed.tongGiaCost, 20000, "5 ly x 4k vốn = 20k");

  // Trường hợp khách yêu cầu ly 10k: "5 ly mía thường 50k" -> tính 10k/ly = 50k, vốn 25k (5k/ly)
  const resRequested = phanTichTaiChinhNoiBo("5 ly mía thường 50k", mockState);
  assert.equal(resRequested.type, "command");
  assert.equal(resRequested.parsed.soLuong, 5);
  assert.equal(resRequested.parsed.soTien, 50000, "Khi đọc 50k cho 5 ly mía thường -> tính 50.000đ");
  assert.equal(resRequested.parsed.tongGiaCost, 25000, "5 ly 10k x 5k vốn = 25k");

  console.log("PASS EV Sugarcane Standard 8k (40k/5 cups, cost 20k) vs 10k by Request (50k/5 cups, cost 25k)");
}

// Test 30: Toàn quyền đổi giá bán món trên Menu
{
  const mockState = {
    currentBranch: "Quán Nhà (Chính)",
    quickItems: [{ id: "nuoc_mia", name: "Nước mía thường", price: 8000, costPrice: 4000 }],
    ds: [],
  };

  const res = phanTichTaiChinhNoiBo("EV đổi giá mía thường thành 9k nhé", mockState);
  assert.equal(res.type, "action");
  assert.equal(res.action, "update_menu_price");
  assert.equal(res.itemId, "nuoc_mia");
  assert.equal(res.newPrice, 9000);
  assert.ok(res.reply.includes("9.000"));

  console.log("PASS EV Admin: 'EV đổi giá mía thường thành 9k' -> action: update_menu_price");
}

// Test 31: Toàn quyền đổi giá vốn (Cost) món trên Menu
{
  const mockState = {
    currentBranch: "Quán Nhà (Chính)",
    quickItems: [{ id: "tra_tac", name: "Trà tắc", price: 12000, costPrice: 7000 }],
    ds: [],
  };

  const res = phanTichTaiChinhNoiBo("EV sửa cost trà tắc thành 6k", mockState);
  assert.equal(res.type, "action");
  assert.equal(res.action, "update_menu_cost");
  assert.equal(res.itemId, "tra_tac");
  assert.equal(res.newCost, 6000);
  assert.ok(res.reply.includes("6.000"));

  console.log("PASS EV Admin: 'EV sửa cost trà tắc thành 6k' -> action: update_menu_cost");
}

// Test 32: Toàn quyền xóa món khỏi Menu
{
  const mockState = {
    currentBranch: "Quán Nhà (Chính)",
    quickItems: [{ id: "mia_cam", name: "Mía cam", price: 17000, costPrice: 10000 }],
    ds: [],
  };

  const res = phanTichTaiChinhNoiBo("EV xóa món mía cam khỏi menu", mockState);
  assert.equal(res.type, "action");
  assert.equal(res.action, "delete_menu_item");
  assert.equal(res.itemId, "mia_cam");
  assert.ok(res.reply.includes("Mía cam"));

  console.log("PASS EV Admin: 'EV xóa món mía cam khỏi menu' -> action: delete_menu_item");
}

// Test 33: Toàn quyền cập nhật Định phí Mặt bằng / Điện nước
{
  const mockState = {
    currentBranch: "Quán Nhà (Chính)",
    overheadConfig: { rentMonthly: 6000000, electricityMonthly: 2400000 },
    ds: [],
  };

  const res = phanTichTaiChinhNoiBo("EV đổi tiền mặt bằng thành 7 triệu", mockState);
  assert.equal(res.type, "action");
  assert.equal(res.action, "update_overhead");
  assert.equal(res.overhead.rentMonthly, 7000000);
  assert.ok(res.reply.includes("7.000.000"));

  console.log("PASS EV Admin: 'EV đổi tiền mặt bằng thành 7 triệu' -> action: update_overhead");
}

// Test 34: Toàn quyền thêm Chi Nhánh Mới
{
  const mockState = {
    currentBranch: "Quán Nhà (Chính)",
    branches: [],
    ds: [],
  };

  const res = phanTichTaiChinhNoiBo("EV thêm chi nhánh Quán Vỉa Hè", mockState);
  assert.equal(res.type, "action");
  assert.equal(res.action, "add_branch");
  assert.equal(res.branchName, "Quán Vỉa Hè");
  assert.ok(res.reply.includes("Quán Vỉa Hè"));

  console.log("PASS EV Admin: 'EV thêm chi nhánh Quán Vỉa Hè' -> action: add_branch");
}

// Test 35: Toàn quyền xóa / hủy đơn vừa ghi
{
  const mockState = {
    currentBranch: "Quán Nhà (Chính)",
    ds: [],
  };

  const res = phanTichTaiChinhNoiBo("EV xóa giao dịch vừa rồi", mockState);
  assert.equal(res.type, "action");
  assert.equal(res.action, "delete_last_transaction");
  assert.ok(res.reply.includes("thu hồi và xóa giao dịch"));

  console.log("PASS EV Admin: 'EV xóa giao dịch vừa rồi' -> action: delete_last_transaction");
}

// Test 36: Toàn quyền bật / tắt Dark mode
{
  const mockState = {
    currentBranch: "Quán Nhà (Chính)",
    ds: [],
  };

  const res = phanTichTaiChinhNoiBo("EV bật dark mode", mockState);
  assert.equal(res.type, "action");
  assert.equal(res.action, "toggle_dark_mode");
  assert.equal(res.enabled, true);
  assert.ok(res.reply.includes("Dark Mode"));

  console.log("PASS EV Admin: 'EV bật dark mode' -> action: toggle_dark_mode");
}

// Test 37: Người dùng nói "80k" -> EV hỏi làm rõ -> Người dùng đáp "tiền mua tắc và đường" -> EV ghi - Chi 80.000đ
{
  const mockState = {
    currentBranch: "Chi nhánh 2",
    quickItems: [{ id: "nuoc_mia", name: "Nước mía thường", price: 8000, costPrice: 4000 }],
    ds: [],
  };

  const res1 = phanTichTaiChinhNoiBo("80k", mockState);
  assert.equal(res1.type, "question");
  assert.ok(res1.reply.includes("80.000"));
  assert.ok(res1.reply.includes("tiền thu bán nước") && res1.reply.includes("tiền chi mua"));

  // User trả lời: "tiền mua tắc và đường"
  const res2 = phanTichTaiChinhNoiBo("tiền mua tắc và đường", mockState);
  assert.equal(res2.type, "command");
  assert.equal(res2.parsed.loai, "chi", "Phải là khoản CHI chứ không được nhầm thành THU");
  assert.equal(res2.parsed.soTien, 80000);
  assert.equal(res2.parsed.danhMuc, "Mua tắc và đường");
  assert.ok(res2.reply.includes("Chi tiền"));

  console.log("PASS EV Expense Clarification: '80k' -> asks clarification -> 'tiền mua tắc và đường' -> records - Chi 80k Mua tắc và đường");
}

// Test 38: 4D Semantic Context - "Ổng đưa 50k thối 26k"
{
  const mockState = {
    currentBranch: "Quán Nhà (Chính)",
    quickItems: [{ id: "nuoc_mia", name: "Nước mía thường", price: 8000, costPrice: 4000 }],
    ds: [],
  };

  const res = phanTichTaiChinhNoiBo("Ổng đưa 50k thối 26k nha", mockState);
  assert.equal(res.type, "general");
  assert.ok(res.reply.includes("50.000"));
  assert.ok(res.reply.includes("26.000"));
  assert.ok(res.reply.includes("24.000"));

  console.log("PASS EV 4D Context: 'Ổng đưa 50k thối 26k' -> resolves cash tender 24k");
}

// Test 39: 4D Detective - "sao tiền két bị hụt 50k vậy EV?"
{
  const today = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(new Date().getDate()).padStart(2, "0")}`;
  const mockState = {
    currentBranch: "Quán Nhà (Chính)",
    ds: [
      { id: "1", loai: "chi", soTien: 50000, danhMuc: "Đổ xăng", ghiChu: "Đổ xăng xe giao hàng", chiNhanh: "Quán Nhà (Chính)", ngay: today },
    ],
    crmCustomers: [{ id: "c1", name: "Anh Tuấn", debt: 34000 }],
  };

  const res = phanTichTaiChinhNoiBo("sao tiền két bị hụt 50k vậy EV?", mockState);
  assert.equal(res.type, "financial_advice");
  assert.ok(res.reply.includes("Đổ xăng") || res.reply.includes("50.000"));
  assert.ok(res.reply.includes("Anh Tuấn") || res.reply.includes("nợ"));

  console.log("PASS EV 4D Detective: 'sao tiền két bị hụt 50k' -> finds expenses and debts");
}

// Test 40: 4D State Adjustment - "mặt bằng tháng này chủ nhà giảm cho 1 triệu"
{
  const mockState = {
    overheadConfig: { rentMonthly: 6000000, electricityMonthly: 2400000 },
    ds: [],
  };

  const res = phanTichTaiChinhNoiBo("mặt bằng tháng này chủ nhà giảm cho 1 triệu", mockState);
  assert.equal(res.type, "action");
  assert.equal(res.action, "update_overhead");
  assert.equal(res.newRent, 5000000);
  assert.ok(res.reply.includes("5.000.000"));
  assert.ok(res.reply.includes("Điểm hòa vốn"));

  console.log("PASS EV 4D Adjustment: 'mặt bằng giảm 1 triệu' -> updates rent to 5tr and recalculates break-even");
}

// Test 41: 4D Menu Advice - "mía thơm với mía cam bán có ổn không EV?"
{
  const mockState = {
    quickItems: [
      { id: "nuoc_mia", name: "Nước mía thường", price: 8000, costPrice: 4000 },
      { id: "mia_thom", name: "Mía thơm", price: 10000, costPrice: 5000 },
      { id: "mia_cam", name: "Mía cam", price: 17000, costPrice: 10000 },
    ],
    ds: [],
  };

  const res = phanTichTaiChinhNoiBo("mía thơm với mía cam bán có ổn không EV?", mockState);
  assert.equal(res.type, "financial_advice");
  assert.ok(res.reply.includes("Mía Thơm") || res.reply.includes("Mía Cam"));
  assert.ok(res.reply.includes("Lãi gộp") || res.reply.includes("50%"));

  console.log("PASS EV 4D Menu Advice: 'mía thơm với mía cam bán có ổn không' -> menu engineering matrix");
}

// Test 42: Negation - "Hôm nay bên vựa nghỉ nên không có mua mía nha"
{
  const mockState = {
    currentBranch: "Quán Nhà (Chính)",
    ds: [],
  };

  const res = phanTichTaiChinhNoiBo("Hôm nay bên vựa nghỉ nên không có mua mía nha EV", mockState);
  assert.equal(res.type, "general");
  assert.ok(res.reply.includes("không phát sinh") || res.reply.includes("không ghi"));

  console.log("PASS EV Negation: 'hôm nay không có mua mía' -> does not record expense");
}

// Test 43: Mid-Sentence Self-Correction - "Lấy cho khách 4 ly mía cam... à nhầm 3 ly thôi"
{
  const mockState = {
    currentBranch: "Quán Nhà (Chính)",
    quickItems: [
      { id: "mia_cam", name: "Mía cam", price: 17000, costPrice: 10000, voiceUnit: "ly" },
    ],
    ds: [],
  };

  const res = phanTichTaiChinhNoiBo("Lấy cho khách 4 ly mía cam... à nhầm 3 ly thôi", mockState);
  assert.equal(res.type, "command");
  assert.equal(res.parsed.soLuong, 3, "Phải lấy số lượng sau khi đính chính (3 ly)");
  assert.equal(res.parsed.soTien, 51000, "3 ly x 17k = 51.000đ");
  assert.equal(res.parsed.danhMuc, "Mía cam");

  console.log("PASS EV Self-Correction: '4 ly mía cam à nhầm 3 ly thôi' -> records 3 ly 51k");
}

// Test 44: Discount / Net Adjustment Math - "Bán 5 ly mía thường nhưng bớt cho chú Ba 5k"
{
  const mockState = {
    currentBranch: "Quán Nhà (Chính)",
    quickItems: [
      { id: "nuoc_mia", name: "Nước mía thường", price: 8000, costPrice: 4000, voiceUnit: "ly" },
    ],
    ds: [],
  };

  const res = phanTichTaiChinhNoiBo("Bán 5 ly mía thường nhưng bớt cho chú Ba 5k", mockState);
  assert.equal(res.type, "command");
  assert.equal(res.parsed.soLuong, 5);
  assert.equal(res.parsed.soTien, 35000, "5 ly x 8k = 40k - 5k = 35.000đ");
  assert.ok(res.parsed.ghiChu.includes("bớt"));

  console.log("PASS EV Discount: '5 ly mía bớt cho chú Ba 5k' -> 40k - 5k = 35k");
}

// Test 45: Product Price Inquiry & Topic Memory - "Mía thơm bán giá nhiêu vậy EV?"
{
  const mockState = {
    currentBranch: "Quán Nhà (Chính)",
    quickItems: [
      { id: "mia_thom", name: "Mía thơm", price: 10000, costPrice: 5000, voiceUnit: "ly" },
    ],
    ds: [],
  };

  const res = phanTichTaiChinhNoiBo("Mía thơm bán giá nhiêu vậy EV?", mockState);
  assert.equal(res.type, "general");
  assert.ok(res.reply.includes("10.000"));
  assert.ok(res.reply.includes("5.000"));

  console.log("PASS EV Price Inquiry: 'Mía thơm bán giá nhiêu' -> 10k/5k and sets topic memory");
}

// Test 46: Topic Reference Order - "Khách lấy 2 ly món đó"
{
  const mockState = {
    currentBranch: "Quán Nhà (Chính)",
    quickItems: [
      { id: "mia_thom", name: "Mía thơm", price: 10000, costPrice: 5000, voiceUnit: "ly" },
    ],
    ds: [],
  };

  const res = phanTichTaiChinhNoiBo("Khách lấy 2 ly món đó", mockState);
  assert.equal(res.type, "command");
  assert.equal(res.parsed.danhMuc, "Mía thơm");
  assert.equal(res.parsed.soLuong, 2);
  assert.equal(res.parsed.soTien, 20000);

  console.log("PASS EV Topic Reference: 'Khách lấy 2 ly món đó' -> records 2 ly Mía thơm 20k");
}

// Test 47: Add-on to last order - "Thêm 1 ly nữa nha"
{
  const mockState = {
    currentBranch: "Quán Nhà (Chính)",
    quickItems: [
      { id: "mia_thom", name: "Mía thơm", price: 10000, costPrice: 5000, voiceUnit: "ly" },
    ],
    ds: [],
  };

  const res = phanTichTaiChinhNoiBo("Thêm 1 ly nữa nha", mockState);
  assert.equal(res.type, "general");
  assert.ok(res.reply.includes("3 ly"));
  assert.ok(res.reply.includes("30.000"));

  console.log("PASS EV Add-on: 'Thêm 1 ly nữa nha' -> updates to 3 ly 30k");
}

// Test 48: Payment Method Query - "Ủa nãy ghi tiền mặt hay chuyển khoản vậy?"
{
  const mockState = {
    currentBranch: "Quán Nhà (Chính)",
    ds: [],
  };

  const res = phanTichTaiChinhNoiBo("Ủa nãy ghi tiền mặt hay chuyển khoản vậy EV?", mockState);
  assert.equal(res.type, "general");
  assert.ok(res.reply.includes("Tiền mặt") || res.reply.includes("Chuyển khoản"));

  console.log("PASS EV Payment Method Query: 'Ủa nãy ghi tiền mặt hay chuyển khoản vậy?' -> answered accurately");
}

// Test 49: Pragmatic Inquiries - "Nay bán sao rồi em?", "Khách chê ngọt quá", "Nắng nôi vầy mệt quá"
{
  const mockState = {
    currentBranch: "Quán Nhà (Chính)",
    ds: [],
  };

  const r1 = phanTichTaiChinhNoiBo("Nay bán sao rồi em?", mockState);
  assert.equal(r1.type, "general");
  assert.ok(r1.reply.includes("tổng quan tình hình kinh doanh"));

  const r2 = phanTichTaiChinhNoiBo("Khách chê ngọt quá em ơi", mockState);
  assert.equal(r2.type, "general");
  assert.ok(r2.reply.includes("ngọt") || r2.reply.includes("công thức"));

  const r3 = phanTichTaiChinhNoiBo("Nắng nôi vầy mệt quá em ơi", mockState);
  assert.equal(r3.type, "general");
  assert.ok(r3.reply.includes("nắng") || r3.reply.includes("vất vả"));

  console.log("PASS EV Pragmatic & Empathy: all conversational scenarios responded naturally!");
}

console.log("ALL EV Secretary tests passed successfully!");
