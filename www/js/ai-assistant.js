import { dailyReport, docSoTienTiengViet, formatReportDate } from "./report.js";
import { stripWakeWordAndBranch } from "./parser.js";

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
  const smallKMatch = norm.match(/(?:gia|ban|tien|la|cost|von)\s*(\d+)/);
  if (smallKMatch) {
    const val = Number(smallKMatch[1]);
    return val < 100 ? val * 1000 : val;
  }

  return 0;
}

function extractMenuItemParams(query) {
  const raw = query.replace(/^(ev|i\s*vi|e\s*vi|i-vi|e-vi|ê\s*vi|ê-vi|evi)(\s+ơi|\s+oi|\s+nhe|\s+nhé|\s+giúp|\s+giup|\s+cho)?\s+/i, "").trim();

  // 1. Tên món
  let name = "";
  const nameMatch = raw.match(/(?:thêm|them|tạo|tao|món|mon|nước|nuoc)\s+(?:vào\s+menu\s+|vao\s+menu\s+)?(?:món\s+|mon\s+)?([^,;:\n]+?)(?:,|\s+tiền|\s+tien|\s+giá|\s+gia|\s+bán|\s+ban|\s+vốn|\s+von|\s+cost|\s+\d+\s*k|\s+\d+\s*ngh)/i);
  if (nameMatch) {
    name = nameMatch[1].replace(/^(vào\s+menu|vao\s+menu|menu|món|mon|nước|nuoc)\s+/i, "").trim();
  } else {
    const fallbackMatch = raw.match(/(?:món|mon|menu|thêm|them)\s+([^,;:\n]+)/i);
    if (fallbackMatch) name = fallbackMatch[1].trim();
  }

  // Dọn dẹp tên món khỏi các từ thừa
  name = name.replace(/\b(1|một|hai|ba|\d+)\s*(ly|chai|cốc|bình|lít)\b/gi, "").trim();
  if (!name || name.length < 2) name = "Nước Mới";
  if (name.length > 30) name = name.slice(0, 30);
  name = capitalizeWords(name);

  // 2. Giá bán
  let price = 0;
  const priceMatch = raw.match(/(?:bán|ban|giá|gia|tiền|tien|là|la)\s*(?:1\s*ly\s*(?:là|la)?)?\s*(\d+\s*k|\d+\s*ngh[iíìỉĩị]n|\d+\s*ng[aàảãạ]n|\d{4,9}|\d{1,3}(?:\.\d{3})+)/i);
  if (priceMatch) {
    price = extractMoneyFromText(priceMatch[1]);
  } else {
    price = extractMoneyFromText(raw);
  }
  if (!price || price <= 0) price = 10000;

  // 3. Giá vốn (Cost)
  let costPrice = 0;
  const costMatch = raw.match(/(?:vốn|von|cost|giá vốn|gia von)\s*(?:là|la)?\s*(\d+\s*k|\d+\s*ngh[iíìỉĩị]n|\d+\s*ng[aàảãạ]n|\d{4,9}|\d{1,3}(?:\.\d{3})+)/i);
  if (costMatch) {
    costPrice = extractMoneyFromText(costMatch[1]);
  } else {
    costPrice = Math.round((price * 0.4) / 1000) * 1000; // Mặc định 40% giá bán
  }

  // 4. Đơn vị tính
  let unit = "ly";
  if (/\b(ly|cốc|coc)\b/i.test(raw)) unit = "ly";
  else if (/\b(chai|bình|binh)\b/i.test(raw)) unit = "chai";
  else if (/\b(lít|lit|1l)\b/i.test(raw)) unit = "chai";

  return { name, price, costPrice, unit };
}

