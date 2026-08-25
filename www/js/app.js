import {
  capNhatCauHinhSync,
  capNhatCostChoMon,
  capNhatCurrentBranch,
  capNhatGiaNhanh,
  docDuLieu,
  luuCostFormula,
  luuDanhSachChiNhanh,
  luuDanhSachMenu,
  luuDuLieu,
  luuOverheadConfig,
  luuOverheadVaPackagingConfig,
  luuPackagingConfig,
  luuTienThoiDauNgay,
  luuKhachQuen,
  luuTinNhanAIChat,
  nhapDuLieuTuJson,
  restartDuLieuHomNay,
  themGiaoDich,
  xoaGiaoDich,
  xoaLichSuAIChat,
  xoaTatCaDuLieu,
  xuatDuLieuJson,
} from "./db.js";
import { phanTichChiTiet, phanTichNhieu } from "./parser.js";
import { dailyReport, docSoTienTiengViet, formatReportDate, formatReportMoney } from "./report.js";
import { batDauNghe, docLai, dungNghe, getVoiceSettings, saveVoiceSettings, yeuCauQuyenMicro } from "./speech.js";
import { hoiGeminiAI, phanTichTaiChinhNoiBo } from "./ai-assistant.js";
import {
  batDauRealtime,
  dangKy,
  dangNhap,
  dangXuat,
  daDangNhap,
  dongBo,
  dungRealtime,
  phatTinHieuSync,
  syncErrorMessage,
} from "./sync.js";
import { caiCapNhat, kiemTraCapNhat, layPhienBanHienTai } from "./updater.js";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
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
let toastTimer = null;
let micListening = false;
let micStopping = false;
let authLoggedIn = false;
let authLoginBusy = false;
let realtimeActive = false;
let pendingUpdate = null;
let updateCheckBusy = false;
let updateCheckTimer = null;
let appVersionText = "Phiên bản 2.0 (Toàn diện)";

// Stats view state
let statsMode = "day"; // "day" | "week" | "month"
let statsBranch = "all";
let statsDate = todayKey();
let statsWeekDate = todayKey();
let statsMonth = todayKey().slice(0, 7);

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

