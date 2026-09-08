# 📦 TÀI LIỆU BÀN GIAO DỰ ÁN: ỨNG DỤNG QUẢN LÝ THU CHI & VẬN HÀNH QUÁN NƯỚC
*(Dành cho Developer / Kỹ sư tiếp quản phát triển tiếp)*

---

## 1. TỔNG QUAN DỰ ÁN & BÀI TOÁN KINH DOANH
- **Tên dự án:** Ứng dụng Thu Chi & Quản Lý Vận Hành Quán Nước (App Thu Chi Quán Nước).
- **Loại hình kinh doanh:** Chuỗi 2 quán nước mía, trà tắc, rau má đậu xanh, nước ép hoa quả...
  - **Điểm 1 (Quán chính):** `Quán Nhà (Chính)` - Nhà ở của chủ quán, không tốn tiền thuê mặt bằng.
  - **Điểm 2 (Chi nhánh):** `Chi nhánh 2` - Thuê mặt bằng 6.000.000 đ/tháng (200.000 đ/ngày) + điện nước ~40.000 đ/ngày.
- **Mục tiêu cốt lõi:**
  1. Ghi nhận doanh thu bán nước siêu tốc 1 chạm (POS) cho nhân viên.
  2. Quản lý minh bạch dòng tiền: Tiền mặt trong két, Tiền chuyển khoản ngân hàng QR (có Loa AI đọc thành tiếng).
  3. Cơ chế phân bổ **4 Hũ Tiền (The 4 Jars System)** để chủ quán không bao giờ bị thâm hụt vốn hay nợ tiền nhà.
  4. Quản lý sản xuất & tồn kho **Mía tự cung tự cấp 3 mắt xích** và theo dõi theo từng **Đợt / Lô nhập mía**.

---

## 2. KIẾN TRÚC KỸ THUẬT (TECH STACK)
- **Frontend:**
  - HTML5 SPA + CSS3 Variables (Giao diện chuẩn Mobile-first, responsive đa nền tảng).
  - Vanilla JavaScript ES6 Modules (`import` / `export`, không dùng framework cồng kềnh, tốc độ tải trang tức thì).
  - Biểu đồ: `Chart.js` (Biểu đồ doanh thu, cơ cấu thu chi theo ngày/tuần/tháng).
- **Backend & Cơ Sở Dữ Liệu:**
  - **Supabase PostgreSQL:** Bảng `giao_dich`, `daily_closings`, `branches`.
  - **Offline-first Architecture:** Toàn bộ dữ liệu lưu trữ tại `localStorage` và đồng bộ 2 chiều ngầm qua Supabase Realtime & REST API. Quán mất mạng internet vẫn bán hàng và chốt ca bình thường; có mạng app tự đẩy đồng bộ lên mây.
- **Mobile Packaging:**
  - Hỗ trợ đóng gói ứng dụng Android qua **Capacitor** (`@capacitor/core`, `@capacitor/preferences`).
  - Hỗ trợ cài đặt như Web App (PWA).
- **Deployment & Hosting:**
  - Đang chạy Production chính thức trên **Vercel**: `https://app-thu-chi-quan-nuoc.vercel.app`
  - Lệnh deploy prebuilt: `npx vercel build --prod --yes && npx vercel deploy --prebuilt --prod --yes`

---

## 3. CÁC QUY TẮC NGHIỆP VỤ & KỸ THUẬT BẮT BUỘC (CRITICAL RULES)

