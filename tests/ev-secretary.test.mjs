import assert from "node:assert/strict";
import { phanTichChiTiet, stripWakeWordAndBranch } from "../www/js/parser.js";
import { phanTichTaiChinhNoiBo } from "../www/js/ai-assistant.js";

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

console.log("ALL EV Secretary tests passed successfully!");
