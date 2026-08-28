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
      "Mía tắc",
      "Mía thơm",
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
      costPrice: 4000,
      category: "Nước mía thường",
      note: "Bán nước mía thường",
      icon: "cane",
      image: "./assets/menu/nuoc_mia.jpg",
      voiceUnit: "ly",
    },
    {
      id: "nuoc_mia_1l",
      name: "Nước mía 1 lít",
      shortName: "Mía 1 lít",
      price: 15000,
      costPrice: 10000,
      category: "Nước mía 1 lít",
      note: "Bán nước mía 1 lít",
      icon: "cup_1l",
      image: "./assets/menu/nuoc_mia_1l.jpg",
      voiceUnit: "ly",
    },
    {
      id: "mia_tac",
      name: "Mía tắc",
      shortName: "Mía tắc",
      price: 10000,
      costPrice: 5000,
      category: "Mía tắc",
      note: "Bán mía tắc",
      icon: "citrus",
      image: "./assets/menu/mia_tac.jpg",
      voiceUnit: "ly",
    },
    {
      id: "mia_thom",
      name: "Mía thơm",
      shortName: "Mía thơm",
      price: 10000,
      costPrice: 5000,
      category: "Mía thơm",
      note: "Bán mía thơm",
      icon: "cane",
      image: "./assets/menu/mia_thom.jpg",
      voiceUnit: "ly",
    },
    {
      id: "mia_cam",
      name: "Mía cam",
      shortName: "Mía cam",
      price: 17000,
      costPrice: 10000,
      category: "Mía cam",
      note: "Bán mía cam",
      icon: "citrus",
      image: "./assets/menu/mia_cam.jpg",
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
      image: "./assets/menu/rau_ma.jpg",
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
      image: "./assets/menu/rau_ma_sua.jpg",
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
      image: "./assets/menu/rau_ma_dau_xanh.jpg",
      voiceUnit: "ly",
    },
    {
      id: "tra_tac",
      name: "Trà tắc",
      shortName: "Trà tắc",
      price: 12000,
      costPrice: 7000,
      category: "Trà tắc",
      note: "Bán trà tắc",
      icon: "tea",
      image: "./assets/menu/tra_tac.jpg",
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
      image: "./assets/menu/nuoc_cam.jpg",
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
      price: 34000,
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
      price: 12000,
      paymentMethod: "chuyen_khoan",
      note: "Uống trà tắc nhiều đá ít ngọt",
      debt: 0,
    },
  ],
  overheadConfig: {
    rentMonthly: 6000000,          // Tiền thuê mặt bằng (200.000 đ/ngày = 6.000.000 đ/tháng)
    electricityMonthly: 2400000,   // Tiền điện (25-30 ký/ngày chạy 8h-22h = ~2.400.000 đ/tháng)
    waterMonthly: 150000,          // Tiền nước (dùng ít, chủ yếu rửa máy dọn dẹp = ~150.000 đ/tháng)
    trashMonthly: 50000,           // Tiền rác & vệ sinh môi trường (đ/tháng)
    depreciationMonthly: 300000,   // Khấu hao máy ép mía & bảo trì (đ/tháng)
    otherMonthly: 500000,          // Chi phí phát sinh khác (~500.000 đ/tháng)
    expectedCupsPerDay: 80,        // Sản lượng bán dự kiến (ly/ngày)
  },
  overheadByBranch: {
    "Quán Nhà (Chính)": {
      rentMonthly: 6000000,          // Mặt bằng 200k/ngày
      electricityMonthly: 2400000,   // Điện 80k/ngày (30 ký)
      waterMonthly: 150000,          // Nước 5k/ngày
      trashMonthly: 50000,
      depreciationMonthly: 300000,
      otherMonthly: 500000,
      expectedCupsPerDay: 80,
    },
    "Chi nhánh 2": {
      rentMonthly: 6000000,          // Mặt bằng 200k/ngày (6.000.000 đ/tháng)
      electricityMonthly: 1200000,   // Điện 40k/ngày
      waterMonthly: 100000,
      trashMonthly: 50000,
      depreciationMonthly: 200000,
      otherMonthly: 300000,
      expectedCupsPerDay: 50,
    },
  },
  packagingConfig: {
    cups: { name: "Ly nhựa", unit: "thùng (2.000 cái)", batchCost: 1000000, batchYield: 2000, unitCost: 500 },
    straws: { name: "Ống hút", unit: "bao (10 bịch)", batchCost: 270000, batchYield: 2000, unitCost: 135 },
    filmRoll: { name: "Màng ép ly", unit: "cuộn (2.000 ly)", batchCost: 45000, batchYield: 2000, unitCost: 23 },
    bags: { name: "Bọc / Túi chữ T", unit: "bọc", batchCost: 25000, batchYield: 250, unitCost: 100 },
    ice: { name: "Đá viên sạch", unit: "bao", batchCost: 15000, batchYield: 30, unitCost: 500 },
    comboPackaging: { name: "Bao bì + Màng ép + Ống hút + Đá (1L ko đá)", unit: "phần", batchCost: 1000, batchYield: 1, unitCost: 1000 },
  },
  costFormulas: {
    nuoc_mia: {
      drinkId: "nuoc_mia",
      drinkName: "Nước mía thường",
      sellingPrice: 8000,
      ingredients: [
        { name: "Mía cây (1 bó 12 cây 90k = 15kg ~ 45 ly)", unit: "ly (0.33kg)", batchCost: 90000, batchYield: 45, unitCost: 2000 },
        { name: "Trái tắc thơm kèm", unit: "trái", batchCost: 20000, batchYield: 20, unitCost: 1000 },
        { name: "Bao bì, màng ép miệng ly, ống hút & đá viên (tính chung)", unit: "phần", batchCost: 1000, batchYield: 1, unitCost: 1000 },
      ],
    },
    nuoc_mia_1l: {
      drinkId: "nuoc_mia_1l",
      drinkName: "Nước mía 1 lít",
      sellingPrice: 16000,
      ingredients: [
        { name: "Mía cây tươi nguyên chất (~1.3kg mía không đá)", unit: "chai", batchCost: 90000, batchYield: 10, unitCost: 9000 },
        { name: "Bao bì, màng ép miệng ly & ống hút (không đá tính chung)", unit: "phần", batchCost: 1000, batchYield: 1, unitCost: 1000 },
      ],
    },
    mia_tac: {
      drinkId: "mia_tac",
      drinkName: "Mía tắc",
      sellingPrice: 10000,
      ingredients: [
        { name: "Mía cây tươi (1 bó 90k)", unit: "ly", batchCost: 90000, batchYield: 45, unitCost: 2000 },
        { name: "Tắc tươi thêm & đường", unit: "phần", batchCost: 40000, batchYield: 20, unitCost: 2000 },
        { name: "Bao bì, màng ép miệng ly, ống hút & đá viên (tính chung)", unit: "phần", batchCost: 1000, batchYield: 1, unitCost: 1000 },
      ],
    },
    mia_thom: {
      drinkId: "mia_thom",
      drinkName: "Mía thơm",
      sellingPrice: 12000,
      ingredients: [
        { name: "Mía cây tươi (1 bó 90k)", unit: "ly", batchCost: 90000, batchYield: 45, unitCost: 2000 },
        { name: "Thơm (Dứa) tươi ép kèm", unit: "phần", batchCost: 40000, batchYield: 10, unitCost: 4000 },
        { name: "Bao bì, màng ép miệng ly, ống hút & đá viên (tính chung)", unit: "phần", batchCost: 1000, batchYield: 1, unitCost: 1000 },
      ],
    },
    mia_cam: {
      drinkId: "mia_cam",
      drinkName: "Mía cam",
      sellingPrice: 17000,
      ingredients: [
        { name: "Mía cây tươi (1 bó 90k)", unit: "ly", batchCost: 90000, batchYield: 45, unitCost: 2000 },
        { name: "Cam sành tươi vắt (2 trái)", unit: "trái", batchCost: 35000, batchYield: 5, unitCost: 7000 },
        { name: "Bao bì, màng ép miệng ly, ống hút & đá viên (tính chung)", unit: "phần", batchCost: 1000, batchYield: 1, unitCost: 1000 },
      ],
    },
    tra_tac: {
      drinkId: "tra_tac",
      drinkName: "Trà tắc",
      sellingPrice: 12000,
      ingredients: [
        { name: "Cốt trà túi lọc (Hộp 80k) + Sốt tắc + Đường", unit: "ly", batchCost: 180000, batchYield: 30, unitCost: 6000 },
        { name: "Bao bì, màng ép miệng ly, ống hút & đá viên (tính chung)", unit: "phần", batchCost: 1000, batchYield: 1, unitCost: 1000 },
      ],
    },
    nuoc_cam: {
      drinkId: "nuoc_cam",
      drinkName: "Nước cam",
      sellingPrice: 15000,
      ingredients: [
        { name: "Cam sành tươi (theo thị trường) + Đường", unit: "phần", batchCost: 30000, batchYield: 5, unitCost: 6000 },
        { name: "Bao bì, màng ép miệng ly, ống hút & đá viên (tính chung)", unit: "phần", batchCost: 1000, batchYield: 1, unitCost: 1000 },
      ],
    },
    rau_ma_dau_xanh: {
      drinkId: "rau_ma_dau_xanh",
      drinkName: "Rau má đậu xanh",
      sellingPrice: 15000,
      ingredients: [
        { name: "Rau má tươi xay + Đậu xanh chín + Đường", unit: "ly", batchCost: 100000, batchYield: 20, unitCost: 5000 },
        { name: "Bao bì, màng ép miệng ly, ống hút & đá viên (tính chung)", unit: "phần", batchCost: 1000, batchYield: 1, unitCost: 1000 },
      ],
    },
  },
  knowledgeBase: {
    suppliers: [
      { name: "Anh Ba đá", category: "Mua đá", defaultPrice: 15000, unit: "bao", keywords: ["anh ba", "da anh ba"] },
      { name: "Vựa mía Năm", category: "Mua mía", defaultPrice: 90000, unit: "bó", keywords: ["vua nam", "vua mia nam", "chu nam"] },
    ],
    rules: [
      "Định mức Mía: 1 bó mía 12 cây dài chưa bào (90.000đ) bào ra được 15kg mía cây (~6.000đ - 7.000đ/kg). 1kg mía ép được 3 ly mía thường.",
      "Giá bán & Giá cost Nước mía thường: Giá bán chuẩn 8.000đ/ly (lãi gộp 4.000đ/ly, chỉ khi khách yêu cầu ly lớn mới bán 10.000đ). Giá cost: 4.000đ (tiền mía ~2.000đ + tắc 1.000đ + bao bì/màng ép/ống hút/đá 1.000đ).",
      "Giá cost 1 lít nước mía: 10.000đ (tiền mía ~9.000đ + bao bì/màng ép/ống hút không đá 1.000đ).",
      "Giá cost Mía tắc: 5.000đ | Mía thơm: 7.000đ | Mía cam: 10.000đ (cam tự hiệu chỉnh theo giá thị trường).",
      "Định mức Bao bì & Đá viên: Tiền bao bì, màng ép miệng ly, ống hút và đá viên được tính gộp chung cố định 1.000đ/phần (riêng mía 1 lít không dùng đá nhưng có bao bì/màng ép/ống hút nên vẫn tính chung 1.000đ).",
      "Định mức Rau má: 1kg rau má tươi (30.000đ) xay được 12.5 ly rau má, đường 20k/kg.",
      "Định mức Trà tắc: Hộp trà túi lọc 80.000đ nấu được 9 lít trà (45 ly). Sốt tắc: 1kg đường (33k) + 1.5kg tắc (45k) = 1.8L sốt tắc pha được 6 lít trà. Giá cost 1 ly trà tắc: 7.000đ.",
      "Tỷ lệ giá vốn COGS mục tiêu: 28% - 40% doanh thu",
      "Định phí vận hành thực tế: Mặt bằng 200k/ngày (6.000.000đ/tháng), Điện 25-30 ký/ngày chạy 8h-22h (~2.400.000đ/tháng), Nước rửa máy (~150.000đ/tháng), Phát sinh (~500.000đ/tháng).",
      "Doanh thu hòa vốn toàn quán theo số tiền: Cần đạt tối thiểu ~630.000đ doanh thu tổng/ngày (~18.800.000đ/tháng) với biên lãi gộp bình quân ~50% của các món trong menu để trang trải 100% tiền mặt bằng (200k/ngày), điện 30 ký, nước và phát sinh.",
      "Khách quen có thể dùng từ 'như cũ' để order món quen",
      "Tiền nợ không tính vào tiền mặt trong két cho tới khi khách trả nợ",
    ],
  },
  sync: {
    supabaseUrl: "https://rbvpsaotqmddtvcxkyxz.supabase.co",
    supabaseAnon:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJidnBzYW90cW1kZHR2Y3hreXh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxMTMyNTMsImV4cCI6MjA5OTY4OTI1M30.gTCFBYF1P7ZjwJ87oXoh79gpuKIXZwZtkB79WzO3UGY",
  },
  aiChatHistory: [],
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