### ⚠️ Quy tắc 1: Check Constraint của Supabase trên cột `loai`
- Cơ sở dữ liệu Supabase có ràng buộc: `giao_dich_loai_check CHECK (loai IN ('thu', 'chi'))`.
- Nhưng hệ thống nghiệp vụ có loại phiếu xuất kho/nội bộ: `loai === 'xuat_dung'` (0 đ phát sinh).
- **Giải pháp bắt buộc (trong `www/js/sync-model.js`):**
  - Khi gửi lên Supabase (`toRemoteTransaction`): Gán `loai = 'chi'`, `so_tien = 0`, và đính kèm `[EXT:{"loai":"xuat_dung",...}]` vào cuối ghi chú.
  - Khi tải từ Supabase về (`fromRemoteTransaction`): Đọc payload `[EXT:...]` và giải nén lại thành `loai = 'xuat_dung'`.
  - **TUYỆT ĐỐI KHÔNG** gửi thẳng `loai: 'xuat_dung'` lên Supabase nếu không sẽ bị lỗi SQL constraint violation!

### ⚠️ Quy tắc 2: POS Bán Nước KHÔNG tự động trừ lẻ nguyên liệu tồn kho
- Khi nhân viên chạm bán 1 ly nước trên màn hình POS:
  - Chỉ ghi nhận: **Doanh thu, phương thức thanh toán (tiền mặt / chuyển khoản), tăng số dư quỹ**.
  - **KHÔNG** tự động trừ 0.03 bao đá hay 0.33kg mía.
  - **Lý do:** Quán xuất nguyên liệu theo đợt lớn (1 bao đá đổ thùng xài cả ngày, 1 bó mía 10kg mang ra ép 25-30 ly). Nếu vừa trừ đợt lớn vừa trừ lẻ từng ly thì tồn kho sẽ bị trừ 2 lần (double deduction)!

### ⚠️ Quy tắc 3: Windows CRLF Line Endings
- Hệ thống phát triển trên Windows (`CRLF`).
- Khi viết script tự động sửa file trong `www/js/`, luôn dùng `.replace(/\r\n/g, '\n')` hoặc Regex linh hoạt để tránh lỗi không tìm thấy chuỗi target.

---

## 4. CHI TIẾT NGHIỆP VỤ MÍA TỰ CUNG TỰ CẤP & QUẢN LÝ THEO ĐỢT (MỚI NHẤT)

### Chuỗi 3 mắt xích:
1. **Mắt xích 1 - Nhập mía cây thô:**
   - Quán mua từ vựa về theo **Bó 12 cây dài thô** (`ing_mia_bo`, inventory `mia_cay`).
   - Giá vốn: $90.000\text{ đ/bó}$. Thao tác ghi chi tiền và tăng tồn kho bó 12 cây.
2. **Mắt xích 2 - Sơ chế bào vỏ ra Bó 10kg:**
   - Quán tự bào sạch vỏ mía, chặt khúc rồi bó thành từng **Bó mía 10kg bào sạch** (`ing_mia_bo_10kg`, inventory `mia_10kg`).
   - Tỷ lệ sơ chế thực tế linh hoạt theo từng đợt mía: `1 bó 12 cây ➔ 2.5 đến 3.5 bó 10kg sạch`.
   - Ghi nhận: Trừ kho `mia_cay`, cộng kho `mia_10kg`, chi phí $0\text{ đ}$.
3. **Mắt xích 3 - Xuất bán tại quầy & Điều chuyển chi nhánh:**
   - Bán tại quầy: Xuất từng bó 10kg ra quầy ép nước (~25-30 ly/bó).
   - Xuất sang CN2: Bấm nút `🚚 Xuất Mía Sang CN2` (Trừ kho Quán Nhà, tăng kho CN2).
   - Cuối ngày chốt ca: Bấm nút `🌙 Kiểm Kê Mía Dư` (Ghi nhận CN2 còn dư bao nhiêu ly hoặc ký chuyển sang mai).

### Quản lý theo Đợt / Lô nhập mía (Batch & Yield Tracking):
- Dữ liệu lưu tại mảng `state.sugarcaneBatches`.
- **Khai báo đợt mới:** Nhập 20 bó 12 cây dài ➔ Mở mã lô `DOT-DDMM` (trạng thái `active`).
- **Từng lần bào:** Mỗi lần bấm bào mía (ca sáng, ca chiều...) hệ thống tự động ghi nhật ký vào đợt đang mở.
- **Tổng kết đợt:** Khi bào hết, hệ thống tổng kết: Đợt nhập 20 bó 12 cây ➔ thu được 58 bó 10kg sạch (Hiệu suất 1 ➔ 2.9 bó), tính giá vốn thành phẩm thực tế trên mỗi bó 10kg.