function showToast(message, isError = false) {
  const toast = $("#toast");
  if (!toast) return;
  toast.textContent = message;
  toast.className = `toast is-visible${isError ? " is-error" : ""}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.className = "toast";
  }, 2600);
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

  // Settings branch manager
  renderBranchManager();
}

function renderQuickButtons() {
  const container = $("#quickButtons");
  if (!container) return;

  const quickItems = state.quickItems || [];
  container.innerHTML = quickItems
    .map(
      (item) => `
      <button class="quick-btn theme-${item.icon || "cane"}" data-id="${item.id}" type="button" aria-label="Bán nhanh ${item.name} (${formatMoney(item.price)})">
        <span class="drink-icon">${getDrinkIconSvg(item.icon)}</span>
        <strong>+ 1 ${item.shortName || item.name}</strong>
        <small>${formatMoney(item.price)}</small>
      </button>
    `,
    )
    .join("");

  $$("#quickButtons .quick-btn").forEach((btn) => {
    btn.onclick = async () => {
      const id = btn.getAttribute("data-id");
      const item = quickItems.find((q) => q.id === id);
      if (!item) return;

      const activeBranch = (state.currentBranch && state.currentBranch !== "all")
        ? state.currentBranch
        : ((state.branches && state.branches[0]?.name) || "Quán Nhà (Chính)");

      const tx = await themGiaoDich({
        loai: "thu",
        soTien: item.price,
        soLuong: 1,
        giaCostDonVi: item.costPrice || 0,
        tongGiaCost: item.costPrice || 0,
        danhMuc: item.category || item.name,
        ghiChu: item.note || `Bán 1 ${item.name}`,
        cauNoiGoc: `Bán 1 ${item.name}`,
        daSuaTay: false,
        chiNhanh: activeBranch,
      });

      state = await docDuLieu();
      renderAll();
      showToast(`+1 ${item.name} (${formatMoney(item.price)}) - ${activeBranch}`);
      triggerAutoSync();
    };
  });
}

function renderCategoryDatalist() {
  const datalist = $("#categoryDatalist");
  if (!datalist) return;
  const isThu = $("#manualForm input[name='loai']:checked")?.value === "thu";
  const list = isThu ? (state.danhMuc?.thu || []) : (state.danhMuc?.chi || []);
  datalist.innerHTML = list.map((cat) => `<option value="${cat}"></option>`).join("");
}

function renderToday() {
  const today = todayKey();
  const selectedBranch = state.currentBranch || "all";
  const isAll = selectedBranch === "all";

  const items = (state.ds || []).filter(
    (item) => !item.deleted && item.ngay === today && (isAll || item.chiNhanh === selectedBranch),
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
        return `
      <div class="transaction-item ${item.loai}">
        <div class="tx-main">
          <div class="tx-title-row">
            <span class="tx-title">${item.danhMuc || (item.loai === "thu" ? "Thu" : "Chi")}</span>
            ${methodBadge}
            <span class="tx-qty">${item.soLuong ? `x${item.soLuong} ${item.donViTinh || (item.loai === "thu" ? "ly" : "kg")}` : ""}</span>
            <span class="tx-branch-badge">${item.chiNhanh || "Quán Nhà"}</span>
          </div>
          <p class="tx-note">${item.ghiChu || item.cauNoiGoc || "Không có ghi chú"}</p>
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

  $$("#todayList .delete-btn").forEach((btn) => {
    btn.onclick = async () => {
      const id = Number(btn.getAttribute("data-id"));
      if (!confirm("Bạn có chắc chắn muốn xóa giao dịch này?")) return;
      await xoaGiaoDich(id);
      state = await docDuLieu();
      renderAll();
      showToast("Đã xóa giao dịch khỏi sổ");
      triggerAutoSync();
    };
  });

  $$("#todayList .method-toggle-btn").forEach((btn) => {
    btn.onclick = async (e) => {
      e.stopPropagation();
      const id = Number(btn.getAttribute("data-id"));
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
    };
  });
}

