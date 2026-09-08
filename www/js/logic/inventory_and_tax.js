export function layDanhSachTonKho(state, branchName = null) {
  const stockMap = state.inventoryStock || DEFAULT_DATA.inventoryStock;
  if (!branchName || branchName === "all" || branchName === "Tất cả điểm bán") {
    // Tổng hợp toàn chuỗi
    const combined = {};
    for (const [bName, list] of Object.entries(stockMap)) {
      for (const item of list) {
        if (!combined[item.id]) {
          combined[item.id] = { ...item, stockQty: 0, minQty: 0 };
        }
        combined[item.id].stockQty += Number(item.stockQty || 0);
        combined[item.id].minQty += Number(item.minQty || 0);
      }
    }
    return Object.values(combined);
  }
  return stockMap[branchName] || stockMap["Quán Nhà (Chính)"] || [];
}

export function kiemTraCanhBaoTonKho(state, branchName = null) {
  const stockMap = state.inventoryStock || DEFAULT_DATA.inventoryStock;
  const warnings = [];

  const branchesToCheck = branchName && branchName !== "all" && branchName !== "Tất cả điểm bán"
    ? [branchName]
    : Object.keys(stockMap);

  for (const b of branchesToCheck) {
    const list = stockMap[b] || [];
    for (const item of list) {
      if (Number(item.stockQty) <= Number(item.minQty)) {
        warnings.push({
          ...item,
          branch: b,
          isCritical: Number(item.stockQty) <= 0,
        });
      }
    }
  }
  return warnings;
}

export function truKhoNguyenLieuTheoDonHang(state, transaction) {
  if (!transaction || transaction.loai !== "thu") return state;
  const branchName = transaction.chiNhanh || state.currentBranch || "Quán Nhà (Chính)";
  if (!state.inventoryStock) state.inventoryStock = JSON.parse(JSON.stringify(DEFAULT_DATA.inventoryStock));
  if (!state.inventoryStock[branchName]) {
    state.inventoryStock[branchName] = JSON.parse(JSON.stringify(DEFAULT_DATA.inventoryStock["Quán Nhà (Chính)"]));
  }

  const items = state.inventoryStock[branchName];
  const qty = Math.max(1, Number(transaction.soLuong) || 1);
  const drinkId = transaction.slots?.productId || "";
  const drinkName = (transaction.danhMuc || "").toLowerCase();

  const updateItemQty = (id, delta) => {
    const it = items.find((x) => x.id === id);
    if (it) {
      it.stockQty = Math.max(0, Math.round((Number(it.stockQty) - delta) * 100) / 100);
    }
  };

  // Bao bì chung
  updateItemQty("ly_nhua", qty * 1);
  updateItemQty("mang_ep", qty * 1);
  updateItemQty("ong_hut", qty * 1);

  // Đá viên
  if (!drinkName.includes("1 lít") && !drinkName.includes("1l") && !drinkName.includes("không đá")) {
    updateItemQty("da_vien", Math.round(qty * 0.033 * 100) / 100); // 1 bao ~30 ly
  }

  // Nguyên liệu theo từng món
  if (drinkId === "nuoc_mia_1l" || drinkName.includes("1 lít") || drinkName.includes("1l")) {
    updateItemQty("mia_cay", Math.round(qty * 0.1 * 100) / 100); // 1 chai 1L ~0.1 bó
  } else if (drinkId.includes("mia") || drinkName.includes("mía")) {
    updateItemQty("mia_cay", Math.round(qty * 0.022 * 100) / 100); // 1 bó ~45 ly
  }

  if (drinkId === "mia_tac" || drinkId === "tra_tac" || drinkName.includes("tắc") || drinkName.includes("quat")) {
    updateItemQty("tac_tuoi", Math.round(qty * 0.05 * 100) / 100); // ~0.05kg tắc / ly
  }

  if (drinkId === "mia_cam" || drinkId === "nuoc_cam" || drinkName.includes("cam")) {
    updateItemQty("cam_sanh", Math.round(qty * 0.33 * 100) / 100); // ~0.33kg cam / ly
  }

  if (drinkId === "mia_thom" || drinkName.includes("thơm") || drinkName.includes("khóm") || drinkName.includes("dứa")) {
    updateItemQty("thom_dua", Math.round(qty * 0.25 * 100) / 100); // ~0.25 trái / ly
  }

  if (drinkId.includes("rau_ma") || drinkName.includes("rau má") || drinkName.includes("má")) {
    updateItemQty("rau_ma", Math.round(qty * 0.2 * 100) / 100); // ~0.2kg rau má / ly
  }

  if (drinkId === "rau_ma_dau_xanh" || drinkName.includes("đậu xanh") || drinkName.includes("đậu")) {
    updateItemQty("dau_xanh", Math.round(qty * 0.1 * 100) / 100); // ~0.1kg đậu xanh / ly
  }

  if (drinkName.includes("trà") || drinkName.includes("cam") || drinkName.includes("rau má")) {
    updateItemQty("duong_cat", Math.round(qty * 0.04 * 100) / 100); // ~0.04kg đường / ly
  }

  return state;
}

