const STORAGE_KEY = "nuocmia_v1";
const BACKUP_STORAGE_KEY = `${STORAGE_KEY}_backup`;

export const DEFAULT_DATA = {
  ds: [],
  currentBranch: "Quán Nhà (Chính)",
  defaultOpeningCash: 500000,
  openingCashByDate: {},
  branches: [
    { id: "main", name: "Quán Nhà (Chính)" },
    { id: "branch_2", name: "Chi nhánh 2" },
  ],
  danhMuc: {
    thu: [
      "Nước mía thường",
      "Nước mía 1 lít",
      "Mía cam",
      "Rau má tươi",
      "Rau má sữa",
      "Rau má đậu xanh",
      "Trà tắc",
      "Nước cam",
      "Thu khác",
    ],
    chi: [
      "Mía cây",
      "Cam tươi",
      "Rau má tươi",
      "Tắc tươi (Quất)",
      "Đậu xanh",
      "Sữa đặc",
      "Đường cát",
      "Tiền đá",
      "Ly/ống hút/bao bì",
      "Điện nước",
      "Xăng xe",
      "Chi khác",
    ],
  },
  quickItems: [
    {
      id: "nuoc_mia",
      name: "Nước mía thường",
      shortName: "Mía ly",
      price: 8000,
      costPrice: 3000,
      category: "Nước mía thường",
      note: "Bán nước mía thường",
      icon: "cane",
      voiceUnit: "ly",
    },
    {
      id: "nuoc_mia_1l",
      name: "Nước mía 1 lít",
      shortName: "Mía 1 lít",
      price: 15000,
      costPrice: 6000,
      category: "Nước mía 1 lít",
      note: "Bán nước mía 1 lít",
      icon: "bottle",
      voiceUnit: "chai",
    },
    {
      id: "mia_cam",
      name: "Mía cam",
      shortName: "Mía cam",
      price: 15000,
      costPrice: 6000,
      category: "Mía cam",
      note: "Bán mía cam",
      icon: "citrus",
      voiceUnit: "ly",
    },
    {
      id: "rau_ma",
      name: "Rau má tươi",
      shortName: "Rau má",
      price: 10000,
      costPrice: 4000,
      category: "Rau má tươi",
      note: "Bán rau má tươi",
      icon: "leaf",
      voiceUnit: "ly",
    },
    {
      id: "rau_ma_sua",
      name: "Rau má sữa",
      shortName: "Má sữa",
      price: 15000,
      costPrice: 6000,
      category: "Rau má sữa",
      note: "Bán rau má sữa",
      icon: "milk",
      voiceUnit: "ly",
    },
    {
      id: "rau_ma_dau_xanh",
      name: "Rau má đậu xanh",
      shortName: "Má đậu",
      price: 15000,
      costPrice: 6000,
      category: "Rau má đậu xanh",
      note: "Bán rau má đậu xanh",
      icon: "bean",
      voiceUnit: "ly",
    },
    {
      id: "tra_tac",
      name: "Trà tắc",
      shortName: "Trà tắc",
      price: 15000,
      costPrice: 4000,
      category: "Trà tắc",
      note: "Bán trà tắc",
      icon: "tea",
      voiceUnit: "ly",
    },
    {
      id: "nuoc_cam",
      name: "Nước cam",
      shortName: "Cam tươi",
      price: 15000,
      costPrice: 7000,
      category: "Nước cam",
      note: "Bán nước cam",
      icon: "orange",
      voiceUnit: "ly",
    },
  ],
  crmCustomers: [
    {
      id: "cust_chu_a",
      name: "Chú A (Chú đối diện)",
      aliases: ["chú a", "chu a", "chú đối diện", "chu doi dien", "chú tư", "chu tu", "chú xe ôm"],
      defaultDrink: "Nước mía thường",
      defaultQty: 1,
      price: 8000,
      paymentMethod: "tien_mat",
      note: "Uống mía ít đường",
      debt: 0,
    },
    {
      id: "cust_anh_b",
      name: "Anh B (Anh kế bên)",
      aliases: ["anh b", "anh kế bên", "anh ke ben", "anh sửa xe", "anh sua xe", "anh hùng", "anh hung"],
      defaultDrink: "Mía cam",
      defaultQty: 2,
      price: 30000,
      paymentMethod: "chuyen_khoan",
      note: "Thường lấy 2 ly mía cam",
      debt: 0,
    },
    {
      id: "cust_chi_lan",
      name: "Chị Lan (Tiệm nail)",
      aliases: ["chị lan", "chi lan", "chị tiệm tóc", "chi tiem toc", "chị tiệm nail", "chi tiem nail"],
      defaultDrink: "Trà tắc",
      defaultQty: 1,
      price: 10000,
      paymentMethod: "chuyen_khoan",
      note: "Uống trà tắc nhiều đá ít ngọt",
      debt: 0,
    },
  ],
  overheadConfig: {
    rentMonthly: 6000000,
    utilitiesMonthly: 1200000,
    laborMonthly: 0,
    depreciationMonthly: 300000,
    otherMonthly: 300000,
    expectedCupsPerDay: 80,
  },
  costFormulas: {
    nuoc_mia: {
      drinkId: "nuoc_mia",
      drinkName: "Nước mía thường",
      sellingPrice: 10000,
      ingredients: [
        { name: "Mía cây (1 bó 10kg = 90k ~ 20 ly)", unit: "ly (0.5kg)", batchCost: 90000, batchYield: 20, unitCost: 4500 },
        { name: "Đá viên (sạch)", unit: "phần", batchCost: 15000, batchYield: 30, unitCost: 500 },
        { name: "Ly nhựa + Nắp ép", unit: "bộ", batchCost: 35000, batchYield: 50, unitCost: 700 },
        { name: "Ống hút + Quai xách chữ T", unit: "bộ", batchCost: 25000, batchYield: 250, unitCost: 100 },
        { name: "Trái tắc / chanh", unit: "trái", batchCost: 20000, batchYield: 100, unitCost: 200 },
      ],
    },
    nuoc_mia_1l: {
      drinkId: "nuoc_mia_1l",
      drinkName: "Nước mía 1 lít",
      sellingPrice: 20000,
      ingredients: [
        { name: "Mía cây tươi (~1.3kg mía)", unit: "chai", batchCost: 90000, batchYield: 7.5, unitCost: 12000 },
        { name: "Chai nhựa 1L + Nắp", unit: "chai", batchCost: 75000, batchYield: 50, unitCost: 1500 },
        { name: "Túi đựng 1L + Ống hút dài", unit: "bộ", batchCost: 25000, batchYield: 100, unitCost: 250 },
        { name: "Trái tắc / chanh", unit: "trái", batchCost: 20000, batchYield: 40, unitCost: 500 },
      ],
    },
    tra_tac: {
      drinkId: "tra_tac",
      drinkName: "Trà tắc",
      sellingPrice: 15000,
      ingredients: [
        { name: "Cốt trà lài / trà đen", unit: "phần", batchCost: 50000, batchYield: 50, unitCost: 1000 },
        { name: "Tắc tươi (4 trái)", unit: "trái", batchCost: 20000, batchYield: 20, unitCost: 1000 },
        { name: "Nước đường cát", unit: "ml", batchCost: 22000, batchYield: 25, unitCost: 880 },
        { name: "Đá viên (sạch)", unit: "phần", batchCost: 15000, batchYield: 30, unitCost: 500 },
        { name: "Ly 700ml + Nắp + Ống", unit: "bộ", batchCost: 45000, batchYield: 50, unitCost: 900 },
      ],
    },
    nuoc_cam: {
      drinkId: "nuoc_cam",
      drinkName: "Nước cam",
      sellingPrice: 15000,
      ingredients: [
        { name: "Cam sành tươi (2 trái ~ 350g)", unit: "trái", batchCost: 25000, batchYield: 5, unitCost: 5000 },
        { name: "Đường cát / Nước đường", unit: "phần", batchCost: 22000, batchYield: 30, unitCost: 730 },
        { name: "Đá viên", unit: "phần", batchCost: 15000, batchYield: 30, unitCost: 500 },
        { name: "Ly + Nắp + Ống hút", unit: "bộ", batchCost: 40000, batchYield: 50, unitCost: 800 },
      ],
    },
    rau_ma_dau_xanh: {
      drinkId: "rau_ma_dau_xanh",
      drinkName: "Rau má đậu xanh",
      sellingPrice: 15000,
      ingredients: [
        { name: "Rau má tươi (xay)", unit: "gam", batchCost: 30000, batchYield: 15, unitCost: 2000 },
        { name: "Đậu xanh chín tán nhuyễn", unit: "phần", batchCost: 40000, batchYield: 20, unitCost: 2000 },
        { name: "Sữa đặc / Nước cốt dừa", unit: "ml", batchCost: 24000, batchYield: 20, unitCost: 1200 },
        { name: "Đá viên", unit: "phần", batchCost: 15000, batchYield: 30, unitCost: 500 },
        { name: "Ly + Nắp + Ống hút", unit: "bộ", batchCost: 40000, batchYield: 50, unitCost: 800 },
      ],
    },
  },
  knowledgeBase: {
    suppliers: [
      { name: "Anh Ba đá", category: "Mua đá", defaultPrice: 15000, unit: "bao", keywords: ["anh ba", "da anh ba"] },
      { name: "Vựa mía Năm", category: "Mua mía", defaultPrice: 180000, unit: "bó", keywords: ["vua nam", "vua mia nam", "chu nam"] },
    ],
    rules: [
      "Định mức Nước Mía Thực Tế: 1 bó mía = 10kg = 90.000đ ép được ước chừng ~20 ly (bình quân 4.500đ tiền mía/ly, 0.5kg mía/ly).",
      "Chi phí bao bì & phụ gia 1 ly nước mía: Đá viên (500đ) + Ly nắp ép (700đ) + Ống hút/túi chữ T (100đ) + Tắc (200đ) = 1.500đ.",
      "Tổng Vốn Nguyên Liệu 1 ly mía (COGS): 4.500đ + 1.500đ = 6.000đ/ly. Giá bán 10.000đ -> Lãi gộp nguyên liệu: 4.000đ/ly (40%).",
      "Tỷ lệ giá vốn COGS mục tiêu: 28% - 40% doanh thu",
      "Khách quen có thể dùng từ 'như cũ' để order món quen",
      "Tiền nợ không tính vào tiền mặt trong két cho tới khi khách trả nợ",
      "Điểm hòa vốn ước tính toàn hệ thống: 120 ly / ngày",
    ],
  },
  sync: {
    supabaseUrl: "https://rbvpsaotqmddtvcxkyxz.supabase.co",
    supabaseAnon:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJidnBzYW90cW1kZHR2Y3hreXh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxMTMyNTMsImV4cCI6MjA5OTY4OTI1M30.gTCFBYF1P7ZjwJ87oXoh79gpuKIXZwZtkB79WzO3UGY",
  },
};

