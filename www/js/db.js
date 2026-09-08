const STORAGE_KEY = "nuocmia_v1";
const BACKUP_STORAGE_KEY = `${STORAGE_KEY}_backup`;
export const NOTEBOOK_VERSION = "20260831_exact_pricing_v8";

export const DEFAULT_DATA = {
  ds: [
    {
      id: 1788860001000,
      ngay: "2026-09-08",
      thoiGian: "07:30",
      gio: "07:30",
      loai: "chi",
      danhMuc: "Mua mía cây",
      tenMon: "Mía cây thô (12 cây dài)",
      soLuong: 50,
      donViTinh: "bó",
      donGia: 80000,
      soTien: 4000000,
      phuongThuc: "tien_mat",
      nguonTienChi: "tien_von",
      chiNhanh: "Kho Tổng",
      ingredientId: "mia_cay",
      inventoryAction: "nhap",
      batchId: "batch_50_mia_4tr",
      billCode: "#PO-50MIA",
      ghiChu: "[Nhập đợt mía] Nhập 50 bó mía dài 12 cây giá 4 triệu (#PO-50MIA)",
      cauNoiGoc: "[Nhập đợt mía] Nhập 50 bó mía dài 12 cây giá 4 triệu (#PO-50MIA)",
      timestamp: "2026-09-08T07:30:00.000Z",
      updatedAt: "2026-09-08T07:30:00.000Z",
      daSync: true,
    },
    {
      id: 1788860002000,
      ngay: "2026-09-08",
      thoiGian: "08:00",
      gio: "08:00",
      loai: "xuat_dung",
      danhMuc: "Sơ chế mía 10kg",
      tenMon: "Mía sạch (1 bó = 10kg)",
      soLuong: 6,
      donViTinh: "bó (60 kg)",
      soTien: 0,
      giaCostDonVi: 0,
      tongGiaCost: 0,
      phuongThuc: "tien_mat",
      chiNhanh: "Kho Tổng",
      ingredientId: "mia_10kg",
      inventoryAction: "soche",
      rawQty: 4,
      yieldQty: 6,
      yieldKg: 60,
      batchId: "batch_50_mia_4tr",
      billCode: "#SC-0001",
      ghiChu: "[Sơ chế mía] Bào 4 bó 12 cây ➔ thu 60kg thành phẩm (CN2: 40kg, Quán Nhà: 20kg) (#SC-0001)",
      cauNoiGoc: "[Sơ chế mía] Bào 4 bó 12 cây ➔ thu 60kg thành phẩm (CN2: 40kg, Quán Nhà: 20kg) (#SC-0001)",
      timestamp: "2026-09-08T08:00:00.000Z",
      updatedAt: "2026-09-08T08:00:00.000Z",
      daSync: true,
    },
  ],
  currentBranch: "Quán Nhà (Chính)",
  defaultOpeningCash: 50000,
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
      priceByBranch: {
        "Quán Nhà (Chính)": 7000,
        "Chi nhánh 2": 8000,
      },
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
      priceByBranch: {
        "Quán Nhà (Chính)": 15000,
        "Chi nhánh 2": 18000,
      },
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
      priceByBranch: {
        "Quán Nhà (Chính)": 10000,
        "Chi nhánh 2": 12000,
      },
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
      price: 12000,
      priceByBranch: {
        "Quán Nhà (Chính)": 12000,
        "Chi nhánh 2": 14000,
      },
      costPrice: 7000,
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
      priceByBranch: {
        "Quán Nhà (Chính)": 17000,
        "Chi nhánh 2": 20000,
      },
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
      priceByBranch: {
        "Quán Nhà (Chính)": 10000,
        "Chi nhánh 2": 12000,
      },
      costPrice: 5000,
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
      priceByBranch: {
        "Quán Nhà (Chính)": 15000,
        "Chi nhánh 2": 18000,
      },
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
      priceByBranch: {
        "Quán Nhà (Chính)": 15000,
        "Chi nhánh 2": 18000,
      },
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
      priceByBranch: {
        "Quán Nhà (Chính)": 12000,
        "Chi nhánh 2": 15000,
      },
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
      priceByBranch: {
        "Quán Nhà (Chính)": 15000,
        "Chi nhánh 2": 18000,
      },
      costPrice: 10000,
      category: "Nước cam",
      note: "Bán nước cam",
      icon: "orange",
      image: "./assets/menu/nuoc_cam.jpg",
      voiceUnit: "ly",
    },
    {
      id: "tra_da",
      name: "Trà đá",
      shortName: "Trà đá",
      price: 3000,
      priceByBranch: {
        "Quán Nhà (Chính)": 3000,
        "Chi nhánh 2": 5000,
      },
      costPrice: 1500,
      category: "Trà đá",
      note: "Bán trà đá",
      icon: "tea",
      image: "./assets/menu/tra_da.jpg",
      voiceUnit: "ly",
    },
  ],
  quickIngredients: [
    {
      id: "ing_mia_bo_10kg",
      name: "Bó mía 10kg bào sẵn (Bán hàng)",
      shortName: "Bó 10kg bào sẵn",
      unit: "bó",
      defaultQty: 1,
      unitCost: 0,
      category: "Mía chặt khúc bán hàng",
      note: "1 bó 10kg bào sạch ép ~25-30 ly (Tự sơ chế từ bó 12 cây dài)",
      icon: "cane_bundle",
      image: "./assets/ingredients/bo_mia_10kg.svg",
      inventoryId: "mia_10kg",
      yieldPerUnit: 25,
      defaultMode: "use",
    },
    {
      id: "ing_mia_bo",
      name: "Mía cây thô (Bó 12 cây dài)",
      shortName: "Bó 12 cây dài (Thô)",
      unit: "bó",
      defaultQty: 5,
      unitCost: 90000,
      category: "Mua mía cây",
      note: "1 bó 12 cây dài thô mua từ vựa về bào ra ~1.5 bó 10kg (~45 ly)",
      icon: "cane_bundle",
      image: "./assets/ingredients/bo_mia_12_cay.svg",
      inventoryId: "mia_cay",
      yieldPerUnit: 45,
      defaultMode: "buy",
    },
    {
      id: "ing_da_vien",
      name: "Bao đá viên sạch",
      shortName: "Bao đá",
      unit: "bao",
      defaultQty: 1,
      unitCost: 17000,
      category: "Mua đá viên",
      note: "Quán Nhà 17k / CN2 21k (1 bao ~30 ly)",
      icon: "ice_bag",
      image: "./assets/ingredients/da_vien.svg",
      inventoryId: "da_vien",
      yieldPerUnit: 30,
    },
    {
      id: "ing_tac",
      name: "Tắc tươi (Quất)",
      shortName: "Tắc tươi",
      unit: "kg",
      defaultQty: 2,
      unitCost: 30000,
      category: "Mua tắc",
      note: "1.5kg tắc 45k (30k/kg) pha sốt tắc",
      icon: "calamansi",
      image: "./assets/ingredients/tac.svg",
      inventoryId: "tac_tuoi",
      yieldPerUnit: 25,
    },
    {
      id: "ing_thom",
      name: "Thơm (Dứa tươi)",
      shortName: "Thơm tươi",
      unit: "trái",
      defaultQty: 5,
      unitCost: 15000,
      category: "Mua thơm",
      note: "4 ly/trái (Cost mía thơm 7k)",
      icon: "pineapple",
      image: "./assets/ingredients/thom.svg",
      inventoryId: "thom_dua",
      yieldPerUnit: 4,
    },
    {
      id: "ing_rau_ma",
      name: "Rau má tươi",
      shortName: "Rau má",
      unit: "kg",
      defaultQty: 3,
      unitCost: 30000,
      category: "Mua rau má",
      note: "1kg 30k ra 12.5 ly rau má",
      icon: "pennywort",
      image: "./assets/ingredients/rau_ma.svg",
      inventoryId: "rau_ma",
      yieldPerUnit: 12.5,
    },
    {
      id: "ing_dau_xanh",
      name: "Đậu xanh chín",
      shortName: "Đậu xanh",
      unit: "kg",
      defaultQty: 2,
      unitCost: 40000,
      category: "Mua đậu xanh",
      note: "10 ly/kg",
      icon: "mung_bean",
      image: "./assets/ingredients/dau_xanh.svg",
      inventoryId: "dau_xanh",
      yieldPerUnit: 10,
    },
    {
      id: "ing_cam",
      name: "Cam sành tươi",
      shortName: "Cam sành",
      unit: "kg",
      defaultQty: 5,
      unitCost: 25000,
      category: "Mua cam",
      note: "3 ly/kg (Cost mía cam 10k)",
      icon: "orange_fresh",
      image: "./assets/ingredients/cam_sanh.svg",
      inventoryId: "cam_sanh",
      yieldPerUnit: 3,
    },
    {
      id: "ing_sua_dac",
      name: "Sữa đặc lon",
      shortName: "Sữa đặc",
      unit: "lon",
      defaultQty: 6,
      unitCost: 22000,
      category: "Mua sữa đặc",
      note: "1 lon pha ~10 ly má sữa",
      icon: "condensed_milk",
      image: "./assets/ingredients/sua_dac.svg",
      inventoryId: "sua_dac",
      yieldPerUnit: 10,
    },
    {
      id: "ing_ly_nhua",
      name: "Ly nhựa (Thùng 2.000 cái)",
      shortName: "Ly nhựa",
      unit: "thùng",
      defaultQty: 1,
      unitCost: 1000000,
      category: "Mua ly nhựa",
      note: "2000 cái là 1tr (500đ/cái)",
      icon: "plastic_cup",
      image: "./assets/ingredients/ly_nhua.svg",
      inventoryId: "ly_nhua",
      yieldPerUnit: 2000,
    },
    {
      id: "ing_ong_hut",
      name: "Ống hút (Bao 10 bịch)",
      shortName: "Ống hút",
      unit: "bao",
      defaultQty: 1,
      unitCost: 270000,
      category: "Mua ống hút",
      note: "270k/bao 10 bịch (27k/bịch ~2.000 ống)",
      icon: "drinking_straw",
      image: "./assets/ingredients/ong_hut.svg",
      inventoryId: "ong_hut",
      yieldPerUnit: 2000,
    },
    {
      id: "ing_bich_t",
      name: "Bọc chữ T mang đi",
      shortName: "Bọc xách",
      unit: "kg",
      defaultQty: 1,
      unitCost: 35000,
      category: "Mua bịch mang đi",
      note: "Bọc 1 ly / 2 ly (~300 cái/kg)",
      icon: "takeaway_bag",
      image: "./assets/ingredients/bich_t.svg",
      inventoryId: "bich_t",
      yieldPerUnit: 300,
    },
    {
      id: "ing_mang_keo",
      name: "Cuộn màng ép miệng ly",
      shortName: "Màng ép",
      unit: "cuộn",
      defaultQty: 1,
      unitCost: 45000,
      category: "Mua màng ép",
      note: "45k/cuộn ép được 2.000 ly (22.5đ/ly)",
      icon: "cup_sealing_film",
      image: "./assets/ingredients/mang_keo.svg",
      inventoryId: "mang_ep",
      yieldPerUnit: 2000,
    },
    {
      id: "ing_duong",
      name: "Đường cát trắng",
      shortName: "Đường cát",
      unit: "kg",
      defaultQty: 10,
      unitCost: 20000,
      category: "Mua đường",
      note: "Đường 20k/kg (pha trà 10k/kg đường)",
      icon: "sugar_sack",
      image: "./assets/ingredients/duong_cat.svg",
      inventoryId: "duong_cat",
      yieldPerUnit: 25,
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
    rentMonthly: 6000000,          // Tiền thuê mặt bằng toàn hệ thống (CN1: 0đ + CN2: 6.000.000 đ/tháng)
    electricityMonthly: 3600000,   // Tiền điện toàn hệ thống (CN1: 2.4tr + CN2: 1.2tr = 3.600.000 đ/tháng)
    waterMonthly: 250000,          // Tiền nước toàn hệ thống (CN1: 150k + CN2: 100k = 250.000 đ/tháng)
    trashMonthly: 100000,          // Tiền rác toàn hệ thống (100.000 đ/tháng)
    depreciationMonthly: 500000,   // Khấu hao 2 máy ép mía & bảo trì (500.000 đ/tháng)
    otherMonthly: 800000,          // Chi phí phát sinh khác toàn hệ thống (800.000 đ/tháng)
    expectedCupsPerDay: 130,       // Sản lượng bán dự kiến toàn hệ thống (130 ly/ngày)
  },
  overheadByBranch: {
    "Quán Nhà (Chính)": {
      rentMonthly: 0,                // Nhà ở (Mặt bằng = 0 đ)
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
  enableAudioPaymentAlert: true,      // Loa AI thông báo chuyển khoản QR
  sugarcaneBatches: [
    {
      id: "batch_50_mia_4tr",
      date: "2026-09-08",
      code: "DOT-50MIA",
      name: "Đợt nhập 50 bó mía 12 cây dài (4 triệu)",
      branch: "Kho Tổng",
      rawStalkBundles: 50,
      costPerBundle: 80000,
      totalCost: 4000000,
      processedRawBundles: 4,
      remainingRawBundles: 46,
      yield10kgBundles: 6,
      yieldKg: 60,
      status: "active",
      history: [
        { time: "08/09/2026 08:00", rawQty: 4, yieldQty: 6, yieldKg: 60, note: "Bào 4 bó 12 cây ➔ thu 60kg sạch (CN2: 40kg / 4 bó, Quán Nhà: 20kg / 2 bó)" },
      ],
    },
  ],
  inventoryStock: {
    "Kho Tổng": [
      { id: "mia_10kg", name: "Mía sạch (1 bó = 10kg)", unit: "bó", stockQty: 6, minQty: 3, unitCost: 0, yieldPerUnit: 25, note: "1 bó = 10kg ép ~25-30 ly (Tự sơ chế từ bó 12 cây dài)" },
      { id: "mia_cay", name: "Mía cây thô (12 cây dài)", unit: "bó", stockQty: 46, minQty: 5, unitCost: 80000, yieldPerUnit: 45, note: "1 bó 12 cây dài thô mua 80k về bào ra ~1.5 bó 10kg (~45 ly)" },
      { id: "tac_tuoi", name: "Tắc tươi", unit: "kg", stockQty: 10, minQty: 2, unitCost: 30000, yieldPerUnit: 25, note: "1.5kg tắc 45k (30k/kg)" },
      { id: "cam_sanh", name: "Cam sành tươi", unit: "kg", stockQty: 15, minQty: 3, unitCost: 25000, yieldPerUnit: 3, note: "3 ly/kg" },
      { id: "thom_dua", name: "Thơm (Dứa) tươi", unit: "trái", stockQty: 10, minQty: 2, unitCost: 15000, yieldPerUnit: 4, note: "4 ly/trái" },
      { id: "rau_ma", name: "Rau má tươi", unit: "kg", stockQty: 8, minQty: 2, unitCost: 30000, yieldPerUnit: 12.5, note: "1kg 30k ra 12.5 ly" },
      { id: "dau_xanh", name: "Đậu xanh chín", unit: "kg", stockQty: 5, minQty: 1, unitCost: 40000, yieldPerUnit: 10, note: "10 ly/kg" },
      { id: "da_vien", name: "Đá viên sạch", unit: "bao", stockQty: 10, minQty: 2, unitCost: 17000, yieldPerUnit: 30, note: "Đá viên sạch 17.000 đ/bao" },
      { id: "sua_dac", name: "Sữa đặc lon", unit: "lon", stockQty: 6, minQty: 2, unitCost: 22000, yieldPerUnit: 10, note: "1 lon pha ~10 ly má sữa" },
      { id: "ly_nhua", name: "Ly nhựa", unit: "cái", stockQty: 2000, minQty: 300, unitCost: 500, yieldPerUnit: 1, note: "2000 cái là 1tr (500đ/cái)" },
      { id: "mang_ep", name: "Màng ép miệng ly", unit: "ly", stockQty: 2000, minQty: 300, unitCost: 23, yieldPerUnit: 1, note: "1 cuộn 45k ép 2000 ly (22.5đ/ly)" },
      { id: "ong_hut", name: "Ống hút", unit: "cái", stockQty: 2000, minQty: 300, unitCost: 135, yieldPerUnit: 1, note: "1 bao 10 bịch 270k (27k/bịch)" },
      { id: "bich_t", name: "Bọc chữ T mang đi", unit: "kg", stockQty: 2, minQty: 1, unitCost: 35000, yieldPerUnit: 300, note: "Bọc 1 ly / 2 ly (~300 cái/kg)" },
      { id: "duong_cat", name: "Đường cát", unit: "kg", stockQty: 20, minQty: 5, unitCost: 20000, yieldPerUnit: 25, note: "Đường 20k/kg" },
    ],
    "Quán Nhà (Chính)": [
      { id: "mia_10kg", name: "Mía sạch (1 bó = 10kg)", unit: "bó", stockQty: 2, minQty: 1, unitCost: 0, yieldPerUnit: 25, note: "1 bó = 10kg ép ~25-30 ly (Tự sơ chế từ bó 12 cây dài)" },
      { id: "mia_cay", name: "Mía cây thô (12 cây dài)", unit: "bó", stockQty: 20, minQty: 5, unitCost: 90000, yieldPerUnit: 45, note: "1 bó 12 cây dài thô mua từ vựa về bào ra ~1.5 bó 10kg (~45 ly)" },
      { id: "tac_tuoi", name: "Tắc tươi", unit: "kg", stockQty: 10, minQty: 2, unitCost: 30000, yieldPerUnit: 25, note: "1.5kg tắc 45k (30k/kg)" },
      { id: "cam_sanh", name: "Cam sành tươi", unit: "kg", stockQty: 15, minQty: 3, unitCost: 25000, yieldPerUnit: 3, note: "3 ly/kg" },
      { id: "thom_dua", name: "Thơm (Dứa) tươi", unit: "trái", stockQty: 10, minQty: 2, unitCost: 15000, yieldPerUnit: 4, note: "4 ly/trái" },
      { id: "rau_ma", name: "Rau má tươi", unit: "kg", stockQty: 8, minQty: 2, unitCost: 30000, yieldPerUnit: 12.5, note: "1kg 30k ra 12.5 ly" },
      { id: "dau_xanh", name: "Đậu xanh chín", unit: "kg", stockQty: 5, minQty: 1, unitCost: 40000, yieldPerUnit: 10, note: "10 ly/kg" },
      { id: "da_vien", name: "Đá viên sạch", unit: "bao", stockQty: 10, minQty: 2, unitCost: 17000, yieldPerUnit: 30, note: "Đá viên sạch 17.000 đ/bao" },
      { id: "sua_dac", name: "Sữa đặc lon", unit: "lon", stockQty: 6, minQty: 2, unitCost: 22000, yieldPerUnit: 10, note: "1 lon pha ~10 ly má sữa" },
      { id: "ly_nhua", name: "Ly nhựa", unit: "cái", stockQty: 2000, minQty: 300, unitCost: 500, yieldPerUnit: 1, note: "2000 cái là 1tr (500đ/cái)" },
      { id: "mang_ep", name: "Màng ép miệng ly", unit: "ly", stockQty: 2000, minQty: 300, unitCost: 23, yieldPerUnit: 1, note: "1 cuộn 45k ép 2000 ly (22.5đ/ly)" },
      { id: "ong_hut", name: "Ống hút", unit: "cái", stockQty: 2000, minQty: 300, unitCost: 135, yieldPerUnit: 1, note: "1 bao 10 bịch 270k (27k/bịch)" },
      { id: "bich_t", name: "Bọc chữ T mang đi", unit: "kg", stockQty: 2, minQty: 1, unitCost: 35000, yieldPerUnit: 300, note: "Bọc 1 ly / 2 ly (~300 cái/kg)" },
      { id: "duong_cat", name: "Đường cát", unit: "kg", stockQty: 20, minQty: 5, unitCost: 20000, yieldPerUnit: 25, note: "Đường 20k/kg" },
    ],
    "Chi nhánh 2": [
      { id: "mia_10kg", name: "Mía sạch (1 bó = 10kg)", unit: "bó", stockQty: 4, minQty: 1, unitCost: 0, yieldPerUnit: 25, note: "1 bó = 10kg ép ~25-30 ly (Tự sơ chế từ bó 12 cây dài)" },
      { id: "mia_cay", name: "Mía cây thô (12 cây dài)", unit: "bó", stockQty: 15, minQty: 5, unitCost: 90000, yieldPerUnit: 45, note: "1 bó 12 cây dài thô mua từ vựa về bào ra ~1.5 bó 10kg (~45 ly)" },
      { id: "tac_tuoi", name: "Tắc tươi", unit: "kg", stockQty: 8, minQty: 2, unitCost: 30000, yieldPerUnit: 25, note: "1.5kg tắc 45k (30k/kg)" },
      { id: "cam_sanh", name: "Cam sành tươi", unit: "kg", stockQty: 10, minQty: 3, unitCost: 25000, yieldPerUnit: 3, note: "3 ly/kg" },
      { id: "thom_dua", name: "Thơm (Dứa) tươi", unit: "trái", stockQty: 8, minQty: 2, unitCost: 15000, yieldPerUnit: 4, note: "4 ly/trái" },
      { id: "rau_ma", name: "Rau má tươi", unit: "kg", stockQty: 6, minQty: 2, unitCost: 30000, yieldPerUnit: 12.5, note: "1kg 30k ra 12.5 ly" },
      { id: "dau_xanh", name: "Đậu xanh chín", unit: "kg", stockQty: 4, minQty: 1, unitCost: 40000, yieldPerUnit: 10, note: "10 ly/kg" },
      { id: "da_vien", name: "Đá viên sạch", unit: "bao", stockQty: 8, minQty: 2, unitCost: 17000, yieldPerUnit: 30, note: "Đá viên sạch 17.000 đ/bao" },
      { id: "sua_dac", name: "Sữa đặc lon", unit: "lon", stockQty: 4, minQty: 2, unitCost: 22000, yieldPerUnit: 10, note: "1 lon pha ~10 ly má sữa" },
      { id: "ly_nhua", name: "Ly nhựa", unit: "cái", stockQty: 1500, minQty: 300, unitCost: 500, yieldPerUnit: 1, note: "2000 cái là 1tr (500đ/cái)" },
      { id: "mang_ep", name: "Màng ép miệng ly", unit: "ly", stockQty: 1500, minQty: 300, unitCost: 23, yieldPerUnit: 1, note: "1 cuộn 45k ép 2000 ly (22.5đ/ly)" },
      { id: "ong_hut", name: "Ống hút", unit: "cái", stockQty: 1500, minQty: 300, unitCost: 135, yieldPerUnit: 1, note: "1 bao 10 bịch 270k (27k/bịch)" },
      { id: "bich_t", name: "Bọc chữ T mang đi", unit: "kg", stockQty: 1.5, minQty: 1, unitCost: 35000, yieldPerUnit: 300, note: "Bọc 1 ly / 2 ly (~300 cái/kg)" },
      { id: "duong_cat", name: "Đường cát", unit: "kg", stockQty: 15, minQty: 5, unitCost: 20000, yieldPerUnit: 25, note: "Đường 20k/kg" },
    ],
  },
  packagingConfig: {
    cups: { name: "Ly nhựa", unit: "thùng (2.000 cái)", batchCost: 1000000, batchYield: 2000, unitCost: 500 },
    straws: { name: "Ống hút", unit: "bao (10 bịch)", batchCost: 270000, batchYield: 2000, unitCost: 135 },
    filmRoll: { name: "Màng ép ly", unit: "cuộn (2.000 ly)", batchCost: 45000, batchYield: 2000, unitCost: 23 },
    bags: { name: "Bọc chữ T", unit: "bọc (~300 cái/kg)", batchCost: 35000, batchYield: 300, unitCost: 115 },
    ice: { name: "Đá viên sạch", unit: "bao (Quán Nhà 17k / CN2 21k)", batchCost: 17000, batchYield: 30, unitCost: 567 },
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
  initialCapital: 4990000,
  capitalWalletInitial: 4990000,
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
    "./assets/menu/tra_da.jpg",
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
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase();

  if (str.includes("tra da") || (str.includes("tra") && str.includes("da") && !str.includes("tac"))) {
    return "./assets/menu/tra_da.jpg";
  }
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

export function getValidIngredientImage(item) {
  if (!item) return "./assets/ingredients/bo_mia.svg";
  if (item.image && (item.image.endsWith(".svg") || item.image.endsWith(".jpg") || item.image.endsWith(".png"))) return item.image;

  const str = `${item.id || ""} ${item.name || ""} ${item.shortName || ""} ${item.category || ""}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase();

  if (str.includes("12 cay") || str.includes("cay dai") || str.includes("chua bao")) return "./assets/ingredients/bo_mia_12_cay.svg";
  if (str.includes("10kg") || str.includes("10 kg") || str.includes("mia")) return "./assets/ingredients/bo_mia_10kg.svg";
  if (str.includes("mang") || str.includes("keo") || str.includes("ep ly") || str.includes("cuon")) return "./assets/ingredients/mang_keo.svg";
  if (str.includes("bich") || str.includes("boc") || str.includes("t bag") || str.includes("tbag")) return "./assets/ingredients/bich_t.svg";
  if (str.includes("ong hut") || str.includes("hut") || str.includes("straw")) return "./assets/ingredients/ong_hut.svg";
  if (str.includes("da vien") || str.includes("bao da") || str.includes("nuoc da") || str.includes("ice") || /\bda\b/.test(str)) return "./assets/ingredients/da_vien.svg";
  if (str.includes("tac") || str.includes("quat") || str.includes("calamansi")) return "./assets/ingredients/tac.svg";
  if (str.includes("thom") || str.includes("dua") || str.includes("khom") || str.includes("pineapple")) return "./assets/ingredients/thom.svg";
  if (str.includes("rau ma") || str.includes("pennywort")) return "./assets/ingredients/rau_ma.svg";
  if (str.includes("dau xanh") || str.includes("dau") || str.includes("mung")) return "./assets/ingredients/dau_xanh.svg";
  if (str.includes("cam") || str.includes("orange")) return "./assets/ingredients/cam_sanh.svg";
  if (str.includes("sua") || str.includes("milk")) return "./assets/ingredients/sua_dac.svg";
  if (str.includes("duong") || str.includes("sugar")) return "./assets/ingredients/duong_cat.svg";
  if (str.includes("ly") || str.includes("coc") || str.includes("cup")) return "./assets/ingredients/ly_nhua.svg";

  return "./assets/ingredients/bo_mia_10kg.svg";
}

export function getItemPrice(item, branch = "Quán Nhà (Chính)") {
  if (!item) return 10000;
  const targetBranch = branch === "all" || !branch ? "Quán Nhà (Chính)" : branch;
  if (item.priceByBranch && item.priceByBranch[targetBranch] !== undefined && Number(item.priceByBranch[targetBranch]) > 0) {
    return Number(item.priceByBranch[targetBranch]);
  }
  return Number(item.price) > 0 ? Number(item.price) : 10000;
}

export function mergeData(data) {
  const base = cloneDefault();
  const legacyPrices = Array.isArray(data?.quickPrices) ? data.quickPrices : null;
  const needsNotebookUpgrade = data?.costDataVersion !== NOTEBOOK_VERSION;

  // Quick items: use custom list if provided; otherwise fallback to default base list
  let mergedQuickItems;
  if (Array.isArray(data?.quickItems) && data.quickItems.length > 0) {
    mergedQuickItems = data.quickItems.map((item, idx) => {
      const key = `${item.id || ""} ${item.name || ""} ${item.shortName || ""}`.toLowerCase();
      const costPrice = Number(item.costPrice) >= 0 ? Number(item.costPrice) : 0;
      const price = Number(item.price) > 0 ? Number(item.price) : 10000;

      // Preserve user-configured branch prices with fallbacks only for unconfigured branches
      const priceMain = item.priceByBranch?.["Quán Nhà (Chính)"] ?? price;
      const priceCn2 = item.priceByBranch?.["Chi nhánh 2"] ?? (key.includes("nuoc_mia") ? 8000 : (key.includes("tra_da") ? 5000 : (key.includes("1l") ? 18000 : (priceMain + 2000))));

      const priceByBranch = {
        "Quán Nhà (Chính)": Number(priceMain) || price,
        "Chi nhánh 2": Number(priceCn2) || (price + 2000),
        ...(item.priceByBranch || {}),
      };

      return {
        ...item,
        id: item.id || `item_${idx}_${Date.now()}`,
        name: item.name || "Món nước",
        shortName: item.shortName || item.name || "Món nước",
        category: item.category || item.name || "Món nước",
        price: Number(priceByBranch["Quán Nhà (Chính)"]) || price,
        priceByBranch,
        costPrice,
        icon: item.icon || "cane",
        image: getValidMenuImage(item),
      };
    });

    if (needsNotebookUpgrade) {
      const hasTraDa = mergedQuickItems.some((i) => i.id === "tra_da" || i.name?.toLowerCase().includes("trà đá"));
      if (!hasTraDa) {
        mergedQuickItems.push({
          id: "tra_da",
          name: "Trà đá",
          shortName: "Trà đá",
          price: 3000,
          priceByBranch: {
            "Quán Nhà (Chính)": 3000,
            "Chi nhánh 2": 5000,
          },
          costPrice: 1500,
          category: "Trà đá",
          note: "Bán trà đá",
          icon: "tea",
          image: "./assets/menu/tra_da.jpg",
          voiceUnit: "ly",
        });
      }

      const hasMiaTac = mergedQuickItems.some((i) => i.id === "mia_tac" || i.name?.toLowerCase().includes("mía tắc"));
      if (!hasMiaTac) {
        mergedQuickItems.splice(2, 0, {
          id: "mia_tac",
          name: "Mía tắc",
          shortName: "Mía tắc",
          price: 10000,
          priceByBranch: {
            "Quán Nhà (Chính)": 10000,
            "Chi nhánh 2": 12000,
          },
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
          price: 12000,
          priceByBranch: {
            "Quán Nhà (Chính)": 12000,
            "Chi nhánh 2": 14000,
          },
          costPrice: 7000,
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

  const rawTxList = Array.isArray(data?.ds)
    ? data.ds
    : (Array.isArray(base.ds) ? base.ds : []);

  const normalizedTransactions = rawTxList.map((item) => {
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

        // Chuẩn hóa và tự động gán mã Bill/Đơn hàng cho tất cả giao dịch cũ & mới
        let itemLoai = item.loai;
        let itemSoTien = Number(item.soTien) || 0;
        let itemDanhMuc = canonicalCategory(item.danhMuc);
        let itemGhiChu = String(item.ghiChu || item.cauNoiGoc || "");
        let itemGiaCostDonVi = costPerUnit;
        let itemTongGiaCost = totalCost;

        let billCode = item.billCode || item.maDonHang || "";
        if (!billCode) {
          const match = itemGhiChu.match(/#(?:BILL|PO|XK|SC|DC)-\w+/i);
          if (match) {
            billCode = match[0].toUpperCase();
          } else {
            const prefix = itemLoai === "thu" ? "BILL" : (itemLoai === "xuat_dung" ? "XK" : "PO");
            const idSuffix = String(item.id || Date.now()).slice(-4);
            billCode = `#${prefix}-${idSuffix}`;
          }
        }

        return {
          ...item,
          loai: itemLoai,
          soTien: itemSoTien,
          billCode,
          danhMuc: itemDanhMuc,
          ghiChu: itemGhiChu,
          chiNhanh: item.chiNhanh || currentBranch,
          soLuong: qty,
          donViTinh: String(item.donViTinh || (itemLoai === "thu" ? "ly" : (isMuaMia10kg ? "bó" : "kg"))),
          phuongThuc: String(item.phuongThuc || "tien_mat"),
          giaCostDonVi: itemGiaCostDonVi,
          tongGiaCost: itemTongGiaCost,
          nguonTienChi: item.nguonTienChi || (itemLoai === "chi" ? "tien_von" : undefined),
        };
      });

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
    quickIngredients: (() => {
      let list = [];
      if (Array.isArray(data?.quickIngredients) && data.quickIngredients.length > 0) {
        list = data.quickIngredients.map((item) => {
          const unitCost = Number(item.unitCost) >= 0 ? Number(item.unitCost) : 0;
          return {
            ...item,
            unitCost,
            image: getValidIngredientImage(item),
          };
        });

        const hasMia10kg = list.some((i) => i.id === "ing_mia_bo_10kg" || (i.name && (i.name.includes("10kg") || i.name.includes("10 kg"))));
        if (!hasMia10kg) {
          list.unshift({
            id: "ing_mia_bo_10kg",
            name: "Bó mía 10kg (Đã bào sạch)",
            shortName: "Bó mía 10kg",
            unit: "bó",
            defaultQty: 1,
            unitCost: 70000,
            category: "Mua mía cây",
            note: "1 bó 10kg đã bào sạch cột dây ~25-30 ly (7k/kg)",
            icon: "cane_bundle",
            image: "./assets/ingredients/bo_mia_10kg.svg",
            inventoryId: "mia_10kg",
            yieldPerUnit: 25,
          });
        }

        const hasMia12cay = list.some((i) => i.id === "ing_mia_bo" || (i.name && (i.name.includes("12 cây") || i.name.includes("cây dài"))));
        if (!hasMia12cay) {
          const idx10kg = list.findIndex((i) => i.id === "ing_mia_bo_10kg");
          list.splice(idx10kg >= 0 ? idx10kg + 1 : 1, 0, {
            id: "ing_mia_bo",
            name: "Bó mía cây (12 cây dài)",
            shortName: "Bó 12 cây dài",
            unit: "bó",
            defaultQty: 5,
            unitCost: 90000,
            category: "Mua mía cây",
            note: "1 bó 12 cây dài 90k chưa bào ra 15kg mía (~45 ly)",
            icon: "cane_bundle",
            image: "./assets/ingredients/bo_mia_12_cay.svg",
            inventoryId: "mia_cay",
            yieldPerUnit: 45,
          });
        }
      } else {
        list = base.quickIngredients;
      }
      return list;
    })(),
    overheadConfig: { ...(base.overheadConfig || {}), ...(data?.overheadConfig || {}) },
    overheadByBranch: {
      "Quán Nhà (Chính)": {
        ...(base.overheadByBranch?.["Quán Nhà (Chính)"] || {}),
        ...(data?.overheadByBranch?.["Quán Nhà (Chính)"] || {}),
        rentMonthly: 0, // Quán nhà là nhà ở, mặt bằng = 0 đ
      },
      "Chi nhánh 2": {
        ...(base.overheadByBranch?.["Chi nhánh 2"] || {}),
        ...(data?.overheadByBranch?.["Chi nhánh 2"] || {}),
      },
    },
    packagingConfig: { ...(base.packagingConfig || {}), ...(data?.packagingConfig || {}) },
    costFormulas: { ...(base.costFormulas || {}), ...(data?.costFormulas || {}) },
    crmCustomers: Array.isArray(data?.crmCustomers) ? data.crmCustomers : (base.crmCustomers || []),
    aiChatHistory: Array.isArray(data?.aiChatHistory) ? data.aiChatHistory : (base.aiChatHistory || []),
    restartLogs: Array.isArray(data?.restartLogs) ? data.restartLogs : (base.restartLogs || []),
    dailyClosings: Array.isArray(data?.dailyClosings) ? data.dailyClosings : (base.dailyClosings || []),
    sugarcaneBatches: Array.isArray(data?.sugarcaneBatches)
      ? data.sugarcaneBatches
      : (base.sugarcaneBatches || []),
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
    initialCapital: Number(data?.initialCapital ?? data?.capitalWalletInitial ?? base.initialCapital ?? 4990000),
    capitalWalletInitial: Number(data?.capitalWalletInitial ?? data?.initialCapital ?? base.capitalWalletInitial ?? 4990000),
    inventoryStock: (() => {
      const stock = data?.inventoryStock || {};
      if (!stock["Kho Tổng"]) {
        stock["Kho Tổng"] = JSON.parse(JSON.stringify(base.inventoryStock["Kho Tổng"] || stock["Quán Nhà (Chính)"] || []));
      }
      const baseStock = base.inventoryStock || {};
      const result = {};
      const branchNames = Object.keys(baseStock);
      for (const b of branchNames) {
        const existingList = stock[b] || [];
        const baseList = baseStock[b] || [];
        const map = new Map();
        existingList.forEach((item) => {
          const sanitizedCost = Math.max(0, Number(item.unitCost) || 0);
          map.set(item.id, { ...item, unitCost: sanitizedCost });
        });
        baseList.forEach((baseItem) => {
          if (!map.has(baseItem.id)) {
            map.set(baseItem.id, { ...baseItem });
          } else {
            const cur = map.get(baseItem.id);
            const sanitizedCost = Math.max(0, Number(cur.unitCost) || 0);
            map.set(baseItem.id, { ...baseItem, ...cur, unitCost: sanitizedCost, unit: baseItem.unit, name: baseItem.name });
          }
        });
        result[b] = Array.from(map.values());
      }
      return result;
    })(),
    ds: normalizedTransactions,
  };
}

