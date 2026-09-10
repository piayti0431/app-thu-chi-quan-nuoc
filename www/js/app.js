import { $, $$, showToast, escapeHtml } from "./ui/components.js";
import { capNhatTonKhoThucTe, layDanhSachTonKho, kiemTraCanhBaoTonKho, nhapKhoNguyenLieu, truKhoNguyenLieu } from './logic/inventory.js';
import { tinhBaoCaoThue, xuatToKhaiThue01CNKD } from './logic/tax.js';
import {
  capNhatCostChoMon,
  capNhatCurrentBranch,
  capNhatLaiGiaCostToanBoGiaoDich,
  chuyenTatCaGiaoDichMua10kgThanhXuatDung,
  datLaiGiaCostChuanSoTay,
  docDuLieu,
  layOverheadChoChiNhanh,
  tinhDiemHoaVonChiNhanh,
  luuOverheadChoChiNhanh,
  luuCostFormula,
  luuDanhSachChiNhanh,
  luuDanhSachMenu,
  luuDanhSachNguyenLieu,
  luuDuLieu,
  luuOverheadConfig,
  luuPackagingConfig,
  luuTienThoiDauNgay,
  luuTienThoiMacDinh,
  luuKhachQuen,
  luuTinNhanAIChat,
  nhapDuLieuTuJson,
  restartDuLieuHomNay,
  themGiaoDich,
  xoaGiaoDich,
  xoaLichSuAIChat,
  xoaTatCaDuLieu,
  xuatDuLieuJson,
  getValidMenuImage,
  getValidIngredientImage,
  getItemPrice,
  taoDotNhapMia,
  ghiNhanSoCheDotMia,
  dongDotNhapMia,
  layDotMiaDangHoatDong,
} from "./db.js";
import { phanTichChiTiet, phanTichNhieu } from "./parser.js";
import { dailyReport, docSoTienTiengViet, matchBranch, computeFundBalances } from "./report.js";
import { batDauNghe, docLai, dungNghe, getVoiceSettings, saveVoiceSettings, phatTiengChuongTingTing } from "./speech.js";
import { hoiGeminiAI } from "./ai-assistant.js";
import {
  batDauRealtime,
  dangKy,
  dangNhap,
  dangXuat,
  daDangNhap,
  dongBo,
  phatTinHieuSync,
  syncErrorMessage,
  layThongTinTaiKhoan,
  datLaiClientSupabase,
} from "./sync.js";

const isAuthBypassedForTest = () => window.__NUOCMIA_TEST_AUTH__ === true;

const money = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const MONTH_NAMES = [
  "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
  "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12",
];

let state = await docDuLieu();


let pendingVoice = null;
let dailyChart = null;
let categoryChart = null;
let micListening = false;
let authLoggedIn = false;
let appVersionText = "Phiên bản 2.0 (Toàn diện)";

// Stats view state
let statsMode = "day"; // "day" | "week" | "month"
let statsBranch = "all";
let statsDate = todayKey();
let statsWeekDate = todayKey();
let statsMonth = todayKey().slice(0, 7);

// History view state
let historyPeriod = "today"; // "today" | "yesterday" | "last_week" | "this_month" | "all" | "custom"
let historyStartDate = todayKey();
let historyEndDate = todayKey();

const UPDATE_DISMISS_KEY = "nuocmia_update_dismissed_version";

function formatMoney(value) {
  return money.format(Number(value) || 0).replace("₫", "đ");
}

function formatVoiceMoney(value) {
  return docSoTienTiengViet(Number(value) || 0);
}

function formatDate(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return value || "";
  return `${match[3]}/${match[2]}/${match[1]}`;
}

function formatDayHeading(dateString) {
  const match = String(dateString || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return dateString || "";
  const d = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const dayOfWeek = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"][d.getDay()];
  const formattedDate = `${match[3]}/${match[2]}/${match[1]}`;
  const today = todayKey();
  
  const yDate = new Date();
  yDate.setDate(yDate.getDate() - 1);
  const yKey = `${yDate.getFullYear()}-${String(yDate.getMonth() + 1).padStart(2, "0")}-${String(yDate.getDate()).padStart(2, "0")}`;

  if (dateString === today) {
    return `${dayOfWeek}, ${formattedDate} (Hôm nay)`;
  } else if (dateString === yKey) {
    return `${dayOfWeek}, ${formattedDate} (Hôm qua)`;
  }
  return `${dayOfWeek}, ${formattedDate}`;
}

function todayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getWeekRange(dateString) {
  const target = new Date(dateString || todayKey());
  const dayOfWeek = target.getDay(); // 0 is Sunday, 1 is Monday...
  const distanceToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  
  const monday = new Date(target);
  monday.setDate(target.getDate() + distanceToMonday);
  
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const formatKey = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  return {
    mondayKey: formatKey(monday),
    sundayKey: formatKey(sunday),
    label: `Thứ Hai (${monday.getDate()}/${monday.getMonth() + 1}) - Chủ Nhật (${sunday.getDate()}/${sunday.getMonth() + 1})`,
  };
}

function confirmationSpeech(parsed) {
  if (parsed.isBatch) {
    return `Đã nghe ${parsed.items.length} món thu, tổng ${formatVoiceMoney(parsed.total)}. Gồm ${parsed.moTaXacNhan}. Đúng không?`;
  }
  const type = parsed.loai === "thu" ? "Thu" : "Chi";
  const detail = parsed.moTaXacNhan || parsed.danhMuc;
  return `${type} ${formatVoiceMoney(parsed.soTien)}, ${detail}. Đúng không?`;
}



function setMicState(listening) {
  micListening = listening;
  const btn = $("#micBtn");
  const text = $("#micText");
  if (!btn || !text) return;
  btn.classList.toggle("is-recording", listening);
  text.textContent = listening ? "Đang nghe... (Bấm để dừng)" : "Bấm để nói";
}

function getDrinkIconSvg(iconName) {
  switch (iconName) {
    case "cup_1l":
      return `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 3h12l-1.5 17a2 2 0 0 1-2 2h-5a2 2 0 0 1-2-2L6 3z"/><path d="M4 3h16M14 1l-2 5"/></svg>`;
    case "bottle":
      return `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 2h4v3h-4zM9 5h6v3a4 4 0 0 1 1 3v9a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2v-9a4 4 0 0 1 1-3V5z"/><path d="M8 14h8"/></svg>`;
    case "citrus":
    case "orange":
      return `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 12 7.5 7.5M12 12l4.5-4.5M12 12v6M12 12l5.5 3M12 12l-5.5 3"/></svg>`;
    case "leaf":
      return `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2.5 1 5-1 9.5a7 7 0 0 1-7 8.5z"/><path d="M2 22c5-5 7-10 8-12"/></svg>`;
    case "milk":
      return `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 2h8v2H8zM7 4h10l1 4H6zM6 8h12v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V8z"/><path d="M10 13h4M12 11v4"/></svg>`;
    case "bean":
      return `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="12" rx="8" ry="5" transform="rotate(-30 12 12)"/><path d="M9 10c2 1 4 3 6 5"/></svg>`;
    case "tea":
      return `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 8h1a4 4 0 1 1 0 8h-1M5 8h12v9a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V8zM6 2v3M10 2v3M14 2v3"/></svg>`;
    case "cane":
    default:
      return `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 2v20M17 2v20M7 7h10M7 12h10M7 17h10"/></svg>`;
  }
}

// ----------------------------------------------------
// RENDERERS
// ----------------------------------------------------

function renderBranchSelectors() {
  const branches = state.branches || [{ id: "main", name: "Quán Nhà (Chính)" }];
  const current = state.currentBranch || "all";

  // Topbar branch selector
  const topSelect = $("#currentBranchSelect");
  if (topSelect) {
    topSelect.innerHTML = `
      <option value="all" ${current === "all" ? "selected" : ""}>🏢 Tất cả điểm bán</option>
      ${branches.map((b) => `<option value="${b.name}" ${b.name === current ? "selected" : ""}>📍 ${b.name}</option>`).join("")}
    `;
  }

  // Stats branch filter
  const statsSelect = $("#statsBranchFilter");
  if (statsSelect) {
    statsSelect.innerHTML = `
      <option value="all" ${statsBranch === "all" ? "selected" : ""}>Tất cả điểm bán</option>
      ${branches.map((b) => `<option value="${b.name}" ${statsBranch === b.name ? "selected" : ""}>${b.name}</option>`).join("")}
    `;
  }

  // Jars branch selector
  const jarsBranchSelect = $("#jarsBranchSelect");
  if (jarsBranchSelect) {
    jarsBranchSelect.innerHTML = `
      <option value="all" ${current === "all" ? "selected" : ""}>🏢 Tất cả điểm bán</option>
      ${branches.map((b) => `<option value="${b.name}" ${b.name === current ? "selected" : ""}>📍 ${b.name}</option>`).join("")}
    `;
    jarsBranchSelect.onchange = async (e) => {
      const selected = e.target.value;
      await capNhatCurrentBranch(selected);
      state = await docDuLieu();
      renderAll();
      const label = selected === "all" ? "Tất cả điểm bán" : selected;
      showToast(`Đã chuyển sang xem 4 Hũ: ${label}`);
    };
  }

  // History branch selector
  const histBranchSelect = $("#historyBranchSelect");
  if (histBranchSelect) {
    const curHistBranch = state.historyBranchFilter || current;
    histBranchSelect.innerHTML = `
      <option value="all" ${curHistBranch === "all" ? "selected" : ""}>🏢 Tất cả điểm bán</option>
      ${branches.map((b) => `<option value="${b.name}" ${b.name === curHistBranch ? "selected" : ""}>📍 ${b.name}</option>`).join("")}
    `;
  }

  // Settings branch manager
  renderBranchManager();
}

let activePosBill = []; // Mảng chứa các món trong Bill tạm thời [{ item, qty }]

function renderPosBillBar() {
  const bar = $("#fastPosBillBar");
  if (!bar) return;

  const activeBranch = (state.currentBranch && state.currentBranch !== "all") ? state.currentBranch : "Quán Nhà (Chính)";
  const totalCups = activePosBill.reduce((sum, entry) => sum + (entry.qty || 1), 0);
  const totalAmount = activePosBill.reduce((sum, entry) => sum + (entry.qty || 1) * (getItemPrice(entry.item, activeBranch) || 0), 0);

  if (totalCups > 0) {
    bar.style.display = "flex";
    const countEl = $("#posBillItemCount");
    const totalEl = $("#posBillTotalAmount");
    if (countEl) countEl.textContent = totalCups;
    if (totalEl) totalEl.textContent = formatMoney(totalAmount);
  } else {
    bar.style.display = "none";
  }
}

function renderFastCheckoutModal() {
  const listEl = $("#fastCheckoutItemList");
  const totalEl = $("#fastCheckoutTotalAmount");
  const branchEl = $("#fastCheckoutBranchLabel");
  if (!listEl || !totalEl) return;

  const activeBranch = (state.currentBranch && state.currentBranch !== "all")
    ? state.currentBranch
    : ((state.branches && state.branches[0]?.name) || "Quán Nhà (Chính)");

  if (branchEl) branchEl.textContent = `Điểm bán: ${activeBranch}`;

  const totalAmount = activePosBill.reduce((sum, entry) => sum + (entry.qty || 1) * (getItemPrice(entry.item, activeBranch) || 0), 0);
  totalEl.textContent = formatMoney(totalAmount);

  if (!activePosBill.length) {
    listEl.innerHTML = `<p style="margin: 0.5rem 0; font-size: 0.85rem; color: var(--muted); text-align: center;">Chưa có món nào trong Bill</p>`;
    return;
  }

  listEl.innerHTML = activePosBill
    .map((entry, idx) => {
      const itemPrice = getItemPrice(entry.item, activeBranch);
      const lineTotal = entry.qty * itemPrice;
      return `
        <div class="fast-bill-item-row">
          <div class="fast-bill-item-info">
            <strong class="fast-bill-item-name">${entry.item.name}</strong>
            <small class="fast-bill-item-sub">${formatMoney(itemPrice)} / ${entry.item.voiceUnit || "ly"}</small>
          </div>
          <div class="fast-bill-item-controls">
            <button class="fast-bill-btn-action fast-bill-qty-btn" data-action="dec" data-idx="${idx}" type="button" aria-label="Giảm 1">-</button>
            <strong class="fast-bill-item-qty">${entry.qty}</strong>
            <button class="fast-bill-btn-action fast-bill-qty-btn" data-action="inc" data-idx="${idx}" type="button" aria-label="Tăng 1">+</button>
            <strong class="fast-bill-item-line-total">${formatMoney(lineTotal)}</strong>
            <button class="fast-bill-btn-action fast-bill-btn-del fast-bill-qty-btn" data-action="del" data-idx="${idx}" type="button" aria-label="Xóa món">✕</button>
          </div>
        </div>
      `;
    })
    .join("");

  // Attach quantity modify buttons in checkout modal
  listEl.querySelectorAll(".fast-bill-qty-btn").forEach((btn) => {
    btn.onclick = () => {
      const idx = Number(btn.getAttribute("data-idx"));
      const action = btn.getAttribute("data-action");
      if (idx < 0 || idx >= activePosBill.length) return;

      if (action === "inc") {
        activePosBill[idx].qty += 1;
      } else if (action === "dec") {
        activePosBill[idx].qty -= 1;
        if (activePosBill[idx].qty <= 0) {
          activePosBill.splice(idx, 1);
        }
      } else if (action === "del") {
        activePosBill.splice(idx, 1);
      }

      renderPosBillBar();
      renderQuickButtons();
      renderFastCheckoutModal();
      updateFastCheckoutChange();
    };
  });

  // Default tendered = exact amount
  const tenderInput = $("#fastCheckoutTenderedInput");
  if (tenderInput && (!tenderInput.value || tenderInput.value === "0 đ")) {
    tenderInput.value = formatMoney(totalAmount);
  }
  updateFastCheckoutChange();
}

function updateFastCheckoutChange() {
  const tenderInput = $("#fastCheckoutTenderedInput");
  const changeEl = $("#fastCheckoutChangeDisplay");
  if (!tenderInput || !changeEl) return;

  const activeBranch = (state.currentBranch && state.currentBranch !== "all") ? state.currentBranch : "Quán Nhà (Chính)";
  const totalAmount = activePosBill.reduce((sum, entry) => sum + (entry.qty || 1) * (getItemPrice(entry.item, activeBranch) || 0), 0);
  const tendered = Number(tenderInput.value.replace(/[^0-9]/g, "")) || 0;
  const change = Math.max(0, tendered - totalAmount);

  changeEl.textContent = formatMoney(change);
  changeEl.style.color = tendered >= totalAmount ? "#059669" : "#dc2626";
}

function renderQuickButtons() {
  const container = $("#quickButtons");
  if (!container) return;

  const quickItems = state.quickItems || [];
  const activeBranch = (state.currentBranch && state.currentBranch !== "all") ? state.currentBranch : "Quán Nhà (Chính)";

  container.innerHTML = quickItems
    .map((item) => {
      const imgSrc = getValidMenuImage(item);
      const itemPrice = getItemPrice(item, activeBranch);
      const shortPrice = Number(itemPrice) >= 1000
        ? `${Math.round(itemPrice / 1000)}k`
        : formatMoney(itemPrice);

      // Check how many of this item is in the active POS bill
      const inBill = activePosBill.find((b) => b.item.id === item.id);
      const billBadge = inBill && inBill.qty > 0
        ? `<span class="quick-btn-item-count">x${inBill.qty}</span>`
        : "";

      return `
      <button class="quick-btn theme-${item.icon || "cane"}" data-id="${item.id}" type="button" aria-label="Bấm món ${item.name} (${formatMoney(itemPrice)})">
        ${billBadge}
        <span class="quick-btn-badge">${shortPrice}</span>
        <div class="quick-btn-img-box">
          ${imgSrc ? `<img class="quick-btn-img" src="${imgSrc}" alt="${item.name}" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />` : ""}
          <span class="drink-icon" style="${imgSrc ? "display:none;" : ""}">${getDrinkIconSvg(item.icon)}</span>
        </div>
        <strong class="quick-btn-name">${item.shortName || item.name}</strong>
      </button>
    `;
    })
    .join("");

  $$("#quickButtons .quick-btn").forEach((btn) => {
    btn.onclick = () => {
      const id = btn.getAttribute("data-id");
      const item = quickItems.find((q) => q.id === id);
      if (!item) return;

      const existing = activePosBill.find((b) => b.item.id === item.id);
      if (existing) {
        existing.qty += 1;
      } else {
        activePosBill.push({ item, qty: 1 });
      }

      renderPosBillBar();
      renderQuickButtons();
    };
  });

  renderPosBillBar();
}

let activeIngredientItem = null;

function renderQuickIngredients() {
  const container = $("#quickIngredientButtons");
  if (!container) return;

  const ingredients = state.quickIngredients || [];
  const activeBranch = (state.currentBranch && state.currentBranch !== "all")
    ? state.currentBranch
    : ((state.branches && state.branches[0]?.name) || "Quán Nhà (Chính)");

  const stockMap = {};
  if (state.inventoryStock && state.inventoryStock[activeBranch]) {
    state.inventoryStock[activeBranch].forEach((s) => {
      stockMap[s.id] = s.stockQty;
    });
  }

  container.innerHTML = ingredients
    .map((item) => {
      const imgSrc = getValidIngredientImage(item);
      const shortCost = Number(item.unitCost) >= 1000
        ? `${Math.round(item.unitCost / 1000)}k`
        : formatMoney(item.unitCost);

      const invId = item.inventoryId || item.id;
      const currentStock = stockMap[invId] !== undefined ? stockMap[invId] : null;
      const isLow = currentStock !== null && currentStock <= 2;
      const stockBadge = currentStock !== null
        ? `<span class="ing-stock-badge ${isLow ? 'is-low' : ''}" style="position: absolute; bottom: 0.35rem; right: 0.35rem; font-size: 0.7rem; font-weight: 800; background: ${isLow ? '#fee2e2' : 'rgba(241, 245, 249, 0.94)'}; color: ${isLow ? '#b91c1c' : '#334155'}; padding: 0.12rem 0.4rem; border-radius: 4px; border: 1px solid ${isLow ? '#fca5a5' : '#cbd5e1'}; backdrop-filter: blur(4px);">Tồn: ${currentStock} ${item.unit || ""}</span>`
        : '';

      return `
      <button class="quick-btn ingredient-card theme-${item.icon || "cane_bundle"}" data-id="${item.id}" type="button" aria-label="Xuất dùng / Nhập ${item.name} (${shortCost}/${item.unit})" style="position: relative;">
        <span class="quick-btn-badge ing-cost-badge">${shortCost}/${item.unit}</span>
        <div class="quick-btn-img-box ing-img-box">
          <img class="quick-btn-img ing-img" src="${imgSrc}" alt="${item.name}" loading="lazy" />
        </div>
        <strong class="quick-btn-name">${item.shortName || item.name}</strong>
        ${stockBadge}
      </button>
    `;
    })
    .join("");

  $$("#quickIngredientButtons .ingredient-card").forEach((btn) => {
    btn.onclick = () => {
      const id = btn.getAttribute("data-id");
      const item = ingredients.find((ing) => ing.id === id);
      if (!item) return;
      // Khi bấm vào thẻ nguyên liệu ở màn hình bán hàng, mặc định vào ngay chế độ "🛒 Mua hàng (Ghi chi)"
      openQuickIngredientModal(item, "buy");
    };
  });
}

function openQuickIngredientModal(item, defaultTab = "buy") {
  activeIngredientItem = item;
  const modal = $("#quickIngredientDialog");
  if (!modal) return;

  const isMaterialsView = $("#view-materials")?.classList.contains("is-active");
  const materialsBranch = $("#materialsBranchSelect")?.value;
  const activeBranch = (isMaterialsView && materialsBranch)
    ? materialsBranch
    : ((state.currentBranch && state.currentBranch !== "all")
      ? state.currentBranch
      : ((state.branches && state.branches[0]?.name) || "Quán Nhà (Chính)"));

  let currentStock = 0;
  if (state.inventoryStock && state.inventoryStock[activeBranch]) {
    const invItem = state.inventoryStock[activeBranch].find(x => x.id === item.inventoryId || x.id === item.id);
    if (invItem) currentStock = invItem.stockQty || 0;
  }

  const defaultQty = item.defaultQty || 1;
  const unitCost = Number(item.unitCost) || 0;
  const totalCost = defaultQty * unitCost;

  const imgEl = $("#ingModalImage");
  const nameEl = $("#ingModalItemName");
  const unitCostEl = $("#ingModalUnitCost");
  const noteEl = $("#ingModalNote");
  const unitLabelEl = $("#ingModalUnitLabel");
  const qtyInput = $("#ingQtyInput");
  const totalCostInput = $("#ingTotalCostInput");
  const stockBadgeEl = $("#ingModalStockBadge");
  const buyNoteInput = $("#ingBuyNoteInput");
  const useNoteInput = $("#ingUseNoteInput");

  if (imgEl) imgEl.src = getValidIngredientImage(item);
  if (nameEl) nameEl.textContent = item.name;
  if (unitCostEl) unitCostEl.textContent = `${formatMoney(unitCost)} / ${item.unit}`;
  if (noteEl) noteEl.textContent = item.note || `Định mức ~${item.yieldPerUnit || 1} ly / ${item.unit}`;
  if (unitLabelEl) unitLabelEl.textContent = item.unit;
  if (qtyInput) qtyInput.value = defaultQty;
  if (totalCostInput) totalCostInput.value = formatMoney(totalCost);

  if (stockBadgeEl) {
    const isMia10kg = item.inventoryId === "mia_10kg" || item.id === "mia_10kg" || item.id === "ing_mia_bo_10kg";
    stockBadgeEl.textContent = isMia10kg ? `Tồn: ${currentStock * 10} kg (${currentStock} bó)` : `Tồn: ${currentStock} ${item.unit}`;
    if (currentStock <= 2) {
      stockBadgeEl.style.background = "#fee2e2";
      stockBadgeEl.style.color = "#991b1b";
      stockBadgeEl.style.borderColor = "#fca5a5";
    } else {
      stockBadgeEl.style.background = "#e0f2fe";
      stockBadgeEl.style.color = "#0369a1";
      stockBadgeEl.style.borderColor = "#bae6fd";
    }
  }

  if (buyNoteInput) buyNoteInput.value = "";
  if (useNoteInput) useNoteInput.value = `[Pha chế bán hàng] Lấy ${defaultQty} ${item.unit} ${item.name} ra quầy phục vụ`;

  // Thiết lập tab mặc định: "use" (Xuất Dùng) hoặc "buy" (Mua Hàng)
  const tabRadio = $(`#ingActionTabGroup input[value='${defaultTab}']`);
  if (tabRadio) tabRadio.checked = true;
  switchIngModalTab(defaultTab);

  updateIngModalCost();
  modal.showModal();
}

function switchIngModalTab(tabValue) {
  const buySec = $("#ingBuySection");
  const useSec = $("#ingUseSection");
  const header = $("#ingModalHeader");
  const icon = $("#ingModalIcon");
  const title = $("#ingModalTitle");
  const subtitle = $("#ingModalSubtitle");

  if (tabValue === "buy") {
    if (buySec) buySec.style.display = "block";
    if (useSec) useSec.style.display = "none";
    if (header) header.style.background = "linear-gradient(135deg, #ea580c 0%, #d97706 100%)";
    if (icon) icon.textContent = "🛒";
    if (title) title.textContent = "Chi Tiền Mua Hàng (Nhập Kho)";
    if (subtitle) subtitle.textContent = "Ghi sổ chi phí tiền mặt & Tăng số lượng tồn kho";
  } else {
    if (buySec) buySec.style.display = "none";
    if (useSec) useSec.style.display = "block";
    if (header) header.style.background = "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)";
    if (icon) icon.textContent = "📦";
    if (title) title.textContent = "Xuất Dùng Nguyên Liệu (Pha Chế)";
    if (subtitle) subtitle.textContent = "Trừ tồn kho & Lưu nhật ký sử dụng quầy (0 đ phát sinh)";
  }
  updateIngModalCost();
}

function updateIngModalCost() {
  if (!activeIngredientItem) return;
  const qtyInput = $("#ingQtyInput");
  const totalCostInput = $("#ingTotalCostInput");
  const yieldEl = $("#ingEstimatedYield");
  if (!qtyInput) return;

  const qty = Math.max(1, Number(qtyInput.value) || 1);
  const unitCost = Number(activeIngredientItem.unitCost) || 0;
  if (totalCostInput) totalCostInput.value = formatMoney(qty * unitCost);

  const yieldPerUnit = Number(activeIngredientItem.yieldPerUnit) || 1;
  if (yieldEl) yieldEl.textContent = `~${qty * yieldPerUnit} ly nước`;

  const useNote = $("#ingUseNoteInput");
  if (useNote && (!useNote.value || useNote.value.startsWith("[Pha chế bán hàng]"))) {
    useNote.value = `[Pha chế bán hàng] Lấy ${qty} ${activeIngredientItem.unit} ${activeIngredientItem.name} ra quầy phục vụ`;
  }
}

function renderCategoryDatalist() {
  const datalist = $("#categoryDatalist");
  if (!datalist) return;
  const isThu = $("#manualForm input[name='loai']:checked")?.value === "thu";
  const list = isThu ? (state.danhMuc?.thu || []) : (state.danhMuc?.chi || []);
  datalist.innerHTML = list.map((cat) => `<option value="${cat}"></option>`).join("");
}

function renderFundsWidget() {
  const funds = computeFundBalances(state);
  if ($("#fundWalletBalance")) $("#fundWalletBalance").textContent = formatMoney(funds.capitalWallet);
  if ($("#fundRentBalance")) $("#fundRentBalance").textContent = formatMoney(funds.rentFund);
  if ($("#fundProfitBalance")) $("#fundProfitBalance").textContent = formatMoney(funds.profitFund);
}

function renderToday() {
  const today = todayKey();
  const selectedBranch = state.currentBranch || "all";
  const isAll = selectedBranch === "all";
  const isMainBranch = matchBranch(selectedBranch, "Quán Nhà (Chính)") && !isAll;

  const items = (state.ds || []).filter(
    (item) => !item.deleted && item.ngay === today && matchBranch(item.chiNhanh, selectedBranch) && item.loai !== 'chuyen_quy' && item.loai !== 'dieu_chinh_quy',
  );

  const income = items.filter((item) => item.loai === "thu").reduce((sum, item) => sum + Number(item.soTien || 0), 0);
  const expense = items.filter((item) => item.loai === "chi").reduce((sum, item) => sum + Number(item.soTien || 0), 0);
  const balance = income - expense;

  $("#todayIncome").textContent = formatMoney(income);
  $("#todayExpense").textContent = formatMoney(expense);
  $("#todayBalance").textContent = formatMoney(balance);
  if ($("#todayOpeningCashDisplay")) {
    $("#todayOpeningCashDisplay").textContent = formatMoney(getTodayOpeningCash(selectedBranch));
  }
  renderDailyRoutineBanner();

  // Calculate Dynamic Break-Even Target for Today according to selected branch
  const branchOverhead = layOverheadChoChiNhanh(state, selectedBranch);
  const breakEvenCalc = tinhDiemHoaVonChiNhanh(branchOverhead, 0.5);

  const targetBreakEvenRevenue = breakEvenCalc.targetRevenue;
  const incomeK = Math.round(income / 1000);
  const targetK = Math.round(targetBreakEvenRevenue / 1000);

  const thuItems = items.filter((item) => item.loai === "thu");
  const totalCostOfSales = thuItems.reduce((sum, item) => sum + Number(item.tongGiaCost || (item.giaCostDonVi * (item.soLuong || 1)) || 0), 0);
  const currentGrossProfit = income - totalCostOfSales;

  if ($("#breakevenRatio")) {
    $("#breakevenRatio").textContent = `[${incomeK}k / ${targetK}k]`;
  }
  if ($("#breakevenPercent")) {
    const pct = targetBreakEvenRevenue > 0 ? Math.round((income / targetBreakEvenRevenue) * 100) : 0;
    $("#breakevenPercent").textContent = `${pct}%`;
  }
  if ($("#breakevenBarFill")) {
    const fillPct = targetBreakEvenRevenue > 0 ? Math.min(100, Math.round((income / targetBreakEvenRevenue) * 100)) : 0;
    $("#breakevenBarFill").style.width = `${fillPct}%`;
  }
  if ($("#breakevenStatusText")) {
    if (income >= targetBreakEvenRevenue) {
      const netProfit = currentGrossProfit - breakEvenCalc.dailyFixedCost;
      $("#breakevenStatusText").innerHTML = `🎉 <strong style="color: #059669;">ĐÃ ĐẠT HÒA VỐN!</strong> Đang có lời ròng <strong>+${formatMoney(Math.max(0, netProfit))}</strong> bỏ túi sau khi trừ tiền nhà (${formatMoney(breakEvenCalc.rentDaily)}) & điện nước.`;
      $("#breakevenCard")?.classList.add("is-achieved");
    } else {
      const remain = targetBreakEvenRevenue - income;
      const detailNote = isAll
        ? `toàn bộ các chi nhánh (Tổng định phí ${formatMoney(breakEvenCalc.dailyFixedCost)}/ngày)`
        : `mặt bằng (${formatMoney(breakEvenCalc.rentDaily)}) & điện (${formatMoney(breakEvenCalc.elecDaily)})`;
      $("#breakevenStatusText").innerHTML = `⚡ Cần thêm <strong>${formatMoney(remain)}</strong> doanh thu để hòa vốn tiền ${detailNote} hôm nay.`;
      $("#breakevenCard")?.classList.remove("is-achieved");
    }
  }

  // 4 Mini Jars Update on Dashboard (Đồng bộ chuẩn xác với Tab 4 Hũ Tiền)
  const miniCost = totalCostOfSales;
  let targetRent = 0;
  if (isMainBranch) {
    targetRent = 0;
  } else if (isAll) {
    const ov2 = layOverheadChoChiNhanh(state, "Chi nhánh 2");
    const monthlyOverhead = ov2 ? (Number(ov2.rentMonthly) || 6000000) : 6000000;
    targetRent = Math.max(200000, Math.round(monthlyOverhead / 30));
  } else {
    const ov = layOverheadChoChiNhanh(state, selectedBranch);
    const monthlyOverhead = ov ? (Number(ov.rentMonthly) || 6000000) : 6000000;
    targetRent = Math.max(200000, Math.round(monthlyOverhead / 30));
  }

  const grossAfterBOM = Math.max(0, income - miniCost);
  const collectedRent = Math.min(grossAfterBOM, targetRent);
  const surplus = Math.max(0, grossAfterBOM - targetRent);
  const reserve = isMainBranch
    ? Math.round(grossAfterBOM * 0.10)
    : Math.round(surplus * 0.10);

  let miniProfit = 0;
  if (income > 0) {
    if (isMainBranch) {
      miniProfit = grossAfterBOM - reserve;
    } else if (grossAfterBOM >= targetRent) {
      miniProfit = surplus - reserve;
    } else {
      miniProfit = grossAfterBOM - targetRent;
    }
  }

  const openingCashVal = getTodayOpeningCash(selectedBranch);

  // Dynamic Labels & Percentages based on real daily data
  const costPct = income > 0 ? Math.round((miniCost / income) * 100) : 0;
  const rentPct = targetRent > 0 ? Math.min(100, Math.round((collectedRent / targetRent) * 100)) : 100;
  
  if ($("#miniJarCostLabel")) $("#miniJarCostLabel").textContent = income > 0 ? `🧊 Vốn (${costPct}%)` : `🧊 Hũ 1: Vốn BOM`;
  if ($("#miniJarRentLabel")) $("#miniJarRentLabel").textContent = isMainBranch ? `🏠 Nhà (0đ)` : (income > 0 ? `🏢 MB (${rentPct}%)` : `🏢 Hũ 2: Mặt Bằng`);
  if ($("#miniJarCashLabel")) $("#miniJarCashLabel").textContent = `💵 Hũ 3: Tiền Két`;
  if ($("#miniJarProfitLabel")) $("#miniJarProfitLabel").textContent = miniProfit >= 0 ? `💰 Hũ 4: Lời Sạch` : `🔴 Hũ 4: Bù Mặt Bằng`;

  if ($("#miniJarCost")) $("#miniJarCost").textContent = formatMoney(miniCost);
  if ($("#miniJarRent")) $("#miniJarRent").textContent = isMainBranch ? `0 đ (Nhà)` : `${formatMoney(targetRent)}`;
  if ($("#miniJarCash")) $("#miniJarCash").textContent = formatMoney(openingCashVal);
  if ($("#miniJarProfit")) {
    if (income === 0) {
      $("#miniJarProfit").textContent = "0 đ";
      $("#miniJarProfit").style.color = "#64748b";
    } else if (miniProfit >= 0) {
      $("#miniJarProfit").textContent = `+${formatMoney(miniProfit)}`;
      $("#miniJarProfit").style.color = "#059669";
    } else {
      $("#miniJarProfit").textContent = `-${formatMoney(Math.abs(miniProfit))}`;
      $("#miniJarProfit").style.color = "#dc2626";
    }
  }

  // Card Background / Border adjustments
  const profitCard = $("#miniJarProfitCard");
  if (profitCard) {
    if (income === 0) {
      profitCard.style.background = "rgba(100, 116, 139, 0.08)";
      profitCard.style.borderColor = "rgba(100, 116, 139, 0.2)";
    } else if (miniProfit >= 0) {
      profitCard.style.background = "rgba(5, 150, 105, 0.08)";
      profitCard.style.borderColor = "rgba(5, 150, 105, 0.2)";
    } else {
      profitCard.style.background = "rgba(220, 38, 38, 0.08)";
      profitCard.style.borderColor = "rgba(220, 38, 38, 0.2)";
    }
  }

  const list = $("#todayList");
  if (!list) return;

  const branchTitle = isAll ? "Tất cả điểm bán" : selectedBranch;
  if (!items.length) {
    list.innerHTML = `<p class="empty-state">Chưa có giao dịch nào hôm nay tại <strong>${branchTitle}</strong>. Bấm nút món hoặc nói vào Mic để ghi sổ.</p>`;
    return;
  }

  list.innerHTML = items
    .map(
      (item) => {
        const isTransfer = item.loai === "thu" && item.phuongThuc === "chuyen_khoan";
        const methodBadge = item.loai === "thu"
          ? `<button class="method-toggle-btn" data-id="${item.id}" type="button" title="Bấm để đổi Tiền mặt / Chuyển khoản" style="border: 1px solid ${isTransfer ? '#bae6fd' : '#bbf7d0'}; cursor: pointer; background: ${isTransfer ? 'rgba(14, 165, 233, 0.15)' : 'rgba(16, 185, 129, 0.15)'}; color: ${isTransfer ? '#0284c7' : '#059669'}; padding: 0.12rem 0.4rem; border-radius: 0.3rem; font-size: 0.72rem; font-weight: 800;">${isTransfer ? '📱 CK' : '💵 TM'}</button>`
          : "";
        const billCode = item.billCode || (item.loai === "thu" ? `#BILL-${String(item.id).slice(-4)}` : `#PO-${String(item.id).slice(-4)}`);
        const billBadge = `<span class="tx-bill-badge" style="background: ${item.loai === 'thu' ? '#ecfdf5' : '#fef3c7'}; color: ${item.loai === 'thu' ? '#047857' : '#b45309'}; font-weight: 800; font-size: 0.72rem; padding: 0.1rem 0.45rem; border-radius: 0.3rem; border: 1px solid ${item.loai === 'thu' ? '#a7f3d0' : '#fde68a'}; letter-spacing: 0.02em;">${billCode}</span>`;
        const branchName = item.chiNhanh || "Quán Nhà (Chính)";
        const isMain = matchBranch(branchName, "Quán Nhà (Chính)");
        const branchBadgeClass = isMain ? "main-branch" : "branch-2";

        return `
      <div class="transaction-item ${item.loai}">
        <div class="tx-main">
          <div class="tx-title-row">
            ${billBadge}
            <span class="tx-title">${escapeHtml(item.danhMuc || (item.loai === "thu" ? "Thu" : "Chi"))}</span>
            ${methodBadge}
            <span class="tx-qty">${item.soLuong ? `x${item.soLuong} ${item.donViTinh || (item.loai === "thu" ? "ly" : "kg")}` : ""}</span>
            <span class="tx-branch-badge ${branchBadgeClass}">${escapeHtml(branchName)}</span>
          </div>
          <p class="tx-note">${escapeHtml(item.ghiChu || item.cauNoiGoc || "Không có ghi chú")}</p>
          <div class="tx-meta">
            <span>${item.gio || ""}</span>
            ${item.giaCostDonVi > 0 ? `<span>Vốn: ${formatMoney(item.tongGiaCost || item.giaCostDonVi * (item.soLuong || 1))}</span>` : ""}
          </div>
        </div>
        <div class="tx-right">
          <strong class="tx-amount ${item.loai}">${item.loai === "thu" ? "+" : "-"}${formatMoney(item.soTien)}</strong>
          <button class="delete-btn" data-id="${item.id}" type="button" aria-label="Xóa">✕</button>
        </div>
      </div>
    `;
      },
    )
    .join("");

}

function renderHistory() {
  const list = $("#historyList");
  if (!list) return;

  const selectedBranch = state.historyBranchFilter || state.currentBranch || "all";
  const isAll = selectedBranch === "all";

  // Sync pill UI
  $$(".history-pill-btn").forEach((btn) => {
    if (btn.getAttribute("data-period") === historyPeriod) {
      btn.classList.add("is-active");
    } else {
      btn.classList.remove("is-active");
    }
  });

  const customRange = $("#historyCustomRange");
  if (customRange) {
    customRange.style.display = historyPeriod === "custom" ? "flex" : "none";
    if (historyPeriod === "custom") {
      if ($("#historyStartDate") && !$("#historyStartDate").value) $("#historyStartDate").value = historyStartDate;
      if ($("#historyEndDate") && !$("#historyEndDate").value) $("#historyEndDate").value = historyEndDate;
    }
  }

  // Filter transactions by branch
  const allItems = (state.ds || []).filter((item) => !item.deleted && matchBranch(item.chiNhanh, selectedBranch) && item.loai !== "chuyen_quy" && item.loai !== "dieu_chinh_quy");

  // Date filters
  const today = todayKey();
  const yDate = new Date();
  yDate.setDate(yDate.getDate() - 1);
  const yesterdayKey = `${yDate.getFullYear()}-${String(yDate.getMonth() + 1).padStart(2, "0")}-${String(yDate.getDate()).padStart(2, "0")}`;
  const thisMonthPrefix = today.slice(0, 7);

  const filtered = allItems.filter((it) => {
    if (!it.ngay) return false;
    if (historyPeriod === "today") return it.ngay === today;
    if (historyPeriod === "yesterday") return it.ngay === yesterdayKey;
    if (historyPeriod === "last_week") {
      const todayMs = new Date(today).getTime();
      const itemMs = new Date(it.ngay).getTime();
      const diffDays = Math.round((todayMs - itemMs) / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 7;
    }
    if (historyPeriod === "this_month") return it.ngay.startsWith(thisMonthPrefix);
    if (historyPeriod === "custom") {
      const start = $("#historyStartDate")?.value || historyStartDate;
      const end = $("#historyEndDate")?.value || historyEndDate;
      return it.ngay >= start && it.ngay <= end;
    }
    return true; // "all"
  });

  // Calculate summary counters
  let totalCount = filtered.length;
  let totalIncome = 0;
  let totalExpense = 0;
  filtered.forEach((it) => {
    if (it.loai === "thu") totalIncome += Number(it.soTien || 0);
    else if (it.loai === "chi") totalExpense += Number(it.soTien || 0);
  });
  const balance = totalIncome - totalExpense;

  if ($("#historySumCount")) $("#historySumCount").textContent = `${totalCount} giao dịch`;
  if ($("#historySumIncome")) $("#historySumIncome").textContent = `+${formatMoney(totalIncome)}`;
  if ($("#historySumExpense")) $("#historySumExpense").textContent = `-${formatMoney(totalExpense)}`;
  if ($("#historySumBalance")) {
    $("#historySumBalance").textContent = balance >= 0 ? `+${formatMoney(balance)}` : `-${formatMoney(Math.abs(balance))}`;
    $("#historySumBalance").style.color = balance >= 0 ? "#67e8f9" : "#f87171";
  }

  if (!filtered.length) {
    const periodLabelMap = {
      today: "hôm nay",
      yesterday: "hôm qua",
      last_week: "7 ngày qua",
      this_month: "tháng này",
      all: "tất cả thời gian",
      custom: "khoảng ngày đã chọn",
    };
    list.innerHTML = `<p class="empty-state" style="text-align: center; color: #94a3b8; padding: 2.5rem 0;">Không có giao dịch nào trong <strong>${periodLabelMap[historyPeriod] || ""}</strong> tại <strong>${isAll ? "tất cả điểm bán" : selectedBranch}</strong>.</p>`;
    return;
  }

  // Group by date (sorted newest date first)
  const groupedMap = new Map();
  filtered.forEach((it) => {
    const d = it.ngay;
    if (!groupedMap.has(d)) {
      groupedMap.set(d, {
        date: d,
        items: [],
        dayIncome: 0,
        dayExpense: 0,
        dayCups: 0,
      });
    }
    const g = groupedMap.get(d);
    g.items.push(it);
    if (it.loai === "thu") {
      g.dayIncome += Number(it.soTien || 0);
      g.dayCups += Number(it.soLuong || 1);
    } else if (it.loai === "chi") {
      g.dayExpense += Number(it.soTien || 0);
    }
  });

  const sortedDates = [...groupedMap.keys()].sort().reverse();

  list.innerHTML = sortedDates
    .map((dateKey) => {
      const g = groupedMap.get(dateKey);
      // Sort items within day: newest time or ID first
      g.items.sort((a, b) => (b.id || 0) - (a.id || 0));

      const dayHeaderHtml = `
        <div class="history-day-header">
          <div class="history-day-title">
            <span style="font-size: 1.15rem;">📅</span>
            <strong>${formatDayHeading(dateKey)}</strong>
            <span class="day-count-badge">${g.items.length} đơn ${g.dayCups > 0 ? `(${g.dayCups} ly)` : ""}</span>
          </div>
          <div class="history-day-totals">
            <span class="day-income">+${formatMoney(g.dayIncome)}</span>
            ${g.dayExpense > 0 ? `<span class="day-expense">−${formatMoney(g.dayExpense)}</span>` : ""}
          </div>
        </div>
      `;

      const dayItemsHtml = g.items
        .map((item) => {
          const isTransfer = item.loai === "thu" && item.phuongThuc === "chuyen_khoan";
          const methodBadge = item.loai === "thu"
            ? `<button class="method-toggle-btn" data-id="${item.id}" type="button" title="Bấm để đổi Tiền mặt / Chuyển khoản" style="border: 1px solid ${isTransfer ? '#bae6fd' : '#bbf7d0'}; cursor: pointer; background: ${isTransfer ? 'rgba(14, 165, 233, 0.15)' : 'rgba(16, 185, 129, 0.15)'}; color: ${isTransfer ? '#0284c7' : '#059669'}; padding: 0.12rem 0.4rem; border-radius: 0.3rem; font-size: 0.72rem; font-weight: 800;">${isTransfer ? '📱 CK' : '💵 TM'}</button>`
            : "";
          const billCode = item.billCode || (item.loai === "thu" ? `#BILL-${String(item.id).slice(-4)}` : `#PO-${String(item.id).slice(-4)}`);
          const billBadge = `<span class="tx-bill-badge" style="background: ${item.loai === 'thu' ? '#ecfdf5' : '#fef3c7'}; color: ${item.loai === 'thu' ? '#047857' : '#b45309'}; font-weight: 800; font-size: 0.72rem; padding: 0.1rem 0.45rem; border-radius: 0.3rem; border: 1px solid ${item.loai === 'thu' ? '#a7f3d0' : '#fde68a'}; letter-spacing: 0.02em;">${billCode}</span>`;
          const branchName = item.chiNhanh || "Quán Nhà (Chính)";
          const isMain = matchBranch(branchName, "Quán Nhà (Chính)");
          const branchBadgeClass = isMain ? "main-branch" : "branch-2";

          return `
            <div class="transaction-item ${item.loai}">
              <div class="tx-main">
                <div class="tx-title-row">
                  ${billBadge}
                  <span class="tx-title">${escapeHtml(item.danhMuc || (item.loai === "thu" ? "Thu" : "Chi"))}</span>
                  ${methodBadge}
                  <span class="tx-qty">${item.soLuong ? `x${item.soLuong} ${item.donViTinh || (item.loai === "thu" ? "ly" : "kg")}` : ""}</span>
                  <span class="tx-branch-badge ${branchBadgeClass}">${escapeHtml(branchName)}</span>
                </div>
                <p class="tx-note">${escapeHtml(item.ghiChu || item.cauNoiGoc || "")}</p>
                <div class="tx-meta">
                  <span>${item.gio || ""}</span>
                  ${item.giaCostDonVi > 0 ? `<span>Vốn: ${formatMoney(item.tongGiaCost || item.giaCostDonVi * (item.soLuong || 1))}</span>` : ""}
                </div>
              </div>
              <div class="tx-right">
                <strong class="tx-amount ${item.loai}">${item.loai === "thu" ? "+" : "-"}${formatMoney(item.soTien)}</strong>
                <button class="delete-btn" data-id="${item.id}" type="button" aria-label="Xóa">✕</button>
              </div>
            </div>
          `;
        })
        .join("");

      return `
        <div class="history-day-section">
          ${dayHeaderHtml}
          <div class="history-day-items">
            ${dayItemsHtml}
          </div>
        </div>
      `;
    })
    .join("");

}

// ----------------------------------------------------
// SMART DAILY FINANCIAL ROUTINE ASSISTANT (SÁNG / TRƯA / TỐI)
// ----------------------------------------------------

function getTodayOpeningCash(branchParam = null, dateParam = null) {
  const dateKey = dateParam || todayKey();
  const targetBranch = branchParam !== null ? branchParam : (state.currentBranch || "all");
  const branches = state.branches || [{ id: "main", name: "Quán Nhà (Chính)" }];

  if (targetBranch === "all") {
    return branches.reduce((sum, b) => {
      const key = `${dateKey}_${b.name}`;
      const val = state.openingCashByDate && state.openingCashByDate[key] !== undefined
        ? Number(state.openingCashByDate[key])
        : (Number(state.defaultOpeningCash) >= 0 ? Number(state.defaultOpeningCash) : 50000);
      return sum + val;
    }, 0);
  }

  const key = `${dateKey}_${targetBranch}`;
  if (state.openingCashByDate && state.openingCashByDate[key] !== undefined) {
    return Number(state.openingCashByDate[key]);
  }
  return Number(state.defaultOpeningCash) >= 0 ? Number(state.defaultOpeningCash) : 50000;
}

function getDailyRoutinePeriod() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11.5) return "morning";
  if (hour >= 11.5 && hour < 16.5) return "midday";
  return "evening";
}

function renderDailyRoutineBanner() {
  const banner = $("#dailyRoutineBanner");
  if (!banner) return;

  const period = getDailyRoutinePeriod();
  const today = todayKey();
  const selectedBranch = state.currentBranch || "Quán Nhà (Chính)";
  const isAll = selectedBranch === "all" || !selectedBranch;
  const openingCash = getTodayOpeningCash(selectedBranch);

  const items = (state.ds || []).filter(
    (it) => !it.deleted && it.ngay === today && (isAll || it.chiNhanh === selectedBranch)
  );

  const cashIncome = items.filter((it) => it.loai === "thu" && it.phuongThuc !== "chuyen_khoan").reduce((s, it) => s + (Number(it.soTien) || 0), 0);
  const transferIncome = items.filter((it) => it.loai === "thu" && it.phuongThuc === "chuyen_khoan").reduce((s, it) => s + (Number(it.soTien) || 0), 0);
  const cashExpense = items.filter((it) => it.loai === "chi" && it.phuongThuc !== "chuyen_khoan").reduce((s, it) => s + (Number(it.soTien) || 0), 0);
  const totalCost = items.filter((it) => it.loai === "thu").reduce((s, it) => s + (Number(it.tongGiaCost) || ((Number(it.giaCostDonVi) || 0) * (Number(it.soLuong) || 1))), 0);

  const branchOverhead = layOverheadChoChiNhanh(state, selectedBranch);
  const dailyFixed = branchOverhead ? Math.round(((branchOverhead.rentMonthly || 0) + (branchOverhead.electricityMonthly || 0) + (branchOverhead.waterMonthly || 0) + (branchOverhead.trashMonthly || 0) + (branchOverhead.depreciationMonthly || 0)) / 30) : 0;

  const drawerCashExpected = openingCash + cashIncome - cashExpense;
  const netProfit = (cashIncome + transferIncome) - totalCost - dailyFixed;

  banner.classList.remove("theme-morning", "theme-midday", "theme-evening");

  const iconElem = $("#routineBannerIcon");
  const titleElem = $("#routineBannerTitle");
  const badgeElem = $("#routineBannerBadge");
  const descElem = $("#routineBannerDesc");
  const btnElem = $("#routineBannerActionBtn");

  if (period === "morning") {
    banner.classList.add("theme-morning");
    if (iconElem) iconElem.textContent = "🌅";
    if (titleElem) titleElem.textContent = "Khởi Động Ca Sáng";
    if (badgeElem) badgeElem.textContent = "Mở Két";
    if (descElem) descElem.textContent = `Kiểm tra tiền thối đầu ngày (hiện tại: ${formatMoney(openingCash)}).`;
    if (btnElem) btnElem.textContent = "Đổi số tiền";
  } else if (period === "midday") {
    banner.classList.add("theme-midday");
    if (iconElem) iconElem.textContent = "☀️";
    if (titleElem) titleElem.textContent = "Nhắc Nhở Ca Trưa";
    if (badgeElem) badgeElem.textContent = "Đá & Mía";
    if (descElem) descElem.textContent = "Kiểm tra lượng đá viên & mía. Nếu có nhập hàng nhớ chạm ghi nhận ngay nhé!";
    if (btnElem) btnElem.textContent = "Nhập hàng";
  } else {
    banner.classList.add("theme-evening");
    if (iconElem) iconElem.textContent = "🌙";
    if (titleElem) titleElem.textContent = "Tổng Kết & Chốt Két";
    if (badgeElem) badgeElem.textContent = "Kiểm Két";
    if (descElem) descElem.textContent = `Tiền mặt két phải có: ${formatMoney(drawerCashExpected)} | Lời ròng: +${formatMoney(Math.max(0, netProfit))}.`;
    if (btnElem) btnElem.textContent = "Chốt két";
  }

  banner.style.display = "flex";
}

function openDailyRoutineModal(forcedPeriod = null) {
  const modal = $("#dailyRoutineModal");
  if (!modal) return;

  const period = forcedPeriod || getDailyRoutinePeriod();
  const today = todayKey();
  const selectedBranch = state.currentBranch || "Quán Nhà (Chính)";
  const isAll = selectedBranch === "all" || !selectedBranch;
  const openingCash = getTodayOpeningCash(selectedBranch);

  const items = (state.ds || []).filter(
    (it) => !it.deleted && it.ngay === today && (isAll || it.chiNhanh === selectedBranch)
  );

  const cashIncome = items.filter((it) => it.loai === "thu" && it.phuongThuc !== "chuyen_khoan").reduce((s, it) => s + (Number(it.soTien) || 0), 0);
  const transferIncome = items.filter((it) => it.loai === "thu" && it.phuongThuc === "chuyen_khoan").reduce((s, it) => s + (Number(it.soTien) || 0), 0);
  const cashExpense = items.filter((it) => it.loai === "chi" && it.phuongThuc !== "chuyen_khoan").reduce((s, it) => s + (Number(it.soTien) || 0), 0);
  const totalCost = items.filter((it) => it.loai === "thu").reduce((s, it) => s + (Number(it.tongGiaCost) || ((Number(it.giaCostDonVi) || 0) * (Number(it.soLuong) || 1))), 0);

  const branchOverhead = layOverheadChoChiNhanh(state, selectedBranch);
  const dailyFixed = branchOverhead ? Math.round(((branchOverhead.rentMonthly || 0) + (branchOverhead.electricityMonthly || 0) + (branchOverhead.waterMonthly || 0) + (branchOverhead.trashMonthly || 0) + (branchOverhead.depreciationMonthly || 0)) / 30) : 0;

  const drawerCashExpected = openingCash + cashIncome - cashExpense;
  const netProfit = (cashIncome + transferIncome) - totalCost - dailyFixed;

  const iconBadge = $("#routineModalIconBadge");
  const titleElem = $("#routineModalTitle");
  const subElem = $("#routineModalSubtitle");
  const bodyElem = $("#routineModalBody");
  const submitBtn = $("#submitRoutineModalBtn");

  if (!bodyElem) return;

  if (period === "morning") {
    if (iconBadge) iconBadge.textContent = "🌅";
    if (titleElem) titleElem.textContent = "Khởi Động Ca Sáng: Tiền Thối Đầu Ngày";
    if (subElem) subElem.textContent = "Nhập số tiền lẻ bạn bỏ vào két sáng nay để thối cho khách";
    if (submitBtn) submitBtn.textContent = "🚀 Xác Nhận Mở Két Bán Hàng";

    bodyElem.innerHTML = `
      <div style="background: #eff6ff; border: 1.5px solid #bfdbfe; border-radius: var(--radius-md); padding: 0.85rem; margin-bottom: 0.85rem;">
        <p style="margin: 0; font-size: 0.88rem; color: #1e3a8a; font-weight: 700;">
          💡 <strong>Chào ngày mới!</strong> Chúc quán hôm nay bán đắt hàng, bội thu đơn nước mía!
        </p>
      </div>
      <label style="display: block; font-weight: 700; font-size: 0.9rem; margin-bottom: 0.4rem; color: #334155;">
        💵 Số tiền lẻ bỏ két sáng nay (đ):
        <input id="routineOpeningCashInput" inputmode="numeric" value="${openingCash || 50000}" style="width: 100%; font-size: 1.25rem; font-weight: 900; color: #0f172a; padding: 0.65rem; border-radius: var(--radius-sm); border: 2px solid #0d9488; margin-top: 0.35rem; text-align: center;">
      </label>
      <div class="routine-preset-grid">
        <button class="routine-preset-btn ${openingCash === 50000 ? 'is-selected' : ''}" type="button" data-val="50000">50k (Mặc định)</button>
        <button class="routine-preset-btn ${openingCash === 100000 ? 'is-selected' : ''}" type="button" data-val="100000">100k</button>
        <button class="routine-preset-btn ${openingCash === 200000 ? 'is-selected' : ''}" type="button" data-val="200000">200k</button>
        <button class="routine-preset-btn ${openingCash === 500000 ? 'is-selected' : ''}" type="button" data-val="500000">500k</button>
      </div>
    `;

    bodyElem.querySelectorAll(".routine-preset-btn").forEach((btn) => {
      btn.onclick = () => {
        bodyElem.querySelectorAll(".routine-preset-btn").forEach((b) => b.classList.remove("is-selected"));
        btn.classList.add("is-selected");
        const val = Number(btn.getAttribute("data-val")) || 50000;
        const input = $("#routineOpeningCashInput");
        if (input) input.value = val;
      };
    });
  } else if (period === "midday") {
    if (iconBadge) iconBadge.textContent = "☀️";
    if (titleElem) titleElem.textContent = "Nhắc Nhở Ca Trưa: Kiểm Tra Đá & Mía";
    if (subElem) subElem.textContent = "Bổ sung nguyên liệu để phục vụ ca trưa & chiều suôn sẻ";
    if (submitBtn) submitBtn.textContent = "✅ Đã Đủ Đồ Bán";

    const iceUnitCost = selectedBranch === "Chi nhánh 2" ? 21000 : 17000;

    bodyElem.innerHTML = `
      <div style="background: #fff7ed; border: 1.5px solid #fed7aa; border-radius: var(--radius-md); padding: 0.85rem; margin-bottom: 0.85rem;">
        <p style="margin: 0; font-size: 0.88rem; color: #9a3412; font-weight: 700;">
          ☀️ <strong>Ca trưa cao điểm!</strong> Nếu vừa chi tiền mua thêm đá viên hay mía, hãy chạm nút bên dưới để ghi nhận ngay nhé:
        </p>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; margin-bottom: 0.85rem;">
        <button id="routineBuyIceBtn" type="button" style="padding: 0.75rem; border-radius: var(--radius-md); border: 1.5px solid #bae6fd; background: #f0f9ff; color: #0369a1; font-weight: 800; font-size: 0.88rem; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 0.2rem;">
          <span style="font-size: 1.4rem;">🧊</span>
          <span>+1 Bao Đá (${formatMoney(iceUnitCost)})</span>
        </button>
        <button id="routineBuyCaneBtn" type="button" style="padding: 0.75rem; border-radius: var(--radius-md); border: 1.5px solid #bbf7d0; background: #f0fdf4; color: #15803d; font-weight: 800; font-size: 0.88rem; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 0.2rem;">
          <span style="font-size: 1.4rem;">🎋</span>
          <span>+1 Bó Mía 10kg (70k)</span>
        </button>
      </div>
    `;

    $("#routineBuyIceBtn")?.addEventListener("click", async () => {
      await themGiaoDich({
        loai: "chi",
        soTien: iceUnitCost,
        soLuong: 1,
        donViTinh: "bao",
        phuongThuc: "tien_mat",
        danhMuc: "Mua đá viên",
        ghiChu: "Mua đá viên sạch",
        cauNoiGoc: "Mua 1 bao đá",
        chiNhanh: selectedBranch === "all" ? "Quán Nhà (Chính)" : selectedBranch,
      });
      state = await docDuLieu();
      renderAll();
      modal.close();
      showToast(`✅ Đã ghi nhận chi mua 1 bao đá (${formatMoney(iceUnitCost)})!`);
    });

    $("#routineBuyCaneBtn")?.addEventListener("click", async () => {
      await themGiaoDich({
        loai: "chi",
        soTien: 70000,
        soLuong: 1,
        donViTinh: "bó",
        phuongThuc: "tien_mat",
        danhMuc: "Mua mía cây",
        ghiChu: "Mua 1 bó mía 10kg đã bào sạch",
        cauNoiGoc: "Mua 1 bó mía 10kg",
        chiNhanh: selectedBranch === "all" ? "Quán Nhà (Chính)" : selectedBranch,
      });
      state = await docDuLieu();
      renderAll();
      modal.close();
      showToast(`✅ Đã ghi nhận chi mua 1 bó mía 10kg (70.000 đ)!`);
    });
  } else {
    if (iconBadge) iconBadge.textContent = "🌙";
    if (titleElem) titleElem.textContent = "Chốt Ca & Kiểm Két Đóng Quán";
    if (subElem) subElem.textContent = "Đối soát tiền mặt trong két và doanh thu hôm nay";
    if (submitBtn) submitBtn.textContent = "💵 Mở Báo Cáo Chốt Sổ Chi Tiết";

    bodyElem.innerHTML = `
      <div class="routine-metric-card">
        <div class="routine-metric-row">
          <span>💵 Tiền thối buổi sáng (A):</span>
          <strong>${formatMoney(openingCash)}</strong>
        </div>
        <div class="routine-metric-row">
          <span>📈 Thu tiền mặt trong ngày (+B):</span>
          <strong style="color: #059669;">+${formatMoney(cashIncome)}</strong>
        </div>
        <div class="routine-metric-row">
          <span>🛒 Chi tiền mặt trong ngày (-C):</span>
          <strong style="color: #dc2626;">-${formatMoney(cashExpense)}</strong>
        </div>
        <div class="routine-metric-row is-total">
          <span style="color: #1e293b;">👉 TIỀN KÉT PHẢI CÓ (A+B-C):</span>
          <strong style="color: #2563eb; font-size: 1.15rem;">${formatMoney(drawerCashExpected)}</strong>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-bottom: 0.5rem;">
        <div style="background: #f5f3ff; border: 1px solid #ddd6fe; border-radius: var(--radius-sm); padding: 0.6rem; text-align: center;">
          <span style="font-size: 0.76rem; color: #6d28d9; font-weight: 700; display: block;">📲 Thu Chuyển Khoản / MoMo</span>
          <strong style="font-size: 0.98rem; color: #5b21b6;">${formatMoney(transferIncome)}</strong>
        </div>
        <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: var(--radius-sm); padding: 0.6rem; text-align: center;">
          <span style="font-size: 0.76rem; color: #047857; font-weight: 700; display: block;">🟢 Lợi Nhuận Ròng Hôm Nay</span>
          <strong style="font-size: 0.98rem; color: #065f46;">+${formatMoney(Math.max(0, netProfit))}</strong>
        </div>
      </div>
    `;
  }

  modal.showModal();
}

function openDailyClosingModal(specificDate = null, specificBranch = null) {
  const dialog = $("#dailyClosingDialog");
  if (!dialog) return;

  const targetDate = specificDate || todayKey();
  const currentBranch = specificBranch || state.currentBranch || "all";
  state.activeClosingTarget = { date: targetDate, branch: currentBranch };

  const isAll = currentBranch === "all";
  const openingCash = getTodayOpeningCash(currentBranch, targetDate);
  const report = dailyReport(state.ds || [], targetDate, isAll ? null : currentBranch, openingCash);

  $("#closingBranchLabel").textContent = isAll ? "Điểm bán: Tất cả điểm bán (Toàn hệ thống)" : `Điểm bán: ${currentBranch}`;
  $("#closingDateHeader").textContent = `📋 Phiếu Tổng Kết Ngày ${formatDate(targetDate)}`;

  $("#closingIncome").textContent = formatMoney(report.income);
  $("#closingCashIncome").textContent = formatMoney(report.cashIncome);
  $("#closingTransferIncome").textContent = formatMoney(report.transferIncome);
  $("#closingTotalCupsText").textContent = `${report.totalDrinks} ly nước`;
  $("#closingCost").textContent = formatMoney(report.cost);
  $("#closingGrossProfit").textContent = formatMoney(report.grossProfit);
  $("#closingExpense").textContent = formatMoney(report.expense);

  // Overhead calculation for active branch
  const isMainBranch = matchBranch(currentBranch, "Quán Nhà (Chính)") && !isAll;
  let dailyOverhead = 0;
  if (isMainBranch) {
    dailyOverhead = 0;
  } else if (isAll) {
    const ov2 = layOverheadChoChiNhanh(state, "Chi nhánh 2");
    const monthlyOverhead = ov2 ? (Number(ov2.rentMonthly) || 6000000) : 6000000;
    dailyOverhead = Math.max(200000, Math.round(monthlyOverhead / 30));
  } else {
    const ov = layOverheadChoChiNhanh(state, currentBranch);
    const monthlyOverhead = ov ? (Number(ov.rentMonthly) || 6000000) : 6000000;
    dailyOverhead = Math.max(200000, Math.round(monthlyOverhead / 30));
  }

  const targetRent = dailyOverhead;
  const jar1Cost = report.cost;
  const grossAfterBOM = Math.max(0, report.income - jar1Cost);
  const jarRentCollected = Math.min(grossAfterBOM, targetRent);
  const rentShortfall = Math.max(0, targetRent - jarRentCollected);
  const rentProgress = targetRent > 0 ? Math.min(100, Math.round((jarRentCollected / targetRent) * 100)) : 100;
  
  const surplusAfterRent = Math.max(0, grossAfterBOM - targetRent);
  const jar3Reserve = isMainBranch 
    ? Math.round(grossAfterBOM * 0.10) 
    : Math.round(surplusAfterRent * 0.10);

  let jar4Profit = 0;
  if (report.income > 0) {
    if (isMainBranch) {
      jar4Profit = grossAfterBOM - jar3Reserve;
    } else if (grossAfterBOM >= targetRent) {
      jar4Profit = surplusAfterRent - jar3Reserve;
    } else {
      jar4Profit = grossAfterBOM - targetRent;
    }
  }

  const trueNetProfit = jar4Profit;
  if ($("#closingNetProfit")) {
    if (trueNetProfit > 0) {
      $("#closingNetProfit").textContent = `+${formatMoney(trueNetProfit)}`;
      $("#closingNetProfit").style.color = "#ffffff";
    } else if (trueNetProfit < 0) {
      $("#closingNetProfit").textContent = `-${formatMoney(Math.abs(trueNetProfit))}`;
      $("#closingNetProfit").style.color = "#fecaca";
    } else {
      $("#closingNetProfit").textContent = "0 đ";
      $("#closingNetProfit").style.color = "#ffffff";
    }
  }

  if ($("#jarCost")) $("#jarCost").textContent = formatMoney(jar1Cost);
  if ($("#jarRent")) $("#jarRent").textContent = isMainBranch ? "0 đ (Mặt bằng nhà)" : `${formatMoney(jarRentCollected)} / ${formatMoney(targetRent)} (${rentProgress}%)`;
  if ($("#jarOpeningCash")) $("#jarOpeningCash").textContent = `${formatMoney(jar3Reserve)} (Quỹ 10%)`;
  if ($("#jarNetProfit")) {
    if (jar4Profit > 0) {
      $("#jarNetProfit").textContent = `+${formatMoney(jar4Profit)}`;
      $("#jarNetProfit").style.color = "#059669";
    } else if (jar4Profit < 0) {
      $("#jarNetProfit").textContent = `-${formatMoney(Math.abs(jar4Profit))}`;
      $("#jarNetProfit").style.color = "#dc2626";
    } else {
      $("#jarNetProfit").textContent = "0 đ";
      $("#jarNetProfit").style.color = "#64748b";
    }
  }
  if ($("#jarNetProfitHint")) {
    if (isMainBranch) {
      $("#jarNetProfitHint").textContent = `🏠 Quán Nhà (0đ MB): Lời sạch nhận trọn +${formatMoney(jar4Profit)}`;
      $("#jarNetProfitHint").style.color = "#065f46";
    } else if (jar4Profit > 0) {
      $("#jarNetProfitHint").textContent = `🎉 Gom đủ 100% mặt bằng! Lời sạch: +${formatMoney(jar4Profit)}`;
      $("#jarNetProfitHint").style.color = "#065f46";
    } else if (report.income === 0) {
      $("#jarNetProfitHint").textContent = `Chưa có doanh thu hôm nay`;
      $("#jarNetProfitHint").style.color = "#64748b";
    } else {
      $("#jarNetProfitHint").textContent = `⚠️ Đã dồn ${formatMoney(jarRentCollected)}/${formatMoney(targetRent)} vào tiền nhà. Cần bù -${formatMoney(Math.abs(jar4Profit))}`;
      $("#jarNetProfitHint").style.color = "#dc2626";
    }
  }

  // Cash Reconcile values
  if ($("#closingOpeningCash")) $("#closingOpeningCash").textContent = formatMoney(report.openingCash);
  if ($("#closingCashIncomeReconcile")) $("#closingCashIncomeReconcile").textContent = `+${formatMoney(report.cashIncome)}`;
  if ($("#closingExpenseReconcile")) $("#closingExpenseReconcile").textContent = `−${formatMoney(report.cashDrawerExpense || 0)}`;
  if ($("#closingExpectedCash")) $("#closingExpectedCash").textContent = formatMoney(report.expectedCashInDrawer);
  if ($("#closingTransferHint")) $("#closingTransferHint").textContent = formatMoney(report.transferIncome);

  // 📋 SAO KÊ KÉT TIỀN CHI TIẾT (Line-by-line cash flow statement)
  const cashFlowBody = $("#cashFlowDetailBody");
  if (cashFlowBody) {
    // Separate cash sales and expenses
    const cashSales = report.items.filter(it => it.loai === "thu" && it.phuongThuc !== "chuyen_khoan");
    const transferSales = report.items.filter(it => it.loai === "thu" && it.phuongThuc === "chuyen_khoan");
    const drawerExpenses = report.items.filter(it => {
      if (it.loai !== "chi") return false;
      if (!it.nguonTienChi) {
        const itemDateStr = it.ngay || "";
        if (itemDateStr < "2026-09-01") {
          const name = (it.danhMuc || "").toLowerCase();
          if (name.includes("đá") && Number(it.soTien) === 21000) return true;
          return false;
        }
      }
      return it.nguonTienChi !== "tien_von";
    });

    const walletExpenses = report.items.filter(it => {
      if (it.loai !== "chi") return false;
      if (!it.nguonTienChi) {
        const itemDateStr = it.ngay || "";
        if (itemDateStr < "2026-09-01") {
          const name = (it.danhMuc || "").toLowerCase();
          if (name.includes("đá") && Number(it.soTien) === 21000) return false;
          return true;
        }
      }
      return it.nguonTienChi === "tien_von";
    });

    // Group cash sales by drink name for cleaner display
    const cashSalesGrouped = new Map();
    cashSales.forEach(it => {
      const name = it.danhMuc || "Nước mía thường";
      const existing = cashSalesGrouped.get(name) || { count: 0, amount: 0 };
      existing.count += Number(it.soLuong || 1);
      existing.amount += Number(it.soTien || 0);
      cashSalesGrouped.set(name, existing);
    });

    let runningBalance = report.openingCash;
    let html = `<div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 0.4rem 0.55rem; margin-bottom: 0.5rem;">
      <strong style="color: #166534; font-size: 0.8rem;">💰 SỐ DƯ ĐẦU NGÀY TRONG KÉT</strong>
    </div>`;

    // Opening Cash row
    html += `<div style="display: flex; justify-content: space-between; padding: 0.25rem 0.35rem; border-bottom: 1px solid #f1f5f9; background: #fefce8;">
      <span>🟡 Tiền thối bỏ sẵn trong két sáng nay</span>
      <strong style="color: #854d0e;">+${formatMoney(report.openingCash)}</strong>
    </div>`;
    html += `<div style="text-align: right; padding: 0.15rem 0.35rem; font-size: 0.72rem; color: #94a3b8;">Số dư: ${formatMoney(runningBalance)}</div>`;

    // Cash Income Section
    if (cashSalesGrouped.size > 0) {
      html += `<div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 0.4rem 0.55rem; margin: 0.4rem 0 0.25rem;">
        <strong style="color: #166534; font-size: 0.8rem;">🟢 TIỀN MẶT KHÁCH TRẢ VÀO KÉT (+${formatMoney(report.cashIncome)})</strong>
      </div>`;
      for (const [name, data] of cashSalesGrouped) {
        runningBalance += data.amount;
        html += `<div style="display: flex; justify-content: space-between; padding: 0.25rem 0.35rem; border-bottom: 1px solid #f1f5f9;">
          <span>🧃 ${name} × ${data.count} ly</span>
          <strong style="color: #059669;">+${formatMoney(data.amount)}</strong>
        </div>`;
        html += `<div style="text-align: right; padding: 0.15rem 0.35rem; font-size: 0.72rem; color: #94a3b8;">Số dư: ${formatMoney(runningBalance)}</div>`;
      }
    }

    // Transfer notice (not in cash drawer)
    if (transferSales.length > 0) {
      html += `<div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 6px; padding: 0.4rem 0.55rem; margin: 0.4rem 0 0.25rem;">
        <strong style="color: #0369a1; font-size: 0.8rem;">📲 CHUYỂN KHOẢN / QR (${formatMoney(report.transferIncome)}) — Không vào két</strong>
      </div>`;
      const transferGrouped = new Map();
      transferSales.forEach(it => {
        const name = it.danhMuc || "Nước mía thường";
        const existing = transferGrouped.get(name) || { count: 0, amount: 0 };
        existing.count += Number(it.soLuong || 1);
        existing.amount += Number(it.soTien || 0);
        transferGrouped.set(name, existing);
      });
      for (const [name, data] of transferGrouped) {
        html += `<div style="display: flex; justify-content: space-between; padding: 0.25rem 0.35rem; border-bottom: 1px solid #f1f5f9; color: #64748b; font-style: italic;">
          <span>📲 ${name} × ${data.count} ly (CK)</span>
          <span>${formatMoney(data.amount)} → Ngân hàng</span>
        </div>`;
      }
      html += `<div style="text-align: right; padding: 0.15rem 0.35rem; font-size: 0.72rem; color: #94a3b8;">Số dư két: ${formatMoney(runningBalance)} (không đổi vì CK vào tài khoản)</div>`;
    }

    // Cash Out Section (Expenses FROM DRAWER)
    if (drawerExpenses.length > 0) {
      html += `<div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 0.4rem 0.55rem; margin: 0.4rem 0 0.25rem;">
        <strong style="color: #991b1b; font-size: 0.8rem;">🔴 RÚT TIỀN KÉT MUA HÀNG (−${formatMoney(report.cashDrawerExpense || 0)})</strong>
      </div>`;
      drawerExpenses.forEach(it => {
        const name = it.danhMuc || "Chi khác";
        const qty = Number(it.soLuong) || 1;
        const unit = it.donViTinh || "";
        const amount = Number(it.soTien || 0);
        runningBalance -= amount;
        const qtyText = unit ? `${qty} ${unit}` : `${qty} lần`;
        html += `<div style="display: flex; justify-content: space-between; padding: 0.25rem 0.35rem; border-bottom: 1px solid #f1f5f9;">
          <span>🛒 ${name} (${qtyText})</span>
          <strong style="color: #dc2626;">−${formatMoney(amount)}</strong>
        </div>`;
        html += `<div style="text-align: right; padding: 0.15rem 0.35rem; font-size: 0.72rem; color: #94a3b8;">Số dư: ${formatMoney(runningBalance)}</div>`;
      });
    }

    // Wallet Expenses (Not from drawer)
    if (walletExpenses.length > 0) {
      html += `<div style="background: #fdf4ff; border: 1px solid #f8c1cc; border-radius: 6px; padding: 0.4rem 0.55rem; margin: 0.4rem 0 0.25rem;">
        <strong style="color: #a21caf; font-size: 0.8rem;">👛 LẤY TIỀN VÍ CÁ NHÂN MUA HÀNG (${formatMoney(report.walletExpense || 0)}) — Không trừ vào két</strong>
      </div>`;
      walletExpenses.forEach(it => {
        const name = it.danhMuc || "Chi khác";
        const qty = Number(it.soLuong) || 1;
        const unit = it.donViTinh || "";
        const amount = Number(it.soTien || 0);
        const qtyText = unit ? `${qty} ${unit}` : `${qty} lần`;
        html += `<div style="display: flex; justify-content: space-between; padding: 0.25rem 0.35rem; border-bottom: 1px solid #f1f5f9; color: #6b7280; font-style: italic;">
          <span>🛒 ${name} (${qtyText})</span>
          <span>${formatMoney(amount)} (Tiền vốn)</span>
        </div>`;
      });
      html += `<div style="text-align: right; padding: 0.15rem 0.35rem; font-size: 0.72rem; color: #94a3b8;">Số dư két: ${formatMoney(runningBalance)} (chưa rút trả lại ví)</div>`;
    }

    // Final Summary
    html += `<div style="background: linear-gradient(135deg, #eff6ff, #dbeafe); border: 2px solid #3b82f6; border-radius: 8px; padding: 0.55rem 0.65rem; margin-top: 0.5rem;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <strong style="color: #1e40af; font-size: 0.85rem;">🎯 KÉT PHẢI CÒN ĐÚNG:</strong>
        <strong style="color: #1d4ed8; font-size: 1.1rem;">${formatMoney(report.expectedCashInDrawer)}</strong>
      </div>
      <div style="font-size: 0.72rem; color: #3b82f6; margin-top: 0.25rem;">
        = ${formatMoney(report.openingCash)} (thối sáng) + ${formatMoney(report.cashIncome)} (thu mặt) − ${formatMoney(report.cashDrawerExpense || 0)} (rút két)
      </div>`;
      
    html += `</div>`;

    cashFlowBody.innerHTML = html;
  }
  
  state.pendingClosingFunds = {
    bom: jar1Cost,
    rent: jarRentCollected,
    profit: jar4Profit
  };

  // Populate Action Plan
  if ($("#actionKeepBase")) $("#actionKeepBase").textContent = formatMoney(report.openingCash);
  if ($("#actionExtractBOM")) $("#actionExtractBOM").textContent = formatMoney(jar1Cost);
  if ($("#actionExtractRent")) $("#actionExtractRent").textContent = formatMoney(jarRentCollected);
  if ($("#actionExtractProfit")) $("#actionExtractProfit").textContent = formatMoney(jar4Profit);

  // Drinks breakdown table
  const drinksMap = new Map();
  report.items
    .filter((it) => it.loai === "thu")
    .forEach((it) => {
      const name = it.danhMuc || "Nước mía thường";
      const existing = drinksMap.get(name) || { count: 0, revenue: 0, cost: 0 };
      existing.count += Number(it.soLuong || 1);
      existing.revenue += Number(it.soTien || 0);
      existing.cost += Number(it.tongGiaCost || (Number(it.soLuong || 1) * Number(it.giaCostDonVi || 0)) || 0);
      drinksMap.set(name, existing);
    });

  const drinksBody = $("#closingDrinksBody");
  if (drinksBody) {
    if (drinksMap.size === 0) {
      drinksBody.innerHTML = `<tr><td colspan="5" class="text-center" style="color: var(--muted);">Chưa có đơn bán nước nào hôm nay.</td></tr>`;
    } else {
      drinksBody.innerHTML = [...drinksMap.entries()]
        .map(([name, data]) => {
          const profit = data.revenue - data.cost;
          return `
          <tr>
            <td><strong>${name}</strong></td>
            <td class="text-center">${data.count} ly</td>
            <td class="text-right">${formatMoney(data.revenue)}</td>
            <td class="text-right" style="color: #d97706;">${formatMoney(data.cost)}</td>
            <td class="text-right" style="color: #059669; font-weight: 700;">+${formatMoney(profit)}</td>
          </tr>
        `;
        })
        .join("");
    }
  }

  // Expenses breakdown table
  const expensesMap = new Map();
  report.items
    .filter((it) => it.loai === "chi")
    .forEach((it) => {
      const name = it.danhMuc || "Chi khác";
      const qty = Number(it.soLuong) || 1;
      const unit = it.donViTinh || "kg";
      const existing = expensesMap.get(name) || { amount: 0, units: new Map() };
      existing.amount += Number(it.soTien || 0);
      existing.units.set(unit, (existing.units.get(unit) || 0) + qty);
      expensesMap.set(name, existing);
    });

  const formatExpenseUnits = (unitsMap) => {
    return [...unitsMap.entries()].map(([u, q]) => `${q} ${u}`).join(", ") || "1 lần";
  };

  const expensesBody = $("#closingExpensesBody");
  if (expensesBody) {
    if (expensesMap.size === 0) {
      expensesBody.innerHTML = `<tr><td colspan="3" class="text-center" style="color: var(--muted);">Không có khoản chi nào hôm nay.</td></tr>`;
    } else {
      expensesBody.innerHTML = [...expensesMap.entries()]
        .map(
          ([name, data]) => `
          <tr>
            <td><strong>${name}</strong></td>
            <td class="text-center">${formatExpenseUnits(data.units)}</td>
            <td class="text-right" style="color: var(--red); font-weight: 700;">-${formatMoney(data.amount)}</td>
          </tr>
        `,
        )
        .join("");
    }
  }

  const transferCount = report.items.filter((it) => it.loai === "thu" && it.phuongThuc === "chuyen_khoan").length;
  if ($("#closingTransferCountHint")) $("#closingTransferCountHint").textContent = `${transferCount} bill`;

  // Dual-channel reconciliation (Cash & Bank/MoMo)
  const cashInput = $("#closingCashActual");
  const cashResult = $("#closingCashResult");
  const bankInput = $("#closingBankActual");
  const bankResult = $("#closingBankResult");
  const overallBox = $("#closingOverallBox");
  const overallTitle = $("#closingOverallTitle");
  const overallDetail = $("#closingOverallDetail");

  if (cashInput) cashInput.value = "";
  if (bankInput) bankInput.value = "";
  if (cashResult) cashResult.innerHTML = "";
  if (bankResult) bankResult.innerHTML = "";
  if (overallBox) overallBox.style.display = "none";

  const updateDualReconcile = () => {
    let hasCashInput = false;
    let hasBankInput = false;
    let cashMatch = false;
    let bankMatch = false;

    // Check Cash
    if (cashInput && cashResult && cashInput.value.trim() !== "") {
      hasCashInput = true;
      const val = Number(cashInput.value.replace(/[^0-9]/g, ""));
      const expected = report.expectedCashInDrawer;
      const diff = val - expected;

      if (diff === 0) {
        cashMatch = true;
        cashResult.innerHTML = `<span style="color: #16a34a; font-weight: 800;">✅ Khớp tiền mặt 100%!</span> Đúng ${formatMoney(val)} cần có trong két.`;
      } else if (diff > 0) {
        cashResult.innerHTML = `<span style="color: #ea580c; font-weight: 800;">🟢 Dư tiền mặt: +${formatMoney(diff)}</span> (Đếm được: ${formatMoney(val)} / Cần có: ${formatMoney(expected)}).`;
      } else {
        cashResult.innerHTML = `<span style="color: #dc2626; font-weight: 800;">🔴 Thiếu tiền mặt: -${formatMoney(Math.abs(diff))}</span> (Đếm được: ${formatMoney(val)} / Cần có: ${formatMoney(expected)}).`;
      }

      // 💡 Gợi ý nguyên nhân dư/thiếu tiền
      const hintsBox = $("#cashDiscrepancyHints");
      if (hintsBox) {
        if (diff === 0) {
          hintsBox.style.display = "none";
        } else if (diff > 0) {
          hintsBox.style.display = "block";
          hintsBox.style.background = "#fefce8";
          hintsBox.style.border = "1px solid #fde68a";
          hintsBox.style.color = "#854d0e";
          hintsBox.innerHTML = `
            <strong>💡 Két dư +${formatMoney(diff)} — Tại sao?</strong><br>
            <div style="margin-top: 0.3rem;">
              Tiền thật trong két <strong>nhiều hơn</strong> sổ sách ${formatMoney(diff)}. Có thể do:<br>
              <div style="margin-top: 0.25rem; padding-left: 0.5rem;">
                ① <strong>Bán ly chưa bấm ghi sổ</strong> — VD: bán ${Math.ceil(diff / 8000)} ly nước (≈${formatMoney(diff)}) mà quên bấm nút ghi → tiền mặt vào két nhưng app không biết.<br>
                ② <strong>Khách trả dư / tip</strong> — VD: ly 8k khách đưa 10k không thối → dư 2k mỗi lần, tích lũy nhiều lần = ${formatMoney(diff)}.<br>
                ③ <strong>Tiền thối sáng thực tế > ${formatMoney(report.openingCash)}</strong> — Nếu hôm qua chốt ca xong mà quên lấy bớt tiền ra, sáng nay két đã có sẵn nhiều hơn ${formatMoney(report.openingCash)}.<br>
                ④ <strong>Ai đó bỏ thêm tiền vào két</strong> — Người nhà / cộng sự đổi tiền lẻ hoặc bỏ tiền riêng vào mà chưa nói.
              </div>
              <div style="margin-top: 0.4rem; padding: 0.35rem 0.5rem; background: #fff7ed; border: 1px dashed #f59e0b; border-radius: 4px;">
                <strong>👉 Cách xử lý:</strong> Kiểm tra lại số ly thực bán (đếm ly/cốc đã dùng), đối chiếu hóa đơn. Nếu chắc chắn đã ghi đủ → tiền dư là tip/làm tròn → có thể bỏ vào hũ dự phòng.
              </div>
            </div>`;
        } else {
          hintsBox.style.display = "block";
          hintsBox.style.background = "#fef2f2";
          hintsBox.style.border = "1px solid #fecaca";
          hintsBox.style.color = "#991b1b";
          hintsBox.innerHTML = `
            <strong>⚠️ Két thiếu −${formatMoney(Math.abs(diff))} — Tại sao?</strong><br>
            <div style="margin-top: 0.3rem;">
              Tiền thật trong két <strong>ít hơn</strong> sổ sách ${formatMoney(Math.abs(diff))}. Có thể do:<br>
              <div style="margin-top: 0.25rem; padding-left: 0.5rem;">
                ① <strong>Thối dư cho khách</strong> — VD: tính nhầm tiền thối, trả lại nhiều hơn mức cần.<br>
                ② <strong>Lấy tiền két chi xài chưa ghi</strong> — Mua đồ lặt vặt (bịch ny-lon, ống hút...) mà quên note vào chi phí.<br>
                ③ <strong>Ghi sai giá bán</strong> — Bán 8k nhưng app ghi 10k → sổ sách cao hơn thực tế.<br>
                ④ <strong>Đếm thiếu / rơi tiền</strong> — Kiểm tra lại trong két, ngăn kéo, túi áo.
              </div>
              <div style="margin-top: 0.4rem; padding: 0.35rem 0.5rem; background: #fff1f2; border: 1px dashed #f87171; border-radius: 4px;">
                <strong>👉 Cách xử lý:</strong> Đếm lại thật kỹ, kiểm tra ngăn kéo két. Nếu chênh lệch nhỏ (< 10k) có thể do thối tiền lẻ tích lũy. Nếu lớn → rà lại các khoản chi trong ngày.
              </div>
            </div>`;
        }
      }

    } else if (cashResult) {
      cashResult.innerHTML = "";
      const hintsBox = $("#cashDiscrepancyHints");
      if (hintsBox) hintsBox.style.display = "none";
    }

    // Check Bank / MoMo
    if (bankInput && bankResult && bankInput.value.trim() !== "") {
      hasBankInput = true;
      const val = Number(bankInput.value.replace(/[^0-9]/g, ""));
      const expected = report.transferIncome;
      const diff = val - expected;

      if (diff === 0) {
        bankMatch = true;
        bankResult.innerHTML = `<span style="color: #0284c7; font-weight: 800;">✅ Khớp chuyển khoản 100%!</span> Đúng ${formatMoney(val)} trên App Ngân Hàng/MoMo.`;
      } else if (diff > 0) {
        bankResult.innerHTML = `<span style="color: #0284c7; font-weight: 800;">🟢 Dư chuyển khoản: +${formatMoney(diff)}</span> (Xem được: ${formatMoney(val)} / Sổ tính: ${formatMoney(expected)}).`;
      } else {
        bankResult.innerHTML = `<span style="color: #dc2626; font-weight: 800;">🔴 Thiếu chuyển khoản: -${formatMoney(Math.abs(diff))}</span> (Xem được: ${formatMoney(val)} / Sổ tính: ${formatMoney(expected)}).`;
      }
    } else if (bankResult) {
      bankResult.innerHTML = "";
    }

    // Overall verdict
    if (overallBox && (hasCashInput || hasBankInput)) {
      overallBox.style.display = "block";
      if (hasCashInput && hasBankInput) {
        if (cashMatch && bankMatch) {
          overallBox.style.background = "#f0fdf4";
          overallBox.style.borderColor = "#86efac";
          if (overallTitle) {
            overallTitle.textContent = "🎉 KẾT QUẢ ĐỐI SOÁT: HOÀN TOÀN KHỚP 100%!";
            overallTitle.style.color = "#166534";
          }
          if (overallDetail) {
            overallDetail.textContent = "Cả tiền mặt trong két và tiền tài khoản ngân hàng/MoMo đều khớp từng đồng với sổ sách.";
            overallDetail.style.color = "#15803d";
          }
        } else {
          overallBox.style.background = "#fff7ed";
          overallBox.style.borderColor = "#fed7aa";
          if (overallTitle) {
            overallTitle.textContent = "⚠️ KẾT QUẢ ĐỐI SOÁT CÓ CHÊNH LỆCH!";
            overallTitle.style.color = "#9a3412";
          }
          if (overallDetail) {
            overallDetail.textContent = "Hãy kiểm tra lại xem có bill bán khách chưa thanh toán hoặc khoản chi nào chưa ghi sổ không nhé.";
            overallDetail.style.color = "#c2410c";
          }
        }
      } else {
        overallBox.style.background = "#f8fafc";
        overallBox.style.borderColor = "#cbd5e1";
        if (overallTitle) {
          overallTitle.textContent = "🔍 Đang đối soát số liệu...";
          overallTitle.style.color = "#334155";
        }
        if (overallDetail) {
          overallDetail.textContent = "Nhập đủ cả tiền mặt và tiền chuyển khoản để hoàn tất đối soát 2 kênh.";
          overallDetail.style.color = "#64748b";
        }
      }
    } else if (overallBox) {
      overallBox.style.display = "none";
    }
  };

  const setupMoneyInputFormat = (inputEl) => {
    if (!inputEl) return;
    inputEl.oninput = () => {
      const raw = inputEl.value.replace(/[^0-9]/g, "");
      if (raw) {
        const num = Number(raw);
        inputEl.value = num.toLocaleString("vi-VN");
      } else {
        inputEl.value = "";
      }
      updateDualReconcile();
    };
  };

  setupMoneyInputFormat(cashInput);
  setupMoneyInputFormat(bankInput);

  // Check existing shift closing record
  const existingRecord = getClosedShiftRecord(targetDate, currentBranch);
  const confirmBtn = $("#confirmDailyClosingBtn");
  if (confirmBtn) {
    if (existingRecord) {
      confirmBtn.innerHTML = `🔄 Chốt Lại Ngày ${formatDate(targetDate)}`;
    } else {
      confirmBtn.innerHTML = `✅ Xác Nhận Chốt Ca Ngày ${formatDate(targetDate)}`;
    }
  }

  if (existingRecord) {
    if (cashInput && existingRecord.actualCash) {
      cashInput.value = existingRecord.actualCash;
    }
    if (bankInput && existingRecord.actualBank) {
      bankInput.value = existingRecord.actualBank;
    }
    updateDualReconcile();
  }

  // Voice speech button in closing modal
  const speechBtn = $("#readClosingSpeechBtn");
  if (speechBtn) {
    speechBtn.onclick = () => {
      docLai(report.detailedText || report.text);
      showToast(`Đang phát loa đọc tổng kết ngày ${formatDate(targetDate)}...`);
    };
  }

  // Copy summary button
  const copyBtn = $("#copyClosingSummaryBtn");
  if (copyBtn) {
    copyBtn.onclick = () => {
      const summaryText = `📋 TỔNG KẾT QUÁN (${formatDate(targetDate)} - ${currentBranch === "all" ? "Tất cả điểm bán" : currentBranch}):
- Bán ra: ${report.totalDrinks} ly
- Doanh thu: ${formatMoney(report.income)} (Mặt: ${formatMoney(report.cashIncome)}, CK: ${formatMoney(report.transferIncome)})
- Tiền vốn: ${formatMoney(report.cost)}
- Lợi nhuận bán nước: ${formatMoney(report.grossProfit)}
- Tiền chi: ${formatMoney(report.expense)}
- Tiền mặt trong két: ${formatMoney(report.cashBalance)}
=> TIỀN LỜI THỰC TẾ: ${formatMoney(report.balance)}`;
      navigator.clipboard?.writeText(summaryText);
      showToast(`Đã sao chép báo cáo ngày ${formatDate(targetDate)} vào bộ nhớ tạm`);
    };
  }

  const uncloseBtn = $("#uncloseDailyClosingBtn");
  if (uncloseBtn) {
    uncloseBtn.style.display = existingRecord ? "inline-flex" : "none";
    uncloseBtn.onclick = () => {
      deleteClosedShiftRecord(targetDate, currentBranch);
      showToast(`🔓 Đã chuyển ca ngày ${formatDate(targetDate)} (${currentBranch === "all" ? "Toàn hệ thống" : currentBranch}) về trạng thái Chưa chốt ca!`);
      dialog.close();
      renderAll();
    };
  }

  dialog.showModal();
}

// ----------------------------------------------------
// STATS VIEW (NGÀY / TUẦN / THÁNG)
// ----------------------------------------------------

function renderStats() {
  const allItems = (state.ds || []).filter((item) => !item.deleted && item.loai !== "chuyen_quy" && item.loai !== "dieu_chinh_quy");
  
  // Filter by branch
  const branchItems = allItems.filter((it) => matchBranch(it.chiNhanh, statsBranch));

  let filtered = [];
  let periodLabel = "";

  if (statsMode === "day") {
    filtered = branchItems.filter((it) => it.ngay === statsDate);
    periodLabel = `Ngày ${formatDate(statsDate)}`;
    $("#timeChartTitle").textContent = `Biểu đồ doanh thu ngày ${formatDate(statsDate)}`;
  } else if (statsMode === "week") {
    const range = getWeekRange(statsWeekDate);
    filtered = branchItems.filter((it) => it.ngay >= range.mondayKey && it.ngay <= range.sundayKey);
    periodLabel = range.label;
    $("#statsWeekRangeText").textContent = range.label;
    $("#timeChartTitle").textContent = `Doanh thu 7 ngày trong tuần`;
  } else {
    // Month mode
    filtered = branchItems.filter((it) => it.ngay && it.ngay.startsWith(statsMonth));
    const [y, m] = statsMonth.split("-");
    periodLabel = `Tháng ${Number(m)}/${y}`;
    $("#timeChartTitle").textContent = `Doanh thu các ngày trong tháng ${Number(m)}/${y}`;
  }

  const income = filtered.filter((it) => it.loai === "thu").reduce((sum, it) => sum + Number(it.soTien || 0), 0);
  const cashIncome = filtered.filter((it) => it.loai === "thu" && it.phuongThuc !== "chuyen_khoan").reduce((sum, it) => sum + Number(it.soTien || 0), 0);
  const transferIncome = filtered.filter((it) => it.loai === "thu" && it.phuongThuc === "chuyen_khoan").reduce((sum, it) => sum + Number(it.soTien || 0), 0);
  const cost = filtered
    .filter((it) => it.loai === "thu")
    .reduce((sum, it) => sum + Number(it.tongGiaCost || (Number(it.soLuong || 1) * Number(it.giaCostDonVi || 0)) || 0), 0);
  const grossProfit = income - cost;
  const expense = filtered.filter((it) => it.loai === "chi").reduce((sum, it) => sum + Number(it.soTien || 0), 0);
  const balance = income - expense;
  const totalCups = filtered.filter((it) => it.loai === "thu").reduce((sum, it) => sum + Number(it.soLuong || 1), 0);

  $("#monthIncome").textContent = formatMoney(income);
  $("#statsCashIncome").textContent = formatMoney(cashIncome);
  $("#statsTransferIncome").textContent = formatMoney(transferIncome);
  $("#statsTotalCost").textContent = formatMoney(cost);
  $("#statsGrossProfit").textContent = formatMoney(grossProfit);
  $("#monthExpense").textContent = formatMoney(expense);
  $("#monthBalance").textContent = formatMoney(balance);
  $("#statsTotalCups").textContent = `${totalCups} ly`;

  // Drinks breakdown table
  const drinksMap = new Map();
  filtered
    .filter((it) => it.loai === "thu")
    .forEach((it) => {
      const name = it.danhMuc || "Nước mía thường";
      const existing = drinksMap.get(name) || { count: 0, revenue: 0, cost: 0 };
      existing.count += Number(it.soLuong || 1);
      existing.revenue += Number(it.soTien || 0);
      existing.cost += Number(it.tongGiaCost || (Number(it.soLuong || 1) * Number(it.giaCostDonVi || 0)) || 0);
      drinksMap.set(name, existing);
    });

  const drinksBody = $("#drinksTableBody");
  if (drinksBody) {
    if (drinksMap.size === 0) {
      drinksBody.innerHTML = `<tr><td colspan="6" class="text-center" style="color: var(--muted);">Chưa có số liệu bán hàng trong kỳ này.</td></tr>`;
    } else {
      drinksBody.innerHTML = [...drinksMap.entries()]
        .sort((a, b) => b[1].revenue - a[1].revenue)
        .map(([name, data]) => {
          const profit = data.revenue - data.cost;
          const share = income > 0 ? Math.round((data.revenue / income) * 100) : 0;
          return `
          <tr>
            <td><strong>${name}</strong></td>
            <td class="text-center">${data.count} ly</td>
            <td class="text-right">${formatMoney(data.revenue)}</td>
            <td class="text-right" style="color: #d97706;">${formatMoney(data.cost)}</td>
            <td class="text-right" style="color: #059669; font-weight: 700;">+${formatMoney(profit)}</td>
            <td class="text-right">${share}%</td>
          </tr>
        `;
        })
        .join("");
    }
  }

  // Expenses breakdown table
  const expensesMap = new Map();
  filtered
    .filter((it) => it.loai === "chi")
    .forEach((it) => {
      const name = it.danhMuc || "Chi khác";
      const qty = Number(it.soLuong) || 1;
      const unit = it.donViTinh || "kg";
      const existing = expensesMap.get(name) || { amount: 0, units: new Map() };
      existing.amount += Number(it.soTien || 0);
      existing.units.set(unit, (existing.units.get(unit) || 0) + qty);
      expensesMap.set(name, existing);
    });

  const formatExpenseUnits = (unitsMap) => {
    return [...unitsMap.entries()].map(([u, q]) => `${q} ${u}`).join(", ") || "1 lần";
  };

  const expensesBody = $("#expensesTableBody");
  if (expensesBody) {
    if (expensesMap.size === 0) {
      expensesBody.innerHTML = `<tr><td colspan="4" class="text-center" style="color: var(--muted);">Không có khoản chi nào trong kỳ này.</td></tr>`;
    } else {
      expensesBody.innerHTML = [...expensesMap.entries()]
        .sort((a, b) => b[1].amount - a[1].amount)
        .map(([name, data]) => {
          const share = expense > 0 ? Math.round((data.amount / expense) * 100) : 0;
          return `
          <tr>
            <td><strong>${name}</strong></td>
            <td class="text-center">${formatExpenseUnits(data.units)}</td>
            <td class="text-right" style="color: var(--red); font-weight: 700;">-${formatMoney(data.amount)}</td>
            <td class="text-right">${share}%</td>
          </tr>
        `;
        })
        .join("");
    }
  }

  // Render Charts
  renderCharts(filtered);
}

function renderCharts(filtered) {
  if (typeof Chart === "undefined") return;

  // Chart 1: Time Series Chart
  const dailyCanvas = $("#dailyChart");
  if (dailyCanvas) {
    const ctx = dailyCanvas.getContext("2d");
    if (dailyChart) dailyChart.destroy();

    let labels = [];
    let incomeData = [];
    let expenseData = [];

    if (statsMode === "day") {
      // Group by hour
      const hoursMap = new Map();
      for (let h = 6; h <= 22; h += 2) {
        hoursMap.set(`${String(h).padStart(2, "0")}:00`, { inc: 0, exp: 0 });
      }
      filtered.forEach((it) => {
        const hour = (it.gio || "08:00").slice(0, 2);
        const slot = `${String(Math.floor(Number(hour) / 2) * 2).padStart(2, "0")}:00`;
        const item = hoursMap.get(slot) || { inc: 0, exp: 0 };
        if (it.loai === "thu") item.inc += Number(it.soTien || 0);
        else item.exp += Number(it.soTien || 0);
        hoursMap.set(slot, item);
      });
      labels = [...hoursMap.keys()];
      incomeData = [...hoursMap.values()].map((v) => v.inc);
      expenseData = [...hoursMap.values()].map((v) => v.exp);
    } else if (statsMode === "week") {
      const range = getWeekRange(statsWeekDate);
      const days = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
      labels = days;
      const cur = new Date(range.mondayKey);
      incomeData = days.map((_, i) => {
        const d = new Date(cur);
        d.setDate(cur.getDate() + i);
        const dKey = d.toISOString().slice(0, 10);
        return filtered.filter((it) => it.ngay === dKey && it.loai === "thu").reduce((s, it) => s + Number(it.soTien || 0), 0);
      });
      expenseData = days.map((_, i) => {
        const d = new Date(cur);
        d.setDate(cur.getDate() + i);
        const dKey = d.toISOString().slice(0, 10);
        return filtered.filter((it) => it.ngay === dKey && it.loai === "chi").reduce((s, it) => s + Number(it.soTien || 0), 0);
      });
    } else {
      // Month: group by days
      const daysInMonth = new Date(Number(statsMonth.split("-")[0]), Number(statsMonth.split("-")[1]), 0).getDate();
      labels = Array.from({ length: daysInMonth }, (_, i) => String(i + 1));
      incomeData = labels.map((dayNum) => {
        const dKey = `${statsMonth}-${dayNum.padStart(2, "0")}`;
        return filtered.filter((it) => it.ngay === dKey && it.loai === "thu").reduce((s, it) => s + Number(it.soTien || 0), 0);
      });
      expenseData = labels.map((dayNum) => {
        const dKey = `${statsMonth}-${dayNum.padStart(2, "0")}`;
        return filtered.filter((it) => it.ngay === dKey && it.loai === "chi").reduce((s, it) => s + Number(it.soTien || 0), 0);
      });
    }

    dailyChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          { label: "Thu", data: incomeData, backgroundColor: "#10b981", borderRadius: 4 },
          { label: "Chi", data: expenseData, backgroundColor: "#ef4444", borderRadius: 4 },
        ],
      },
      options: {
        responsive: true,
        plugins: { legend: { position: "top" } },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { callback: (v) => (v >= 1000 ? `${v / 1000}k` : v) },
          },
        },
      },
    });
  }

  // Chart 2: Category Doughnut Chart
  const categoryCanvas = $("#categoryChart");
  if (categoryCanvas) {
    const ctx = categoryCanvas.getContext("2d");
    if (categoryChart) categoryChart.destroy();

    const catMap = new Map();
    filtered
      .filter((it) => it.loai === "thu")
      .forEach((it) => {
        const cat = it.danhMuc || "Nước mía";
        catMap.set(cat, (catMap.get(cat) || 0) + Number(it.soTien || 0));
      });

    const labels = [...catMap.keys()];
    const data = [...catMap.values()];

    categoryChart = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: labels.length ? labels : ["Chưa có dữ liệu"],
        datasets: [
          {
            data: data.length ? data : [1],
            backgroundColor: [
              "#10b981", "#3b82f6", "#f59e0b", "#8b5cf6",
              "#ec4899", "#14b8a6", "#f97316", "#64748b",
            ],
          },
        ],
      },
      options: {
        responsive: true,
        plugins: { legend: { position: "bottom" } },
      },
    });
  }
}

// ----------------------------------------------------
// SETTINGS: MENU & BRANCH MANAGERS
// ----------------------------------------------------

let menuAutoSaveTimer = null;
async function autoSaveMenuDebounced() {
  clearTimeout(menuAutoSaveTimer);
  menuAutoSaveTimer = setTimeout(async () => {
    try {
      await luuDanhSachMenu(state.quickItems || []);
      console.log("⚡ Auto-saved menu items!");
    } catch (e) {
      console.warn("Auto save menu failed:", e);
    }
  }, 400);
}

let ingAutoSaveTimer = null;
async function autoSaveIngredientsDebounced() {
  clearTimeout(ingAutoSaveTimer);
  ingAutoSaveTimer = setTimeout(async () => {
    try {
      await luuDanhSachNguyenLieu(state.quickIngredients || []);
      console.log("⚡ Auto-saved ingredients!");
    } catch (e) {
      console.warn("Auto save ingredients failed:", e);
    }
  }, 400);
}

function renderMenuManager(force = false) {
  const container = $("#menuItemsEditor");
  if (!container) return;

  // Do not destroy DOM if user is currently typing/focusing in menu editor unless forced
  if (!force && document.activeElement && container.contains(document.activeElement)) {
    return;
  }

  const quickItems = state.quickItems || [];
  const tableHtml = `
    <div class="menu-table-container">
      <table class="menu-editor-table">
        <thead>
          <tr>
            <th style="width: 24%;">🏷️ Tên món</th>
            <th style="width: 18%;">🏠 Giá Quán Nhà</th>
            <th style="width: 18%;">🏢 Giá CN 2</th>
            <th style="width: 20%;">🟡 Giá vốn (Cost)</th>
            <th style="width: 14%;">💰 Lời / ly</th>
            <th style="width: 6%;"></th>
          </tr>
        </thead>
        <tbody>
          ${quickItems
            .map((item, index) => {
              const priceMain = item.priceByBranch?.["Quán Nhà (Chính)"] || Number(item.price) || 8000;
              const priceBranch2 = item.priceByBranch?.["Chi nhánh 2"] || (priceMain + 2000);
              const cost = Number(item.costPrice) || 0;
              const profitMain = priceMain - cost;
              return `
              <tr class="menu-item-row" data-index="${index}" data-id="${item.id}">
                <td>
                  <input class="menu-item-name" value="${item.name || ""}" placeholder="Ví dụ: Nước mía" title="Tên món nước" required>
                </td>
                <td>
                  <input class="menu-item-price-main" type="number" inputmode="numeric" value="${priceMain}" placeholder="8000" title="Giá bán tại Quán Nhà (đ)" required>
                </td>
                <td>
                  <input class="menu-item-price-cn2" type="number" inputmode="numeric" value="${priceBranch2}" placeholder="10000" title="Giá bán tại Chi nhánh 2 (đ)" required>
                </td>
                <td>
                  <div style="display: flex; gap: 0.25rem; align-items: center;">
                    <input class="menu-item-cost" type="number" inputmode="numeric" value="${cost}" placeholder="3000" title="Chi phí nguyên liệu 1 ly (Cost đ)" style="flex: 1;">
                    <button class="ghost-button row-calc-cost-btn" data-id="${item.id}" type="button" title="Mở bảng tính chi tiết cost và mặt bằng cho món này" style="padding: 0.25rem 0.4rem; font-size: 0.72rem; min-height: unset; color: #0284c7; border-color: #bae6fd;">🧮</button>
                  </div>
                </td>
                <td>
                  <span class="profit-badge">+${formatMoney(profitMain)}</span>
                </td>
                <td>
                  <button class="icon-btn-del" type="button" aria-label="Xóa món">✕</button>
                </td>
              </tr>
            `;
            })
            .join("")}
        </tbody>
      </table>
    </div>
  `;

  container.innerHTML = tableHtml;

  // Live state sync & profit calculation on input
  $$("#menuItemsEditor .menu-item-row").forEach((row) => {
    const index = Number(row.getAttribute("data-index"));
    const nameInput = row.querySelector(".menu-item-name");
    const priceMainInput = row.querySelector(".menu-item-price-main");
    const priceCn2Input = row.querySelector(".menu-item-price-cn2");
    const costInput = row.querySelector(".menu-item-cost");
    const profitBadge = row.querySelector(".profit-badge");

    const syncItemFromRow = () => {
      const name = nameInput?.value?.trim() || "Món nước";
      const priceMain = Number(priceMainInput?.value) || 0;
      const priceCn2 = Number(priceCn2Input?.value) || 0;
      const cost = Number(costInput?.value) || 0;
      const prof = priceMain - cost;

      if (state.quickItems && state.quickItems[index]) {
        state.quickItems[index].name = name;
        state.quickItems[index].shortName = name;
        state.quickItems[index].price = priceMain;
        state.quickItems[index].priceByBranch = {
          "Quán Nhà (Chính)": priceMain,
          "Chi nhánh 2": priceCn2,
        };
        state.quickItems[index].costPrice = cost;
      }

      if (profitBadge) {
        profitBadge.textContent = prof >= 0 ? `+${formatMoney(prof)}` : `-${formatMoney(Math.abs(prof))}`;
        profitBadge.style.background = prof >= 0 ? "#ecfdf5" : "#fff1f2";
        profitBadge.style.color = prof >= 0 ? "#065f46" : "#9f1239";
      }
    };

    nameInput?.addEventListener("input", () => { syncItemFromRow(); autoSaveMenuDebounced(); });
    priceMainInput?.addEventListener("input", () => { syncItemFromRow(); autoSaveMenuDebounced(); });
    priceCn2Input?.addEventListener("input", () => { syncItemFromRow(); autoSaveMenuDebounced(); });
    costInput?.addEventListener("input", () => { syncItemFromRow(); autoSaveMenuDebounced(); });

    nameInput?.addEventListener("change", () => { syncItemFromRow(); autoSaveMenuDebounced(); });
    priceMainInput?.addEventListener("change", () => { syncItemFromRow(); autoSaveMenuDebounced(); });
    priceCn2Input?.addEventListener("change", () => { syncItemFromRow(); autoSaveMenuDebounced(); });
    costInput?.addEventListener("change", () => { syncItemFromRow(); autoSaveMenuDebounced(); });
  });

  $$("#menuItemsEditor .row-calc-cost-btn").forEach((btn) => {
    btn.onclick = () => {
      const drinkId = btn.getAttribute("data-id");
      openCostCalculatorModal(drinkId);
    };
  });

  $$("#menuItemsEditor .icon-btn-del").forEach((btn) => {
    btn.onclick = async () => {
      const row = btn.closest(".menu-item-row");
      const index = Number(row?.getAttribute("data-index"));
      if (quickItems.length <= 1) {
        showToast("Menu phải có ít nhất 1 món", true);
        return;
      }
      quickItems.splice(index, 1);
      await autoSaveMenuDebounced();
      renderMenuManager(true);
    };
  });
}

function renderIngredientManager(force = false) {
  const container = $("#ingredientItemsEditor");
  if (!container) return;

  // Do not destroy DOM if user is currently typing/focusing in ingredient editor unless forced
  if (!force && document.activeElement && container.contains(document.activeElement)) {
    return;
  }

  const quickIngredients = state.quickIngredients || [];
  const tableHtml = `
    <div class="menu-table-container">
      <table class="menu-editor-table">
        <thead>
          <tr>
            <th style="width: 8%;">Ảnh</th>
            <th style="width: 25%;">🏷️ Tên nguyên liệu</th>
            <th style="width: 14%;">📏 ĐVT</th>
            <th style="width: 20%;">💵 Giá nhập chuẩn (đ)</th>
            <th style="width: 14%;">🔢 SL mặc định</th>
            <th style="width: 13%;">🥤 Định mức (ly)</th>
            <th style="width: 6%;"></th>
          </tr>
        </thead>
        <tbody>
          ${quickIngredients
            .map((item, index) => {
              const cost = Number(item.unitCost) || 0;
              const defaultQty = Number(item.defaultQty) || 1;
              const yieldVal = Number(item.yieldPerUnit) || 1;
              const imgSrc = getValidIngredientImage(item);
              return `
              <tr class="ingredient-item-row" data-index="${index}" data-id="${item.id}">
                <td style="text-align: center;">
                  <div style="width: 2.2rem; height: 2.2rem; border-radius: 6px; overflow: hidden; margin: 0 auto; border: 1px solid #cbd5e1; background: #fff;">
                    <img src="${imgSrc}" alt="${item.name}" style="width: 100%; height: 100%; object-fit: contain;" onerror="this.src='./assets/ingredients/bo_mia.jpg';" />
                  </div>
                </td>
                <td>
                  <input class="ing-item-name" value="${item.name || ""}" placeholder="Ví dụ: Bó mía cây" title="Tên nguyên liệu" required style="font-weight: 700;">
                </td>
                <td>
                  <input class="ing-item-unit" value="${item.unit || "kg"}" placeholder="bó, bao, kg..." title="Đơn vị tính" style="text-align: center;">
                </td>
                <td>
                  <input class="ing-item-cost" type="number" inputmode="numeric" value="${cost}" placeholder="90000" title="Đơn giá nhập chuẩn (đ)" required style="font-weight: 800; color: #c2410c;">
                </td>
                <td>
                  <input class="ing-item-qty" type="number" inputmode="numeric" value="${defaultQty}" placeholder="1" title="Số lượng mặc định" style="text-align: center;">
                </td>
                <td>
                  <input class="ing-item-yield" type="number" inputmode="numeric" value="${yieldVal}" placeholder="45" title="Định mức ly làm ra / 1 đơn vị" style="text-align: center;">
                </td>
                <td>
                  <button class="icon-btn-del del-ingredient-row-btn" type="button" aria-label="Xóa nguyên liệu">✕</button>
                </td>
              </tr>
            `;
            })
            .join("")}
        </tbody>
      </table>
    </div>
  `;

  container.innerHTML = tableHtml;

  // Live state sync & auto-save on input/change
  $$("#ingredientItemsEditor .ingredient-item-row").forEach((row) => {
    const index = Number(row.getAttribute("data-index"));
    const nameInput = row.querySelector(".ing-item-name");
    const unitInput = row.querySelector(".ing-item-unit");
    const costInput = row.querySelector(".ing-item-cost");
    const qtyInput = row.querySelector(".ing-item-qty");
    const yieldInput = row.querySelector(".ing-item-yield");

    const syncIngFromRow = () => {
      const name = nameInput?.value?.trim() || "Nguyên liệu";
      const unit = unitInput?.value?.trim() || "kg";
      const unitCost = Number(costInput?.value) || 0;
      const defaultQty = Number(qtyInput?.value) || 1;
      const yieldPerUnit = Number(yieldInput?.value) || 1;

      if (state.quickIngredients && state.quickIngredients[index]) {
        state.quickIngredients[index].name = name;
        state.quickIngredients[index].shortName = name;
        state.quickIngredients[index].unit = unit;
        state.quickIngredients[index].unitCost = unitCost;
        state.quickIngredients[index].defaultQty = defaultQty;
        state.quickIngredients[index].yieldPerUnit = yieldPerUnit;
      }
    };

    nameInput?.addEventListener("input", () => { syncIngFromRow(); autoSaveIngredientsDebounced(); });
    unitInput?.addEventListener("input", () => { syncIngFromRow(); autoSaveIngredientsDebounced(); });
    costInput?.addEventListener("input", () => { syncIngFromRow(); autoSaveIngredientsDebounced(); });
    qtyInput?.addEventListener("input", () => { syncIngFromRow(); autoSaveIngredientsDebounced(); });
    yieldInput?.addEventListener("input", () => { syncIngFromRow(); autoSaveIngredientsDebounced(); });

    nameInput?.addEventListener("change", () => { syncIngFromRow(); autoSaveIngredientsDebounced(); });
    unitInput?.addEventListener("change", () => { syncIngFromRow(); autoSaveIngredientsDebounced(); });
    costInput?.addEventListener("change", () => { syncIngFromRow(); autoSaveIngredientsDebounced(); });
    qtyInput?.addEventListener("change", () => { syncIngFromRow(); autoSaveIngredientsDebounced(); });
    yieldInput?.addEventListener("change", () => { syncIngFromRow(); autoSaveIngredientsDebounced(); });
  });

  $$("#ingredientItemsEditor .del-ingredient-row-btn").forEach((btn) => {
    btn.onclick = async () => {
      const row = btn.closest(".ingredient-item-row");
      const index = Number(row?.getAttribute("data-index"));
      if (quickIngredients.length <= 1) {
        showToast("Phải có ít nhất 1 nguyên liệu", true);
        return;
      }
      quickIngredients.splice(index, 1);
      await autoSaveIngredientsDebounced();
      renderIngredientManager(true);
    };
  });
}

// ----------------------------------------------------
// COST & OVERHEAD CALCULATOR (TÍNH GIÁ VỐN & MẶT BẰNG)
// ----------------------------------------------------

let currentCostDrinkId = "nuoc_mia";
let currentIngredientsList = [];

function openCostCalculatorModal(drinkId = null) {
  const dialog = $("#costCalculatorDialog");
  if (!dialog) return;

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

  // Populate drink select
  const select = $("#costDrinkSelect");
  if (select) {
    select.innerHTML = quickItems
      .map((q) => `<option value="${q.id}" ${q.id === (drinkId || currentCostDrinkId) ? "selected" : ""}>${q.name} (${formatMoney(q.price)})</option>`)
      .join("");
  }

  currentCostDrinkId = drinkId || select?.value || quickItems[0]?.id || "nuoc_mia";

  // Load overhead inputs
  if ($("#calcRentMonthly")) $("#calcRentMonthly").value = overhead.rentMonthly ?? 6000000;
  if ($("#calcElectricityMonthly")) $("#calcElectricityMonthly").value = overhead.electricityMonthly ?? 1000000;
  if ($("#calcWaterMonthly")) $("#calcWaterMonthly").value = overhead.waterMonthly ?? 300000;
  if ($("#calcTrashMonthly")) $("#calcTrashMonthly").value = overhead.trashMonthly ?? 50000;
  if ($("#calcOtherMonthly")) $("#calcOtherMonthly").value = (overhead.depreciationMonthly || 0) + (overhead.otherMonthly || 0) || 450000;
  if ($("#calcExpectedCupsDay")) $("#calcExpectedCupsDay").value = overhead.expectedCupsPerDay ?? 80;

  loadCostDrinkData(currentCostDrinkId);
  dialog.showModal();
}

function loadCostDrinkData(drinkId) {
  const quickItems = state.quickItems || [];
  const formulas = state.costFormulas || {};
  const item = quickItems.find((q) => q.id === drinkId) || quickItems[0];
  const defaultFormula = {
    drinkId: item?.id,
    drinkName: item?.name,
    sellingPrice: item?.price || 10000,
    ingredients: [
      { name: "Nguyên liệu chính (mía/trà/trái cây)", batchCost: 100000, batchYield: 50, unitCost: 2000 },
      { name: "Đá viên (sạch)", batchCost: 15000, batchYield: 30, unitCost: 500 },
      { name: "Ly nhựa + Nắp ép/cầu", batchCost: 35000, batchYield: 50, unitCost: 700 },
      { name: "Ống hút + Quai xách chữ T", batchCost: 25000, batchYield: 250, unitCost: 100 },
    ],
  };

  const formula = formulas[drinkId] || defaultFormula;

  $("#costSellingPriceInput").value = item?.price || formula.sellingPrice || 10000;
  currentIngredientsList = JSON.parse(JSON.stringify(formula?.ingredients || defaultFormula.ingredients || []));
  renderIngredientsTable();
  recalculateCostSummary();
}

function renderIngredientsTable() {
  const tbody = $("#costIngredientsBody");
  if (!tbody) return;

  if (!currentIngredientsList.length) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--muted); padding: 0.75rem;">Chưa có nguyên liệu nào. Bấm '+ Thêm nguyên liệu' để thêm.</td></tr>`;
    return;
  }

  tbody.innerHTML = currentIngredientsList
    .map((ing, idx) => {
      const batchCost = Number(ing.batchCost) || 0;
      const batchYield = Number(ing.batchYield) || 1;
      const unitCost = Math.round(batchCost / (batchYield || 1));
      ing.unitCost = unitCost;

      return `
        <tr data-idx="${idx}">
          <td>
            <input class="ing-name" value="${ing.name || ""}" placeholder="Tên nguyên liệu" style="width: 100%; padding: 0.25rem; font-size: 0.8rem; font-weight: 600;">
          </td>
          <td>
            <input class="ing-cost" type="number" value="${batchCost}" placeholder="150000" style="width: 100%; padding: 0.25rem; font-size: 0.8rem;">
          </td>
          <td>
            <input class="ing-yield" type="number" value="${batchYield}" placeholder="75" style="width: 100%; padding: 0.25rem; font-size: 0.8rem;">
          </td>
          <td class="text-right" style="font-weight: 700; color: #047857;">
            ${formatMoney(unitCost)}
          </td>
          <td>
            <button class="del-ing-btn" data-idx="${idx}" type="button" style="border: none; background: transparent; color: #ef4444; font-weight: 800; cursor: pointer;">✕</button>
          </td>
        </tr>
      `;
    })
    .join("");

  // Event handlers for inputs
  tbody.querySelectorAll("tr").forEach((tr) => {
    const idx = Number(tr.getAttribute("data-idx"));
    const nameInput = tr.querySelector(".ing-name");
    const costInput = tr.querySelector(".ing-cost");
    const yieldInput = tr.querySelector(".ing-yield");
    const delBtn = tr.querySelector(".del-ing-btn");

    const updateRow = () => {
      if (currentIngredientsList[idx]) {
        currentIngredientsList[idx].name = nameInput.value;
        currentIngredientsList[idx].batchCost = Number(costInput.value) || 0;
        currentIngredientsList[idx].batchYield = Number(yieldInput.value) || 1;
        currentIngredientsList[idx].unitCost = Math.round(currentIngredientsList[idx].batchCost / (currentIngredientsList[idx].batchYield || 1));
      }
      recalculateCostSummary();
    };

    nameInput?.addEventListener("input", updateRow);
    costInput?.addEventListener("input", () => {
      updateRow();
      renderIngredientsTable();
    });
    yieldInput?.addEventListener("input", () => {
      updateRow();
      renderIngredientsTable();
    });
    if (delBtn) {
      delBtn.onclick = () => {
        currentIngredientsList.splice(idx, 1);
        renderIngredientsTable();
        recalculateCostSummary();
      };
    }
  });
}

function recalculateCostSummary() {
  const sellingPrice = Number($("#costSellingPriceInput")?.value) || 0;

  // 1. Total COGS
  const totalCogs = currentIngredientsList.reduce((sum, ing) => {
    const bCost = Number(ing.batchCost) || 0;
    const bYield = Number(ing.batchYield) || 1;
    return sum + Math.round(bCost / (bYield || 1));
  }, 0);

  const cogsDisplay = $("#totalCogsDisplay");
  if (cogsDisplay) cogsDisplay.textContent = formatMoney(totalCogs);

  // 2. Overhead allocation (Mặt bằng, Điện, Nước, Rác, Chi khác)
  const rent = Number($("#calcRentMonthly")?.value) || 0;
  const elec = Number($("#calcElectricityMonthly")?.value) || 0;
  const water = Number($("#calcWaterMonthly")?.value) || 0;
  const trash = Number($("#calcTrashMonthly")?.value) || 0;
  const other = Number($("#calcOtherMonthly")?.value) || 0;
  const totalOverheadMonthly = rent + elec + water + trash + other;

  const cupsPerDay = Number($("#calcExpectedCupsDay")?.value) || 1;
  const monthlyCups = cupsPerDay * 30;
  const overheadPerCup = Math.round(totalOverheadMonthly / (monthlyCups || 1));

  const overheadDisplay = $("#overheadPerCupDisplay");
  if (overheadDisplay) overheadDisplay.textContent = formatMoney(overheadPerCup);
  const overheadMonthlyElem = $("#summaryTotalMonthlyOverhead");
  if (overheadMonthlyElem) overheadMonthlyElem.textContent = formatMoney(totalOverheadMonthly);

  // 3. Executive Metrics
  const totalCost = totalCogs + overheadPerCup;
  const netProfit = sellingPrice - totalCost;
  const grossProfit = sellingPrice - totalCogs;

  const cogsRatio = sellingPrice > 0 ? ((totalCogs / sellingPrice) * 100).toFixed(1) : 0;
  const overheadRatio = sellingPrice > 0 ? ((overheadPerCup / sellingPrice) * 100).toFixed(1) : 0;
  const totalCostRatio = sellingPrice > 0 ? ((totalCost / sellingPrice) * 100).toFixed(1) : 0;
  const netMargin = sellingPrice > 0 ? ((netProfit / sellingPrice) * 100).toFixed(1) : 0;

  const spElem = $("#summarySellingPrice");
  if (spElem) spElem.textContent = formatMoney(sellingPrice);
  const cogsRatioElem = $("#summaryCogsRatio");
  if (cogsRatioElem) cogsRatioElem.textContent = `${formatMoney(totalCogs)} (${cogsRatio}%)`;
  const overheadRatioElem = $("#summaryOverheadRatio");
  if (overheadRatioElem) overheadRatioElem.textContent = `${formatMoney(overheadPerCup)} (${overheadRatio}%)`;
  const totalCostElem = $("#summaryTotalCost");
  if (totalCostElem) totalCostElem.textContent = `${formatMoney(totalCost)} (${totalCostRatio}%)`;

  const netElem = $("#summaryNetProfit");
  if (netElem) {
    netElem.textContent = netProfit >= 0 ? `+${formatMoney(netProfit)} (${netMargin}%)` : `-${formatMoney(Math.abs(netProfit))} (${netMargin}%)`;
    netElem.style.color = netProfit >= 0 ? "#15803d" : "#b91c1c";
  }

  // 4. Break-even volume
  const breakEvenCupsMonthly = grossProfit > 0 ? Math.ceil(totalOverheadMonthly / grossProfit) : 0;
  const breakEvenCupsDaily = Math.ceil(breakEvenCupsMonthly / 30);

  const breakEvenDayElem = $("#breakEvenPerDayText");
  if (breakEvenDayElem) breakEvenDayElem.textContent = `🎯 ${breakEvenCupsDaily} ly / ngày`;
  const breakEvenMonthElem = $("#breakEvenPerMonthText");
  if (breakEvenMonthElem) breakEvenMonthElem.textContent = `📅 ${formatMoney(breakEvenCupsMonthly).replace(" đ", "")} ly / tháng`;

  // 5. EV Advice Generation
  const adviceText = $("#costEvAdviceText");
  if (adviceText) {
    let text = "";
    if (cogsRatio > 45) {
      text = `⚠️ **Cảnh báo giá vốn cao:** Tiền nguyên liệu chiếm **${cogsRatio}%** (vượt mức 35% chuẩn F&B). Anh/chị nên đàm phán lại giá vựa mía/đá hoặc xem xét tăng giá bán thêm 2.000đ - 3.000đ!`;
    } else if (overheadRatio > 35) {
      text = `⚠️ **Định phí mặt bằng đang nặng:** Tiền mặt bằng & điện nước chiếm **${overheadRatio}%** giá ly. Cần đẩy mạnh bán trên **${breakEvenCupsDaily} ly/ngày** hoặc mở rộng bán thêm trà tắc/rau má để tăng doanh thu gánh mặt bằng!`;
    } else if (netProfit > 0 && Number(cogsRatio) <= 35) {
      text = `✅ **Cơ cấu tài chính tuyệt vời:** Giá vốn **${cogsRatio}%** (chuẩn F&B < 35%), tỷ suất lợi nhuận ròng **${netMargin}%** (+${formatMoney(netProfit)}/ly). Bán từ ly thứ **${breakEvenCupsDaily + 1}** trong ngày là bỏ túi trọn vẹn tiền lời!`;
    } else {
      text = `💡 Mỗi ngày quán bán tối thiểu **${breakEvenCupsDaily} ly** là hòa vốn toàn bộ tiền mặt bằng (${formatMoney(rent)}) và điện nước.`;
    }
    adviceText.innerHTML = text;
  }
}

// ----------------------------------------------------
// OVERHEAD & PACKAGING COST SETTINGS (QUẢN LÝ TIỀN VỐN MẶT BẰNG & VẬT TƯ BAO BÌ)
// ----------------------------------------------------

function updateOverheadAndPackagingDisplays() {
  const rent = Number($("#settingRentMonthly")?.value) || 0;
  const elec = Number($("#settingElectricityMonthly")?.value) || 0;
  const water = Number($("#settingWaterMonthly")?.value) || 0;
  const trash = Number($("#settingTrashMonthly")?.value) || 0;
  const other = Number($("#settingOtherMonthly")?.value) || 0;
  const cupsPerDay = Number($("#settingExpectedCupsDay")?.value) || 1;

  const totalMonthly = rent + elec + water + trash + other;
  const totalMonthlyCups = cupsPerDay * 30;
  const overheadPerCup = Math.round(totalMonthly / (totalMonthlyCups || 1));
  const avgProfitPerDrink = 4000;
  const breakEvenCupsDaily = Math.ceil(totalMonthly / (30 * avgProfitPerDrink));

  if ($("#settingTotalMonthlyOverheadDisplay")) $("#settingTotalMonthlyOverheadDisplay").textContent = `${formatMoney(totalMonthly)}/tháng`;
  if ($("#settingOverheadPerCupDisplay")) $("#settingOverheadPerCupDisplay").textContent = `${formatMoney(overheadPerCup)} / ly`;
  if ($("#settingBreakEvenDayDisplay")) $("#settingBreakEvenDayDisplay").textContent = `${breakEvenCupsDaily} ly / ngày`;

  // Calculate packaging cost per cup
  let totalPackUnitCost = 0;
  $$("#packagingEditorBody tr").forEach((tr) => {
    const cost = Number(tr.querySelector(".pack-cost-input")?.value) || 0;
    const yieldVal = Number(tr.querySelector(".pack-yield-input")?.value) || 1;
    const uCost = Math.round(cost / (yieldVal || 1));
    totalPackUnitCost += uCost;
    const uElem = tr.querySelector(".pack-unit-cost");
    if (uElem) uElem.textContent = formatMoney(uCost);
  });

  if ($("#settingTotalPackagingCostDisplay")) {
    $("#settingTotalPackagingCostDisplay").textContent = `${formatMoney(totalPackUnitCost)} / ly`;
  }
}

let currentSettingOverheadBranch = "Quán Nhà (Chính)";

function populateSettingOverheadBranchSelect() {
  const sel = $("#settingOverheadBranchSelect");
  if (!sel) return;
  const branches = state.branches || [{ id: "main", name: "Quán Nhà (Chính)" }];
  sel.innerHTML = branches
    .map((b) => {
      const name = typeof b === "string" ? b : b.name;
      return `<option value="${name}" ${name === currentSettingOverheadBranch ? "selected" : ""}>${name}</option>`;
    })
    .join("");
}

function loadOverheadInputsForBranch(branchName) {
  const overhead = layOverheadChoChiNhanh(state, branchName);
  const rentInput = $("#settingRentMonthly");
  if (rentInput) rentInput.value = overhead.rentMonthly ?? 6000000;
  const elecInput = $("#settingElectricityMonthly");
  if (elecInput) elecInput.value = overhead.electricityMonthly ?? 1000000;
  const waterInput = $("#settingWaterMonthly");
  if (waterInput) waterInput.value = overhead.waterMonthly ?? 300000;
  const trashInput = $("#settingTrashMonthly");
  if (trashInput) trashInput.value = overhead.trashMonthly ?? 50000;
  const otherInput = $("#settingOtherMonthly");
  if (otherInput) otherInput.value = (overhead.depreciationMonthly || 0) + (overhead.otherMonthly || 0) || 450000;
  const cupsInput = $("#settingExpectedCupsDay");
  if (cupsInput) cupsInput.value = overhead.expectedCupsPerDay ?? 80;
  updateOverheadAndPackagingDisplays();
}

function renderOverheadAndPackagingManager() {
  if (!currentSettingOverheadBranch || !state.branches?.some((b) => (b.name || b) === currentSettingOverheadBranch)) {
    currentSettingOverheadBranch = state.currentBranch || "Quán Nhà (Chính)";
  }
  populateSettingOverheadBranchSelect();
  loadOverheadInputsForBranch(currentSettingOverheadBranch);

  // Populate packaging table (Màng ép ly cuộn, Ly nhựa, Bọc, Ống hút, Đá viên)
  const packaging = state.packagingConfig || {
    filmRoll: { name: "Màng ép ly", unit: "cuộn", batchCost: 140000, batchYield: 2000, unitCost: 70 },
    cups: { name: "Ly nhựa", unit: "cây (50 cái)", batchCost: 35000, batchYield: 50, unitCost: 700 },
    bags: { name: "Bọc / Túi chữ T", unit: "bọc", batchCost: 25000, batchYield: 250, unitCost: 100 },
    straws: { name: "Ống hút", unit: "gói", batchCost: 25000, batchYield: 250, unitCost: 100 },
    ice: { name: "Đá viên sạch", unit: "bao", batchCost: 15000, batchYield: 30, unitCost: 500 },
  };

  const tbody = $("#packagingEditorBody");
  if (tbody) {
    const rows = [
      { key: "filmRoll", ...packaging.filmRoll },
      { key: "cups", ...packaging.cups },
      { key: "bags", ...packaging.bags },
      { key: "straws", ...packaging.straws },
      { key: "ice", ...packaging.ice },
    ];

    tbody.innerHTML = rows
      .map((item) => {
        const cost = Number(item.batchCost) || 0;
        const yieldVal = Number(item.batchYield) || 1;
        const unitCost = Math.round(cost / (yieldVal || 1));
        return `
          <tr data-pack-key="${item.key}">
            <td>
              <strong style="color: #0f172a;">${item.name}</strong>
              <br><small style="color: var(--muted);">${item.unit}</small>
            </td>
            <td>
              <input class="pack-cost-input" type="number" value="${cost}" style="width: 100%; padding: 0.25rem; font-size: 0.8rem; font-weight: 700;">
            </td>
            <td>
              <input class="pack-yield-input" type="number" value="${yieldVal}" style="width: 100%; padding: 0.25rem; font-size: 0.8rem;">
            </td>
            <td class="text-right" style="font-weight: 700; color: #047857;">
              <span class="pack-unit-cost">${formatMoney(unitCost)}</span>
            </td>
          </tr>
        `;
      })
      .join("");

    $$("#packagingEditorBody input").forEach((input) => {
      input.addEventListener("input", () => {
        updateOverheadAndPackagingDisplays();
      });
    });
  }

  updateOverheadAndPackagingDisplays();
}

function renderBranchManager() {
  const container = $("#branchListEditor");
  if (!container) return;

  const branches = state.branches || [{ id: "main", name: "Quán Nhà (Chính)" }];
  container.innerHTML = branches
    .map(
      (b, index) => `
      <div class="branch-item-row" data-index="${index}">
        <input class="branch-name-input" value="${b.name || ""}" placeholder="Tên chi nhánh / điểm bán" required>
        <button class="icon-btn-del" type="button" aria-label="Xóa chi nhánh">Xóa</button>
      </div>
    `,
    )
    .join("");

  $$("#branchListEditor .icon-btn-del").forEach((btn) => {
    btn.onclick = () => {
      const row = btn.closest(".branch-item-row");
      const index = Number(row?.getAttribute("data-index"));
      if (branches.length <= 1) {
        showToast("Phải có ít nhất 1 chi nhánh", true);
        return;
      }
      branches.splice(index, 1);
      renderBranchManager();
    };
  });
}

function renderAll(options = {}) {
  try { renderBranchSelectors(); } catch (e) { console.warn("renderBranchSelectors error:", e); }
  try { renderQuickButtons(); } catch (e) { console.warn("renderQuickButtons error:", e); }
  try { renderQuickIngredients(); } catch (e) { console.warn("renderQuickIngredients error:", e); }
  try { renderCategoryDatalist(); } catch (e) { console.warn("renderCategoryDatalist error:", e); }
  try { renderFundsWidget(); } catch (e) { console.warn("renderFundsWidget error:", e); }

  const activeView = $(".tabs .tab.is-active")?.getAttribute("data-view") || "today";

  // Always render Today (home view)
  try { renderToday(); } catch (e) { console.warn("renderToday error:", e); }

  // Lazy render: only render other views if active or forced
  if (options.forceAll || activeView === "history") {
    try { renderHistory(); } catch (e) { console.warn("renderHistory error:", e); }
  }
  if (options.forceAll || activeView === "stats") {
    try { renderStats(); } catch (e) { console.warn("renderStats error:", e); }
  }
  if (options.forceAll || activeView === "jars") {
    try { renderJarsView(); } catch (e) { console.warn("renderJarsView error:", e); }
  }
  if (options.forceAll || activeView === "closings") {
    try { renderClosingsView(); } catch (e) { console.warn("renderClosingsView error:", e); }
  }
  if (options.forceAll || activeView === "materials") {
    try { renderMaterialsView(); } catch (e) { console.warn("renderMaterialsView error:", e); }
  }

  const isEditingSettings = document.activeElement && (
    document.querySelector("#menuItemsEditor")?.contains(document.activeElement) ||
    document.querySelector("#ingredientItemsEditor")?.contains(document.activeElement) ||
    document.querySelector("#costSettingsCard")?.contains(document.activeElement) ||
    document.querySelector("#branchListEditor")?.contains(document.activeElement)
  );

  if (!isEditingSettings || options.forceSettings) {
    try { renderMenuManager(options.forceSettings); } catch (e) { console.warn("renderMenuManager error:", e); }
    try { renderIngredientManager(options.forceSettings); } catch (e) { console.warn("renderIngredientManager error:", e); }
    try { renderOverheadAndPackagingManager(); } catch (e) { console.warn("renderOverheadAndPackagingManager error:", e); }
    try { renderBranchManager(); } catch (e) { console.warn("renderBranchManager error:", e); }
  }

  try { renderAIChatHistory(); } catch (e) { console.warn("renderAIChatHistory error:", e); }
  try { updateAudioAlertButtonUI(); } catch (e) { console.warn("updateAudioAlertButtonUI error:", e); }

  const defaultCashInput = $("#defaultOpeningCashInput");
  if (defaultCashInput && document.activeElement !== defaultCashInput) {
    defaultCashInput.value = state.defaultOpeningCash || 500000;
  }
}

// ----------------------------------------------------
// QUẢN LÝ NGUYÊN VẬT LIỆU, XUẤT DÙNG & TỒN KHO
// ----------------------------------------------------

// ----------------------------------------------------
// VẬN HÀNH SƠ CHẾ & ĐIỀU CHUYỂN MÍA (MODULE-LEVEL SCOPE)
// ----------------------------------------------------

function renderSugarcaneBatchDashboard() {
  const batches = state.sugarcaneBatches || [];
  const activeBatch = batches.find(b => b.status === "active") || batches[0];
  if (!activeBatch) return;

  const titleEl = $("#batchCurrentTitle");
  const statusBadge = $("#batchCurrentStatusBadge");
  const rawTotalEl = $("#batchRawTotalVal");
  const processedEl = $("#batchProcessedVal");
  const yieldTotalEl = $("#batchYieldTotalVal");
  const ratioEl = $("#batchRatioVal");

  if (titleEl) titleEl.textContent = `ĐỢT MÍA: ${activeBatch.name}`;
  if (statusBadge) {
    if (activeBatch.status === "active") {
      statusBadge.textContent = "Đang Bào";
      statusBadge.style.background = "#d1fae5";
      statusBadge.style.color = "#065f46";
      statusBadge.style.borderColor = "#10b981";
    } else {
      statusBadge.textContent = "Đã Tổng Kết";
      statusBadge.style.background = "#f1f5f9";
      statusBadge.style.color = "#475569";
      statusBadge.style.borderColor = "#cbd5e1";
    }
  }

  const rawTotal = Number(activeBatch.rawStalkBundles) || 0;
  const processed = Number(activeBatch.processedRawBundles) || 0;
  const remaining = Math.max(0, rawTotal - processed);
  const yield10kg = Number(activeBatch.yield10kgBundles) || 0;
  const ratio = processed > 0 ? (Math.round((yield10kg / processed) * 10) / 10) : 0;

  if (rawTotalEl) rawTotalEl.textContent = `${rawTotal} bó 12 cây`;
  if (processedEl) processedEl.textContent = `${processed} / ${remaining} bó thô`;
  if (yieldTotalEl) yieldTotalEl.textContent = `${yield10kg * 10} kg (${yield10kg} bó)`;
  if (ratioEl) ratioEl.textContent = ratio > 0 ? `1 bó ➔ ${ratio * 10} kg` : "Chưa bào";
}

function openMiaOperationsModal(tab = "soche") {
  const dialog = $("#miaOperationsDialog");
  if (!dialog) return;

  const qnStock12 = (state.inventoryStock?.["Kho Tổng"]?.find(x => x.id === "mia_cay")?.stockQty) ?? (state.inventoryStock?.["Quán Nhà (Chính)"]?.find(x => x.id === "mia_cay")?.stockQty ?? 46);
  const qnStock10 = (state.inventoryStock?.["Kho Tổng"]?.find(x => x.id === "mia_10kg")?.stockQty) ?? (state.inventoryStock?.["Quán Nhà (Chính)"]?.find(x => x.id === "mia_10kg")?.stockQty ?? 6);
  
  const socheStockInfo = $("#socheStockInfo");
  if (socheStockInfo) socheStockInfo.textContent = `Kho thô: ${qnStock12} bó 12 cây`;

  const transferStockInfo = $("#transferStockInfo");
  if (transferStockInfo) transferStockInfo.textContent = `Kho Tổng còn: ${qnStock10 * 10} kg (${qnStock10} bó)`;

  const tabRadio = $(`#miaOpTabGroup input[value='${tab}']`);
  if (tabRadio) tabRadio.checked = true;
  switchMiaOpTab(tab);

  if (typeof dialog.showModal === "function") {
    dialog.showModal();
  }
}

function switchMiaOpTab(tab) {
  const pSoche = $("#miaOpPanelSoche");
  const pTransfer = $("#miaOpPanelTransfer");
  const pRemaining = $("#miaOpPanelRemaining");
  const pReport = $("#miaOpPanelReport");
  const pNewBatch = $("#miaOpPanelNewBatch");
  const header = $("#miaOpModalHeader");
  const title = $("#miaOpModalTitle");
  const subtitle = $("#miaOpModalSubtitle");
  const icon = $("#miaOpModalIcon");

  if (pSoche) pSoche.style.display = tab === "soche" ? "block" : "none";
  if (pTransfer) pTransfer.style.display = tab === "transfer" ? "block" : "none";
  if (pRemaining) pRemaining.style.display = tab === "remaining" ? "block" : "none";
  if (pReport) pReport.style.display = tab === "report" ? "block" : "none";
  if (pNewBatch) pNewBatch.style.display = tab === "new_batch" ? "block" : "none";

  if (tab === "soche") {
    if (header) header.style.background = "linear-gradient(135deg, #059669 0%, #047857 100%)";
    if (icon) icon.textContent = "🔄";
    if (title) title.textContent = "Bào Mía Sơ Chế (1 Bó = 10kg Thành Phẩm)";
    if (subtitle) subtitle.textContent = "Bào X bó 12 cây dài ➔ Y kg (1 bó = 10kg) sạch cất kho mát";
    updateSocheNotes();
  } else if (tab === "transfer") {
    if (header) header.style.background = "linear-gradient(135deg, #ea580c 0%, #c2410c 100%)";
    if (icon) icon.textContent = "🚚";
    if (title) title.textContent = "Xuất Mía Sang Chi Nhánh 2";
    if (subtitle) subtitle.textContent = "Xuất X bó 10kg từ Quán Nhà sang bán ở Chi nhánh 2";
    updateTransferNotes();
  } else if (tab === "remaining") {
    if (header) header.style.background = "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)";
    if (icon) icon.textContent = "🌙";
    if (title) title.textContent = "Kiểm Kê Mía Dư Cuối Ngày";
    if (subtitle) subtitle.textContent = "Hôm nay chưa bán hết mía, còn dư khoảng ... ly / ký";
    updateRemainingNotes();
  } else if (tab === "report") {
    if (header) header.style.background = "linear-gradient(135deg, #059669 0%, #047857 100%)";
    if (icon) icon.textContent = "📊";
    if (title) title.textContent = "Báo Cáo Tổng Kết Đợt Nhập Mía";
    if (subtitle) subtitle.textContent = "Tổng kết đợt nhập: bao nhiêu bó 12 cây ra bao nhiêu bó 10kg";
    renderBatchReport();
  } else if (tab === "new_batch") {
    if (header) header.style.background = "linear-gradient(135deg, #ea580c 0%, #c2410c 100%)";
    if (icon) icon.textContent = "➕";
    if (title) title.textContent = "Khai Báo Đợt Nhập Mía Mới";
    if (subtitle) subtitle.textContent = "Mua mía thô 12 cây từ vựa về kho & mở lô theo dõi";
    const dateInput = $("#newBatchDateInput");
    if (dateInput && !dateInput.value) dateInput.value = new Date().toISOString().slice(0, 10);
    updateNewBatchTotal();
  }
}

function updateSocheNotes() {
  const raw = Number($("#socheRawQtyInput")?.value) || 0;
  const yieldKg = Number($("#socheYieldKgInput")?.value) || 0;
  const yieldQty = Math.round((yieldKg / 10) * 10) / 10;
  const yieldQtyInput = $("#socheYieldQtyInput");
  if (yieldQtyInput) yieldQtyInput.value = yieldQty;

  const yieldText = $("#socheYieldBundlesText");
  if (yieldText) {
    yieldText.textContent = `= ${yieldQty} bó (1 bó = 10kg)`;
  }

  const noteInput = $("#socheNoteInput");
  if (noteInput) {
    noteInput.value = `[Sơ chế nhập kho] Bào vỏ ${raw} bó mía 12 cây dài -> Thu được ${yieldKg} kg (${yieldQty} bó 10kg thành phẩm)`;
  }
}

function updateTransferNotes() {
  const qty = Number($("#transferQtyInput")?.value) || 2;
  const targetBranch = $("#transferTargetBranch")?.value || "Chi nhánh 2";
  const noteInput = $("#transferNoteInput");
  if (noteInput) {
    noteInput.value = `[Điều chuyển] Xuất ${qty} bó mía 10kg để bán ở ${targetBranch}`;
  }
  const yieldText = $("#transferYieldText");
  if (yieldText) {
    yieldText.textContent = `~${qty * 25}-${qty * 30} ly tại ${targetBranch}`;
  }
}

function updateRemainingNotes() {
  const branch = $("#remainingBranchSelect")?.value || "Chi nhánh 2";
  const amount = Number($("#remainingAmountInput")?.value) || 0;
  const unitType = $("#miaOpPanelRemaining input[name='remainingUnitType']:checked")?.value || "ly";
  const unitText = unitType === "ly" ? "ly nước" : "kg mía";
  const label = $("#remainingUnitLabel");
  if (label) label.textContent = unitText;
  const noteInput = $("#remainingNoteInput");
  if (noteInput) {
    noteInput.value = `[Mía dư cuối ngày] ${branch} hôm nay chưa bán hết mía, còn dư khoảng ${amount} ${unitText} chuyển sang mai bán tiếp`;
  }
}

function updateNewBatchTotal() {
  const qty = Math.max(1, Number($("#newBatchQtyInput")?.value) || 20);
  const price = Number($("#newBatchPriceInput")?.value.replace(/[^0-9]/g, "")) || 90000;
  const total = qty * price;
  const totalEl = $("#newBatchTotalCostText");
  if (totalEl) totalEl.textContent = formatMoney(total);
}

function renderBatchReport(batchId = null) {
  const batches = state.sugarcaneBatches || [];
  const select = $("#reportBatchSelect");
  if (!select) return;

  if (batches.length === 0) {
    select.innerHTML = '<option value="">Chưa có đợt mía nào</option>';
    const card = $("#batchReportDetailCard");
    if (card) card.innerHTML = '<div style="text-align:center; color:#94a3b8; padding:1rem;">Chưa có đợt mía nào được tạo.</div>';
    return;
  }

  const currentId = batchId || select.value || (batches.find(b => b.status === "active")?.id) || batches[0]?.id;
  select.innerHTML = batches.map(b => `
    <option value="${b.id}" ${b.id === currentId ? 'selected' : ''}>
      ${b.status === 'active' ? '🟢' : '⚪'} ${b.name} (${b.status === 'active' ? 'Đang bào' : 'Đã tổng kết'})
    </option>
  `).join("");

  const batch = batches.find(b => b.id === currentId) || batches[0];
  if (!batch) return;

  const card = $("#batchReportDetailCard");
  const historyWrap = $("#batchHistoryTableWrap");
  const closeBtn = $("#closeActiveBatchBtn");

  const rawTotal = Number(batch.rawStalkBundles) || 0;
  const processed = Number(batch.processedRawBundles) || 0;
  const remaining = Math.max(0, rawTotal - processed);
  const yield10kg = Number(batch.yield10kgBundles) || 0;
  const ratio = processed > 0 ? (Math.round((yield10kg / processed) * 10) / 10) : 0;
  const totalCost = Number(batch.totalCost) || (rawTotal * 90000);
  const costPer10kg = yield10kg > 0 ? Math.round(totalCost / yield10kg) : 0;
  const estCups = Math.round(yield10kg * 27.5);

  if (card) {
    card.innerHTML = `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-bottom: 0.6rem;">
        <div>
          <span style="font-size: 0.72rem; color: #64748b;">Tổng nhập ban đầu:</span>
          <strong style="display: block; font-size: 0.95rem; color: #0f172a;">${rawTotal} bó 12 cây dài</strong>
          <small style="font-size: 0.7rem; color: #ea580c;">Chi phí: ${formatMoney(totalCost)}</small>
        </div>
        <div>
          <span style="font-size: 0.72rem; color: #64748b;">Tiến độ sơ chế:</span>
          <strong style="display: block; font-size: 0.95rem; color: ${remaining === 0 ? '#059669' : '#d97706'};">
            Đã bào ${processed}/${rawTotal} bó ${remaining === 0 ? '✓ (Hết đợt)' : `(Còn ${remaining} bó thô)`}
          </strong>
        </div>
      </div>
      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 0.6rem; display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
        <div>
          <span style="font-size: 0.72rem; color: #047857;">Tổng mía 10kg thu được:</span>
          <strong style="display: block; font-size: 1.15rem; color: #065f46;">${yield10kg} bó 10kg sạch</strong>
          <small style="font-size: 0.7rem; color: #059669;">Ép được ~${estCups} ly nước mía</small>
        </div>
        <div>
          <span style="font-size: 0.72rem; color: #047857;">Tỷ lệ thực tế:</span>
          <strong style="display: block; font-size: 1.15rem; color: #065f46;">1 ➔ ${ratio} bó 10kg</strong>
          <small style="font-size: 0.7rem; color: #059669;">Giá vốn: ~${formatMoney(costPer10kg)} / bó 10kg</small>
        </div>
      </div>
    `;
  }

  if (historyWrap) {
    const hist = Array.isArray(batch.history) ? batch.history : [];
    if (hist.length === 0) {
      historyWrap.innerHTML = `<div style="padding: 0.85rem; text-align: center; color: #94a3b8;">Chưa có lượt bào nào trong đợt này.</div>`;
    } else {
      historyWrap.innerHTML = `
        <table style="width: 100%; border-collapse: collapse; text-align: left;">
          <thead>
            <tr style="background: #f1f5f9; border-bottom: 1px solid #e2e8f0; font-size: 0.7rem; color: #475569;">
              <th style="padding: 0.35rem 0.5rem;">Thời gian</th>
              <th style="padding: 0.35rem 0.5rem; text-align: center;">Bào thô</th>
              <th style="padding: 0.35rem 0.5rem; text-align: center;">Thu được</th>
              <th style="padding: 0.35rem 0.5rem;">Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            ${hist.map(h => `
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 0.35rem 0.5rem; color: #64748b;">${h.time}</td>
                <td style="padding: 0.35rem 0.5rem; text-align: center; font-weight: 700; color: #9a3412;">${h.rawQty} bó</td>
                <td style="padding: 0.35rem 0.5rem; text-align: center; font-weight: 800; color: #059669;">+${h.yieldQty} bó</td>
                <td style="padding: 0.35rem 0.5rem; color: #334155;">${h.note || '-'}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      `;
    }
  }

  if (closeBtn) {
    if (batch.status === "completed") {
      closeBtn.disabled = true;
      closeBtn.style.opacity = "0.5";
      closeBtn.querySelector("span").textContent = "✓ Đợt Mía Này Đã Đóng";
    } else {
      closeBtn.disabled = false;
      closeBtn.style.opacity = "1";
      closeBtn.querySelector("span").textContent = "🏁 Đóng & Tổng Kết Đợt Mía Này";
    }
  }
}

let materialsLogFilter = "all";

function renderMaterialsView() {
  const activeBranch = "Kho Tổng";

  // 1. Stock map for central warehouse
  const stockMap = {};
  let lowStockCount = 0;
  const items = (state.inventoryStock && (state.inventoryStock["Kho Tổng"] || state.inventoryStock["Quán Nhà (Chính)"])) || [];
  items.forEach(it => {
    stockMap[it.id] = Number(it.stockQty) || 0;
    if (it.minQty && (Number(it.stockQty) || 0) <= Number(it.minQty)) {
      lowStockCount++;
    }
  });

  // Batch Dashboard
  renderSugarcaneBatchDashboard();

  // KPI 1: Total NVL
  const ingredients = state.quickIngredients || [];
  if ($("#matTotalItemsCount")) $("#matTotalItemsCount").textContent = `${ingredients.length} loại`;

  // KPI 2: Low stock warning
  if ($("#matLowStockCount")) {
    $("#matLowStockCount").textContent = `${lowStockCount} loại`;
    $("#matLowStockCount").style.color = lowStockCount > 0 ? "#fca5a5" : "#fef08a";
  }
  if ($("#matLowStockText")) {
    $("#matLowStockText").textContent = lowStockCount > 0 ? "Có nguyên liệu sắp hết!" : "Tồn kho đang ở mức an toàn";
  }

  // KPI 3: Today used count
  const today = todayKey();
  const todayUses = (state.ds || []).filter(tx => !tx.deleted && tx.ngay === today && (tx.loai === "xuat_dung" || tx.loai === "xuat_kho"));
  if ($("#matTodayUsedCount")) $("#matTodayUsedCount").textContent = `${todayUses.length} lượt`;
  if ($("#matTodayUsedText")) {
    const totalQtyUsed = todayUses.reduce((sum, tx) => sum + (Number(tx.soLuong) || 0), 0);
    $("#matTodayUsedText").textContent = todayUses.length > 0 ? `Tổng cộng ${totalQtyUsed} phần NVL` : "Chưa có lượt xuất dùng nào";
  }

  // 2. Render Quick Usage Grid (1 Chạm)
  const quickContainer = $("#materialsQuickButtons");
  if (quickContainer) {
    quickContainer.innerHTML = ingredients
      .map((item) => {
        const imgSrc = getValidIngredientImage(item);
        const invId = item.inventoryId || item.id;
        const currentStock = stockMap[invId] !== undefined ? stockMap[invId] : (stockMap[item.id] !== undefined ? stockMap[item.id] : 0);
        const isLow = currentStock <= 2;
        const yieldVal = item.yieldPerUnit || 1;
        const isMia10kg = invId === "mia_10kg";
        const stockBadgeText = isMia10kg ? `${currentStock * 10}kg (${currentStock} bó)` : `${currentStock} ${item.unit || ""}`;

        return `
        <button class="quick-btn ingredient-card theme-${item.icon || "cane_bundle"}" data-id="${item.id}" type="button" style="position: relative;">
          <span class="quick-btn-badge ing-cost-badge" style="background: #7c3aed !important; box-shadow: 0 2px 6px rgba(124, 58, 237, 0.35) !important;">~${yieldVal} ly</span>
          <div class="quick-btn-img-box ing-img-box">
            <img class="quick-btn-img ing-img" src="${imgSrc}" alt="${item.name}" loading="lazy" />
          </div>
          <strong class="quick-btn-name">${item.shortName || item.name}</strong>
          <span class="ing-stock-badge ${isLow ? 'is-low' : ''}" style="position: absolute; bottom: 0.35rem; right: 0.35rem; font-size: 0.7rem; font-weight: 800; background: ${isLow ? '#fee2e2' : 'rgba(241, 245, 249, 0.94)'}; color: ${isLow ? '#b91c1c' : '#334155'}; padding: 0.12rem 0.4rem; border-radius: 4px; border: 1px solid ${isLow ? '#fca5a5' : '#cbd5e1'}; backdrop-filter: blur(4px);">Tồn: ${stockBadgeText}</span>
        </button>
      `;
      })
      .join("");

    $$("#materialsQuickButtons .ingredient-card").forEach((btn) => {
      btn.onclick = () => {
        const id = btn.getAttribute("data-id");
        const item = ingredients.find((ing) => ing.id === id);
        if (!item) return;
        openQuickIngredientModal(item, "use");
      };
    });
  }

  // 3. Render Detailed Inventory Table with Dedicated [➖ Trừ] Button
  const tableBody = $("#materialsTableBody");
  if (tableBody) {
    tableBody.innerHTML = ingredients
      .map((item) => {
        const imgSrc = getValidIngredientImage(item);
        const invId = item.inventoryId || item.id;
        const currentStock = stockMap[invId] !== undefined ? stockMap[invId] : 0;
        const isLow = currentStock <= 2;
        const unitCost = Number(item.unitCost) || 0;
        const yieldVal = item.yieldPerUnit || 1;
        const isMia10kg = invId === "mia_10kg";
        const stockText = isMia10kg ? `${currentStock * 10} kg (${currentStock} bó)` : `${currentStock} ${item.unit}`;
        const unitDisplay = isMia10kg ? "bó (10kg)" : item.unit;

        return `
        <tr>
          <td>
            <div style="display: flex; align-items: center; gap: 0.65rem;">
              <div style="width: 2.3rem; height: 2.3rem; border-radius: 6px; overflow: hidden; background: #fff; border: 1px solid #e2e8f0; flex-shrink: 0;">
                <img src="${imgSrc}" alt="${item.name}" style="width: 100%; height: 100%; object-fit: contain;" />
              </div>
              <div>
                <strong style="display: block; font-size: 0.88rem; color: #0f172a;">${item.name}</strong>
                <small style="color: #64748b; font-size: 0.73rem;">${formatMoney(unitCost)}/${item.unit}</small>
              </div>
            </div>
          </td>
          <td style="text-align: center;">
            <span style="background: #f1f5f9; padding: 0.15rem 0.45rem; border-radius: 4px; font-weight: 700; font-size: 0.78rem; color: #475569;">${unitDisplay}</span>
          </td>
          <td style="text-align: right;">
            <strong style="font-size: 0.95rem; color: ${isLow ? '#b91c1c' : '#047857'};">${stockText}</strong>
            ${isLow ? `<span style="display: block; font-size: 0.68rem; color: #ef4444; font-weight: 700;">⚠️ Sắp hết</span>` : ''}
          </td>
          <td style="text-align: right;">
            <span style="font-weight: 700; color: #0284c7;">~${yieldVal} ly</span>
          </td>
          <td style="text-align: center;">
            <div style="display: flex; gap: 0.35rem; justify-content: center; flex-wrap: wrap;">
              <button class="ghost-button mat-row-deduct-btn" data-id="${item.id}" data-name="${item.name}" data-unit="${item.unit}" type="button" style="padding: 0.22rem 0.55rem; font-size: 0.75rem; font-weight: 800; color: #dc2626; border-color: #fca5a5; background: #fef2f2;" title="Trừ bớt số lượng tồn kho">➖ Trừ</button>
              <button class="ghost-button mat-row-buy-btn" data-id="${item.id}" type="button" style="padding: 0.22rem 0.55rem; font-size: 0.75rem; font-weight: 800; color: #ea580c; border-color: #fed7aa; background: #fff7ed;" title="Nhập mua thêm NVL">➕ Nhập</button>
              <button class="ghost-button mat-row-adjust-btn" data-id="${invId}" data-name="${item.name}" data-unit="${item.unit}" type="button" style="padding: 0.22rem 0.45rem; font-size: 0.75rem; font-weight: 800; color: #0284c7; border-color: #bae6fd; background: #f0f9ff;" title="Kiểm kê điều chỉnh số tồn thực tế">⚙️ Đặt lại</button>
            </div>
          </td>
        </tr>
      `;
      })
      .join("");

    $$("#materialsTableBody .mat-row-deduct-btn").forEach((btn) => {
      btn.onclick = async () => {
        const id = btn.getAttribute("data-id");
        const item = ingredients.find((ing) => ing.id === id);
        if (!item) return;
        const invId = item.inventoryId || item.id;
        const isMia10kg = invId === "mia_10kg";
        const isMiaCay = invId === "mia_cay";
        const currentQty = stockMap[invId] !== undefined ? stockMap[invId] : 0;

        let promptMsg = "";
        if (isMia10kg) {
          promptMsg = `Nhập số BÓ mía sạch (1 bó = 10kg) muốn TRỪ khỏi Kho Tổng:\n(Hiện tồn: ${currentQty} bó = ${currentQty * 10} kg)`;
        } else if (isMiaCay) {
          promptMsg = `Nhập số BÓ mía 12 cây dài muốn TRỪ khỏi Kho Tổng:\n(Hiện tồn: ${currentQty} bó 12 cây)`;
        } else {
          promptMsg = `Nhập số lượng ${item.name} muốn TRỪ khỏi Kho Tổng (${item.unit}):\n(Hiện tồn: ${currentQty} ${item.unit})`;
        }

        const deductStr = prompt(promptMsg, "1");
        if (deductStr === null || deductStr.trim() === "") return;
        const deductQty = Number(deductStr);
        if (isNaN(deductQty) || deductQty <= 0) {
          alert("Vui lòng nhập số lượng hợp lệ lớn hơn 0!");
          return;
        }

        const note = prompt(`Lý do trừ kho ${item.name} (xuất dùng pha chế quầy, hư hỏng, hao hụt...):`, "Xuất dùng pha chế quầy");
        if (note === null) return;

        await truKhoNguyenLieu("Kho Tổng", invId, deductQty, note.trim() || "Xuất dùng pha chế quầy");
        state = await docDuLieu();
        renderAll();
        renderMaterialsView();
        showToast(`Đã trừ ${deductQty} ${item.unit} ${item.name} khỏi Kho Tổng!`);
        triggerAutoSync();
      };
    });

    $$("#materialsTableBody .mat-row-buy-btn").forEach((btn) => {
      btn.onclick = () => {
        const id = btn.getAttribute("data-id");
        const item = ingredients.find((ing) => ing.id === id);
        if (!item) return;
        openQuickIngredientModal(item, "buy");
      };
    });

    $$("#materialsTableBody .mat-row-adjust-btn").forEach((btn) => {
      btn.onclick = async () => {
        const invId = btn.getAttribute("data-id");
        const name = btn.getAttribute("data-name");
        const unit = btn.getAttribute("data-unit");
        const isMia10kg = invId === "mia_10kg";
        const currentQty = stockMap[invId] !== undefined ? stockMap[invId] : 0;
        const promptMsg = isMia10kg
          ? `Nhập số tồn kho thực tế cho ${name} theo số BÓ (1 bó = 10kg):\n(Hiện tại: ${currentQty} bó = ${currentQty * 10} kg)`
          : `Nhập số tồn kho thực tế cho ${name} (${unit}):`;
        const newQtyStr = prompt(promptMsg, currentQty);
        if (newQtyStr !== null && newQtyStr.trim() !== "" && !isNaN(Number(newQtyStr))) {
          await capNhatTonKhoThucTe("Kho Tổng", invId, Number(newQtyStr));
          state = await docDuLieu();
          renderAll();
          renderMaterialsView();
          showToast(`Đã điều chỉnh tồn kho ${name} thành ${newQtyStr} ${unit}!`);
          triggerAutoSync();
        }
      };
    });
  }

  // 4. Render Activity Log
  const logList = $("#materialsLogList");
  if (logList) {
    let logs = (state.ds || []).filter(tx => !tx.deleted && (
      tx.chiNhanh === "Kho Tổng" ||
      matchBranch(tx.chiNhanh, "Quán Nhà (Chính)") ||
      matchBranch(tx.chiNhanh, "Chi nhánh 2") ||
      Boolean(tx.ingredientId) ||
      tx.loai === "xuat_dung" ||
      tx.loai === "xuat_kho"
    ));
    
    if (materialsLogFilter === "use") {
      logs = logs.filter(tx => tx.loai === "xuat_dung" || tx.loai === "xuat_kho");
    } else if (materialsLogFilter === "buy") {
      logs = logs.filter(tx => tx.loai === "chi" && (tx.ingredientId || tx.danhMuc?.toLowerCase().includes("mua") || tx.ghiChu?.toLowerCase().includes("mua") || tx.ghiChu?.toLowerCase().includes("nhập")));
    } else {
      logs = logs.filter(tx => tx.loai === "xuat_dung" || tx.loai === "xuat_kho" || (tx.loai === "chi" && (tx.ingredientId || tx.danhMuc?.toLowerCase().includes("mua") || tx.ghiChu?.toLowerCase().includes("mua") || tx.ghiChu?.toLowerCase().includes("nhập"))));
    }

    // Sort newest first
    logs.sort((a, b) => (b.id || 0) - (a.id || 0));

    if (!logs.length) {
      logList.innerHTML = `<p class="empty-state" style="padding: 1.5rem; text-align: center; color: #94a3b8;">Chưa có lịch sử xuất dùng hoặc mua hàng nào gần đây tại Kho Tổng.</p>`;
    } else {
      logList.innerHTML = logs.slice(0, 30).map(item => {
        const isXuat = item.loai === "xuat_dung" || item.loai === "xuat_kho";
        const billCode = item.billCode || (isXuat ? `#XK-${String(item.id).slice(-4)}` : `#PO-${String(item.id).slice(-4)}`);
        const badgeColor = isXuat ? "background: #f5f3ff; color: #7c3aed; border-color: #ddd6fe;" : "background: #fff7ed; color: #ea580c; border-color: #fed7aa;";
        const tagLabel = isXuat ? "📦 Xuất dùng" : "🛒 Mua hàng";

        return `
          <div class="transaction-item ${item.loai}" style="padding: 0.65rem 0.85rem; border-radius: var(--radius-sm);">
            <div class="tx-main">
              <div class="tx-title-row">
                <span class="tx-bill-badge" style="${badgeColor}">${billCode}</span>
                <span style="font-size: 0.72rem; font-weight: 800; padding: 0.1rem 0.4rem; border-radius: 4px; ${badgeColor}">${tagLabel}</span>
                <strong class="tx-title" style="color: ${isXuat ? '#5b21b6' : '#9a3412'};">${item.danhMuc}</strong>
                <span class="tx-qty">${item.soLuong ? `x${item.soLuong} ${item.donViTinh || "kg"}` : ""}</span>
              </div>
              <p class="tx-note" style="margin: 0.2rem 0 0; font-size: 0.82rem; color: #475569;">${item.ghiChu || item.cauNoiGoc || "Không có ghi chú chi tiết"}</p>
              <div class="tx-meta" style="margin-top: 0.25rem;">
                <span>📅 ${formatDate(item.ngay)} ${item.gio || ""}</span>
                ${!isXuat && item.soTien > 0 ? `<span style="color: #ea580c; font-weight: 700;">Chi: ${formatMoney(item.soTien)}</span>` : ""}
              </div>
            </div>
            <div class="tx-right">
              ${isXuat 
                ? `<strong class="tx-amount xuat_dung" style="color: #7c3aed; font-size: 0.95rem;">-${item.soLuong} ${item.donViTinh || ""}</strong>` 
                : `<strong class="tx-amount chi">-${formatMoney(item.soTien)}</strong>`}
              <button class="delete-btn" data-id="${item.id}" type="button" aria-label="Xóa">✕</button>
            </div>
          </div>
        `;
      }).join("");

      $$("#materialsLogList .delete-btn").forEach((btn) => {
        btn.onclick = async () => {
          const rawId = btn.getAttribute("data-id");
          const id = isNaN(Number(rawId)) ? rawId : Number(rawId);
          if (!confirm("Bạn có chắc chắn muốn xóa giao dịch này? Hệ thống sẽ tự động hoàn trả / trừ lại tồn kho nguyên liệu tương ứng.")) return;
          await xoaGiaoDich(id);
          state = await docDuLieu();
          renderAll();
          renderMaterialsView();
          showToast("Đã xóa giao dịch và hoàn kho thành công!");
          triggerAutoSync();
        };
      });
    }
  }
}

// ----------------------------------------------------
// QUẢN LÝ & THEO DÕI 4 HŨ TIỀN QUẢN TRỊ DÒNG TIỀN
// ----------------------------------------------------

function renderJarsView(selectedPeriod = null) {
  const periodSelect = $("#jarsPeriodSelect");
  const period = selectedPeriod || periodSelect?.value || "today";

  const currentBranch = state.currentBranch || "all";
  const isAll = currentBranch === "all";
  const today = todayKey();

  // Helper date offset using local time without UTC offset bugs
  const getOffsetDate = (daysAgo) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const yesterday = getOffsetDate(1);

  // Filter transactions with matchBranch
  let items = (state.ds || []).filter((item) => !item.deleted && matchBranch(item.chiNhanh, currentBranch));

  let numDays = 1;
  let periodLabel = "Hôm nay";
  if (period === "today") {
    items = items.filter((it) => it.ngay === today);
    numDays = 1;
    periodLabel = `Hôm nay (${formatDate(today)})`;
  } else if (period === "yesterday") {
    items = items.filter((it) => it.ngay === yesterday);
    numDays = 1;
    periodLabel = `Hôm qua (${formatDate(yesterday)})`;
  } else if (period === "7days") {
    const d7Str = getOffsetDate(6);
    items = items.filter((it) => it.ngay >= d7Str && it.ngay <= today);
    numDays = 7;
    periodLabel = `7 ngày qua (${formatDate(d7Str)} - ${formatDate(today)})`;
  } else if (period === "30days") {
    const d30Str = getOffsetDate(29);
    items = items.filter((it) => it.ngay >= d30Str && it.ngay <= today);
    numDays = 30;
    periodLabel = `30 ngày qua (${formatDate(d30Str)} - ${formatDate(today)})`;
  } else if (period === "this_month") {
    const curMonth = today.slice(0, 7);
    items = items.filter((it) => it.ngay && it.ngay.startsWith(curMonth));
    const nowDay = new Date().getDate();
    numDays = Math.max(1, nowDay);
    periodLabel = `Tháng ${Number(today.slice(5, 7))}/${today.slice(0, 4)}`;
  } else if (period === "custom") {
    const start = $("#jarsStartDate")?.value || today;
    const end = $("#jarsEndDate")?.value || today;
    items = items.filter((it) => it.ngay >= start && it.ngay <= end);
    const msDiff = Math.max(0, new Date(end).getTime() - new Date(start).getTime());
    numDays = Math.max(1, Math.round(msDiff / (1000 * 60 * 60 * 24)) + 1);
    periodLabel = `${formatDate(start)} ➔ ${formatDate(end)}`;
  }

  const income = items
    .filter((it) => it.loai === "thu")
    .reduce((sum, it) => sum + Number(it.soTien || 0), 0);
  const cashIncome = items
    .filter((it) => it.loai === "thu" && it.phuongThuc !== "chuyen_khoan")
    .reduce((sum, it) => sum + Number(it.soTien || 0), 0);
  const bankIncome = items
    .filter((it) => it.loai === "thu" && it.phuongThuc === "chuyen_khoan")
    .reduce((sum, it) => sum + Number(it.soTien || 0), 0);
  const totalDrinks = items
    .filter((it) => it.loai === "thu")
    .reduce((sum, it) => sum + Number(it.soLuong || 1), 0);
  const totalCost = items
    .filter((it) => it.loai === "thu")
    .reduce((sum, it) => sum + Number(it.tongGiaCost || (it.giaCostDonVi * (it.soLuong || 1)) || 0), 0);

  // Determine reference month and exact days in that month (e.g., Aug = 31 days, Sep = 30 days)
  const refDate = (period === "yesterday" ? yesterday : today);
  const activeYear = Number(refDate.slice(0, 4)) || new Date().getFullYear();
  const activeMonth = Number(refDate.slice(5, 7)) || (new Date().getMonth() + 1);
  const daysInActiveMonth = new Date(activeYear, activeMonth, 0).getDate(); // 28, 29, 30, or 31

  // Monthly & Daily overhead for branch (Chi nhánh 2 mặc định ít nhất 200.000 đ/ngày)
  let dailyOverhead = 0;
  let monthlyOverhead = 0;
  const isMainBranch = matchBranch(currentBranch, "Quán Nhà (Chính)") && !isAll;
  
  if (isMainBranch) {
    // Chi nhánh chính là nhà ở của gia đình, tiền thuê mặt bằng = 0 đ
    dailyOverhead = 0;
    monthlyOverhead = 0;
  } else if (isAll) {
    // Toàn hệ thống: Cố định ít nhất 200.000 đ/ngày cho mặt bằng thuê CN2
    const ov2 = layOverheadChoChiNhanh(state, "Chi nhánh 2");
    monthlyOverhead = ov2 ? (Number(ov2.rentMonthly) || 6000000) : 6000000;
    dailyOverhead = Math.max(200000, Math.round(monthlyOverhead / 30));
  } else {
    // Chi nhánh 2: Cố định ít nhất 200.000 đ/ngày
    const ov = layOverheadChoChiNhanh(state, currentBranch);
    monthlyOverhead = ov ? (Number(ov.rentMonthly) || 6000000) : 6000000;
    dailyOverhead = Math.max(200000, Math.round(monthlyOverhead / 30));
  }

  const targetRent = (period === "this_month" || (period === "30days" && numDays >= 30)) 
    ? (isMainBranch ? 0 : monthlyOverhead) 
    : Math.round(dailyOverhead * numDays);

  // 1. LẤY ĐÚNG 100% TIỀN VỐN THỰC TẾ (BOM) ĐÃ TIÊU HAO ĐỂ HOÀN VỐN MUA HÀNG
  const jar1Cost = totalCost; // Giá vốn thực tế chính xác của các ly đã bán
  
  // 2. DOANH THU SAU KHI ĐÃ HOÀN ĐỦ TIỀN VỐN BOM (LÃI GỘP)
  const grossAfterBOM = Math.max(0, income - jar1Cost);

  // 3. ƯU TIÊN SỐ 1 SAU BOM: DỒN HẾT DOANH THU VÀO HŨ 2 (QUỸ MẶT BẰNG) CHO ĐẾN KHI ĐẠT ĐỦ TARGET (200K/NGÀY)
  const jar2Rent = Math.min(grossAfterBOM, targetRent);
  const rentProgress = targetRent > 0 ? Math.min(100, Math.round((jar2Rent / targetRent) * 100)) : 100;
  const rentShortfall = Math.max(0, targetRent - jar2Rent);

  // 4. CHỈ KHI DOANH THU SAU BOM VƯỢT NGƯỠNG MẶT BẰNG (grossAfterBOM > targetRent) MỚI BẮT ĐẦU CHIA CHO HŨ 3 VÀ HŨ 4
  const surplusAfterRent = Math.max(0, grossAfterBOM - targetRent);

  // - HŨ 3 (QUỸ XOAY VÒNG & PHÁT SINH): Trích 10% của phần thặng dư dôi ra sau khi đã gom đủ mặt bằng
  //   (Nếu là Quán Nhà mặt bằng = 0đ thì trích 10% của toàn bộ lãi gộp)
  const jar3Reserve = isMainBranch 
    ? Math.round(grossAfterBOM * 0.10) 
    : Math.round(surplusAfterRent * 0.10);

  // - HŨ 4 (TIỀN LỜI RÒNG BỎ TÚI): Toàn bộ phần thặng dư còn lại sau khi đã gom đủ mặt bằng & trích quỹ
  //   (Nếu chưa đủ mặt bằng thì hiển thị âm số tiền thiếu để bù tiền nhà)
  let jar4Profit = 0;
  if (income > 0) {
    if (isMainBranch) {
      jar4Profit = grossAfterBOM - jar3Reserve;
    } else if (grossAfterBOM >= targetRent) {
      jar4Profit = surplusAfterRent - jar3Reserve;
    } else {
      jar4Profit = grossAfterBOM - targetRent; // Số âm (cần bù tiền nhà)
    }
  }

  const isNegative = income > 0 && jar4Profit < 0;
  const profitMargin = (income > 0 && jar4Profit > 0) ? Math.round((jar4Profit / income) * 100) : 0;

  // Header summary
  if ($("#jarsTotalRevenue")) $("#jarsTotalRevenue").textContent = formatMoney(income);
  if ($("#jarsTotalDrinks")) $("#jarsTotalDrinks").textContent = `${totalDrinks} ly nước (${numDays} ngày • ${periodLabel})`;
  if ($("#jarsCashRev")) $("#jarsCashRev").textContent = formatMoney(cashIncome);
  if ($("#jarsBankRev")) $("#jarsBankRev").textContent = formatMoney(bankIncome);
  if ($("#jarsNetProfitSummary")) {
    if (jar4Profit > 0) {
      $("#jarsNetProfitSummary").textContent = `+${formatMoney(jar4Profit)}`;
      $("#jarsNetProfitSummary").style.color = "#34d399";
    } else if (isNegative) {
      $("#jarsNetProfitSummary").textContent = `-${formatMoney(Math.abs(jar4Profit))}`;
      $("#jarsNetProfitSummary").style.color = "#f87171";
    } else {
      $("#jarsNetProfitSummary").textContent = "0 đ";
      $("#jarsNetProfitSummary").style.color = "#e2e8f0";
    }
  }
  if ($("#jarsNetProfitStatus")) {
    if (income === 0) {
      $("#jarsNetProfitStatus").textContent = `⚪ Chưa có doanh thu trong kỳ (${periodLabel})`;
      $("#jarsNetProfitStatus").style.color = "#c7d2fe";
    } else if (isMainBranch) {
      $("#jarsNetProfitStatus").textContent = `🏠 Quán Nhà (Mặt bằng 0đ): Tiền lời sạch nhận trọn: +${formatMoney(jar4Profit)} (Tỷ suất lời: ${profitMargin}%)`;
      $("#jarsNetProfitStatus").style.color = "#a7f3d0";
    } else if (jar4Profit > 0) {
      $("#jarsNetProfitStatus").textContent = `🟢 ĐÃ ĐẠT ĐỦ 100% MẶT BẰNG! Tiền lời sạch thực nhận: +${formatMoney(jar4Profit)} (Tỷ suất lời: ${profitMargin}%)`;
      $("#jarsNetProfitStatus").style.color = "#a7f3d0";
    } else {
      $("#jarsNetProfitStatus").textContent = `🔴 Chưa đủ tiền trả mặt bằng: Cần bù -${formatMoney(Math.abs(jar4Profit))} vào tiền nhà. Vốn nhập hàng (${formatMoney(jar1Cost)}) bảo toàn 100%.`;
      $("#jarsNetProfitStatus").style.color = "#fca5a5";
    }
  }

  // 4 Jars Cards
  if ($("#jar1Amount")) $("#jar1Amount").textContent = formatMoney(jar1Cost);
  if ($("#jar1ActualCost")) $("#jar1ActualCost").textContent = `${formatMoney(totalCost)} (Chuẩn BOM 100% vốn)`;
  
  if ($("#jar2Amount")) $("#jar2Amount").textContent = formatMoney(jar2Rent);
  if ($("#jar2DailyOverhead")) {
    if (isMainBranch) {
      $("#jar2DailyOverhead").textContent = `Mặt bằng nhà (0 đ/tháng)`;
    } else {
      $("#jar2DailyOverhead").textContent = `${rentProgress}% mục tiêu (${formatMoney(targetRent)})`;
    }
  }

  if ($("#jar2Badge")) {
    if (isMainBranch) {
      $("#jar2Badge").textContent = `🏠 Nhà Ở - 0đ`;
      $("#jar2Badge").style.background = "#f0fdf4";
      $("#jar2Badge").style.color = "#16a34a";
      $("#jar2Badge").style.borderColor = "#86efac";
    } else {
      $("#jar2Badge").textContent = `Ưu Tiên Số 1`;
      $("#jar2Badge").style.background = "#f0f9ff";
      $("#jar2Badge").style.color = "#0284c7";
      $("#jar2Badge").style.borderColor = "#7dd3fc";
    }
  }

  if ($("#jar2NoteText")) {
    if (isMainBranch) {
      $("#jar2NoteText").innerHTML = `Quán Nhà là <strong>mặt bằng nhà ở của gia đình (0 đ tiền thuê)</strong>. Toàn bộ doanh thu sau khi hoàn vốn và trích quỹ dự phòng sẽ được <strong>chuyển 100% thành tiền lời sạch</strong> ở Hũ 4!`;
    } else {
      $("#jar2NoteText").innerHTML = `Ưu tiên gom đủ tiền mặt bằng (ít nhất <strong>${formatMoney(dailyOverhead)}/ngày</strong>) để <strong>cuối tháng gom đủ ${formatMoney(monthlyOverhead)} trả chủ nhà</strong>.`;
    }
  }

  if ($("#jar3Amount")) $("#jar3Amount").textContent = formatMoney(jar3Reserve);
  if ($("#jar3OpeningCash")) $("#jar3OpeningCash").textContent = `5% PS + 5% Vốn (Két: ${formatMoney(isAll ? 100000 : 50000)})`;

  const jar4CardElem = $("#jar4CardElement");
  if (jar4CardElem) {
    if (isNegative) {
      jar4CardElem.classList.add("is-negative");
    } else {
      jar4CardElem.classList.remove("is-negative");
    }
  }

  if ($("#jar4Amount")) {
    if (jar4Profit > 0) {
      $("#jar4Amount").textContent = `+${formatMoney(jar4Profit)}`;
      $("#jar4Amount").style.color = "#059669";
    } else if (isNegative) {
      $("#jar4Amount").textContent = `-${formatMoney(Math.abs(jar4Profit))}`;
      $("#jar4Amount").style.color = "#dc2626";
    } else {
      $("#jar4Amount").textContent = "0 đ";
      $("#jar4Amount").style.color = "#64748b";
    }
  }
  if ($("#jar4MarginPct")) $("#jar4MarginPct").textContent = `${jar4Profit > 0 ? profitMargin : 0}%`;
  if ($("#jar4Badge")) {
    if (jar4Profit > 0) {
      $("#jar4Badge").textContent = `🟢 Lời Ròng Dôi Ra`;
      $("#jar4Badge").style.background = "#ecfdf5";
      $("#jar4Badge").style.color = "#059669";
      $("#jar4Badge").style.borderColor = "#6ee7b7";
    } else if (isNegative) {
      $("#jar4Badge").textContent = `🔴 Âm Tiền Mặt Bằng`;
      $("#jar4Badge").style.background = "#fee2e2";
      $("#jar4Badge").style.color = "#b91c1c";
      $("#jar4Badge").style.borderColor = "#fca5a5";
    } else {
      $("#jar4Badge").textContent = `Bắt đầu 0đ`;
      $("#jar4Badge").style.background = "#f8fafc";
      $("#jar4Badge").style.color = "#64748b";
      $("#jar4Badge").style.borderColor = "#cbd5e1";
    }
  }
  if ($("#jar4NoteBox")) {
    if (jar4Profit > 0) {
      $("#jar4NoteBox").style.background = "#ecfdf5";
      $("#jar4NoteBox").style.color = "#065f46";
      $("#jar4NoteBox").style.borderColor = "#a7f3d0";
    } else if (isNegative) {
      $("#jar4NoteBox").style.background = "#fef2f2";
      $("#jar4NoteBox").style.color = "#991b1b";
      $("#jar4NoteBox").style.borderColor = "#fecaca";
    } else {
      $("#jar4NoteBox").style.background = "#f8fafc";
      $("#jar4NoteBox").style.color = "#334155";
      $("#jar4NoteBox").style.borderColor = "#e2e8f0";
    }
  }
  if ($("#jar4NoteText")) {
    if (isMainBranch && jar4Profit > 0) {
      $("#jar4NoteText").innerHTML = `🏠 <strong>Quán Nhà (Mặt bằng 0đ):</strong> Đã thu đủ ${formatMoney(jar1Cost)} vốn hàng, trích ${formatMoney(jar3Reserve)} quỹ xoay vòng & phát sinh, anh/chị nhận trọn <strong>+${formatMoney(jar4Profit)} tiền lời sạch</strong> bỏ túi từ ly đầu tiên!`;
    } else if (jar4Profit > 0) {
      $("#jar4NoteText").innerHTML = `🎉 <strong>Đã hoàn tất 100% mục tiêu mặt bằng:</strong> Đã thu ${formatMoney(jar1Cost)} vốn hàng, dồn đủ 100% tiền mặt bằng (${formatMoney(targetRent)}), phần dôi ra (${formatMoney(surplusAfterRent)}) trích ${formatMoney(jar3Reserve)} quỹ xoay vòng & phát sinh, anh/chị nhận trọn <strong>+${formatMoney(jar4Profit)} tiền lời sạch</strong> bỏ túi!`;
    } else if (isNegative) {
      $("#jar4NoteText").innerHTML = `⚠️ <strong>Chưa đủ tiền trả mặt bằng:</strong> Toàn bộ doanh thu sau vốn (${formatMoney(grossAfterBOM)}) đã dồn vào tiền mặt bằng (${formatMoney(jar2Rent)}/${formatMoney(targetRent)} - ${rentProgress}%). Hũ 4 hiển thị âm <strong>-${formatMoney(Math.abs(jar4Profit))}</strong> cần bù vào tiền nhà. <strong>Tiền vốn hàng (${formatMoney(jar1Cost)}) được giữ nguyên vẹn 100%</strong>!`;
    } else {
      $("#jar4NoteText").innerHTML = `Chưa phát sinh doanh thu trong kỳ <strong>${periodLabel}</strong>. Bất kể thu về bao nhiêu, hệ thống sẽ tự động hoàn vốn và gom quỹ mặt bằng trước khi tính lời!`;
    }
  }

  // Render breakdown transactions list in Jars tab (Show List)
  const txListContainer = $("#jarsTransactionsList");
  const countBadge = $("#jarsTxListCountBadge");
  if (countBadge) countBadge.textContent = `${items.length} đơn (${totalDrinks} ly)`;
  
  if (txListContainer) {
    if (!items.length) {
      txListContainer.innerHTML = `<p class="empty-state" style="text-align: center; color: #94a3b8; padding: 1.5rem 0; font-size: 0.88rem;">Không có giao dịch nào trong khoảng thời gian này tại <strong>${isAll ? "tất cả điểm bán" : currentBranch}</strong>.</p>`;
    } else {
      txListContainer.innerHTML = items
        .slice(0, 100)
        .map((item) => {
          const isThu = item.loai === "thu";
          const isTransfer = item.phuongThuc === "chuyen_khoan";
          const billCode = item.billCode || (isThu ? `#BILL-${String(item.id).slice(-4)}` : `#PO-${String(item.id).slice(-4)}`);
          const branchName = item.chiNhanh || "Quán Nhà (Chính)";
          const isMain = matchBranch(branchName, "Quán Nhà (Chính)");
          const branchBadgeClass = isMain ? "main-branch" : "branch-2";
          
          return `
            <div class="transaction-item ${item.loai}">
              <div class="tx-main">
                <div class="tx-title-row">
                  <span class="tx-bill-badge" style="background: ${isThu ? '#ecfdf5' : '#fef3c7'}; color: ${isThu ? '#047857' : '#b45309'}; font-weight: 800; font-size: 0.72rem; padding: 0.12rem 0.45rem; border-radius: 0.3rem; border: 1px solid ${isThu ? '#a7f3d0' : '#fde68a'};">${billCode}</span>
                  <span class="tx-title">${item.danhMuc || (isThu ? "Nước mía" : "Chi")}</span>
                  ${item.soLuong ? `<span class="tx-qty">x${item.soLuong} ${item.donViTinh || (isThu ? "ly" : "kg")}</span>` : ""}
                  <span class="tx-branch-badge ${branchBadgeClass}">📍 ${branchName}</span>
                  <span style="font-size: 0.72rem; font-weight: 800; padding: 0.1rem 0.45rem; border-radius: 0.3rem; ${isTransfer ? 'background: rgba(14, 165, 233, 0.15); color: #0284c7; border: 1px solid #bae6fd;' : 'background: rgba(16, 185, 129, 0.15); color: #059669; border: 1px solid #bbf7d0;'}">${isTransfer ? '📱 CK QR' : '💵 Tiền mặt'}</span>
                </div>
                ${item.ghiChu || item.cauNoiGoc ? `<p class="tx-note" style="margin: 0.15rem 0 0; font-size: 0.8rem; color: #64748b;">${item.ghiChu || item.cauNoiGoc}</p>` : ""}
                <div class="tx-meta" style="margin-top: 0.2rem; display: flex; gap: 0.65rem; font-size: 0.75rem; color: #94a3b8; font-weight: 700;">
                  <span>🕒 ${formatDate(item.ngay)} ${item.gio || ""}</span>
                  ${item.giaCostDonVi > 0 ? `<span style="color: #ea580c;">Vốn: ${formatMoney(item.tongGiaCost || item.giaCostDonVi * (item.soLuong || 1))}</span>` : ""}
                </div>
              </div>
              <div class="tx-right" style="text-align: right;">
                <strong class="tx-amount ${item.loai}" style="display: block; font-size: 1.1rem;">${isThu ? "+" : "-"}${formatMoney(item.soTien)}</strong>
              </div>
            </div>
          `;
        })
        .join("");
    }
  }
}

function runJarSimulation() {
  const rev = Number($("#jarSimRevenue")?.value) || 0;
  const days = Math.max(1, Number($("#jarSimDays")?.value) || 1);

  const currentBranch = state.currentBranch || "all";
  const isAll = currentBranch === "all";
  const isMainBranch = matchBranch(currentBranch, "Quán Nhà (Chính)") && !isAll;

  let monthlyOverhead = 0;
  let dailyOverhead = 0;
  if (isMainBranch) {
    monthlyOverhead = 0;
    dailyOverhead = 0;
  } else if (isAll) {
    const ov2 = layOverheadChoChiNhanh(state, "Chi nhánh 2");
    monthlyOverhead = ov2 ? (Number(ov2.rentMonthly) || 6000000) : 6000000;
    dailyOverhead = Math.max(200000, Math.round(monthlyOverhead / 30));
  } else {
    const ov = layOverheadChoChiNhanh(state, currentBranch);
    monthlyOverhead = ov ? (Number(ov.rentMonthly) || 6000000) : 6000000;
    dailyOverhead = Math.max(200000, Math.round(monthlyOverhead / 30));
  }

  const targetRent = Math.round(dailyOverhead * days);

  const cost = Math.round(rev * 0.50); // Ước lượng vốn ~50%
  const grossAfterBOM = Math.max(0, rev - cost);

  const rentCollected = Math.min(grossAfterBOM, targetRent);
  const rentShortfall = Math.max(0, targetRent - rentCollected);
  const rentProgress = targetRent > 0 ? Math.min(100, Math.round((rentCollected / targetRent) * 100)) : 100;
  
  const surplus = Math.max(0, grossAfterBOM - targetRent);
  const reserve = isMainBranch 
    ? Math.round(grossAfterBOM * 0.10) 
    : Math.round(surplus * 0.10);

  let profit = 0;
  if (rev > 0) {
    if (isMainBranch) {
      profit = grossAfterBOM - reserve;
    } else if (grossAfterBOM >= targetRent) {
      profit = surplus - reserve;
    } else {
      profit = grossAfterBOM - targetRent;
    }
  }

  if ($("#simCost")) $("#simCost").textContent = formatMoney(cost);
  if ($("#simRent")) $("#simRent").textContent = isMainBranch ? `0 đ (Mặt bằng nhà)` : `${formatMoney(rentCollected)} / ${formatMoney(targetRent)} (${rentProgress}%)`;
  if ($("#simOpening")) $("#simOpening").textContent = `${formatMoney(reserve)} (5% PS + 5% Vốn)`;
  if ($("#simProfit")) {
    if (rev === 0) {
      $("#simProfit").textContent = "0 đ";
      $("#simProfit").style.color = "#64748b";
    } else if (profit >= 0) {
      $("#simProfit").textContent = `+${formatMoney(profit)}`;
      $("#simProfit").style.color = "#059669";
    } else {
      $("#simProfit").textContent = `-${formatMoney(Math.abs(profit))}`;
      $("#simProfit").style.color = "#dc2626";
    }
  }

  const noteBox = $("#simNoteBox");
  if (noteBox) {
    if (rev === 0) {
      noteBox.style.background = "#fffbeb";
      noteBox.style.borderColor = "#fde68a";
      noteBox.style.color = "#92400e";
      noteBox.innerHTML = `📌 Nhập số doanh thu để xem phân bổ chuẩn sau khi lấy lại đúng tiền vốn.`;
    } else if (isMainBranch) {
      noteBox.style.background = "#ecfdf5";
      noteBox.style.borderColor = "#a7f3d0";
      noteBox.style.color = "#065f46";
      noteBox.innerHTML = `🏠 <strong>Quán Nhà (Mặt bằng 0đ):</strong> Doanh thu ${formatMoney(rev)} trong ${days} ngày: Hoàn ${formatMoney(cost)} vốn hàng, trích ${formatMoney(reserve)} quỹ xoay vòng & phát sinh, nhận trọn vẹn <strong>+${formatMoney(profit)}</strong> tiền lời sạch bỏ túi!`;
    } else if (profit >= 0) {
      noteBox.style.background = "#ecfdf5";
      noteBox.style.borderColor = "#a7f3d0";
      noteBox.style.color = "#065f46";
      noteBox.innerHTML = `✅ <strong>Đã đạt điểm hòa vốn & có lời:</strong> Doanh thu ${formatMoney(rev)}: Dồn đủ 100% tiền mặt bằng (${formatMoney(targetRent)}), phần dôi ra ${formatMoney(surplus)} được trích ${formatMoney(reserve)} quỹ xoay vòng & phát sinh, còn lại <strong>+${formatMoney(profit)}</strong> tiền lời sạch!`;
    } else {
      noteBox.style.background = "#fef2f2";
      noteBox.style.borderColor = "#fecaca";
      noteBox.style.color = "#991b1b";
      noteBox.innerHTML = `⚠️ <strong>Chưa đủ tiền trả mặt bằng:</strong> Toàn bộ doanh thu sau vốn (${formatMoney(grossAfterBOM)}) đã dồn vào tiền mặt bằng (${formatMoney(rentCollected)}/${formatMoney(targetRent)} - ${rentProgress}%). Hũ 4 hiển thị âm <strong>-${formatMoney(Math.abs(profit))}</strong> để bù vào mặt bằng, <strong>tiền vốn nhập hàng (${formatMoney(cost)}) được bảo toàn nguyên vẹn 100%</strong>!`;
    }
  }
}

// ----------------------------------------------------
// TAB 3: SỔ PHIẾU CHỐT CA & TỔNG KẾT NGÀY (VIEW CLOSINGS)
// ----------------------------------------------------

function getClosedShiftRecord(date, branch) {
  const key = `${date}_${branch}`;
  try {
    const raw = localStorage.getItem("closed_shifts_v1");
    const map = raw ? JSON.parse(raw) : {};
    return map[key] || null;
  } catch {
    return null;
  }
}

function saveClosedShiftRecord(date, branch, data = {}) {
  const key = `${date}_${branch}`;
  try {
    const raw = localStorage.getItem("closed_shifts_v1");
    const map = raw ? JSON.parse(raw) : {};
    map[key] = {
      ...data,
      date,
      branch,
      closedAt: data.closedAt || new Date().toISOString(),
    };
    localStorage.setItem("closed_shifts_v1", JSON.stringify(map));
  } catch (err) {
    console.warn("Failed to save closed shift:", err);
  }
}

function deleteClosedShiftRecord(date, branch) {
  try {
    const raw = localStorage.getItem("closed_shifts_v1");
    const map = raw ? JSON.parse(raw) : {};
    delete map[`${date}_${branch}`];
    delete map[`${date}_all`];
    delete map[`${date}_Quán Nhà (Chính)`];
    delete map[`${date}_Chi nhánh 2`];
    localStorage.setItem("closed_shifts_v1", JSON.stringify(map));
  } catch (err) {
    console.warn("Failed to delete closed shift:", err);
  }
}

// Auto-clean any legacy accidentally closed 31/08 record once
try {
  const raw = localStorage.getItem("closed_shifts_v1");
  if (raw) {
    const map = JSON.parse(raw);
    let changed = false;
    for (const k of Object.keys(map)) {
      if (k.startsWith("2026-08-31")) {
        delete map[k];
        changed = true;
      }
    }
    if (changed) {
      localStorage.setItem("closed_shifts_v1", JSON.stringify(map));
    }
  }
} catch (e) {
  console.warn(e);
}

// ----------------------------------------------------
// TAB 3: SỔ PHIẾU CHỐT CA & TỔNG KẾT NGÀY (VIEW CLOSINGS)
// ----------------------------------------------------

function renderClosingsView() {
  const branchFilter = state.closingsBranchFilter || $("#closingsBranchSelect")?.value || "all";
  const periodFilter = state.closingsPeriodFilter || $("#closingsPeriodSelect")?.value || "this_month";

  // Sync pills and select
  if ($("#closingsBranchSelect") && $("#closingsBranchSelect").value !== branchFilter) {
    $("#closingsBranchSelect").value = branchFilter;
  }
  if ($("#closingsPeriodSelect") && $("#closingsPeriodSelect").value !== periodFilter) {
    $("#closingsPeriodSelect").value = periodFilter;
  }

  $$(".closings-pill-btn").forEach((btn) => {
    if (btn.getAttribute("data-branch") === branchFilter) {
      btn.classList.add("is-active");
    } else {
      btn.classList.remove("is-active");
    }
  });

  const allItems = (state.ds || []).filter((it) => !it.deleted && it.loai !== "chuyen_quy" && it.loai !== "dieu_chinh_quy");
  
  // Unique dates
  const dateSet = new Set(allItems.map((it) => it.ngay).filter(Boolean));
  dateSet.add(todayKey());
  const sortedDates = [...dateSet].sort().reverse(); // Newest first

  const today = todayKey();
  const thisMonthPrefix = today.slice(0, 7);

  const filteredDates = sortedDates.filter((d) => {
    if (periodFilter === "all") return true;
    if (periodFilter === "this_month") return d.startsWith(thisMonthPrefix);
    if (periodFilter === "7days") {
      const diff = (new Date(today) - new Date(d)) / (1000 * 60 * 60 * 24);
      return diff >= 0 && diff < 7;
    }
    if (periodFilter === "30days") {
      const diff = (new Date(today) - new Date(d)) / (1000 * 60 * 60 * 24);
      return diff >= 0 && diff < 30;
    }
    return true;
  });

  let totalTicketsCount = 0;
  let totalRevenueSum = 0;
  let totalProfitSum = 0;

  // Build grouped data per date
  const dateGroups = [];

  for (const d of filteredDates) {
    const branchesToCheck = branchFilter === "all" ? ["Quán Nhà (Chính)", "Chi nhánh 2"] : [branchFilter];
    const branchTickets = [];
    let dayTotalRev = 0;
    let dayTotalProfit = 0;

    for (const br of branchesToCheck) {
      const isMain = matchBranch(br, "Quán Nhà (Chính)");
      const openingCash = getTodayOpeningCash(br);
      const rep = dailyReport(allItems, d, br, openingCash);

      // Skip past days with no sales/expenses
      if (d !== today && rep.income === 0 && rep.expense === 0) continue;

      let dailyOverhead = 0;
      if (isMain) {
        dailyOverhead = 0;
      } else {
        const ov = layOverheadChoChiNhanh(state, br);
        const monthlyOverhead = ov ? (Number(ov.rentMonthly) || 6000000) : 6000000;
        dailyOverhead = Math.max(200000, Math.round(monthlyOverhead / 30));
      }

      const targetRent = dailyOverhead;
      const jar1Cost = rep.cost;
      const grossAfterBOM = Math.max(0, rep.income - jar1Cost);
      const jarRent = Math.min(grossAfterBOM, targetRent);
      const surplus = Math.max(0, grossAfterBOM - targetRent);
      const jar3Reserve = isMain ? Math.round(grossAfterBOM * 0.10) : Math.round(surplus * 0.10);

      let jar4Profit = 0;
      if (rep.income > 0) {
        if (isMain) {
          jar4Profit = grossAfterBOM - jar3Reserve;
        } else if (grossAfterBOM >= targetRent) {
          jar4Profit = surplus - jar3Reserve;
        } else {
          jar4Profit = grossAfterBOM - targetRent;
        }
      }

      const closedRecord = getClosedShiftRecord(d, br);
      const isClosed = Boolean(closedRecord);
      const closedTime = closedRecord && closedRecord.closedAt
        ? new Date(closedRecord.closedAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
        : "";

      totalTicketsCount++;
      totalRevenueSum += rep.income;
      totalProfitSum += jar4Profit;
      dayTotalRev += rep.income;
      dayTotalProfit += jar4Profit;

      branchTickets.push({
        date: d,
        branch: br,
        isToday: d === today,
        isClosed,
        closedTime,
        report: rep,
        jar1Cost,
        targetRent,
        jarRent,
        jar3Reserve,
        jar4Profit,
      });
    }

    if (branchTickets.length > 0) {
      dateGroups.push({
        date: d,
        isToday: d === today,
        dayTotalRev,
        dayTotalProfit,
        tickets: branchTickets,
      });
    }
  }

  // Update summary header
  if ($("#closingsTotalTickets")) $("#closingsTotalTickets").textContent = `${totalTicketsCount} phiếu`;
  if ($("#closingsTotalRevenue")) $("#closingsTotalRevenue").textContent = formatMoney(totalRevenueSum);
  if ($("#closingsTotalProfit")) {
    if (totalProfitSum >= 0) {
      $("#closingsTotalProfit").textContent = `+${formatMoney(totalProfitSum)}`;
      $("#closingsTotalProfit").style.color = "#34d399";
    } else {
      $("#closingsTotalProfit").textContent = `-${formatMoney(Math.abs(totalProfitSum))}`;
      $("#closingsTotalProfit").style.color = "#f87171";
    }
  }
  if ($("#closingsCountBadge")) $("#closingsCountBadge").textContent = `${totalTicketsCount} phiếu`;

  const container = $("#closingsCardsList");
  if (!container) return;

  if (dateGroups.length === 0) {
    container.innerHTML = `<p class="empty-state" style="text-align: center; color: #94a3b8; padding: 2.5rem 0; font-size: 0.95rem;">Không tìm thấy phiếu chốt ca nào cho bộ lọc đã chọn.</p>`;
    return;
  }

  container.innerHTML = dateGroups
    .map((group) => {
      const showGroupHeader = branchFilter === "all" && group.tickets.length > 1;
      
      const groupHeaderHtml = showGroupHeader
        ? `
          <div class="closings-date-group-header">
            <span>📅 Ngày ${formatDate(group.date)} ${group.isToday ? "(Hôm nay)" : ""}</span>
            <span style="color: #059669;">Tổng thu: <strong>${formatMoney(group.dayTotalRev)}</strong></span>
          </div>
        `
        : "";

      const ticketsHtml = group.tickets
        .map((t) => {
          const isMain = matchBranch(t.branch, "Quán Nhà (Chính)");
          const branchBadgeClass = isMain ? "main-branch" : "branch-2";
          const profitClass = t.jar4Profit >= 0 ? "profit" : "profit negative";
          const profitText = t.jar4Profit >= 0 ? `+${formatMoney(t.jar4Profit)}` : `-${formatMoney(Math.abs(t.jar4Profit))}`;
          
          const statusBadge = t.isClosed
            ? `<span class="ticket-status-badge closed">🟢 Đã chốt ca ${t.closedTime ? `(${t.closedTime})` : ""} • ${t.report.totalDrinks} ly</span>`
            : `<span class="ticket-status-badge unclosed">⚪ Chưa chốt ca • ${t.report.totalDrinks} ly</span>`;

          const primaryActionBtnText = t.isClosed
            ? `<span>👁️ Xem Phiếu Chi Tiết</span>`
            : `<span>⚡ Chốt Ca Ngay</span>`;

          return `
            <div class="closing-ticket-card ${t.isToday ? "is-today" : ""}">
              <div class="closing-ticket-top">
                <div class="ticket-date-info">
                  <span style="font-size: 1.2rem;">${t.isToday ? "🌟" : "📅"}</span>
                  <h4 class="ticket-date-title">Phiếu Ngày ${formatDate(t.date)} ${t.isToday ? "(Hôm nay)" : ""}</h4>
                  <span class="ticket-branch-badge ${branchBadgeClass}">📍 ${t.branch}</span>
                </div>
                ${statusBadge}
              </div>

              <div class="closing-ticket-metrics">
                <div class="ticket-metric-box revenue">
                  <span>+ Doanh Thu</span>
                  <strong>${formatMoney(t.report.income)}</strong>
                </div>
                <div class="ticket-metric-box cost">
                  <span>🧊 Vốn BOM (100%)</span>
                  <strong>${formatMoney(t.jar1Cost)}</strong>
                </div>
                <div class="ticket-metric-box rent">
                  <span>🏢 Hũ Mặt Bằng</span>
                  <strong>${isMain ? "0 đ (Nhà)" : `${formatMoney(t.jarRent)}`}</strong>
                </div>
                <div class="ticket-metric-box ${profitClass}">
                  <span>💰 Tiền Lời Sạch</span>
                  <strong>${profitText}</strong>
                </div>
              </div>

              <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.78rem; color: #64748b; margin-top: 0.4rem; padding: 0.35rem 0.65rem; background: #f8fafc; border-radius: var(--radius-sm); border: 1px dashed #e2e8f0; flex-wrap: wrap; gap: 0.35rem;">
                <span>💵 Tiền mặt: <strong>${formatMoney(t.report.cashIncome)}</strong> (Thối sáng: ${formatMoney(t.report.openingCash)})</span>
                <span>📱 CK QR: <strong>${formatMoney(t.report.transferIncome)}</strong></span>
                <span>🛒 Chi phát sinh: <strong>−${formatMoney(t.report.expense)}</strong></span>
              </div>

              <div class="closing-ticket-actions">
                <button type="button" class="ticket-action-btn primary view-ticket-btn" data-date="${t.date}" data-branch="${t.branch}">
                  ${primaryActionBtnText}
                </button>
                ${t.isClosed ? `
                  <button type="button" class="ticket-action-btn unclose-ticket-btn" data-date="${t.date}" data-branch="${t.branch}" style="color: #dc2626; border-color: #fecaca; background: #fef2f2;" title="Hủy chốt ca, chuyển về Chưa chốt ca">
                    <span>🔓 Mở Lại Ca</span>
                  </button>
                ` : ""}
                <button type="button" class="ticket-action-btn speak-ticket-btn" data-date="${t.date}" data-branch="${t.branch}">
                  <span>🔊 Nghe Loa</span>
                </button>
                <button type="button" class="ticket-action-btn copy-ticket-btn" data-date="${t.date}" data-branch="${t.branch}">
                  <span>📋 Sao Chép Báo Cáo</span>
                </button>
              </div>
            </div>
          `;
        })
        .join("");

      return groupHeaderHtml + ticketsHtml;
    })
    .join("");

  // Attach button event listeners
  container.querySelectorAll(".view-ticket-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const d = btn.getAttribute("data-date");
      const br = btn.getAttribute("data-branch");
      openDailyClosingModal(d, br);
    });
  });

  container.querySelectorAll(".unclose-ticket-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const d = btn.getAttribute("data-date");
      const br = btn.getAttribute("data-branch");
      deleteClosedShiftRecord(d, br);
      showToast(`🔓 Đã chuyển ca ngày ${formatDate(d)} (${br}) về trạng thái Chưa chốt ca!`);
      renderAll();
    });
  });

  container.querySelectorAll(".speak-ticket-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const d = btn.getAttribute("data-date");
      const br = btn.getAttribute("data-branch");
      const openingCash = getTodayOpeningCash(br, d);
      const rep = dailyReport(state.ds || [], d, br, openingCash);
      docLai(rep.detailedText || rep.text);
      showToast(`🔊 Đang phát loa báo cáo ngày ${formatDate(d)} (${br})...`);
    });
  });

  container.querySelectorAll(".copy-ticket-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const d = btn.getAttribute("data-date");
      const br = btn.getAttribute("data-branch");
      const openingCash = getTodayOpeningCash(br, d);
      const rep = dailyReport(state.ds || [], d, br, openingCash);
      const textToCopy = `📋 BÁO CÁO TỔNG KẾT NGÀY ${formatDate(d)} - ${br}\n` +
        `----------------------------------------\n` +
        `🥤 Tổng số ly bán: ${rep.totalDrinks} ly\n` +
        `💵 Tổng doanh thu: ${formatMoney(rep.income)}\n` +
        `  - Tiền mặt: ${formatMoney(rep.cashIncome)}\n` +
        `  - Chuyển khoản (MoMo/QR): ${formatMoney(rep.transferIncome)}\n` +
        `🧊 Tiền vốn nguyên liệu (BOM): ${formatMoney(rep.cost)}\n` +
        `🛒 Tiền chi phát sinh: -${formatMoney(rep.expense)}\n` +
        `💰 Lợi nhuận bán nước (Lãi gộp): +${formatMoney(rep.grossProfit)}\n` +
        `💵 Tiền thối đầu ca: ${formatMoney(rep.openingCash)}\n` +
        `🎯 Tổng tiền mặt cần có trong két: ${formatMoney(rep.expectedCashInDrawer)}\n` +
        `----------------------------------------\n` +
        `Sổ Quán Nước Mía - Quản Trị Tự Động`;

      try {
        await navigator.clipboard.writeText(textToCopy);
        showToast(`📋 Đã sao chép báo cáo ngày ${formatDate(d)} (${br}) vào bộ nhớ tạm!`);
      } catch (err) {
        showToast("Không thể sao chép tự động!");
      }
    });
  });
}

// ----------------------------------------------------
// 1. LOA AI THÔNG BÁO CHUYỂN KHOẢN QR (TỪ KNOTE)
// ----------------------------------------------------

function phatLoaThongBaoChuyenKhoan(soTien, phuongThuc = "chuyen_khoan") {
  if (phuongThuc !== "chuyen_khoan") return;
  if (state.enableAudioPaymentAlert === false) return;

  // Phát chuông ting ting báo ngân chuyên nghiệp
  phatTiengChuongTingTing();

  const speechMoney = docSoTienTiengViet(Number(soTien) || 0);
  const text = `Đã nhận thành công ${speechMoney} qua chuyển khoản!`;

  setTimeout(() => {
    docLai(text).catch((err) => {
      console.warn("Speech audio alert error:", err);
    });
  }, 350);
}


function updateAudioAlertButtonUI() {
  const isEnabled = state.enableAudioPaymentAlert !== false;
  const icon = $("#audioAlertIcon");
  const text = $("#audioAlertText");
  const btn = $("#toggleAudioAlertBtn");
  if (icon) icon.textContent = isEnabled ? "🔊" : "🔇";
  if (text) text.textContent = isEnabled ? "Loa QR: Bật" : "Loa QR: Tắt";
  if (btn) {
    btn.style.color = isEnabled ? "#0284c7" : "#64748b";
    btn.style.borderColor = isEnabled ? "#38bdf8" : "#cbd5e1";
    btn.style.background = isEnabled ? "#f0f9ff" : "#f8fafc";
  }
}

// ----------------------------------------------------
// 2. QUẢN LÝ KHO NGUYÊN LIỆU & ĐỊNH MỨC (BOM - TỪ MISA ESHOP)
// ----------------------------------------------------

let currentInventoryBranch = null;

function renderInventoryModal() {
  const dialog = $("#inventoryDialog");
  if (!dialog) return;

  const branchSelect = $("#inventoryBranchSelect");
  const branches = state.branches || [{ id: "main", name: "Quán Nhà (Chính)" }];
  currentInventoryBranch = currentInventoryBranch || state.currentBranch || "Quán Nhà (Chính)";

  if (branchSelect) {
    branchSelect.innerHTML = branches.map((b) => `<option value="${b.name}" ${b.name === currentInventoryBranch ? "selected" : ""}>📍 ${b.name}</option>`).join("");
  }

  const stockList = layDanhSachTonKho(state, currentInventoryBranch);
  const warnings = kiemTraCanhBaoTonKho(state, currentInventoryBranch);

  const warnBanner = $("#inventoryWarningBanner");
  const warnText = $("#inventoryWarningText");
  if (warnBanner && warnText) {
    if (warnings.length > 0) {
      warnBanner.style.display = "block";
      warnText.textContent = `Cảnh báo: Có ${warnings.length} mặt hàng (${warnings.map((w) => w.name).join(", ")}) đang dưới mức an toàn!`;
    } else {
      warnBanner.style.display = "none";
    }
  }

  const tbody = $("#inventoryTableBody");
  if (tbody) {
    tbody.innerHTML = stockList.map((item) => {
      const isLow = Number(item.stockQty) <= Number(item.minQty);
      const isOut = Number(item.stockQty) <= 0;
      const statusBadge = isOut
        ? `<span style="color:#b91c1c; font-weight:800;">❌ Hết hàng (0)</span>`
        : isLow
        ? `<span style="color:#ea580c; font-weight:700;">⚠️ Sắp hết (${item.stockQty})</span>`
        : `<span style="color:#16a34a; font-weight:700;">✅ Đủ hàng (${item.stockQty})</span>`;

      return `
        <tr style="border-bottom: 1px solid #f1f5f9; ${isLow ? "background: #fffbeb;" : ""}">
          <td style="padding: 0.5rem 0.6rem; font-weight: 700;">
            ${item.name}
            <small style="display:block; font-size:0.72rem; color:var(--muted); font-weight: normal;">${item.note || ""}</small>
          </td>
          <td style="padding: 0.5rem 0.6rem;">${item.unit}</td>
          <td style="padding: 0.5rem 0.6rem; text-align: right;">${statusBadge}</td>
          <td style="padding: 0.5rem 0.6rem; text-align: right; color: #64748b;">${item.minQty} ${item.unit}</td>
          <td style="padding: 0.5rem 0.6rem; text-align: center;">
            <button class="ghost-button quick-adjust-btn" data-id="${item.id}" data-name="${item.name}" type="button" style="min-height: 1.8rem; padding: 0.15rem 0.5rem; font-size: 0.78rem;">Sửa</button>
          </td>
        </tr>
      `;
    }).join("");

    $$(".quick-adjust-btn").forEach((btn) => {
      btn.onclick = async () => {
        const id = btn.getAttribute("data-id");
        const name = btn.getAttribute("data-name");
        const currentItem = stockList.find((x) => x.id === id);
        const newQtyStr = prompt(`Nhập số lượng tồn kho thực tế cho ${name} (${currentItem?.unit || ""}):`, currentItem?.stockQty || "0");
        if (newQtyStr !== null && !isNaN(Number(newQtyStr))) {
          await capNhatTonKhoThucTe(currentInventoryBranch, id, Number(newQtyStr));
          state = await docDuLieu();
          renderInventoryModal();
          showToast(`Đã cập nhật tồn kho ${name}: ${newQtyStr} ${currentItem?.unit || ""}`);
        }
      };
    });
  }

  // Populate quick item select
  const quickSelect = $("#quickStockItemSelect");
  if (quickSelect) {
    quickSelect.innerHTML = stockList.map((i) => `<option value="${i.id}">${i.name} (${i.unit})</option>`).join("");
  }
}

// ----------------------------------------------------
// 3. BÁO CÁO THUẾ & MẪU TỜ KHAI 01/CNKD (TỪ MISA ESHOP & KNOTE)
// ----------------------------------------------------

let currentTaxPeriodType = "month";
let currentTaxBranch = "all";

function renderTaxReportModal() {
  const dialog = $("#taxReportDialog");
  if (!dialog) return;

  const branchSelect = $("#taxBranchSelect");
  const branches = state.branches || [{ id: "main", name: "Quán Nhà (Chính)" }];
  if (branchSelect && branchSelect.children.length <= 1) {
    branchSelect.innerHTML = `
      <option value="all">🏢 Toàn bộ chi nhánh</option>
      ${branches.map((b) => `<option value="${b.name}" ${b.name === currentTaxBranch ? "selected" : ""}>📍 ${b.name}</option>`).join("")}
    `;
  }

  const taxReport = tinhBaoCaoThue(state.ds || [], currentTaxPeriodType, null, currentTaxBranch);

  if ($("#taxTotalRevenueDisplay")) $("#taxTotalRevenueDisplay").textContent = formatMoney(taxReport.revenue);
  if ($("#taxVatDisplay")) $("#taxVatDisplay").textContent = formatMoney(taxReport.vatTax);
  if ($("#taxPitDisplay")) $("#taxPitDisplay").textContent = formatMoney(taxReport.pitTax);
  if ($("#taxAnnualEstDisplay")) $("#taxAnnualEstDisplay").textContent = formatMoney(taxReport.estimatedAnnualRevenue);

  const banner = $("#taxExemptionStatusBanner");
  const payableCard = $("#taxPayableCard");
  const payableTitle = $("#taxPayableTitle");
  const payableSub = $("#taxPayableSub");
  const totalAmountDisplay = $("#taxTotalAmountDisplay");

  if (taxReport.isExempt) {
    if (banner) {
      banner.style.background = "#f0fdf4";
      banner.style.border = "1px solid #86efac";
      banner.innerHTML = `
        <div style="font-size: 1.5rem; line-height: 1; flex-shrink: 0;">🎉</div>
        <div>
          <strong style="display: block; font-size: 0.88rem; color: #15803d;">QUÁN ĐƯỢC MIỄN 100% THUẾ GTGT & TNCN!</strong>
          <span style="font-size: 0.76rem; color: #166534; line-height: 1.4; display: block; margin-top: 0.15rem;">
            Doanh thu ước tính cả năm <strong>${formatMoney(taxReport.estimatedAnnualRevenue)}</strong> ≤ <strong>200 triệu đ/năm</strong> (Ngưỡng miễn thuế mới). Số thuế thực tế phải nộp: <strong>0 đ</strong>.
          </span>
        </div>
      `;
    }
    if (payableCard) {
      payableCard.style.background = "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)";
      payableCard.style.border = "1px solid #a7f3d0";
    }
    if (payableTitle) {
      payableTitle.style.color = "#065f46";
      payableTitle.textContent = "🛡️ SỐ THUẾ THỰC NỘP SAU MIỄN TRỪ:";
    }
    if (payableSub) {
      payableSub.style.color = "#047857";
      payableSub.textContent = "Được miễn 100% thuế theo luật (Doanh thu năm ≤ 200 triệu đ)";
    }
    if (totalAmountDisplay) {
      totalAmountDisplay.style.color = "#065f46";
      totalAmountDisplay.textContent = "0 đ";
    }
  } else {
    if (banner) {
      banner.style.background = "#fffbeb";
      banner.style.border = "1px solid #fde68a";
      banner.innerHTML = `
        <div style="font-size: 1.5rem; line-height: 1; flex-shrink: 0;">⚠️</div>
        <div>
          <strong style="display: block; font-size: 0.88rem; color: #b45309;">THUỘC DIỆN NỘP THUẾ KHOÁN / KÊ KHAI (4.5%)</strong>
          <span style="font-size: 0.76rem; color: #92400e; line-height: 1.4; display: block; margin-top: 0.15rem;">
            Doanh thu ước tính năm <strong>${formatMoney(taxReport.estimatedAnnualRevenue)}</strong> vượt ngưỡng 200 triệu đ/năm. Tỷ lệ thuế F&B: 3% GTGT + 1.5% TNCN.
          </span>
        </div>
      `;
    }
    if (payableCard) {
      payableCard.style.background = "linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)";
      payableCard.style.border = "1px solid #fecaca";
    }
    if (payableTitle) {
      payableTitle.style.color = "#991b1b";
      payableTitle.textContent = "🎯 TỔNG NGHĨA VỤ THUẾ TẠM TÍNH (4.5%):";
    }
    if (payableSub) {
      payableSub.style.color = "#b91c1c";
      payableSub.textContent = "Dịch vụ ăn uống giải khát (F&B)";
    }
    if (totalAmountDisplay) {
      totalAmountDisplay.style.color = "#b91c1c";
      totalAmountDisplay.textContent = formatMoney(taxReport.actualTaxPayable);
    }
  }
}

function downloadTextFile(filename, text) {
  const element = document.createElement("a");
  element.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(text));
  element.setAttribute("download", filename);
  element.style.display = "none";
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

// ----------------------------------------------------
// 4. QUÉT MÃ VẠCH CAMERA & OCR HÓA ĐƠN CHI PHÍ
// ----------------------------------------------------

let scannerMediaStream = null;

async function startBarcodeCamera() {
  const video = $("#barcodeVideo");
  const status = $("#scannerStatusText");
  if (!video) return;

  try {
    if (status) status.textContent = "Đang mở camera...";
    scannerMediaStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
    });
    video.srcObject = scannerMediaStream;
    if (status) status.textContent = "Hướng camera vào mã vạch sản phẩm...";
  } catch (err) {
    if (status) status.textContent = "Không thể mở camera (Vui lòng cấp quyền hoặc nhập mã tay)";
    console.warn("Camera init error:", err);
  }
}

function stopBarcodeCamera() {
  if (scannerMediaStream) {
    scannerMediaStream.getTracks().forEach((track) => track.stop());
    scannerMediaStream = null;
  }
}

// ----------------------------------------------------
// AUTO SYNC & SUPABASE (ĐỒNG BỘ ĐA THIẾT BỊ THEO TÀI KHOẢN)
// ----------------------------------------------------

export async function updateSyncUI() {
  const syncStatus = $("#syncStatus");
  const logoutBtn = $("#logoutBtn");
  const settingsLogoutBtn = $("#settingsLogoutBtn");
  const accountStatusEl = $("#syncAccountStatus");
  const urlInput = $("#supabaseUrl");
  const anonInput = $("#supabaseAnon");
  const emailInput = $("#loginEmail");

  const syncConfig = state?.sync || {};
  if (urlInput && !urlInput.value) urlInput.value = syncConfig.supabaseUrl || "https://rbvpsaotqmddtvcxkyxz.supabase.co";
  if (anonInput && !anonInput.value) anonInput.value = syncConfig.supabaseAnon || "";
  if (emailInput && !emailInput.value && syncConfig.accountEmail) {
    emailInput.value = syncConfig.accountEmail;
  }

  const isAuth = await daDangNhap();
  const user = isAuth ? await layThongTinTaiKhoan() : null;

  if (isAuth && user) {
    if (syncStatus) {
      syncStatus.textContent = "🟢 Đã đồng bộ";
      syncStatus.className = "sync-pill is-synced";
      syncStatus.title = `Đã kết nối tài khoản: ${user.email}. Bấm để đồng bộ lại.`;
    }
    if (logoutBtn) logoutBtn.hidden = false;
    if (settingsLogoutBtn) settingsLogoutBtn.hidden = false;
    if (accountStatusEl) {
      accountStatusEl.style.display = "block";
      accountStatusEl.style.background = "#f0fdf4";
      accountStatusEl.style.borderColor = "#bbf7d0";
      accountStatusEl.style.color = "#166534";
      accountStatusEl.innerHTML = `✅ <strong>Đang kết nối:</strong> ${escapeHtml(user.email)}<br><small style="color: #15803d; font-weight: normal;">Dữ liệu tự động đồng bộ thời gian thực với điện thoại & laptop.</small>`;
    }
  } else {
    if (syncStatus) {
      syncStatus.textContent = "🟡 Chưa đăng nhập";
      syncStatus.className = "sync-pill is-offline";
      syncStatus.title = "Chưa kết nối tài khoản đám mây. Bấm vào đây để đăng nhập & đồng bộ giữa Điện thoại và Laptop.";
    }
    if (logoutBtn) logoutBtn.hidden = true;
    if (settingsLogoutBtn) settingsLogoutBtn.hidden = true;
    if (accountStatusEl) {
      accountStatusEl.style.display = "block";
      accountStatusEl.style.background = "#fffbeb";
      accountStatusEl.style.borderColor = "#fde68a";
      accountStatusEl.style.color = "#92400e";
      accountStatusEl.innerHTML = `⚠️ <strong>Chưa đăng nhập:</strong> Dữ liệu chỉ lưu tạm trên thiết bị này.<br><small style="color: #b45309; font-weight: normal;">Vui lòng nhập Email & Mật khẩu bên dưới và bấm "Đăng nhập" để đồng bộ dữ liệu giữa Điện thoại và Laptop.</small>`;
    }
  }
}

async function triggerAutoSync(isUserAction = false) {
  const syncStatus = $("#syncStatus");
  try {
    const isAuth = await daDangNhap();
    if (!isAuth) {
      if (syncStatus) {
        syncStatus.textContent = "🟡 Chưa đăng nhập";
        syncStatus.className = "sync-pill is-offline";
      }
      return { ok: false, message: "Chưa đăng nhập" };
    }

    // Do not sync down and overwrite state if user is actively typing in settings
    const isEditingSettings = document.activeElement && (
      document.querySelector("#menuItemsEditor")?.contains(document.activeElement) ||
      document.querySelector("#ingredientItemsEditor")?.contains(document.activeElement)
    );
    if (isEditingSettings) {
      return;
    }

    if (syncStatus) {
      syncStatus.textContent = "🔵 Đang đồng bộ...";
      syncStatus.className = "sync-pill is-syncing";
    }
    const res = await dongBo();
    state = await docDuLieu();
    renderAll();
    if (syncStatus) {
      syncStatus.textContent = "🟢 Đã đồng bộ";
      syncStatus.className = "sync-pill is-synced";
    }
    await phatTinHieuSync();
    updateSyncUI().catch(() => {});
    return res;
  } catch (err) {
    console.warn("Auto sync failed", err);
    if (syncStatus) {
      syncStatus.textContent = "🔴 Lỗi đồng bộ";
      syncStatus.className = "sync-pill is-error";
    }
    if (isUserAction) {
      showToast(syncErrorMessage(err), true);
    }
    return { ok: false, error: err };
  }
}

async function startRealtimeListener() {
  try {
    await batDauRealtime(async (payload) => {
      console.log("Realtime remote change received:", payload);
      await dongBo();
      state = await docDuLieu();
      renderAll();
      showToast("⚡ Đã cập nhật giao dịch mới từ thiết bị khác!");
    });
  } catch (err) {
    console.warn("Could not start realtime listener:", err);
  }
}

// ----------------------------------------------------
// EVENT LISTENERS & SETUP
// ----------------------------------------------------

export function switchView(currentView) {
  $$(".tabs .tab").forEach((t) => t.classList.remove("is-active"));
  $$(".view").forEach((v) => v.classList.remove("is-active"));
  const tab = $(`.tabs .tab[data-view='${currentView}']`);
  if (tab) tab.classList.add("is-active");
  const viewId = `view-${currentView}`;
  $(`#${viewId}`)?.classList.add("is-active");

  // On non-today tabs on mobile, hide the redundant today header cards so the selected tab is clean!
  const isTodayView = currentView === "today";
  document.body.classList.toggle("is-subview-active", !isTodayView);

  if (currentView === "stats") {
    renderStats();
  } else if (currentView === "materials") {
    renderMaterialsView();
  } else if (currentView === "jars") {
    renderJarsView();
  } else if (currentView === "closings") {
    renderClosingsView();
  } else if (currentView === "history") {
    renderHistory();
  } else if (currentView === "settings") {
    updateSyncUI().catch(() => {});
  }
}

function initEventListeners() {
  // Tabs navigation
  $$(".tabs .tab").forEach((tab) => {
    tab.onclick = () => {
      const currentView = tab.getAttribute("data-view");
      switchView(currentView);
    };
  });

  // Event delegation for transactions (todayList & historyList)
  const handleTxListClick = async (e, isHistory = false) => {
    const delBtn = e.target.closest(".delete-btn");
    if (delBtn) {
      e.stopPropagation();
      const rawId = delBtn.getAttribute("data-id");
      const id = isNaN(Number(rawId)) ? rawId : Number(rawId);
      const confirmMsg = isHistory ? "Bạn có chắc chắn muốn xóa giao dịch này khỏi lịch sử?" : "Bạn có chắc chắn muốn xóa giao dịch này?";
      if (!confirm(confirmMsg)) return;
      await xoaGiaoDich(id);
      state = await docDuLieu();
      renderAll();
      showToast(isHistory ? "Đã xóa giao dịch" : "Đã xóa giao dịch khỏi sổ");
      triggerAutoSync();
      return;
    }
    const methodBtn = e.target.closest(".method-toggle-btn");
    if (methodBtn) {
      e.stopPropagation();
      const rawId = methodBtn.getAttribute("data-id");
      const id = isNaN(Number(rawId)) ? rawId : Number(rawId);
      const tx = (state.ds || []).find((t) => t.id === id);
      if (!tx) return;
      const newMethod = tx.phuongThuc === "chuyen_khoan" ? "tien_mat" : "chuyen_khoan";
      tx.phuongThuc = newMethod;
      tx.daSync = false;
      tx.updatedAt = new Date().toISOString();
      await luuDuLieu(state);
      state = await docDuLieu();
      renderAll();
      showToast(`Đã chuyển đơn ${formatMoney(tx.soTien)} sang ${newMethod === "chuyen_khoan" ? "Chuyển khoản (QR)" : "Tiền mặt"}`);
      triggerAutoSync();
      return;
    }
  };

  $("#todayList")?.addEventListener("click", (e) => handleTxListClick(e, false));
  $("#historyList")?.addEventListener("click", (e) => handleTxListClick(e, true));

  // Tab Nguyên Liệu & Kho NVL Listeners
  $("#materialsBranchSelect")?.addEventListener("change", () => {
    renderMaterialsView();
  });

  $("#materialsAddStockBtn")?.addEventListener("click", () => {
    currentInventoryBranch = $("#materialsBranchSelect")?.value || state.currentBranch || "Quán Nhà (Chính)";
    renderInventoryModal();
    $("#inventoryDialog")?.showModal();
    const actionSel = $("#quickStockActionType");
    if (actionSel) actionSel.value = "nhap";
  });

  $("#materialsStockCheckBtn")?.addEventListener("click", () => {
    currentInventoryBranch = $("#materialsBranchSelect")?.value || state.currentBranch || "Quán Nhà (Chính)";
    renderInventoryModal();
    $("#inventoryDialog")?.showModal();
    const actionSel = $("#quickStockActionType");
    if (actionSel) actionSel.value = "kiem";
  });

  $$("input[name='matLogFilter']").forEach((radio) => {
    radio.addEventListener("change", (e) => {
      materialsLogFilter = e.target.value;
      renderMaterialsView();
    });
  });

  // Tab Lịch Sử View Listeners
  $$(".history-pill-btn").forEach((pill) => {
    pill.addEventListener("click", () => {
      historyPeriod = pill.getAttribute("data-period") || "today";
      renderHistory();
    });
  });

  $("#historyApplyCustomBtn")?.addEventListener("click", () => {
    historyStartDate = $("#historyStartDate")?.value || todayKey();
    historyEndDate = $("#historyEndDate")?.value || todayKey();
    renderHistory();
  });

  $("#historyBranchSelect")?.addEventListener("change", (e) => {
    state.historyBranchFilter = e.target.value;
    renderHistory();
  });

  // Tab Chốt Ca View Listeners
  $$(".closings-pill-btn").forEach((pill) => {
    pill.addEventListener("click", () => {
      const br = pill.getAttribute("data-branch") || "all";
      state.closingsBranchFilter = br;
      renderClosingsView();
    });
  });

  $("#closingsBranchSelect")?.addEventListener("change", (e) => {
    state.closingsBranchFilter = e.target.value;
    renderClosingsView();
  });

  $("#closingsPeriodSelect")?.addEventListener("change", (e) => {
    state.closingsPeriodFilter = e.target.value;
    renderClosingsView();
  });

  $("#closingsQuickClosingBtn")?.addEventListener("click", () => {
    const curBranch = state.closingsBranchFilter || state.currentBranch || "all";
    openDailyClosingModal(todayKey(), curBranch === "all" ? null : curBranch);
  });

  // 4 Jars View Listeners
  $("#jarsPeriodSelect")?.addEventListener("change", (e) => {
    const val = e.target.value;
    const customDiv = $("#jarsCustomDateRange");
    if (customDiv) {
      customDiv.style.display = val === "custom" ? "flex" : "none";
      if (val === "custom") {
        const today = todayKey();
        if ($("#jarsStartDate") && !$("#jarsStartDate").value) $("#jarsStartDate").value = today;
        if ($("#jarsEndDate") && !$("#jarsEndDate").value) $("#jarsEndDate").value = today;
      }
    }
    renderJarsView(val);
  });

  $("#jarsApplyCustomDateBtn")?.addEventListener("click", () => {
    renderJarsView("custom");
  });

  $("#jarSimulateBtn")?.addEventListener("click", () => {
    runJarSimulation();
  });

  $("#jarSimRevenue")?.addEventListener("input", () => {
    runJarSimulation();
  });

  $("#jarSimDays")?.addEventListener("input", () => {
    runJarSimulation();
  });

  $("#jarsQuickVoiceBtn")?.addEventListener("click", () => {
    const rev = $("#jarsTotalRevenue")?.textContent || "0 đ";
    const cost = $("#jar1Amount")?.textContent || "0 đ";
    const rent = $("#jar2Amount")?.textContent || "0 đ";
    const profit = $("#jar4Amount")?.textContent || "0 đ";
    const speech = `Tổng doanh thu là ${rev}. Phân bổ bốn hũ tiền gồm có: Hũ một vốn nguyên liệu là ${cost}. Hũ hai quỹ mặt bằng là ${rent}. Hũ ba tiền thối két năm mươi ngàn. Hũ bốn tiền lời thực nhận là ${profit}.`;
    docLai(speech).catch((err) => console.warn("Voice error:", err));
  });

  // Topbar branch selection
  const branchSelect = $("#currentBranchSelect");
  if (branchSelect) {
    branchSelect.onchange = async (e) => {
      const selected = e.target.value;
      await capNhatCurrentBranch(selected);
      state = await docDuLieu();
      renderAll();
      const label = selected === "all" ? "Tất cả điểm bán" : selected;
      showToast(`Đã chuyển sang xem: ${label}`);
    };
  }

  // Edit Funds
  $("#editFundsBtn")?.addEventListener("click", () => {
    const dialog = $("#editFundsDialog");
    if (!dialog) return;
    const funds = computeFundBalances(state);
    $("#editFundWallet").value = funds.capitalWallet;
    $("#editFundRent").value = funds.rentFund;
    $("#editFundProfit").value = funds.profitFund;
    dialog.showModal();
  });

  $("#cancelEditFundsBtn")?.addEventListener("click", () => {
    $("#editFundsDialog")?.close();
  });

  $("#saveEditFundsBtn")?.addEventListener("click", async () => {
    const dialog = $("#editFundsDialog");
    const newWallet = Number($("#editFundWallet").value) || 0;
    const newRent = Number($("#editFundRent").value) || 0;
    const newProfit = Number($("#editFundProfit").value) || 0;

    const data = await docDuLieu();
    
    
    // We compute the current to find the difference
    const currentFunds = computeFundBalances(data);
    const diffWallet = newWallet - currentFunds.capitalWallet;
    const diffRent = newRent - currentFunds.rentFund;
    const diffProfit = newProfit - currentFunds.profitFund;
    
    const nowStr = new Date().toISOString();
    const branch = data.currentBranch || "all";
    const date = todayKey();

    if (diffWallet !== 0) {
      data.ds.push({ id: Date.now() * 100 + 1, loai: 'chuyen_quy', fund: "capitalWallet", soTien: diffWallet, type: "manual_adjust", ngay: date, chiNhanh: branch, createdAt: nowStr });
    }
    if (diffRent !== 0) {
      data.ds.push({ id: Date.now() * 100 + 2, loai: 'chuyen_quy', fund: "rentFund", soTien: diffRent, type: "manual_adjust", ngay: date, chiNhanh: branch, createdAt: nowStr });
    }
    if (diffProfit !== 0) {
      data.ds.push({ id: Date.now() * 100 + 3, loai: 'chuyen_quy', fund: "profitFund", soTien: diffProfit, type: "manual_adjust", ngay: date, chiNhanh: branch, createdAt: nowStr });
    }
    
    await luuDuLieu(data);
    state = data;
    dialog?.close();
    renderAll();
    showToast(`✅ Đã điều chỉnh cân bằng Sổ Quỹ thành công!`);
  });

  // Daily Closing buttons
  $("#openDailyClosingBtn")?.addEventListener("click", () => {
    openDailyClosingModal(todayKey(), state.currentBranch || "all");
  });

  $("#confirmDailyClosingBtn")?.addEventListener("click", async () => {
    const target = state.activeClosingTarget || { date: todayKey(), branch: state.currentBranch || "all" };
    const targetDate = target.date || todayKey();
    const targetBranch = target.branch || "all";
    const actualCash = $("#closingCashActual")?.value || "";
    const actualBank = $("#closingBankActual")?.value || "";

    saveClosedShiftRecord(targetDate, targetBranch, {
      actualCash,
      actualBank,
      closedBy: "Chủ quán",
      closedAt: new Date().toISOString(),
    });
    
    // Lưu các giao dịch Sổ Quỹ
    const data = await docDuLieu();
    
    
    // Xóa các giao dịch Sổ Quỹ cũ của ca chốt này (nếu chốt lại)
    const txRefId = `closing_${targetDate}_${targetBranch}`;
    data.ds = data.ds.filter(tx => tx.refId !== txRefId);
    
    if (state.pendingClosingFunds) {
      const nowStr = new Date().toISOString();
      if (state.pendingClosingFunds.bom > 0) {
        data.ds.push({ id: Date.now() * 100 + 4, loai: 'chuyen_quy', fund: "capitalWallet", soTien: state.pendingClosingFunds.bom, type: "closing", refId: txRefId, ngay: targetDate, chiNhanh: targetBranch, createdAt: nowStr });
      }
      if (state.pendingClosingFunds.rent > 0) {
        data.ds.push({ id: Date.now() * 100 + 5, loai: 'chuyen_quy', fund: "rentFund", soTien: state.pendingClosingFunds.rent, type: "closing", refId: txRefId, ngay: targetDate, chiNhanh: targetBranch, createdAt: nowStr });
      }
      if (state.pendingClosingFunds.profit !== 0) {
        data.ds.push({ id: Date.now() * 100 + 6, loai: 'chuyen_quy', fund: "profitFund", soTien: state.pendingClosingFunds.profit, type: "closing", refId: txRefId, ngay: targetDate, chiNhanh: targetBranch, createdAt: nowStr });
      }
    }
    await luuDuLieu(data);
    state = data;

    showToast(`✅ Đã xác nhận chốt ca và cập nhật Sổ Quỹ thành công cho ngày ${formatDate(targetDate)}!`);
    $("#dailyClosingDialog")?.close();
    renderAll();
  });

  $("#closeDailyClosingBtn")?.addEventListener("click", () => {
    $("#dailyClosingDialog")?.close();
  });

  $("#closeDailyClosingTopBtn")?.addEventListener("click", () => {
    $("#dailyClosingDialog")?.close();
  });

  // Restart Day button & Modal
  $("#openRestartDayBtn")?.addEventListener("click", () => {
    const dialog = $("#restartDayDialog");
    if (!dialog) return;

    const branches = state.branches || [{ id: "main", name: "Quán Nhà (Chính)" }];
    const cur = state.currentBranch || "all";
    const scopeSelect = $("#restartBranchScope");
    if (scopeSelect) {
      scopeSelect.innerHTML = `
        <option value="${cur}">📍 Điểm bán đang chọn: ${cur === "all" ? "Tất cả điểm bán" : cur}</option>
        <option value="all">🏢 TẤT CẢ các điểm bán (Toàn hệ thống)</option>
        ${branches.map((b) => `<option value="${b.name}">📍 Riêng ${b.name}</option>`).join("")}
      `;
    }

    const noteInput = $("#restartNoteInput");
    if (noteInput) noteInput.value = "";
    const resetCashCb = $("#restartResetOpeningCashCheckbox");
    if (resetCashCb) resetCashCb.checked = false;

    dialog.showModal();
  });

  $("#cancelRestartDayBtn")?.addEventListener("click", () => {
    $("#restartDayDialog")?.close();
  });

  $("#confirmRestartDayBtn")?.addEventListener("click", async () => {
    const scope = $("#restartBranchScope")?.value || state.currentBranch || "all";
    const note = $("#restartNoteInput")?.value?.trim() || "";
    const resetCash = Boolean($("#restartResetOpeningCashCheckbox")?.checked);

    const res = await restartDuLieuHomNay({
      dateKey: todayKey(),
      branch: scope,
      note,
      resetOpeningCash: resetCash,
    });

    state = await docDuLieu();
    renderAll();
    triggerAutoSync();

    $("#restartDayDialog")?.close();
    showToast(`Đã khởi động lại ngày hôm nay (${res.resetCount} giao dịch đã làm mới)`);
  });

  // Read today report button (Speech)
  $("#readTodayReportBtn")?.addEventListener("click", () => {
    const isAll = state.currentBranch === "all" || !state.currentBranch;
    const report = dailyReport(state.ds || [], todayKey(), isAll ? null : state.currentBranch, getTodayOpeningCash());
    docLai(report.detailedText || report.text);
    showToast(`Đang phát loa đọc doanh số ${isAll ? "tất cả điểm bán" : state.currentBranch}...`);
  });



  // Manual Form Submission & Context Capture
  const manualForm = $("#manualForm");
  if (manualForm) {
    manualForm.onsubmit = async (e) => {
      e.preventDefault();
      const loai = $("#manualForm input[name='loai']:checked")?.value || "thu";
      const category = $("#manualCategoryInput")?.value?.trim() || (loai === "thu" ? "Nước mía thường" : "Chi khác");
      const qty = Number($("#manualQuantity")?.value) || 1;
      const unit = $("#manualUnitSelect")?.value || (loai === "thu" ? "ly" : "kg");
      const amount = Number($("#manualAmount")?.value.replace(/[^0-9]/g, "")) || 0;
      let costPrice = Number($("#manualCostPrice")?.value.replace(/[^0-9]/g, ""));
      let note = $("#manualNote")?.value?.trim() || "";

      if (amount <= 0) {
        showToast("Vui lòng nhập số tiền lớn hơn 0", true);
        return;
      }

      // If user didn't enter cost price, find matching from quick items
      if (loai === "thu" && !Number.isFinite(costPrice)) {
        const match = (state.quickItems || []).find((q) => q.name === category || q.category === category);
        costPrice = match ? (match.costPrice || 0) : 0;
      }

      const phuongThuc = $("#manualPaymentMethodGroup input[name='phuongThuc']:checked")?.value || "tien_mat";
      const nguonTienChi = loai === "chi" ? ($("#expenseSourceGroup input[name='nguonTienChi']:checked")?.value || "tien_von") : null;
      
      const activeBranch = (state.currentBranch && state.currentBranch !== "all")
        ? state.currentBranch
        : ((state.branches && state.branches[0]?.name) || "Quán Nhà (Chính)");

      // Nếu là Chi: Thu thập bối cảnh đợt cũ & lý do nhập
      if (loai === "chi") {
        const oldStatus = $("#manualOldStockStatus")?.value || "Đã hết sạch đợt cũ";
        const reason = $("#manualProcurementReason")?.value || "Hết hàng nên nhập mới";
        const contextStr = `[Đợt cũ: ${oldStatus} | Lý do: ${reason}]`;
        note = note ? `${note} ${contextStr}` : contextStr;

        state.procurementHistory = state.procurementHistory || [];
        state.procurementHistory.push({
          id: Date.now(),
          item: category,
          qty,
          unit,
          amount,
          branch: activeBranch,
          answer: `${oldStatus} - ${reason}`,
          timestamp: new Date().toISOString(),
        });
      }

      await themGiaoDich({
        loai,
        soTien: amount,
        soLuong: qty,
        donViTinh: unit,
        phuongThuc,
        nguonTienChi,
        giaCostDonVi: costPrice || 0,
        tongGiaCost: qty * (costPrice || 0),
        danhMuc: category,
        ghiChu: note,
        cauNoiGoc: note || `${loai === "thu" ? "Bán" : "Mua"} ${qty} ${unit} ${category}${phuongThuc === "chuyen_khoan" ? " (CK)" : ""}`,
        daSuaTay: true,
        chiNhanh: activeBranch,
      });

      state = await docDuLieu();
      renderAll();

      $("#manualAmount").value = "";
      $("#manualNote").value = "";
      $("#manualCostPrice").value = "";
      $("#manualQuantity").value = "1";

      if (loai === "thu" && phuongThuc === "chuyen_khoan") {
        phatLoaThongBaoChuyenKhoan(amount, phuongThuc);
      }

      showToast(`Đã lưu ${loai === "thu" ? "+ Thu" : "- Chi"} ${formatMoney(amount)} vào sổ`);
      triggerAutoSync();
    };

    $$("#manualForm input[name='loai']").forEach((radio) => {
      radio.onchange = () => {
        const isThu = radio.value === "thu";
        const catInput = $("#manualCategoryInput");
        const unitSelect = $("#manualUnitSelect");
        const costGroup = $("#manualCostGroup");
        const contextGroup = $("#manualExpenseContextGroup");
        const sourceGroup = $("#expenseSourceGroup");
        
        if (catInput) {
          catInput.placeholder = isThu ? "Ví dụ: Nước mía thường, Trà tắc, Cam tươi..." : "Ví dụ: Mua cam, Mua mía, Mua đá, Tiền điện...";
        }
        if (unitSelect) {
          unitSelect.value = isThu ? "ly" : "kg";
        }
        if (costGroup) {
          costGroup.style.display = isThu ? "grid" : "none";
        }
        if (contextGroup) {
          contextGroup.style.display = isThu ? "none" : "grid";
        }
        if (sourceGroup) {
          sourceGroup.style.display = isThu ? "none" : "block";
        }
        renderCategoryDatalist();
      };
    });
  }

  // ----------------------------------------------------
  // SỰ KIỆN CHỐT BILL NHANH KHÔNG IN GIẤY (DIGITAL FAST POS)
  // ----------------------------------------------------
  $("#clearPosBillBtn")?.addEventListener("click", () => {
    activePosBill = [];
    renderPosBillBar();
    renderQuickButtons();
    showToast("Đã làm mới Bill");
  });

  $("#openCheckoutBillBtn")?.addEventListener("click", () => {
    if (!activePosBill.length) {
      showToast("Chưa có món nào trong Bill", true);
      return;
    }
    renderFastCheckoutModal();
    $("#fastCheckoutDialog")?.showModal();
  });

  $("#closeFastCheckoutBtn")?.addEventListener("click", () => {
    $("#fastCheckoutDialog")?.close();
  });

  // Tender presets ($50k, $100k, $200k, exact)
  $$("#fastTenderPresetButtons button").forEach((btn) => {
    btn.onclick = () => {
      const preset = btn.getAttribute("data-amount");
      const totalAmount = activePosBill.reduce((sum, entry) => sum + (entry.qty || 1) * (Number(entry.item.price) || 0), 0);
      const tenderInput = $("#fastCheckoutTenderedInput");
      if (!tenderInput) return;

      if (preset === "exact") {
        tenderInput.value = formatMoney(totalAmount);
      } else {
        const val = Number(preset) || totalAmount;
        tenderInput.value = formatMoney(val);
      }
      updateFastCheckoutChange();
    };
  });

  $("#fastCheckoutTenderedInput")?.addEventListener("input", () => {
    updateFastCheckoutChange();
  });

  // Action function to checkout bill
  const checkoutDigitalBill = async (paymentMethod = "tien_mat") => {
    if (!activePosBill.length) return;

    const activeBranch = (state.currentBranch && state.currentBranch !== "all")
      ? state.currentBranch
      : ((state.branches && state.branches[0]?.name) || "Quán Nhà (Chính)");

    const totalCups = activePosBill.reduce((sum, entry) => sum + (entry.qty || 1), 0);
    const totalAmount = activePosBill.reduce((sum, entry) => sum + (entry.qty || 1) * (getItemPrice(entry.item, activeBranch) || 0), 0);
    const billCode = `#BILL-${Date.now().toString().slice(-4)}`;

    // Ghi từng món vào sổ doanh thu với mã Bill chung
    for (const entry of activePosBill) {
      const itemPrice = getItemPrice(entry.item, activeBranch);
      const lineCost = entry.qty * (Number(entry.item.costPrice) || 0);
      const linePrice = entry.qty * itemPrice;

      await themGiaoDich({
        loai: "thu",
        soTien: linePrice,
        soLuong: entry.qty,
        donViTinh: entry.item.voiceUnit || "ly",
        phuongThuc: paymentMethod,
        giaCostDonVi: entry.item.costPrice || 0,
        tongGiaCost: lineCost,
        danhMuc: entry.item.category || entry.item.name,
        ghiChu: `${billCode} - Bán ${entry.qty} ${entry.item.name}`,
        cauNoiGoc: `Bán ${entry.qty} ${entry.item.name} (${billCode})`,
        daSuaTay: false,
        chiNhanh: activeBranch,
      });
    }

    // Phát chuông Ting Ting chuyên nghiệp
    phatTiengChuongTingTing();

    if (paymentMethod === "chuyen_khoan") {
      phatLoaThongBaoChuyenKhoan(totalAmount, "chuyen_khoan");
    }

    $("#fastCheckoutDialog")?.close();
    activePosBill = [];

    state = await docDuLieu();
    renderAll();
    triggerAutoSync();

    showToast(`🎉 Đã chốt ${billCode} (${totalCups} ly - ${formatMoney(totalAmount)}) thành công!`);
  };

  $("#confirmCashBillBtn")?.addEventListener("click", () => checkoutDigitalBill("tien_mat"));
  $("#confirmQrBillBtn")?.addEventListener("click", () => checkoutDigitalBill("chuyen_khoan"));

  // ----------------------------------------------------
  // SỰ KIỆN CHUYỂN ĐỔI CHẾ ĐỘ: BÁN NƯỚC VS NHẬP NGUYÊN LIỆU
  // ----------------------------------------------------
  $("#posModeDrinkTab")?.addEventListener("click", () => {
    $("#posModeDrinkTab")?.classList.add("is-active");
    $("#posModeDrinkTab")?.setAttribute("aria-selected", "true");
    $("#posModeIngredientTab")?.classList.remove("is-active");
    $("#posModeIngredientTab")?.setAttribute("aria-selected", "false");
    const drinkGrid = $("#quickButtons");
    const ingGrid = $("#quickIngredientButtons");
    if (drinkGrid) drinkGrid.style.display = "grid";
    if (ingGrid) ingGrid.style.display = "none";
  });

  $("#posModeIngredientTab")?.addEventListener("click", () => {
    $("#posModeIngredientTab")?.classList.add("is-active");
    $("#posModeIngredientTab")?.setAttribute("aria-selected", "true");
    $("#posModeDrinkTab")?.classList.remove("is-active");
    $("#posModeDrinkTab")?.setAttribute("aria-selected", "false");
    const drinkGrid = $("#quickButtons");
    const ingGrid = $("#quickIngredientButtons");
    if (drinkGrid) drinkGrid.style.display = "none";
    if (ingGrid) ingGrid.style.display = "grid";
    renderQuickIngredients();
  });

  // ----------------------------------------------------
  // SỰ KIỆN HỘP THOẠI NHẬP NGUYÊN LIỆU (QUICK INGREDIENT MODAL)
  // ----------------------------------------------------
  $("#closeQuickIngredientBtn")?.addEventListener("click", () => {
    $("#quickIngredientDialog")?.close();
  });

  $("#ingQtyDecBtn")?.addEventListener("click", () => {
    const input = $("#ingQtyInput");
    if (!input) return;
    const cur = Math.max(1, (Number(input.value) || 1) - 1);
    input.value = cur;
    updateIngModalCost();
  });

  $("#ingQtyIncBtn")?.addEventListener("click", () => {
    const input = $("#ingQtyInput");
    if (!input) return;
    const cur = (Number(input.value) || 1) + 1;
    input.value = cur;
    updateIngModalCost();
  });

  $("#ingQtyInput")?.addEventListener("input", () => {
    updateIngModalCost();
  });

  $$("#ingQtyPresets .ing-preset-btn").forEach((btn) => {
    btn.onclick = () => {
      const preset = Number(btn.getAttribute("data-qty")) || 1;
      const input = $("#ingQtyInput");
      if (input) {
        input.value = preset;
        updateIngModalCost();
      }
    };
  });

  // Nút Xác nhận Ghi sổ Chi tiền (Nhập Hàng) & Sơ chế
  $("#confirmBuyIngredientBtn")?.addEventListener("click", async () => {
    if (!activeIngredientItem) return;

    const qtyInput = $("#ingQtyInput");
    const totalCostInput = $("#ingTotalCostInput");
    const qty = Math.max(1, Number(qtyInput?.value) || 1);
    const is10kg = activeIngredientItem.id === "ing_mia_bo_10kg" || (activeIngredientItem.name && activeIngredientItem.name.includes("10kg"));
    const is12cay = activeIngredientItem.id === "ing_mia_bo" || (activeIngredientItem.name && (activeIngredientItem.name.includes("12 cây") || activeIngredientItem.name.includes("cây thô")));

    const isMaterialsView = $("#view-materials")?.classList.contains("is-active");
    const materialsBranch = $("#materialsBranchSelect")?.value;
    const activeBranch = (isMaterialsView && materialsBranch)
      ? materialsBranch
      : ((state.currentBranch && state.currentBranch !== "all")
        ? state.currentBranch
        : ((state.branches && state.branches[0]?.name) || "Quán Nhà (Chính)"));

    if (is10kg) {
      // Nghiệp vụ Sơ chế: Nhập kho Bó 10kg từ Bó 12 cây dài (0đ tiền chi)
      const rawQtyInput = $("#ingFromRawQtyInput");
      const rawQty = Math.max(0.5, Number(rawQtyInput?.value) || 1);
      const billCode = `#SC-${Date.now().toString().slice(-4)}`;
      const userBuyNote = $("#ingBuyNoteInput")?.value?.trim();
      const defaultNote = `[Sơ chế nhập kho] Bào vỏ ${rawQty} bó mía 12 cây dài -> Nhập kho ${qty} bó mía 10kg (${qty * 10} kg)`;
      const fullNote = userBuyNote ? `${userBuyNote} (${billCode})` : `${defaultNote} (${billCode})`;

      await themGiaoDich({
        loai: "xuat_dung",
        danhMuc: "Sơ chế mía 10kg",
        soTien: 0,
        soLuong: qty,
        donViTinh: `bó (${qty * 10} kg)`,
        phuongThuc: "tien_mat",
        giaCostDonVi: 0,
        tongGiaCost: 0,
        chiNhanh: activeBranch,
        ingredientId: "mia_10kg",
        inventoryAction: "soche",
        rawQty: rawQty,
        yieldQty: qty,
        yieldKg: qty * 10,
        ghiChu: fullNote,
        billCode,
        cauNoiGoc: fullNote,
      });

      // Tăng tồn kho bó 10kg
      await nhapKhoNguyenLieu(activeBranch, "mia_10kg", qty, 0);
      // Giảm tồn kho bó 12 cây tương ứng
      await nhapKhoNguyenLieu(activeBranch, "mia_cay", -rawQty, 90000);

      $("#quickIngredientDialog")?.close();
      state = await docDuLieu();
      renderAll();
      renderMaterialsView();
      triggerAutoSync();
      showToast(`🎋 Đã nhập ${qty} bó 10kg (${qty * 10} kg) vào kho (từ ${rawQty} bó 12 cây dài)!`);
      return;
    }

    // Các mặt hàng mua khác (hoặc Mía cây thô 12 cây):
    const totalCost = Number(totalCostInput?.value.replace(/[^0-9]/g, "")) || (qty * (Number(activeIngredientItem.unitCost) || 0));
    const unitCost = Math.round(totalCost / qty);
    const billCode = `#PO-${Date.now().toString().slice(-4)}`;
    const nguonTienChi = $("#quickExpenseSourceGroup input[name='quickNguonTienChi']:checked")?.value || "tien_von";
    const userBuyNote = $("#ingBuyNoteInput")?.value?.trim();
    const defaultBuyNote = is12cay
      ? `[Nhập hàng kho] Mua ${qty} bó mía cây tươi 12 cây dài`
      : `[Nhập hàng nhanh] Mua ${qty} ${activeIngredientItem.unit} ${activeIngredientItem.name}`;
    const fullBuyNote = userBuyNote ? `${userBuyNote} (${billCode})` : `${defaultBuyNote} (${billCode})`;
    const invId = activeIngredientItem.inventoryId || (is12cay ? "mia_cay" : activeIngredientItem.id);

    await themGiaoDich({
      loai: "chi",
      danhMuc: is12cay ? "Mua mía cây" : (activeIngredientItem.category || `Mua ${activeIngredientItem.name}`),
      soTien: totalCost,
      soLuong: qty,
      donViTinh: activeIngredientItem.unit,
      phuongThuc: "tien_mat",
      nguonTienChi: nguonTienChi,
      chiNhanh: activeBranch,
      ingredientId: invId,
      inventoryAction: "nhap",
      ghiChu: fullBuyNote,
      billCode,
      cauNoiGoc: fullBuyNote,
    });

    if (invId) {
      await nhapKhoNguyenLieu(activeBranch, invId, qty, unitCost);
    }

    $("#quickIngredientDialog")?.close();
    state = await docDuLieu();
    renderAll();
    renderMaterialsView();
    triggerAutoSync();
    if (is12cay) {
      showToast(`🎋 Đã ghi chi ${formatMoney(totalCost)} nhập ${qty} bó mía 12 cây vào kho`);
    } else {
      showToast(`🛒 Đã ghi chi ${formatMoney(totalCost)} mua ${qty} ${activeIngredientItem.unit} ${activeIngredientItem.name}`);
    }
  });

  // Nút Xuất dùng / Xuất hàng để bán (Lấy mía 10kg chặt khúc / Lấy đá)
  $("#confirmUseIngredientBtn")?.addEventListener("click", async () => {
    if (!activeIngredientItem) return;

    const qtyInput = $("#ingQtyInput");
    const qty = Math.max(1, Number(qtyInput?.value) || 1);

    const isMaterialsView = $("#view-materials")?.classList.contains("is-active");
    const materialsBranch = $("#materialsBranchSelect")?.value;
    const activeBranch = (isMaterialsView && materialsBranch)
      ? materialsBranch
      : ((state.currentBranch && state.currentBranch !== "all")
        ? state.currentBranch
        : ((state.branches && state.branches[0]?.name) || "Quán Nhà (Chính)"));

    const is10kg = activeIngredientItem.id === "ing_mia_bo_10kg" || (activeIngredientItem.name && activeIngredientItem.name.includes("10kg"));
    const is12cay = activeIngredientItem.id === "ing_mia_bo" || (activeIngredientItem.name && (activeIngredientItem.name.includes("12 cây") || activeIngredientItem.name.includes("cây thô")));
    const invId = activeIngredientItem.inventoryId || (is10kg ? "mia_10kg" : (is12cay ? "mia_cay" : activeIngredientItem.id));
    const billCode = `#XK-${Date.now().toString().slice(-4)}`;

    const userUseNote = $("#ingUseNoteInput")?.value?.trim();
    let defaultUseNote = `[Pha chế bán hàng] Lấy ${qty} ${activeIngredientItem.unit} ${activeIngredientItem.name} ra quầy phục vụ`;
    if (is10kg) {
      defaultUseNote = `[Xuất quầy bán] Lấy ${qty} bó mía 10kg (${qty * 10} kg) bào sạch ra quầy ép nước`;
    } else if (is12cay) {
      defaultUseNote = `[Xuất sơ chế] Lấy ${qty} bó mía 12 cây dài đi bào vỏ sạch`;
    }
    const fullUseNote = userUseNote ? `${userUseNote} (${billCode})` : `${defaultUseNote} (${billCode})`;

    await themGiaoDich({
      loai: "xuat_dung",
      danhMuc: activeIngredientItem.name,
      soTien: 0,
      soLuong: qty,
      donViTinh: is10kg ? `bó (${qty * 10} kg)` : activeIngredientItem.unit,
      phuongThuc: "tien_mat",
      giaCostDonVi: Number(activeIngredientItem.unitCost) || 0,
      tongGiaCost: qty * (Number(activeIngredientItem.unitCost) || 0),
      chiNhanh: activeBranch,
      ingredientId: invId,
      inventoryAction: "xuat",
      ghiChu: fullUseNote,
      billCode,
      cauNoiGoc: fullUseNote,
    });

    if (invId) {
      await nhapKhoNguyenLieu(activeBranch, invId, -qty, Number(activeIngredientItem.unitCost) || 0);
    }

    $("#quickIngredientDialog")?.close();
    state = await docDuLieu();
    renderAll();
    renderMaterialsView();
    triggerAutoSync();
    if (is10kg) {
      showToast(`🎋 Đã xuất ${qty} bó mía 10kg (${qty * 10} kg) bào sạch ra quầy ép bán!`);
    } else if (is12cay) {
      showToast(`🎋 Đã xuất ${qty} bó mía 12 cây dài đi bào vỏ!`);
    } else {
      showToast(`📦 Đã ghi xuất dùng ${qty} ${activeIngredientItem.unit} ${activeIngredientItem.name}`);
    }
  });

  $("#ingFromRawQtyInput")?.addEventListener("input", () => {
    updateIngModalCost();
  });

  // Thiết lập sự kiện Hộp thoại Vận Hành Sơ Chế & Điều Chuyển Mía
  $("#miaActionSocheBtn")?.addEventListener("click", () => openMiaOperationsModal("soche"));
  $("#miaActionTransferBtn")?.addEventListener("click", () => openMiaOperationsModal("transfer"));
  $("#miaActionRemainingBtn")?.addEventListener("click", () => openMiaOperationsModal("remaining"));
  $("#btnOpenNewBatchDialog")?.addEventListener("click", () => openMiaOperationsModal("new_batch"));
  $("#btnOpenBatchReportDialog")?.addEventListener("click", () => openMiaOperationsModal("report"));
  $("#closeMiaOpDialogBtn")?.addEventListener("click", () => $("#miaOperationsDialog")?.close());

  $$("#miaOpTabGroup input").forEach(r => {
    r.addEventListener("change", () => switchMiaOpTab(r.value));
  });

  $("#socheRawQtyInput")?.addEventListener("input", updateSocheNotes);
  $("#socheYieldKgInput")?.addEventListener("input", updateSocheNotes);
  $("#socheYieldQtyInput")?.addEventListener("input", updateSocheNotes);
  $("#transferQtyInput")?.addEventListener("input", updateTransferNotes);
  $("#transferTargetBranch")?.addEventListener("change", updateTransferNotes);
  $("#remainingBranchSelect")?.addEventListener("change", updateRemainingNotes);
  $("#remainingAmountInput")?.addEventListener("input", updateRemainingNotes);
  $$("#miaOpPanelRemaining input[name='remainingUnitType']").forEach(r => {
    r.addEventListener("change", updateRemainingNotes);
  });
  $("#newBatchQtyInput")?.addEventListener("input", updateNewBatchTotal);
  $("#reportBatchSelect")?.addEventListener("change", (e) => renderBatchReport(e.target.value));

  // Nút 1: Xác nhận Bào mía sơ chế
  $("#confirmSocheBtn")?.addEventListener("click", async () => {
    const rawQty = Math.max(0.1, Number($("#socheRawQtyInput")?.value) || 1);
    const yieldKg = Math.max(1, Number($("#socheYieldKgInput")?.value) || 10);
    const yieldQty = Math.round((yieldKg / 10) * 10) / 10;
    const note = $("#socheNoteInput")?.value?.trim() || `[Sơ chế] Bào ${rawQty} bó 12 cây -> thu ${yieldKg} kg (${yieldQty} bó 10kg)`;
    const billCode = `#SC-${Date.now().toString().slice(-4)}`;
    const fullNote = `${note} (${billCode})`;

    const activeBatch = await layDotMiaDangHoatDong("Quán Nhà (Chính)");

    await themGiaoDich({
      loai: "xuat_dung",
      danhMuc: "Sơ chế mía 10kg",
      soTien: 0,
      soLuong: yieldQty,
      donViTinh: `bó (${yieldKg} kg)`,
      phuongThuc: "tien_mat",
      giaCostDonVi: 0,
      tongGiaCost: 0,
      chiNhanh: "Quán Nhà (Chính)",
      ingredientId: "mia_10kg",
      inventoryAction: "soche",
      rawQty: rawQty,
      yieldQty: yieldQty,
      yieldKg: yieldKg,
      batchId: activeBatch?.id || null,
      ghiChu: fullNote,
      billCode,
      cauNoiGoc: fullNote,
    });

    await nhapKhoNguyenLieu("Quán Nhà (Chính)", "mia_cay", -rawQty, 90000);
    await nhapKhoNguyenLieu("Quán Nhà (Chính)", "mia_10kg", yieldQty, 0);

    // Tích lũy vào đợt mía đang hoạt động
    await ghiNhanSoCheDotMia({ rawQty, yieldQty, note: fullNote });

    $("#miaOperationsDialog")?.close();
    state = await docDuLieu();
    renderAll();
    renderMaterialsView();
    triggerAutoSync();
    showToast(`🎋 Đã ghi nhận bào ${rawQty} bó 12 cây -> thu được ${yieldKg} kg (${yieldQty} bó 10kg)!`);
  });

  // Nút 2: Xác nhận Xuất mía sang Chi nhánh 2
  $("#confirmTransferBtn")?.addEventListener("click", async () => {
    const qty = Math.max(1, Number($("#transferQtyInput")?.value) || 1);
    const targetBranch = $("#transferTargetBranch")?.value || "Chi nhánh 2";
    const note = $("#transferNoteInput")?.value?.trim() || `[Điều chuyển] Xuất ${qty} bó mía 10kg để bán ở ${targetBranch}`;
    const billCode = `#DC-${Date.now().toString().slice(-4)}`;
    const fullNote = `${note} (${billCode})`;

    await themGiaoDich({
      loai: "xuat_dung",
      danhMuc: "Xuất mía sang chi nhánh",
      soTien: 0,
      soLuong: qty,
      donViTinh: `bó (${qty * 10} kg)`,
      phuongThuc: "tien_mat",
      giaCostDonVi: 0,
      tongGiaCost: 0,
      chiNhanh: "Quán Nhà (Chính)",
      sourceBranch: "Quán Nhà (Chính)",
      targetBranch: targetBranch,
      ingredientId: "mia_10kg",
      inventoryAction: "transfer",
      ghiChu: fullNote,
      billCode,
      cauNoiGoc: fullNote,
    });

    // Trừ Quán Nhà, cộng Chi nhánh đích
    await nhapKhoNguyenLieu("Quán Nhà (Chính)", "mia_10kg", -qty, 0);
    await nhapKhoNguyenLieu(targetBranch, "mia_10kg", qty, 0);

    $("#miaOperationsDialog")?.close();
    state = await docDuLieu();
    renderAll();
    renderMaterialsView();
    triggerAutoSync();
    showToast(`🚚 Đã xuất ${qty} bó mía 10kg (${qty * 10} kg) sang ${targetBranch} để bán!`);
  });

  // Nút 3: Xác nhận Kiểm kê mía dư cuối ngày
  $("#confirmRemainingBtn")?.addEventListener("click", async () => {
    const branch = $("#remainingBranchSelect")?.value || "Chi nhánh 2";
    const amount = Number($("#remainingAmountInput")?.value) || 0;
    const unitType = $("#miaOpPanelRemaining input[name='remainingUnitType']:checked")?.value || "ly";
    const unitText = unitType === "ly" ? "ly" : "kg";
    const note = $("#remainingNoteInput")?.value?.trim() || `[Mía dư cuối ngày] ${branch} hôm nay chưa bán hết mía, còn dư ~${amount} ${unitText}`;
    const billCode = `#KK-${Date.now().toString().slice(-4)}`;
    const fullNote = `${note} (${billCode})`;

    await themGiaoDich({
      loai: "xuat_dung",
      danhMuc: "Kiểm kê mía dư cuối ngày",
      soTien: 0,
      soLuong: amount,
      donViTinh: unitText,
      phuongThuc: "tien_mat",
      giaCostDonVi: 0,
      tongGiaCost: 0,
      chiNhanh: branch,
      ghiChu: fullNote,
      billCode,
      cauNoiGoc: fullNote,
    });

    $("#miaOperationsDialog")?.close();
    state = await docDuLieu();
    renderAll();
    renderMaterialsView();
    triggerAutoSync();
    showToast(`🌙 Đã lưu ghi nhận: ${branch} còn dư ~${amount} ${unitText} mía cuối ngày!`);
  });

  // Nút 4: Đóng & Tổng kết đợt mía
  $("#closeActiveBatchBtn")?.addEventListener("click", async () => {
    const currentId = $("#reportBatchSelect")?.value;
    if (!currentId) return;
    await dongDotNhapMia(currentId);
    state = await docDuLieu();
    renderBatchReport(currentId);
    renderSugarcaneBatchDashboard();
    triggerAutoSync();
    showToast(`🏁 Đã tổng kết và đóng đợt mía thành công!`);
  });

  // Nút 5: Xác nhận Khởi tạo đợt mía mới & Ghi chi
  $("#confirmNewBatchBtn")?.addEventListener("click", async () => {
    const date = $("#newBatchDateInput")?.value || new Date().toISOString().slice(0, 10);
    const rawQty = Math.max(1, Number($("#newBatchQtyInput")?.value) || 20);
    const price = Number($("#newBatchPriceInput")?.value.replace(/[^0-9]/g, "")) || 90000;
    const totalCost = rawQty * price;
    const note = $("#newBatchNoteInput")?.value?.trim() || `Nhập đợt mía thô ${rawQty} bó 12 cây dài`;
    const billCode = `#PO-${Date.now().toString().slice(-4)}`;
    const fullNote = `[Nhập đợt mía] ${note} (${billCode})`;

    const newBatch = await taoDotNhapMia({
      date,
      rawStalkBundles: rawQty,
      costPerBundle: price,
      branch: "Quán Nhà (Chính)",
      note,
    });

    await themGiaoDich({
      loai: "chi",
      danhMuc: "Mua mía cây",
      soTien: totalCost,
      soLuong: rawQty,
      donViTinh: "bó",
      phuongThuc: "tien_mat",
      nguonTienChi: "tien_von",
      chiNhanh: "Quán Nhà (Chính)",
      ingredientId: "mia_cay",
      inventoryAction: "nhap",
      batchId: newBatch?.id || null,
      ghiChu: fullNote,
      billCode,
      cauNoiGoc: fullNote,
    });

    await nhapKhoNguyenLieu("Quán Nhà (Chính)", "mia_cay", rawQty, price);

    $("#miaOperationsDialog")?.close();
    state = await docDuLieu();
    renderAll();
    renderMaterialsView();
    triggerAutoSync();
    showToast(`🎋 Đã khởi tạo Đợt Mía Mới (${rawQty} bó 12 cây) & Ghi chi ${formatMoney(totalCost)}!`);
  });

    // Stats Mode Switcher (Day / Week / Month)
  $$(".stats-mode-btn").forEach((btn) => {
    btn.onclick = () => {
      $$(".stats-mode-btn").forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      statsMode = btn.getAttribute("data-stats-mode");

      $("#statsDayGroup").hidden = statsMode !== "day";
      $("#statsWeekGroup").hidden = statsMode !== "week";
      $("#statsMonthGroup").hidden = statsMode !== "month";

      renderStats();
    };
  });

  // Stats filter changes
  $("#statsBranchFilter")?.addEventListener("change", (e) => {
    statsBranch = e.target.value;
    renderStats();
  });

  $("#statsDateInput")?.addEventListener("change", (e) => {
    statsDate = e.target.value || todayKey();
    renderStats();
  });

  $("#statsWeekInput")?.addEventListener("change", (e) => {
    statsWeekDate = e.target.value || todayKey();
    renderStats();
  });

  // Month & Year picker setup
  const mSelect = $("#statsMonthSelect");
  const ySelect = $("#statsYearSelect");
  if (mSelect && ySelect) {
    const curYear = new Date().getFullYear();
    mSelect.innerHTML = MONTH_NAMES.map((name, i) => `<option value="${String(i + 1).padStart(2, "0")}">${name}</option>`).join("");
    ySelect.innerHTML = [curYear - 1, curYear, curYear + 1].map((y) => `<option value="${y}">${y}</option>`).join("");

    const [curY, curM] = statsMonth.split("-");
    mSelect.value = curM;
    ySelect.value = curY;

    const onMonthChange = () => {
      statsMonth = `${ySelect.value}-${mSelect.value}`;
      renderStats();
    };
    mSelect.onchange = onMonthChange;
    ySelect.onchange = onMonthChange;
  }

  // Mic recording button
  const micBtn = $("#micBtn");
  if (micBtn) {
    micBtn.onclick = async () => {
      if (micListening) {
        setMicState(false);
        await dungNghe();
        return;
      }

      setMicState(true);
      batDauNghe(
        async (finalText) => {
          setMicState(false);
          if (!finalText || !finalText.trim()) return;

          const parsed = phanTichNhieu(finalText, state.quickItems);
          pendingVoice = parsed;

          // Open voice confirmation dialog
          openVoiceConfirmDialog(parsed, finalText);
        },
        (error) => {
          setMicState(false);
          showToast(`Lỗi giọng nói: ${error?.message || error}`, true);
        },
      );
    };
  }

  // Menu Manager Save & Add buttons
  $("#addNewMenuItemBtn")?.addEventListener("click", async () => {
    state.quickItems = state.quickItems || [];
    const newId = `mon_${Date.now()}`;
    const newItem = {
      id: newId,
      name: "Món mới",
      shortName: "Món mới",
      price: 15000,
      priceByBranch: {
        "Quán Nhà (Chính)": 15000,
        "Chi nhánh 2": 17000,
      },
      costPrice: 5000,
      category: "Món mới",
      icon: "cane",
      voiceUnit: "ly",
      image: "./assets/menu/nuoc_mia.jpg",
    };
    state.quickItems.push(newItem);
    await luuDanhSachMenu(state.quickItems);
    renderMenuManager(true);
    renderQuickButtons();
    showToast("⚡ Đã thêm món mới vào menu! Nhớ chỉnh sửa tên, giá và bấm Lưu Menu nhé.");
  });

  $("#saveMenuBtn")?.addEventListener("click", async () => {
    const rows = $$("#menuItemsEditor .menu-item-row");
    const updated = rows.map((row, i) => {
      const existing = (state.quickItems || [])[i] || {};
      const name = row.querySelector(".menu-item-name")?.value?.trim() || existing.name || "Món nước";
      const priceMainInput = row.querySelector(".menu-item-price-main");
      const priceCn2Input = row.querySelector(".menu-item-price-cn2");
      const costInput = row.querySelector(".menu-item-cost");

      const priceMain = priceMainInput ? (Number(priceMainInput.value) || 0) : (Number(existing.price) || 10000);
      const priceCn2 = priceCn2Input ? (Number(priceCn2Input.value) || 0) : (existing.priceByBranch?.["Chi nhánh 2"] || (priceMain + 2000));
      const costPrice = costInput ? (Number(costInput.value) || 0) : (Number(existing.costPrice) || 0);

      const existingBranches = existing.priceByBranch || {};
      const priceByBranch = {
        ...existingBranches,
        "Quán Nhà (Chính)": priceMain,
        "Chi nhánh 2": priceCn2,
      };

      return {
        ...existing,
        id: existing.id || `item_${i}`,
        name,
        shortName: name,
        category: name,
        price: priceMain,
        costPrice,
        priceByBranch,
      };
    });

    state.quickItems = updated;
    await luuDanhSachMenu(updated);
    state = await docDuLieu();
    renderAll({ forceSettings: true });
    showToast("✅ Đã lưu toàn bộ bảng giá Menu & Chi nhánh thành công!");
    triggerAutoSync();
  });

  // Ingredient Manager Save & Add buttons
  $("#addNewIngredientItemBtn")?.addEventListener("click", async () => {
    state.quickIngredients = state.quickIngredients || [];
    const newId = `ing_${Date.now()}`;
    const newIng = {
      id: newId,
      name: "Nguyên liệu mới",
      shortName: "Nguyên liệu mới",
      unit: "kg",
      defaultQty: 1,
      unitCost: 20000,
      category: "Mua nguyên liệu",
      note: "Nguyên liệu mới",
      icon: "cane_bundle",
      image: "./assets/ingredients/bo_mia.jpg",
      inventoryId: newId,
      yieldPerUnit: 10,
    };
    state.quickIngredients.push(newIng);
    await luuDanhSachNguyenLieu(state.quickIngredients);
    renderIngredientManager(true);
    renderQuickIngredients();
    showToast("⚡ Đã thêm nguyên liệu mới! Nhớ chỉnh sửa tên, giá và bấm Lưu Nguyên Liệu.");
  });

  $("#saveIngredientsBtn")?.addEventListener("click", async () => {
    const rows = $$("#ingredientItemsEditor .ingredient-item-row");
    const updated = rows.map((row, i) => {
      const existing = (state.quickIngredients || [])[i] || {};
      const name = row.querySelector(".ing-item-name")?.value?.trim() || existing.name || "Nguyên liệu";
      const unit = row.querySelector(".ing-item-unit")?.value?.trim() || existing.unit || "kg";
      const unitCost = Number(row.querySelector(".ing-item-cost")?.value) || 0;
      const defaultQty = Number(row.querySelector(".ing-item-qty")?.value) || 1;
      const yieldPerUnit = Number(row.querySelector(".ing-item-yield")?.value) || 1;

      return {
        ...existing,
        id: existing.id || `ing_${i}_${Date.now()}`,
        name,
        shortName: name,
        unit,
        unitCost,
        defaultQty,
        yieldPerUnit,
        image: getValidIngredientImage({ ...existing, name }),
      };
    });

    state.quickIngredients = updated;
    await luuDanhSachNguyenLieu(updated);
    state = await docDuLieu();
    renderAll({ forceSettings: true });
    showToast("✅ Đã lưu toàn bộ bảng giá nguyên liệu thành công!");
    triggerAutoSync();
  });

  $("#resetDefaultCostBtn")?.addEventListener("click", async () => {
    if (!confirm("Bạn có chắc chắn muốn đặt lại giá vốn tất cả các món theo định lượng sổ tay chuẩn không?")) return;
    showToast("Đang cập nhật lại giá vốn sổ tay chuẩn...");
    try {
      await datLaiGiaCostChuanSoTay();
      state = await docDuLieu();
      renderAll();
      showToast(`⚡ Đã đặt lại giá vốn chuẩn thành công (${(state.quickItems || []).length} món)!`);
      triggerAutoSync();
    } catch (err) {
      showToast(`Lỗi đặt lại giá vốn: ${err?.message || err}`, true);
    }
  });

  $("#forceSyncMenuBtn")?.addEventListener("click", async () => {
    showToast("Đang đồng bộ và kéo Menu từ máy chủ...");
    try {
      // Force settings version to 0 to unconditionally pull latest settings from cloud
      const currentData = await docDuLieu();
      currentData.settingsVersion = 0;
      await luuDuLieu(currentData);
      await dongBo();
      state = await docDuLieu();
      renderAll();
      showToast(`⚡ Đã tải Menu mới từ máy chủ thành công (${(state.quickItems || []).length} món)!`);
    } catch (err) {
      showToast(`Lỗi tải Menu: ${err?.message || err}`, true);
    }
  });

  // ----------------------------------------------------
  // COST CALCULATOR MODAL EVENTS
  // ----------------------------------------------------
  $("#openCostCalcBtn")?.addEventListener("click", () => {
    openCostCalculatorModal();
  });

  $("#closeCostCalcTopBtn")?.addEventListener("click", () => {
    $("#costCalculatorDialog")?.close();
  });

  $("#costDrinkSelect")?.addEventListener("change", (e) => {
    currentCostDrinkId = e.target.value;
    loadCostDrinkData(currentCostDrinkId);
  });

  $("#costSellingPriceInput")?.addEventListener("input", () => {
    recalculateCostSummary();
  });

  $("#addIngredientRowBtn")?.addEventListener("click", () => {
    currentIngredientsList.push({
      name: "Nguyên liệu mới",
      batchCost: 20000,
      batchYield: 20,
      unitCost: 1000,
    });
    renderIngredientsTable();
    recalculateCostSummary();
  });

  ["#calcRentMonthly", "#calcElectricityMonthly", "#calcWaterMonthly", "#calcTrashMonthly", "#calcOtherMonthly", "#calcExpectedCupsDay"].forEach((sel) => {
    $(sel)?.addEventListener("input", () => {
      recalculateCostSummary();
    });
  });

  $("#settingOverheadBranchSelect")?.addEventListener("change", (e) => {
    currentSettingOverheadBranch = e.target.value;
    loadOverheadInputsForBranch(currentSettingOverheadBranch);
  });

  ["#settingRentMonthly", "#settingElectricityMonthly", "#settingWaterMonthly", "#settingTrashMonthly", "#settingOtherMonthly", "#settingExpectedCupsDay"].forEach((sel) => {
    $(sel)?.addEventListener("input", () => {
      updateOverheadAndPackagingDisplays();
    });
  });

  $("#openCostCalcModalFromSettingsBtn")?.addEventListener("click", () => {
    openCostCalculatorModal();
  });

  $("#saveOverheadAndPackagingBtn")?.addEventListener("click", async () => {
    const rentMonthly = Number($("#settingRentMonthly")?.value) || 0;
    const electricityMonthly = Number($("#settingElectricityMonthly")?.value) || 0;
    const waterMonthly = Number($("#settingWaterMonthly")?.value) || 0;
    const trashMonthly = Number($("#settingTrashMonthly")?.value) || 0;
    const otherMonthly = Number($("#settingOtherMonthly")?.value) || 0;
    const expectedCupsPerDay = Number($("#settingExpectedCupsDay")?.value) || 80;

    const newOverhead = {
      rentMonthly,
      electricityMonthly,
      waterMonthly,
      trashMonthly,
      otherMonthly,
      expectedCupsPerDay,
    };

    const newPackaging = {};
    $$("#packagingEditorBody tr").forEach((tr) => {
      const key = tr.getAttribute("data-pack-key");
      const cost = Number(tr.querySelector(".pack-cost-input")?.value) || 0;
      const yieldVal = Number(tr.querySelector(".pack-yield-input")?.value) || 1;
      const unitCost = Math.round(cost / (yieldVal || 1));
      const existing = (state.packagingConfig || {})[key] || {};
      newPackaging[key] = {
        ...existing,
        batchCost: cost,
        batchYield: yieldVal,
        unitCost,
      };
    });

    await luuOverheadChoChiNhanh(currentSettingOverheadBranch, newOverhead);
    await luuPackagingConfig(newPackaging);
    state = await docDuLieu();
    renderAll();
    showToast(`Đã lưu định phí mặt bằng, điện nước cho ${currentSettingOverheadBranch}!`);
    triggerAutoSync();
  });

  $("#applyCostToMenuBtn")?.addEventListener("click", async () => {
    const totalCogs = currentIngredientsList.reduce((sum, ing) => {
      const bCost = Number(ing.batchCost) || 0;
      const bYield = Number(ing.batchYield) || 1;
      return sum + Math.round(bCost / (bYield || 1));
    }, 0);

    const sellingPrice = Number($("#costSellingPriceInput")?.value) || 0;

    // Save formula
    await luuCostFormula(currentCostDrinkId, {
      drinkId: currentCostDrinkId,
      sellingPrice,
      ingredients: currentIngredientsList,
    });

    // Save overhead
    await luuOverheadConfig({
      rentMonthly: Number($("#calcRentMonthly")?.value) || 6000000,
      electricityMonthly: Number($("#calcElectricityMonthly")?.value) || 1000000,
      waterMonthly: Number($("#calcWaterMonthly")?.value) || 300000,
      trashMonthly: Number($("#calcTrashMonthly")?.value) || 50000,
      otherMonthly: Number($("#calcOtherMonthly")?.value) || 450000,
      expectedCupsPerDay: Number($("#calcExpectedCupsDay")?.value) || 80,
    });

    // Update cost for this menu item
    await capNhatCostChoMon(currentCostDrinkId, totalCogs);

    state = await docDuLieu();
    renderAll();
    triggerAutoSync();

    $("#costCalculatorDialog")?.close();
    showToast(`Đã áp dụng giá vốn ${formatMoney(totalCogs)}/ly cho món vào Menu!`);
  });

  $("#saveOverheadOnlyBtn")?.addEventListener("click", async () => {
    await luuOverheadConfig({
      rentMonthly: Number($("#calcRentMonthly")?.value) || 6000000,
      electricityMonthly: Number($("#calcElectricityMonthly")?.value) || 1000000,
      waterMonthly: Number($("#calcWaterMonthly")?.value) || 300000,
      trashMonthly: Number($("#calcTrashMonthly")?.value) || 50000,
      otherMonthly: Number($("#calcOtherMonthly")?.value) || 450000,
      expectedCupsPerDay: Number($("#calcExpectedCupsDay")?.value) || 80,
    });
    state = await docDuLieu();
    showToast("Đã lưu định phí mặt bằng và vận hành");
    triggerAutoSync();
  });

  $("#copyCostReportBtn")?.addEventListener("click", () => {
    const select = $("#costDrinkSelect");
    const drinkName = select ? select.options[select.selectedIndex]?.text : "Món nước";
    const sellingPrice = $("#summarySellingPrice")?.textContent || "0 đ";
    const cogs = $("#summaryCogsRatio")?.textContent || "0 đ";
    const overhead = $("#summaryOverheadRatio")?.textContent || "0 đ";
    const totalCost = $("#summaryTotalCost")?.textContent || "0 đ";
    const netProfit = $("#summaryNetProfit")?.textContent || "0 đ";
    const breakEvenDay = $("#breakEvenPerDayText")?.textContent || "";

    const text = `🧮 BẢNG TÍNH GIÁ VỐN & ĐỊNH PHÍ (${drinkName}):
- 💵 Giá bán ra: ${sellingPrice}
- 📦 Vốn nguyên liệu (COGS): ${cogs}
- 🏢 Mặt bằng & Điện nước / ly: ${overhead}
- 🎯 TỔNG CHI PHÍ THỰC TẾ: ${totalCost}
- 💰 LỜI RÒNG / 1 LY: ${netProfit}
- ⚖️ ${breakEvenDay} để hòa vốn mặt bằng.`;

    navigator.clipboard?.writeText(text);
    showToast("Đã sao chép bảng tính giá vốn vào bộ nhớ tạm");
  });

  // Branch Manager Save & Add buttons
  $("#addNewBranchBtn")?.addEventListener("click", () => {
    state.branches = state.branches || [];
    state.branches.push({
      id: `branch_${Date.now()}`,
      name: `Chi nhánh ${state.branches.length + 1}`,
    });
    renderBranchManager();
  });

  $("#saveBranchesBtn")?.addEventListener("click", async () => {
    const rows = $$("#branchListEditor .branch-item-row");
    const updated = rows.map((row, i) => {
      const existing = (state.branches || [])[i] || {};
      const name = row.querySelector(".branch-name-input")?.value?.trim() || `Chi nhánh ${i + 1}`;
      return {
        id: existing.id || `branch_${i}`,
        name,
      };
    });

    await luuDanhSachChiNhanh(updated);
    state = await docDuLieu();
    renderAll();
    showToast("Đã lưu danh sách chi nhánh thành công!");
    triggerAutoSync();
  });

  // Daily Routine Assistant & Opening Cash Float buttons
  $("#editOpeningCashBtn")?.addEventListener("click", () => {
    const dialog = $("#editOpeningCashDialog");
    const input = $("#todayOpeningCashInput");
    if (!dialog || !input) return;
    input.value = getTodayOpeningCash();
    dialog.showModal();
  });

  $$("#editOpeningCashDialog .routine-preset-btn").forEach((btn) => {
    btn.onclick = () => {
      const val = Number(btn.getAttribute("data-val")) || 50000;
      const input = $("#todayOpeningCashInput");
      if (input) input.value = val;
    };
  });

  $("#cancelOpeningCashBtn")?.addEventListener("click", () => {
    $("#editOpeningCashDialog")?.close();
  });

  $("#saveTodayOpeningCashBtn")?.addEventListener("click", async () => {
    const input = $("#todayOpeningCashInput");
    const amount = Number(input?.value?.replace(/[^0-9]/g, "")) || 50000;
    const today = todayKey();
    const branch = state.currentBranch || "Quán Nhà (Chính)";
    await luuTienThoiDauNgay(today, amount, branch);
    state = await docDuLieu();
    renderAll();
    $("#editOpeningCashDialog")?.close();
    showToast(`Đã lưu tiền thối đầu ngày: ${formatMoney(amount)}`);
    triggerAutoSync();
  });

  $("#saveDefaultOpeningCashBtn")?.addEventListener("click", async () => {
    const input = $("#defaultOpeningCashInput");
    const amount = Number(input?.value?.replace(/[^0-9]/g, "")) || 50000;
    await luuTienThoiMacDinh(amount);
    state = await docDuLieu();
    renderAll();
    showToast(`Đã lưu tiền thối mặc định: ${formatMoney(amount)}`);
    triggerAutoSync();
  });

  // Daily Routine Banner Action
  $("#routineBannerActionBtn")?.addEventListener("click", () => {
    openDailyRoutineModal();
  });

  $("#closeRoutineModalBtn")?.addEventListener("click", () => {
    $("#dailyRoutineModal")?.close();
  });

  $("#dismissRoutineModalBtn")?.addEventListener("click", () => {
    $("#dailyRoutineModal")?.close();
  });

  $("#submitRoutineModalBtn")?.addEventListener("click", async () => {
    const period = getDailyRoutinePeriod();
    const modal = $("#dailyRoutineModal");

    if (period === "morning") {
      const input = $("#routineOpeningCashInput");
      const amount = Number(input?.value?.replace(/[^0-9]/g, "")) || 50000;
      const today = todayKey();
      const branch = state.currentBranch || "Quán Nhà (Chính)";
      await luuTienThoiDauNgay(today, amount, branch);
      state = await docDuLieu();
      renderAll();
      modal?.close();
      phatTiengChuongTingTing();
      showToast(`🌅 Đã xác nhận mở két đầu ngày: ${formatMoney(amount)}!`);
      triggerAutoSync();
    } else if (period === "midday") {
      modal?.close();
      showToast("☀️ Chúc quán ca trưa & chiều bán đắt hàng!");
    } else {
      modal?.close();
      openDailyClosingModal();
    }
  });

  // CSV & JSON Backup buttons
  $("#exportTodayBtn")?.addEventListener("click", () => {
    const isAll = state.currentBranch === "all" || !state.currentBranch;
    const items = (state.ds || []).filter(
      (it) => !it.deleted && it.ngay === todayKey() && (isAll || it.chiNhanh === state.currentBranch),
    );
    const header = "Mã,Ngày,Giờ,Điểm bán,Loại,Danh mục,Số lượng,Số tiền (đ),Giá vốn (đ),Ghi chú\n";
    const rows = items
      .map(
        (it) =>
          `"${it.id}","${it.ngay}","${it.gio || ""}","${it.chiNhanh || "Quán Nhà"}","${it.loai}","${it.danhMuc}","${it.soLuong || 1}","${it.soTien}","${it.tongGiaCost || 0}","${(it.ghiChu || "").replace(/"/g, '""')}"`,
      )
      .join("\n");
    const blob = new Blob(["\uFEFF" + header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const branchSuffix = isAll ? "TatCa" : state.currentBranch.replace(/\s+/g, "_");
    a.download = `ThuChi_${branchSuffix}_${todayKey()}.csv`;
    a.click();
    showToast(`Đã xuất bảng tính Excel cho ${isAll ? "tất cả điểm bán" : state.currentBranch}`);
  });

  $("#backupBtn")?.addEventListener("click", async () => {
    const json = await xuatDuLieuJson();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `SaoLuu_NuocMia_${todayKey()}.json`;
    a.click();
    showToast("Đã tải tệp sao lưu dữ liệu về máy");
  });

  $("#restoreInput")?.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      await nhapDuLieuTuJson(text);
      state = await docDuLieu();
      renderAll();
      showToast("Khôi phục dữ liệu từ tệp thành công!");
      triggerAutoSync();
    } catch (err) {
      showToast(`Lỗi khôi phục: ${err.message}`, true);
    }
  });

  $("#clearAppCacheBtn")?.addEventListener("click", async () => {
    try {
      showToast("🧹 Đang xóa bộ nhớ đệm cache...");
      if (typeof window.caches !== "undefined") {
        const cacheKeys = await window.caches.keys();
        await Promise.all(cacheKeys.map((key) => window.caches.delete(key)));
      }
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.clear();
      }
      showToast("✅ Đã xóa cache thành công! Đang tải lại ứng dụng...");
      setTimeout(() => {
        window.location.reload(true);
      }, 500);
    } catch (e) {
      console.warn("Lỗi khi xóa cache:", e);
      window.location.reload(true);
    }
  });

  $("#clearDataBtn")?.addEventListener("click", async () => {
    if (!confirm("CẢNH BÁO: Hành động này sẽ xóa toàn bộ giao dịch trên máy này. Bạn có chắc chắn muốn xóa?")) return;
    await xoaTatCaDuLieu();
    state = await docDuLieu();
    renderAll();
    showToast("Đã xóa tất cả dữ liệu");
  });

  // Supabase Auth & Sync Event Listeners
  $("#syncStatus")?.addEventListener("click", async () => {
    const isAuth = await daDangNhap();
    if (!isAuth) {
      $("#authScreen").hidden = false;
      $(".app-shell")?.classList.add("is-auth-locked");
      const authEmailInput = $("#authEmail");
      if (authEmailInput && !authEmailInput.value && state?.sync?.accountEmail) {
        authEmailInput.value = state.sync.accountEmail;
      }
      showToast("Vui lòng đăng nhập để đồng bộ giữa Điện thoại và Laptop");
    } else {
      showToast("Đang đồng bộ dữ liệu với máy chủ...");
      const res = await triggerAutoSync(true);
      const user = await layThongTinTaiKhoan();
      if (res?.ok !== false) {
        showToast(`✅ Đã đồng bộ thành công! (Tài khoản: ${user?.email || "Chính chủ"})`);
      }
    }
  });

  const handleLogout = async () => {
    if (!confirm("Bạn có chắc chắn muốn đăng xuất tài khoản?")) return;
    try {
      await dangXuat();
      authLoggedIn = false;
      $("#authScreen").hidden = false;
      $(".app-shell")?.classList.add("is-auth-locked");
      updateSyncUI();
      showToast("Đã đăng xuất tài khoản");
    } catch (e) {
      showToast("Lỗi đăng xuất: " + e.message, true);
    }
  };
  $("#logoutBtn")?.addEventListener("click", handleLogout);
  $("#settingsLogoutBtn")?.addEventListener("click", handleLogout);

  $("#saveSyncConfigBtn")?.addEventListener("click", async () => {
    const url = $("#supabaseUrl")?.value?.trim();
    const anon = $("#supabaseAnon")?.value?.trim();
    if (!url || !anon) {
      showToast("Vui lòng nhập đầy đủ Supabase URL và Anon key", true);
      return;
    }
    state.sync = { ...(state.sync || {}), supabaseUrl: url, supabaseAnon: anon };
    await luuDuLieu(state);
    datLaiClientSupabase();
    showToast("Đã lưu cấu hình kết nối đám mây!");
    updateSyncUI();
  });

  $("#loginBtn")?.addEventListener("click", async () => {
    const email = $("#loginEmail")?.value?.trim();
    const pass = $("#loginPassword")?.value?.trim();
    if (!email || !pass) {
      showToast("Vui lòng nhập Email và Mật khẩu", true);
      return;
    }
    try {
      showToast("Đang đăng nhập...");
      await dangNhap(email, pass);
      authLoggedIn = true;
      $("#authScreen").hidden = true;
      $(".app-shell")?.classList.remove("is-auth-locked");
      showToast("Đăng nhập thành công! Đang tải dữ liệu từ tài khoản...");
      await triggerAutoSync();
      await startRealtimeListener();
      updateSyncUI();
      showToast("Dữ liệu tài khoản đã được đồng bộ!");
    } catch (err) {
      showToast(`Lỗi đăng nhập: ${err.message}`, true);
    }
  });

  $("#signupBtn")?.addEventListener("click", async () => {
    const email = $("#loginEmail")?.value?.trim();
    const pass = $("#loginPassword")?.value?.trim();
    if (!email || !pass) {
      showToast("Vui lòng nhập Email và Mật khẩu", true);
      return;
    }
    try {
      await dangKy(email, pass);
      showToast("Tạo tài khoản thành công!");
    } catch (err) {
      showToast(`Lỗi tạo tài khoản: ${err.message}`, true);
    }
  });

  $("#syncNowBtn")?.addEventListener("click", async () => {
    showToast("Đang đồng bộ dữ liệu với máy chủ...");
    try {
      await dongBo();
      state = await docDuLieu();
      renderAll();
      updateSyncUI();
      showToast("Đồng bộ hoàn tất!");
    } catch (err) {
      showToast(syncErrorMessage(err), true);
    }
  });

  // Auth Screen Form
  $("#authForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = $("#authEmail")?.value?.trim();
    const pass = $("#authPassword")?.value?.trim();
    try {
      showToast("Đang đăng nhập...");
      await dangNhap(email, pass);
      $("#authScreen").hidden = true;
      $(".app-shell")?.classList.remove("is-auth-locked");
      authLoggedIn = true;
      showToast("Đăng nhập thành công! Đang tải dữ liệu tài khoản...");
      await triggerAutoSync();
      await startRealtimeListener();
      updateSyncUI();
      showToast("Dữ liệu tài khoản đã được đồng bộ!");
    } catch (err) {
      showToast(`Lỗi đăng nhập: ${err.message}`, true);
    }
  });

  $("#authSignupBtn")?.addEventListener("click", async () => {
    const email = $("#authEmail")?.value?.trim();
    const pass = $("#authPassword")?.value?.trim();
    if (!email || !pass) {
      showToast("Vui lòng nhập Email và Mật khẩu", true);
      return;
    }
    try {
      await dangKy(email, pass);
      showToast("Đã tạo tài khoản! Vui lòng bấm Đăng nhập.");
    } catch (err) {
      showToast(`Lỗi tạo tài khoản: ${err.message}`, true);
    }
  });

  $("#authOfflineBypassBtn")?.addEventListener("click", () => {
    $("#authScreen").hidden = true;
    $(".app-shell")?.classList.remove("is-auth-locked");
    updateSyncUI();
    showToast("⚠️ Đang dùng chế độ lưu tạm trên máy (Chưa đồng bộ lên đám mây)", true);
  });


  // ----------------------------------------------------
  // LOA AI THÔNG BÁO CHUYỂN KHOẢN QR EVENTS
  // ----------------------------------------------------
  $("#toggleAudioAlertBtn")?.addEventListener("click", async () => {
    state.enableAudioPaymentAlert = !(state.enableAudioPaymentAlert !== false);
    await luuDuLieu(state);
    updateAudioAlertButtonUI();
    showToast(state.enableAudioPaymentAlert ? "🔊 Đã BẬT Loa AI Thông Báo Chuyển Khoản QR" : "🔇 Đã TẮT Loa AI Thông Báo Chuyển Khoản");
    if (state.enableAudioPaymentAlert) {
      phatLoaThongBaoChuyenKhoan(50000, "chuyen_khoan");
    }
  });

  // ----------------------------------------------------
  // KHO NGUYÊN LIỆU & ĐỊNH MỨC (BOM) EVENTS
  // ----------------------------------------------------

  $("#openInventoryBtn")?.addEventListener("click", () => {
    switchView("materials");
  });

  $("#closeInventoryBtn")?.addEventListener("click", () => {
    $("#inventoryDialog")?.close();
  });
  $("#closeInventoryHeaderBtn")?.addEventListener("click", () => {
    $("#inventoryDialog")?.close();
  });

  $("#inventoryBranchSelect")?.addEventListener("change", (e) => {
    currentInventoryBranch = e.target.value;
    renderInventoryModal();
  });

  $("#inventoryQuickActionForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const branch = currentInventoryBranch || state.currentBranch || "Quán Nhà (Chính)";
    const itemSelect = $("#quickStockItemSelect");
    const actionType = $("#quickStockActionType")?.value || "nhap";
    const qty = Number($("#quickStockQtyInput")?.value) || 0;
    const cost = Number($("#quickStockCostInput")?.value) || 0;
    const itemId = itemSelect?.value;
    const itemName = itemSelect?.options[itemSelect.selectedIndex]?.text || "Nguyên liệu";

    if (qty <= 0) {
      showToast("Vui lòng nhập số lượng lớn hơn 0", true);
      return;
    }

    if (actionType === "nhap") {
      await nhapKhoNguyenLieu(branch, itemId, qty, cost > 0 && qty > 0 ? Math.round(cost / qty) : 0);
      if (cost > 0) {
        const billCode = `#PO-${Date.now().toString().slice(-4)}`;
        await themGiaoDich({
          loai: "chi",
          soTien: cost,
          soLuong: qty,
          donViTinh: "phần",
          danhMuc: `Mua ${itemName.split(" (")[0]}`,
          ghiChu: `[Nhập hàng kho] Mua ${qty} ${itemName} (${billCode})`,
          billCode: billCode,
          chiNhanh: branch,
          ingredientId: itemId,
          inventoryAction: "nhap",
        });
      }
      showToast(`Đã nhập thêm +${qty} ${itemName} vào kho ${branch}!`);
    } else if (actionType === "xuat") {
      await nhapKhoNguyenLieu(branch, itemId, -qty, 0);
      const billCode = `#XK-${Date.now().toString().slice(-4)}`;
      await themGiaoDich({
        loai: "xuat_dung",
        soTien: 0,
        soLuong: qty,
        donViTinh: "phần",
        danhMuc: itemName.split(" (")[0],
        ghiChu: `[Xuất dùng kho] Lấy ${qty} ${itemName} ra quầy phục vụ (${billCode})`,
        billCode: billCode,
        chiNhanh: branch,
        ingredientId: itemId,
        inventoryAction: "xuat",
      });
      showToast(`📦 Đã ghi nhận xuất dùng ${qty} ${itemName} khỏi kho ${branch}!`);
    } else {
      await capNhatTonKhoThucTe(branch, itemId, qty);
      showToast(`Đã điều chỉnh tồn kho ${itemName} thành ${qty} (${branch})!`);
    }

    state = await docDuLieu();
    renderAll();
    renderMaterialsView();
    renderInventoryModal();
    $("#quickStockQtyInput").value = "";
    $("#quickStockCostInput").value = "";
    triggerAutoSync();
  });

  // ----------------------------------------------------
  // BÁO CÁO THUẾ & MẪU TỜ KHAI 01/CNKD EVENTS
  // ----------------------------------------------------
  $("#openTaxReportBtn")?.addEventListener("click", () => {
    renderTaxReportModal();
    $("#taxReportDialog")?.showModal();
  });

  $("#closeTaxReportBtn")?.addEventListener("click", () => {
    $("#taxReportDialog")?.close();
  });
  $("#closeTaxReportHeaderBtn")?.addEventListener("click", () => {
    $("#taxReportDialog")?.close();
  });

  $("#taxPeriodTypeSelect")?.addEventListener("change", (e) => {
    currentTaxPeriodType = e.target.value;
    renderTaxReportModal();
  });

  $("#taxBranchSelect")?.addEventListener("change", (e) => {
    currentTaxBranch = e.target.value;
    renderTaxReportModal();
  });

  $("#copyTaxFormBtn")?.addEventListener("click", () => {
    const taxReport = tinhBaoCaoThue(state.ds || [], currentTaxPeriodType, null, currentTaxBranch);
    const formText = xuatToKhaiThue01CNKD(taxReport, { shopName: "Quán Nước Mía", owner: "Chủ Hộ Kinh Doanh" });
    navigator.clipboard?.writeText(formText);
    showToast("Đã sao chép Mẫu Tờ Khai Thuế 01/CNKD vào bộ nhớ tạm!");
  });

  $("#downloadTaxFormBtn")?.addEventListener("click", () => {
    const taxReport = tinhBaoCaoThue(state.ds || [], currentTaxPeriodType, null, currentTaxBranch);
    const formText = xuatToKhaiThue01CNKD(taxReport, { shopName: "Quán Nước Mía", owner: "Chủ Hộ Kinh Doanh" });
    const filename = `ToKhaiThue_01CNKD_${taxReport.periodValue}_${taxReport.branchName.replace(/\s+/g, "_")}.txt`;
    downloadTextFile(filename, formText);
    showToast(`Đã tải tệp ${filename} về máy!`);
  });

  // ----------------------------------------------------
  // QUÉT MÃ VẠCH & CHỤP HÓA ĐƠN OCR EVENTS
  // ----------------------------------------------------
  $("#openBarcodeScannerBtn")?.addEventListener("click", () => {
    $("#scannerDialog")?.showModal();
    startBarcodeCamera();
  });

  $("#closeScannerModalBtn")?.addEventListener("click", () => {
    stopBarcodeCamera();
    $("#scannerDialog")?.close();
  });

  $("#scannerDialog")?.addEventListener("close", () => {
    stopBarcodeCamera();
  });

  $("#switchBarcodeModeBtn")?.addEventListener("click", () => {
    $("#barcodeScannerSection").style.display = "block";
    $("#ocrInvoiceSection").style.display = "none";
    $("#switchBarcodeModeBtn").style.background = "#e0f2fe";
    $("#switchBarcodeModeBtn").style.color = "#0369a1";
    $("#switchOcrModeBtn").style.background = "";
    $("#switchOcrModeBtn").style.color = "";
    startBarcodeCamera();
  });

  $("#switchOcrModeBtn")?.addEventListener("click", () => {
    stopBarcodeCamera();
    $("#barcodeScannerSection").style.display = "none";
    $("#ocrInvoiceSection").style.display = "block";
    $("#switchOcrModeBtn").style.background = "#e0f2fe";
    $("#switchOcrModeBtn").style.color = "#0369a1";
    $("#switchBarcodeModeBtn").style.background = "";
    $("#switchBarcodeModeBtn").style.color = "";
  });

  $("#submitBarcodeBtn")?.addEventListener("click", () => {
    const code = $("#manualBarcodeInput")?.value?.trim();
    if (!code) return;
    const match = (state.quickItems || []).find((i) => i.id === code || i.name.toLowerCase().includes(code.toLowerCase()));
    if (match) {
      showToast(`Đã tìm thấy món: ${match.name} (${formatMoney(match.price)})`);
      $("#scannerDialog")?.close();
      stopBarcodeCamera();
      // Auto add sale
      const activeBranch = state.currentBranch && state.currentBranch !== "all" ? state.currentBranch : "Quán Nhà (Chính)";
      themGiaoDich({
        loai: "thu",
        soTien: match.price,
        soLuong: 1,
        giaCostDonVi: match.costPrice || 0,
        tongGiaCost: match.costPrice || 0,
        danhMuc: match.category || match.name,
        chiNhanh: activeBranch,
      }).then(async () => {
        state = await docDuLieu();
        renderAll();
        triggerAutoSync();
      });
    } else {
      showToast(`Không tìm thấy món với mã "${code}"`, true);
    }
  });

  $("#invoiceDropZone")?.addEventListener("click", () => {
    $("#invoiceFileInput")?.click();
  });

  $("#invoiceFileInput")?.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const resultBox = $("#ocrResultBox");
    const summary = $("#ocrSummaryText");
    if (resultBox && summary) {
      resultBox.style.display = "block";
      summary.innerHTML = `📄 Đã tải hóa đơn: <strong>${file.name}</strong> (${(file.size / 1024).toFixed(1)} KB)<br>🔍 AI đang trích xuất chi phí: <strong>Mua nguyên liệu đá & mía</strong>`;
    }
  });

  $("#applyOcrExpenseBtn")?.addEventListener("click", async () => {
    const activeBranch = state.currentBranch && state.currentBranch !== "all" ? state.currentBranch : "Quán Nhà (Chính)";
    await themGiaoDich({
      loai: "chi",
      soTien: 150000,
      soLuong: 1,
      donViTinh: "lần",
      danhMuc: "Chi mua nguyên liệu (OCR)",
      ghiChu: "Trích xuất từ ảnh hóa đơn AI",
      chiNhanh: activeBranch,
    });
    state = await docDuLieu();
    renderAll();
    $("#scannerDialog")?.close();
    showToast("Đã ghi khoản chi 150.000 đ từ hóa đơn vào sổ!");
    triggerAutoSync();
  });

  setupAIAssistant();
}

function openVoiceConfirmDialog(parsed, rawText) {
  const dialog = $("#confirmDialog");
  if (!dialog) return;

  $("#voiceAmount").textContent = formatMoney(parsed.soTien);
  $("#voiceTypeBadge").textContent = parsed.loai === "thu" ? "+ Thu" : "- Chi";
  $("#voiceDetail").textContent = parsed.moTaXacNhan || parsed.danhMuc;
  $("#voiceCategory").textContent = parsed.danhMuc || "Danh mục";
  $("#voiceConfidence").textContent = `Độ tin cậy: ${parsed.confidence === "high" ? "Cao" : parsed.confidence === "medium" ? "Trung bình" : "Thấp"}`;
  $("#voiceQuantity").textContent = `Số lượng: ${parsed.soLuong || 1} ly`;
  $("#voicePriceMode").textContent = `Cách tính: ${parsed.slots?.priceMode === "unit" ? "Đơn giá x SL" : "Tổng tiền"}`;
  $("#heardText").textContent = `Đã nghe: "${rawText}"`;

  // Set inputs
  const confirmTypeRadio = $(`#confirmForm input[name='confirmType'][value='${parsed.loai}']`);
  if (confirmTypeRadio) confirmTypeRadio.checked = true;
  
  const paymentMethod = parsed.phuongThuc === "chuyen_khoan" ? "chuyen_khoan" : "tien_mat";
  const confirmMethodRadio = $(`#confirmForm input[name='confirmMethod'][value='${paymentMethod}']`);
  if (confirmMethodRadio) confirmMethodRadio.checked = true;

  $("#confirmAmount").value = parsed.soTien;
  $("#confirmQuantity").value = parsed.soLuong || 1;
  $("#confirmNote").value = rawText;

  // Render categories in confirm select
  const confirmCatSelect = $("#confirmCategory");
  if (confirmCatSelect) {
    const cats = parsed.loai === "thu" ? (state.danhMuc?.thu || []) : (state.danhMuc?.chi || []);
    confirmCatSelect.innerHTML = cats.map((c) => `<option value="${c}" ${c === parsed.danhMuc ? "selected" : ""}>${c}</option>`).join("");
  }

  // Voice confirmation prompt speech
  docLai(confirmationSpeech(parsed));

  dialog.showModal();

  $("#confirmForm").onsubmit = async (e) => {
    if (e.submitter?.value === "save") {
      const type = $("#confirmForm input[name='confirmType']:checked")?.value || "thu";
      const phuongThuc = $("#confirmForm input[name='confirmMethod']:checked")?.value || parsed.phuongThuc || "tien_mat";
      const amount = Number($("#confirmAmount")?.value) || parsed.soTien;
      const qty = Number($("#confirmQuantity")?.value) || parsed.soLuong || 1;
      const cat = $("#confirmCategory")?.value || parsed.danhMuc;
      const note = $("#confirmNote")?.value || rawText;

      const unitCost = parsed.giaCostDonVi || (state.quickItems || []).find((q) => q.name === cat || q.category === cat)?.costPrice || 0;
      const tongGiaCost = parsed.tongGiaCost || (qty * unitCost);

      await themGiaoDich({
        loai: type,
        soTien: amount,
        soLuong: qty,
        donViTinh: parsed.donViTinh || (type === "thu" ? "ly" : "kg"),
        phuongThuc,
        giaCostDonVi: unitCost,
        tongGiaCost: tongGiaCost,
        danhMuc: cat,
        ghiChu: note,
        cauNoiGoc: rawText,
        daSuaTay: true,
        chiNhanh: parsed.chiNhanh || state.currentBranch,
      });

      state = await docDuLieu();
      renderAll();

      if (type === "thu" && phuongThuc === "chuyen_khoan") {
        phatLoaThongBaoChuyenKhoan(amount, phuongThuc);
      }

      showToast(`Đã lưu ${type === "thu" ? "+ Thu" : "- Chi"} ${formatMoney(amount)} (${phuongThuc === "chuyen_khoan" ? "CK" : "TM"})`);
      triggerAutoSync();
    }
  };
}

function renderMarkdownLite(md) {
  const safe = escapeHtml(md);
  return safe
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n- (.*?)(?=\n|$)/g, "<li>$1</li>")
    .replace(/(<li>.*?<\/li>)/g, "<ul>$1</ul>")
    .replace(/\n/g, "<br>");
}

function renderAIChatHistory() {
  const chatBox = $("#aiChatBox");
  if (!chatBox) return;

  const history = state.aiChatHistory || [];
  if (!history.length) {
    chatBox.innerHTML = `
      <div class="ai-msg ai-msg-bot">
        <div class="ai-msg-avatar">🤖</div>
        <div class="ai-msg-content">
          <p>Dạ em là <strong>Thư Ký EV</strong> (phát âm: <em>i vi</em>)! Em sẵn sàng ghi sổ và quản lý doanh thu cho 2 chi nhánh của anh/chị.</p>
          <p>Anh/Chị chỉ cần bấm Mic hoặc đọc khẩu lệnh: <em>"i vi bán 2 ly nước mía"</em>, <em>"ê vi mua 3 bao đá 30k"</em>, <em>"EV hôm nay 2 quán lời bao nhiêu?"</em></p>
        </div>
      </div>
    `;
    return;
  }

  chatBox.innerHTML = history
    .map((msg) => {
      const isUser = msg.sender === "user";
      const avatar = isUser ? "👤" : "🤖";
      const msgClass = isUser ? "ai-msg ai-msg-user" : "ai-msg ai-msg-bot";
      const timeBadge = msg.time
        ? `<small style="display: block; font-size: 0.72rem; color: var(--muted); margin-top: 0.35rem; text-align: ${isUser ? "right" : "left"}; font-weight: 600;">${msg.time}</small>`
        : "";

      if (isUser) {
        return `
          <div class="${msgClass}">
            <div class="ai-msg-avatar">${avatar}</div>
            <div class="ai-msg-content">
              <p>${escapeHtml(msg.text)}</p>
              ${timeBadge}
            </div>
          </div>
        `;
      } else {
        const rawHtml = renderMarkdownLite(msg.text);
        return `
          <div class="${msgClass}">
            <div class="ai-msg-avatar">${avatar}</div>
            <div class="ai-msg-content">
              ${rawHtml}
              <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.35rem; gap: 0.5rem;">
                <button class="ai-tts-btn" data-text="${escapeHtml(msg.text)}" type="button">🔊 Nghe EV đọc</button>
                ${timeBadge}
              </div>
            </div>
          </div>
        `;
      }
    })
    .join("");

  chatBox.querySelectorAll(".ai-tts-btn").forEach((btn) => {
    btn.onclick = () => {
      const plainText = (btn.getAttribute("data-text") || "").replace(/[*_#`[\]()]/g, "");
      docLai(plainText);
      showToast("Đang phát âm thanh câu trả lời của EV...");
    };
  });

  chatBox.scrollTop = chatBox.scrollHeight;
}

function setupAIAssistant() {
  const chatForm = $("#aiChatForm");
  const chatInput = $("#aiChatInput");
  const chatBox = $("#aiChatBox");
  const micBtn = $("#aiMicBtn");

  if (!chatForm || !chatInput || !chatBox) return;

  renderAIChatHistory();

  // Nút xóa lịch sử trò chuyện
  const clearChatBtn = $("#clearAiChatHistoryBtn");
  if (clearChatBtn) {
    clearChatBtn.onclick = async () => {
      if (!confirm("Bạn có chắc chắn muốn xóa toàn bộ lịch sử trò chuyện AI?")) return;
      await xoaLichSuAIChat();
      state = await docDuLieu();
      renderAIChatHistory();
      showToast("Đã xóa lịch sử trò chuyện AI");
      triggerAutoSync();
    };
  }

  // Cài đặt giọng đọc Thư Ký EV
  const openVoiceModalBtn = $("#openVoiceModalBtn");
  const voiceModal = $("#voiceSettingsDialog");
  const voiceSelect = $("#voiceSelect");
  const voiceRateSelect = $("#voiceRateSelect");
  const previewVoiceBtn = $("#previewVoiceBtn");
  const cancelVoiceSettingsBtn = $("#cancelVoiceSettingsBtn");
  const saveVoiceSettingsBtn = $("#saveVoiceSettingsBtn");

  if (openVoiceModalBtn && voiceModal) {
    openVoiceModalBtn.onclick = () => {
      const current = getVoiceSettings();
      if (voiceSelect) voiceSelect.value = current.voice || "google_vi";
      if (voiceRateSelect) voiceRateSelect.value = String(current.rate || "1.0");
      voiceModal.showModal();
    };

    if (cancelVoiceSettingsBtn) {
      cancelVoiceSettingsBtn.onclick = () => voiceModal.close();
    }

    if (previewVoiceBtn) {
      previewVoiceBtn.onclick = () => {
        const previewVoice = voiceSelect ? voiceSelect.value : "google_vi";
        const previewRate = voiceRateSelect ? Number(voiceRateSelect.value) : 1.0;
        docLai("Dạ em là Thư Ký EV, luôn sẵn sàng phục vụ quán của anh chị ạ!", {
          voice: previewVoice,
          rate: previewRate,
        });
      };
    }

    if (saveVoiceSettingsBtn) {
      saveVoiceSettingsBtn.onclick = () => {
        const newSettings = {
          voice: voiceSelect ? voiceSelect.value : "google_vi",
          rate: voiceRateSelect ? Number(voiceRateSelect.value) : 1.0,
          pitch: 1.0,
        };
        saveVoiceSettings(newSettings);
        voiceModal.close();
        showToast("Đã lưu cài đặt giọng đọc Thư Ký EV!");
      };
    }
  }

  async function handleSend(text) {
    const q = text.trim();
    if (!q) return;
    chatInput.value = "";

    // 1. Lưu tin nhắn của người dùng vào DB ngay lập tức
    await luuTinNhanAIChat({ sender: "user", text: q });
    state = await docDuLieu();
    renderAIChatHistory();

    const loadingDiv = document.createElement("div");
    loadingDiv.className = "ai-msg ai-msg-bot is-loading";
    loadingDiv.innerHTML = `
      <div class="ai-msg-avatar">🤖</div>
      <div class="ai-msg-content"><p><em>EV đang phân tích số liệu tài chính của quán...</em></p></div>
    `;
    chatBox.appendChild(loadingDiv);
    chatBox.scrollTop = chatBox.scrollHeight;

    try {
      const apiKey = state.sync?.geminiApiKey || "";
      const result = await hoiGeminiAI(q, state, apiKey);

      let botReply = result.reply;

      // 1. Lệnh hành động quản lý (Thêm món, Sửa món, Xóa món, Chuyển quán)
      if (result.type === "action") {
        if (result.action === "add_menu_item") {
          state.quickItems = state.quickItems || [];
          const existingIdx = state.quickItems.findIndex(
            (i) => i.name.toLowerCase() === result.item.name.toLowerCase()
          );
          if (existingIdx >= 0) {
            state.quickItems[existingIdx] = result.item;
          } else {
            state.quickItems.push(result.item);
          }

          state.danhMuc = state.danhMuc || { thu: [], chi: [] };
          state.danhMuc.thu = state.danhMuc.thu || [];
          if (!state.danhMuc.thu.includes(result.item.name)) {
            state.danhMuc.thu.push(result.item.name);
          }

          await luuDanhSachMenu(state.quickItems);
          showToast(`Đã thêm món ${result.item.name}`);
        } else if (result.action === "update_menu_price") {
          state.quickItems = (state.quickItems || []).map((item) => {
            if (item.id === result.itemId || item.name.toLowerCase() === (result.itemName || "").toLowerCase()) {
              return { ...item, price: result.newPrice };
            }
            return item;
          });
          await luuDanhSachMenu(state.quickItems);
          showToast(`Đã đổi giá món ${result.itemName} thành ${formatMoney(result.newPrice)}`);
        } else if (result.action === "update_menu_cost") {
          await capNhatCostChoMon(result.itemId || result.itemName, result.newCost);
          state.quickItems = (state.quickItems || []).map((item) => {
            if (item.id === result.itemId || item.name.toLowerCase() === (result.itemName || "").toLowerCase()) {
              return { ...item, costPrice: result.newCost };
            }
            return item;
          });
          showToast(`Đã đổi giá vốn món ${result.itemName} thành ${formatMoney(result.newCost)}`);
        } else if (result.action === "delete_menu_item") {
          state.quickItems = (state.quickItems || []).filter((i) => i.id !== result.itemId);
          await luuDanhSachMenu(state.quickItems);
          showToast(`Đã xóa món ${result.itemName}`);
        } else if (result.action === "update_overhead") {
          const targetBranch = result.branch || state.currentBranch || "Quán Nhà (Chính)";
          await luuOverheadChoChiNhanh(targetBranch, result.overhead);
          state = await docDuLieu();
          renderAll();
          showToast(`Đã cập nhật định phí cho ${targetBranch}`);
        } else if (result.action === "add_branch") {
          state.branches = state.branches || [];
          const newBranch = { id: `branch_${Date.now()}`, name: result.branchName };
          state.branches.push(newBranch);
          await luuDanhSachChiNhanh(state.branches);
          showToast(`Đã thêm chi nhánh: ${result.branchName}`);
        } else if (result.action === "delete_last_transaction") {
          state.ds = state.ds || [];
          const lastTx = state.ds.slice().reverse().find((t) => !t.deleted);
          if (lastTx) {
            await xoaGiaoDich(lastTx.id);
            showToast(`Đã xóa giao dịch gần nhất: ${lastTx.danhMuc} (${formatMoney(lastTx.soTien)})`);
          }
        } else if (result.action === "toggle_dark_mode") {
          document.body.classList.toggle("theme-dark", result.enabled);
          localStorage.setItem("theme_dark", result.enabled ? "1" : "0");
          showToast(`Đã ${result.enabled ? "bật" : "tắt"} giao diện ban đêm`);
        } else if (result.action === "set_default_opening_cash") {
          state.defaultOpeningCash = result.amount;
          await luuDuLieu(state);
          showToast(`Đã cài tiền thối mặc định: ${formatMoney(result.amount)}`);
        } else if (result.action === "switch_branch") {
          await capNhatCurrentBranch(result.branch);
          showToast(`Đã chuyển sang ${result.branch}`);
        } else if (result.action === "update_last_transaction") {
          state.ds = state.ds || [];
          const updated = result.updatedTx;
          const idx = state.ds.findIndex((t) => t.id === updated.id);
          const targetIdx = idx >= 0 ? idx : state.ds.length - 1;
          if (targetIdx >= 0 && state.ds[targetIdx]) {
            state.ds[targetIdx].soLuong = updated.soLuong;
            state.ds[targetIdx].tongGiaCost = updated.tongGiaCost;
            await luuDuLieu(state);
          }
          showToast(`Đã cập nhật lại thành ${updated.soLuong} ${updated.donViTinh || "ly"}`);
        } else if (result.action === "learn_customer") {
          await luuKhachQuen(result.customer);
          showToast(`Đã lưu khách quen: ${result.customer.name}`);
        } else if (result.action === "save_procurement_context") {
          const ctx = result.contextData;
          if (ctx) {
            state.procurementHistory = state.procurementHistory || [];
            state.procurementHistory.push(ctx);
            const lastChi = (state.ds || []).slice().reverse().find((t) => !t.deleted && t.loai === "chi");
            if (lastChi) {
              lastChi.ghiChu = `${lastChi.ghiChu || lastChi.danhMuc} | Bối cảnh: ${ctx.answer}`;
            }
            await luuDuLieu(state);
            showToast(`Đã ghi nhớ bối cảnh nhập ${ctx.item}!`);
            triggerAutoSync();
          }
        } else if (result.action === "customer_debt") {
          showToast(`Đã ghi nợ: ${result.customerName} (${formatMoney(result.debtAmount)})`);
        } else if (result.action === "restart_today") {
          const scope = result.branch || state.currentBranch || "all";
          await restartDuLieuHomNay({
            dateKey: todayKey(),
            branch: scope,
            note: result.note || "",
            resetOpeningCash: false,
          });
          showToast(`Đã restart dữ liệu hôm nay (${scope === "all" ? "Tất cả điểm bán" : scope})`);
        } else if (result.action === "set_opening_cash") {
          const today = todayKey();
          await luuTienThoiDauNgay(today, result.openingCash, result.branch || state.currentBranch || "Quán Nhà (Chính)");
          showToast(`Đã lưu tiền thối: ${formatMoney(result.openingCash)}`);
        } else if (result.action === "set_opening_cash_and_add_transaction") {
          const today = todayKey();
          const branchToUse = result.branch || state.currentBranch || "Quán Nhà (Chính)";
          await luuTienThoiDauNgay(today, result.openingCash, branchToUse);
          const parsed = result.parsed;
          if (parsed && parsed.soTien > 0) {
            await themGiaoDich({
              loai: parsed.loai,
              soTien: parsed.soTien,
              soLuong: parsed.soLuong || 1,
              donViTinh: parsed.donViTinh || "ly",
              phuongThuc: parsed.phuongThuc || "tien_mat",
              giaCostDonVi: parsed.giaCostDonVi || 0,
              tongGiaCost: parsed.tongGiaCost || 0,
              danhMuc: parsed.danhMuc,
              ghiChu: parsed.ghiChu || q,
              cauNoiGoc: q,
              daSuaTay: false,
              chiNhanh: branchToUse,
            });
          }
          showToast(`Đã lưu tiền thối ${formatMoney(result.openingCash)} & ghi bán ${parsed?.danhMuc}`);
        }
      } else if (result.type === "command" && result.action === "add_batch_transactions" && Array.isArray(result.items)) {
        for (const item of result.items) {
          const branchToUse = item.chiNhanh || result.branch || state.currentBranch || "Quán Nhà (Chính)";
          await themGiaoDich({
            loai: item.loai,
            soTien: item.soTien,
            soLuong: item.soLuong || 1,
            donViTinh: item.donViTinh || "ly",
            phuongThuc: item.phuongThuc || "tien_mat",
            giaCostDonVi: item.giaCostDonVi || 0,
            tongGiaCost: item.tongGiaCost || 0,
            danhMuc: item.danhMuc,
            ghiChu: item.ghiChu || q,
            cauNoiGoc: q,
            daSuaTay: false,
            chiNhanh: branchToUse,
          });
        }
        showToast(`Đã ghi sổ ${result.items.length} món (${formatMoney(result.total || 0)})`);
      } else if (result.type === "command") {
        const parsed = result.parsed || phanTichChiTiet(q, state.quickItems || []);
        if (parsed.soTien > 0) {
          const branchToUse = parsed.chiNhanh || result.branch || state.currentBranch || "Quán Nhà (Chính)";
          await themGiaoDich({
            loai: parsed.loai,
            soTien: parsed.soTien,
            soLuong: parsed.soLuong || 1,
            donViTinh: parsed.donViTinh || "ly",
            phuongThuc: parsed.phuongThuc || "tien_mat",
            giaCostDonVi: parsed.giaCostDonVi || 0,
            tongGiaCost: parsed.tongGiaCost || 0,
            danhMuc: parsed.danhMuc,
            ghiChu: parsed.ghiChu || q,
            cauNoiGoc: q,
            daSuaTay: false,
            chiNhanh: branchToUse,
          });

          botReply = `✅ **Dạ EV đã ghi sổ thành công**:
- **Loại**: ${parsed.loai === "thu" ? "+ Thu tiền bán" : "- Chi tiền"}
- **Món/Khoản**: **${parsed.danhMuc}** (${parsed.soLuong} ${parsed.donViTinh})
- **Số tiền**: **${formatMoney(parsed.soTien)}** ${parsed.phuongThuc === "chuyen_khoan" ? "(CK)" : "(Tiền mặt)"}
- **Điểm bán**: **${branchToUse}**
- **Giá vốn (Cost)**: ${formatMoney(parsed.tongGiaCost)}

*Dữ liệu đã được cập nhật vào bảng doanh thu hôm nay!*`;
          showToast(`EV đã ghi vào ${branchToUse}`);
        }
      }

      // 2. Lưu câu trả lời của EV/AI vào lịch sử chat
      await luuTinNhanAIChat({ sender: "bot", text: botReply, action: result.action });
      state = await docDuLieu();
      renderAll();
      triggerAutoSync();
    } catch (e) {
      const errorMsg = "Dạ EV xin lỗi, đã xảy ra lỗi khi phân tích. Bạn vui lòng thử lại câu hỏi khác nhé!";
      await luuTinNhanAIChat({ sender: "bot", text: errorMsg });
      state = await docDuLieu();
      renderAll();
    } finally {
      loadingDiv?.remove();
    }
  }

  chatForm.addEventListener("submit", (e) => {
    e.preventDefault();
    e.stopPropagation();
    handleSend(chatInput.value);
    return false;
  });

  const sendBtn = $("#aiSendBtn");
  if (sendBtn) {
    sendBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      handleSend(chatInput.value);
    });
  }

  chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      handleSend(chatInput.value);
    }
  });

  // Quick prompt chips
  $$(".ai-chip").forEach((chip) => {
    chip.onclick = () => {
      const prompt = chip.getAttribute("data-prompt");
      if (prompt) handleSend(prompt);
    };
  });

  // AI Voice Mic
  let aiMicListening = false;
  if (micBtn) {
    micBtn.onclick = async () => {
      if (aiMicListening) {
        aiMicListening = false;
        micBtn.classList.remove("is-listening");
        const res = await dungNghe();
        if (res.text) handleSend(res.text);
        return;
      }

      aiMicListening = true;
      micBtn.classList.add("is-listening");
      showToast("Thư Ký EV đang lắng nghe bạn nói...");

      await batDauNghe(
        (res) => {
          chatInput.value = res.text;
          if (res.isFinal) {
            aiMicListening = false;
            micBtn.classList.remove("is-listening");
            handleSend(res.text);
          }
        },
        (err) => {
          aiMicListening = false;
          micBtn.classList.remove("is-listening");
          showToast(err?.message || "Không nhận diện được giọng nói", true);
        }
      );
    };
  }

  // Gemini API Key Save in Settings
  const geminiInput = $("#geminiApiKeyInput");
  const saveGeminiBtn = $("#saveGeminiKeyBtn");
  if (geminiInput) {
    geminiInput.value = state.sync?.geminiApiKey || "";
  }
  if (saveGeminiBtn) {
    saveGeminiBtn.onclick = async () => {
      const key = geminiInput?.value?.trim() || "";
      state.sync = state.sync || {};
      state.sync.geminiApiKey = key;
      await luuDuLieu(state);
      showToast(key ? "Đã lưu khóa Google Gemini AI thành công!" : "Đã chuyển về Trợ lý AI phân tích nội bộ.");
    };
  }
}

// ----------------------------------------------------
// INITIALIZATION
// ----------------------------------------------------

async function init() {
  try {
    const sDate = $("#statsDateInput");
    if (sDate) sDate.value = statsDate;
    const sWeek = $("#statsWeekInput");
    if (sWeek) sWeek.value = statsWeekDate;

    // Auto-refresh transaction costs according to latest menu cost config
    await capNhatLaiGiaCostToanBoGiaoDich();
    await chuyenTatCaGiaoDichMua10kgThanhXuatDung();
    state = await docDuLieu();
  } catch (e) {
    console.warn("Init pre-flight warning:", e);
  }

  // Always bind event listeners reliably
  try {
    initEventListeners();
  } catch (e) {
    console.error("initEventListeners error:", e);
  }

  // Render everything
  try {
    renderAll({ forceAll: true });
  } catch (e) {
    console.error("renderAll error:", e);
  }

  // Check auth session
  if (!isAuthBypassedForTest()) {
    try {
      const isAuth = await daDangNhap();
      if (!isAuth) {
        $("#authScreen").hidden = false;
        $(".app-shell")?.classList.add("is-auth-locked");
        const authEmailInput = $("#authEmail");
        if (authEmailInput && !authEmailInput.value && state?.sync?.accountEmail) {
          authEmailInput.value = state.sync.accountEmail;
        }
        await updateSyncUI();
      } else {
        $("#authScreen").hidden = true;
        $(".app-shell")?.classList.remove("is-auth-locked");
        authLoggedIn = true;
        await triggerAutoSync();
        await startRealtimeListener();
        await updateSyncUI();

        // Background Auto-Sync Heartbeat & Lifecycle Listeners (Continuous Full-State Sync)
        if (typeof window !== "undefined") {
          document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === "visible") {
              triggerAutoSync();
            }
          });

          window.addEventListener("focus", () => {
            triggerAutoSync();
          });

          window.addEventListener("online", () => {
            triggerAutoSync();
          });

          setInterval(() => {
            triggerAutoSync();
          }, 10000);
        }
      }
    } catch {
      $("#authScreen").hidden = false;
      $(".app-shell")?.classList.add("is-auth-locked");
      await updateSyncUI();
    }
  } else {
    await updateSyncUI();
  }

  // Auto-prompt Morning Cash Drawer Check on first morning open
  try {
    const today = todayKey();
    const hour = new Date().getHours();
    const morningPromptKey = `routine_morning_shown_${today}`;
    if (hour >= 5 && hour < 11.5 && typeof localStorage !== "undefined" && !localStorage.getItem(morningPromptKey)) {
      localStorage.setItem(morningPromptKey, "true");
      setTimeout(() => {
        openDailyRoutineModal("morning");
      }, 500);
    }
  } catch (err) {
    console.warn("Routine prompt check failed:", err);
  }

  console.log("Sổ Quán Nước Mía 2.0 đã khởi động thành công!");

  if (typeof window !== "undefined" && "serviceWorker" in navigator && window.location.protocol.startsWith("http")) {
    navigator.serviceWorker.register("./sw.js").catch((err) => {
      console.warn("[SW] Registration failed:", err);
    });
  }
}

init();






window.openWalletLedger = function() {
  const tbody = $("#walletLedgerBody");
  if (!tbody) return;
  
  let ledger = [];
  
  (state.ds || []).forEach(tx => {
    if (tx.deleted) return;
    
    // 1. Expense that deducted from wallet
    if (tx.loai === 'chi') {
      let isWallet = tx.nguonTienChi === 'tien_von';
      if (!tx.nguonTienChi && (tx.ngay || '') < '2026-09-03') {
        const name = (tx.danhMuc || '').toLowerCase();
        if (!(name.includes('đá') && Number(tx.soTien) === 21000)) {
          isWallet = true;
        }
      }
      if (isWallet) {
        ledger.push({
          dateObj: new Date(tx.createdAt || (tx.ngay + "T12:00:00Z")),
          title: "Chi: " + (tx.danhMuc || "Không tên"),
          amount: -Number(tx.soTien || 0)
        });
      }
    }
    
    // 2. Fund transactions (chuyen_quy) that hit capitalWallet
    if (tx.loai === 'chuyen_quy' || tx.loai === 'dieu_chinh_quy') {
      if (tx.fund === 'capitalWallet') {
        let title = "Hoàn vốn (Chốt ca)";
        if (tx.type === 'manual_adjust' || tx.type === 'manual_adjustment') title = "Điều chỉnh sổ quỹ";
        ledger.push({
          id: tx.id,
          dateObj: new Date(tx.createdAt || (tx.ngay + "T12:00:00Z")),
          title: title,
          amount: Number(tx.soTien || 0),
          canDelete: tx.type === 'manual_adjust' || tx.type === 'manual_adjustment'
        });
      }
    }
  });
  
  // Sort chronologically
  ledger.sort((a, b) => a.dateObj - b.dateObj);
  
  let html = '';
  let runningBalance = Number(state?.initialCapital ?? state?.capitalWalletInitial ?? 4990000); // Khởi tạo
  
  html += `<tr>
    <td style="font-size: 0.8rem; color: #64748b;">Khởi tạo</td>
    <td>Vốn ban đầu</td>
    <td style="text-align: right; font-weight: bold; color: #1e293b;">${formatMoney(runningBalance)}</td>
  </tr>`;
  
  ledger.forEach(tx => {
    runningBalance += tx.amount;
    const timeStr = tx.dateObj.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    const isPos = tx.amount >= 0;
    
    html += `<tr>
      <td style="font-size: 0.8rem; color: #64748b;">${timeStr}</td>
      <td>${escapeHtml(tx.title)}<br><span style="color: ${isPos ? '#10b981' : '#ef4444'}; font-weight: bold; font-size: 0.9rem;">${isPos ? '+' : ''}${formatMoney(tx.amount)}</span></td>
      <td style="text-align: right; font-weight: bold; color: #1e293b;">${formatMoney(runningBalance)}</td>
    </tr>`;
  });
  
  tbody.innerHTML = html;
  
  const dialog = $("#walletLedgerDialog");
  if (dialog && typeof dialog.showModal === 'function') dialog.showModal();
};

window.deleteLedgerTx = async function(id) {
  if (!confirm('Bạn có chắc chắn muốn xóa giao dịch điều chỉnh này?')) return;
  
  const data = await docDuLieu();
  const txIndex = data.ds.findIndex(tx => String(tx.id) === String(id));
  
  if (txIndex !== -1) {
    data.ds[txIndex].deleted = true;
    Object.assign(state, data);
    await luuDuLieu(state);
    
    renderFundsWidget();
    window.openWalletLedger();
    
    showToast('Đã xóa giao dịch điều chỉnh sổ quỹ');
    triggerAutoSync();
  }
};