function isNative() {
  return typeof window !== "undefined" && Boolean(window.Capacitor?.isNativePlatform?.());
}

function getPreferences() {
  return typeof window !== "undefined" ? window.Capacitor?.Plugins?.Preferences : null;
}

function randomInt(max) {
  const cryptoApi = (typeof window !== "undefined" ? window.crypto : null) || globalThis.crypto;
  if (cryptoApi?.getRandomValues) {
    const values = new Uint32Array(1);
    cryptoApi.getRandomValues(values);
    return values[0] % max;
  }
  return Math.floor(Math.random() * max);
}

function createDeviceId() {
  return `device_${Date.now().toString(36)}_${randomInt(1_000_000).toString(36)}`;
}

function ensureSyncIdentity(sync = {}) {
  return {
    ...sync,
    deviceId: sync.deviceId || createDeviceId(),
  };
}

function generateTransactionId(existingItems = []) {
  const existing = new Set(existingItems.map((item) => Number(item.id)));
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const id = Date.now() * 1000 + randomInt(1000);
    if (!existing.has(id)) return id;
  }
  return Date.now() * 1000 + randomInt(1000);
}

function cloneDefault() {
  return JSON.parse(JSON.stringify(DEFAULT_DATA));
}

function categoryKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[đĐ]/g, "d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const CANONICAL_CATEGORIES = new Map(
  [
    ...DEFAULT_DATA.danhMuc.thu,
    ...DEFAULT_DATA.danhMuc.chi,
    "Bán nước mía",
    "Mua mía",
    "Mua đá",
    "Ly/ống hút/túi",
  ].map((item) => [categoryKey(item), item]),
);