---

## 5. CẤU TRÚC THƯ MỤC & CÁC FILE TRỌNG YẾU

```
D:/localhost/app-thu-chi-quan-nuoc/
├── www/
│   ├── index.html            # Giao diện chính (POS, Sổ quỹ, 4 Hũ tiền, Báo cáo, Quản lý NVL)
│   ├── css/
│   │   ├── style.css         # Toàn bộ CSS giao diện, mobile responsive, themes
│   │   ├── components.css    # Style các component độc lập
│   │   └── fonts.css         # Font chữ tối ưu hiển thị số tiền
│   ├── js/
│   │   ├── app.js            # Controller chính (~6.700 dòng): Xử lý toàn bộ UI, event, modals
│   │   ├── db.js             # Data Layer (~2.400 dòng): DEFAULT_DATA, mergeData, tính toán kho, lô mía
│   │   ├── sync-model.js     # Đồng bộ Supabase, adapter pack/unpack [EXT:...]
│   │   ├── report.js         # Tính toán báo cáo EV, phân tích 4 hũ tiền, P&L
│   │   ├── parser.js         # Bộ phân tích giọng nói tiếng Việt nhập nhanh
│   │   ├── speech.js         # Loa AI thông báo chuyển khoản & nhận diện giọng nói
│   │   └── logic/
│   │       ├── inventory.js  # Nghiệp vụ quản lý kho, nhập/xuất/kiểm kê
│   │       └── tax.js        # Báo cáo thuế khoán hộ kinh doanh cá thể mẫu 01/CNKD
│   └── assets/
│       ├── ingredients/      # Ảnh thực tế 13 nguyên liệu (bo_mia_10kg.jpg, bo_mia_12_cay.jpg...)
│       └── menu/             # Ảnh các món nước (nuoc_mia.jpg, tra_da.jpg, tra_tac.jpg...)
├── tests/                    # Bộ kiểm thử tự động Node.js
│   ├── test-sugarcane-workflow.test.mjs  # Test 3 mắt xích & Lô mía
│   ├── test-xuat-dung.test.mjs           # Test xuất dùng, Supabase packing, hoàn kho khi xóa
│   ├── test-quick-ingredients.test.mjs   # Test nguyên liệu, ảnh fallback
│   └── test-jars-tab.test.mjs            # Test phân bổ 4 hũ tiền
└── package.json
```

---

## 6. HƯỚNG DẪN DÀNH CHO DEVELOPER MỚI VÀO LÀM TIẾP

### Bước 1: Khởi động & Kiểm tra dự án
1. Mở thư mục: `D:/localhost/app-thu-chi-quan-nuoc`
2. Chạy test suite để đảm bảo mã nguồn hiện tại đạt 100%:
   ```bash
   node tests/test-sugarcane-workflow.test.mjs
   node tests/test-xuat-dung.test.mjs
   node tests/test-quick-ingredients.test.mjs
   node tests/test-jars-tab.test.mjs
   ```
3. Kiểm tra cú pháp JavaScript:
   ```bash
   node -c www/js/app.js
   node -c www/js/db.js
   ```

### Bước 2: Deploy lên Vercel sau khi sửa code
```bash
npx vercel build --prod --yes
npx vercel deploy --prebuilt --prod --yes
```
Trang production sẽ cập nhật tại: `https://app-thu-chi-quan-nuoc.vercel.app`

---
> 💡 *Chi tiết toàn bộ từng câu hỏi của chủ quán và từng giải pháp đã làm trong suốt dự án được lưu đầy đủ tại file: `TOAN_BO_LICH_SU_CHAT_SESSION.md` nằm cùng thư mục Downloads này.*