export async function nhapKhoNguyenLieu(branchName, ingredientIdOrName, qty, costPrice = 0) {
  const data = await docDuLieu();
  const branch = branchName || data.currentBranch || "Quán Nhà (Chính)";
  if (!data.inventoryStock) data.inventoryStock = JSON.parse(JSON.stringify(DEFAULT_DATA.inventoryStock));
  if (!data.inventoryStock[branch]) {
    data.inventoryStock[branch] = JSON.parse(JSON.stringify(DEFAULT_DATA.inventoryStock["Quán Nhà (Chính)"]));
  }

  const items = data.inventoryStock[branch];
  const queryNorm = String(ingredientIdOrName).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  let matched = items.find((x) => x.id === ingredientIdOrName || x.name.toLowerCase().includes(queryNorm));

  if (!matched) {
    if (queryNorm.includes("da")) matched = items.find((x) => x.id === "da_vien");
    else if (queryNorm.includes("mia")) matched = items.find((x) => x.id === "mia_cay");
    else if (queryNorm.includes("tac")) matched = items.find((x) => x.id === "tac_tuoi");
    else if (queryNorm.includes("cam")) matched = items.find((x) => x.id === "cam_sanh");
    else if (queryNorm.includes("thom") || queryNorm.includes("dua") || queryNorm.includes("khom")) matched = items.find((x) => x.id === "thom_dua");
    else if (queryNorm.includes("rau ma")) matched = items.find((x) => x.id === "rau_ma");
    else if (queryNorm.includes("ly")) matched = items.find((x) => x.id === "ly_nhua");
    else if (queryNorm.includes("ong hut")) matched = items.find((x) => x.id === "ong_hut");
    else if (queryNorm.includes("mang")) matched = items.find((x) => x.id === "mang_ep");
    else if (queryNorm.includes("duong")) matched = items.find((x) => x.id === "duong_cat");
  }

  if (matched) {
    const oldQty = Math.max(0, Number(matched.stockQty) || 0);
    const oldCost = Number(matched.unitCost) || 0;
    const addQty = Number(qty) || 0;
    const addCost = Number(costPrice) || 0;

    const newQty = Math.round((oldQty + addQty) * 100) / 100;

    // Tính giá vốn bình quân gia quyền liên hoàn theo chuẩn MISA eShop
    if (addCost > 0 && newQty > 0) {
      if (oldQty <= 0) {
        matched.unitCost = addCost;
      } else {
        matched.unitCost = Math.round(((oldQty * oldCost) + (addQty * addCost)) / newQty);
      }
    }
    matched.stockQty = newQty;
  }

  data.settingsVersion = Date.now();
  await luuDuLieu(data);
  return { matched, stockQty: matched?.stockQty || 0, unitCost: matched?.unitCost || 0 };
}