export function getValidMenuImage(item) {
  if (!item) return "";
  const VALID_IMAGES = new Set([
    "./assets/menu/nuoc_mia.jpg",
    "./assets/menu/nuoc_mia_1l.jpg",
    "./assets/menu/mia_tac.jpg",
    "./assets/menu/mia_thom.jpg",
    "./assets/menu/mia_cam.jpg",
    "./assets/menu/nuoc_cam.jpg",
    "./assets/menu/tra_tac.jpg",
    "./assets/menu/rau_ma.jpg",
    "./assets/menu/rau_ma_dau_xanh.jpg",
    "./assets/menu/rau_ma_sua.jpg",
  ]);

  if (item.image && VALID_IMAGES.has(item.image)) {
    return item.image;
  }

  const str = `${item.id || ""} ${item.name || ""} ${item.shortName || ""} ${item.category || ""}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (str.includes("thom") || str.includes("dua") || str.includes("khom") || (item.id && item.id.includes("thom"))) {
    return "./assets/menu/mia_thom.jpg";
  }
  if (str.includes("tac") && (str.includes("mia") || str.includes("nuoc mia"))) {
    return "./assets/menu/mia_tac.jpg";
  }
  if (str.includes("tra tac") || (str.includes("tac") && !str.includes("mia"))) {
    return "./assets/menu/tra_tac.jpg";
  }
  if (str.includes("1 lit") || str.includes("1l") || str.includes("mot lit") || str.includes("nuoc_mia_1l")) {
    return "./assets/menu/nuoc_mia_1l.jpg";
  }
  if (str.includes("mia cam")) {
    return "./assets/menu/mia_cam.jpg";
  }
  if (str.includes("nuoc cam") || str.includes("cam tuoi") || (str.includes("cam") && !str.includes("mia"))) {
    return "./assets/menu/nuoc_cam.jpg";
  }
  if (str.includes("dau xanh") || str.includes("ma dau")) {
    return "./assets/menu/rau_ma_dau_xanh.jpg";
  }
  if (str.includes("sua") || str.includes("ma sua")) {
    return "./assets/menu/rau_ma_sua.jpg";
  }
  if (str.includes("rau ma")) {
    return "./assets/menu/rau_ma.jpg";
  }
  if (str.includes("mia")) {
    return "./assets/menu/nuoc_mia.jpg";
  }

  return item.image || "";
}

export function mergeData(data) {
  const base = cloneDefault();
  const legacyPrices = Array.isArray(data?.quickPrices) ? data.quickPrices : null;

  const NOTEBOOK_VERSION = "20260827_pricing_v3";
  const needsNotebookUpgrade = data?.costDataVersion !== NOTEBOOK_VERSION;

  // Quick items: use custom list if provided; otherwise fallback to default base list
  let mergedQuickItems;
  if (Array.isArray(data?.quickItems) && data.quickItems.length > 0) {
    mergedQuickItems = data.quickItems.map((item, idx) => {
      let costPrice = Number(item.costPrice) >= 0 ? Number(item.costPrice) : 0;
      let price = Number(item.price) > 0 ? Number(item.price) : 10000;
      const key = `${item.id || ""} ${item.name || ""} ${item.shortName || ""}`.toLowerCase();

      // Seamlessly upgrade old default cost prices and selling prices to notebook standards
      if (needsNotebookUpgrade) {
        if (key.includes("nuoc_mia_1l") || key.includes("1 lít") || key.includes("1l") || key.includes("1 lit")) {
          costPrice = 10000;
          price = 15000;
        } else if (key.includes("mia_cam") || key.includes("mía cam")) {
          costPrice = 10000;
          price = 17000;
        } else if (key.includes("tra_tac") || key.includes("trà tắc")) {
          costPrice = 7000;
          price = 12000;
        } else if (key.includes("mia_thom") || key.includes("mía thơm") || key.includes("dứa")) {
          costPrice = 5000;
          price = 10000;
        } else if (key.includes("mia_tac") || key.includes("mía tắc")) {
          costPrice = 5000;
          price = 10000;
        } else if (key.includes("nuoc_mia") || key.includes("mía thường") || key.includes("mía ly")) {
          costPrice = 4000;
          price = 8000;
        }
      }

      return {
        ...item,
        id: item.id || `item_${idx}_${Date.now()}`,
        name: item.name || "Món nước",
        shortName: item.shortName || item.name || "Món nước",
        category: item.category || item.name || "Món nước",
        price,
        costPrice,
        icon: item.icon || "cane",
        image: getValidMenuImage(item),
      };
    });

    if (needsNotebookUpgrade) {
      const hasMiaTac = mergedQuickItems.some((i) => i.id === "mia_tac" || i.name?.toLowerCase().includes("mía tắc"));
      if (!hasMiaTac) {
        mergedQuickItems.splice(2, 0, {
          id: "mia_tac",
          name: "Mía tắc",
          shortName: "Mía tắc",
          price: 10000,
          costPrice: 5000,
          category: "Mía tắc",
          note: "Bán mía tắc",
          icon: "citrus",
          image: "./assets/menu/mia_tac.jpg",
          voiceUnit: "ly",
        });
      }

      const hasMiaThom = mergedQuickItems.some((i) => i.id === "mia_thom" || i.name?.toLowerCase().includes("mía thơm") || i.name?.toLowerCase().includes("mía dứa"));
      if (!hasMiaThom) {
        const tacIdx = mergedQuickItems.findIndex((i) => i.id === "mia_tac" || i.name?.toLowerCase().includes("mía tắc"));
        const insertIdx = tacIdx >= 0 ? tacIdx + 1 : 3;
        mergedQuickItems.splice(insertIdx, 0, {
          id: "mia_thom",
          name: "Mía thơm",
          shortName: "Mía thơm",
          price: 10000,
          costPrice: 5000,
          category: "Mía thơm",
          note: "Bán mía thơm",
          icon: "cane",
          image: "./assets/menu/mia_thom.jpg",
          voiceUnit: "ly",
        });
      }
    }
  } else {
    mergedQuickItems = base.quickItems;
  }

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

        if (costPerUnit <= 0 && item.loai === "thu") {
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
      thu: (Array.isArray(data?.danhMuc?.thu) && data.danhMuc.thu.length > 0) ? data.danhMuc.thu : base.danhMuc.thu,
      chi: (Array.isArray(data?.danhMuc?.chi) && data.danhMuc.chi.length > 0) ? data.danhMuc.chi : base.danhMuc.chi,
    },
    quickItems: mergedQuickItems,
    quickPrices: legacyPrices || mergedQuickItems.map((item) => item.price),
    overheadConfig: { ...(base.overheadConfig || {}), ...(data?.overheadConfig || {}) },
    overheadByBranch: { ...(base.overheadByBranch || {}), ...(data?.overheadByBranch || {}) },
    packagingConfig: { ...(base.packagingConfig || {}), ...(data?.packagingConfig || {}) },
    costFormulas: { ...(base.costFormulas || {}), ...(data?.costFormulas || {}) },
    crmCustomers: Array.isArray(data?.crmCustomers) ? data.crmCustomers : (base.crmCustomers || []),
    aiChatHistory: Array.isArray(data?.aiChatHistory) ? data.aiChatHistory : (base.aiChatHistory || []),
    restartLogs: Array.isArray(data?.restartLogs) ? data.restartLogs : (base.restartLogs || []),
    dailyClosings: Array.isArray(data?.dailyClosings) ? data.dailyClosings : (base.dailyClosings || []),
    knowledgeBase: { ...(base.knowledgeBase || {}), ...(data?.knowledgeBase || {}) },
    costDataVersion: NOTEBOOK_VERSION,
    settingsVersion: Number(data?.settingsVersion) || 0,
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
  data.settingsVersion = Date.now();
  await luuDuLieu(data);
  return data.currentBranch;
}

export async function luuDanhSachChiNhanh(branches) {
  const data = await docDuLieu();
  data.branches = branches.filter((b) => b && b.name && b.name.trim());
  if (!data.branches.some((b) => b.name === data.currentBranch)) {
    data.currentBranch = data.branches[0]?.name || "Quán Nhà (Chính)";
  }
  data.settingsVersion = Date.now();
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

  data.settingsVersion = Date.now();
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
  data.settingsVersion = Date.now();
  await luuDuLieu(data);
  return data.quickItems;
}

export async function capNhatLaiGiaCostToanBoGiaoDich(targetDate = null) {
  const data = await docDuLieu();
  const costMap = new Map();
  (data.quickItems || []).forEach((m) => {
    const cost = Number(m.costPrice) >= 0 ? Number(m.costPrice) : 0;
    if (m.name) costMap.set(m.name.toLowerCase().trim(), cost);
    if (m.shortName) costMap.set(m.shortName.toLowerCase().trim(), cost);
    if (m.category) costMap.set(m.category.toLowerCase().trim(), cost);
  });

  const now = new Date().toISOString();
  let updatedCount = 0;
  data.ds = (data.ds || []).map((tx) => {
    if (tx.loai === "thu" && !tx.deleted && (!targetDate || tx.ngay === targetDate)) {
      const name = (tx.tenMon || tx.danhMuc || tx.ghiChu || tx.cauNoiGoc || "").toLowerCase().trim();
      let matchedCost = null;
      for (const [key, costVal] of costMap.entries()) {
        if (key && (name === key || name.includes(key) || key.includes(name))) {
          matchedCost = costVal;
          break;
        }
      }
      if (matchedCost !== null && matchedCost >= 0) {
        const qty = Number(tx.soLuong) || 1;
        if (tx.giaCostDonVi !== matchedCost || tx.tongGiaCost !== matchedCost * qty) {
          updatedCount++;
          return {
            ...tx,
            giaCostDonVi: matchedCost,
            tongGiaCost: matchedCost * qty,
            daSync: false,
            updatedAt: now,
          };
        }
      }
    }
    return tx;
  });

  if (updatedCount > 0) {
    data.settingsVersion = Date.now();
    await luuDuLieu(data);
  }
  return { updatedCount };
}

export async function datLaiGiaCostChuanSoTay() {
  const data = await docDuLieu();
  const base = cloneDefault();
  data.quickItems = base.quickItems;
  data.packagingConfig = base.packagingConfig;
  data.costFormulas = base.costFormulas;
  data.costDataVersion = "20260825_notebook_v2";
  data.settingsVersion = Date.now();
  await luuDuLieu(data);
  await capNhatLaiGiaCostToanBoGiaoDich();
  return data;
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
  data.settingsVersion = Date.now();
  await luuDuLieu(data);
  return data.openingCashByDate[key];
}

export async function luuTienThoiMacDinh(soTien) {
  const data = await docDuLieu();
  data.defaultOpeningCash = Number(soTien) >= 0 ? Number(soTien) : 500000;
  data.settingsVersion = Date.now();
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
  data.settingsVersion = Date.now();
  await luuDuLieu(data);
  return data.crmCustomers;
}

export async function xoaKhachQuen(customerId) {
  const data = await docDuLieu();
  data.crmCustomers = (data.crmCustomers || []).filter((c) => c.id !== customerId);
  data.settingsVersion = Date.now();
  await luuDuLieu(data);
  return data.crmCustomers;
}

export async function luuTriThucEV(key, value) {
  const data = await docDuLieu();
  data.knowledgeBase = data.knowledgeBase || {};
  data.knowledgeBase[key] = value;
  data.settingsVersion = Date.now();
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

  data.settingsVersion = Date.now();
  await luuDuLieu(data);
  return { resetCount, branch: isAll ? "Tất cả điểm bán" : branch, note };
}

export function layOverheadChoChiNhanh(data = {}, branchName = null) {
  const isAll = !branchName || branchName === "all" || branchName === "Tất cả điểm bán" || branchName === "Toàn quán" || branchName === "Toàn bộ chi nhánh";
  const branchMap = data.overheadByBranch || DEFAULT_DATA.overheadByBranch;

  if (isAll) {
    const branches = data.branches || DEFAULT_DATA.branches;
    let sumRent = 0;
    let sumElec = 0;
    let sumWater = 0;
    let sumTrash = 0;
    let sumDepr = 0;
    let sumOther = 0;
    let sumCups = 0;

    for (const b of branches) {
      const bName = typeof b === "string" ? b : b.name;
      const ov = branchMap[bName] || data.overheadConfig || DEFAULT_DATA.overheadConfig;
      sumRent += Number(ov.rentMonthly) || 0;
      sumElec += Number(ov.electricityMonthly) || 0;
      sumWater += Number(ov.waterMonthly) || 0;
      sumTrash += Number(ov.trashMonthly) || 0;
      sumDepr += Number(ov.depreciationMonthly) || 0;
      sumOther += Number(ov.otherMonthly) || 0;
      sumCups += Number(ov.expectedCupsPerDay) || 0;
    }

    return {
      rentMonthly: sumRent,
      electricityMonthly: sumElec,
      waterMonthly: sumWater,
      trashMonthly: sumTrash,
      depreciationMonthly: sumDepr,
      otherMonthly: sumOther,
      expectedCupsPerDay: sumCups,
      isAllBranches: true,
      branchName: "Toàn bộ chi nhánh",
    };
  }

  if (branchMap && branchMap[branchName]) {
    return {
      ...branchMap[branchName],
      branchName,
    };
  }

  return {
    ...(data.overheadConfig || DEFAULT_DATA.overheadConfig),
    branchName: branchName || data.currentBranch || "Quán Nhà (Chính)",
  };
}

export function tinhDiemHoaVonChiNhanh(overhead = {}, grossMargin = 0.5) {
  const rent = Number(overhead.rentMonthly) || 0;
  const elec = Number(overhead.electricityMonthly) || 0;
  const water = Number(overhead.waterMonthly) || 0;
  const trash = Number(overhead.trashMonthly) || 0;
  const depr = Number(overhead.depreciationMonthly) || 0;
  const other = Number(overhead.otherMonthly) || 0;

  const totalMonthlyOverhead = rent + elec + water + trash + depr + other;
  const dailyFixedCost = Math.round(totalMonthlyOverhead / 30);
  const rentDaily = Math.round(rent / 30);
  const elecDaily = Math.round(elec / 30);

  const margin = grossMargin > 0 ? grossMargin : 0.5;
  const targetRevenue = Math.round(dailyFixedCost / margin);
  const expectedCups = Number(overhead.expectedCupsPerDay) || 80;

  return {
    totalMonthlyOverhead,
    dailyFixedCost,
    rentDaily,
    elecDaily,
    targetRevenue,
    expectedCups,
    grossMargin: margin,
  };
}

export async function luuOverheadChoChiNhanh(branchName, overhead) {
  const data = await docDuLieu();
  data.overheadByBranch = data.overheadByBranch || { ...DEFAULT_DATA.overheadByBranch };
  const targetBranch = branchName || data.currentBranch || "Quán Nhà (Chính)";
  data.overheadByBranch[targetBranch] = {
    ...(data.overheadByBranch[targetBranch] || DEFAULT_DATA.overheadConfig),
    ...overhead,
  };
  if (targetBranch === data.currentBranch || targetBranch === "Quán Nhà (Chính)") {
    data.overheadConfig = {
      ...(data.overheadConfig || DEFAULT_DATA.overheadConfig),
      ...overhead,
    };
  }
  data.settingsVersion = Date.now();
  await luuDuLieu(data);
  return data.overheadByBranch[targetBranch];
}

export async function luuOverheadConfig(overhead, branchName = null) {
  const data = await docDuLieu();
  const targetBranch = branchName || data.currentBranch || "Quán Nhà (Chính)";
  return await luuOverheadChoChiNhanh(targetBranch, overhead);
}

export async function luuPackagingConfig(packaging) {
  const data = await docDuLieu();
  data.packagingConfig = {
    ...(data.packagingConfig || DEFAULT_DATA.packagingConfig),
    ...packaging,
  };
  data.settingsVersion = Date.now();
  await luuDuLieu(data);
  return data.packagingConfig;
}

export async function luuOverheadVaPackagingConfig(overhead, packaging) {
  const data = await docDuLieu();
  if (overhead) {
    data.overheadConfig = {
      ...(data.overheadConfig || DEFAULT_DATA.overheadConfig),
      ...overhead,
    };
  }
  if (packaging) {
    data.packagingConfig = {
      ...(data.packagingConfig || DEFAULT_DATA.packagingConfig),
      ...packaging,
    };
  }
  data.settingsVersion = Date.now();
  await luuDuLieu(data);
  return { overheadConfig: data.overheadConfig, packagingConfig: data.packagingConfig };
}

export async function luuCostFormula(drinkId, formula) {
  const data = await docDuLieu();
  data.costFormulas = data.costFormulas || {};
  data.costFormulas[drinkId] = formula;
  data.settingsVersion = Date.now();
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

  data.settingsVersion = Date.now();
  await luuDuLieu(data);
  return data.quickItems;
}

export async function luuTinNhanAIChat({ sender = "user", text = "", action = null, id = null, meta = null } = {}) {
  const data = await docDuLieu();
  data.aiChatHistory = Array.isArray(data.aiChatHistory) ? data.aiChatHistory : [];

  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const newMsg = {
    id: id || `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    sender: sender === "user" ? "user" : "bot",
    text: String(text || ""),
    action: action || null,
    meta: meta || null,
    timestamp: now.toISOString(),
    time: timeStr,
  };

  data.aiChatHistory.push(newMsg);
  // Keep up to last 150 messages for optimal sync
  if (data.aiChatHistory.length > 150) {
    data.aiChatHistory = data.aiChatHistory.slice(-150);
  }

  data.settingsVersion = Date.now();
  await luuDuLieu(data);
  return data.aiChatHistory;
}

export async function xoaLichSuAIChat() {
  const data = await docDuLieu();
  data.aiChatHistory = [];
  data.settingsVersion = Date.now();
  await luuDuLieu(data);
  return data.aiChatHistory;
}