const inMemoryFallbackStorage = new Map();

async function readStorageValue(key) {
  const Preferences = getPreferences();
  if (isNative() && Preferences?.get) {
    return (await Preferences.get({ key })).value;
  }
  if (typeof localStorage !== "undefined") {
    return localStorage.getItem(key);
  }
  return inMemoryFallbackStorage.get(key) || null;
}

async function writeStorageValue(key, value) {
  const Preferences = getPreferences();
  if (isNative() && Preferences?.set) {
    await Preferences.set({ key, value });
    return;
  }
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(key, value);
    return;
  }
  inMemoryFallbackStorage.set(key, value);
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

let writeQueue = Promise.resolve();

export function luuDuLieu(data) {
  writeQueue = writeQueue.then(async () => {
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
  });
  return writeQueue;
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
    billCode: input.billCode || (input.loai === "thu" ? `#BILL-${now.getTime().toString().slice(-4)}` : (input.loai === "xuat_dung" ? `#XK-${now.getTime().toString().slice(-4)}` : `#PO-${now.getTime().toString().slice(-4)}`)),
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
    nguonTienChi: input.nguonTienChi,
    ingredientId: input.ingredientId,
    inventoryAction: input.inventoryAction,
    rawQty: input.rawQty,
    yieldQty: input.yieldQty,
    yieldKg: input.yieldKg,
    sourceBranch: input.sourceBranch,
    targetBranch: input.targetBranch,
    batchId: input.batchId,
    slots: input.slots,
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
  // Không tự động trừ lẻ nguyên liệu khi bán nước POS (nguyên liệu xuất dùng theo đợt)
  await luuDuLieu(data);
  return giaoDich;
}