export async function capNhatTonKhoThucTe(branchName, ingredientId, actualQty) {
  const data = await docDuLieu();
  const branch = branchName || data.currentBranch || "Quán Nhà (Chính)";
  if (!data.inventoryStock) data.inventoryStock = JSON.parse(JSON.stringify(DEFAULT_DATA.inventoryStock));
  if (!data.inventoryStock[branch]) {
    data.inventoryStock[branch] = JSON.parse(JSON.stringify(DEFAULT_DATA.inventoryStock["Quán Nhà (Chính)"]));
  }

  const items = data.inventoryStock[branch];
  const matched = items.find((x) => x.id === ingredientId);
  let variance = 0;
  if (matched) {
    const oldTheoretical = Number(matched.stockQty) || 0;
    const actual = Math.max(0, Number(actualQty) || 0);
    variance = Math.round((actual - oldTheoretical) * 100) / 100;
    matched.stockQty = actual;
  }

  data.settingsVersion = Date.now();
  await luuDuLieu(data);
  return { inventoryStock: data.inventoryStock, matched, variance };
}

// ==========================================
// MODULE BÁO CÁO THUẾ & MẪU TỜ KHAI 01/CNKD
// ==========================================

export function tinhBaoCaoThue(transactions, periodType = "month", periodValue = null, branchName = null) {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const currentYear = String(now.getFullYear());
  const currentQuarter = `Q${Math.floor(now.getMonth() / 3) + 1}-${now.getFullYear()}`;

  const targetPeriod = periodValue || (periodType === "quarter" ? currentQuarter : (periodType === "year" ? currentYear : currentMonth));

  const validTx = (transactions || []).filter((tx) => {
    if (tx.deleted || tx.loai !== "thu") return false;
    if (branchName && branchName !== "all" && branchName !== "Tất cả điểm bán" && tx.chiNhanh !== branchName) {
      return false;
    }
    const dateStr = String(tx.ngay || tx.timestamp || "");
    if (periodType === "month") {
      return dateStr.startsWith(targetPeriod);
    } else if (periodType === "year") {
      return dateStr.startsWith(targetPeriod);
    } else if (periodType === "quarter") {
      const parts = targetPeriod.split("-");
      const qNum = Number(parts[0].replace("Q", ""));
      const year = parts[1] || currentYear;
      if (!dateStr.startsWith(year)) return false;
      const monthNum = Number(dateStr.split("-")[1] || 0);
      const qOfTx = Math.floor((monthNum - 1) / 3) + 1;
      return qOfTx === qNum;
    }
    return true;
  });

  const revenue = validTx.reduce((sum, tx) => sum + (Number(tx.soTien) || 0), 0);
  const vatRate = 0.03;  // 3% Thuế GTGT ngành ăn uống không bao thầu (Thông tư 40/2021/TT-BTC)
  const pitRate = 0.015; // 1.5% Thuế TNCN
  const totalTaxRate = 0.045; // 4.5%

  const vatTax = Math.round(revenue * vatRate);
  const pitTax = Math.round(revenue * pitRate);
  const totalTax = vatTax + pitTax;

  // ============================================================
  // NGƯỠNG MIỄN THUẾ THEO LUẬT THUẾ MỚI (Từ 2026):
  // Hộ kinh doanh/cá nhân KD có doanh thu NĂM <= 200.000.000 đ được MIỄN 100% THUẾ
  // ============================================================
  // Ước tính doanh thu năm từ doanh thu kỳ hiện tại
  let estimatedAnnualRevenue = revenue;
  if (periodType === "month") {
    estimatedAnnualRevenue = revenue * 12;
  } else if (periodType === "quarter") {
    estimatedAnnualRevenue = revenue * 4;
  }
  const ANNUAL_EXEMPT_THRESHOLD = 200_000_000; // 200 triệu đồng/năm theo luật mới
  const MONTHLY_EXEMPT_GUIDE    = Math.round(ANNUAL_EXEMPT_THRESHOLD / 12); // ~16.666.667 đ/tháng
  const isExempt = estimatedAnnualRevenue <= ANNUAL_EXEMPT_THRESHOLD;
  const isNearThreshold = !isExempt && estimatedAnnualRevenue <= ANNUAL_EXEMPT_THRESHOLD * 1.25;
  const actualTaxPayable = isExempt ? 0 : totalTax;

  return {
    periodType,
    periodValue: targetPeriod,
    branchName: branchName || "Toàn bộ chi nhánh",
    transactionCount: validTx.length,
    revenue,
    vatRate: 3,
    pitRate: 1.5,
    totalTaxRate: 4.5,
    vatTax,
    pitTax,
    totalTax,
    actualTaxPayable,
    isExempt,
    isNearThreshold,
    estimatedAnnualRevenue,
    annualExemptThreshold: ANNUAL_EXEMPT_THRESHOLD,
    monthlyExemptGuide: MONTHLY_EXEMPT_GUIDE,
    generatedAt: now.toISOString(),
  };
}

