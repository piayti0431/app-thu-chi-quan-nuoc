import test from "node:test";
import assert from "node:assert/strict";

// Mock localStorage and window before importing db.js
global.localStorage = {
  _store: {},
  getItem(key) {
    return this._store[key] || null;
  },
  setItem(key, value) {
    this._store[key] = String(value);
  },
  removeItem(key) {
    delete this._store[key];
  },
  clear() {
    this._store = {};
  },
};

global.window = {
  location: { reload() {} },
};

const {
  docDuLieu,
  luuDuLieu,
  themGiaoDich,
  xoaGiaoDich,
  nhapKhoNguyenLieu,
  truKhoNguyenLieu,
  capNhatTonKhoThucTe,
  taoDotNhapMia,
  ghiNhanSoCheDotMia,
  DEFAULT_DATA,
} = await import("../www/js/db.js");

test("Inventory workflow: 14 default items and unified prices for both branches", async () => {
  localStorage.clear();
  const data = await docDuLieu();

  const qnStock = data.inventoryStock["Quán Nhà (Chính)"];
  const cn2Stock = data.inventoryStock["Chi nhánh 2"];

  assert.equal(qnStock.length, 14, "Quán Nhà should have 14 inventory items");
  assert.equal(cn2Stock.length, 14, "Chi nhánh 2 should have 14 inventory items");

  // Check missing items now exist in both
  assert.ok(qnStock.find((x) => x.id === "sua_dac"), "sua_dac must exist in Quán Nhà");
  assert.ok(cn2Stock.find((x) => x.id === "sua_dac"), "sua_dac must exist in Chi nhánh 2");
  assert.ok(qnStock.find((x) => x.id === "bich_t"), "bich_t must exist in Quán Nhà");
  assert.ok(cn2Stock.find((x) => x.id === "bich_t"), "bich_t must exist in Chi nhánh 2");

  // Check unified price for ice
  const daQn = qnStock.find((x) => x.id === "da_vien");
  const daCn2 = cn2Stock.find((x) => x.id === "da_vien");
  assert.equal(daQn.unitCost, 17000);
  assert.equal(daCn2.unitCost, 17000);
});

test("Inventory workflow: Nhập 50 bó mía 12 cây giá 4 triệu, sau đó xóa phiếu chi hoàn kho", async () => {
  localStorage.clear();
  let data = await docDuLieu();

  await capNhatTonKhoThucTe("Quán Nhà (Chính)", "mia_cay", 0);
  data = await docDuLieu();
  const init12 = data.inventoryStock["Quán Nhà (Chính)"].find((x) => x.id === "mia_cay").stockQty;
  assert.equal(init12, 0);

  // 1. Nhập 50 bó mía 12 cây giá 4,000,000 đ
  const rawQty = 50;
  const totalCost = 4000000;
  const billCode = "#PO-0001";

  const tx = await themGiaoDich({
    loai: "chi",
    danhMuc: "Mua mía cây",
    soTien: totalCost,
    soLuong: rawQty,
    donViTinh: "bó",
    chiNhanh: "Quán Nhà (Chính)",
    ingredientId: "mia_cay",
    inventoryAction: "nhap",
    ghiChu: `[Nhập đợt mía] Mua ${rawQty} bó mía 12 cây dài (${billCode})`,
    billCode,
  });

  await nhapKhoNguyenLieu("Quán Nhà (Chính)", "mia_cay", rawQty, totalCost / rawQty);

  data = await docDuLieu();
  const stockAfterImport = data.inventoryStock["Quán Nhà (Chính)"].find((x) => x.id === "mia_cay").stockQty;
  assert.equal(stockAfterImport, 50, "Stock should be 50 after importing 50 bundles");

  // 2. Xóa phiếu chi nhập mua (nhập sai) -> Tự động trừ lại 50 bó
  await xoaGiaoDich(tx.id);
  data = await docDuLieu();
  const stockAfterDelete = data.inventoryStock["Quán Nhà (Chính)"].find((x) => x.id === "mia_cay").stockQty;
  assert.equal(stockAfterDelete, 0, "Stock should revert to 0 after deleting purchase transaction");
});

