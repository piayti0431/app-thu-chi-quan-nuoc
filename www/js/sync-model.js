export function toRemoteTransaction(item, deviceId = "local") {
  return {
    id: item.id,
    device_id: item.deviceId || deviceId,
    ngay: item.ngay,
    gio: item.gio,
    loai: item.loai,
    so_tien: Number(item.soTien) || 0,
    danh_muc: item.danhMuc || "",
    ghi_chu: item.ghiChu || "",
    cau_noi_goc: item.cauNoiGoc || "",
    da_sua_tay: Boolean(item.daSuaTay),
    chi_nhanh: item.chiNhanh || "Quán Nhà (Chính)",
    so_luong: Number(item.soLuong) || 1,
    don_vi_tinh: String(item.donViTinh || (item.loai === "thu" ? "ly" : "kg")),
    phuong_thuc: String(item.phuongThuc || "tien_mat"),
    gia_cost_don_vi: Number(item.giaCostDonVi) || 0,
    tong_gia_cost: Number(item.tongGiaCost) || 0,
    deleted: Boolean(item.deleted),
    updated_at: item.updatedAt || new Date().toISOString(),
  };
}

export function fromRemoteTransaction(row) {
  return {
    id: Number(row.id),
    ngay: String(row.ngay || ""),
    gio: row.gio || "",
    loai: row.loai,
    soTien: Number(row.so_tien) || 0,
    danhMuc: row.danh_muc || "",
    ghiChu: row.ghi_chu || "",
    cauNoiGoc: row.cau_noi_goc || "",
    daSuaTay: Boolean(row.da_sua_tay),
    chiNhanh: row.chi_nhanh || "Quán Nhà (Chính)",
    soLuong: Number(row.so_luong) || 1,
    donViTinh: String(row.don_vi_tinh || (row.loai === "thu" ? "ly" : "kg")),
    phuongThuc: String(row.phuong_thuc || "tien_mat"),
    giaCostDonVi: Number(row.gia_cost_don_vi) || 0,
    tongGiaCost: Number(row.tong_gia_cost) || 0,
    daSync: true,
    deleted: Boolean(row.deleted),
    updatedAt: row.updated_at || new Date().toISOString(),
    deviceId: row.device_id || "",
  };
}

function timeValue(value) {
  const time = Date.parse(value || "");
  return Number.isFinite(time) ? time : 0;
}

function isRemoteNewer(localItem, remoteItem) {
  return timeValue(remoteItem.updatedAt) > timeValue(localItem.updatedAt);
}

export function mergeTransactions(localItems = [], remoteRows = []) {
  const byId = new Map();
  let pulled = 0;
  let removed = 0;
  let conflictsKeptLocal = 0;

  for (const item of localItems) {
    byId.set(Number(item.id), { ...item });
  }

  for (const row of remoteRows) {
    const remote = fromRemoteTransaction(row);
    const local = byId.get(remote.id);

    if (!local) {
      if (remote.deleted) {
        removed += 1;
        continue;
      }
      byId.set(remote.id, remote);
      pulled += 1;
      continue;
    }

    if (!local.daSync && !isRemoteNewer(local, remote)) {
      conflictsKeptLocal += 1;
      continue;
    }

    if (remote.deleted) {
      byId.delete(remote.id);
      removed += 1;
      continue;
    }

    byId.set(remote.id, remote);
    if (isRemoteNewer(local, remote) || local.deleted) pulled += 1;
  }

  return {
    items: [...byId.values()]
      .filter((item) => !item.deleted)
      .sort((a, b) => {
        const dateCompare = String(b.ngay || "").localeCompare(String(a.ngay || ""));
        if (dateCompare) return dateCompare;
        return String(b.gio || "").localeCompare(String(a.gio || ""));
      }),
    stats: { pulled, removed, conflictsKeptLocal },
  };
}

export function pendingTransactions(items = []) {
  return items.filter((item) => !item.daSync || item.deleted);
}