export function rollbackInventoryOnDelete(data, tx) {
  if (!tx || !data.inventoryStock) return;
  const branch = tx.chiNhanh || data.currentBranch || "Quán Nhà (Chính)";
  const stockList = data.inventoryStock[branch];
  if (!stockList) return;

  const findItem = (idOrName) => {
    if (!idOrName) return null;
    const norm = String(idOrName).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    let found = stockList.find((x) => x.id === idOrName);
    if (found) return found;
    found = stockList.find((x) => x.id.toLowerCase() === norm);
    if (found) return found;
    if (norm.includes("da")) return stockList.find((x) => x.id === "da_vien");
    if (norm.includes("mia") || norm.includes("cane")) {
      if (norm.includes("10kg") || norm.includes("10 kg") || norm.includes("sach") || norm.includes("bao")) {
        return stockList.find((x) => x.id === "mia_10kg");
      }
      return stockList.find((x) => x.id === "mia_cay");
    }
    if (norm.includes("tac")) return stockList.find((x) => x.id === "tac_tuoi");
    if (norm.includes("cam")) return stockList.find((x) => x.id === "cam_sanh");
    if (norm.includes("thom") || norm.includes("dua") || norm.includes("khom")) return stockList.find((x) => x.id === "thom_dua");
    if (norm.includes("rau ma")) return stockList.find((x) => x.id === "rau_ma");
    if (norm.includes("dau xanh")) return stockList.find((x) => x.id === "dau_xanh");
    if (norm.includes("sua") || norm.includes("dac")) return stockList.find((x) => x.id === "sua_dac");
    if (norm.includes("ly")) return stockList.find((x) => x.id === "ly_nhua");
    if (norm.includes("mang")) return stockList.find((x) => x.id === "mang_ep");
    if (norm.includes("ong hut")) return stockList.find((x) => x.id === "ong_hut");
    if (norm.includes("bich") || norm.includes("boc") || norm.includes("chu t")) return stockList.find((x) => x.id === "bich_t");
    if (norm.includes("duong")) return stockList.find((x) => x.id === "duong_cat");
    return stockList.find((x) => {
      const xNorm = x.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return xNorm.includes(norm) || norm.includes(xNorm);
    });
  };

  const action = tx.inventoryAction;
  const isSoche = action === "soche" || (tx.danhMuc && tx.danhMuc.toLowerCase().includes("sơ chế"));
  const isTransfer = action === "transfer" || (tx.danhMuc && (tx.danhMuc.toLowerCase().includes("điều chuyển") || tx.danhMuc.toLowerCase().includes("xuất mía sang")));

  if (isSoche) {
    // Sơ chế: trừ lại mía 10kg, cộng trả lại mía cây thô
    const rawQty = Number(tx.rawQty) || (Number(tx.ghiChu?.match(/Bào\s*([\d\.]+)\s*bó/i)?.[1]) || 1);
    const yieldQty = Number(tx.yieldQty) || Number(tx.soLuong) || 1;
    const item10kg = findItem("mia_10kg");
    const itemCay = findItem("mia_cay");
    if (item10kg) {
      item10kg.stockQty = Math.max(0, Math.round(((Number(item10kg.stockQty) || 0) - yieldQty) * 100) / 100);
    }
    if (itemCay) {
      itemCay.stockQty = Math.round(((Number(itemCay.stockQty) || 0) + rawQty) * 100) / 100;
    }
    if (Array.isArray(data.sugarcaneBatches)) {
      const batch = (tx.batchId && data.sugarcaneBatches.find((b) => b.id === tx.batchId)) || data.sugarcaneBatches.find((b) => b.status === "active") || data.sugarcaneBatches[0];
      if (batch) {
        batch.processedRawBundles = Math.max(0, Math.round(((Number(batch.processedRawBundles) || 0) - rawQty) * 100) / 100);
        batch.remainingRawBundles = Math.min(Number(batch.rawStalkBundles) || 0, Math.round(((Number(batch.remainingRawBundles) || 0) + rawQty) * 100) / 100);
        batch.yield10kgBundles = Math.max(0, Math.round(((Number(batch.yield10kgBundles) || 0) - yieldQty) * 100) / 100);
        if (batch.status === "completed" && batch.remainingRawBundles > 0) {
          batch.status = "active";
        }
      }
    }
    return;
  }

  if (isTransfer) {
    // Điều chuyển: Quán Nhà xuất sang Chi nhánh 2
    const targetBranchName = tx.targetBranch || "Chi nhánh 2";
    const srcBranchName = tx.sourceBranch || "Quán Nhà (Chính)";
    const qty = Number(tx.soLuong) || 1;
    const srcList = data.inventoryStock[srcBranchName];
    const targetList = data.inventoryStock[targetBranchName];
    if (srcList) {
      const itemSrc = srcList.find((x) => x.id === (tx.ingredientId || "mia_10kg"));
      if (itemSrc) itemSrc.stockQty = Math.round(((Number(itemSrc.stockQty) || 0) + qty) * 100) / 100;
    }
    if (targetList) {
      const itemTarget = targetList.find((x) => x.id === (tx.ingredientId || "mia_10kg"));
      if (itemTarget) itemTarget.stockQty = Math.max(0, Math.round(((Number(itemTarget.stockQty) || 0) - qty) * 100) / 100);
    }
    return;
  }

  const isXuat = action === "xuat" || tx.loai === "xuat_dung" || tx.loai === "xuat_kho";
  const isNhap = action === "nhap" || (tx.loai === "chi" && (
    Boolean(tx.ingredientId) ||
    String(tx.ghiChu || "").toLowerCase().includes("[nhập") ||
    String(tx.ghiChu || "").toLowerCase().includes("[mua hàng") ||
    String(tx.danhMuc || "").toLowerCase().includes("mua")
  ));

  const qty = Number(tx.soLuong) || 1;
  const matched = findItem(tx.ingredientId || tx.danhMuc);

  if (matched) {
    if (isXuat) {
      // Khi xóa phiếu xuất dùng: Hoàn trả lại tồn kho (+qty)
      matched.stockQty = Math.round(((Number(matched.stockQty) || 0) + qty) * 100) / 100;
    } else if (isNhap) {
      // Khi xóa phiếu nhập mua hàng sai: Trừ trả lại tồn kho (-qty)
      matched.stockQty = Math.max(0, Math.round(((Number(matched.stockQty) || 0) - qty) * 100) / 100);
      if (tx.batchId && Array.isArray(data.sugarcaneBatches)) {
        data.sugarcaneBatches = data.sugarcaneBatches.filter((b) => b.id !== tx.batchId);
      }
    }
    if (branch === "Kho Tổng") {
      if (data.inventoryStock["Quán Nhà (Chính)"]) {
        const itemQn = data.inventoryStock["Quán Nhà (Chính)"].find((x) => x.id === matched.id);
        if (itemQn) itemQn.stockQty = matched.stockQty;
      }
      if (data.inventoryStock["Chi nhánh 2"]) {
        const itemCn2 = data.inventoryStock["Chi nhánh 2"].find((x) => x.id === matched.id);
        if (itemCn2) itemCn2.stockQty = matched.stockQty;
      }
    }
  }
}

