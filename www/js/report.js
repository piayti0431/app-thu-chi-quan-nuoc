const CHU_SO = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];

function docBlock3(n, hasHigher = false) {
  const tram = Math.floor(n / 100);
  const chuc = Math.floor((n % 100) / 10);
  const donVi = n % 10;
  let res = [];

  if (tram > 0 || hasHigher) {
    res.push(`${CHU_SO[tram]} trăm`);
    if (chuc === 0 && donVi > 0) res.push("lẻ");
  }

  if (chuc > 0) {
    if (chuc === 1) res.push("mười");
    else res.push(`${CHU_SO[chuc]} mươi`);
  }

  if (donVi > 0) {
    if (chuc > 1 && donVi === 1) {
      res.push("mốt");
    } else if (chuc > 0 && donVi === 5) {
      res.push("lăm");
    } else if (chuc === 0 && donVi === 5 && (tram > 0 || hasHigher)) {
      res.push("năm");
    } else {
      res.push(CHU_SO[donVi]);
    }
  }

  return res.join(" ");
}

export function docSoTiengViet(number) {
  const rawNum = Number(number) || 0;
  if (rawNum < 0) {
    return 'âm ' + docSoTiengViet(Math.abs(rawNum));
  }
  const num = Math.round(Math.abs(rawNum));
  if (num === 0) return "không";

  const ty = Math.floor(num / 1_000_000_000);
  const trieu = Math.floor((num % 1_000_000_000) / 1_000_000);
  const nghin = Math.floor((num % 1_000_000) / 1_000);
  const donVi = num % 1_000;

  let parts = [];
  if (ty > 0) {
    parts.push(`${docSoTiengViet(ty)} tỷ`);
  }
  if (trieu > 0) {
    const hasHigher = ty > 0;
    parts.push(`${docBlock3(trieu, hasHigher)} triệu`);
  }
  if (nghin > 0) {
    const hasHigher = ty > 0 || trieu > 0;
    parts.push(`${docBlock3(nghin, hasHigher)} nghìn`);
  }
  if (donVi > 0) {
    const hasHigher = ty > 0 || trieu > 0 || nghin > 0;
    parts.push(docBlock3(donVi, hasHigher));
  }

  return parts.join(" ").replace(/\s+/g, " ").trim();
}

export function docSoTienTiengViet(number) {
  const num = Math.round(Number(number) || 0);
  if (num === 0) return "không đồng";
  return `${docSoTiengViet(num)} đồng`;
}

const spokenMoney = new Intl.NumberFormat("vi-VN", {
  maximumFractionDigits: 0,
});