function canonicalCategory(value) {
  const key = categoryKey(value);
  if (key === "ban nuoc mia") return "Nước mía thường";
  if (key === "mua mia") return "Mía cây";
  if (key === "mua da") return "Tiền đá";
  if (key === "ly ong hut tui" || key === "ly/ong hut/tui") return "Ly/ống hút/bao bì";
  return CANONICAL_CATEGORIES.get(key) || String(value || "").trim();
}

function mergeList(baseList, customList) {
  const seen = new Set();
  const result = [];
  for (const rawItem of [...(baseList || []), ...(customList || [])]) {
    const item = canonicalCategory(rawItem);
    const key = categoryKey(item);
    if (!item || seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
}

export function mergeData(data) {
  const base = cloneDefault();
  const rawQuick = Array.isArray(data?.quickItems) ? data.quickItems : [];
  const legacyPrices = Array.isArray(data?.quickPrices) ? data.quickPrices : null;

  // Merge quick items
  const quickItemsMap = new Map();
  for (const item of base.quickItems) {
    quickItemsMap.set(item.id, { ...item });
  }
  for (const item of rawQuick) {
    if (item && item.id) {
      const existing = quickItemsMap.get(item.id) || {};
      quickItemsMap.set(item.id, {
        ...existing,
        ...item,
        price: Number(item.price) > 0 ? Number(item.price) : (existing.price || 10000),
        costPrice: Number(item.costPrice) >= 0 ? Number(item.costPrice) : (existing.costPrice || 3000),
      });
    }
  }
  const mergedQuickItems = [...quickItemsMap.values()];
  if (legacyPrices && !data?.quickItems) {
    legacyPrices.forEach((price, index) => {
      if (mergedQuickItems[index] && Number(price) > 0) {
        mergedQuickItems[index].price = Number(price);
      }
    });
  }

  // Merge branches
  const rawBranches = Array.isArray(data?.branches) && data.branches.length ? data.branches : base.branches;
  const currentBranch = data?.currentBranch || rawBranches[0]?.name || base.currentBranch;

  const costMap = new Map();
  mergedQuickItems.forEach((m) => {
    const cost = Number(m.costPrice) >= 0 ? Number(m.costPrice) : 0;
    if (m.name) costMap.set(m.name.toLowerCase().trim(), cost);
    if (m.shortName) costMap.set(m.shortName.toLowerCase().trim(), cost);
    if (m.category) costMap.set(m.category.toLowerCase().trim(), cost);
  });

  const normalizedTransactions = Array.isArray(data?.ds)
    ? data.ds.map((item) => {
        const qty = Number(item.soLuong) || 1;
        let costPerUnit = Number(item.giaCostDonVi) >= 0 ? Number(item.giaCostDonVi) : 0;

        if (item.loai === "thu") {
          const name = (item.tenMon || item.danhMuc || item.ghiChu || item.cauNoiGoc || "").toLowerCase().trim();
          for (const [key, costVal] of costMap.entries()) {
            if (key && (name === key || name.includes(key) || key.includes(name))) {
              costPerUnit = costVal;
              break;
            }
          }
        }

        const totalCost = Number(item.tongGiaCost) >= 0 && item.tongGiaCost > 0 && item.giaCostDonVi === costPerUnit
          ? Number(item.tongGiaCost)
          : qty * costPerUnit;

        return {
          ...item,
          danhMuc: canonicalCategory(item.danhMuc),
          chiNhanh: item.chiNhanh || currentBranch,
          soLuong: qty,
          donViTinh: String(item.donViTinh || (item.loai === "thu" ? "ly" : "kg")),
          phuongThuc: String(item.phuongThuc || "tien_mat"),
          giaCostDonVi: costPerUnit,
          tongGiaCost: totalCost,
        };
      })
    : [];

  return {
    ...base,
    ...data,
    currentBranch,
    branches: rawBranches,
    danhMuc: {
      thu: mergeList(base.danhMuc.thu, data?.danhMuc?.thu),
      chi: mergeList(base.danhMuc.chi, data?.danhMuc?.chi),
    },
    quickItems: mergedQuickItems,
    quickPrices: legacyPrices || mergedQuickItems.map((item) => item.price),
    sync: ensureSyncIdentity({
      ...base.sync,
      ...(data?.sync || {}),
      supabaseUrl: data?.sync?.supabaseUrl || base.sync.supabaseUrl,
      supabaseAnon: data?.sync?.supabaseAnon || base.sync.supabaseAnon,
    }),
    defaultOpeningCash: Number(data?.defaultOpeningCash) >= 0 ? Number(data.defaultOpeningCash) : (base.defaultOpeningCash || 500000),
    openingCashByDate: { ...(base.openingCashByDate || {}), ...(data?.openingCashByDate || {}) },
    ds: normalizedTransactions,
  };
}

async function readStorageValue(key) {
  const Preferences = getPreferences();
  if (isNative() && Preferences?.get) {
    return (await Preferences.get({ key })).value;
  }
  if (typeof localStorage !== "undefined") {
    return localStorage.getItem(key);
  }
  return null;
}

async function writeStorageValue(key, value) {
  const Preferences = getPreferences();
  if (isNative() && Preferences?.set) {
    await Preferences.set({ key, value });
    return;
  }
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(key, value);
  }
}

function parseStoredData(raw) {
  return mergeData(raw ? JSON.parse(raw) : null);
}

export async function docDuLieu() {
  try {
    return parseStoredData(await readStorageValue(STORAGE_KEY));
  } catch (error) {
    console.error("Không đọc được dữ liệu", error);
    try {
      const backup = parseStoredData(await readStorageValue(BACKUP_STORAGE_KEY));
      await writeStorageValue(STORAGE_KEY, JSON.stringify(backup));
      return backup;
    } catch (backupError) {
      console.error("Khong phuc hoi duoc du lieu du phong", backupError);
    }
    return cloneDefault();
  }
}

export async function luuDuLieu(data) {
  const merged = mergeData(data);
  const raw = JSON.stringify(merged);
  const previousRaw = await readStorageValue(STORAGE_KEY);
  if (previousRaw) {
    try {
      JSON.parse(previousRaw);
      await writeStorageValue(BACKUP_STORAGE_KEY, previousRaw);
    } catch {
      // Keep the previous valid backup when current value is invalid
    }
  }
  await writeStorageValue(STORAGE_KEY, raw);
  await writeStorageValue(BACKUP_STORAGE_KEY, raw);
  return merged;
}

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function taoGiaoDich(input, existingItems = [], currentBranch = "Quán Nhà (Chính)", quickItems = DEFAULT_DATA.quickItems) {
  const now = new Date();
  const qty = Number(input.soLuong) || 1;
  let unitCost = Number(input.giaCostDonVi);
  
  if (input.loai === "thu" && !Number.isFinite(unitCost)) {
    const matchedItem = (quickItems || []).find(
      (m) => m.category === input.danhMuc || m.name === input.danhMuc || m.id === input.productId,
    );
    unitCost = Number(matchedItem?.costPrice) || 0;
  }
  if (!Number.isFinite(unitCost) || unitCost < 0) unitCost = 0;

  const totalCost = Number(input.tongGiaCost) >= 0 ? Number(input.tongGiaCost) : qty * unitCost;

  let unit = input.donViTinh;
  if (!unit) {
    if (input.loai === "thu") {
      unit = input.danhMuc === "Nước mía 1 lít" ? "chai" : "ly";
    } else {
      if (input.danhMuc === "Mua mía" || input.danhMuc === "Mía cây") unit = "bó";
      else if (input.danhMuc === "Mua đá" || input.danhMuc === "Tiền đá") unit = "bao";
      else if (input.danhMuc === "Sữa đặc") unit = "lon";
      else if (input.danhMuc === "Ly/ống hút/túi" || input.danhMuc === "Ly/ống hút/bao bì") unit = "bọc";
      else if (input.danhMuc === "Điện nước" || input.danhMuc === "Xăng xe" || input.danhMuc === "Chi khác") unit = "lần";
      else unit = "kg";
    }
  }

  return {
    id: generateTransactionId(existingItems),
    ngay: input.ngay || localDateKey(now),
    gio: input.gio || now.toTimeString().slice(0, 5),
    loai: input.loai,
    soTien: Number(input.soTien) || 0,
    danhMuc: input.danhMuc,
    ghiChu: input.ghiChu || "",
    cauNoiGoc: input.cauNoiGoc || "",
    daSuaTay: Boolean(input.daSuaTay),
    chiNhanh: input.chiNhanh || currentBranch,
    soLuong: qty,
    donViTinh: unit,
    phuongThuc: input.phuongThuc === "chuyen_khoan" ? "chuyen_khoan" : "tien_mat",
    giaCostDonVi: unitCost,
    tongGiaCost: totalCost,
    daSync: false,
    deleted: false,
    updatedAt: now.toISOString(),
  };
}

export async function themGiaoDich(input) {
  const data = await docDuLieu();
  const branch = input.chiNhanh || data.currentBranch || "Quán Nhà (Chính)";
  const giaoDich = taoGiaoDich({ ...input, chiNhanh: branch }, data.ds, branch, data.quickItems);
  data.ds.unshift(giaoDich);
  await luuDuLieu(data);
  return giaoDich;
}

export async function xoaGiaoDich(id) {
  const data = await docDuLieu();
  data.ds = data.ds.map((item) =>
    item.id === id
      ? { ...item, deleted: true, daSync: false, updatedAt: new Date().toISOString() }
      : item,
  );
  await luuDuLieu(data);
}

export async function capNhatCauHinhSync(sync) {
  const data = await docDuLieu();
  data.sync = { ...data.sync, ...sync };
  await luuDuLieu(data);
  return data.sync;
}

export async function capNhatCurrentBranch(branchName) {
  const data = await docDuLieu();
  data.currentBranch = branchName;
  await luuDuLieu(data);
  return data.currentBranch;
}

export async function luuDanhSachChiNhanh(branches) {
  const data = await docDuLieu();
  data.branches = branches.filter((b) => b && b.name && b.name.trim());
  if (!data.branches.some((b) => b.name === data.currentBranch)) {
    data.currentBranch = data.branches[0]?.name || "Quán Nhà (Chính)";
  }
  await luuDuLieu(data);
  return data.branches;
}

export async function luuDanhSachMenu(menuItems) {
  const data = await docDuLieu();
  data.quickItems = menuItems;
  data.quickPrices = menuItems.map((item) => Number(item.price) || 0);
  const thuCats = menuItems.map((m) => m.category || m.name);
  data.danhMuc.thu = [...new Set([...thuCats, "Thu khác"])];

  const costMap = new Map();
  menuItems.forEach((m) => {
    const cost = Number(m.costPrice) >= 0 ? Number(m.costPrice) : 0;
    if (m.name) costMap.set(m.name.toLowerCase().trim(), cost);
    if (m.shortName) costMap.set(m.shortName.toLowerCase().trim(), cost);
    if (m.category) costMap.set(m.category.toLowerCase().trim(), cost);
  });

  const now = new Date().toISOString();
  data.ds = (data.ds || []).map((tx) => {
    if (tx.loai === "thu" && !tx.deleted) {
      const name = (tx.tenMon || tx.danhMuc || tx.ghiChu || tx.cauNoiGoc || "").toLowerCase().trim();
      let matchedCost = null;
      for (const [key, costVal] of costMap.entries()) {
        if (key && (name === key || name.includes(key) || key.includes(name))) {
          matchedCost = costVal;
          break;
        }
      }
      if (matchedCost !== null) {
        const qty = Number(tx.soLuong) || 1;
        return {
          ...tx,
          giaCostDonVi: matchedCost,
          tongGiaCost: matchedCost * qty,
          daSync: false,
          updatedAt: now,
        };
      }
    }
    return tx;
  });

  await luuDuLieu(data);
  return data.quickItems;
}

export async function capNhatGiaNhanh(prices) {
  const data = await docDuLieu();
  const nextPrices = prices.map((price) => Number(price) || 0);
  data.quickItems = data.quickItems.map((item, index) => ({
    ...item,
    price: nextPrices[index] > 0 ? nextPrices[index] : item.price,
  }));
  data.quickPrices = data.quickItems.map((item) => item.price);
  await luuDuLieu(data);
  return data.quickItems;
}

export async function xoaTatCaDuLieu() {
  const data = await docDuLieu();
  const now = new Date().toISOString();
  data.ds = (data.ds || []).map((item) => ({
    ...item,
    deleted: true,
    daSync: false,
    updatedAt: now,
  }));
  await luuDuLieu(data);
  if (typeof window !== "undefined") {
    window.dispatchEvent?.(new CustomEvent("nuocmia:data-cleared"));
  }
}

export async function nhapDuLieuTuJson(json) {
  const parsed = JSON.parse(json);
  if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.ds)) {
    throw new Error("File khong dung dinh dang du lieu cua app");
  }
  for (const item of parsed.ds) {
    if (!["thu", "chi"].includes(item.loai) || Number(item.soTien) <= 0 || !item.ngay) {
      throw new Error("File co giao dich khong hop le");
    }
  }
  await luuDuLieu(parsed);
}