function renderHistory() {
  const list = $("#historyList");
  if (!list) return;

  const selectedBranch = state.currentBranch || "all";
  const isAll = selectedBranch === "all";

  const items = (state.ds || []).filter((item) => !item.deleted && (isAll || item.chiNhanh === selectedBranch));
  if (!items.length) {
    list.innerHTML = `<p class="empty-state">Lịch sử giao dịch trống tại <strong>${isAll ? "tất cả điểm bán" : selectedBranch}</strong>.</p>`;
    return;
  }

  list.innerHTML = items
    .slice(0, 100)
    .map(
      (item) => {
        const isTransfer = item.loai === "thu" && item.phuongThuc === "chuyen_khoan";
        const methodBadge = item.loai === "thu"
          ? `<button class="method-toggle-btn" data-id="${item.id}" type="button" title="Bấm để đổi Tiền mặt / Chuyển khoản" style="border: 1px solid ${isTransfer ? '#bae6fd' : '#bbf7d0'}; cursor: pointer; background: ${isTransfer ? 'rgba(14, 165, 233, 0.15)' : 'rgba(16, 185, 129, 0.15)'}; color: ${isTransfer ? '#0284c7' : '#059669'}; padding: 0.12rem 0.4rem; border-radius: 0.3rem; font-size: 0.72rem; font-weight: 800;">${isTransfer ? '📱 CK' : '💵 TM'}</button>`
          : "";
        return `
      <div class="transaction-item ${item.loai}">
        <div class="tx-main">
          <div class="tx-title-row">
            <span class="tx-title">${item.danhMuc || (item.loai === "thu" ? "Thu" : "Chi")}</span>
            ${methodBadge}
            <span class="tx-qty">${item.soLuong ? `x${item.soLuong} ${item.donViTinh || (item.loai === "thu" ? "ly" : "kg")}` : ""}</span>
            <span class="tx-branch-badge">${item.chiNhanh || "Quán Nhà"}</span>
          </div>
          <p class="tx-note">${item.ghiChu || item.cauNoiGoc || ""}</p>
          <div class="tx-meta">
            <span>${formatDate(item.ngay)} ${item.gio || ""}</span>
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

  $$("#historyList .delete-btn").forEach((btn) => {
    btn.onclick = async () => {
      const id = Number(btn.getAttribute("data-id"));
      if (!confirm("Bạn có chắc chắn muốn xóa giao dịch này?")) return;
      await xoaGiaoDich(id);
      state = await docDuLieu();
      renderAll();
      showToast("Đã xóa giao dịch");
      triggerAutoSync();
    };
  });

  $$("#historyList .method-toggle-btn").forEach((btn) => {
    btn.onclick = async (e) => {
      e.stopPropagation();
      const id = Number(btn.getAttribute("data-id"));
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
    };
  });
}

// ----------------------------------------------------
// DAILY CLOSING DIALOG (PHIẾU TỔNG KẾT NGÀY)
// ----------------------------------------------------

function getTodayOpeningCash(branchParam = null) {
  const today = todayKey();
  const targetBranch = branchParam !== null ? branchParam : (state.currentBranch || "all");
  const branches = state.branches || [{ id: "main", name: "Quán Nhà (Chính)" }];

  if (targetBranch === "all") {
    return branches.reduce((sum, b) => {
      const key = `${today}_${b.name}`;
      const val = state.openingCashByDate && state.openingCashByDate[key] !== undefined
        ? Number(state.openingCashByDate[key])
        : (Number(state.defaultOpeningCash) >= 0 ? Number(state.defaultOpeningCash) : 500000);
      return sum + val;
    }, 0);
  }

  const key = `${today}_${targetBranch}`;
  if (state.openingCashByDate && state.openingCashByDate[key] !== undefined) {
    return Number(state.openingCashByDate[key]);
  }
  return Number(state.defaultOpeningCash) >= 0 ? Number(state.defaultOpeningCash) : 500000;
}

function openDailyClosingModal() {
  const dialog = $("#dailyClosingDialog");
  if (!dialog) return;

  const today = todayKey();
  const currentBranch = state.currentBranch || "all";
  const isAll = currentBranch === "all";
  const openingCash = getTodayOpeningCash(currentBranch);
  const report = dailyReport(state.ds || [], today, isAll ? null : currentBranch, openingCash);

  $("#closingBranchLabel").textContent = isAll ? "Điểm bán: Tất cả điểm bán (Toàn hệ thống)" : `Điểm bán: ${currentBranch}`;
  $("#closingDateHeader").textContent = `📋 Phiếu Tổng Kết Ngày ${formatDate(today)}`;

  $("#closingIncome").textContent = formatMoney(report.income);
  $("#closingCashIncome").textContent = formatMoney(report.cashIncome);
  $("#closingTransferIncome").textContent = formatMoney(report.transferIncome);
  $("#closingTotalCupsText").textContent = `${report.totalDrinks} ly nước`;
  $("#closingCost").textContent = formatMoney(report.cost);
  $("#closingGrossProfit").textContent = formatMoney(report.grossProfit);
  $("#closingExpense").textContent = formatMoney(report.expense);
  $("#closingNetProfit").textContent = formatMoney(report.balance);

  // Cash Reconcile values
  if ($("#closingOpeningCash")) $("#closingOpeningCash").textContent = formatMoney(report.openingCash);
  if ($("#closingCashIncomeReconcile")) $("#closingCashIncomeReconcile").textContent = `+${formatMoney(report.cashIncome)}`;
  if ($("#closingExpenseReconcile")) $("#closingExpenseReconcile").textContent = `−${formatMoney(report.expense)}`;
  if ($("#closingExpectedCash")) $("#closingExpectedCash").textContent = formatMoney(report.expectedCashInDrawer);
  if ($("#closingTransferHint")) $("#closingTransferHint").textContent = formatMoney(report.transferIncome);

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

  // Cash reconcile
  const cashInput = $("#closingCashActual");
  const cashResult = $("#closingCashResult");
  if (cashInput) cashInput.value = "";
  if (cashResult) {
    cashResult.hidden = true;
    cashResult.className = "reconcile-result";
  }

  if (cashInput && cashResult) {
    cashInput.oninput = () => {
      const val = Number(cashInput.value.replace(/[^0-9]/g, ""));
      if (!val && val !== 0) {
        cashResult.hidden = true;
        return;
      }
      cashResult.hidden = false;
      const expected = report.expectedCashInDrawer;
      const diff = val - expected;

      if (diff === 0) {
        cashResult.className = "reconcile-result is-match";
        cashResult.textContent = `✅ Khớp tiền mặt 100%! Đúng ${formatMoney(val)} tiền mặt cần có trong két.`;
      } else if (diff > 0) {
        cashResult.className = "reconcile-result is-diff";
        cashResult.textContent = `⚠️ Dư tiền mặt: +${formatMoney(diff)} (Đếm được: ${formatMoney(val)}, Cần có trong két: ${formatMoney(expected)}).`;
      } else {
        cashResult.className = "reconcile-result is-diff";
        cashResult.textContent = `⚠️ Thiếu tiền mặt: -${formatMoney(Math.abs(diff))} (Đếm được: ${formatMoney(val)}, Cần có trong két: ${formatMoney(expected)}).`;
      }
    };
  }

  // Voice speech button in closing modal
  const speechBtn = $("#readClosingSpeechBtn");
  if (speechBtn) {
    speechBtn.onclick = () => {
      docLai(report.detailedText);
      showToast("Đang phát loa đọc tổng kết ngày...");
    };
  }

  // Copy summary button
  const copyBtn = $("#copyClosingSummaryBtn");
  if (copyBtn) {
    copyBtn.onclick = () => {
      const summaryText = `📋 TỔNG KẾT QUÁN (${formatDate(today)} - ${currentBranch}):
- Bán ra: ${report.totalDrinks} ly
- Doanh thu: ${formatMoney(report.income)} (Mặt: ${formatMoney(report.cashIncome)}, CK: ${formatMoney(report.transferIncome)})
- Tiền vốn: ${formatMoney(report.cost)}
- Lợi nhuận bán nước: ${formatMoney(report.grossProfit)}
- Tiền chi: ${formatMoney(report.expense)}
- Tiền mặt trong két: ${formatMoney(report.cashBalance)}
=> TIỀN LỜI THỰC TẾ: ${formatMoney(report.balance)}`;
      navigator.clipboard?.writeText(summaryText);
      showToast("Đã sao chép báo cáo vào bộ nhớ tạm");
    };
  }

  dialog.showModal();
}

// ----------------------------------------------------
// STATS VIEW (NGÀY / TUẦN / THÁNG)
// ----------------------------------------------------

function renderStats() {
  const allItems = (state.ds || []).filter((item) => !item.deleted);
  
  // Filter by branch
  const branchItems = statsBranch === "all" ? allItems : allItems.filter((it) => it.chiNhanh === statsBranch);

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

function renderMenuManager() {
  const container = $("#menuItemsEditor");
  if (!container) return;

  const quickItems = state.quickItems || [];
  const tableHtml = `
    <div class="menu-table-container">
      <table class="menu-editor-table">
        <thead>
          <tr>
            <th style="width: 28%;">🏷️ Tên món nước</th>
            <th style="width: 22%;">💵 Giá bán (đ)</th>
            <th style="width: 28%;">🟡 Giá vốn (Cost đ)</th>
            <th style="width: 16%;">💰 Lời / 1 ly</th>
            <th style="width: 6%;"></th>
          </tr>
        </thead>
        <tbody>
          ${quickItems
            .map((item, index) => {
              const price = Number(item.price) || 0;
              const cost = Number(item.costPrice) || 0;
              const profit = price - cost;
              return `
              <tr class="menu-item-row" data-index="${index}" data-id="${item.id}">
                <td>
                  <input class="menu-item-name" value="${item.name || ""}" placeholder="Ví dụ: Nước mía" title="Tên món nước" required>
                </td>
                <td>
                  <input class="menu-item-price" type="number" value="${price}" placeholder="8000" title="Giá bán ra cho khách (đ)" required>
                </td>
                <td>
                  <div style="display: flex; gap: 0.25rem; align-items: center;">
                    <input class="menu-item-cost" type="number" value="${cost}" placeholder="3000" title="Chi phí nguyên liệu 1 ly (Cost đ)" style="flex: 1;">
                    <button class="ghost-button row-calc-cost-btn" data-id="${item.id}" type="button" title="Mở bảng tính chi tiết cost và mặt bằng cho món này" style="padding: 0.25rem 0.4rem; font-size: 0.72rem; min-height: unset; color: #0284c7; border-color: #bae6fd;">🧮</button>
                  </div>
                </td>
                <td>
                  <span class="profit-badge">+${formatMoney(profit)}</span>
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

  // Live profit calculation on input
  $$("#menuItemsEditor .menu-item-row").forEach((row) => {
    const priceInput = row.querySelector(".menu-item-price");
    const costInput = row.querySelector(".menu-item-cost");
    const profitBadge = row.querySelector(".profit-badge");

    const updateProfit = () => {
      const p = Number(priceInput?.value) || 0;
      const c = Number(costInput?.value) || 0;
      const prof = p - c;
      if (profitBadge) {
        profitBadge.textContent = prof >= 0 ? `+${formatMoney(prof)}` : `-${formatMoney(Math.abs(prof))}`;
        profitBadge.style.background = prof >= 0 ? "#ecfdf5" : "#fff1f2";
        profitBadge.style.color = prof >= 0 ? "#065f46" : "#9f1239";
      }
    };

    priceInput?.addEventListener("input", updateProfit);
    costInput?.addEventListener("input", updateProfit);
  });

  $$("#menuItemsEditor .row-calc-cost-btn").forEach((btn) => {
    btn.onclick = () => {
      const drinkId = btn.getAttribute("data-id");
      openCostCalculatorModal(drinkId);
    };
  });

  $$("#menuItemsEditor .icon-btn-del").forEach((btn) => {
    btn.onclick = () => {
      const row = btn.closest(".menu-item-row");
      const index = Number(row?.getAttribute("data-index"));
      if (quickItems.length <= 1) {
        showToast("Menu phải có ít nhất 1 món", true);
        return;
      }
      quickItems.splice(index, 1);
      renderMenuManager();
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
  currentIngredientsList = JSON.parse(JSON.stringify(formula.ingredients || defaultFormula.ingredients));
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

function renderOverheadAndPackagingManager() {
  const overhead = state.overheadConfig || {
    rentMonthly: 6000000,
    electricityMonthly: 1000000,
    waterMonthly: 300000,
    trashMonthly: 50000,
    depreciationMonthly: 300000,
    otherMonthly: 150000,
    expectedCupsPerDay: 80,
  };

  // Populate overhead inputs
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

function renderAll() {
  renderBranchSelectors();
  renderQuickButtons();
  renderCategoryDatalist();
  renderToday();
  renderHistory();
  renderStats();
  renderMenuManager();
  renderOverheadAndPackagingManager();
  renderBranchManager();
  renderAIChatHistory();

  const defaultCashInput = $("#defaultOpeningCashInput");
  if (defaultCashInput) {
    defaultCashInput.value = state.defaultOpeningCash || 500000;
  }
}

// ----------------------------------------------------
// AUTO SYNC & SUPABASE (ĐỒNG BỘ ĐA THIẾT BỊ THEO TÀI KHOẢN)
// ----------------------------------------------------

async function triggerAutoSync() {
  try {
    const isAuth = await daDangNhap();
    if (!isAuth) return;
    const syncStatus = $("#syncStatus");
    if (syncStatus) syncStatus.textContent = "Đang đồng bộ...";
    await dongBo();
    state = await docDuLieu();
    renderAll();
    if (syncStatus) syncStatus.textContent = "Đồng bộ sẵn sàng";
    await phatTinHieuSync();
  } catch (err) {
    console.warn("Auto sync failed", err);
    const syncStatus = $("#syncStatus");
    if (syncStatus) syncStatus.textContent = "Lỗi đồng bộ";
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

function initEventListeners() {
  // Tabs navigation
  $$(".tabs .tab").forEach((tab) => {
    tab.onclick = () => {
      $$(".tabs .tab").forEach((t) => t.classList.remove("is-active"));
      $$(".view").forEach((v) => v.classList.remove("is-active"));
      tab.classList.add("is-active");
      const viewId = `view-${tab.getAttribute("data-view")}`;
      $(`#${viewId}`)?.classList.add("is-active");

      if (tab.getAttribute("data-view") === "stats") {
        renderStats();
      }
    };
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

  // Daily Closing button
  $("#openDailyClosingBtn")?.addEventListener("click", () => {
    openDailyClosingModal();
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

  // Radio button loai switch (Thu / Chi) in manual form
  $$("#manualForm input[name='loai']").forEach((radio) => {
    radio.onchange = () => {
      const isThu = radio.value === "thu";
      const catInput = $("#manualCategoryInput");
      const costGroup = $("#manualCostGroup");
      if (catInput) {
        catInput.placeholder = isThu ? "Ví dụ: Nước mía thường, Trà tắc, Cam tươi..." : "Ví dụ: Mua cam, Mua mía, Mua đá, Tiền điện...";
      }
      if (costGroup) {
        costGroup.style.display = isThu ? "grid" : "none";
      }
      renderCategoryDatalist();
    };
  });

  // Manual Form Submission
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
      const note = $("#manualNote")?.value?.trim() || "";

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
      const activeBranch = (state.currentBranch && state.currentBranch !== "all")
        ? state.currentBranch
        : ((state.branches && state.branches[0]?.name) || "Quán Nhà (Chính)");

      await themGiaoDich({
        loai,
        soTien: amount,
        soLuong: qty,
        donViTinh: unit,
        phuongThuc,
        giaCostDonVi: costPrice || 0,
        tongGiaCost: qty * (costPrice || 0),
        danhMuc: category,
        ghiChu: note,
        cauNoiGoc: note || `${loai === "thu" ? "Bán" : "Chi"} ${qty} ${unit} ${category}${phuongThuc === "chuyen_khoan" ? " (CK)" : ""}`,
        daSuaTay: true,
        chiNhanh: activeBranch,
      });

      state = await docDuLieu();
      renderAll();

      $("#manualAmount").value = "";
      $("#manualNote").value = "";
      $("#manualCostPrice").value = "";
      $("#manualQuantity").value = "1";

      showToast(`Đã lưu ${loai === "thu" ? "+ Thu" : "- Chi"} ${formatMoney(amount)} vào sổ`);
      triggerAutoSync();
    };

    $$("#manualForm input[name='loai']").forEach((radio) => {
      radio.onchange = () => {
        const isThu = radio.value === "thu";
        const catInput = $("#manualCategoryInput");
        const unitSelect = $("#manualUnitSelect");
        const costGroup = $("#manualCostGroup");
        if (catInput) {
          catInput.placeholder = isThu ? "Ví dụ: Nước mía thường, Trà tắc, Cam tươi..." : "Ví dụ: Mua cam, Mua mía, Mua đá, Tiền điện...";
        }
        if (unitSelect) {
          unitSelect.value = isThu ? "ly" : "kg";
        }
        if (costGroup) {
          costGroup.style.display = isThu ? "grid" : "none";
        }
        renderCategoryDatalist();
      };
    });
  }

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
  $("#addNewMenuItemBtn")?.addEventListener("click", () => {
    state.quickItems = state.quickItems || [];
    state.quickItems.push({
      id: `mon_${Date.now()}`,
      name: "Món mới",
      shortName: "Món mới",
      price: 15000,
      costPrice: 5000,
      category: "Món mới",
      icon: "cane",
      voiceUnit: "ly",
    });
    renderMenuManager();
  });

  $("#saveMenuBtn")?.addEventListener("click", async () => {
    const rows = $$("#menuItemsEditor .menu-item-row");
    const updated = rows.map((row, i) => {
      const existing = (state.quickItems || [])[i] || {};
      const name = row.querySelector(".menu-item-name")?.value?.trim() || existing.name || "Món nước";
      const price = Number(row.querySelector(".menu-item-price")?.value) || existing.price || 10000;
      const costPrice = Number(row.querySelector(".menu-item-cost")?.value) || 0;
      return {
        ...existing,
        id: existing.id || `item_${i}`,
        name,
        shortName: name,
        category: name,
        price,
        costPrice,
      };
    });

    await luuDanhSachMenu(updated);
    state = await docDuLieu();
    renderAll();
    showToast("Đã lưu bảng giá Menu và Giá Vốn thành công!");
    triggerAutoSync();
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

    await luuOverheadVaPackagingConfig(newOverhead, newPackaging);
    state = await docDuLieu();
    renderAll();
    showToast("Đã lưu định phí mặt bằng, điện nước và giá vốn bao bì!");
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

  // Opening Cash Float buttons
  $("#editOpeningCashBtn")?.addEventListener("click", () => {
    const dialog = $("#editOpeningCashDialog");
    const input = $("#todayOpeningCashInput");
    if (!dialog || !input) return;
    input.value = getTodayOpeningCash();
    dialog.showModal();
  });

  $("#cancelOpeningCashBtn")?.addEventListener("click", () => {
    $("#editOpeningCashDialog")?.close();
  });

  $("#saveTodayOpeningCashBtn")?.addEventListener("click", async () => {
    const input = $("#todayOpeningCashInput");
    const amount = Number(input?.value?.replace(/[^0-9]/g, "")) || 0;
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
    const amount = Number(input?.value?.replace(/[^0-9]/g, "")) || 500000;
    await luuTienThoiMacDinh(amount);
    state = await docDuLieu();
    renderAll();
    showToast(`Đã lưu tiền thối mặc định: ${formatMoney(amount)}`);
    triggerAutoSync();
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

  $("#clearDataBtn")?.addEventListener("click", async () => {
    if (!confirm("CẢNH BÁO: Hành động này sẽ xóa toàn bộ giao dịch trên máy này. Bạn có chắc chắn muốn xóa?")) return;
    await xoaTatCaDuLieu();
    state = await docDuLieu();
    renderAll();
    showToast("Đã xóa tất cả dữ liệu");
  });

  // Supabase Auth Settings
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

  // Auto-sync on window focus / app resume
  window.addEventListener("focus", () => {
    triggerAutoSync();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      triggerAutoSync();
    }
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

      await themGiaoDich({
        loai: type,
        soTien: amount,
        soLuong: qty,
        donViTinh: parsed.donViTinh || (type === "thu" ? "ly" : "kg"),
        phuongThuc,
        giaCostDonVi: unitCost,
        tongGiaCost: qty * unitCost,
        danhMuc: cat,
        ghiChu: note,
        cauNoiGoc: rawText,
        daSuaTay: true,
        chiNhanh: parsed.chiNhanh || state.currentBranch,
      });

      state = await docDuLieu();
      renderAll();
      showToast(`Đã lưu ${type === "thu" ? "+ Thu" : "- Chi"} ${formatMoney(amount)} (${phuongThuc === "chuyen_khoan" ? "CK" : "TM"})`);
      triggerAutoSync();
    }
  };
}

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
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

          await luuDuLieu(state);
          showToast(`Đã thêm món ${result.item.name}`);
        } else if (result.action === "delete_menu_item") {
          state.quickItems = (state.quickItems || []).filter((i) => i.id !== result.itemId);
          await luuDuLieu(state);
          showToast(`Đã xóa món ${result.itemName}`);
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
  // Set default dates
  $("#statsDateInput").value = statsDate;
  $("#statsWeekInput").value = statsWeekDate;

  // Render everything
  renderAll();
  initEventListeners();

  // Check auth session
  if (!isAuthBypassedForTest()) {
    try {
      const isAuth = await daDangNhap();
      if (!isAuth) {
        $("#authScreen").hidden = false;
        $(".app-shell")?.classList.add("is-auth-locked");
      } else {
        $("#authScreen").hidden = true;
        $(".app-shell")?.classList.remove("is-auth-locked");
        authLoggedIn = true;
        await triggerAutoSync();
        await startRealtimeListener();
      }
    } catch {
      $("#authScreen").hidden = false;
      $(".app-shell")?.classList.add("is-auth-locked");
    }
  }

  console.log("Sổ Quán Nước Mía 2.0 đã khởi động thành công!");
}

init();