export function formatReportDate(dateKey) {
  const match = String(dateKey || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return dateKey || "";
  return `ngày ${Number(match[3])} tháng ${Number(match[2])} năm ${match[1]}`;
}

export function formatReportMoney(value) {
  return `${spokenMoney.format(Number(value) || 0)} đồng`;
}

export function matchBranch(itemBranch, selectedBranch) {
  if (!selectedBranch || selectedBranch === "all" || selectedBranch === "Tất cả điểm bán") return true;
  if (!itemBranch) {
    const isSelMain = selectedBranch.includes("Nhà") || selectedBranch.includes("Chính") || selectedBranch === "main";
    return isSelMain;
  }
  const normItem = String(itemBranch).toLowerCase().trim();
  const normSel = String(selectedBranch).toLowerCase().trim();
  if (normItem === normSel) return true;

  const isMain = (s) => s.includes("nhà") || s.includes("chính") || s === "main";
  if (isMain(normItem) && isMain(normSel)) return true;

  const isBranch2 = (s) => /\b(?:cn\s*2|chi\s*nhánh\s*2|chi\s*nhanh\s*2|branch\s*2)\b/i.test(s) || s === "2" || s === "cn2";
  if (isBranch2(normItem) && isBranch2(normSel)) return true;

  return false;
}

export function dailyReport(transactions, dateKey, branch = null, openingCash = 500000) {
  const items = transactions.filter(
    (item) => !item.deleted && item.ngay === dateKey && matchBranch(item.chiNhanh, branch),
  );

  let income = 0;
  let expense = 0;
  let cost = 0;
  let totalDrinks = 0;
  let cashIncome = 0;
  let transferIncome = 0;
  let cashDrawerExpense = 0;

  for (const item of items) {
    const amount = Number(item.soTien || 0);
    if (item.loai === "thu") {
      income += amount;
      const qty = Number(item.soLuong || 1);
      const unitCost = Number(item.giaCostDonVi || 0);
      cost += Number(item.tongGiaCost || (qty * unitCost) || 0);
      totalDrinks += qty;

      if (item.phuongThuc === "chuyen_khoan") {
        transferIncome += amount;
      } else {
        cashIncome += amount;
      }
    } else if (item.loai === "chi") {
      expense += amount;
      let isFromDrawer = true;
      if (!item.nguonTienChi) {
        const itemDateStr = item.ngay || "";
        if (itemDateStr < "2026-09-01") {
          const name = (item.danhMuc || "").toLowerCase();
          isFromDrawer = name.includes("đá") && amount === 21000;
        } else {
          isFromDrawer = true;
        }
      } else {
        isFromDrawer = item.nguonTienChi !== "tien_von";
      }
      if (isFromDrawer) {
        cashDrawerExpense += amount;
      }
    }
  }

  const walletExpense = expense - cashDrawerExpense;
  
  const cashBalance = cashIncome - cashDrawerExpense;
  const balance = income - expense;
  const grossProfit = income - cost;
  const initialCash = Number(openingCash) >= 0 ? Number(openingCash) : 500000;
  const expectedCashInDrawer = initialCash + cashBalance;

  const vnIncome = docSoTienTiengViet(income);
  const vnCash = docSoTienTiengViet(cashIncome);
  const vnTransfer = docSoTienTiengViet(transferIncome);
  const vnExpense = docSoTienTiengViet(expense);
  const vnCashBalance = docSoTienTiengViet(cashBalance);
  const vnOpeningCash = docSoTienTiengViet(initialCash);
  const vnDrawer = docSoTienTiengViet(expectedCashInDrawer);
  const vnDrinks = docSoTiengViet(totalDrinks);

  return {
    dateText: formatReportDate(dateKey),
    income,
    cashIncome,
    transferIncome,
    expense,
    cashDrawerExpense,
    walletExpense,
    cost,
    grossProfit,
    balance,
    cashBalance,
    openingCash: initialCash,
    expectedCashInDrawer,
    totalDrinks,
    items,
    text: `Doanh thu ${formatReportDate(dateKey)}. Tổng thu ${vnIncome}, gồm tiền mặt ${vnCash}, chuyển khoản ${vnTransfer}. Tổng chi là ${vnExpense}. Tiền mặt còn lại là ${vnCashBalance}.`,
    detailedText: `Tổng kết ${formatReportDate(dateKey)}. Quán bán được ${vnDrinks} ly, tổng doanh thu ${vnIncome}, trong đó tiền mặt là ${vnCash}, chuyển khoản là ${vnTransfer}. Tiền chi mua hàng là ${vnExpense}. Tiền thối đầu ngày là ${vnOpeningCash}. Tổng tiền mặt cần có trong két là ${vnDrawer}.`,
  };
}

export function computeFundBalances(data) {
  let capitalWallet = Number(data?.initialCapital ?? data?.capitalWalletInitial ?? 4990000);
  let rentFund = 0;
  let profitFund = 0;

  (data.ds || []).forEach(tx => {
    if (tx.deleted) return;
    if (tx.loai === 'chi') {
      let isWallet = tx.nguonTienChi === 'tien_von';
      if (!tx.nguonTienChi && (tx.ngay || '') < '2026-09-03') {
        const name = (tx.danhMuc || '').toLowerCase();
        if (!(name.includes('đá') && Number(tx.soTien) === 21000)) {
          isWallet = true;
        }
      }
      if (isWallet) {
        capitalWallet -= Number(tx.soTien || 0);
      }
    }
  });

    (data.ds || []).filter(tx => tx.loai === 'chuyen_quy' || tx.loai === 'dieu_chinh_quy').forEach(ftx => {
    if (ftx.deleted) return;
    if (ftx.fund === 'capitalWallet') capitalWallet += Number(ftx.soTien || 0);
    else if (ftx.fund === 'rentFund') rentFund += Number(ftx.soTien || 0);
    else if (ftx.fund === 'profitFund') profitFund += Number(ftx.soTien || 0);
  });

  return { capitalWallet, rentFund, profitFund };
}