export async function xoaGiaoDich(id) {
  const data = await docDuLieu();
  const tx = data.ds.find((item) => String(item.id) === String(id));
  if (tx && !tx.deleted) {
    rollbackInventoryOnDelete(data, tx);
  }
  data.ds = data.ds.map((item) =>
    String(item.id) === String(id)
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

export async function luuDanhSachNguyenLieu(ingredientItems) {
  const data = await docDuLieu();
  data.quickIngredients = ingredientItems.map((item) => ({
    ...item,
    unitCost: Number(item.unitCost) || 0,
    defaultQty: Number(item.defaultQty) || 1,
    yieldPerUnit: Number(item.yieldPerUnit) || 1,
    image: getValidIngredientImage(item),
  }));
  data.settingsVersion = Date.now();
  await luuDuLieu(data);
  return data.quickIngredients;
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
  data.costDataVersion = NOTEBOOK_VERSION;
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
    const validLoai = ["thu", "chi", "xuat_dung", "xuat_kho", "nhap_kho"].includes(item.loai);
    const validTien = (item.loai === "thu" || item.loai === "chi") ? Number(item.soTien) > 0 : Number(item.soTien) >= 0;
    if (!validLoai || !validTien || !item.ngay) {
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
  data.defaultOpeningCash = Number(soTien) >= 0 ? Number(soTien) : 50000;
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

// ==========================================
// MODULE QUẢN LÝ TỒN KHO & ĐỊNH MỨC NGUYÊN LIỆU (BOM)
// ==========================================

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
  const branch = branchName || "Kho Tổng";
  if (!data.inventoryStock) data.inventoryStock = JSON.parse(JSON.stringify(DEFAULT_DATA.inventoryStock));
  if (!data.inventoryStock[branch]) {
    data.inventoryStock[branch] = JSON.parse(JSON.stringify(DEFAULT_DATA.inventoryStock["Kho Tổng"] || DEFAULT_DATA.inventoryStock["Quán Nhà (Chính)"]));
  }

  const items = data.inventoryStock[branch];
  const queryNorm = String(ingredientIdOrName).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  let matched = items.find((x) => x.id === ingredientIdOrName || x.name.toLowerCase().includes(queryNorm));

  if (!matched) {
    if (queryNorm.includes("da")) matched = items.find((x) => x.id === "da_vien");
    else if (queryNorm.includes("mia")) {
      if (queryNorm.includes("10kg") || queryNorm.includes("10 kg")) matched = items.find((x) => x.id === "mia_10kg");
      else matched = items.find((x) => x.id === "mia_cay");
    }
    else if (queryNorm.includes("tac")) matched = items.find((x) => x.id === "tac_tuoi");
    else if (queryNorm.includes("cam")) matched = items.find((x) => x.id === "cam_sanh");
    else if (queryNorm.includes("thom") || queryNorm.includes("dua") || queryNorm.includes("khom")) matched = items.find((x) => x.id === "thom_dua");
    else if (queryNorm.includes("rau ma")) matched = items.find((x) => x.id === "rau_ma");
    else if (queryNorm.includes("dau xanh") || queryNorm.includes("dau")) matched = items.find((x) => x.id === "dau_xanh");
    else if (queryNorm.includes("sua") || queryNorm.includes("dac")) matched = items.find((x) => x.id === "sua_dac");
    else if (queryNorm.includes("bich") || queryNorm.includes("boc") || queryNorm.includes("chu t")) matched = items.find((x) => x.id === "bich_t");
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

    // Tính giá vốn bình quân gia quyền liên hoàn theo chuẩn MISA eShop (chỉ tính lại khi nhập thêm hàng: addQty > 0)
    if (addQty > 0 && addCost > 0 && newQty > 0) {
      if (oldQty <= 0) {
        matched.unitCost = addCost;
      } else {
        matched.unitCost = Math.max(0, Math.round(((oldQty * oldCost) + (addQty * addCost)) / newQty));
      }
    }
    matched.stockQty = newQty;

    if (branch === "Kho Tổng") {
      if (data.inventoryStock["Quán Nhà (Chính)"]) {
        const itemQn = data.inventoryStock["Quán Nhà (Chính)"].find((x) => x.id === matched.id);
        if (itemQn) {
          itemQn.stockQty = newQty;
          if (matched.unitCost) itemQn.unitCost = matched.unitCost;
        }
      }
      if (data.inventoryStock["Chi nhánh 2"]) {
        const itemCn2 = data.inventoryStock["Chi nhánh 2"].find((x) => x.id === matched.id);
        if (itemCn2) {
          itemCn2.stockQty = newQty;
          if (matched.unitCost) itemCn2.unitCost = matched.unitCost;
        }
      }
    }
  }

  data.settingsVersion = Date.now();
  await luuDuLieu(data);
  return { matched, stockQty: matched?.stockQty || 0, unitCost: matched?.unitCost || 0 };
}

export async function truKhoNguyenLieu(branchName, ingredientIdOrName, qty, note = "") {
  const data = await docDuLieu();
  const branch = branchName || "Kho Tổng";
  if (!data.inventoryStock) data.inventoryStock = JSON.parse(JSON.stringify(DEFAULT_DATA.inventoryStock));
  if (!data.inventoryStock[branch]) {
    data.inventoryStock[branch] = JSON.parse(JSON.stringify(DEFAULT_DATA.inventoryStock["Kho Tổng"] || DEFAULT_DATA.inventoryStock["Quán Nhà (Chính)"]));
  }

  const items = data.inventoryStock[branch];
  const queryNorm = String(ingredientIdOrName).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  let matched = items.find((x) => x.id === ingredientIdOrName || x.name.toLowerCase().includes(queryNorm));

  if (!matched) {
    if (queryNorm.includes("da")) matched = items.find((x) => x.id === "da_vien");
    else if (queryNorm.includes("mia")) {
      if (queryNorm.includes("10kg") || queryNorm.includes("10 kg")) matched = items.find((x) => x.id === "mia_10kg");
      else matched = items.find((x) => x.id === "mia_cay");
    }
    else if (queryNorm.includes("tac")) matched = items.find((x) => x.id === "tac_tuoi");
    else if (queryNorm.includes("cam")) matched = items.find((x) => x.id === "cam_sanh");
    else if (queryNorm.includes("thom") || queryNorm.includes("dua") || queryNorm.includes("khom")) matched = items.find((x) => x.id === "thom_dua");
    else if (queryNorm.includes("rau ma")) matched = items.find((x) => x.id === "rau_ma");
    else if (queryNorm.includes("dau xanh") || queryNorm.includes("dau")) matched = items.find((x) => x.id === "dau_xanh");
    else if (queryNorm.includes("sua") || queryNorm.includes("dac")) matched = items.find((x) => x.id === "sua_dac");
    else if (queryNorm.includes("bich") || queryNorm.includes("boc") || queryNorm.includes("chu t")) matched = items.find((x) => x.id === "bich_t");
    else if (queryNorm.includes("ly")) matched = items.find((x) => x.id === "ly_nhua");
    else if (queryNorm.includes("ong hut")) matched = items.find((x) => x.id === "ong_hut");
    else if (queryNorm.includes("mang")) matched = items.find((x) => x.id === "mang_ep");
    else if (queryNorm.includes("duong")) matched = items.find((x) => x.id === "duong_cat");
  }

  const deductQty = Math.max(0, Number(qty) || 0);
  if (matched && deductQty > 0) {
    const oldQty = Math.max(0, Number(matched.stockQty) || 0);
    const newQty = Math.max(0, Math.round((oldQty - deductQty) * 100) / 100);
    matched.stockQty = newQty;

    if (branch === "Kho Tổng") {
      if (data.inventoryStock["Quán Nhà (Chính)"]) {
        const itemQn = data.inventoryStock["Quán Nhà (Chính)"].find((x) => x.id === matched.id);
        if (itemQn) itemQn.stockQty = newQty;
      }
      if (data.inventoryStock["Chi nhánh 2"]) {
        const itemCn2 = data.inventoryStock["Chi nhánh 2"].find((x) => x.id === matched.id);
        if (itemCn2) itemCn2.stockQty = newQty;
      }
    }

    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const billCode = `#XK-${Date.now().toString().slice(-4)}`;
    const tx = {
      id: `tx_xuat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      ngay: today,
      thoiGian: now.toTimeString().slice(0, 5),
      loai: "xuat_dung",
      inventoryAction: "xuat",
      danhMuc: matched.name,
      tenMon: matched.name,
      ingredientId: matched.id,
      soLuong: deductQty,
      donVi: matched.unit,
      donViTinh: matched.unit,
      soTien: 0,
      phuongThuc: "tien_mat",
      chiNhanh: branch,
      ghiChu: note ? `[Trừ kho] ${note} (${billCode})` : `[Trừ kho] Xuất dùng ${matched.name} (${billCode})`,
      billCode,
      daSync: false,
      timestamp: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    data.ds = data.ds || [];
    data.ds.unshift(tx);
  }

  data.settingsVersion = Date.now();
  await luuDuLieu(data);
  return { matched, stockQty: matched?.stockQty || 0 };
}

export async function capNhatTonKhoThucTe(branchName, ingredientId, actualQty) {
  const data = await docDuLieu();
  const branch = branchName || "Kho Tổng";
  if (!data.inventoryStock) data.inventoryStock = JSON.parse(JSON.stringify(DEFAULT_DATA.inventoryStock));
  if (!data.inventoryStock[branch]) {
    data.inventoryStock[branch] = JSON.parse(JSON.stringify(DEFAULT_DATA.inventoryStock["Kho Tổng"] || DEFAULT_DATA.inventoryStock["Quán Nhà (Chính)"]));
  }

  const items = data.inventoryStock[branch];
  const matched = items.find((x) => x.id === ingredientId);
  let variance = 0;
  if (matched) {
    const oldTheoretical = Number(matched.stockQty) || 0;
    const actual = Math.max(0, Number(actualQty) || 0);
    variance = Math.round((actual - oldTheoretical) * 100) / 100;
    matched.stockQty = actual;

    if (branch === "Kho Tổng") {
      if (data.inventoryStock["Quán Nhà (Chính)"]) {
        const itemQn = data.inventoryStock["Quán Nhà (Chính)"].find((x) => x.id === ingredientId);
        if (itemQn) itemQn.stockQty = actual;
      }
      if (data.inventoryStock["Chi nhánh 2"]) {
        const itemCn2 = data.inventoryStock["Chi nhánh 2"].find((x) => x.id === ingredientId);
        if (itemCn2) itemCn2.stockQty = actual;
      }
    }
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

// ----------------------------------------------------
// QUẢN LÝ ĐỢT NHẬP MÍA & THEO DÕI TỶ LỆ SƠ CHẾ THEO LÔ
// ----------------------------------------------------

export async function taoDotNhapMia({ date, rawStalkBundles, costPerBundle = 90000, branch = "Quán Nhà (Chính)", note = "" }) {
  const data = await docDuLieu();
  if (!Array.isArray(data.sugarcaneBatches)) data.sugarcaneBatches = [];
  
  const rawQty = Math.max(1, Number(rawStalkBundles) || 1);
  const cost = Number(costPerBundle) || 90000;
  const totalCost = rawQty * cost;
  const todayStr = date || new Date().toISOString().slice(0, 10);
  const parts = todayStr.split("-");
  const code = `DOT-${parts[2] || "01"}${parts[1] || "01"}`;
  const id = `batch_${Date.now()}`;

  const newBatch = {
    id,
    date: todayStr,
    code,
    name: `Đợt mía thô ${parts.reverse().join('/')} (${rawQty} bó 12 cây dài)`,
    branch,
    rawStalkBundles: rawQty,
    costPerBundle: cost,
    totalCost,
    processedRawBundles: 0,
    remainingRawBundles: rawQty,
    yield10kgBundles: 0,
    status: "active",
    note,
    history: [],
    createdAt: new Date().toISOString(),
  };

  data.sugarcaneBatches.unshift(newBatch);
  await luuDuLieu(data);
  return newBatch;
}

export async function ghiNhanSoCheDotMia({ batchId, rawQty, yieldQty, note = "" }) {
  const data = await docDuLieu();
  if (!Array.isArray(data.sugarcaneBatches)) return null;

  let batch = data.sugarcaneBatches.find(b => b.id === batchId);
  if (!batch) {
    batch = data.sugarcaneBatches.find(b => b.status === "active");
  }
  if (!batch) return null;

  const raw = Number(rawQty) || 0;
  const yld = Number(yieldQty) || 0;

  batch.processedRawBundles = Math.round(((Number(batch.processedRawBundles) || 0) + raw) * 100) / 100;
  batch.remainingRawBundles = Math.max(0, Math.round(((Number(batch.rawStalkBundles) || 0) - batch.processedRawBundles) * 100) / 100);
  batch.yield10kgBundles = Math.round(((Number(batch.yield10kgBundles) || 0) + yld) * 100) / 100;

  if (!Array.isArray(batch.history)) batch.history = [];
  batch.history.push({
    time: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) + " " + new Date().toLocaleDateString("vi-VN"),
    rawQty: raw,
    yieldQty: yld,
    note,
  });

  if (batch.remainingRawBundles <= 0) {
    batch.status = "completed";
  }

  await luuDuLieu(data);
  return batch;
}

export async function dongDotNhapMia(batchId) {
  const data = await docDuLieu();
  if (!Array.isArray(data.sugarcaneBatches)) return null;
  const batch = data.sugarcaneBatches.find(b => b.id === batchId);
  if (batch) {
    batch.status = "completed";
    batch.closedAt = new Date().toLocaleString("vi-VN");
    await luuDuLieu(data);
  }
  return batch;
}

export async function layDotMiaDangHoatDong(branch = null) {
  const data = await docDuLieu();
  if (!Array.isArray(data.sugarcaneBatches)) return null;
  if (branch && branch !== "all") {
    return data.sugarcaneBatches.find(b => b.status === "active" && b.branch === branch)
      || data.sugarcaneBatches.find(b => b.status === "active");
  }
  return data.sugarcaneBatches.find(b => b.status === "active") || data.sugarcaneBatches[0];
}

export async function chuyenTatCaGiaoDichMua10kgThanhXuatDung() {
  const data = await docDuLieu();
  let convertedCount = 0;
  if (Array.isArray(data.ds)) {
    data.ds.forEach((item) => {
      const checkStr = (String(item.danhMuc || "") + " " + String(item.ghiChu || "")).toLowerCase();
      const isMuaMia10kg = (checkStr.includes("10kg") || checkStr.includes("10 kg")) &&
        (checkStr.includes("mía") || checkStr.includes("mia") || checkStr.includes("bó") || checkStr.includes("bo")) &&
        (item.loai === "chi" || checkStr.includes("mua") || checkStr.includes("nhập"));
      if (isMuaMia10kg && item.loai !== "xuat_dung") {
        item.loai = "xuat_dung";
        item.soTien = 0;
        item.danhMuc = "Bó mía 10kg bào sẵn (Bán hàng)";
        item.giaCostDonVi = 0;
        item.tongGiaCost = 0;
        item.daSync = false;
        convertedCount++;
      }
    });
  }
  if (convertedCount > 0) {
    await luuDuLieu(data);
  }
  return convertedCount;
}



