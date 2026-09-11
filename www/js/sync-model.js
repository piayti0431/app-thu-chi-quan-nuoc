export function normalizeTransactionId(id) {
  if (typeof id === "number" && Number.isSafeInteger(id) && id > 0) {
    return id;
  }
  const str = String(id || "").trim();
  if (/^\d+$/.test(str)) {
    const num = Number(str);
    if (Number.isSafeInteger(num) && num > 0) return num;
  }
  const match = str.match(/\d{10,16}/);
  if (match) {
    const extracted = Number(match[0]);
    if (Number.isSafeInteger(extracted) && extracted > 0) {
      if (extracted < 1e14) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
          hash = (hash * 31 + str.charCodeAt(i)) % 1000;
        }
        return extracted * 1000 + Math.abs(hash);
      }
      return extracted;
    }
  }
  return Date.now() * 1000 + Math.floor(Math.random() * 1000);
}

export function toBaseRemoteTransaction(item, deviceId = "local", userId = "") {
  const realLoai = item.loai;
  const isSpecialLoai = realLoai && realLoai !== 'thu' && realLoai !== 'chi';
  const dbLoai = isSpecialLoai ? 'chi' : realLoai;

  const extMeta = {
    cn: item.chiNhanh,
    sl: item.soLuong,
    dvt: item.donViTinh,
    pt: item.phuongThuc,
    ntc: item.nguonTienChi,
    gc: item.giaCostDonVi,
    tgc: item.tongGiaCost,
  };
  
  if (isSpecialLoai) {
    extMeta.loai = realLoai;
    if (item.fund) extMeta.fund = item.fund;
    if (item.type) extMeta.type = item.type;
    if (item.refId) extMeta.refId = item.refId;
  }

  const realSoTien = Number(item.soTien) || 0;
  // Supabase check constraint: check (so_tien > 0).
  // Giao dịch 0đ (như xuất dùng 0đ) lưu so_tien = 1 trên DB và lưu st: realSoTien trong extMeta
  const dbSoTien = realSoTien > 0 ? realSoTien : 1;
  if (realSoTien <= 0) {
    extMeta.st = realSoTien;
  }

  const cleanGhiChu = String(item.ghiChu || "").replace(/\s*\[EXT:.*?\]\s*/g, "").trim();
  const packedGhiChu = cleanGhiChu
    ? `${cleanGhiChu} [EXT:${JSON.stringify(extMeta)}]`
    : `[EXT:${JSON.stringify(extMeta)}]`;

  const payload = {
    id: normalizeTransactionId(item.id),
    device_id: item.deviceId || deviceId,
    ngay: item.ngay,
    gio: item.gio,
    loai: dbLoai,
    so_tien: dbSoTien,
    danh_muc: item.danhMuc || "",
    ghi_chu: packedGhiChu,
    cau_noi_goc: item.cauNoiGoc || "",
    da_sua_tay: Boolean(item.daSuaTay),
    deleted: Boolean(item.deleted),
    updated_at: item.updatedAt || new Date().toISOString(),
  };
  if (userId) payload.user_id = userId;
  return payload;
}