export async function luuTienThoiDauNgay(ngay, soTien, branch = "Quán Nhà (Chính)") {
  const data = await docDuLieu();
  data.openingCashByDate = data.openingCashByDate || {};
  const key = `${ngay}_${branch}`;
  data.openingCashByDate[key] = Number(soTien) >= 0 ? Number(soTien) : 0;
  await luuDuLieu(data);
  return data.openingCashByDate[key];
}

export async function luuTienThoiMacDinh(soTien) {
  const data = await docDuLieu();
  data.defaultOpeningCash = Number(soTien) >= 0 ? Number(soTien) : 500000;
  await luuDuLieu(data);
  return data.defaultOpeningCash;
}

export async function xuatDuLieuJson() {
  return JSON.stringify(await docDuLieu(), null, 2);
}

export async function luuKhachQuen(customer) {
  const data = await docDuLieu();
  data.crmCustomers = data.crmCustomers || [];
  const idx = data.crmCustomers.findIndex((c) => c.id === customer.id || c.name.toLowerCase() === customer.name.toLowerCase());
  if (idx >= 0) {
    data.crmCustomers[idx] = { ...data.crmCustomers[idx], ...customer };
  } else {
    data.crmCustomers.push({
      id: customer.id || `cust_${Date.now()}`,
      ...customer,
    });
  }
  await luuDuLieu(data);
  return data.crmCustomers;
}