export function xuatToKhaiThue01CNKD(taxReport, businessInfo = {}) {
  const shopName = businessInfo.shopName || "QUÁN NƯỚC MÍA & GIẢI KHÁT TƯƠI";
  const taxId = businessInfo.taxId || "800xxxxxxx";
  const owner = businessInfo.owner || "Chủ Hộ Kinh Doanh";

  const annualEst = Number(taxReport.estimatedAnnualRevenue || taxReport.revenue);
  const exemptNote = taxReport.isExempt
    ? `\n🎉 THÔNG BÁO MIỄN THUẾ: Doanh thu ước tính năm ${annualEst.toLocaleString("vi-VN")} đ ≤ 200.000.000 đ (ngưỡng miễn thuế mới)\n   → Hộ kinh doanh được MIỄN 100% thuế GTGT và thuế TNCN!\n   → Số thuế thực tế phải nộp: 0 đ\n   → Khuyến nghị: Kê khai doanh thu ban đầu để cơ quan thuế ấn định mức thuế 0 đ.`
    : (taxReport.isNearThreshold
      ? `\n⚠️ CẢNH BÁO GẦN NGƯỠNG: Doanh thu ước tính năm ${annualEst.toLocaleString("vi-VN")} đ (vừa vượt ngưỡng 200 triệu)\n   → Thuộc diện nộp thuế 4.5% (GTGT 3% + TNCN 1.5%) theo Thông tư 40/2021/TT-BTC!`
      : `\n📋 Doanh thu ước tính năm: ${annualEst.toLocaleString("vi-VN")} đ (vượt ngưỡng 200 triệu → nộp thuế 4.5% trên doanh thu)`);

  return `CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
Độc lập - Tự do - Hạnh phúc
--------------------------------------------------
TỜ KHAI THUẾ ĐỐI VỚI HỘ KINH DOANH, CÁ NHÂN KINH DOANH
(Mẫu số: 01/CNKD - Ban hành kèm theo Thông tư số 40/2021/TT-BTC)

1. Kỳ tính thuế: ${taxReport.periodType === "quarter" ? "Quý" : "Tháng"} ${taxReport.periodValue}
2. Tên người nộp thuế: ${owner}
3. Tên cửa hàng/điểm bán: ${shopName} (${taxReport.branchName})
4. Mã số thuế: ${taxId}
5. Ngành nghề kinh doanh: Dịch vụ ăn uống, giải khát (F&B)

--------------------------------------------------
BẢNG KÊ DOANH THU & NGHĨA VỤ THUẾ:
1. Tổng doanh thu bán hàng phát sinh: ${Number(taxReport.revenue).toLocaleString("vi-VN")} đ
2. Số lượng giao dịch bán ra: ${taxReport.transactionCount} đơn
3. Doanh thu ước tính quy năm: ${Number(taxReport.estimatedAnnualRevenue).toLocaleString("vi-VN")} đ
4. Thuế Giá trị gia tăng định mức (GTGT 3.0%): ${Number(taxReport.vatTax).toLocaleString("vi-VN")} đ
5. Thuế Thu nhập cá nhân định mức (TNCN 1.5%): ${Number(taxReport.pitTax).toLocaleString("vi-VN")} đ
--------------------------------------------------
💰 NGHĨA VỤ THUẾ TẠM TÍNH (4.5%): ${Number(taxReport.totalTax).toLocaleString("vi-VN")} đ
🛡️ SỐ THUẾ THỰC NỘP SAU MIỄN TRỪ: ${Number(taxReport.actualTaxPayable).toLocaleString("vi-VN")} đ
${exemptNote}
--------------------------------------------------
Ngày lập báo cáo: ${new Date().toLocaleDateString("vi-VN")}
Người nộp thuế (Ký, ghi rõ họ tên)`;
}