export function toRemoteTransaction(item, deviceId = "local", useExtended = true, userId = "") {
  if (!useExtended) return toBaseRemoteTransaction(item, deviceId, userId);
  
  const realLoai = item.loai;
  const isSpecialLoai = realLoai && realLoai !== 'thu' && realLoai !== 'chi';
  const dbLoai = isSpecialLoai ? 'chi' : realLoai;

  const extMeta = {};
  if (item.nguonTienChi) extMeta.ntc = item.nguonTienChi;
  if (isSpecialLoai) {
    extMeta.loai = realLoai;
    if (item.fund) extMeta.fund = item.fund;
    if (item.type) extMeta.type = item.type;
    if (item.refId) extMeta.refId = item.refId;
  }

  const realSoTien = Number(item.soTien) || 0;
  // Supabase check constraint: check (so_tien > 0).
  // Giao dịch 0đ (như xuất dùng 0đ) lưu so_tien = 1 trên DB và lưu st: realSoTien trong extMeta
  const dbSoTien = realSoTien > 0 ? realSoTien : 1;
  if (realSoTien <= 0) {
    extMeta.st = realSoTien;
  }
  
  const cleanGhiChu = String(item.ghiChu || "").replace(/\s*\[EXT:.*?\]\s*/g, "").trim();
  const packedGhiChu = Object.keys(extMeta).length > 0
    ? (cleanGhiChu ? `${cleanGhiChu} [EXT:${JSON.stringify(extMeta)}]` : `[EXT:${JSON.stringify(extMeta)}]`)
    : cleanGhiChu;

  const payload = {
    id: normalizeTransactionId(item.id),
    device_id: item.deviceId || deviceId,
    ngay: item.ngay,
    gio: item.gio,
    loai: dbLoai,
    so_tien: dbSoTien,
    danh_muc: item.danhMuc || "",
    ghi_chu: packedGhiChu,
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
  if (userId) payload.user_id = userId;
  return payload;
}

export function fromRemoteTransaction(row) {
  let ghiChu = row.ghi_chu || "";
  let extMeta = {};

  if (typeof ghiChu === "string" && ghiChu.includes("[EXT:")) {
    const match = ghiChu.match(/\[EXT:(.*?)\]/);
    if (match) {
      try {
        extMeta = JSON.parse(match[1]) || {};
        ghiChu = ghiChu.replace(/\s*\[EXT:.*?\]\s*/g, "").trim();
      } catch {}
    }
  }

  const chiNhanh = row.chi_nhanh || extMeta.cn || "Quán Nhà (Chính)";
  const soLuong = Number(row.so_luong) || Number(extMeta.sl) || 1;
  const donViTinh = String(row.don_vi_tinh || extMeta.dvt || (row.loai === "thu" ? "ly" : "kg"));
  const phuongThuc = String(row.phuong_thuc || extMeta.pt || "tien_mat");
  const nguonTienChi = extMeta.ntc;
  const giaCostDonVi = Number(row.gia_cost_don_vi) || Number(extMeta.gc) || 0;
  const tongGiaCost = Number(row.tong_gia_cost) || Number(extMeta.tgc) || 0;
  
  const loai = extMeta.loai || row.loai;
  const soTien = extMeta.st !== undefined
    ? Number(extMeta.st)
    : (loai === 'xuat_dung' ? 0 : (Number(row.so_tien) || 0));

  const result = {
    id: normalizeTransactionId(row.id),
    ngay: String(row.ngay || ""),
    gio: row.gio || "",
    loai: loai,
    soTien,
    danhMuc: row.danh_muc || "",
    ghiChu,
    cauNoiGoc: row.cau_noi_goc || "",
    daSuaTay: Boolean(row.da_sua_tay),
    chiNhanh,
    soLuong,
    donViTinh,
    phuongThuc,
    nguonTienChi,
    giaCostDonVi,
    tongGiaCost,
    daSync: true,
    deleted: Boolean(row.deleted),
    updatedAt: row.updated_at || new Date().toISOString(),
    deviceId: row.device_id || "",
  };
  
  if (extMeta.fund) result.fund = extMeta.fund;
  if (extMeta.type) result.type = extMeta.type;
  if (extMeta.refId) result.refId = extMeta.refId;
  
  return result;
}

function timeValue(value) {
  const time = Date.parse(value || "");
  return Number.isFinite(time) ? time : 0;
}

function isRemoteNewer(localItem, remoteItem) {
  return timeValue(remoteItem.updatedAt) > timeValue(localItem.updatedAt);
}

export function isSettingsRow(rowOrItem) {
  if (!rowOrItem) return false;
  const id = normalizeTransactionId(rowOrItem.id);
  const loai = rowOrItem.loai || rowOrItem.loai_giao_dich;
  const danhMuc = rowOrItem.danhMuc || rowOrItem.danh_muc;
  const ghiChu = rowOrItem.ghiChu || rowOrItem.ghi_chu || "";
  return (
    id === 9000000000000000 ||
    loai === "sys_settings" ||
    danhMuc === "APP_SETTINGS" ||
    (typeof ghiChu === "string" && ghiChu.startsWith('{"version":'))
  );
}

export function mergeTransactions(localItems = [], remoteRows = []) {
  const byId = new Map();
  let pulled = 0;
  let removed = 0;
  let conflictsKeptLocal = 0;

  for (const item of localItems) {
    if (!isSettingsRow(item)) {
      const normalizedId = normalizeTransactionId(item.id);
      byId.set(normalizedId, { ...item, id: normalizedId });
    }
  }

  for (const row of remoteRows) {
    if (isSettingsRow(row)) continue;
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
      .filter((item) => !item.deleted && !isSettingsRow(item))
      .sort((a, b) => {
        const dateCompare = String(b.ngay || "").localeCompare(String(a.ngay || ""));
        if (dateCompare) return dateCompare;
        return String(b.gio || "").localeCompare(String(a.gio || ""));
      }),
    stats: { pulled, removed, conflictsKeptLocal },
  };
}

export function pendingTransactions(items = []) {
  return items
    .filter((item) => !isSettingsRow(item) && (!item.daSync || item.deleted))
    .map((item) => ({ ...item, id: normalizeTransactionId(item.id) }));
}