test("Inventory workflow: Bào 4 bó 12 cây ra 60kg thành phẩm (6 bó), tồn kho tự trừ 4 còn 46, và xóa phiếu hoàn kho lại 50", async () => {
  localStorage.clear();
  await capNhatTonKhoThucTe("Quán Nhà (Chính)", "mia_cay", 50);
  await capNhatTonKhoThucTe("Quán Nhà (Chính)", "mia_10kg", 0);

  let data = await docDuLieu();
  assert.equal(data.inventoryStock["Quán Nhà (Chính)"].find((x) => x.id === "mia_cay").stockQty, 50);
  assert.equal(data.inventoryStock["Quán Nhà (Chính)"].find((x) => x.id === "mia_10kg").stockQty, 0);

  // Bào 4 bó mía 12 cây -> ra 60 kg.
  // 1 bó = 10kg => 60 kg = 6 bó thành phẩm.
  const rawQty = 4;
  const yieldKg = 60;
  const yieldQty = yieldKg / 10; // 6 bó
  const billCode = "#SC-0001";

  const tx = await themGiaoDich({
    loai: "xuat_dung",
    danhMuc: "Sơ chế mía 10kg",
    soTien: 0,
    soLuong: yieldQty,
    donViTinh: `bó (${yieldKg} kg)`,
    chiNhanh: "Quán Nhà (Chính)",
    ingredientId: "mia_10kg",
    inventoryAction: "soche",
    rawQty: rawQty,
    yieldQty: yieldQty,
    yieldKg: yieldKg,
    ghiChu: `[Sơ chế] Bào ${rawQty} bó 12 cây -> thu ${yieldKg} kg (${yieldQty} bó 10kg) (${billCode})`,
    billCode,
  });

  await nhapKhoNguyenLieu("Quán Nhà (Chính)", "mia_cay", -rawQty, 90000);
  await nhapKhoNguyenLieu("Quán Nhà (Chính)", "mia_10kg", yieldQty, 0);

  data = await docDuLieu();
  const stock12After = data.inventoryStock["Quán Nhà (Chính)"].find((x) => x.id === "mia_cay").stockQty;
  const stock10After = data.inventoryStock["Quán Nhà (Chính)"].find((x) => x.id === "mia_10kg").stockQty;

  assert.equal(stock12After, 46, "Mía 12 cây phải còn 46 bó");
  assert.equal(stock10After, 6, "Mía sạch 10kg phải là 6 bó (60 kg)");

  // Xóa giao dịch sơ chế -> Hoàn trả: mía 12 cây +4 (thành 50), mía sạch -6 (thành 0)
  await xoaGiaoDich(tx.id);
  data = await docDuLieu();
  const stock12Rollback = data.inventoryStock["Quán Nhà (Chính)"].find((x) => x.id === "mia_cay").stockQty;
  const stock10Rollback = data.inventoryStock["Quán Nhà (Chính)"].find((x) => x.id === "mia_10kg").stockQty;

  assert.equal(stock12Rollback, 50, "Mía 12 cây phải được hoàn lại 50 bó sau khi xóa");
  assert.equal(stock10Rollback, 0, "Mía sạch 10kg phải trừ lại về 0 sau khi xóa");
});

test("Inventory workflow: Điều chuyển mía 10kg từ Quán Nhà sang CN2, xóa phiếu hoàn kho cả 2 chi nhánh", async () => {
  localStorage.clear();
  await capNhatTonKhoThucTe("Quán Nhà (Chính)", "mia_10kg", 10);
  await capNhatTonKhoThucTe("Chi nhánh 2", "mia_10kg", 2);

  // Xuất 2 bó 10kg sang CN2
  const transferQty = 2;
  const billCode = "#DC-0001";
  const tx = await themGiaoDich({
    loai: "xuat_dung",
    danhMuc: "Xuất mía sang chi nhánh",
    soTien: 0,
    soLuong: transferQty,
    donViTinh: `bó (${transferQty * 10} kg)`,
    chiNhanh: "Quán Nhà (Chính)",
    sourceBranch: "Quán Nhà (Chính)",
    targetBranch: "Chi nhánh 2",
    ingredientId: "mia_10kg",
    inventoryAction: "transfer",
    ghiChu: `[Điều chuyển] Xuất ${transferQty} bó mía 10kg để bán ở Chi nhánh 2 (${billCode})`,
    billCode,
  });

  await nhapKhoNguyenLieu("Quán Nhà (Chính)", "mia_10kg", -transferQty, 0);
  await nhapKhoNguyenLieu("Chi nhánh 2", "mia_10kg", transferQty, 0);

  let data = await docDuLieu();
  assert.equal(data.inventoryStock["Quán Nhà (Chính)"].find((x) => x.id === "mia_10kg").stockQty, 8);
  assert.equal(data.inventoryStock["Chi nhánh 2"].find((x) => x.id === "mia_10kg").stockQty, 4);

  // Xóa giao dịch điều chuyển -> Quán Nhà +2 (thành 10), CN2 -2 (thành 2)
  await xoaGiaoDich(tx.id);
  data = await docDuLieu();
  assert.equal(data.inventoryStock["Quán Nhà (Chính)"].find((x) => x.id === "mia_10kg").stockQty, 10);
  assert.equal(data.inventoryStock["Chi nhánh 2"].find((x) => x.id === "mia_10kg").stockQty, 2);
});

