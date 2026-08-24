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

  // 1. Kiểm tra lệnh ghi nhanh giao dịch: "ghi chi 50k tiền đá", "vừa bán 2 ly nước mía"
  if (norm.startsWith("ghi ") || norm.startsWith("them ") || norm.includes("vua ban") || norm.includes("vua chi") || norm.startsWith("ban ") || norm.startsWith("chi ")) {
    return {
      type: "command",
      action: "add_transaction",
      rawQuery: query,
      branch: targetBranch,
      reply: `Dạ EV đã nhận lệnh ghi sổ: "${query}". Bạn có thể sử dụng biểu mẫu bán hàng hoặc mic để EV lưu nhanh vào ${targetBranch || state.currentBranch || "quán"} nhé!`,
    };
  }

  // 2. Báo cáo so sánh cả 2 Chi Nhánh
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

  // 3. Món nào bán chạy nhất / Chi tiết từng món
  if (norm.includes("ban chay") || norm.includes("mon nao") || norm.includes("top mon") || norm.includes("menu")) {
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

  // 4. Chi phí mua đá / mua mía / tiền điện / ống hút / nguyên liệu
  if (norm.includes("da") || norm.includes("mia") || norm.includes("nguyen lieu") || norm.includes("chi phi") || norm.includes("mua")) {
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

  // 5. Kiểm tra két tiền mặt / tiền thối
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

  // 6. Tư vấn chiến lược kinh doanh tháng 1 & tháng 2
  if (norm.includes("thang") || norm.includes("tu van") || norm.includes("chien luoc") || norm.includes("loi khuyen") || norm.includes("kinh doanh")) {
    const totalTransactions = transactions.filter((t) => t.loai === "thu").length;
    const totalRevenue = transactions.filter((t) => t.loai === "thu").reduce((s, t) => s + Number(t.soTien || 0), 0);
    const totalExp = transactions.filter((t) => t.loai === "chi").reduce((s, t) => s + Number(t.soTien || 0), 0);
    const totalProfit = totalRevenue - totalExp;

    return {
      type: "advice",
      reply: `💡 **Dạ EV xin tư vấn chiến lược vận hành 2 chi nhánh**:
1. **Theo dõi định lượng hao hụt mía & tắc**: Ghi chép đều đặn 1 bao mía ép được bao nhiêu lít/ly nước để chuẩn hóa công thức cho cả 2 quán.
2. **Dữ liệu tích lũy toàn hệ thống**: Đã ghi nhận **${totalTransactions} đơn bán**, tổng doanh thu **${formatMoney(totalRevenue)}**, lợi nhuận ròng **${formatMoney(totalProfit)}**.
3. **Chuẩn bị cho tháng thứ 2**:
   - Khi sản lượng bán của 2 chi nhánh ổn định, bạn có thể gộp đơn nhập mía và đá theo tuần để được giá sỉ rẻ hơn 10 - 15%.
   - Luân chuyển nhân sự hoặc hàng hóa giữa 2 quán khi một bên bị thiếu đá/mía vào giờ cao điểm.`,
    };
  }

  // 7. Doanh thu / Tiền lời / Bán được bao nhiêu hôm nay
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

    if (norm.includes("chi")) {
      return {
        type: "financial",
        reply: `💸 **Dạ EV báo cáo tổng chi hôm nay (${targetBranch || "Toàn bộ chi nhánh"})**: **${formatMoney(todayReport.expense)}**
*Bao gồm các khoản mua nguyên vật liệu, đá, đồ dùng trong ngày.*`,
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
    reply: `Dạ em là **Thư ký EV**, luôn sẵn sàng quản lý doanh thu & thu chi cho 2 chi nhánh của anh/chị!

Anh/Chị chỉ cần đọc hoặc gõ câu lệnh:
- *"i vi bán 2 ly nước mía"* ➔ EV tự động ghi sổ.
- *"ê vi mua 3 bao đá 30k"* ➔ EV tự động ghi chi.
- *"EV hôm nay 2 quán lời bao nhiêu?"* ➔ EV tổng hợp doanh thu 2 chi nhánh.
- *"i vi kiểm tra tiền két"* ➔ EV đối soát tiền mặt cuối ngày.`,
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