export function phanTichTaiChinhNoiBo(query, state) {
  const { branch: detectedBranch } = stripWakeWordAndBranch(query);
  const norm = normalizeQuery(query);
  const today = todayKey();
  const transactions = (state.ds || []).filter((tx) => !tx.deleted);

  // Multi-branch handling
  const isAllBranches = norm.includes("2 chi nhanh") || norm.includes("ca 2 quan") || norm.includes("2 quan") || norm.includes("tat ca");
  const targetBranch = isAllBranches ? null : (detectedBranch || (norm.includes("chi nhanh 2") ? "Chi nhánh 2" : (norm.includes("chi nhanh 1") ? "Quán Nhà (Chính)" : null)));

  const todayReport = dailyReport(transactions, today, targetBranch, state.defaultOpeningCash || 500000);
  const b1Report = dailyReport(transactions, today, "Quán Nhà (Chính)", state.defaultOpeningCash || 500000);
  const b2Report = dailyReport(transactions, today, "Chi nhánh 2", state.defaultOpeningCash || 500000);

  // 1. NGƯỜI DÙNG ĐÍNH CHÍNH / NHẮC NHỞ (CORRECTION / NEGATION)
  if (
    norm.includes("toi bao la") ||
    norm.includes("khong phai") ||
    norm.includes("y toi la") ||
    norm.includes("nham roi") ||
    norm.includes("sai roi") ||
    norm.includes("sao lai ghi")
  ) {
    if (norm.includes("menu") || norm.includes("thuc don") || norm.includes("mon")) {
      return {
        type: "clarification",
        reply: `Dạ EV thành thật xin lỗi anh/chị vì đã hiểu nhầm ý trước đó ạ! 🙇‍♂️

Anh/Chị muốn thêm món mới vào Menu đúng không ạ? Anh/Chị chỉ cần bảo:
👉 *"Thêm vào menu món Mía Thơm giá 10k vốn 4k"*
👉 *"Thêm món Trà Đào 15k"*

EV sẽ cập nhật thẳng vào Menu bán hàng của quán ngay lập tức ạ!`,
      };
    }

    return {
      type: "clarification",
      reply: `Dạ EV xin lỗi anh/chị vì hiểu nhầm ý ạ! 🙇‍♂️\n\nEV đã sẵn sàng lắng nghe lại, anh/chị muốn EV ghi sổ thu/chi, thêm món vào Menu, hay kiểm tra số liệu nào ạ?`,
    };
  }

  // 2. LỆNH THÊM MÓN MỚI VÀO MENU (ADD MENU ITEM)
  if (
    norm.includes("them vao menu") ||
    norm.includes("them menu") ||
    norm.includes("them mon") ||
    norm.includes("tao mon") ||
    norm.includes("them nuoc") ||
    norm.includes("them vao thuc don")
  ) {
    const params = extractMenuItemParams(query);
    const itemId = "menu_" + Date.now();
    const newItem = {
      id: itemId,
      name: params.name,
      category: params.name,
      price: params.price,
      costPrice: params.costPrice,
      voiceName: params.name.toLowerCase(),
      voiceUnit: params.unit,
    };

    return {
      type: "action",
      action: "add_menu_item",
      item: newItem,
      reply: `✅ **Dạ EV đã thêm món mới vào Menu thành công cho anh/chị ạ**:
- 🥤 **Tên món**: **${params.name}**
- 💵 **Giá bán**: **${formatMoney(params.price)}** / ${params.unit}
- 🧊 **Giá vốn (Cost)**: **${formatMoney(params.costPrice)}**

*Món "${params.name}" đã xuất hiện trên màn hình Bán hàng và sẵn sàng order!*`,
    };
  }

  // 3. LỆNH XÓA MÓN KHỎI MENU (DELETE MENU ITEM)
  if (norm.includes("xoa mon") || norm.includes("bo mon") || norm.includes("xoa khoi menu")) {
    const menuItems = state.quickItems || [];
    let matched = menuItems.find((i) => norm.includes(normalizeQuery(i.name)));
    if (matched) {
      return {
        type: "action",
        action: "delete_menu_item",
        itemId: matched.id,
        itemName: matched.name,
        reply: `🗑️ Dạ EV đã xóa món **${matched.name}** khỏi Menu cho anh/chị rồi ạ!`,
      };
    }
  }

  // 4. LỆNH ĐỔI CHI NHÁNH LÀM VIỆC (SWITCH BRANCH)
  if (norm.includes("chuyen sang chi nhanh") || norm.includes("doi qua chi nhanh") || norm.includes("chuyen qua quan") || norm.includes("doi sang quan")) {
    const nextBranch = norm.includes("2") ? "Chi nhánh 2" : "Quán Nhà (Chính)";
    return {
      type: "action",
      action: "switch_branch",
      branch: nextBranch,
      reply: `🏢 Dạ EV đã chuyển không gian làm việc sang **${nextBranch}** cho anh/chị rồi ạ!`,
    };
  }

  // 5. LỆNH BÁN HÀNG HOẶC CHI TIỀN (TRANSACTION COMMANDS)
  const isSellCommand = norm.startsWith("ban ") || norm.startsWith("vua ban") || norm.startsWith("khach mua") || norm.startsWith("khach lay") || norm.startsWith("ghi thu ");
  const isExpenseCommand = norm.startsWith("mua ") || norm.startsWith("ghi chi ") || norm.startsWith("chi ") || norm.startsWith("tra tien ") || norm.startsWith("do xang");

  if (isSellCommand || isExpenseCommand || norm.startsWith("ghi ")) {
    return {
      type: "command",
      action: "add_transaction",
      rawQuery: query,
      branch: targetBranch,
      reply: `Dạ EV đã nhận lệnh ghi sổ: "${query}".`,
    };
  }

  // 6. BÁO CÁO SO SÁNH 2 CHI NHÁNH
  if (isAllBranches || norm.includes("so sanh 2 quan")) {
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

  // 8. CHI PHÍ NGUYÊN VẬT LIỆU
  if (norm.includes("tien da") || norm.includes("mua da") || norm.includes("mua mia") || norm.includes("nguyen lieu") || norm.includes("chi phi") || norm.includes("tong chi")) {
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

  // 9. KIỂM TRA KÉT TIỀN MẶT / TIỀN THỐI
  if (norm.includes("ket") || norm.includes("tien mat") || norm.includes("thoi") || norm.includes("doi soat")) {
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

  // 11. BÁO CÁO DOANH THU & TIỀN LỜI HÔM NAY
  if (
    norm.includes("hom nay") ||
    norm.includes("ngay nay") ||
    norm.includes("doanh thu") ||
    norm.includes("loi bao nhieu") ||
    norm.includes("loi nhuan") ||
    norm.includes("ban duoc bao nhieu") ||
    norm.includes("tong ket")
  ) {
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

  // Phản hồi mặc định thông minh của Thư ký EV
  return {
    type: "general",
    reply: `Dạ em là **Thư ký EV**, luôn sẵn sàng hỗ trợ anh/chị quản lý toàn diện 2 chi nhánh!

Anh/Chị có thể ra lệnh cho EV thực hiện bất kỳ việc gì:
- 🥤 *"Thêm vào menu món Mía Thơm giá 10k"* ➔ EV tự động tạo món vào Menu.
- 💵 *"i vi bán 2 ly nước mía 20k"* ➔ EV tự động ghi đơn bán hàng.
- 🧊 *"ê vi mua 3 bao đá 30k"* ➔ EV tự động ghi chi tiền.
- 📊 *"EV hôm nay 2 quán lời bao nhiêu?"* ➔ EV tổng hợp doanh thu 2 chi nhánh.
- 🏢 *"Chuyển sang Chi nhánh 2"* ➔ EV chuyển điểm bán ngay lập tức.`,
  };
}

export async function hoiGeminiAI(userQuery, state, apiKey) {
  if (!apiKey) {
    return phanTichTaiChinhNoiBo(userQuery, state);
  }

  const today = todayKey();
  const transactions = (state.ds || []).filter((tx) => !tx.deleted);
  const todayReport = dailyReport(transactions, today, null, state.defaultOpeningCash || 500000);
  const b1Report = dailyReport(transactions, today, "Quán Nhà (Chính)", state.defaultOpeningCash || 500000);
  const b2Report = dailyReport(transactions, today, "Chi nhánh 2", state.defaultOpeningCash || 500000);

  const contextPrompt = `Bạn là Thư Ký AI tên là "EV" (phát âm: i vi), phụ trách quản lý toàn bộ doanh thu và thu chi cho 2 chi nhánh quán nước mía, cam tươi, trà tắc.
Bối cảnh tài chính thời gian thực:
- Ngày hôm nay: ${today} (${todayReport.dateText})
- Chi nhánh 1 (Quán Nhà): Thu ${b1Report.income}đ (${b1Report.totalDrinks} ly), Chi ${b1Report.expense}đ, Lời ${b1Report.balance}đ
- Chi nhánh 2: Thu ${b2Report.income}đ (${b2Report.totalDrinks} ly), Chi ${b2Report.expense}đ, Lời ${b2Report.balance}đ
- Tổng cộng 2 chi nhánh: Thu ${todayReport.income}đ, Chi ${todayReport.expense}đ, Vốn cost ${todayReport.cost}đ, Lời gộp ${todayReport.grossProfit}đ, Lời ròng ${todayReport.balance}đ
- Két tiền mặt dự kiến: ${todayReport.expectedCashInDrawer}đ
- Danh sách Menu hiện tại: ${JSON.stringify((state.quickItems || []).map((i) => ({ ten: i.name, giaBan: i.price, giaCost: i.costPrice })))}

Nếu người dùng yêu cầu thêm món vào menu, hãy trả lời rõ ràng rằng bạn đồng ý và hướng dẫn họ.
Hãy xưng là "EV" hoặc "Dạ EV", trả lời thân thiện, chuẩn xác số liệu và có định dạng Markdown:`;

  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: `${contextPrompt}\n\nCâu hỏi/Yêu cầu của chủ quán: "${userQuery}"` }],
          },
        ],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 800,
        },
      }),
    });

    if (!response.ok) {
      console.warn("Gemini API returned error, fallback to local NLP", response.status);
      return phanTichTaiChinhNoiBo(userQuery, state);
    }

    const data = await response.json();
    const replyText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (replyText) {
      return {
        type: "gemini_ai",
        reply: replyText,
      };
    }
    return phanTichTaiChinhNoiBo(userQuery, state);
  } catch (error) {
    console.warn("Gemini request failed, using local analyst", error);
    return phanTichTaiChinhNoiBo(userQuery, state);
  }
}
