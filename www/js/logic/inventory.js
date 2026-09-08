import { docDuLieu, luuDuLieu, DEFAULT_DATA } from '../db.js';

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

export { nhapKhoNguyenLieu, capNhatTonKhoThucTe } from '../db.js';