export function tinhBaoCaoPL(transactions, periodType = "month", periodValue = null, branchName = null) {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const currentYear = String(now.getFullYear());
  const currentQuarter = `Q${Math.floor(now.getMonth() / 3) + 1}-${now.getFullYear()}`;

  const targetPeriod = periodValue || (periodType === "quarter" ? currentQuarter : (periodType === "year" ? currentYear : currentMonth));

  const validTx = (transactions || []).filter((tx) => {
    if (tx.deleted) return false;
    if (branchName && branchName !== "all" && branchName !== "Tất cả điểm bán" && tx.chiNhanh !== branchName) {
      return false;
    }
    const dateStr = String(tx.ngay || tx.timestamp || "");
    if (periodType === "month") {
      return dateStr.startsWith(targetPeriod);
    } else if (periodType === "year") {
      return dateStr.startsWith(targetPeriod);
    } else if (periodType === "quarter") {
      const parts = targetPeriod.split("-");
      const qNum = Number(parts[0].replace("Q", ""));
      const year = parts[1] || currentYear;
      if (!dateStr.startsWith(year)) return false;
      const monthNum = Number(dateStr.split("-")[1] || 0);
      const qOfTx = Math.floor((monthNum - 1) / 3) + 1;
      return qOfTx === qNum;
    }
    return true;
  });

  const thuList = validTx.filter((t) => t.loai === "thu");
  const chiList = validTx.filter((t) => t.loai === "chi");

  const revenue = thuList.reduce((sum, tx) => sum + (Number(tx.soTien) || 0), 0);
  const totalCups = thuList.reduce((sum, tx) => sum + (Number(tx.soLuong) || 1), 0);
  const cogs = thuList.reduce((sum, tx) => sum + (Number(tx.tongGiaCost) || 0), 0);
  const grossProfit = revenue - cogs;
  const grossMarginPct = revenue > 0 ? Math.round((grossProfit / revenue) * 1000) / 10 : 0;

  const operatingExpenses = chiList.reduce((sum, tx) => sum + (Number(tx.soTien) || 0), 0);
  const ebit = grossProfit - operatingExpenses;

  const vatTax = Math.round(revenue * 0.03);
  const pitTax = Math.round(revenue * 0.015);
  const totalTax = vatTax + pitTax;

  const netProfit = ebit - totalTax;
  const netMarginPct = revenue > 0 ? Math.round((netProfit / revenue) * 1000) / 10 : 0;

  // Dòng tiền mặt vs Chuyển khoản
  const cashIn = thuList.filter((t) => t.phuongThuc !== "chuyen_khoan").reduce((s, t) => s + (Number(t.soTien) || 0), 0);
  const transferIn = thuList.filter((t) => t.phuongThuc === "chuyen_khoan").reduce((s, t) => s + (Number(t.soTien) || 0), 0);
  const cashOut = chiList.filter((t) => t.phuongThuc !== "chuyen_khoan").reduce((s, t) => s + (Number(t.soTien) || 0), 0);
  const transferOut = chiList.filter((t) => t.phuongThuc === "chuyen_khoan").reduce((s, t) => s + (Number(t.soTien) || 0), 0);
  const netCashFlow = cashIn - cashOut;

  return {
    periodType,
    periodValue: targetPeriod,
    branchName: branchName || "Toàn bộ chi nhánh",
    orderCount: thuList.length,
    totalCups,
    revenue,
    cogs,
    grossProfit,
    grossMarginPct,
    operatingExpenses,
    ebit,
    vatTax,
    pitTax,
    totalTax,
    netProfit,
    netMarginPct,
    cashFlow: {
      cashIn,
      cashOut,
      netCashFlow,
      transferIn,
      transferOut,
    },
    generatedAt: now.toISOString(),
  };
}

