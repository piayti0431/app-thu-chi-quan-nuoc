import { dailyReport, docSoTienTiengViet, formatReportDate } from "./report.js";
import { phanTichChiTiet, stripWakeWordAndBranch } from "./parser.js";
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
    (norm.includes("uong") || norm.includes("lay") || norm.includes("hay") || norm.includes("khach") || norm.includes("chu") || norm.includes("anh") || norm.includes("chi"));

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

  // 2. XỬ LÝ KHÁCH QUEN ĐẶT MÓN ("chú đối diện lấy 2 ly", "anh B lấy như cũ", "chị Lan 1 ly trà tắc")
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

  // 3. XỬ LÝ CÂU TRẢ LỜI CHO CÂU HỎI ĐANG CHỜ (PENDING QUESTION RESOLUTION)
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

  // 4. NGƯỜI DÙNG ĐÍNH CHÍNH / BẮT LỖI TÍNH TOÁN ("100k thì phải là 10 ly chứ", "sao lại ghi 1 ly", "nhầm rồi")
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

  // 5. PHÂN TÍCH TÀI CHÍNH F&B, COGS, ĐIỂM HÒA VỐN & BÁO CÁO P&L
  if (norm.includes("cogs") || norm.includes("ty le gia von") || norm.includes("hao hut") || norm.includes("kiem tra gia von")) {
    const cogsPercent = todayReport.income > 0 ? Math.round((todayReport.cost / todayReport.income) * 100) : 0;
    const isGood = cogsPercent >= 25 && cogsPercent <= 38;
    return {
      type: "financial_advice",
      reply: `📊 **Dạ EV xin báo cáo Kiểm soát Giá Vốn & Hao Hụt (COGS Benchmark)**:
- **Tổng doanh thu hôm nay**: ${formatMoney(todayReport.income)}
- **Tổng giá vốn nguyên liệu (COGS)**: ${formatMoney(todayReport.cost)}
- 🎯 **Tỷ lệ COGS thực tế**: **${cogsPercent}%** (Chuẩn F&B khuyến nghị: **28% – 35%**)

${isGood ? "✅ *Đánh giá: Tỷ lệ giá vốn đang ở mức cực kỳ tối ưu và sinh lời tốt!*" : "⚠️ *Cảnh báo: Tỷ lệ giá vốn đang hơi cao, anh/chị kiểm tra lại định lượng ép mía và bảo quản đá nhé!*"}`,
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

  if (norm.includes("hoa von") || norm.includes("diem hoa von") || norm.includes("can ban bao nhieu ly")) {
    const avgProfitPerDrink = todayReport.totalDrinks > 0 ? Math.round(todayReport.grossProfit / todayReport.totalDrinks) : 4000;
    const estimatedDailyFixedCost = 300000; // Tiền mặt bằng + điện nước ước tính
    const breakEvenDrinks = Math.ceil(estimatedDailyFixedCost / avgProfitPerDrink);
    const progress = Math.min(100, Math.round((todayReport.totalDrinks / breakEvenDrinks) * 100));

    return {
      type: "financial_advice",
      reply: `🎯 **Dạ EV phân tích Điểm Hòa Vốn (Break-Even Point)**:
- **Chi phí cố định ước tính**: ${formatMoney(estimatedDailyFixedCost)} / ngày (Mặt bằng + Điện nước 2 quán)
- **Lãi gộp trung bình mỗi ly**: +${formatMoney(avgProfitPerDrink)} / ly
- 🏁 **Mục tiêu hòa vốn**: Cần bán tối thiểu **${breakEvenDrinks} ly nước / ngày**.
- 🚀 **Tiến độ hôm nay**: Đã bán **${todayReport.totalDrinks} ly** (${progress}% mốc hòa vốn).

${todayReport.totalDrinks >= breakEvenDrinks ? "🎉 *Quán đã vượt điểm hòa vốn hôm nay! Từ giờ mỗi ly bán ra đều là tiền lãi ròng 100%!*" : `*Còn ${breakEvenDrinks - todayReport.totalDrinks} ly nữa là cán đích hòa vốn ngày hôm nay anh/chị nhé!*`}`,
    };
  }

  // 6. BẢNG XẾP HẠNG MÓN BÁN CHẠY (MENU RANKING)
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

  // 7. CHI PHÍ NGUYÊN VẬT LIỆU (HỎI BÁO CÁO CHI PHÍ)
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

  // 8. KIỂM TRA KÉT TIỀN MẶT / TIỀN THỐI
  if (norm.includes("ket") || (norm.includes("tien mat") && (norm.includes("con") || norm.includes("kiem tra") || norm.includes("doi soat"))) || norm.includes("thoi") || norm.includes("doi soat")) {
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

  // 9. TƯ VẤN CHIẾN LƯỢC KINH DOANH
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

  // 6. TRÒ CHUYỆN THƯỜNG NGÀY & THỜI TIẾT (CHIT-CHAT)
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

  // 7. LỆNH THÊM MÓN MỚI VÀO MENU
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

  // 8. BÁO CÁO TỔNG HỢP CẢ 2 CHI NHÁNH
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

  // 9. BÁO CÁO DOANH THU & TIỀN LỜI HÔM NAY
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

  // 10. PHÂN TÍCH GIAO DỊCH TỰ NHIÊN (BÁN NƯỚC / CHI TIỀN / MUA NGUYÊN LIỆU)
  const parsed = phanTichChiTiet(query, state.quickItems || []);

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

  // 11. Phản hồi mặc định thông minh của Thư ký EV
  return {
    type: "general",
    reply: `Dạ em là **Thư ký EV**, luôn sẵn sàng hỗ trợ anh/chị quản lý toàn diện 2 chi nhánh!

Anh/Chị có thể ra lệnh tự nhiên cho EV:
- 🥤 *"Chú đối diện lấy 2 ly"* ➔ EV tự nhận khách quen, tính 2 ly mía thường (16k).
- 📝 *"EV nhớ là chú Ba bảo vệ hay uống 1 ly rau má đậu 15k nhé"* ➔ EV tự học vào Sổ tay.
- 📊 *"Báo cáo P&L hôm nay"* ➔ EV xuất báo cáo tài chính chuẩn 5 dòng.
- 🎯 *"Hôm nay hòa vốn chưa?"* ➔ EV phân tích tiến độ điểm hòa vốn.`,
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

  const contextPrompt = `Bạn là Thư Ký AI kiêm CFO tên "EV" (phát âm: i vi) của chuỗi 2 chi nhánh quán nước.
NGỮ CẢNH TÀI CHÍNH & KHÁCH QUEN (ĐÃ NÉN RTK):
- ${rtkContext.menu}
- ${rtkContext.crm}
- ${rtkContext.finance}

QUY TẮC PHÂN TÍCH:
1. "Khách mua / khách chuyển / tiền mua..." = + Thu tiền bán hàng.
2. Tra cứu Menu để tính số lượng = Tổng tiền / Đơn giá và Giá vốn = Số lượng * Vốn đơn vị.
3. Khi gặp khách quen (Chú A, Anh B, Chị Lan...), tự động áp dụng món quen và hình thức thanh toán.
4. Trả lời bằng Markdown ngắn gọn, ấm áp, chuẩn xác số liệu tài chính, xưng "EV" hoặc "Dạ EV".`;

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
