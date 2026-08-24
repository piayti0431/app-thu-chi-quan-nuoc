import { dailyReport, docSoTienTiengViet, formatReportDate } from "./report.js";

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
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .replace(/\s+/g, " ")
    .trim();
}

export function phanTichTaiChinhNoiBo(query, state) {
  const norm = normalizeQuery(query);
  const today = todayKey();
  const transactions = (state.ds || []).filter((tx) => !tx.deleted);
  const todayReport = dailyReport(transactions, today, null, state.defaultOpeningCash || 500000);

  // 1. Kiểm tra lệnh ghi nhanh giao dịch: "ghi chi 50k tiền đá", "vừa bán 2 ly nước mía"
  if (norm.startsWith("ghi ") || norm.startsWith("them ") || norm.includes("vua ban") || norm.includes("vua chi")) {
    return {
      type: "command",
      action: "add_transaction",
      rawQuery: query,
      reply: `Tôi đã nhận lệnh ghi sổ: "${query}". Bạn có thể sử dụng biểu mẫu bán hàng hoặc mic để lưu nhanh nhé!`,
    };
  }

  // 2. Món nào bán chạy nhất / Chi tiết từng món
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
        reply: `🥤 Hôm nay quán chưa ghi nhận ly nước nào được bán ra. Khi bạn bấm bán nước hoặc đọc qua mic, tôi sẽ thống kê bảng xếp hạng món bán chạy ngay lập tức!`,
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
      reply: `🏆 **Bảng xếp hạng món bán chạy hôm nay**:
Món bán chạy số 1: 🌟 **${topItem[0]}** (${topItem[1].count} ly, thu ${formatMoney(topItem[1].revenue)}).

**Chi tiết từng món**:
${breakdownText}

💡 *Mẹo: Món có lợi nhuận cao nhất là món bạn nên đẩy mạnh mời khách khi order tại quầy!*`,
    };
  }

  // 3. Chi phí mua đá / mua mía / tiền điện / ống hút / nguyên liệu
  if (norm.includes("da") || norm.includes("mia") || norm.includes("nguyen lieu") || norm.includes("chi phi") || norm.includes("mua")) {
    const expenses = todayReport.items.filter((it) => it.loai === "chi");
    if (!expenses.length) {
      return {
        type: "expense",
        reply: `🧊 Hôm nay quán chưa có khoản chi nào được ghi nhận. Tổng chi = 0đ.`,
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
      reply: `🧊 **Tổng hợp chi phí nguyên vật liệu hôm nay**:
- **Tổng tiền chi**: **${formatMoney(todayReport.expense)}**
${expText}

*Để quán đạt lãi tốt, tổng chi nguyên liệu hàng ngày nên giữ ở mức dưới 35% - 40% doanh thu.*`,
    };
  }

  // 4. Kiểm tra két tiền mặt / tiền thối
  if (norm.includes("ket") || norm.includes("tien mat") || norm.includes("thoi") || norm.includes("doi soat")) {
    return {
      type: "drawer",
      reply: `🏦 **Đối soát tiền mặt trong két hôm nay**:
- **Tiền thối đầu ngày**: ${formatMoney(todayReport.openingCash)}
- **Tiền mặt thu từ khách**: +${formatMoney(todayReport.cashIncome)}
- **Tiền mặt đã chi ra**: -${formatMoney(todayReport.expense)}
- 💵 **TỔNG TIỀN MẶT CẦN CÓ TRONG KÉT**: **${formatMoney(todayReport.expectedCashInDrawer)}**

*(Nếu bạn đếm tiền cuối ngày đúng bằng ${formatMoney(todayReport.expectedCashInDrawer)} là khớp sổ 100%!)*`,
    };
  }

  // 5. Tư vấn chiến lược kinh doanh tháng 1 & tháng 2
  if (norm.includes("thang") || norm.includes("tu van") || norm.includes("chien luoc") || norm.includes("loi khuyen") || norm.includes("kinh doanh")) {
    const totalTransactions = transactions.filter((t) => t.loai === "thu").length;
    const totalRevenue = transactions.filter((t) => t.loai === "thu").reduce((s, t) => s + Number(t.soTien || 0), 0);
    const totalExp = transactions.filter((t) => t.loai === "chi").reduce((s, t) => s + Number(t.soTien || 0), 0);
    const totalProfit = totalRevenue - totalExp;

    return {
      type: "advice",
      reply: `💡 **Chiến lược vận hành quán nước hiệu quả (Giai đoạn 1 tháng đầu)**:
1. **Theo dõi tỷ lệ hao hụt mía & tắc**: Ghi chép đều đặn 1 bao mía ép được bao nhiêu lít/ly nước để tính định lượng chuẩn.
2. **Dữ liệu hiện tại của quán**: Đã ghi nhận **${totalTransactions} đơn bán**, tổng doanh thu tích lũy **${formatMoney(totalRevenue)}**, lợi nhuận ròng **${formatMoney(totalProfit)}**.
3. **Chuẩn bị cho tháng thứ 2**:
   - Khi đã nắm rõ số lượng bán trung bình ngày thường vs cuối tuần, bạn có thể đặt đá và mía theo tuần để được giá sỉ rẻ hơn 10 - 15%.
   - Tạo các combo nước (ví dụ: Mía sầu riêng, Mía dâu tây, Trà tắc khổng lồ) để tăng giá trị trung bình trên mỗi khách.`,
    };
  }

  // 6. Doanh thu / Tiền lời / Bán được bao nhiêu hôm nay
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
        reply: `📊 **Tổng kết lợi nhuận hôm nay (${todayReport.dateText})**:
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
        reply: `💸 **Tổng chi hôm nay**: **${formatMoney(todayReport.expense)}**
*Bao gồm các khoản mua nguyên vật liệu, đá, đồ dùng trong ngày.*`,
      };
    }

    return {
      type: "financial",
      reply: `🥤 **Báo cáo doanh thu hôm nay (${todayReport.dateText})**:
- **Tổng doanh thu**: **${formatMoney(todayReport.income)}**
- **Số ly đã bán**: **${todayReport.totalDrinks} ly**
- **Tiền mặt thu vào**: ${formatMoney(todayReport.cashIncome)}
- **Chuyển khoản QR**: ${formatMoney(todayReport.transferIncome)}
- **Tiền chi**: ${formatMoney(todayReport.expense)}
- 💰 **Lợi nhuận thực nhận**: **${formatMoney(todayReport.balance)}**`,
    };
  }

  // Phản hồi mặc định thông minh
  return {
    type: "general",
    reply: `Xin chào bạn! Tôi là **Trợ lý AI Quản Lý Doanh Thu** của quán. Tôi luôn theo dõi số liệu bán hàng và thu chi thời gian thực.

Bạn có thể hỏi tôi bất kỳ câu nào như:
- 📊 *"Hôm nay quán bán được bao nhiêu ly, lời bao nhiêu?"*
- 🥤 *"Món nào đang bán chạy nhất?"*
- 🧊 *"Tổng tiền mua đá và nguyên liệu hôm nay?"*
- 💵 *"Tiền mặt trong két hiện tại cần có bao nhiêu?"*
- 💡 *"Tư vấn chiến lược kinh doanh cho quán"*`,
  };
}

export async function hoiGeminiAI(userQuery, state, apiKey) {
  if (!apiKey) {
    return phanTichTaiChinhNoiBo(userQuery, state);
  }

  const today = todayKey();
  const transactions = (state.ds || []).filter((tx) => !tx.deleted);
  const todayReport = dailyReport(transactions, today, null, state.defaultOpeningCash || 500000);

  const contextPrompt = `Bạn là Trợ lý AI Quản Lý Doanh Thu & Thu Chi thông minh của một quán nước giải khát (Quán Nước Mía, Cam Tươi, Trà Tắc).
Dữ liệu tài chính thời gian thực của quán:
- Ngày hôm nay: ${today} (${todayReport.dateText})
- Doanh thu hôm nay: ${todayReport.income} VND (${todayReport.totalDrinks} ly)
- Tiền mặt thu: ${todayReport.cashIncome} VND | Tiền chuyển khoản QR: ${todayReport.transferIncome} VND
- Tiền chi mua nguyên liệu/chi phí: ${todayReport.expense} VND
- Tiền vốn (Cost) ước tính: ${todayReport.cost} VND
- Lợi nhuận bán nước (Lãi gộp): ${todayReport.grossProfit} VND
- Tiền lời thực tế (Lãi ròng): ${todayReport.balance} VND
- Tiền thối đầu ngày: ${todayReport.openingCash} VND | Tiền mặt cần có trong két: ${todayReport.expectedCashInDrawer} VND
- Danh sách Menu & Giá vốn: ${JSON.stringify((state.quickItems || []).map((i) => ({ ten: i.name, giaBan: i.price, giaCost: i.costPrice })))}

Hãy trả lời câu hỏi của chủ quán bằng tiếng Việt một cách thân thiện, súc tích, chuyên nghiệp, chính xác về mặt con số và có định dạng Markdown dễ đọc:`;

  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: `${contextPrompt}\n\nCâu hỏi của chủ quán: "${userQuery}"` }],
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