test("Inventory workflow: Xuất dùng đá tại Chi nhánh 2, xóa phiếu hoàn kho Chi nhánh 2", async () => {
  localStorage.clear();
  await capNhatTonKhoThucTe("Chi nhánh 2", "da_vien", 10);

  const billCode = "#XK-0002";
  const tx = await themGiaoDich({
    loai: "xuat_dung",
    danhMuc: "Đá viên",
    soTien: 0,
    soLuong: 3,
    donViTinh: "bao",
    chiNhanh: "Chi nhánh 2",
    ingredientId: "da_vien",
    inventoryAction: "xuat",
    ghiChu: `[Pha chế bán hàng] Lấy 3 bao Đá viên ra quầy phục vụ (${billCode})`,
    billCode,
  });

  await nhapKhoNguyenLieu("Chi nhánh 2", "da_vien", -3, 17000);

  let data = await docDuLieu();
  assert.equal(data.inventoryStock["Chi nhánh 2"].find((x) => x.id === "da_vien").stockQty, 7);

  // Xóa phiếu xuất dùng -> Chi nhánh 2 được hoàn lại 3 bao đá (thành 10)
  await xoaGiaoDich(tx.id);
  data = await docDuLieu();
  assert.equal(data.inventoryStock["Chi nhánh 2"].find((x) => x.id === "da_vien").stockQty, 10);
});

test("Inventory workflow: POS bán nước không tự động trừ lẻ nguyên liệu ảo", async () => {
  localStorage.clear();
  await capNhatTonKhoThucTe("Quán Nhà (Chính)", "mia_10kg", 10);
  await capNhatTonKhoThucTe("Quán Nhà (Chính)", "da_vien", 5);

  // Bán 10 ly nước mía
  await themGiaoDich({
    loai: "thu",
    danhMuc: "Nước mía thường",
    soTien: 70000,
    soLuong: 10,
    donViTinh: "ly",
    chiNhanh: "Quán Nhà (Chính)",
    productId: "nuoc_mia",
  });

  const data = await docDuLieu();
  assert.equal(data.inventoryStock["Quán Nhà (Chính)"].find((x) => x.id === "mia_10kg").stockQty, 10, "Mía sạch không bị trừ lẻ khi bán ly");
  assert.equal(data.inventoryStock["Quán Nhà (Chính)"].find((x) => x.id === "da_vien").stockQty, 5, "Đá không bị trừ lẻ khi bán ly");
});

test("Inventory workflow: Trừ kho trực tiếp trên Kho Tổng, đồng bộ chi nhánh và xóa hoàn tác", async () => {
  localStorage.clear();
  await capNhatTonKhoThucTe("Kho Tổng", "mia_10kg", 20);

  let data = await docDuLieu();
  assert.equal(data.inventoryStock["Kho Tổng"].find((x) => x.id === "mia_10kg").stockQty, 20);
  assert.equal(data.inventoryStock["Quán Nhà (Chính)"].find((x) => x.id === "mia_10kg").stockQty, 20);
  assert.equal(data.inventoryStock["Chi nhánh 2"].find((x) => x.id === "mia_10kg").stockQty, 20);

  // 1. Trừ 5 bó mía 10kg khỏi Kho Tổng
  const res = await truKhoNguyenLieu("Kho Tổng", "mia_10kg", 5, "Xuất quầy bán buổi sáng");
  assert.equal(res.stockQty, 15);

  data = await docDuLieu();
  assert.equal(data.inventoryStock["Kho Tổng"].find((x) => x.id === "mia_10kg").stockQty, 15);
  assert.equal(data.inventoryStock["Quán Nhà (Chính)"].find((x) => x.id === "mia_10kg").stockQty, 15);
  assert.equal(data.inventoryStock["Chi nhánh 2"].find((x) => x.id === "mia_10kg").stockQty, 15);

  // Giao dịch xuất dùng được tạo trong ds
  const lastTx = data.ds[0];
  assert.equal(lastTx.loai, "xuat_dung");
  assert.equal(lastTx.soLuong, 5);
  assert.equal(lastTx.chiNhanh, "Kho Tổng");

  // 2. Xóa giao dịch xuất dùng -> Hoàn trả lại 5 bó thành 20
  await xoaGiaoDich(lastTx.id);
  data = await docDuLieu();
  assert.equal(data.inventoryStock["Kho Tổng"].find((x) => x.id === "mia_10kg").stockQty, 20);
  assert.equal(data.inventoryStock["Quán Nhà (Chính)"].find((x) => x.id === "mia_10kg").stockQty, 20);
  assert.equal(data.inventoryStock["Chi nhánh 2"].find((x) => x.id === "mia_10kg").stockQty, 20);
});

