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
  const num = Math.round(Math.abs(Number(number) || 0));
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

export function dailyReport(transactions, dateKey, branch = null, openingCash = 500000) {
  const isAll = !branch || branch === "all" || branch === "Tất cả điểm bán";
  const items = transactions.filter(
    (item) => !item.deleted && item.ngay === dateKey && (isAll || item.chiNhanh === branch),
  );
  const income = items
    .filter((item) => item.loai === "thu")
    .reduce((total, item) => total + Number(item.soTien || 0), 0);
  const expense = items
    .filter((item) => item.loai === "chi")
    .reduce((total, item) => total + Number(item.soTien || 0), 0);
  const cost = items
    .filter((item) => item.loai === "thu")
    .reduce((total, item) => total + Number(item.tongGiaCost || (Number(item.soLuong || 1) * Number(item.giaCostDonVi || 0)) || 0), 0);
  const totalDrinks = items
    .filter((item) => item.loai === "thu")
    .reduce((total, item) => total + Number(item.soLuong || 1), 0);
  const cashIncome = items
    .filter((item) => item.loai === "thu" && item.phuongThuc !== "chuyen_khoan")
    .reduce((total, item) => total + Number(item.soTien || 0), 0);
  const transferIncome = items
    .filter((item) => item.loai === "thu" && item.phuongThuc === "chuyen_khoan")
    .reduce((total, item) => total + Number(item.soTien || 0), 0);
  const cashBalance = cashIncome - expense;
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