// ==========================================================================
// MODULE TỔNG HỢP & TỰ HỌC ĐỊNH MỨC ĐẦU VÀO - ĐẦU RA 15 NGÀY (ADAPTIVE YIELD)
// ==========================================================================

export function tinhDinhMucDauVaoDauRa(transactions, days = 15, branchName = null) {
  const now = new Date();
  const cutoffTime = now.getTime() - (days * 24 * 60 * 60 * 1000);
  const cutoffDateStr = new Date(cutoffTime).toISOString().slice(0, 10);

  const validTx = (transactions || []).filter((tx) => {
    if (tx.deleted) return false;
    if (branchName && branchName !== "all" && branchName !== "Tất cả điểm bán" && tx.chiNhanh !== branchName) {
      return false;
    }
    const dateStr = String(tx.ngay || tx.timestamp || "");
    return dateStr >= cutoffDateStr;
  });

  const thuList = validTx.filter((t) => t.loai === "thu");
  const chiList = validTx.filter((t) => t.loai === "chi");

  // 1. TỔNG HỢP NGUYÊN LIỆU ĐẦU VÀO (INPUTS TỪ PHIẾU CHI / NHẬP HÀNG)
  const inputs = {
    mia: { qty: 0, cost: 0, unit: "bó", label: "Mía cây tươi", count: 0 },
    tac: { qty: 0, cost: 0, unit: "kg", label: "Tắc tươi", count: 0 },
    cam: { qty: 0, cost: 0, unit: "kg", label: "Cam sành", count: 0 },
    thom: { qty: 0, cost: 0, unit: "trái", label: "Thơm (dứa)", count: 0 },
    rauMa: { qty: 0, cost: 0, unit: "kg", label: "Rau má", count: 0 },
    dauXanh: { qty: 0, cost: 0, unit: "kg", label: "Đậu xanh", count: 0 },
    daVien: { qty: 0, cost: 0, unit: "bao", label: "Đá viên", count: 0 },
    lyNhua: { qty: 0, cost: 0, unit: "ly", label: "Ly nhựa & bao", count: 0 },
    tongTienNhap: 0,
  };

  chiList.forEach((tx) => {
    const text = (String(tx.danhMuc || "") + " " + String(tx.ghiChu || "")).toLowerCase();
    const money = Number(tx.soTien) || 0;
    const qty = Number(tx.soLuong) || 1;
    inputs.tongTienNhap += money;

    if (text.includes("mía") || text.includes("mia")) {
      inputs.mia.qty += qty;
      inputs.mia.cost += money;
      inputs.mia.count += 1;
    } else if (text.includes("tắc") || text.includes("tac")) {
      inputs.tac.qty += qty;
      inputs.tac.cost += money;
      inputs.tac.count += 1;
    } else if (text.includes("cam")) {
      inputs.cam.qty += qty;
      inputs.cam.cost += money;
      inputs.cam.count += 1;
    } else if (text.includes("thơm") || text.includes("thom") || text.includes("dứa") || text.includes("khóm")) {
      inputs.thom.qty += qty;
      inputs.thom.cost += money;
      inputs.thom.count += 1;
    } else if (text.includes("rau má") || text.includes("rau ma")) {
      inputs.rauMa.qty += qty;
      inputs.rauMa.cost += money;
      inputs.rauMa.count += 1;
    } else if (text.includes("đậu") || text.includes("dau")) {
      inputs.dauXanh.qty += qty;
      inputs.dauXanh.cost += money;
      inputs.dauXanh.count += 1;
    } else if (text.includes("đá") || text.includes("da")) {
      inputs.daVien.qty += qty;
      inputs.daVien.cost += money;
      inputs.daVien.count += 1;
    } else if (text.includes("ly") || text.includes("bọc") || text.includes("ống hút") || text.includes("màng")) {
      inputs.lyNhua.qty += qty;
      inputs.lyNhua.cost += money;
      inputs.lyNhua.count += 1;
    }
  });

  // 2. TỔNG HỢP SẢN LƯỢNG NƯỚC BÁN RA (OUTPUTS TỪ PHIẾU THU)
  const outputs = {
    tongLyBan: 0,
    tongDoanhThu: 0,
    miaThuong: 0,
    mia1Lit: 0,
    miaTac: 0,
    miaCam: 0,
    miaThom: 0,
    traTac: 0,
    nuocCam: 0,
    rauMa: 0,
    rauMaDauXanh: 0,
    // Quy đổi ra đơn vị tương đương mía thường (1 ly 1L quy đổi = 2 ly)
    tongLyQuyDoiMia: 0,
  };

  thuList.forEach((tx) => {
    const text = (String(tx.danhMuc || "") + " " + String(tx.ghiChu || "")).toLowerCase();
    const money = Number(tx.soTien) || 0;
    const qty = Number(tx.soLuong) || 1;

    outputs.tongLyBan += qty;
    outputs.tongDoanhThu += money;

    if (text.includes("1l") || text.includes("1 lít") || text.includes("1 lit") || text.includes("lít")) {
      outputs.mia1Lit += qty;
      outputs.tongLyQuyDoiMia += qty * 2;
    } else if (text.includes("mía tắc") || text.includes("mia tac")) {
      outputs.miaTac += qty;
      outputs.tongLyQuyDoiMia += qty;
    } else if (text.includes("mía cam") || text.includes("mia cam")) {
      outputs.miaCam += qty;
      outputs.tongLyQuyDoiMia += qty;
    } else if (text.includes("mía thơm") || text.includes("mia thom") || text.includes("khóm") || text.includes("dứa")) {
      outputs.miaThom += qty;
      outputs.tongLyQuyDoiMia += qty;
    } else if (text.includes("trà tắc") || text.includes("tra tac")) {
      outputs.traTac += qty;
    } else if (text.includes("nước cam") || text.includes("cam vắt") || (text.includes("cam") && !text.includes("mía"))) {
      outputs.nuocCam += qty;
    } else if (text.includes("đậu xanh") || text.includes("rau má đậu")) {
      outputs.rauMaDauXanh += qty;
    } else if (text.includes("rau má") || text.includes("rau ma")) {
      outputs.rauMa += qty;
    } else {
      outputs.miaThuong += qty;
      outputs.tongLyQuyDoiMia += qty;
    }
  });

  // 3. TÍNH HIỆU SUẤT ĐỊNH MỨC THỰC TẾ (YIELD & CONVERSION RATIO)
  // Mía: 1 bó mía ép được bao nhiêu ly thực tế
  const miaYieldActual = inputs.mia.qty > 0 ? Math.round((outputs.tongLyQuyDoiMia / inputs.mia.qty) * 10) / 10 : 0;
  const miaCostPerCup = miaYieldActual > 0 && inputs.mia.qty > 0 ? Math.round(inputs.mia.cost / (inputs.mia.qty * miaYieldActual)) : 0;

  // Tắc: 1 kg tắc pha được bao nhiêu ly (trà tắc + mía tắc)
  const totalTacCups = outputs.traTac + outputs.miaTac;
  const tacYieldActual = inputs.tac.qty > 0 ? Math.round((totalTacCups / inputs.tac.qty) * 10) / 10 : 0;

  // Cam: 1 kg cam vắt được bao nhiêu ly (nước cam + mía cam)
  const totalCamCups = outputs.nuocCam + outputs.miaCam;
  const camYieldActual = inputs.cam.qty > 0 ? Math.round((totalCamCups / inputs.cam.qty) * 10) / 10 : 0;

  // Rau má: 1 kg rau má xay được bao nhiêu ly
  const totalRauMaCups = outputs.rauMa + outputs.rauMaDauXanh;
  const rauMaYieldActual = inputs.rauMa.qty > 0 ? Math.round((totalRauMaCups / inputs.rauMa.qty) * 10) / 10 : 0;

  // Đá viên: 1 bao đá phục vụ được bao nhiêu ly
  const daYieldActual = inputs.daVien.qty > 0 ? Math.round((outputs.tongLyBan / inputs.daVien.qty) * 10) / 10 : 0;

  // 4. SO SÁNH ĐỊNH MỨC LÝ THUYẾT VS THỰC TẾ
  const benchmarks = {
    mia: {
      label: "Mía cây tươi",
      inputQty: inputs.mia.qty,
      inputUnit: "bó",
      outputCups: outputs.tongLyQuyDoiMia,
      actualYield: miaYieldActual, // ly / bó
      benchmarkYield: 45.0,        // lý thuyết: 45 ly / bó
      actualUnitCost: miaCostPerCup,
      variancePct: miaYieldActual > 0 ? Math.round(((miaYieldActual - 45.0) / 45.0) * 1000) / 10 : 0,
      status: miaYieldActual >= 42 ? "excellent" : (miaYieldActual >= 38 ? "good" : "low_yield"),
    },
    tac: {
      label: "Tắc tươi",
      inputQty: inputs.tac.qty,
      inputUnit: "kg",
      outputCups: totalTacCups,
      actualYield: tacYieldActual, // ly / kg
      benchmarkYield: 22.0,        // lý thuyết: 22 ly / kg
      variancePct: tacYieldActual > 0 ? Math.round(((tacYieldActual - 22.0) / 22.0) * 1000) / 10 : 0,
    },
    cam: {
      label: "Cam sành",
      inputQty: inputs.cam.qty,
      inputUnit: "kg",
      outputCups: totalCamCups,
      actualYield: camYieldActual, // ly / kg
      benchmarkYield: 3.0,         // lý thuyết: 3 ly / kg
      variancePct: camYieldActual > 0 ? Math.round(((camYieldActual - 3.0) / 3.0) * 1000) / 10 : 0,
    },
    rauMa: {
      label: "Rau má tươi",
      inputQty: inputs.rauMa.qty,
      inputUnit: "kg",
      outputCups: totalRauMaCups,
      actualYield: rauMaYieldActual, // ly / kg
      benchmarkYield: 5.0,           // lý thuyết: 5 ly / kg
      variancePct: rauMaYieldActual > 0 ? Math.round(((rauMaYieldActual - 5.0) / 5.0) * 1000) / 10 : 0,
    },
    daVien: {
      label: "Đá viên",
      inputQty: inputs.daVien.qty,
      inputUnit: "bao",
      outputCups: outputs.tongLyBan,
      actualYield: daYieldActual, // ly / bao
      benchmarkYield: 30.0,
      variancePct: daYieldActual > 0 ? Math.round(((daYieldActual - 30.0) / 30.0) * 1000) / 10 : 0,
    },
  };

  // Đánh giá mức độ thu thập dữ liệu & tốc độ tiêu thụ (Velocity & Days to Empty)
  const distinctDays = Math.max(1, new Set(validTx.map((t) => String(t.ngay || "").slice(0, 10))).size);
  const progressPct = Math.min(100, Math.round((distinctDays / days) * 100));

  // Tốc độ tiêu thụ trung bình mỗi ngày
  const avgMiaPerDay = Math.round((inputs.mia.qty / distinctDays) * 10) / 10;
  const avgCupsPerDay = Math.round((outputs.tongLyQuyDoiMia / distinctDays) * 10) / 10;
  
  // 1 bó mía bán trong bao lâu (tính theo giờ bán hàng ~12h/ngày hoặc theo ngày)
  const daysPerBundle = avgMiaPerDay > 0 ? Math.round((1 / avgMiaPerDay) * 10) / 10 : 0;
  const hoursPerBundle = avgMiaPerDay > 0 ? Math.round((12 / avgMiaPerDay) * 10) / 10 : 0;

  benchmarks.mia.avgPerDay = avgMiaPerDay;
  benchmarks.mia.daysPerBundle = daysPerBundle;
  benchmarks.mia.hoursPerBundle = hoursPerBundle;
  benchmarks.mia.avgCupsPerDay = avgCupsPerDay;

  return {
    days,
    distinctDays,
    progressPct,
    cutoffDateStr,
    branchName: branchName || "Toàn bộ chi nhánh",
    inputs,
    outputs,
    benchmarks,
    velocity: {
      distinctDays,
      avgMiaPerDay,
      avgCupsPerDay,
      daysPerBundle,
      hoursPerBundle,
    },
    generatedAt: now.toISOString(),
  };
}