export async function xoaKhachQuen(customerId) {
  const data = await docDuLieu();
  data.crmCustomers = (data.crmCustomers || []).filter((c) => c.id !== customerId);
  await luuDuLieu(data);
  return data.crmCustomers;
}

export async function luuTriThucEV(key, value) {
  const data = await docDuLieu();
  data.knowledgeBase = data.knowledgeBase || {};
  data.knowledgeBase[key] = value;
  await luuDuLieu(data);
  return data.knowledgeBase;
}

export async function restartDuLieuHomNay({ dateKey = localDateKey(), branch = "all", note = "", resetOpeningCash = false } = {}) {
  const data = await docDuLieu();
  const now = new Date().toISOString();
  const isAll = !branch || branch === "all" || branch === "Tất cả điểm bán";

  let resetCount = 0;
  data.ds = (data.ds || []).map((item) => {
    if (!item.deleted && item.ngay === dateKey && (isAll || item.chiNhanh === branch)) {
      resetCount++;
      return {
        ...item,
        deleted: true,
        daSync: false,
        updatedAt: now,
        deletedReason: note ? `Restart ngày: ${note}` : "Restart ngày hôm nay",
      };
    }
    return item;
  });

  if (resetOpeningCash) {
    if (isAll) {
      const prefix = `${dateKey}_`;
      Object.keys(data.openingCashByDate || {}).forEach((k) => {
        if (k.startsWith(prefix)) {
          delete data.openingCashByDate[k];
        }
      });
    } else {
      const key = `${dateKey}_${branch}`;
      if (data.openingCashByDate) {
        delete data.openingCashByDate[key];
      }
    }
  }

  data.restartLogs = data.restartLogs || [];
  data.restartLogs.unshift({
    id: `restart_${Date.now()}`,
    date: dateKey,
    time: new Date().toTimeString().slice(0, 5),
    branch: isAll ? "Tất cả điểm bán" : branch,
    resetCount,
    note: note || "Khởi động lại dữ liệu trong ngày",
    resetOpeningCash,
    timestamp: now,
  });

  await luuDuLieu(data);
  return { resetCount, branch: isAll ? "Tất cả điểm bán" : branch, note };
}

export async function luuOverheadConfig(overhead) {
  const data = await docDuLieu();
  data.overheadConfig = {
    ...(data.overheadConfig || DEFAULT_DATA.overheadConfig),
    ...overhead,
  };
  await luuDuLieu(data);
  return data.overheadConfig;
}

export async function luuCostFormula(drinkId, formula) {
  const data = await docDuLieu();
  data.costFormulas = data.costFormulas || {};
  data.costFormulas[drinkId] = formula;
  await luuDuLieu(data);
  return data.costFormulas[drinkId];
}

export async function capNhatCostChoMon(drinkIdOrName, newCostPrice) {
  const data = await docDuLieu();
  const cost = Number(newCostPrice) >= 0 ? Number(newCostPrice) : 0;
  
  data.quickItems = (data.quickItems || []).map((item) => {
    if (item.id === drinkIdOrName || item.name.toLowerCase() === String(drinkIdOrName).toLowerCase()) {
      return { ...item, costPrice: cost };
    }
    return item;
  });

  await luuDuLieu(data);
  return data.quickItems;
}

