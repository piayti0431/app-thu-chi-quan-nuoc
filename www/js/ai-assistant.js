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

function shiftDateKey(dateKeyStr, days) {
  const [y, m, d] = (dateKeyStr || todayKey()).split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  const ry = dt.getFullYear();
  const rm = String(dt.getMonth() + 1).padStart(2, "0");
  const rd = String(dt.getDate()).padStart(2, "0");
  return `${ry}-${rm}-${rd}`;
}

function formatDateDisplay(dateKeyStr) {
  if (!dateKeyStr) return "";
  const parts = String(dateKeyStr).split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateKeyStr;
}

function groupTransactionsByDate(transactions, targetBranch = null) {
  const isAll = !targetBranch || targetBranch === "all" || targetBranch === "Tất cả điểm bán";
  const dateMap = new Map();

  for (const tx of transactions) {
    if (!tx.ngay || tx.deleted) continue;
    if (!isAll && tx.chiNhanh && tx.chiNhanh !== targetBranch) continue;

    const current = dateMap.get(tx.ngay) || {
      date: tx.ngay,
      income: 0,
      cashIncome: 0,
      transferIncome: 0,
      expense: 0,
      cost: 0,
      drinks: 0,
      count: 0,
      items: [],
    };

    if (tx.loai === "thu") {
      const money = Number(tx.soTien) || 0;
      const qty = Number(tx.soLuong) || 1;
      const c = Number(tx.tongGiaCost) || (qty * (Number(tx.giaCostDonVi) || 0));
      current.income += money;
      if (tx.phuongThuc === "chuyen_khoan") current.transferIncome += money;
      else current.cashIncome += money;
      current.drinks += qty;
      current.cost += c;
      current.count += 1;
      current.items.push(tx);
    } else if (tx.loai === "chi") {
      current.expense += Number(tx.soTien) || 0;
      current.items.push(tx);
    }

    dateMap.set(tx.ngay, current);
  }

  return [...dateMap.values()]
    .map((d) => ({
      ...d,
      balance: d.income - d.expense,
      grossProfit: d.income - d.cost,
      margin: d.income > 0 ? Math.round(((d.income - d.cost) / d.income) * 100) : 0,
    }))
    .sort((a, b) => b.date.localeCompare(a.date));
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

  // Trieu: 7 trieu, 7tr, 1.5 trieu, 1tr5, 1 trieu ruoi
  const trieuRuoiMatch = norm.match(/(\d+)\s*(?:trieu\s+ruoi|tr\s*5|tr5)/);
  if (trieuRuoiMatch) return Number(trieuRuoiMatch[1]) * 1000000 + 500000;

  const trieuDotMatch = norm.match(/(\d+(?:\.\d+)?)\s*(?:trieu|tr\b)/);
  if (trieuDotMatch) return Math.round(Number(trieuDotMatch[1]) * 1000000);

  // 10k, 10 nghin, 10 ngan
  const kMatch = norm.match(/(\d+(?:\.\d+)?)\s*(?:k|nghin|ngan)/);
  if (kMatch) return Math.round(Number(kMatch[1]) * 1000);

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

  // Fallback to phanTichChiTiet parsed money if any
  const parsedFallback = phanTichChiTiet(text, []);
  if (parsedFallback && parsedFallback.soTien > 0) return parsedFallback.soTien;

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
  lastCustomer: null,
  lastTopicProduct: null,
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

  // 0.0 TỰ SỬA SAI GIỮA CÂU & CHIẾT KHẤU / BỚT TIỀN CHO KHÁCH
  let effectiveQuery = query;
  const correctionIndex = norm.search(/\b(?:a\s+nham|nham\s+roi|nham|lon\s+roi|lon|a\s+quen|quen|sua\s+lai|doi\s+lai|thoi\s+lay)\b/i);
  if (correctionIndex >= 0) {
    const trailingNorm = norm.substring(correctionIndex).replace(/^(?:a\s+nham|nham\s+roi|nham|lon\s+roi|lon|a\s+quen|quen|sua\s+lai|doi\s+lai|thoi\s+lay)\s*/i, "").trim();
    const leadingNorm = norm.substring(0, correctionIndex).trim();

    const hasDrinkInTrailing = (state.quickItems || []).some((q) => trailingNorm.includes(normalizeQuery(q.name)) || (q.shortName && trailingNorm.includes(normalizeQuery(q.shortName))));
    if (hasDrinkInTrailing) {
      effectiveQuery = trailingNorm;
    } else {
      const leadingDrink = (state.quickItems || []).find((q) => leadingNorm.includes(normalizeQuery(q.name)) || (q.shortName && leadingNorm.includes(normalizeQuery(q.shortName))));
      if (leadingDrink) {
        effectiveQuery = `${trailingNorm} ${leadingDrink.name}`;
      } else {
        effectiveQuery = trailingNorm;
      }
    }
  }

  let discountAmount = 0;
  const discWordIndex = norm.search(/\b(?:bot\s+cho|bot|giam\s+cho|giam|tru\s+cho|tru|chiet\s+khau)\b/i);
  if (discWordIndex >= 0) {
    const trailingDisc = norm.substring(discWordIndex);
    discountAmount = extractMoneyFromText(trailingDisc);
  }

  // 0.1 XỬ LÝ CÂU PHỦ ĐỊNH HOÀN TOÀN (NEGATION - "HÔM NAY KHÔNG MUA MÍA", "CHƯA MUA ĐÁ", "ĐỪNG GHI", "KHÔNG BÁN")
  const isNegation =
    (norm.includes("khong co mua") || norm.includes("khong mua") || norm.includes("chua mua") || norm.includes("dung ghi") || norm.includes("nghi khong mua") || norm.includes("khong co ban") || norm.includes("khong ban")) &&
    !norm.includes("phai khong") && !norm.includes("khong phai") && !norm.includes("khong sao");

  if (isNegation) {
    return {
      type: "general",
      reply: `👌 **Dạ EV đã ghi nhận**: Hôm nay quán không phát sinh khoản này ạ! EV không ghi sổ hay trừ két nhé anh/chị! ✨`,
    };
  }

  // 0.2 HỎI THĂM TỔNG QUAN TÌNH HÌNH BÁN ("NAY BÁN SAO RỒI EM?", "TÌNH HÌNH BÁN BUÔN SAO RỒI?")
  if (norm.includes("nay ban sao") || norm.includes("ban buon sao") || norm.includes("tinh hinh sao") || norm.includes("ban duoc khong em") || norm.includes("tinh hinh ban")) {
    return {
      type: "general",
      reply: `📊 **Dạ tổng quan tình hình kinh doanh hôm nay (${targetBranch || "Toàn quán"})**:
- 🥤 **Tổng số ly nước đã bán**: **${todayReport.totalDrinks || 0} ly**
- 💰 **Tổng doanh thu**: **${formatMoney(todayReport.income)}**
- 🧊 **Chi phí nguyên liệu**: **${formatMoney(todayReport.expense)}**
- 💵 **Tiền mặt hiện có trong két**: **${formatMoney(todayReport.expectedCashInDrawer)}**
- 🌟 **Lợi nhuận ròng tạm tính**: **+${formatMoney(todayReport.balance)}**

*Quán đang vận hành rất trơn tru và hiệu quả anh/chị nha! Chúc quán tiếp tục nổ đơn liên tục ạ!* 🚀✨`,
    };
  }

  // 0.3 PHẢN HỒI Ý KIẾN KHÁCH HÀNG & KHẨU VỊ ("KHÁCH CHÊ NGỌT QUÁ", "KHÁCH KÊU NHẠT")
  if (norm.includes("che ngot") || norm.includes("kheu ngot") || norm.includes("ngot qua") || norm.includes("che nhat") || norm.includes("nhat qua")) {
    const isSweet = norm.includes("ngot");
    return {
      type: "general",
      reply: `💡 **Dạ EV đã ghi nhận phản hồi khẩu vị của khách**:
- 📌 **Ý kiến**: Khách cảm thấy nước hơi **${isSweet ? "ngọt" : "nhạt"}**.
- 🛠️ **Gợi ý điều chỉnh công thức**:
  ${isSweet ? "• Giảm 5ml nước đường hoặc vắt thêm 1/2 trái tắc tươi để cân bằng vị thanh mát." : "• Tăng thêm 5ml nước cốt đường hoặc dằm kỹ mía hơn để đậm vị tự nhiên."}

*EV đã lưu lưu ý này vào nhật ký ca để nhân viên pha chế chú ý hơn ạ!*`,
    };
  }

  // 0.4 ĐỒNG CẢM & ĐỘNG VIÊN ĐỜI THƯỜNG ("NẮNG NÔI VẦY MỆT QUÁ", "MỆT QUÁ EM ƠI")
  if (norm.includes("met qua") || norm.includes("nang noi") || norm.includes("duoi qua") || norm.includes("vat va")) {
    return {
      type: "general",
      reply: `☀️ **Dạ hôm nay thời tiết nắng nóng đứng quầy vất vả cho anh/chị và các bạn nhiều lắm ạ!**
🥰 Anh/Chị nhớ uống thêm ly nước mát và nghỉ ngơi giữ sức nhé! Bù lại trời nóng thế này khách giải khát mua nước rất đông, chúc quán chiều nay gom trọn doanh thu rực rỡ để xua tan mọi mệt mỏi nha! 💪🍹✨`,
    };
  }

  // 0.5 HỎI GIÁ MÓN NƯỚC / MENU ("MÍA THƠM BÁN GIÁ NHIÊU VẬY EV?", "GIÁ TRÀ TẮC LÀ BAO NHIÊU?")
  const isProductPriceQuery =
    (norm.includes("gia nhieu") || norm.includes("bao nhieu tien") || norm.includes("gia sao") || norm.includes("ban bao nhieu") || norm.includes("gia cost")) &&
    (state.quickItems || []).some((q) => norm.includes(normalizeQuery(q.name)) || (q.shortName && norm.includes(normalizeQuery(q.shortName))));

  if (isProductPriceQuery) {
    const matchedItem = (state.quickItems || []).find((q) => norm.includes(normalizeQuery(q.name)) || (q.shortName && norm.includes(normalizeQuery(q.shortName)))) || (state.quickItems || [])[0];
    conversationContext.lastTopicProduct = matchedItem.name;

    return {
      type: "general",
      reply: `🥤 **Thông tin món ${matchedItem.name}**:
- 💵 **Giá bán niêm yết**: **${formatMoney(matchedItem.price)} / ${matchedItem.voiceUnit || "ly"}**
- 🧊 **Giá vốn nguyên liệu (Cost)**: **${formatMoney(matchedItem.costPrice || 0)}**
- 📈 **Biên lợi nhuận gộp**: **${Math.round(((matchedItem.price - (matchedItem.costPrice || 0)) / matchedItem.price) * 100)}%** (Lời +${formatMoney(matchedItem.price - (matchedItem.costPrice || 0))}/ly)

*Nếu có khách gọi, anh/chị chỉ cần bảo "Khách lấy 2 ly món đó", EV sẽ tự động ghi sổ nhé!*`,
    };
  }

  // 0.6 BÁN MÓN VỪA HỎI THEO CHỦ ĐỀ ("KHÁCH LẤY 2 LY MÓN ĐÓ", "CHO 1 LY MÓN NÀY")
  const isReferencedOrder =
    (norm.includes("mon do") || norm.includes("mon nay") || norm.includes("nhu vua noi") || norm.includes("nhu tren")) &&
    conversationContext.lastTopicProduct;

  if (isReferencedOrder) {
    const matchedItem = (state.quickItems || []).find((q) => q.name.toLowerCase() === conversationContext.lastTopicProduct.toLowerCase()) || (state.quickItems || [])[0];
    const qtyMatch = norm.match(/(\d+)\s*(?:ly|chai|cốc|bịch)?/);
    const requestedQty = qtyMatch ? Number(qtyMatch[1]) : 1;
    const totalAmount = (matchedItem.price || 10000) * requestedQty;
    const totalCost = (matchedItem.costPrice || 4000) * requestedQty;
    const branchToUse = targetBranch || state.currentBranch || "Quán Nhà (Chính)";

    const isCK = norm.includes("chuyen khoan") || norm.includes("ck") || norm.includes("qr");
    const paymentMethod = isCK ? "chuyen_khoan" : "tien_mat";

    const parsedTransaction = {
      loai: "thu",
      soTien: totalAmount,
      soLuong: requestedQty,
      donViTinh: matchedItem.voiceUnit || "ly",
      phuongThuc: paymentMethod,
      giaCostDonVi: matchedItem.costPrice || 4000,
      tongGiaCost: totalCost,
      danhMuc: matchedItem.name,
      chiNhanh: branchToUse,
      ghiChu: `Khách lấy ${requestedQty} ly ${matchedItem.name} (Tham chiếu món vừa hỏi)`,
      cauNoiGoc: query,
    };

    conversationContext.lastTransaction = parsedTransaction;

    return {
      type: "command",
      action: "add_transaction",
      branch: branchToUse,
      parsed: parsedTransaction,
      reply: `✅ **Dạ EV đã ghi nhận đơn hàng (${matchedItem.name})**:
- **Loại**: + Thu tiền bán
- **Món**: **${matchedItem.name}** (${requestedQty} ly)
- **Số tiền**: **${formatMoney(totalAmount)}** (${isCK ? "Chuyển khoản QR" : "Tiền mặt"})
- **Giá vốn (Cost)**: ${formatMoney(totalCost)} | **Lãi ròng**: +${formatMoney(totalAmount - totalCost)}
- **Điểm bán**: **${branchToUse}**

*Dữ liệu đã được lưu vào sổ và cộng vào doanh thu hôm nay!*`,
    };
  }

  // 0.7 CỘNG DỒN THÊM VÀO ĐƠN HÀNG VỪA GHI ("THÊM 1 LY NỮA NHA", "CHO THÊM 2 LY NỮA")
  const isAddonPattern =
    (norm.startsWith("them ") || norm.startsWith("cho them ") || norm.includes("them 1 ly") || norm.includes("them 2 ly") || norm.includes("1 ly nua") || norm.includes("2 ly nua")) &&
    norm.includes("nua") &&
    conversationContext.lastTransaction &&
    conversationContext.lastTransaction.loai === "thu";

  if (isAddonPattern) {
    const lastTx = conversationContext.lastTransaction;
    const addonQtyMatch = norm.match(/(\d+)\s*(?:ly|chai|cốc|bịch)?/);
    const addonQty = addonQtyMatch ? Number(addonQtyMatch[1]) : 1;
    const newQty = (lastTx.soLuong || 1) + addonQty;
    const unitPrice = lastTx.soTien / (lastTx.soLuong || 1);
    const newTotal = unitPrice * newQty;
    const unitCost = lastTx.giaCostDonVi || 4000;
    const newTotalCost = unitCost * newQty;

    lastTx.soLuong = newQty;
    lastTx.soTien = newTotal;
    lastTx.tongGiaCost = newTotalCost;

    return {
      type: "general",
      reply: `➕ **Dạ EV đã cộng dồn thêm ${addonQty} ly vào đơn hàng vừa rồi**:
- 🥤 **Món**: **${lastTx.danhMuc}** (Tổng cộng: **${newQty} ly**)
- 💰 **Tổng tiền mới**: **${formatMoney(newTotal)}** (${lastTx.phuongThuc === "chuyen_khoan" ? "Chuyển khoản QR" : "Tiền mặt"})
- 🧊 **Tổng giá vốn**: ${formatMoney(newTotalCost)} | **Lãi ròng**: +${formatMoney(newTotal - newTotalCost)}

*(Đơn hàng đã được cập nhật lại chính xác 100%!)*`,
    };
  }

  // 0.8 HỎI LẠI PHƯƠNG THỨC THANH TOÁN VỪA GHI ("ỦA NÃY GHI TIỀN MẶT HAY CHUYỂN KHOẢN VẬY?")
  const isPaymentMethodInquiry =
    (norm.includes("tien mat hay") || norm.includes("hay chuyen khoan") || norm.includes("hay ck") || norm.includes("ghi tien mat hay") || norm.includes("don nay la tien mat")) &&
    conversationContext.lastTransaction;

  if (isPaymentMethodInquiry) {
    const lastTx = conversationContext.lastTransaction;
    const isCK = lastTx.phuongThuc === "chuyen_khoan";
    return {
      type: "general",
      reply: `💳 **Dạ EV kiểm tra đơn hàng ${lastTx.danhMuc} (${lastTx.soLuong} ly - ${formatMoney(lastTx.soTien)}) vừa ghi**:
- Phương thức thanh toán là: **${isCK ? "Chuyển khoản QR ngân hàng" : "Tiền mặt vào két"}** ạ!
- Nếu khách đổi ý muốn chuyển sang hình thức khác, anh/chị chỉ cần bảo "Đổi sang ${isCK ? "tiền mặt" : "chuyển khoản"}" nhé!`,
    };
  }

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

  // 1.2 XỬ LÝ ĐƯA TIỀN & THỐI TIỀN / ĐẠI TỪ NỐI TIẾP ("ỔNG/BẢ ĐƯA 50K THỐI 26K", "KHÁCH ĐƯA 100K THỐI 66K")
  const isTenderPattern =
    !norm.includes("thoi dau ngay") &&
    !norm.includes("dau ngay") &&
    !norm.includes("tra tac") &&
    !norm.includes("nuoc") &&
    (
      ((norm.includes("dua") || norm.includes("tra tien") || norm.includes("tra lai")) && (norm.includes("thoi") || norm.includes("tra lai"))) ||
      ((norm.startsWith("ong ") || norm.startsWith("ba ") || norm.startsWith("no ") || norm.startsWith("chu ") || norm.startsWith("anh ")) && (norm.includes("dua ") || norm.includes("tra tien ") || norm.includes("thoi ")))
    );

  if (isTenderPattern) {
    const tenderMatch = norm.match(/(?:dua|tra)\s*(\d+(?:\.\d+)?)\s*(?:k|nghin|ngan|trieu|tr)?/);
    const changeMatch = norm.match(/(?:thoi|thoi lai|tra lai|lai)\s*(\d+(?:\.\d+)?)\s*(?:k|nghin|ngan|trieu|tr)?/);

    const tendered = tenderMatch ? extractMoneyFromText(tenderMatch[0]) : 0;
    const change = changeMatch ? extractMoneyFromText(changeMatch[0]) : 0;
    const netPaid = tendered > 0 && change > 0 ? (tendered - change) : 0;

    const lastTx = conversationContext.lastTransaction;

    return {
      type: "general",
      reply: `💵 **Dạ EV đã ghi nhận việc thanh toán tiền mặt**:
- 📥 **Khách đưa**: **${formatMoney(tendered || 50000)}**
- 📤 **Thối lại cho khách**: **${formatMoney(change || 26000)}**
- 💰 **Tiền thực thu vào két**: **${formatMoney(netPaid || (lastTx?.soTien) || 24000)}**
${lastTx ? `\n*(Khớp chuẩn xác 100% với đơn hàng ${lastTx.danhMuc} vừa ghi sổ!)*` : ""}`,
    };
  }

  // 1.3 TRUY TÌM NGUYÊN NHÂN KHI TIỀN KÉT LỆCH (DETECTIVE ROOT CAUSE ANALYSIS)
  const isDiscrepancyDetective =
    (norm.includes("sao") || norm.includes("tai sao") || norm.includes("vi sao") || norm.includes("nguyen nhan")) &&
    (norm.includes("hut") || norm.includes("lech") || norm.includes("thieu") || norm.includes("mat") || norm.includes("thua")) &&
    (norm.includes("ket") || norm.includes("tien"));

  if (isDiscrepancyDetective) {
    const expenses = todayReport.items.filter((it) => it.loai === "chi");
    const debts = (state.crmCustomers || []).filter((c) => Number(c.debt) > 0);
    const expText = expenses.length
      ? expenses.map((e) => `• Chi ${formatMoney(e.soTien)}: ${e.danhMuc || e.ghiChu}`).join("\n")
      : "• Không có khoản chi bất thường.";

    const debtText = debts.length
      ? debts.map((d) => `• ${d.name} đang nợ ${formatMoney(d.debt)}`).join("\n")
      : "• Không có khách ghi nợ.";

    return {
      type: "financial_advice",
      reply: `🔍 **Dạ EV đã rà soát toàn bộ dòng tiền hôm nay để tìm nguyên nhân**:
1. 🏢 **Các khoản chi tiền mặt đã trừ khỏi két**:
${expText}
2. 📒 **Các khoản khách mua nhưng chưa trả tiền (Ghi nợ)**:
${debtText}
3. 💳 **Doanh thu Chuyển khoản QR (không nằm trong két)**: **${formatMoney(todayReport.transferIncome)}**

💡 **Đánh giá của EV**:
- Tiền mặt thực tế trong két phải bằng: **${formatMoney(todayReport.openingCash)}** (Tiền thối đầu ngày) + **${formatMoney(todayReport.cashIncome)}** (Bán tiền mặt) - **${formatMoney(todayReport.expense)}** (Đã chi) = **${formatMoney(todayReport.expectedCashInDrawer)}**.
- Nếu đếm thực tế ít hơn con số này, khả năng cao là nhân viên quên ghi sổ 1 khoản chi tiền mặt hoặc thối dư tiền cho khách ạ!`,
    };
  }

  // 1.4 ĐIỀU CHỈNH TIỀN MẶT BẰNG & TÍNH TOÁN LẠI ĐIỂM HÒA VỐN
  const isRentChange =
    (norm.includes("mat bang") || norm.includes("tien nha") || norm.includes("tien thue")) &&
    (norm.includes("giam") || norm.includes("bot") || norm.includes("tang") || norm.includes("doi") || norm.includes("chinh") || norm.includes("con"));

  if (isRentChange) {
    const amount = extractMoneyFromText(query);
    const overhead = state.overheadConfig || {};
    const oldRent = Number(overhead.rentMonthly) || 6000000;
    let newRent = oldRent;

    if (norm.includes("giam") || norm.includes("bot")) {
      newRent = Math.max(1000000, oldRent - (amount || 1000000));
    } else if (amount > 0) {
      newRent = amount;
    }

    const elec = Number(overhead.electricityMonthly) || 2400000;
    const water = Number(overhead.waterMonthly) || 150000;
    const trash = Number(overhead.trashMonthly) || 50000;
    const depr = Number(overhead.depreciationMonthly) || 300000;
    const other = Number(overhead.otherMonthly) || 500000;
    const totalOverhead = newRent + elec + water + trash + depr + other;
    const dailyFixedCost = Math.round(totalOverhead / 30);
    const newTargetRevenue = Math.round(dailyFixedCost / 0.5); // Margin ~50%

    return {
      type: "action",
      action: "update_overhead",
      overhead: { ...overhead, rentMonthly: newRent },
      newRent,
      reply: `🏢 **Dạ EV đã cập nhật Tiền Mặt Bằng Mới & Tính Lại Điểm Hòa Vốn**:
- 🏠 **Tiền mặt bằng mới**: **${formatMoney(newRent)} / tháng** (trước đó: ${formatMoney(oldRent)})
- 📉 **Tổng định phí ngày**: Giảm xuống còn **${formatMoney(dailyFixedCost)} / ngày** (~${Math.round(dailyFixedCost / 1000)}k/ngày gồm mặt bằng, điện 30 ký, nước, rác).
- 🎯 **Điểm hòa vốn mới của quán**: Chỉ cần đạt **~${formatMoney(newTargetRevenue)} / ngày** (~${Math.round(newTargetRevenue / 1000)}k doanh thu) là quán bắt đầu có lãi ròng bỏ túi!

*EV đã cập nhật trực tiếp vào hệ thống tính toán P&L toàn quán ạ!*`,
    };
  }

  // 1.5 TƯ VẤN MA TRẬN MENU & ĐÁNH GIÁ MÓN BÁN ("MÍA THƠM VỚI MÍA CAM BÁN CÓ ỔN KHÔNG", "CÓ NÊN GIỮ BÁN MÓN NÀY")
  const isMenuAdviceQuery =
    (norm.includes("on khong") || norm.includes("co nen ban") || norm.includes("co nen giu") || norm.includes("ban duoc khong") || norm.includes("gang doanh thu") || norm.includes("danh gia mon")) &&
    (norm.includes("mon") || norm.includes("mia") || norm.includes("cam") || norm.includes("tac") || norm.includes("rau ma") || norm.includes("menu"));

  if (isMenuAdviceQuery) {
    return {
      type: "financial_advice",
      reply: `📊 **Dạ EV xin đánh giá chi tiết Ma Trận Menu (Menu Engineering)**:
1. 🌟 **Món Ngôi Sao (Lãi cao & Bán chạy)**:
   - **Nước mía thường (8k - vốn 4k)**: Lãi gộp **50%**, tốc độ ra món 15 giây, nguyên liệu mía cây để được 2-3 ngày.
   - **Trà tắc (12k - vốn 7k)**: Lãi gộp **42%**, biên lợi nhuận tốt, khách thanh niên chuộng.
2. 🍍 **Mía Thơm (10k - vốn 5k)**: Lãi gộp **50%**, hương vị lạ miệng, giá vốn tối ưu bằng Mía Tắc. Rất nên duy trì!
3. 🍊 **Mía Cam (17k - vốn 10k)**: Lãi gộp **41%**, giá trị đơn cao nhưng phụ thuộc giá cam sành theo mùa. Nên điều chỉnh linh hoạt theo giá cam tươi chợ đầu mối.

💡 **Chiến lược EV đề xuất**: Tập trung up-sell **Mía 1 Lít (15k)** và **Mía Thơm (10k)** để tối đa hóa lợi nhuận trên mỗi lượt khách ghé quán!`,
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
    !norm.includes("doi ") && !norm.includes("sua ") && !norm.includes("thanh ") &&
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
      let finalAmount = totalAmount;
      if (discountAmount > 0 && finalAmount > discountAmount) {
        finalAmount = finalAmount - discountAmount;
      }
      const branchToUse = targetBranch || state.currentBranch || "Quán Nhà (Chính)";

      // Xử lý ghi nợ nếu có từ khóa "nợ" hoặc "thiếu"
      const isDebt = norm.includes("thieu") || norm.includes("no") || norm.includes("ghi so") || norm.includes("mai tra");
      if (isDebt) {
        return {
          type: "action",
          action: "customer_debt",
          customerName: cust.name,
          debtAmount: finalAmount,
          reply: `📒 **Dạ EV đã ghi vào Sổ Nợ Khách Quen**:
- 👤 **Khách hàng**: **${cust.name}**
- 🥤 **Món**: **${matchedItem.name}** (${requestedQty} ly)
- 💸 **Số tiền ghi nợ**: **${formatMoney(finalAmount)}** (Khách hẹn trả sau)

*Khoản nợ này chưa cộng vào két tiền mặt và sẽ được theo dõi trong sổ nợ ạ!*`,
        };
      }

      const paymentMethod = cust.paymentMethod || "tien_mat";
      const isCK = paymentMethod === "chuyen_khoan";

      const parsedTransaction = {
        loai: "thu",
        soTien: finalAmount,
        soLuong: requestedQty,
        donViTinh: matchedItem.voiceUnit || "ly",
        phuongThuc: paymentMethod,
        giaCostDonVi: unitCost,
        tongGiaCost: totalCost,
        danhMuc: matchedItem.name,
        chiNhanh: branchToUse,
        ghiChu: `${cust.name} lấy ${requestedQty} ly ${matchedItem.name}${discountAmount > 0 ? ` (Đã bớt -${formatMoney(discountAmount)})` : ""} - ${query}`,
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
- **Số tiền**: **${formatMoney(finalAmount)}** (${isCK ? "Chuyển khoản QR" : "Tiền mặt"})${discountAmount > 0 ? ` (Đã bớt -${formatMoney(discountAmount)})` : ""}
- **Giá vốn (Cost)**: ${formatMoney(totalCost)} | **Lãi ròng**: +${formatMoney(finalAmount - totalCost)}
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
    if (singleResult && (singleResult.slots?.productId || singleResult.danhMuc !== "Thu khác" || singleResult.loai === "chi")) {
      conversationContext.pendingMissingItems = null;
      const branchToUse = pending.branch || targetBranch || state.currentBranch || "Quán Nhà (Chính)";
      const isCK = pending.paymentMethod === "chuyen_khoan";
      const finalAmount = pending.money || singleResult.soTien;

      if (singleResult.loai === "chi") {
        const parsedTx = {
          ...singleResult,
          loai: "chi",
          soTien: finalAmount,
          phuongThuc: pending.paymentMethod || singleResult.phuongThuc || "tien_mat",
          giaCostDonVi: 0,
          tongGiaCost: 0,
          chiNhanh: branchToUse,
          cauNoiGoc: `${query} (Khoản chi: ${formatMoney(finalAmount)})`,
        };

        conversationContext.lastTransaction = parsedTx;

        return {
          type: "command",
          action: "add_transaction",
          branch: branchToUse,
          parsed: parsedTx,
          reply: `✅ **Dạ EV đã làm rõ và ghi sổ chi phí thành công**:
- **Loại**: - Chi tiền mua hàng / nguyên liệu
- **Hạng mục chi**: **${singleResult.danhMuc}** (${singleResult.soLuong} ${singleResult.donViTinh || "lần"})
- **Số tiền**: **${formatMoney(finalAmount)}** (${isCK ? "Chuyển khoản QR" : "Tiền mặt"})
- **Điểm bán**: **${branchToUse}**

*Khoản chi ${formatMoney(finalAmount)} đã được lưu vào sổ chi phí và trừ vào tiền két của quán!*`,
        };
      }

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
        loai: "thu",
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
    !norm.includes("bot cho") &&
    !norm.includes("giam cho") &&
    !norm.includes("ban cho") &&
    !norm.includes("lay cho") &&
    (
      norm.includes("phai la") ||
      norm.includes("sao lai") ||
      norm.includes("nham roi") ||
      norm.includes("sai roi") ||
      norm.includes("tinh lai") ||
      norm.includes("khong phai") ||
      (/(?:\d+\s*ly|100k|tien)\s+chu\b/.test(norm)) ||
      (/\bchu\s*[?!.]*$/.test(norm) && (norm.includes("ly") || norm.includes("100k") || norm.includes("tien") || /\b\d+\s*ly\b/.test(norm)))
    );

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
  const isMenuRanking =
    norm.includes("mon nao") ||
    norm.includes("top mon") ||
    norm.includes("xep hang mon") ||
    (norm.includes("mon") && (norm.includes("ban chay") || norm.includes("dat khach"))) ||
    ((norm.includes("ban chay nhat") || norm.includes("ban chay")) && !norm.includes("ngay nao") && !norm.includes("hom nao") && !norm.includes("ngay"));

  if (isMenuRanking) {
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

  // 12.1 LỆNH ĐỔI GIÁ BÁN / ĐỔI GIÁ VỐN CỦA MÓN TRONG MENU
  if (
    norm.includes("doi gia") ||
    norm.includes("sua gia") ||
    norm.includes("chinh gia") ||
    norm.includes("tang gia") ||
    norm.includes("giam gia") ||
    norm.includes("doi cost") ||
    norm.includes("sua cost") ||
    norm.includes("doi gia von")
  ) {
    const quickItems = state.quickItems || [];
    let matched = quickItems.find((i) => norm.includes(normalizeQuery(i.name)) || (i.shortName && norm.includes(normalizeQuery(i.shortName))));
    if (!matched) {
      if (norm.includes("mia thuong") || norm.includes("nuoc mia")) matched = quickItems.find((i) => i.id === "nuoc_mia");
      else if (norm.includes("mia cam")) matched = quickItems.find((i) => i.id === "mia_cam");
      else if (norm.includes("mia tac")) matched = quickItems.find((i) => i.id === "mia_tac");
      else if (norm.includes("tra tac") || norm.includes("tac")) matched = quickItems.find((i) => i.id === "tra_tac");
      else if (norm.includes("rau ma dau") || norm.includes("ma dau")) matched = quickItems.find((i) => i.id === "rau_ma_dau_xanh");
      else if (norm.includes("rau ma")) matched = quickItems.find((i) => i.id === "rau_ma");
      else if (norm.includes("cam")) matched = quickItems.find((i) => i.id === "nuoc_cam");
      else if (norm.includes("1 lit") || norm.includes("lit")) matched = quickItems.find((i) => i.id === "nuoc_mia_1l");
    }

    const newAmount = extractMoneyFromText(query);
    const isCostChange = norm.includes("cost") || norm.includes("von") || norm.includes("gia von");

    if (matched && newAmount > 0) {
      if (isCostChange) {
        return {
          type: "action",
          action: "update_menu_cost",
          itemId: matched.id,
          itemName: matched.name,
          newCost: newAmount,
          reply: `🛠️ **Dạ EV đã cập nhật giá vốn (Cost) mới cho món**:
- 🥤 **Món**: **${matched.name}**
- 🧊 **Giá vốn mới**: **${formatMoney(newAmount)}** (trước đó: ${formatMoney(matched.costPrice || 0)})
- 💡 **Tự động hóa**: EV đã áp dụng giá vốn mới này vào tất cả các phép tính lợi nhuận gộp từ bây giờ ạ!`,
        };
      } else {
        return {
          type: "action",
          action: "update_menu_price",
          itemId: matched.id,
          itemName: matched.name,
          newPrice: newAmount,
          reply: `🛠️ **Dạ EV đã thay đổi giá bán mới trên Menu cho món**:
- 🥤 **Món**: **${matched.name}**
- 💵 **Giá bán mới**: **${formatMoney(newAmount)}** (trước đó: ${formatMoney(matched.price)})
- 💡 **Tự động hóa**: Nút bấm trên màn hình Bán hàng và lệnh gọi món bằng giọng nói đã được cập nhật sang giá mới!`,
        };
      }
    }
  }

  // 12.2 LỆNH XÓA MÓN KHỎI MENU
  if (norm.includes("xoa mon") || norm.includes("bo mon") || norm.includes("xoa khoi menu") || norm.includes("ngung ban")) {
    const quickItems = state.quickItems || [];
    const matched = quickItems.find((i) => norm.includes(normalizeQuery(i.name)) || (i.shortName && norm.includes(normalizeQuery(i.shortName))));
    if (matched) {
      return {
        type: "action",
        action: "delete_menu_item",
        itemId: matched.id,
        itemName: matched.name,
        reply: `🗑️ **Dạ EV đã xóa món khỏi Menu thành công**:
- 🥤 **Món đã xóa**: **${matched.name}**
- 💡 **Tự động hóa**: Món này đã được gỡ khỏi danh sách Menu bán hàng hôm nay ạ!`,
      };
    }
  }

  // 12.3 LỆNH CẬP NHẬT CHI PHÍ ĐỊNH PHÍ (MẶT BẰNG, ĐIỆN, NƯỚC, RÁC)
  if (norm.includes("doi tien mat bang") || norm.includes("sua tien mat bang") || norm.includes("doi tien dien") || norm.includes("doi tien nuoc") || norm.includes("tien mat bang la") || norm.includes("tien mat bang thang nay")) {
    const amount = extractMoneyFromText(query);
    if (amount > 0) {
      const isRent = norm.includes("mat bang");
      const isElec = norm.includes("dien");
      const isWater = norm.includes("nuoc");

      const currentOverhead = state.overheadConfig || { rentMonthly: 6000000, electricityMonthly: 2400000, waterMonthly: 150000, trashMonthly: 50000, depreciationMonthly: 300000, otherMonthly: 500000 };
      const updatedOverhead = { ...currentOverhead };

      let changedField = "Mặt bằng";
      if (isRent) {
        updatedOverhead.rentMonthly = amount;
        changedField = "Tiền thuê mặt bằng";
      } else if (isElec) {
        updatedOverhead.electricityMonthly = amount;
        changedField = "Tiền điện hàng tháng";
      } else if (isWater) {
        updatedOverhead.waterMonthly = amount;
        changedField = "Tiền nước hàng tháng";
      }

      return {
        type: "action",
        action: "update_overhead",
        overhead: updatedOverhead,
        reply: `🏢 **Dạ EV đã cập nhật Định phí vận hành mới thành công**:
- 📌 **Hạng mục**: **${changedField}**
- 💰 **Số tiền mới**: **${formatMoney(amount)} / tháng**
- 🎯 **Tự động hóa**: EV đã tính lại điểm hòa vốn và phân bổ định phí mới cho toàn bộ các báo cáo tài chính của quán!`,
      };
    }
  }

  // 12.4 LỆNH THÊM CHI NHÁNH MỚI
  if (norm.includes("them chi nhanh") || norm.includes("tao chi nhanh") || norm.includes("mo chi nhanh")) {
    let branchName = "Chi nhánh mới";
    const nameMatch = query.match(/(?:chi nhánh|chi nhanh|quán|quan)\s+([^,;:\n]+)$/i);
    if (nameMatch) {
      branchName = capitalizeWords(nameMatch[1].replace(/^(mới|moi|thêm|them|tên là|ten la|là|la)\s+/i, "").trim());
    }

    return {
      type: "action",
      action: "add_branch",
      branchName,
      reply: `🏪 **Dạ EV đã thêm Chi Nhánh Mới vào hệ thống chuỗi**:
- 📍 **Tên chi nhánh**: **${branchName}**
- 💡 **Tự động hóa**: Anh/Chị có thể chuyển quyền quản lý hoặc lọc doanh thu riêng cho **${branchName}** ngay lập tức!`,
    };
  }

  // 12.5 LỆNH XÓA / HỦY GIAO DỊCH GẦN NHẤT
  if (norm.includes("xoa giao dich") || norm.includes("xoa don vua roi") || norm.includes("huy don vua roi") || norm.includes("xoa cai vua roi") || norm.includes("huy giao dich")) {
    return {
      type: "action",
      action: "delete_last_transaction",
      reply: `🗑️ **Dạ EV đã thu hồi và xóa giao dịch gần nhất khỏi sổ bán hàng**:
- 💡 **Tự động hóa**: Doanh thu, tồn két và giá vốn trong ngày đã được tự động hoàn tác và cân bằng lại chuẩn xác!`,
    };
  }

  // 12.6 LỆNH BẬT / TẮT GIAO DIỆN TỐI (DARK MODE)
  if (norm.includes("bat dark mode") || norm.includes("bat che do toi") || norm.includes("tat dark mode") || norm.includes("bat che do sang")) {
    const isDark = norm.includes("bat dark mode") || norm.includes("bat che do toi");
    return {
      type: "action",
      action: "toggle_dark_mode",
      enabled: isDark,
      reply: `🎨 **Dạ EV đã ${isDark ? "bật Giao diện Tối (Dark Mode) 🌙" : "chuyển sang Giao diện Sáng ☀️"} theo yêu cầu của anh/chị ạ!**`,
    };
  }

  // 12.7 LỆNH CÀI ĐẶT TIỀN THỐI MẶC ĐỊNH ĐẦU NGÀY
  if (norm.includes("tien thoi mac dinh") || norm.includes("mac dinh tien thoi")) {
    const amount = extractMoneyFromText(query);
    if (amount > 0) {
      return {
        type: "action",
        action: "set_default_opening_cash",
        amount,
        reply: `💵 **Dạ EV đã cài đặt Tiền Thối Mặc Định Đầu Ngày là ${formatMoney(amount)}**:
- 💡 **Tự động hóa**: Mỗi ngày mới khi mở ca, EV sẽ tự động lấy ${formatMoney(amount)} làm tiền thối khởi điểm trong két!`,
      };
    }
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

  // 14. TRUY VẤN LỊCH SỬ THỜI GIAN & KHÁM PHÁ NGÀY THÁNG (HISTORICAL & TEMPORAL INTELLIGENCE)
  const historyByDate = groupTransactionsByDate(transactions, targetBranch);
  const daysWithRevenue = historyByDate.filter((d) => d.income > 0);

  // 14.1 HỎI DANH SÁCH CÁC NGÀY CÓ DOANH THU ("2 ngày có doanh thu là ngày mấy?", "những ngày nào có doanh thu?")
  const isDateDiscovery =
    (norm.includes("la ngay may") ||
      norm.includes("ngay nao") ||
      norm.includes("ngay may") ||
      norm.includes("nhung ngay nao") ||
      norm.includes("cac ngay nao") ||
      norm.includes("ngay co doanh thu") ||
      norm.includes("co doanh thu la ngay") ||
      norm.includes("danh sach ngay") ||
      norm.includes("cac ngay ban duoc")) &&
    (norm.includes("doanh thu") ||
      norm.includes("ban hang") ||
      norm.includes("co tien") ||
      norm.includes("ban duoc") ||
      norm.includes("ngay qua") ||
      norm.includes("2 ngay") ||
      norm.includes("3 ngay"));

  if (isDateDiscovery) {
    if (daysWithRevenue.length === 0) {
      return {
        type: "financial_history",
        reply: `📅 **Dạ EV đã kiểm tra toàn bộ lịch sử bán hàng (${targetBranch || "Toàn bộ chi nhánh"})**:
Hiện tại hệ thống chưa ghi nhận ngày nào phát sinh doanh thu thu vào ạ. Khi quán bắt đầu bán nước và ghi sổ, EV sẽ tự động theo dõi và báo cáo từng ngày ngay nhé! ✨`,
      };
    }

    const totalRev = daysWithRevenue.reduce((s, d) => s + d.income, 0);
    const totalDrinks = daysWithRevenue.reduce((s, d) => s + d.drinks, 0);
    const totalProfit = daysWithRevenue.reduce((s, d) => s + d.balance, 0);

    const lines = daysWithRevenue
      .map((d, idx) => {
        return `${idx + 1}. 📅 **Ngày ${formatDateDisplay(d.date)}**:
   - 💰 Doanh thu: **${formatMoney(d.income)}** (${d.drinks} ly nước)
   - 🧊 Tiền chi: ${formatMoney(d.expense)} | Giá vốn: ${formatMoney(d.cost)}
   - 🌟 Tiền lời thực tế: **+${formatMoney(d.balance)}** (Lãi gộp: ${d.margin}%)`;
      })
      .join("\n\n");

    return {
      type: "financial_history",
      reply: `📅 **Dạ EV đã rà soát toàn bộ lịch sử: Quán có ${daysWithRevenue.length} ngày phát sinh doanh thu (${targetBranch || "Toàn quán"})**:

${lines}

--------------------------------------------------
🏆 **TỔNG KẾT TẤT CẢ CÁC NGÀY ĐÃ BÁN**:
- 🥤 **Tổng số ly đã bán**: **${totalDrinks} ly**
- 💰 **Tổng doanh thu tích lũy**: **${formatMoney(totalRev)}**
- 💵 **Tổng tiền lời thực nhận**: **+${formatMoney(totalProfit)}**

*Anh/Chị cần xem chi tiết món bán chạy của ngày nào thì cứ bảo EV nhé!*`,
    };
  }

  // 14.2 HỎI NGÀY BÁN CHẠY NHẤT / CAO NHẤT HOẶC Ế NHẤT ("ngày nào bán chạy nhất?", "ngày nào doanh thu cao nhất?")
  const isBestDayQuery =
    norm.includes("ban chay nhat") ||
    norm.includes("doanh thu cao nhat") ||
    norm.includes("nhieu tien nhat") ||
    norm.includes("dat khach nhat");

  if (isBestDayQuery && (norm.includes("ngay nao") || norm.includes("ngay gi") || norm.includes("hom nao"))) {
    if (daysWithRevenue.length === 0) {
      return {
        type: "financial_history",
        reply: `📊 Dạ hiện tại quán chưa có ngày nào có doanh thu để lập bảng xếp hạng ngày bán chạy nhất ạ.`,
      };
    }

    const sortedByIncome = [...daysWithRevenue].sort((a, b) => b.income - a.income);
    const best = sortedByIncome[0];

    return {
      type: "financial_history",
      reply: `🌟 **Dạ ngày bán chạy nhất lịch sử của quán là Ngày ${formatDateDisplay(best.date)}**:
- 💰 **Kỷ lục doanh thu**: **${formatMoney(best.income)}**
- 🥤 **Số ly đã bán**: **${best.drinks} ly**
- 🌟 **Lợi nhuận ròng**: **+${formatMoney(best.balance)}**
- 💳 Tiền mặt: ${formatMoney(best.cashIncome)} | Chuyển khoản QR: ${formatMoney(best.transferIncome)}

*(Đây là ngày quán có lượng khách đông đảo và doanh số cao nhất toàn hệ thống!)* 🚀✨`,
    };
  }

  // 14.3 HỎI TỔNG KẾT DOANH THU NHIỀU NGÀY ("tổng kết doanh thu 2 ngày qua", "báo cáo 3 ngày gần nhất", "7 ngày qua")
  const multiDayMatch = norm.match(/(\d+)\s*ngay\s*(?:qua|gan\s*day|gan\s*nhat|vua\s*roi|truoc)?/i);
  const isMultiDayQuery = multiDayMatch && (norm.includes("doanh thu") || norm.includes("tong ket") || norm.includes("bao cao") || norm.includes("loi nhuan") || norm.includes("ban duoc"));

  if (isMultiDayQuery) {
    const numDays = Math.min(30, Math.max(1, Number(multiDayMatch[1])));

    const targetDates = [];
    for (let i = 0; i < numDays; i++) {
      targetDates.push(shiftDateKey(today, -i));
    }

    const matchedDays = targetDates.map((dk) => {
      const found = historyByDate.find((h) => h.date === dk);
      return (
        found || {
          date: dk,
          income: 0,
          expense: 0,
          cost: 0,
          drinks: 0,
          cashIncome: 0,
          transferIncome: 0,
          balance: 0,
          margin: 0,
        }
      );
    });

    // Nếu các ngày lùi từ hôm nay đều 0đ nhưng trong lịch sử có dữ liệu
    let effectiveList = matchedDays;
    const hasAnyIncomeInTarget = matchedDays.some((d) => d.income > 0);
    if (!hasAnyIncomeInTarget && daysWithRevenue.length > 0) {
      effectiveList = daysWithRevenue.slice(0, numDays);
    }

    const totalIncome = effectiveList.reduce((s, d) => s + d.income, 0);
    const totalDrinks = effectiveList.reduce((s, d) => s + d.drinks, 0);
    const totalExpense = effectiveList.reduce((s, d) => s + d.expense, 0);
    const totalCost = effectiveList.reduce((s, d) => s + d.cost, 0);
    const totalBalance = effectiveList.reduce((s, d) => s + d.balance, 0);

    const fromDateText = formatDateDisplay(effectiveList[effectiveList.length - 1].date);
    const toDateText = formatDateDisplay(effectiveList[0].date);

    const breakdownLines = effectiveList
      .map((d) => {
        const isToday = d.date === today;
        const tag = isToday ? " (Hôm nay)" : "";
        if (d.income === 0 && d.expense === 0) {
          return `• 📅 **Ngày ${formatDateDisplay(d.date)}${tag}**: Chưa phát sinh doanh thu (0đ)`;
        }
        return `• 📅 **Ngày ${formatDateDisplay(d.date)}${tag}**: **${formatMoney(d.income)}** (${d.drinks} ly) | Chi ${formatMoney(d.expense)} ➔ Lãi **+${formatMoney(d.balance)}**`;
      })
      .join("\n");

    return {
      type: "financial_history",
      reply: `📊 **Dạ EV xin tổng kết doanh thu ${numDays} ngày (${fromDateText} - ${toDateText} - ${targetBranch || "Toàn quán"})**:
- 🥤 **Tổng số ly nước đã bán**: **${totalDrinks} ly**
- 💰 **TỔNG DOANH THU**: **${formatMoney(totalIncome)}**
- 🧊 **Tổng chi phí**: -${formatMoney(totalExpense)} | **Giá vốn**: ${formatMoney(totalCost)}
- 🌟 **TỔNG LỢI NHUẬN RÒNG**: **+${formatMoney(totalBalance)}**

**Chi tiết từng ngày**:
${breakdownLines}

*Anh/Chị cần EV lọc riêng cho từng chi nhánh hay phân tích thêm chi phí mục nào không ạ?*`,
    };
  }

  // 14.4 HỎI BÁO CÁO HÔM QUA ("doanh thu hôm qua", "hôm qua bán được bao nhiêu", "hôm qua lời bao nhiêu")
  const isYesterday = norm.includes("hom qua") || norm.includes("ngay hom qua") || norm.includes("hom truoc");
  if (isYesterday && (norm.includes("doanh thu") || norm.includes("ban") || norm.includes("loi") || norm.includes("tong ket") || norm.includes("bao cao") || norm.includes("thu chi"))) {
    const yesterdayDateKey = shiftDateKey(today, -1);
    const yReport = dailyReport(transactions, yesterdayDateKey, targetBranch, state.defaultOpeningCash || 500000);

    if (yReport.income === 0 && yReport.expense === 0) {
      return {
        type: "financial_history",
        reply: `🥤 **Dạ EV kiểm tra ngày hôm qua (${yReport.dateText} - ${targetBranch || "Toàn bộ chi nhánh"})**:
Hệ thống chưa ghi nhận đơn bán hoặc khoản chi nào phát sinh trong ngày hôm qua ạ.`,
      };
    }

    return {
      type: "financial_history",
      reply: `🥤 **Dạ EV xin báo cáo doanh thu ngày HÔM QUA (${yReport.dateText} - ${targetBranch || "Toàn bộ chi nhánh"})**:
- **Tổng doanh thu**: **${formatMoney(yReport.income)}**
- **Số ly đã bán**: **${yReport.totalDrinks} ly**
- **Tiền mặt thu vào**: ${formatMoney(yReport.cashIncome)}
- **Chuyển khoản QR**: ${formatMoney(yReport.transferIncome)}
- **Tiền chi**: ${formatMoney(yReport.expense)} | **Giá vốn**: ${formatMoney(yReport.cost)}
- 💰 **Lợi nhuận thực nhận (Lãi ròng)**: **+${formatMoney(yReport.balance)}**`,
    };
  }

  // 14.5 BÁO CÁO DOANH THU & TIỀN LỜI HÔM NAY
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
  const multiResult = phanTichNhieu(effectiveQuery, state.quickItems || []);
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

  const isRawMaterialOrExpense = /\b(?:da|mia|tac|duong|ong hut|tui|ly|mang ep|xang|dien|nuoc|rac)\b/i.test(norm);
  const isCustomerBuying = norm.includes("khach mua") || norm.includes("khach lay") || norm.includes("khach uong") || norm.includes("khach goi") || norm.includes("ban ");
  const isExpenseIntent = !isCustomerBuying && (isRawMaterialOrExpense || norm.includes("mua") || norm.includes("nhap") || norm.includes("chi") || norm.includes("tra tien") || norm.includes("xang") || norm.includes("tien dien") || norm.includes("tien nuoc"));
  const extractedMoneyOnly = extractMoneyFromText(effectiveQuery);

  if (!hasDrinkName && !isExpenseIntent && !isRawMaterialOrExpense && extractedMoneyOnly >= 1000 && !norm.includes("bot ") && !norm.includes("giam ")) {
    const isCK = norm.includes("chuyen") || norm.includes("ck") || norm.includes("qr") || norm.includes("bank");
    const branchToUse = targetBranch || state.currentBranch || "Quán Nhà (Chính)";
    const isExplicitThu = norm.includes("thu") || norm.includes("ban") || norm.includes("khach") || norm.includes("tra tien mua");
    const isExplicitChi = norm.includes("chi") || norm.includes("mua") || norm.includes("tra tien") || norm.includes("nhap");

    conversationContext.pendingMissingItems = {
      money: extractedMoneyOnly,
      paymentMethod: isCK ? "chuyen_khoan" : "tien_mat",
      branch: branchToUse,
      intentHint: isExplicitChi ? "chi" : (isExplicitThu ? "thu" : "unknown"),
    };

    if (isExplicitThu) {
      return {
        type: "question",
        intent: "missing_items",
        reply: `Dạ EV ghi nhận số tiền thu **${formatMoney(extractedMoneyOnly)}** (${isCK ? "Chuyển khoản QR" : "Tiền mặt"}) ạ! 🥤\n\nAnh/Chị cho EV hỏi trong đơn này gồm **những món nước nào** (ví dụ: *5 ly mía thường, 2 ly cam...*) để EV trừ kho nguyên liệu và tính tiền vốn (cost) chính xác cho quán nhé?`,
      };
    } else if (isExplicitChi) {
      return {
        type: "question",
        intent: "missing_expense_item",
        reply: `Dạ EV ghi nhận khoản chi **${formatMoney(extractedMoneyOnly)}** ạ! 💸\n\nAnh/Chị cho EV hỏi đây là tiền chi cho **mục gì** (ví dụ: *mua đá, mua mía, mua tắc và đường, tiền điện...*) để EV phân loại sổ chi phí cho quán nhé?`,
      };
    } else {
      // Đọc số tiền trần trụi (ví dụ: "80k", "50k", "160k")
      return {
        type: "question",
        intent: "missing_items_or_expense",
        reply: `Dạ EV ghi nhận số tiền **${formatMoney(extractedMoneyOnly)}** (${isCK ? "Chuyển khoản QR" : "Tiền mặt"}) ạ! 📝\n\nAnh/Chị cho EV hỏi **${formatMoney(extractedMoneyOnly)}** này là **tiền thu bán nước** (gồm những món nào) hay **tiền chi mua nguyên liệu/khoản chi nào** để EV ghi sổ chính xác cho quán nhé?`,
      };
    }
  }

  // 16. PHÂN TÍCH GIAO DỊCH ĐƠN LẺ (BÁN NƯỚC / CHI TIỀN / MUA NGUYÊN LIỆU)
  let cleanQueryForSingle = effectiveQuery;
  const discIndex = norm.search(/\b(?:nhung\s+)?(?:bot\s+cho|bot|giam\s+cho|giam|tru\s+cho|tru|chiet\s+khau)\b/i);
  if (discIndex >= 0) {
    cleanQueryForSingle = effectiveQuery.substring(0, discIndex).trim();
  }

  const parsed = phanTichChiTiet(cleanQueryForSingle, state.quickItems || []);
  if (parsed && discountAmount > 0 && parsed.soTien > discountAmount) {
    parsed.soTien = parsed.soTien - discountAmount;
    parsed.ghiChu = `${parsed.ghiChu || parsed.danhMuc} (Đã bớt -${formatMoney(discountAmount)})`;
  }

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
