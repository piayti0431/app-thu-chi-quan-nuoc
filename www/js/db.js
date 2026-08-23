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
  quickPrices: [8000, 15000, 15000, 10000, 15000, 15000, 15000, 15000],
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

  const normalizedTransactions = Array.isArray(data?.ds)
    ? data.ds.map((item) => {
        const qty = Number(item.soLuong) || 1;
        const costPerUnit = Number(item.giaCostDonVi) >= 0 ? Number(item.giaCostDonVi) : 0;
        const totalCost = Number(item.tongGiaCost) >= 0 ? Number(item.tongGiaCost) : qty * costPerUnit;
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
