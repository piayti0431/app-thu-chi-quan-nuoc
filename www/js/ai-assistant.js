import { dailyReport, docSoTienTiengViet, formatReportDate } from "./report.js";
import { phanTichChiTiet, phanTichNhieu, stripWakeWordAndBranch } from "./parser.js";
import { luuKhachQuen, luuTriThucEV } from "./db.js";

const moneyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

function formatMoney(v) {
  return moneyFormatter.format(Number(v) || 0).replace("₫", "đ");
}

function todayKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function normalizeQuery(text) {
  const { cleanText } = stripWakeWordAndBranch(text);
  return String(cleanText || text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .replace(/\s+/g, " ")
    .trim();
}

function capitalizeWords(str) {
  return String(str || "")
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function extractMoneyFromText(text) {
  const norm = String(text || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[đĐ]/g, "d");

  // 10k, 10 nghin, 10 ngan
  const kMatch = norm.match(/(\d+)\s*(?:k|nghin|ngan)/);
  if (kMatch) return Number(kMatch[1]) * 1000;

  // 10.000, 100.000
  const dotMatch = norm.match(/(\d{1,3}(?:\.\d{3})+)/);
  if (dotMatch) return Number(dotMatch[1].replace(/\./g, ""));

  // 10000
  const rawNumMatch = norm.match(/(\d{4,9})/);
  if (rawNumMatch) return Number(rawNumMatch[1]);

  // Small number after price keyword: gia 10 -> 10000
  const smallKMatch = norm.match(/(?:gia|ban|tien|la|cost|von|moi bao|moi ly|1 bao|1 ly)\s*(\d+)/);
  if (smallKMatch) {
    const val = Number(smallKMatch[1]);
    return val < 100 ? val * 1000 : val;
  }

  return 0;
}

// THUẬT TOÁN NÉN NGỮ CẢNH RTK (TOKEN KILLER)
export function compressStateWithRTK(state, todayReport, b1Report, b2Report) {
  // 1. Nén Menu (High-density string)
  const menuCompressed = (state.quickItems || [])
    .map((item) => `${item.name}:${Math.round(item.price / 1000)}k/${Math.round((item.costPrice || 0) / 1000)}k`)
    .join(",");

  // 2. Nén CRM Khách Quen
  const crmCompressed = (state.crmCustomers || [])
    .map((c) => `${c.name}:${c.defaultDrink || "Mía"},${c.defaultQty || 1}ly,${Math.round((c.price || 10000) / 1000)}k,${c.paymentMethod === "chuyen_khoan" ? "CK" : "TM"}`)
    .join("|");

  // 3. Nén Tài chính thời gian thực
  const finCompressed = `QuánNhà(T:${Math.round(b1Report.income / 1000)}k,C:${Math.round(b1Report.expense / 1000)}k,L:${Math.round(b1Report.balance / 1000)}k)|Quán2(T:${Math.round(b2Report.income / 1000)}k,C:${Math.round(b2Report.expense / 1000)}k,L:${Math.round(b2Report.balance / 1000)}k)|Tổng(T:${Math.round(todayReport.income / 1000)}k,C:${Math.round(todayReport.expense / 1000)}k,L:${Math.round(todayReport.balance / 1000)}k,Két:${Math.round(todayReport.expectedCashInDrawer / 1000)}k)`;

  return {
    menu: `Menu[${menuCompressed}]`,
    crm: `KháchQuen[${crmCompressed}]`,
    finance: `HômNay[${finCompressed}]`,
  };
}

// BỘ NHỚ NGỮ CẢNH HỘI THOẠI CỦA THƯ KÝ EV
export const conversationContext = {
  lastTransaction: null,
  pendingQuestion: null,
  pendingDiscrepancy: null,
  pendingMissingItems: null,
};

export function phanTichTaiChinhNoiBo(query, state) {
  const { branch: detectedBranch } = stripWakeWordAndBranch(query);
  const norm = normalizeQuery(query);
  const today = todayKey();
  const transactions = (state.ds || []).filter((tx) => !tx.deleted);
  const customers = state.crmCustomers || [];

  // Multi-branch handling
  const isAllBranches = norm.includes("2 chi nhanh") || norm.includes("ca 2 quan") || norm.includes("2 quan") || norm.includes("tat ca");
  const targetBranch = isAllBranches ? null : (detectedBranch || (norm.includes("chi nhanh 2") ? "Chi nhánh 2" : (norm.includes("chi nhanh 1") ? "Quán Nhà (Chính)" : null)));

  const todayReport = dailyReport(transactions, today, targetBranch, state.defaultOpeningCash || 500000);
  const b1Report = dailyReport(transactions, today, "Quán Nhà (Chính)", state.defaultOpeningCash || 500000);
  const b2Report = dailyReport(transactions, today, "Chi nhánh 2", state.defaultOpeningCash || 500000);

  // 1. TỰ HỌC THÔNG TIN KHÁCH QUEN QUA CHAT (IN-CHAT CRM LEARNING)
  const isLearnCustomer =
    (norm.includes("nho la") || norm.includes("ghi nho") || norm.includes("luu lai") || norm.includes("day ev") || norm.includes("hoc nhe") || norm.includes("nho nhe")) &&
    (/\b(chu|anh|chi|bac|co|em|khach)\b/.test(norm)) &&
    (norm.includes("uong") || norm.includes("lay") || norm.includes("hay") || norm.includes("quen"));

  if (isLearnCustomer) {
    let custName = "Khách Quen";
    const nameMatch = query.match(/(?:chú|chu|anh|chị|chi|bác|bac|cô|co)\s+([^,;:\n]+?)(?:\s+đối diện|\s+kế bên|\s+hay|\s+thường|\s+uống|\s+lấy)/i);
    if (nameMatch) {
      custName = capitalizeWords(nameMatch[0].replace(/\s+(hay|thường|uống|lấy)$/i, "").trim());
    }

    const price = extractMoneyFromText(query) || 10000;
    const isCK = norm.includes("chuyen khoan") || norm.includes("ck") || norm.includes("qr");
    const paymentMethod = isCK ? "chuyen_khoan" : "tien_mat";

    let drink = "Nước mía thường";
    if (norm.includes("mia cam")) drink = "Mía cam";
    else if (norm.includes("tra tac") || norm.includes("tac")) drink = "Trà tắc";
    else if (norm.includes("rau ma dau") || norm.includes("ma dau")) drink = "Rau má đậu xanh";
    else if (norm.includes("rau ma sua") || norm.includes("ma sua")) drink = "Rau má sữa";
    else if (norm.includes("rau ma")) drink = "Rau má tươi";
    else if (norm.includes("nuoc cam") || norm.includes("cam")) drink = "Nước cam";
    else if (norm.includes("1 lit") || norm.includes("lit")) drink = "Nước mía 1 lít";

    const newCustomer = {
      id: `cust_${Date.now()}`,
      name: custName,
      aliases: [custName.toLowerCase(), normalizeQuery(custName)],
      defaultDrink: drink,
      defaultQty: 1,
      price,
      paymentMethod,
      note: query,
      debt: 0,
    };

    return {
      type: "action",
      action: "learn_customer",
      customer: newCustomer,
      reply: `📝 **Dạ EV đã ghi nhớ vào Sổ tay Khách Quen thành công**:
- 👤 **Khách hàng**: **${custName}**
- 🥤 **Món quen thuộc**: **${drink}** (${formatMoney(price)})
- 💳 **Thanh toán**: ${isCK ? "Chuyển khoản QR" : "Tiền mặt"}

*Lần sau anh/chị chỉ cần bảo "${custName} lấy như cũ" hoặc "${custName} lấy 2 ly", EV sẽ tự động ghi sổ chuẩn xác ngay ạ!*`,
    };
  }

  // 1.1 TỰ HỌC TRI THỨC VẬN HÀNH, GIÁ CẢ & ĐỊNH MỚI TRONG LÚC HOẠT ĐỘNG (IN-FLIGHT OPERATIONAL KNOWLEDGE)
  const isLearnRule =
    (norm.includes("nho la") || norm.includes("ghi nho") || norm.includes("luu lai") || norm.includes("day ev") || norm.includes("tu nay") || norm.includes("tu hom nay") || norm.includes("nho nhe")) &&
    !isLearnCustomer &&
    (norm.includes("gia") || norm.includes("tien") || norm.includes("von") || norm.includes("cost") || norm.includes("mat bang") || norm.includes("dien") || norm.includes("nuoc") || /\b(da|da vien|da bao)\b/.test(norm) || norm.includes("quy tac") || norm.includes("luat") || norm.includes("kg") || norm.includes("bao") || norm.includes("moi ngay") || norm.includes("1 thang"));

  if (isLearnRule) {
    const cleanRule = query.replace(/^(?:ev|i\s*vi|e\s*vi|ê\s*vi|evi)?\s*(?:ơi|oi|nhé|nhe|giúp|cho)?\s*(?:nhớ\s+là|ghi\s+nhớ|lưu\s+lại|từ\s+nay|từ\s+hôm\s+nay)?\s*/i, "").trim();
    return {
      type: "action",
      action: "learn_knowledge",
      rule: cleanRule || query,
      reply: `🧠 **Dạ EV đã nạp và ghi nhớ Tri Thức Mới vào bộ não thành công**:
- 📌 **Nội dung tiếp thu**: *"${cleanRule || query}"*
- 💡 **Khả năng áp dụng**: EV sẽ tự động áp dụng thông tin này vào các phép tính giá vốn, kiểm soát hao hụt và phản biện số liệu cho các ca bán hàng tiếp theo ạ!`,
    };
  }

  // 2. LỆNH RESTART / LÀM MỚI DỮ LIỆU TRONG NGÀY KÈM GHI CHÚ
  if (norm.includes("restart") || norm.includes("reset ngay") || norm.includes("lam moi ngay") || norm.includes("khoi dong lai ngay")) {
    const isExplicitAll = norm.includes("tat ca") || norm.includes("2 quan") || norm.includes("ca 2 quan") || norm.includes("toan he thong");
    const branchToReset = isExplicitAll ? "all" : (targetBranch || state.currentBranch || "all");

    let note = "Khởi động lại qua lệnh Thư Ký EV";
    const noteMatch = query.match(/(?:lý do|ly do|note|ghi chú|ghi chu|vì|vi|là|la)\s+(.+)$/i);
    if (noteMatch) {
      note = noteMatch[1].replace(/^(?:là|la|:\s*)\s*/i, "").trim();
    }

    return {
      type: "action",
      action: "restart_today",
      branch: branchToReset,
      note,
      reply: `🔄 **Dạ EV đã khởi động lại (Restart) dữ liệu hôm nay thành công**:
- 📍 **Phạm vi**: **${branchToReset === "all" ? "Tất cả điểm bán" : branchToReset}**
- 📝 **Ghi chú/Lý do**: *"${note}"*
- 📊 **Doanh thu hôm nay**: Đã làm mới về **0đ** để bắt đầu ca mới!

*Toàn bộ dữ liệu trước đó đã được lưu vào nhật ký lưu trữ (Audit Log) an toàn!*`,
    };
  }

  // 3. TÍNH TOÁN CHI PHÍ GIÁ COST 1 LY NƯỚC, TIỀN NGUYÊN LIỆU, MẶT BẰNG, ĐIỆN NƯỚC RÁC & VẬT TƯ (MÀNG ÉP CUỘN, LY, BỌC, ỐNG HÚT)
  if (
    (norm.includes("tinh cost") || norm.includes("gia cost") || norm.includes("tinh gia von") || norm.includes("chi phi 1 ly") || norm.includes("chi phi mot ly") || norm.includes("tien mat bang") || norm.includes("tien dien") || norm.includes("tien nuoc") || norm.includes("tien rac") || norm.includes("mang ep") || norm.includes("cuon mang") || norm.includes("tien nguyen lieu") || norm.includes("gia von 1 ly") || norm.includes("cost 1 ly")) &&
    (norm.includes("ly") || norm.includes("nuoc") || norm.includes("mia") || norm.includes("cam") || norm.includes("tac") || norm.includes("rau ma") || norm.includes("quan") || norm.includes("thang") || norm.includes("cuon"))
  ) {
    const quickItems = state.quickItems || [];
    const overhead = state.overheadConfig || {
      rentMonthly: 6000000,
      electricityMonthly: 1000000,
      waterMonthly: 300000,
      trashMonthly: 50000,
      depreciationMonthly: 300000,
      otherMonthly: 150000,
      expectedCupsPerDay: 80,
    };
    const packaging = state.packagingConfig || {
      filmRoll: { name: "Màng ép ly", unit: "cuộn", batchCost: 140000, batchYield: 2000, unitCost: 70 },
      cups: { name: "Ly nhựa", unit: "cây (50 cái)", batchCost: 35000, batchYield: 50, unitCost: 700 },
      bags: { name: "Bọc / Túi chữ T", unit: "bọc", batchCost: 25000, batchYield: 250, unitCost: 100 },
      straws: { name: "Ống hút", unit: "gói", batchCost: 25000, batchYield: 250, unitCost: 100 },
      ice: { name: "Đá viên sạch", unit: "bao", batchCost: 15000, batchYield: 30, unitCost: 500 },
    };

    // Find requested drink or default to "Nước mía thường"
    let targetDrink = quickItems.find((q) => norm.includes(q.name.toLowerCase()) || norm.includes(q.shortName?.toLowerCase()));
    if (!targetDrink) {
      if (norm.includes("cam")) targetDrink = quickItems.find((q) => q.name.includes("cam"));
      else if (norm.includes("tac")) targetDrink = quickItems.find((q) => q.name.includes("tắc"));
      else if (norm.includes("rau ma")) targetDrink = quickItems.find((q) => q.name.includes("Rau má"));
      else targetDrink = quickItems[0] || { name: "Nước mía thường", price: 10000, costPrice: 3500 };
    }

    const sellingPrice = targetDrink.price || 10000;
    const cogs = targetDrink.costPrice || 3500;
    const rent = overhead.rentMonthly ?? 6000000;
    const elec = overhead.electricityMonthly ?? 1000000;
    const water = overhead.waterMonthly ?? 300000;
    const trash = overhead.trashMonthly ?? 50000;
    const other = (overhead.depreciationMonthly || 0) + (overhead.otherMonthly || 0) || 450000;
    const totalOverhead = rent + elec + water + trash + other;

    const monthlyCups = (overhead.expectedCupsPerDay || 80) * 30;
    const overheadPerCup = Math.round(totalOverhead / (monthlyCups || 1));
    const totalCost = cogs + overheadPerCup;
    const netProfit = sellingPrice - totalCost;
    const grossProfit = sellingPrice - cogs;
    const breakEvenDay = grossProfit > 0 ? Math.ceil(totalOverhead / grossProfit / 30) : 0;
    const cogsPercent = sellingPrice > 0 ? ((cogs / sellingPrice) * 100).toFixed(1) : "0.0";
    const overheadPercent = sellingPrice > 0 ? ((overheadPerCup / sellingPrice) * 100).toFixed(1) : "0.0";
    const netPercent = sellingPrice > 0 ? ((netProfit / sellingPrice) * 100).toFixed(1) : "0.0";
    const totalCostPercent = sellingPrice > 0 ? ((totalCost / sellingPrice) * 100).toFixed(1) : "0.0";

    const filmCost = packaging.filmRoll?.unitCost || 23;
    const cupCost = packaging.cups?.unitCost || 500;
    const bagCost = packaging.bags?.unitCost || 100;
    const strawCost = packaging.straws?.unitCost || 135;
    const iceCost = packaging.ice?.unitCost || 500;
    const totalPackCost = 1000;

    let ingredientDetail = `   - 📦 **Bao bì, màng ép miệng ly, ống hút & đá viên**: Gộp chung cố định ➔ **1.000 đ / phần** (riêng mía 1L không đá vẫn tính chung 1.000đ).
   - 📜 **Màng ép ly**: 1 cuộn (${formatMoney(packaging.filmRoll?.batchCost || 45000)}) ép ~${(packaging.filmRoll?.batchYield || 2000).toLocaleString("vi-VN")} ly.
   - 🍃 **Cốt nguyên liệu & hương vị**: ➔ **${formatMoney(Math.max(0, cogs - 1000))} / phần**.`;

    if (targetDrink.id === "nuoc_mia_1l" || targetDrink.name.toLowerCase().includes("1 lít")) {
      ingredientDetail = `   - 🎋 **Mía cây tươi nguyên chất (~1.3kg mía không đá)**: ➔ **9.000 đ / chai**.
   - 📦 **Bao bì, màng ép miệng ly & ống hút (không đá tính chung)**: ➔ **1.000 đ / chai** (Màng ép ly: ${formatMoney(packaging.filmRoll?.batchCost || 45000)}/cuộn ép ~${(packaging.filmRoll?.batchYield || 2000).toLocaleString("vi-VN")} ly).`;
    } else if (targetDrink.id === "nuoc_mia" || targetDrink.name.toLowerCase().includes("mía")) {
      ingredientDetail = `   - 🎋 **Mía cây tươi (1 bó 12 cây 90k = 15kg ~ 45 ly)**: ➔ **2.000 đ / ly** (~0.33kg mía).
   - 🍋 **Trái tắc thơm kèm**: ➔ **1.000 đ / ly**.
   - 📦 **Bao bì, màng ép miệng ly, ống hút & đá viên (tính chung)**: ➔ **1.000 đ / ly** (Màng ép ly: ${formatMoney(packaging.filmRoll?.batchCost || 45000)}/cuộn ép ~${(packaging.filmRoll?.batchYield || 2000).toLocaleString("vi-VN")} ly).`;
    }

    const breakEvenRevenueDay = Math.ceil((totalOverhead / 30) / 0.50);

    return {
      type: "analysis",
      category: "cost_breakdown",
      reply: `🧮 **BẢNG PHÂN TÍCH CHI PHÍ GIÁ COST, MẶT BẰNG & VẬT TƯ 1 LY [${targetDrink.name.toUpperCase()}]**:

1. 💵 **Giá Bán Ra**: **${formatMoney(sellingPrice)}** / ly (100%)
2. 📦 **Tiền Vốn Nguyên Liệu & Bao Bì (COGS)**: **${formatMoney(cogs)}** (${cogsPercent}%)
${ingredientDetail}
   *(Tổng vốn bao bì đóng gói chuẩn: ~${formatMoney(totalPackCost)}/ly)*
3. 🏢 **Phân Bổ Định Phí Mặt Bằng & Vận Hành**: **${formatMoney(overheadPerCup)}** (${overheadPercent}%)
   - 🏠 Tiền thuê mặt bằng: **${formatMoney(rent)}** / tháng
   - ⚡ Tiền điện: **${formatMoney(elec)}** / tháng | 💧 Tiền nước: **${formatMoney(water)}** / tháng
   - 🗑️ Tiền rác & vệ sinh: **${formatMoney(trash)}** / tháng | ⚙️ Khấu hao & khác: **${formatMoney(other)}** / tháng
   ➔ *Tổng định phí: **${formatMoney(totalOverhead)}/tháng** chia cho **${overhead.expectedCupsPerDay || 80} ly/ngày**.*
4. 🎯 **TỔNG CHI PHÍ THỰC TẾ 1 LY**: **${formatMoney(totalCost)}** (${totalCostPercent}%)
5. 💰 **LỢI NHUẬN RÒNG TRÊN 1 LY**: **+${formatMoney(netProfit)}** (Tỷ suất sinh lời: **${netPercent}%**)

⚖️ **ĐIỂM HÒA VỐN TOÀN QUÁN (THEO TỔNG TIỀN DOANH THU & SỐ LY)**:
- 🎯 **Doanh thu hòa vốn mỗi ngày**: Cần đạt tối thiểu **~${formatMoney(breakEvenRevenueDay)} / ngày** tổng tiền bán tất cả các món nước trong menu (với biên lãi gộp bình quân ~50%).
- 🥤 Tương đương bán tối thiểu **${breakEvenDay} ly [${targetDrink.name}] / ngày** để bù đủ toàn bộ tiền mặt bằng (200k), tiền điện 30 ký, nước và chi phí phát sinh.
- 💰 **Bất kỳ đồng doanh thu nào vượt mốc ${formatMoney(breakEvenRevenueDay)} trong ngày là TIỀN LỜI RÒNG BỎ TÚI TRỌN VẸN!**

*(Anh/Chị có thể bấm vào mục **"🏢 Quản Lý Tiền Vốn & Mặt Bằng"** trong Cài Đặt để điều chỉnh tiền thuê mặt bằng, điện nước hoặc giá cuộn màng ép ly bất kỳ lúc nào ạ!)*`,
    };
  }

  // 4. THIẾT LẬP TIỀN THỐI ĐẦU NGÀY (KÈM HOẶC KHÔNG KÈM GIAO DỊCH BÁN HÀNG)
  // Ví dụ 1: "sáng nay vừa bán được 2 ly mía thường, tiền thói đầu ngày là 43k"
  // Ví dụ 2: "tiền thối đầu ngày hôm nay là 100k"
  const hasOpeningCashPhrase =
    (norm.includes("tien thoi") || norm.includes("thoi dau ngay") || norm.includes("dau ngay")) &&
    (/\b(?:la|con|set|chinh|de|co)\s*\d+/i.test(norm) || /\d+\s*(?:k|nghin|ngan|\.000)/i.test(norm));

  if (hasOpeningCashPhrase) {
    const floatMatch =
      query.match(/(?:tiền\s+thối|tiền\s+thói|thối|thói|đầu\s+ngày|dau\s+ngay)[^\d]*(\d+(?:[\.,]\d+)?\s*(?:k|nghìn|ngàn|\.000)?)/i) ||
      query.match(/(\d+(?:[\.,]\d+)?\s*(?:k|nghìn|ngàn|\.000)?)[^\d]*(?:tiền\s+thối|tiền\s+thói|thối|thói)/i);

    let extractedOpeningCash = 0;
    if (floatMatch) {
      extractedOpeningCash = extractMoneyFromText(floatMatch[1] || floatMatch[0]);
    }

    if (extractedOpeningCash > 0) {
      const cleanTxQuery = query
        .replace(/(?:tiền\s+thối|tiền\s+thói|thối|thói)\s+(?:đầu\s+ngày\s+)?(?:là\s+|con\s+|được\s+)?\d+\s*(?:k|nghìn|ngàn|\.000)?/gi, "")
        .replace(/(?:đầu\s+ngày|dau\s+ngay)\s+(?:là\s+)?\d+\s*(?:k|nghìn|ngàn|\.000)?/gi, "")
        .replace(/[,;]\s*$/g, "")
        .trim();

      const branchToUse = targetBranch || state.currentBranch || "Quán Nhà (Chính)";
      const parsedTx = cleanTxQuery ? phanTichChiTiet(cleanTxQuery, state.quickItems || []) : null;

      if (parsedTx && (parsedTx.soTien > 0 || (parsedTx.loai === "thu" && parsedTx.slots?.productId))) {
        const isThu = parsedTx.loai === "thu";
        const totalCashInDrawer = isThu
          ? extractedOpeningCash + (parsedTx.phuongThuc === "tien_mat" ? parsedTx.soTien : 0)
          : Math.max(0, extractedOpeningCash - parsedTx.soTien);

        return {
          type: "command",
          action: "set_opening_cash_and_add_transaction",
          openingCash: extractedOpeningCash,
          branch: branchToUse,
          parsed: {
            ...parsedTx,
            chiNhanh: branchToUse,
          },
          reply: `🏦 **Dạ EV đã cập nhật Tiền Thối Đầu Ngày và Ghi Sổ Bán Hàng**:
- 💵 **Tiền thối đầu ngày**: **${formatMoney(extractedOpeningCash)}** (Đã cập nhật)
- ${isThu ? "🥤 **Món vừa bán**" : "🧊 **Khoản vừa chi**"}: **${parsedTx.danhMuc}** (${parsedTx.soLuong} ${parsedTx.donViTinh || "ly"}) ➔ **${isThu ? "+" : "-"}${formatMoney(parsedTx.soTien)}** (${parsedTx.phuongThuc === "chuyen_khoan" ? "Chuyển khoản QR" : "Tiền mặt"})
- 🧊 **Giá vốn (Cost)**: ${formatMoney(parsedTx.tongGiaCost)}
--------------------------------------------------
💰 **TỔNG TIỀN MẶT CẦN CÓ TRONG KÉT**: **${formatMoney(totalCashInDrawer)}**
*(${formatMoney(extractedOpeningCash)} tiền thối ${isThu ? "+" : "-"} ${formatMoney(parsedTx.soTien)} = ${formatMoney(totalCashInDrawer)})*
📍 **Điểm bán**: **${branchToUse}**`,
        };
      } else {
        return {
          type: "action",
          action: "set_opening_cash",
          openingCash: extractedOpeningCash,
          branch: branchToUse,
          reply: `🏦 **Dạ EV đã cập nhật Tiền Thối Đầu Ngày hôm nay**:
- 💵 **Số tiền thối đầu ca**: **${formatMoney(extractedOpeningCash)}**
- 📍 **Áp dụng cho**: **${branchToUse}**

*Két tiền mặt của ${branchToUse} hôm nay sẽ được tính bắt đầu từ ${formatMoney(extractedOpeningCash)}!*`,
        };
      }
    }
  }

  // 3. XỬ LÝ KHÁCH QUEN ĐẶT MÓN ("chú đối diện lấy 2 ly", "anh B lấy như cũ", "chị Lan 1 ly trà tắc")
  for (const cust of customers) {
    const aliases = cust.aliases || [cust.name.toLowerCase()];
    const matchedAlias = aliases.find((alias) => norm.includes(normalizeQuery(alias)));

    if (matchedAlias) {
      const isAsUsual = norm.includes("nhu cu") || norm.includes("nhu moi khi") || norm.includes("nhu truoc");
      const qtyMatch = norm.match(/(\d+)\s*(?:ly|chai|cốc)/i);
      const requestedQty = qtyMatch ? Number(qtyMatch[1]) : (isAsUsual ? (cust.defaultQty || 1) : 1);

      // Tra cứu món trong menu
      const matchedItem = (state.quickItems || []).find(
        (i) => i.name.toLowerCase() === (cust.defaultDrink || "").toLowerCase()
      ) || (state.quickItems || [])[0];

      const unitPrice = matchedItem ? Number(matchedItem.price) : (cust.price || 10000);
      const unitCost = matchedItem ? Number(matchedItem.costPrice || 0) : 3000;
      const totalAmount = unitPrice * requestedQty;
      const totalCost = unitCost * requestedQty;
      const branchToUse = targetBranch || state.currentBranch || "Quán Nhà (Chính)";

      // Xử lý ghi nợ nếu có từ khóa "nợ" hoặc "thiếu"
      const isDebt = norm.includes("thieu") || norm.includes("no") || norm.includes("ghi so") || norm.includes("mai tra");
      if (isDebt) {
        return {
          type: "action",
          action: "customer_debt",
          customerName: cust.name,
          debtAmount: totalAmount,
          reply: `📒 **Dạ EV đã ghi vào Sổ Nợ Khách Quen**:
- 👤 **Khách hàng**: **${cust.name}**
- 🥤 **Món**: **${matchedItem.name}** (${requestedQty} ly)
- 💸 **Số tiền ghi nợ**: **${formatMoney(totalAmount)}** (Khách hẹn trả sau)

*Khoản nợ này chưa cộng vào két tiền mặt và sẽ được theo dõi trong sổ nợ ạ!*`,
        };
      }

      const paymentMethod = cust.paymentMethod || "tien_mat";
      const isCK = paymentMethod === "chuyen_khoan";

      const parsedTransaction = {
        loai: "thu",
        soTien: totalAmount,
        soLuong: requestedQty,
        donViTinh: matchedItem.voiceUnit || "ly",
        phuongThuc: paymentMethod,
        giaCostDonVi: unitCost,
        tongGiaCost: totalCost,
        danhMuc: matchedItem.name,
        chiNhanh: branchToUse,
        ghiChu: `${cust.name} lấy ${requestedQty} ly ${matchedItem.name} - ${query}`,
        cauNoiGoc: query,
      };

      conversationContext.lastTransaction = parsedTransaction;

      return {
        type: "command",
        action: "add_transaction",
        branch: branchToUse,
        parsed: parsedTransaction,
        reply: `✅ **Dạ EV đã ghi sổ đơn Khách Quen (${cust.name})**:
- **Loại**: + Thu tiền bán
- **Khách hàng**: **${cust.name}** (Khách quen)
- **Món**: **${matchedItem.name}** (${requestedQty} ly)
- **Số tiền**: **${formatMoney(totalAmount)}** (${isCK ? "Chuyển khoản QR" : "Tiền mặt"})
- **Giá vốn (Cost)**: ${formatMoney(totalCost)} | **Lãi ròng**: +${formatMoney(totalAmount - totalCost)}
- **Điểm bán**: **${branchToUse}**

*Dữ liệu đã được lưu vào sổ và cộng vào doanh thu hôm nay!*`,
      };
    }
  }

  // 3. XỬ LÝ CÂU TRẢ LỜI CHO SỐ TIỀN KHÔNG CHIA HẾT ĐANG CHỜ (PENDING DISCREPANCY RESOLUTION)
  if (conversationContext.pendingDiscrepancy) {
    const pending = conversationContext.pendingDiscrepancy;
    const isNewCommand = norm.startsWith("thu ") || norm.startsWith("vua thu ") || norm.startsWith("ban ") || norm.startsWith("tong ") || norm.startsWith("chi ");
    if (isNewCommand) {
      conversationContext.pendingDiscrepancy = null;
    } else {
      const qtyMatch = norm.match(/(\d+)\s*(?:ly|chai|cốc|bịch)/i);
      const extractedQty = qtyMatch ? Number(qtyMatch[1]) : (norm.match(/^\d+$/) ? Number(norm) : 0);

      if (extractedQty > 0 || norm.includes("tip") || norm.includes("boa") || norm.includes("1 lit") || norm.includes("1l") || norm.includes("ly lon") || norm.includes("ly bu")) {
        const finalQty = extractedQty > 0 ? extractedQty : Math.max(1, Math.round(pending.money / (pending.unitPrice || 10000)));
        const unitCost = Number(pending.unitCost) > 0 ? Number(pending.unitCost) : 4000;
        const totalCost = finalQty * unitCost;

        conversationContext.pendingDiscrepancy = null;
        const isCK = pending.paymentMethod === "chuyen_khoan";

        return {
          type: "command",
          action: "add_transaction",
          branch: pending.branch || targetBranch || state.currentBranch || "Quán Nhà (Chính)",
          parsed: {
            loai: "thu",
            soTien: pending.money,
            soLuong: finalQty,
            donViTinh: pending.unit || "ly",
            danhMuc: pending.category || pending.product,
            phuongThuc: pending.paymentMethod || "tien_mat",
            giaCostDonVi: unitCost,
            tongGiaCost: totalCost,
            chiNhanh: pending.branch || targetBranch || state.currentBranch || "Quán Nhà (Chính)",
            ghiChu: `${pending.product} (${finalQty} ${pending.unit || "ly"}) - ${formatMoney(pending.money)} - ${query}`,
            cauNoiGoc: query,
          },
          reply: `✅ **Dạ EV đã làm rõ và ghi sổ thành công**:
- **Loại**: + Thu tiền bán
- **Món**: **${pending.product}** (${finalQty} ${pending.unit || "ly"})
- **Số tiền**: **${formatMoney(pending.money)}** (${isCK ? "Chuyển khoản QR" : "Tiền mặt"})
- **Giá vốn (Cost)**: ${formatMoney(totalCost)} | **Lãi ròng**: +${formatMoney(pending.money - totalCost)}
- **Ghi chú**: ${query}

*Dữ liệu đã được cập nhật chuẩn xác vào sổ doanh thu!*`,
        };
      }
    }
  }

  // 3.1 XỬ LÝ CÂU TRẢ LỜI DANH SÁCH MÓN CHO ĐƠN CHỜ (PENDING MISSING ITEMS RESOLUTION)
  if (conversationContext.pendingMissingItems) {
    const pending = conversationContext.pendingMissingItems;
    const multiResult = phanTichNhieu(query, state.quickItems || []);

    if (multiResult && multiResult.isBatch && multiResult.items.length > 1) {
      conversationContext.pendingMissingItems = null;
      const branchToUse = pending.branch || targetBranch || state.currentBranch || "Quán Nhà (Chính)";
      const isCK = pending.paymentMethod === "chuyen_khoan";
      const finalAmount = pending.money || multiResult.soTien;

      const breakdownLines = multiResult.items
        .map((it, idx) => `${idx + 1}. **${it.danhMuc}**: ${it.soLuong} ${it.donViTinh || "ly"} ➔ **${formatMoney(it.soTien)}** (Vốn: ${formatMoney(it.tongGiaCost)})`)
        .join("\n");

      return {
        type: "command",
        action: "add_batch_transactions",
        items: multiResult.items.map((it) => ({
          ...it,
          phuongThuc: pending.paymentMethod,
          chiNhanh: branchToUse,
          cauNoiGoc: `${query} (Đơn chờ: ${formatMoney(finalAmount)})`,
        })),
        total: finalAmount,
        branch: branchToUse,
        reply: `✅ **Dạ EV đã làm rõ danh sách món và ghi sổ thành công**:
${breakdownLines}
--------------------------------------------------
💰 **TỔNG TIỀN THU**: **${formatMoney(finalAmount)}** (${isCK ? "Chuyển khoản QR" : "Tiền mặt"})
🧊 **Tổng giá vốn (Cost)**: ${formatMoney(multiResult.tongGiaCost)} | **Lợi nhuận**: +${formatMoney(finalAmount - multiResult.tongGiaCost)}
📍 **Điểm bán**: **${branchToUse}**

*Toàn bộ ${multiResult.items.length} món đã được ghi vào sổ và tính giá vốn chuẩn xác!*`,
      };
    }

    const singleResult = phanTichChiTiet(query, state.quickItems || []);
    if (singleResult && (singleResult.slots?.productId || singleResult.danhMuc !== "Thu khác")) {
      conversationContext.pendingMissingItems = null;
      const branchToUse = pending.branch || targetBranch || state.currentBranch || "Quán Nhà (Chính)";
      const isCK = pending.paymentMethod === "chuyen_khoan";
      const finalAmount = pending.money || singleResult.soTien;

      const matchedItem = (state.quickItems || []).find((i) => i.id === singleResult.slots?.productId || i.name.toLowerCase() === singleResult.danhMuc?.toLowerCase());
      let unitCost = Number(matchedItem?.costPrice) || singleResult.giaCostDonVi || 4000;
      const qty = singleResult.soLuong || 1;
      const unitP = finalAmount / qty;
      if (singleResult.danhMuc?.toLowerCase().includes("mía") || matchedItem?.id === "nuoc_mia") {
        if (unitP >= 9500 && !singleResult.danhMuc?.toLowerCase().includes("lít") && !singleResult.danhMuc?.toLowerCase().includes("cam")) {
          unitCost = 5000;
        } else if (unitP < 9500) {
          unitCost = 4000;
        }
      }
      const totalCost = qty * unitCost;

      const parsedTx = {
        ...singleResult,
        soTien: finalAmount,
        soLuong: qty,
        phuongThuc: pending.paymentMethod,
        giaCostDonVi: unitCost,
        tongGiaCost: totalCost,
        chiNhanh: branchToUse,
        cauNoiGoc: `${query} (Đơn chờ: ${formatMoney(finalAmount)})`,
      };

      conversationContext.lastTransaction = parsedTx;

      return {
        type: "command",
        action: "add_transaction",
        branch: branchToUse,
        parsed: parsedTx,
        reply: `✅ **Dạ EV đã làm rõ món và ghi sổ thành công**:
- **Loại**: + Thu tiền bán
- **Món**: **${singleResult.danhMuc}** (${qty} ${singleResult.donViTinh || "ly"})
- **Số tiền**: **${formatMoney(finalAmount)}** (${isCK ? "Chuyển khoản QR" : "Tiền mặt"})
- **Giá vốn (Cost)**: ${formatMoney(totalCost)} | **Lãi ròng**: +${formatMoney(finalAmount - totalCost)}
- **Điểm bán**: **${branchToUse}**

*Dữ liệu đã được cập nhật chuẩn xác vào bảng doanh thu hôm nay!*`,
      };
    }
  }
  if (conversationContext.pendingQuestion) {
    const pending = conversationContext.pendingQuestion;
    const extractedMoney = extractMoneyFromText(query);

    if (extractedMoney > 0) {
      let finalTotal = extractedMoney;
      if (
        norm.includes("1 bao") ||
        norm.includes("moi bao") ||
        norm.includes("1 ly") ||
        norm.includes("moi ly") ||
        norm.includes("1 kg") ||
        norm.includes("moi kg") ||
        norm.includes("1 bo") ||
        norm.includes("moi bo")
      ) {
        if (pending.quantity > 1 && extractedMoney <= 50000) {
          finalTotal = extractedMoney * pending.quantity;
        }
      }

      conversationContext.pendingQuestion = null;
      return {
        type: "command",
        action: "add_transaction",
        branch: pending.branch || targetBranch || state.currentBranch || "Quán Nhà (Chính)",
        parsed: {
          loai: "chi",
          soTien: finalTotal,
          soLuong: pending.quantity,
          donViTinh: pending.unit,
          danhMuc: pending.category,
          phuongThuc: "tien_mat",
          giaCostDonVi: 0,
          tongGiaCost: 0,
          chiNhanh: pending.branch || targetBranch || state.currentBranch || "Quán Nhà (Chính)",
          ghiChu: `${pending.category} (${pending.quantity} ${pending.unit}) - ${query}`,
          cauNoiGoc: query,
        },
        reply: `✅ **Dạ EV đã ghi sổ chi tiền thành công**:
- **Khoản chi**: **${pending.category}** (${pending.quantity} ${pending.unit})
- **Số tiền**: **${formatMoney(finalTotal)} (Tiền mặt)**
- **Điểm chi**: **${pending.branch || targetBranch || state.currentBranch || "Quán Nhà (Chính)"}**

*Dữ liệu đã được cập nhật vào bảng chi phí hôm nay!*`,
      };
    }
  }

  // 5. NGƯỜI DÙNG ĐÍNH CHÍNH / BẮT LỖI TÍNH TOÁN ("100k thì phải là 10 ly chứ", "sao lại ghi 1 ly", "nhầm rồi")
  const isCorrection =
    norm.includes("phai la") ||
    norm.includes("sao lai") ||
    norm.includes("nham roi") ||
    norm.includes("sai roi") ||
    norm.includes("tinh lai") ||
    norm.includes("khong phai") ||
    (/\b(chu|chứ)\b/.test(norm) && (norm.includes("ly") || norm.includes("100k") || norm.includes("tien") || /\b\d+\s*ly\b/.test(norm)));

  if (isCorrection) {
    const qtyMatch = norm.match(/(\d+)\s*(?:ly|chai|cốc|bao|bó|kg|lon)/i);
    const correctedQty = qtyMatch ? Number(qtyMatch[1]) : 0;

    const recentThuList = (state.ds || []).filter((tx) => !tx.deleted && tx.loai === "thu");
    const lastThu = conversationContext.lastTransaction || recentThuList[recentThuList.length - 1];

    if (correctedQty > 0 && lastThu) {
      const updatedTx = {
        ...lastThu,
        soLuong: correctedQty,
        tongGiaCost: correctedQty * (Number(lastThu.giaCostDonVi) || 3500),
      };

      return {
        type: "action",
        action: "update_last_transaction",
        updatedTx,
        reply: `Dạ EV thành thật xin lỗi anh/chị vì sơ suất tính nhầm lúc nãy ạ! 🙇‍♂️

Em đã điều chỉnh lại chính xác thành **${correctedQty} ${lastThu.donViTinh || "ly"} ${lastThu.danhMuc}** với tổng tiền **${formatMoney(lastThu.soTien)}** vào sổ doanh thu rồi ạ!`,
      };
    }

    return {
      type: "clarification",
      reply: `Dạ EV xin lỗi anh/chị vì sơ suất ạ! 🙇‍♂️\n\nEV đã sẵn sàng lắng nghe lại, anh/chị muốn EV sửa lại số lượng, thêm món Menu hay ghi chép lại khoản nào ạ?`,
    };
  }

  // 6. PHÂN TÍCH TÀI CHÍNH F&B, COGS, ĐIỂM HÒA VỐN & BÁO CÁO P&L
  if (norm.includes("cogs") || norm.includes("ty le gia von") || norm.includes("hao hut") || norm.includes("kiem tra gia von")) {
    const cogsPercent = todayReport.income > 0 ? Math.round((todayReport.cost / todayReport.income) * 100) : 0;
    const isGood = cogsPercent >= 25 && cogsPercent <= 50;
    return {
      type: "financial_advice",
      reply: `📊 **Dạ EV xin báo cáo Kiểm soát Giá Vốn & Hao Hụt (COGS Benchmark)**:
- **Tổng doanh thu hôm nay**: ${formatMoney(todayReport.income)}
- **Tổng giá vốn nguyên liệu (COGS)**: ${formatMoney(todayReport.cost)}
- 🎯 **Tỷ lệ COGS thực tế**: **${cogsPercent}%** (Chuẩn mục tiêu toàn quán: **45% – 50%**)

${isGood ? "✅ *Đánh giá: Tỷ lệ giá vốn đang bám sát định lượng chuẩn sổ tay (Bao bì/màng ép/ống hút/đá 1k, Mía chuẩn 8k/ly vốn 4k)!*" : "⚠️ *Cảnh báo: Tỷ lệ giá vốn đang hơi cao, anh/chị kiểm tra lại định lượng ép mía và bảo quản đá nhé!*"}`,
    };
  }

  if (norm.includes("p&l") || norm.includes("pnl") || norm.includes("ket qua kinh doanh") || norm.includes("bao cao tai chinh")) {
    return {
      type: "financial_report",
      reply: `📑 **Dạ EV xin xuất Báo Cáo Kết Quả Hoạt Động Kinh Doanh (P&L Statement)**:
📅 *Kỳ báo cáo: Hôm nay (${todayReport.dateText}) - Toàn bộ 2 chi nhánh*

1. 💵 **DOANH THU THUẦN (Net Revenue)**: **${formatMoney(todayReport.income)}**
2. 🧊 **GIÁ VỐN NGUYÊN LIỆU (COGS)**: **-${formatMoney(todayReport.cost)}**
3. 💰 **LỢI NHUẬN GỘP (Gross Profit)**: **+${formatMoney(todayReport.grossProfit)}** (Tỷ suất lãi gộp: **${todayReport.income > 0 ? Math.round((todayReport.grossProfit / todayReport.income) * 100) : 0}%**)
4. 🏢 **CHI PHÍ VẬN HÀNH (OPEX)**: **-${formatMoney(todayReport.expense)}**
--------------------------------------------------
🌟 **LỢI NHUẬN RÒNG THỰC TẾ (Net Profit)**: **+${formatMoney(todayReport.balance)}**
*(Tiền mặt trong két: ${formatMoney(todayReport.cashIncome)} | Tiền gửi ngân hàng QR: ${formatMoney(todayReport.transferIncome)})*`,
    };
  }

  if (norm.includes("hoa von") || norm.includes("diem hoa von") || norm.includes("can ban bao nhieu ly") || norm.includes("bao nhieu tien thi hoa von") || norm.includes("muc tieu")) {
    const overhead = state.overheadConfig || {};
    const rent = Number(overhead.rentMonthly) || 6000000;
    const elec = Number(overhead.electricityMonthly) || 2400000;
    const water = Number(overhead.waterMonthly) || 150000;
    const trash = Number(overhead.trashMonthly) || 50000;
    const depr = Number(overhead.depreciationMonthly) || 300000;
    const other = Number(overhead.otherMonthly) || 500000;
    const totalOverhead = rent + elec + water + trash + depr + other; // 9.400.000 đ
    const dailyFixedCost = Math.round(totalOverhead / 30); // ~313.300 đ

    const targetRevenue = 628000;
    const currentIncome = todayReport.income || 0;
    const revProgress = Math.min(100, Math.round((currentIncome / targetRevenue) * 100));

    return {
      type: "financial_advice",
      reply: `🎯 **Dạ EV phân tích Điểm Hòa Vốn Hôm Nay Cho Quán**:
- 🏢 **Định phí mỗi ngày**: **${formatMoney(dailyFixedCost)} / ngày** (Mặt bằng 200k, Điện 30 ký 80k, Nước 5k, Rác, Khấu hao & phát sinh).
- 💰 **Mục tiêu doanh thu hòa vốn**: **${formatMoney(targetRevenue)} / ngày** (~18.800.000đ/tháng với biên lãi gộp bình quân ~50%).
- 📊 **Tiến độ hôm nay**: **${formatMoney(currentIncome)} / ${formatMoney(targetRevenue)}** [${Math.round(currentIncome / 1000)}k / ${Math.round(targetRevenue / 1000)}k] (Đạt **${revProgress}%**)

${currentIncome >= targetRevenue ? `🎉 **CHÚC MỪNG QUÁN ĐÃ VƯỢT ĐIỂM HÒA VỐN!**\nĐang có lời ròng **+${formatMoney(todayReport.grossProfit - dailyFixedCost)}** bỏ túi trọn vẹn sau khi trừ cả tiền nguyên liệu, tiền mặt bằng và điện 30 ký!` : `⚡ Quán cần thu thêm **${formatMoney(targetRevenue - currentIncome)}** để trả sạch 100% tiền nguyên liệu, tiền mặt bằng (200k) và tiền điện 30 ký (80k) hôm nay ạ!`}

*(💡 Định lượng thực tế EV đã nạp: Bao bì/màng ép/ống hút/đá tính cố định 1k/phần; Mía 1L ko đá 1k; Nước mía chuẩn 8k/ly vốn 4k, ly lớn 10k).*`,
    };
  }

  // 7. BẢNG XẾP HẠNG MÓN BÁN CHẠY (MENU RANKING)
  if (
    norm.includes("mon nao ban chay") ||
    norm.includes("ban chay nhat") ||
    norm.includes("top mon") ||
    norm.includes("mon ban chay") ||
    norm.includes("mon nao dat khach") ||
    norm.includes("xep hang mon")
  ) {
    const drinksMap = new Map();
    todayReport.items
      .filter((it) => it.loai === "thu")
      .forEach((it) => {
        const name = it.danhMuc || "Nước mía thường";
        const current = drinksMap.get(name) || { count: 0, revenue: 0, cost: 0 };
        current.count += Number(it.soLuong || 1);
        current.revenue += Number(it.soTien || 0);
        current.cost += Number(it.tongGiaCost || (Number(it.soLuong || 1) * Number(it.giaCostDonVi || 0)) || 0);
        drinksMap.set(name, current);
      });

    if (drinksMap.size === 0) {
      return {
        type: "menu",
        reply: `🥤 Dạ EV kiểm tra thấy hôm nay quán chưa có đơn bán nước nào. Khi có khách mua, EV sẽ lập bảng xếp hạng ngay ạ!`,
      };
    }

    const sorted = [...drinksMap.entries()].sort((a, b) => b[1].count - a[1].count);
    const topItem = sorted[0];
    const breakdownText = sorted
      .map(
        ([name, d], index) =>
          `${index + 1}. **${name}**: ${d.count} ly ➔ Doanh thu ${formatMoney(d.revenue)} (Lời +${formatMoney(d.revenue - d.cost)})`,
      )
      .join("\n");

    return {
      type: "menu",
      reply: `🏆 **Dạ EV xin gửi Bảng xếp hạng món bán chạy hôm nay (${targetBranch || "Tất cả chi nhánh"})**:
Món bán chạy số 1: 🌟 **${topItem[0]}** (${topItem[1].count} ly, thu ${formatMoney(topItem[1].revenue)}).

**Chi tiết từng món**:
${breakdownText}

💡 *Mẹo của EV: Món có lãi cao nhất là món bạn nên tư vấn mời khách khi order tại quầy!*`,
    };
  }

  // 8. CHI PHÍ NGUYÊN VẬT LIỆU (HỎI BÁO CÁO CHI PHÍ)
  const isExpenseReportQuery =
    (norm.includes("ton bao nhieu") ||
      norm.includes("het bao nhieu") ||
      norm.includes("chi bao nhieu") ||
      norm.includes("tong chi") ||
      norm.includes("chi phi") ||
      norm.includes("nguyen vat lieu") ||
      norm.includes("nguyen lieu") ||
      norm.includes("bao nhieu tien da") ||
      norm.includes("bao nhieu tien mia") ||
      norm.includes("tong tien mua da")) &&
    !norm.startsWith("ghi ") &&
    !norm.startsWith("chi ") &&
    !norm.startsWith("mua ") &&
    !norm.startsWith("tra ");

  if (isExpenseReportQuery) {
    const expenses = todayReport.items.filter((it) => it.loai === "chi");
    if (!expenses.length) {
      return {
        type: "expense",
        reply: `🧊 Dạ EV kiểm tra thấy hôm nay ${targetBranch || "quán"} chưa phát sinh khoản chi nào ạ. Tổng chi = 0đ.`,
      };
    }

    const expMap = new Map();
    expenses.forEach((it) => {
      const name = it.danhMuc || "Chi khác";
      expMap.set(name, (expMap.get(name) || 0) + Number(it.soTien || 0));
    });

    const expText = [...expMap.entries()]
      .map(([name, amount]) => `• **${name}**: ${formatMoney(amount)}`)
      .join("\n");

    return {
      type: "expense",
      reply: `🧊 **Dạ EV tổng hợp chi phí nguyên vật liệu hôm nay (${targetBranch || "Tất cả chi nhánh"})**:
- **Tổng tiền chi**: **${formatMoney(todayReport.expense)}**
${expText}

*Mẹo: Để quán đạt lãi tốt, tổng chi nguyên liệu hàng ngày nên giữ ở mức dưới 35% - 40% doanh thu.*`,
    };
  }

  // 9. KIỂM TRA / ĐỐI SOÁT KÉT TIỀN MẶT (CHỈ XEM BÁO CÁO)
  const isDrawerCheck =
    norm.includes("kiem tra ket") ||
    norm.includes("doi soat ket") ||
    norm.includes("tien trong ket") ||
    norm.includes("ket con bao nhieu") ||
    norm.includes("ket tien") ||
    (norm.includes("tien mat") && (norm.includes("con") || norm.includes("kiem tra") || norm.includes("doi soat"))) ||
    ((norm.includes("thoi") || norm.includes("ket")) && (norm.includes("bao nhieu") || norm.includes("kiem tra") || norm.includes("xem") || norm.includes("doi soat")));

  if (isDrawerCheck) {
    return {
      type: "drawer",
      reply: `🏦 **Dạ EV đối soát tiền mặt trong két hôm nay (${targetBranch || "Quán Nhà"})**:
- **Tiền thối đầu ngày**: ${formatMoney(todayReport.openingCash)}
- **Tiền mặt thu từ khách**: +${formatMoney(todayReport.cashIncome)}
- **Tiền mặt đã chi ra**: -${formatMoney(todayReport.expense)}
- 💵 **TỔNG TIỀN MẶT CẦN CÓ TRONG KÉT**: **${formatMoney(todayReport.expectedCashInDrawer)}**

*(Nếu bạn đếm tiền cuối ca đúng bằng ${formatMoney(todayReport.expectedCashInDrawer)} là khớp két 100%!)*`,
    };
  }

  // 10. TƯ VẤN CHIẾN LƯỢC KINH DOANH
  if (norm.includes("tu van") || norm.includes("chien luoc") || norm.includes("loi khuyen") || norm.includes("kinh doanh")) {
    const totalTransactions = transactions.filter((t) => t.loai === "thu").length;
    const totalRevenue = transactions.filter((t) => t.loai === "thu").reduce((s, t) => s + Number(t.soTien || 0), 0);
    const totalExp = transactions.filter((t) => t.loai === "chi").reduce((s, t) => s + Number(t.soTien || 0), 0);
    const totalProfit = totalRevenue - totalExp;

    return {
      type: "advice",
      reply: `💡 **Dạ EV xin tư vấn chiến lược vận hành 2 chi nhánh**:
1. **Theo dõi định lượng hao hụt mía & tắc**: Ghi chép đều đặn 1 bao mía ép được bao nhiêu lít/ly nước để chuẩn hóa công thức cho cả 2 quán.
2. **Dữ liệu tích lũy toàn hệ thống**: Đã ghi nhận **${totalTransactions} đơn bán**, tổng doanh thu **${formatMoney(totalRevenue)}**, lợi nhuận ròng **${formatMoney(totalProfit)}**.
3. **Chuẩn bị cho tháng tiếp theo**:
   - Khi sản lượng bán của 2 chi nhánh ổn định, bạn có thể gộp đơn nhập mía và đá theo tuần để được giá sỉ rẻ hơn 10 - 15%.
   - Tạo các món mới theo mùa trên Menu để thu hút thêm khách hàng mới.`,
    };
  }

  // 11. TRÒ CHUYỆN THƯỜNG NGÀY & THỜI TIẾT (CHIT-CHAT)
  const isChitChat =
    norm.includes("troi the nao") ||
    norm.includes("thoi tiet") ||
    norm.includes("nang hay mua") ||
    norm.includes("khoe khong") ||
    norm.includes("chao ev") ||
    norm.includes("chao em") ||
    norm.includes("hello") ||
    norm.includes("hi ev") ||
    norm.includes("ban la ai") ||
    norm.includes("em la ai") ||
    norm.includes("ten gi") ||
    norm.includes("cam on");

  if (isChitChat) {
    if (norm.includes("troi the nao") || norm.includes("thoi tiet") || norm.includes("nang hay mua")) {
      return {
        type: "general",
        reply: `Dạ hôm nay thời tiết khá đẹp và thuận lợi, rất thích hợp để bán các món nước mía, nước cam mát lạnh giải khát anh/chị nha! ☀️🍹\n\nChúc quán mình hôm nay khách vào nườm nượp, làm ăn phát tài và đắt hàng liên tục ạ! ✨`,
      };
    }

    if (norm.includes("ban la ai") || norm.includes("em la ai") || norm.includes("ten gi")) {
      return {
        type: "general",
        reply: `Dạ em là **Thư Ký EV** - trợ lý tài chính và quản lý toàn diện 2 chi nhánh quán nước của anh/chị! 🤖\n\nEm luôn túc trực để ghi chép thu chi thời gian thực, nhớ khách quen và phân tích kinh doanh như một CFO chuyên nghiệp ạ!`,
      };
    }

    if (norm.includes("cam on")) {
      return {
        type: "general",
        reply: `Dạ không có chi ạ! Phục vụ quán của anh/chị là niềm vui của EV ạ! 🥰 Chúc anh/chị một ngày kinh doanh thật hồng phát!`,
      };
    }

    return {
      type: "general",
      reply: `Dạ em chào anh/chị! EV luôn sẵn sàng ghi đơn bán hàng, ghi chi phí hoặc báo cáo doanh thu 2 quán cho anh/chị đây ạ! 🤖✨`,
    };
  }

  // 12. LỆNH THÊM MÓN MỚI VÀO MENU
  if (
    norm.includes("them vao menu") ||
    norm.includes("them menu") ||
    norm.includes("them mon") ||
    norm.includes("tao mon") ||
    norm.includes("them nuoc") ||
    norm.includes("them vao thuc don")
  ) {
    const raw = query.replace(/^(ev|i\s*vi|e\s*vi|i-vi|e-vi|ê\s*vi|ê-vi|evi)(\s+ơi|\s+oi|\s+nhe|\s+nhé|\s+giúp|\s+giup|\s+cho)?\s+/i, "").trim();
    let name = "Nước Mới";
    const nameMatch = raw.match(/(?:thêm|them|tạo|tao|món|mon|nước|nuoc)\s+(?:vào\s+menu\s+|vao\s+menu\s+)?(?:món\s+|mon\s+)?([^,;:\n]+?)(?:,|\s+tiền|\s+tien|\s+giá|\s+gia|\s+bán|\s+ban|\s+vốn|\s+von|\s+cost|\s+\d+\s*k|\s+\d+\s*ngh)/i);
    if (nameMatch) name = capitalizeWords(nameMatch[1].replace(/^(vào\s+menu|vao\s+menu|menu|món|mon|nước|nuoc)\s+/i, "").trim());
    const price = extractMoneyFromText(raw) || 10000;
    const costPrice = Math.round((price * 0.4) / 1000) * 1000;

    const newItem = {
      id: "menu_" + Date.now(),
      name,
      category: name,
      price,
      costPrice,
      voiceName: name.toLowerCase(),
      voiceUnit: "ly",
    };

    return {
      type: "action",
      action: "add_menu_item",
      item: newItem,
      reply: `✅ **Dạ EV đã thêm món mới vào Menu thành công cho anh/chị ạ**:
- 🥤 **Tên món**: **${name}**
- 💵 **Giá bán**: **${formatMoney(price)}** / ly
- 🧊 **Giá vốn (Cost)**: **${formatMoney(costPrice)}**

*Món "${name}" đã xuất hiện trên màn hình Bán hàng và sẵn sàng order!*`,
    };
  }

  // 13. BÁO CÁO TỔNG HỢP CẢ 2 CHI NHÁNH
  if (isAllBranches || norm.includes("so sanh 2 quan") || norm.includes("2 chi nhanh")) {
    return {
      type: "financial_multi_branch",
      reply: `🏢 **Dạ EV xin báo cáo tổng hợp CẢ 2 CHI NHÁNH hôm nay (${todayReport.dateText})**:

🏠 **1. Quán Nhà (Chính)**:
- Doanh thu: **${formatMoney(b1Report.income)}** (${b1Report.totalDrinks} ly)
- Tiền chi: ${formatMoney(b1Report.expense)} | Vốn: ${formatMoney(b1Report.cost)}
- 💰 Lời thực nhận: **${formatMoney(b1Report.balance)}**

🏪 **2. Chi nhánh 2**:
- Doanh thu: **${formatMoney(b2Report.income)}** (${b2Report.totalDrinks} ly)
- Tiền chi: ${formatMoney(b2Report.expense)} | Vốn: ${formatMoney(b2Report.cost)}
- 💰 Lời thực nhận: **${formatMoney(b2Report.balance)}**

===============================
🌟 **TỔNG CỘNG 2 QUÁN**:
- **Tổng doanh thu**: **${formatMoney(todayReport.income)}** (${todayReport.totalDrinks} ly)
- **Tổng tiền chi**: ${formatMoney(todayReport.expense)}
- 💵 **TỔNG LỢI NHUẬN RÒNG 2 QUÁN**: **+${formatMoney(todayReport.balance)}**`,
    };
  }

  // 14. BÁO CÁO DOANH THU & TIỀN LỜI HÔM NAY
  const isFinancialReportQuery =
    norm.includes("doanh thu") ||
    norm.includes("loi bao nhieu") ||
    norm.includes("loi nhuan") ||
    norm.includes("lai bao nhieu") ||
    norm.includes("ban duoc bao nhieu") ||
    norm.includes("tong ket ngay") ||
    norm.includes("bao cao ngay") ||
    norm.includes("thu chi hom nay");

  if (isFinancialReportQuery) {
    if (norm.includes("loi") || norm.includes("lai")) {
      const margin = todayReport.income > 0 ? Math.round((todayReport.grossProfit / todayReport.income) * 100) : 0;
      return {
        type: "financial",
        reply: `📊 **Dạ EV xin báo cáo lợi nhuận hôm nay (${todayReport.dateText} - ${targetBranch || "Toàn bộ chi nhánh"})**:
- **Doanh thu bán ra**: ${formatMoney(todayReport.income)} (${todayReport.totalDrinks} ly nước).
- **Tiền vốn nguyên liệu (Cost)**: ${formatMoney(todayReport.cost)}.
- **Lợi nhuận gộp bán nước**: +${formatMoney(todayReport.grossProfit)} (Tỷ suất lãi: **${margin}%**).
- **Tiền chi mua hàng hôm nay**: -${formatMoney(todayReport.expense)}.
- 💰 **TIỀN LỜI THỰC TẾ (Lãi ròng)**: **+${formatMoney(todayReport.balance)}**.

*Gồm tiền mặt: ${formatMoney(todayReport.cashIncome)} | Chuyển khoản QR: ${formatMoney(todayReport.transferIncome)}.*`,
      };
    }

    return {
      type: "financial",
      reply: `🥤 **Dạ EV xin báo cáo doanh thu hôm nay (${todayReport.dateText} - ${targetBranch || "Toàn bộ chi nhánh"})**:
- **Tổng doanh thu**: **${formatMoney(todayReport.income)}**
- **Số ly đã bán**: **${todayReport.totalDrinks} ly**
- **Tiền mặt thu vào**: ${formatMoney(todayReport.cashIncome)}
- **Chuyển khoản QR**: ${formatMoney(todayReport.transferIncome)}
- **Tiền chi**: ${formatMoney(todayReport.expense)}
- 💰 **Lợi nhuận thực nhận**: **${formatMoney(todayReport.balance)}**`,
    };
  }

  // 15. PHÂN TÍCH NHIỀU MÓN TRONG 1 CÂU (MULTI-ITEM BATCH ORDER)
  // Ví dụ: "khách mua 8 ly cam, 2 ly rau má, 1 rau má đuậ, 3 trà tắc, 4 ly mía"
  const multiResult = phanTichNhieu(query, state.quickItems || []);
  if (multiResult.isBatch && multiResult.items.length > 1) {
    const branchToUse = targetBranch || state.currentBranch || "Quán Nhà (Chính)";
    const paymentMethod = multiResult.items[0]?.phuongThuc || (norm.includes("chuyen") || norm.includes("ck") || norm.includes("qr") ? "chuyen_khoan" : "tien_mat");
    const isCK = paymentMethod === "chuyen_khoan";

    const breakdownLines = multiResult.items.map((it, idx) => {
      return `${idx + 1}. **${it.danhMuc}**: ${it.soLuong} ${it.donViTinh || "ly"} ➔ **${formatMoney(it.soTien)}** (Vốn: ${formatMoney(it.tongGiaCost)})`;
    }).join("\n");

    return {
      type: "command",
      action: "add_batch_transactions",
      items: multiResult.items.map((it) => ({
        ...it,
        chiNhanh: branchToUse,
        phuongThuc: paymentMethod,
      })),
      total: multiResult.soTien,
      branch: branchToUse,
      reply: `✅ **Dạ EV đã ghi sổ thành công đơn nhiều món (${multiResult.soLuong} ly)**:
${breakdownLines}
--------------------------------------------------
💰 **TỔNG TIỀN THU**: **${formatMoney(multiResult.soTien)}** (${isCK ? "Chuyển khoản QR" : "Tiền mặt"})
🧊 **Tổng giá vốn (Cost)**: ${formatMoney(multiResult.tongGiaCost)} | **Lợi nhuận**: +${formatMoney(multiResult.soTien - multiResult.tongGiaCost)}
📍 **Điểm bán**: **${branchToUse}**

*Toàn bộ ${multiResult.items.length} món đã được ghi vào sổ bán hàng hôm nay!*`,
    };
  }

  // 15.1 PHẢN BIỆN / HỎI LẠI KHI CHỈ ĐỌC GIÁ TIỀN HOẶC TỔNG TIỀN MÀ KHÔNG CÓ TÊN MÓN / LIST MÓN
  const quickItems = state.quickItems || [];
  const hasDrinkName = quickItems.some((i) => {
    const n = normalizeQuery(i.name);
    const sn = i.shortName ? normalizeQuery(i.shortName) : "";
    const vn = i.voiceName ? normalizeQuery(i.voiceName) : "";
    return (n && norm.includes(n)) || (sn && norm.includes(sn)) || (vn && norm.includes(vn));
  }) || norm.includes("mia") || norm.includes("cam") || norm.includes("tac") || norm.includes("rau ma") || norm.includes("thom") || norm.includes("khom") || norm.includes("dua") || norm.includes("da vien") || norm.includes("nuoc da");

  const isCustomerBuying = norm.includes("khach mua") || norm.includes("khach lay") || norm.includes("khach uong") || norm.includes("khach goi") || norm.includes("ban ");
  const isExpenseIntent = !isCustomerBuying && (norm.includes("mua ") || norm.includes("nhap ") || norm.includes("chi ") || norm.includes("tra tien") || norm.includes("xang") || norm.includes("tien dien") || norm.includes("tien nuoc"));
  const extractedMoneyOnly = extractMoneyFromText(query);

  if (!hasDrinkName && !isExpenseIntent && extractedMoneyOnly >= 1000) {
    const isCK = norm.includes("chuyen") || norm.includes("ck") || norm.includes("qr") || norm.includes("bank");
    const branchToUse = targetBranch || state.currentBranch || "Quán Nhà (Chính)";
    conversationContext.pendingMissingItems = {
      money: extractedMoneyOnly,
      paymentMethod: isCK ? "chuyen_khoan" : "tien_mat",
      branch: branchToUse,
    };

    const isTotal = norm.includes("tong") || norm.includes("don nay") || norm.includes("ca thay") || norm.includes("tong cong");
    const title = isTotal ? `đơn hàng tổng **${formatMoney(extractedMoneyOnly)}**` : `số tiền thu **${formatMoney(extractedMoneyOnly)}** (${isCK ? "Chuyển khoản QR" : "Tiền mặt"})`;

    return {
      type: "question",
      intent: "missing_items",
      reply: `Dạ EV ghi nhận ${title} ạ! 🥤\n\nAnh/Chị cho EV hỏi trong đơn **${formatMoney(extractedMoneyOnly)}** này gồm **những món nước nào** (ví dụ: *5 ly mía thường, 2 ly cam...*) để EV trừ kho nguyên liệu và tính tiền vốn (cost) chính xác cho quán nhé?`,
    };
  }

  // 16. PHÂN TÍCH GIAO DỊCH ĐƠN LẺ (BÁN NƯỚC / CHI TIỀN / MUA NGUYÊN LIỆU)
  const parsed = phanTichChiTiet(query, state.quickItems || []);

  // Nếu số tiền không chia hết cho đơn giá Menu -> EV hỏi lại người dùng để làm rõ
  if (parsed && parsed.slots?.priceMode === "discrepancy") {
    const matchedItem = (state.quickItems || []).find((i) => i.id === parsed.slots?.productId || i.name.toLowerCase() === (parsed.slots?.productName || "").toLowerCase());
    const prodName = matchedItem ? matchedItem.name : capitalizeWords(parsed.slots.productName || parsed.danhMuc || "Món nước");
    conversationContext.pendingDiscrepancy = {
      intent: "drink_discrepancy",
      product: prodName,
      category: matchedItem ? (matchedItem.category || matchedItem.name) : prodName,
      money: parsed.soTien,
      unitPrice: parsed.slots.unitPrice,
      unitCost: parsed.slots.costPrice,
      branch: parsed.chiNhanh || targetBranch,
      paymentMethod: parsed.phuongThuc,
      unit: parsed.donViTinh || "ly",
    };

    const unitP = parsed.slots.unitPrice || 10000;
    const approxQty = Math.floor(parsed.soTien / unitP);
    const remainder = parsed.soTien % unitP;

    return {
      type: "question",
      reply: `Dạ EV thấy số tiền **${formatMoney(parsed.soTien)}** cho món **${prodName}** không khớp với đơn giá Menu (**${formatMoney(unitP)} / ly** - khoảng ${approxQty} đến ${approxQty + 1} ly, lệch ${formatMoney(remainder)}) ạ! 🤔\n\nAnh/Chị cho EV hỏi đơn này là **mấy ly ${prodName}** (hoặc khách có chuyển kèm món gì khác / tiền boa) để EV ghi sổ và tính giá vốn chính xác nhé?`,
    };
  }

  // Nếu là lệnh chi nhưng chưa có giá tiền (ví dụ: "mới mua 2 bao đá") -> Hỏi lại người dùng
  if (parsed && parsed.loai === "chi" && parsed.soTien === 0 && (parsed.danhMuc !== "Chi khác" || parsed.soLuong > 0)) {
    conversationContext.pendingQuestion = {
      intent: "expense_price",
      category: parsed.danhMuc,
      quantity: parsed.soLuong,
      unit: parsed.donViTinh,
      branch: parsed.chiNhanh || targetBranch,
    };

    return {
      type: "question",
      reply: `Dạ EV ghi nhận quán mình vừa mua **${parsed.soLuong} ${parsed.donViTinh} ${parsed.danhMuc}** ạ! 🧊\n\nAnh/Chị cho EV hỏi **${parsed.soLuong} ${parsed.donViTinh} này hết bao nhiêu tiền** (hoặc bao nhiêu 1 ${parsed.donViTinh}) để EV ghi vào sổ chi phí chính xác nhé?`,
    };
  }

  // Nếu có giao dịch hợp lệ
  if (parsed && (parsed.soTien > 0 || (parsed.loai === "thu" && parsed.slots?.productId))) {
    const branchToUse = parsed.chiNhanh || targetBranch || state.currentBranch || "Quán Nhà (Chính)";
    const paymentText = parsed.phuongThuc === "chuyen_khoan" ? " (Chuyển khoản QR)" : " (Tiền mặt)";
    const isThu = parsed.loai === "thu";

    // Phản biện số tiền bất thường (Critical Anomaly Check):
    if (isThu && parsed.soLuong > 0 && parsed.soTien >= 50000) {
      const defaultItem = (state.quickItems || []).find((i) => i.name.toLowerCase() === parsed.danhMuc?.toLowerCase());
      const standardPrice = defaultItem ? Number(defaultItem.price) : 8000;
      const expectedTotal = standardPrice * parsed.soLuong;

      // Nếu số tiền lệch quá 2.5 lần và không có từ khóa tip / boa / lít
      if (parsed.soTien >= expectedTotal * 2.5 && !norm.includes("tip") && !norm.includes("boa") && !norm.includes("lit") && !norm.includes("1l") && !norm.includes("chai")) {
        conversationContext.pendingDiscrepancy = {
          money: parsed.soTien,
          product: parsed.danhMuc,
          unitPrice: standardPrice,
          unitCost: parsed.giaCostDonVi || 4000,
          paymentMethod: parsed.phuongThuc || "tien_mat",
          branch: branchToUse,
        };

        const impliedCups = Math.round(parsed.soTien / standardPrice);
        return {
          type: "question",
          reply: `🤔 **Dạ EV xin phép phản biện để làm rõ số liệu ạ**:
- **Món**: **${parsed.danhMuc}** (${parsed.soLuong} ${parsed.donViTinh || "ly"}) theo giá chuẩn chỉ khoảng **${formatMoney(expectedTotal)}** (hoặc ${formatMoney(10000 * parsed.soLuong)} nếu là ly lớn).
- Nhưng câu của anh/chị có số tiền là **${formatMoney(parsed.soTien)}** (tương đương ${impliedCups} ly).

👉 Anh/Chị cho EV hỏi đây là **khách mua ${impliedCups} ly**, khách mua **nước mía 1 lít**, hay **khách cho tiền bo (tip)** để EV ghi nhận chuẩn xác vào sổ ạ?`,
        };
      }
    }

    conversationContext.lastTransaction = {
      ...parsed,
      chiNhanh: branchToUse,
    };

    const calculatedNote = isThu && parsed.slots?.unitPrice > 0 && parsed.soLuong > 1 && parsed.soTien > parsed.slots.unitPrice
      ? ` (${parsed.soLuong} ${parsed.donViTinh} - ${formatMoney(parsed.slots.unitPrice)}/${parsed.donViTinh})`
      : ` (${parsed.soLuong} ${parsed.donViTinh})`;

    return {
      type: "command",
      action: "add_transaction",
      rawQuery: query,
      branch: branchToUse,
      parsed,
      reply: `✅ **Dạ EV đã ghi sổ thành công**:
- **Loại**: ${isThu ? "+ Thu tiền bán" : "- Chi tiền"}
- **Món/Khoản**: **${parsed.danhMuc}**${calculatedNote}
- **Số tiền**: **${formatMoney(parsed.soTien)}**${paymentText}
- **Điểm bán**: **${branchToUse}**
- **Giá vốn (Cost)**: ${formatMoney(parsed.tongGiaCost)}

*Dữ liệu đã được lưu vào sổ và cập nhật vào bảng doanh thu hôm nay!*`,
    };
  }

  // 17. Phản hồi mặc định thông minh của Thư ký EV
  return {
    type: "general",
    reply: `Dạ em là **Thư ký EV**, luôn sẵn sàng hỗ trợ anh/chị quản lý toàn diện 2 chi nhánh!

Anh/Chị có thể ra lệnh tự nhiên cho EV:
- 🥤 *"Khách mua 8 ly cam, 2 ly rau má, 1 rau má đậu, 3 trà tắc, 4 ly mía"* ➔ EV ghi cả 5 món cùng lúc.
- 🧊 *"Khách mua 3k nước đá"* ➔ EV ghi nhận + Thu tiền bán nước đá 3.000đ.
- 📝 *"EV nhớ là chú Ba bảo vệ hay uống 1 ly rau má đậu 15k nhé"* ➔ EV tự học vào Sổ tay.
- 📊 *"Báo cáo P&L hôm nay"* ➔ EV xuất báo cáo tài chính chuẩn 5 dòng.`,
  };
}

export async function hoiGeminiAI(userQuery, state, apiKey) {
  const localAnalysis = phanTichTaiChinhNoiBo(userQuery, state);

  if (localAnalysis.type === "command" || localAnalysis.type === "question" || localAnalysis.type === "action") {
    return localAnalysis;
  }

  if (!apiKey) {
    return localAnalysis;
  }

  const today = todayKey();
  const transactions = (state.ds || []).filter((tx) => !tx.deleted);
  const todayReport = dailyReport(transactions, today, null, state.defaultOpeningCash || 500000);
  const b1Report = dailyReport(transactions, today, "Quán Nhà (Chính)", state.defaultOpeningCash || 500000);
  const b2Report = dailyReport(transactions, today, "Chi nhánh 2", state.defaultOpeningCash || 500000);

  // ÁP DỤNG THUẬT TOÁN NÉN RTK (TOKEN KILLER) TRƯỚC KHI GỬI GEMINI
  const rtkContext = compressStateWithRTK(state, todayReport, b1Report, b2Report);

  const contextPrompt = `Bạn là Thư Ký AI kiêm Giám Đốc Tài Chính (CFO) tên "EV" (phát âm: i vi) của chuỗi quán nước.
NGỮ CẢNH TÀI CHÍNH & KHÁCH QUEN (ĐÃ NÉN RTK):
- ${rtkContext.menu}
- ${rtkContext.crm}
- ${rtkContext.finance}

QUY TẮC ĐỊNH LƯỢNG & TÀI CHÍNH VẬN HÀNH THỰC TẾ:
1. "Khách mua / khách chuyển / tiền mua / bán..." = + Thu tiền bán hàng.
2. Nước mía thường chuẩn 8k/ly (vốn 4k). CHỈ khi khách dặn/yêu cầu ly lớn mới tính 10k (vốn 5k). Mía 1L giá 16k (vốn 10k).
3. Bao bì + màng ép + ống hút + đá viên tính gộp chung 1k/phần (Mía 1L ko đá vẫn tính chung 1k).
4. Định phí quán: Mặt bằng 200k/ngày (6tr/tháng), Điện 25-30 ký ~80k/ngày (2.4tr/tháng), Nước 5k, Rác, Khấu hao & phát sinh = ~313.300đ/ngày (9.4tr/tháng).
5. Mục tiêu doanh thu hòa vốn toàn quán: ~628.000đ/ngày (~18.8tr/tháng với biên lãi gộp bình quân ~50%). Vượt 628k là bắt đầu có lời ròng thực tế bỏ túi.
6. KHẢ NĂNG PHẢN BIỆN & ĐỌC HIỂU SÂU:
   - Nếu câu nói CHỈ CÓ GIÁ TIỀN hoặc CHỈ CÓ TỔNG TIỀN mà KHÔNG CÓ TÊN MÓN/DANH SÁCH MÓN -> Phải lịch sự hỏi lại để chủ quán làm rõ danh sách món nước trước khi ghi sổ.
   - Nếu câu nói có số tiền LỆCH BẤT THƯỜNG so với đơn giá Menu (ví dụ "2 ly mía 100k") -> Phải phản biện lịch sự, hỏi lại xem là khách mua nhiều ly, mua lít hay cho tiền boa (tip).
   - Nếu câu nói mua nguyên liệu mà CHƯA CÓ GIÁ (ví dụ "mua 2 bao đá") -> Phải hỏi lại giá tiền bao nhiêu.
7. Khi gặp khách quen (Chú Ba, Anh B, Chị Lan...), tự động áp dụng món quen và hình thức thanh toán.
8. Trả lời bằng Markdown ngắn gọn, ấm áp, logic, phản biện sắc bén, chuẩn xác số liệu tài chính, xưng "EV" hoặc "Dạ EV".`;

  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: `${contextPrompt}\n\nCâu nói/yêu cầu của chủ quán: "${userQuery}"` }],
          },
        ],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 600,
        },
      }),
    });

    if (!response.ok) {
      console.warn("Gemini API error, fallback to local NLP", response.status);
      return localAnalysis;
    }

    const data = await response.json();
    const replyText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (replyText) {
      return {
        type: "gemini_ai",
        reply: replyText,
      };
    }
    return localAnalysis;
  } catch (error) {
    console.warn("Gemini request failed, using local analyst", error);
    return localAnalysis;
  }
}
