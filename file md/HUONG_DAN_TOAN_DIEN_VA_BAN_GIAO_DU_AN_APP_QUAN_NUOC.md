# 📘 BẢNG HƯỚNG DẪN TOÀN DIỆN & TÀI LIỆU BÀN GIAO DỰ ÁN
## HỆ THỐNG QUẢN LÝ THU CHI, TỒN KHO & VẬN HÀNH CHUỖI QUÁN NƯỚC (APP THU CHI QUÁN NƯỚC)

> **Dành cho:** Kỹ sư phần mềm / Developer / Quản lý tiếp quản dự án  
> **Thời gian bàn giao:** 03/09/2026  
> **Mã nguồn:** `D:/localhost/app-thu-chi-quan-nuoc`  
> **Production URL:** [https://app-thu-chi-quan-nuoc.vercel.app](https://app-thu-chi-quan-nuoc.vercel.app)  

---

## MỤC LỤC TỔNG QUAN

1. [TỔNG QUAN BÀI TOÁN KINH DOANH & TƯ TƯỞNG CỦA CHỦ QUÁN](#1-tổng-quan-bài-toán-kinh-doanh--tư-tưởng-của-chủ-quán)
2. [CẤU TRÚC ỨNG DỤNG (APP STRUCTURE & TẤT CẢ CÁC TAB CÓ GÌ)](#2-cấu-trúc-ứng-dụng-app-structure--tất-cả-các-tab-có-gì)
3. [VẬN HÀNH NHƯ THẾ NÀO (OPERATIONAL WORKFLOWS THỰC CHIẾN)](#3-vận-hành-như-thế-nào-operational-workflows-thực-chiến)
   - [3.1. Bán hàng tại quầy (POS 1 Chạm & Loa AI QR)](#31-bán-hàng-tại-quầy-pos-1-chạm--loa-ai-qr)
   - [3.2. Hệ thống phân bổ 4 Hũ Tiền (The 4 Jars System)](#32-hệ-thống-phân-bổ-4-hũ-tiền-the-4-jars-system)
   - [3.3. Quy trình Mía tự cung tự cấp 3 mắt xích & Lô đợt](#33-quy-trình-mía-tự-cung-tự-cấp-3-mắt-xích--lô-đợt)
   - [3.4. Xuất hàng sang Chi nhánh 2 & Kiểm kê mía dư cuối ngày](#34-xuất-hàng-sang-chi-nhánh-2--kiểm-kê-mía-dư-cuối-ngày)
   - [3.5. Chốt két & Chốt ca cuối ngày](#35-chốt-két--chốt-ca-cuối-ngày)
4. [ĐÃ TỪNG LÀM NHỮNG GÌ (LỊCH SỬ TIẾN HÓA & CÁC SỰ CỐ ĐÃ XỬ LÝ)](#4-đã-từng-làm-những-gì-lịch-sử-tiến-hóa--các-sự-cố-đã-xử-lý)
5. [CƠ CHẾ KỸ THUẬT NỘI BỘ (TECHNICAL INTERNALS & ARCHITECTURE)](#5-cơ-chế-kỹ-thuật-nội-bộ-technical-internals--architecture)
   - [5.1. Cấu trúc mã nguồn chi tiết](#51-cấu-trúc-mã-nguồn-chi-tiết)
   - [5.2. Offline-First & Supabase Sync Engine](#52-offline-first--supabase-sync-engine)
   - [5.3. Xử lý Check Constraint Supabase bằng payload [EXT:...]](#53-xử-lý-check-constraint-supabase-bằng-payload-ext)
   - [5.4. Thuật toán tự động hoàn kho khi xóa giao dịch](#54-thuật-toán-tự-động-hoàn-kho-khi-xóa-giao-dịch)
6. [HƯỚNG DẪN DÀNH CHO DEVELOPER TIẾP QUẢN (HOW-TO & MAINTAIN)](#6-hướng-dẫn-dành-cho-developer-tiếp-quản-how-to--maintain)
   - [6.1. Cách chạy kiểm thử tự động (Unit Tests)](#61-cách-chạy-kiểm-thử-tự-động-unit-tests)
   - [6.2. Cách build & deploy lên Vercel](#62-cách-build--deploy-lên-vercel)
   - [6.3. Cách thêm món nước / thêm nguyên liệu mới](#63-cách-thêm-món-nước--thêm-nguyên-liệu-mới)
   - [6.4. BẢNG NHỮNG ĐIỀU TUYỆT ĐỐI KHÔNG ĐƯỢC PHÁ VỠ (CRITICAL DONTS)](#64-bảng-những-điều-tuyệt-đối-không-được-phá-vỡ-critical-donts)

---

## 1. TỔNG QUAN BÀI TOÁN KINH DOANH & TƯ TƯỞNG CỦA CHỦ QUÁN

### 1.1. Mô hình chuỗi 2 điểm bán:
Quán kinh doanh nước mía siêu sạch, mía sầu riêng, nước mía tắc, rau má đậu xanh, nước ép cam, thơm, trà tắc, trà đá...
Hệ thống gồm 2 chi nhánh có bài toán chi phí hoàn toàn khác nhau:
1. **🏠 Quán Nhà (Chính):**
   - Đặt tại nhà của chủ quán ➔ **Tiền thuê mặt bằng = 0 đ**.
   - Đóng vai trò là **Kho Tổng / Trung Tâm Sơ Chế Mía**: Xe mía thô từ vựa giao về đây, quán tự bào vỏ, chặt khúc, rồi điều phối sang các điểm bán.
2. **🏪 Chi nhánh 2:**
   - Thuê mặt bằng kinh doanh với giá **6.000.000 đ/tháng** (~200.000 đ/ngày).
   - Chi phí điện nước khoán ~40.000 đ/ngày ➔ Tổng chi phí cố định phải gánh mỗi ngày là **240.000 - 245.000 đ/ngày**.

### 1.2. Tư tưởng cốt lõi của Chủ Quán:
- **Tốc độ là số 1:** Khách tấp vào lề đường mua ly nước mía thì nhân viên phải bấm 1 chạm là xong, không bắt nhập lằng nhằng.
- **Tiền nào ra tiền đó:** Không để lẫn lộn tiền vốn nhập hàng với tiền lời; không để đến cuối tháng bị "ngợp" vì không có tiền trả chủ nhà hay tiền điện.
- **Mía là tự cung tự cấp:** Quán mua mía thô cả bó dài về tự bào chứ không mua mía đã bào sẵn của người ta. Phải theo dõi được tỷ lệ nạc/ốm của từng đợt mía nhập về.
- **Không bao giờ trừ lẻ nguyên liệu khi bán nước:** Bán 1 ly nước không được tự động trừ nửa bao đá hay 0.02kg mía. Nguyên liệu xuất theo bao, theo bó lớn; bán nước chỉ ghi nhận doanh thu và tiền két.

---

## 2. CẤU TRÚC ỨNG DỤNG (APP STRUCTURE & TẤT CẢ CÁC TAB CÓ GÌ)

Giao diện ứng dụng là dạng **Single Page Application (SPA)** với thanh điều hướng đáy (Bottom Navigation) và các Tab chức năng rõ ràng:

```
┌────────────────────────────────────────────────────────────────────────┐
│  [TOP BAR]  🏠 Quán Nhà (Chính) ▾  |  Hôm nay: +666k  |  Loa AI: 🟢 Bật │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  [TAB 1] ⚡ BÁN HÀNG (POS 1 CHẠM & MUA NHANH NVL)                      │
│          • Lưới 12 món nước bán chạy (Nước mía, Trà tắc, Trà đá...)    │
│          • Lưới 13 nguyên liệu mua/xuất nhanh có ảnh thực tế .jpg     │
│          • Chế độ thanh toán: 💵 Tiền Mặt & 📲 Chuyển Khoản QR       │
│                                                                        │
│  [TAB 2] 📋 SỔ THU CHI (NHẬT KÝ GIAO DỊCH)                             │
│          • Danh sách giao dịch thời gian thực                          │
│          • Bộ lọc: Hôm nay, Hôm qua, Tuần này, Tháng này, Tùy chọn     │
│          • Lọc theo Chi nhánh, Loại (Thu / Chi / Xuất dùng)            │
│                                                                        │
│  [TAB 3] 🏺 4 HŨ TIỀN (THE 4 JARS SYSTEM)                               │
│          • Hũ 1: Vốn Nguyên Liệu (~45% Doanh thu tái nhập hàng)        │
│          • Hũ 2: Quỹ Mặt Bằng & Điện Nước (Trích theo ngày duy trì)   │
│          • Hũ 3: Tiền Thối Đầu Ngày (Két giữ lại cho ca sáng)          │
│          • Hũ 4: Tiền Lời Ròng BỎ Túi (Lợi nhuận sạch tự do rút)       │
│                                                                        │
│  [TAB 4] 📊 BÁO CÁO & THỐNG KÊ (ANALYTICS)                             │
│          • Tổng doanh thu, Tổng chi phí, Điểm hòa vốn (Break-even)     │
│          • Biểu đồ Chart.js doanh thu theo khung giờ, theo ngày        │
│          • Top món bán chạy nhất                                       │
│                                                                        │
│  [TAB 5] 💵 CHỐT CA / CHỐT KÉT (RECONCILIATION)                        │
│          • Công thức két: [Tiền thối sáng] + [Thu TM] - [Chi TM]       │
│          • Nhập số tiền thực tế đếm được ➔ Báo Lệch (Khớp / Thừa / Thiếu) │
│                                                                        │
│  [TAB 6] 📦 NGUYÊN VẬT LIỆU & VẬN HÀNH MÍA (MATERIALS & SUGARCANE)     │
│          • Khối quy trình mía: Bào sơ chế, Xuất CN2, Mía dư cuối ngày  │
│          • Bảng theo dõi Lô Đợt Nhập Mía (Batch & Yield Tracking)      │
│          • Bảng tồn kho 13 nguyên vật liệu & Định mức số ly            │
│          • Lịch sử các lần xuất dùng NVL có ghi chú chi tiết           │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. VẬN HÀNH NHƯ THẾ NÀO (OPERATIONAL WORKFLOWS THỰC CHIẾN)

### 3.1. Bán hàng tại quầy (POS 1 Chạm & Loa AI QR):
1. **Khách gọi món:** Nhân viên chạm vào thẻ món (ví dụ: chạm 2 lần vào `Nước mía thường 8k` ➔ tổng 16k).
2. **Khách trả tiền mặt:** Bấm nút **💵 Thu Tiền Mặt**:
   - Ghi nhận giao dịch loại `thu`, phương thức `tien_mat`.
   - Tiền mặt nhảy ngay vào két bán hàng.
3. **Khách quét mã QR chuyển khoản:** Bấm nút **📲 Chuyển Khoản QR**:
   - Hiển thị mã QR ngân hàng động tự điền sẵn số tiền.
   - **Loa AI thông báo:** Hệ thống tự động đọc bằng giọng nói tiếng Việt qua loa quán: *"Đã nhận chuyển khoản 16 ngàn đồng"*.
   - Tiền ghi nhận vào tài khoản ngân hàng (không tính vào két tiền mặt).

---

### 3.2. Hệ thống phân bổ 4 Hũ Tiền (The 4 Jars System):
Mỗi ngày quán bán được bao nhiêu doanh thu, hệ thống tự động bóc tách thành **4 Hũ**:
- 🧊 **HŨ 1: VỐN NGUYÊN LIỆU (Tái Nhập Hàng) (~45% Doanh Thu):**
  - Giữ lại để sáng mai mua đá (17k-21k), mua mía cây (90k), tắc (30k/kg), ly nhựa, màng ép...
  - *Nguyên tắc:* Tuyệt đối không tiêu xài vào tiền này để quán luôn có vốn nhập hàng mới.
- 🏢 **HŨ 2: QUỸ MẶT BẰNG & ĐIỆN NƯỚC (Duy Trì Quán):**
  - Quán Nhà = 0 đ.
  - Chi nhánh 2 = Tự động trích **240.000 đ - 245.000 đ/ngày** (Mặt bằng 6tr/tháng + Điện nước).
  - Bỏ riêng vào ống heo/tài khoản tích lũy để cuối tháng chủ nhà đòi là có ngay 6 triệu, không bị hụt.
- 💵 **HŨ 3: TIỀN THỐI ĐẦU NGÀY (Két Giữ Lại):**
  - Mặc định giữ lại **50.000 đ** (hoặc 100.000 đ) trong két cho ca sáng mai thối tiền lẻ cho khách.
- 💰 **HŨ 4: TIỀN LỜI RÒNG BỎ TÚI (Lợi Nhuận Thực Nhận):**
  - Công thức: `Hũ 4 = Tổng Doanh Thu - Hũ 1 (Vốn) - Hũ 2 (Mặt Bằng) - Hũ 3 (Két)`.
  - Nếu kết quả dương 🟢 ➔ Đây là tiền lời sạch chủ quán được phép mang về bỏ túi!

---

### 3.3. Quy trình Mía tự cung tự cấp 3 mắt xích & Lô đợt:

```
   [VỰA MÍA GIAO] 
         ↓
  (Khâu 1: Nhập Kho) ➔ Mua bó 12 cây dài thô (90.000 đ/bó) ➔ Ghi chi tiền & Khai báo Đợt Mía
         ↓
  (Khâu 2: Sơ Chế)  ➔ Bào vỏ sạch & Chặt khúc ➔ Bó thành các Bó 10kg sạch (0 đ)
         ↓
 ┌───────────────────────────────────────┴───────────────────────────────────────┐
 ↓                                                                               ↓
(Khâu 3A: Bán Tại Quán Nhà)                                    (Khâu 3B: Xuất Sang Chi Nhánh 2)
Lấy bó 10kg ra quầy ép bán                                      Bấm "Xuất CN2" ➔ Trừ kho Nhà, cộng kho CN2
(~25-30 ly/bó)                                                 Cuối ngày kiểm kê số mía dư (ly/kg)
```

#### Thao tác theo dõi Lô Đợt (Batch Yield Tracking):
- **Khi xe vựa tới giao:** Bấm **`➕ Nhập Đợt Mới`** ➔ Nhập 20 bó 12 cây, giá 90.000 đ/bó ➔ Tự động ghi chi 1.800.000 đ và mở đợt `DOT-0309` (trạng thái `active`).
- **Mỗi lần mang mía đi bào vỏ:** Bấm **`🔄 1. Bào Mía Sơ Chế`**:
  - Nhập: Lần này bào `[ 4 ]` bó 12 cây ➔ thu được `[ 11 ]` bó 10kg sạch.
  - Tự động trừ kho 12 cây, cộng kho 10kg và ghi 1 dòng nhật ký vào đợt đang mở.
- **Khi bào hết sạch đợt mía đó:** Bấm **`📈 Tổng Kết Đợt`**:
  - Hiển thị bảng tổng kết: Nhập 20 bó 12 cây ➔ thu 58 bó 10kg sạch (Hiệu suất 1 ➔ 2.9 bó).
  - Giá vốn thực tế: `1.800.000 đ / 58 = 31.034 đ / bó 10kg` (~1.240 đ / ly).
  - Bấm **`🏁 Đóng & Tổng Kết Đợt Mía Này`**.

---

### 3.4. Xuất hàng sang Chi nhánh 2 & Kiểm kê mía dư cuối ngày:
- **Xuất sang CN2:** Bấm **`🚚 2. Xuất Mía Sang Chi Nhánh 2`**:
  - Nhập số bó 10kg xuất đi (ví dụ: `2` bó) ➔ Trừ kho Quán Nhà -2, cộng kho CN2 +2 (Hệ thống báo định mức: `~50-60 ly tại CN2`).
- **Kiểm kê mía dư cuối ca:** Bấm **`🌙 3. Kiểm Kê Mía Dư Cuối Ngày`**:
  - Chọn: `Chi nhánh 2`
  - Nhập: Hôm nay chưa bán hết mía, còn dư khoảng `[ 20 ]` ly (hoặc `[ 6.5 ]` kg).
  - Tự động lưu ghi chú chốt ca: `[Mía dư cuối ngày] Chi nhánh 2 hôm nay chưa bán hết mía, còn dư ~20 ly chuyển sang mai bán tiếp`.

---

### 3.5. Chốt két & Chốt ca cuối ngày:
1. Vào tab **💵 Chốt Ca / Chốt Két**.
2. Hệ thống tính toán sẵn:
   - `Tiền thối mang sang đầu ngày:` 50.000 đ
   - `+ Thu tiền mặt bán được hôm nay:` +500.000 đ
   - `- Chi tiền mặt phát sinh trong ca:` -150.000 đ
   - **➔ SỐ TÍNH CẦN CÓ TRONG KÉT = 400.000 đ**
3. Nhân viên đếm tiền mặt thực tế trong két và nhập vào ô `Tiền mặt thực đếm`.
4. Nếu khớp: Báo xanh 🟢 `Khớp tiền 100%`. Nếu thiếu: Báo đỏ 🔴 `Lệch âm -20k (Cần kiểm tra lại)`.
5. Bấm **Xác Nhận Chốt Ca** ➔ Lưu lịch sử vào bảng `daily_closings` và đồng bộ Supabase.

---

## 4. ĐÃ TỪNG LÀM NHỮNG GÌ (LỊCH SỬ TIẾN HÓA & CÁC SỰ CỐ ĐÃ XỬ LÝ)

| Cột mốc | Yêu cầu của Chủ Quán | Vấn đề phát sinh | Giải pháp kỹ thuật đã xử lý triệt để |
| :--- | :--- | :--- | :--- |
| **Mốc 1: Phân bổ 4 Hũ Tiền** | Muốn biết bán được từng này tiền thì rút ra bỏ túi được bao nhiêu? | Chi nhánh 2 có tiền thuê mặt bằng 6tr/tháng nhưng lúc đầu bị chia đều hoặc tính gộp khiến Quán Nhà bị trừ oan. | Tách riêng cấu hình chi phí cố định theo từng chi nhánh (`overheadByBranch`). Quán Nhà mặt bằng = 0đ, CN2 trích 245k/ngày. |
| **Mốc 2: Mất giao dịch hôm nay** | Chủ quán báo: *Tại sao vừa bán và thêm món xong thì bây giờ mất hết các giao dịch hôm nay?* | Do hàm lọc ngày mặc định bị lệch múi giờ UTC so với múi giờ Việt Nam (GMT+7) và bộ lọc bị kẹt ở tab Hôm qua. | Cố định hàm lấy ngày theo chuẩn địa phương `toLocaleDateString("en-CA")` (YYYY-MM-DD), đồng thời trong `mergeData` bảo toàn danh sách `data.ds` không bị ghi đè. |
| **Mốc 3: Tách biệt Xuất dùng & Chi mua** | *Xuất dùng và chi tiền mua là 2 ý khác nhau nhé, 1 tab riêng cho chức năng này* | Trước đó việc xuất nguyên liệu bị tính gộp vào chi tiền mặt làm két bị âm vô lý. | Tách riêng nghiệp vụ: `chi` (tiền ra khỏi két) vs `xuat_dung` (tiền = 0đ, chỉ trừ kho & lưu ghi chú nhật ký). Tạo riêng Tab Nguyên Vật Liệu (`#view-materials`). |
| **Mốc 4: Sự cố Supabase Constraint** | Khi lưu phiếu xuất dùng lên Supabase bị lỗi không sync được. | Supabase có SQL Check Constraint: `giao_dich_loai_check` chỉ cho phép `loai IN ('thu', 'chi')`. | Viết adapter đóng gói trong `www/js/sync-model.js`: Khi gửi lên mây, `xuat_dung` được chuyển thành `loai = 'chi'`, `so_tien = 0`, kèm metadata `[EXT:{"loai":"xuat_dung",...}]` trong ghi chú. Khi tải về giải nén ngược lại. |
| **Mốc 5: Bán 1 ly nước có trừ đá không?** | *Chẳng hạn khi tôi bấm đã bán 1 ly nước thì có ảnh hưởng gì tới NVL không? Không được tính đá vào* | Hệ thống cũ có hàm `truKhoNguyenLieuTheoDonHang` tự động trừ 0.03 bao đá mỗi ly nước mía. | Gỡ bỏ hoàn toàn `truKhoNguyenLieuTheoDonHang` khỏi `themGiaoDich`. Bán nước POS chỉ ghi nhận doanh thu; tồn kho chỉ biến động khi có phiếu nhập kho hoặc xuất dùng thực tế. |
| **Mốc 6: Mía tự cung tự cấp** | *Mía tự mua bó 12 cây dài và bào vỏ chặt khúc... Bó mía 10kg bào sẵn vẫn phải giữ để bám sát theo và note lại được bao nhiêu bó 10kg từ bao nhiêu bó 12 cây* | Cần quản lý cả 2 loại mía và mối liên kết chuyển đổi giữa chúng. | Quản lý song song: `ing_mia_bo` (12 cây thô) và `ing_mia_bo_10kg` (bó 10kg thành phẩm). Thêm khối sơ chế liên kết tự trừ kho 12 cây và tăng kho 10kg. |
| **Mốc 7: Quản lý theo Đợt / Lô mía** | *Nhập đợt mía thô ngày... từ đó mỗi lần sơ chế được bao nhiêu thì nhập vào, để khi tổng kết đợt biết bao nhiêu bó 12 cây ra bao nhiêu bó 10kg* | Người dùng muốn theo dõi tiến độ cả đợt từ lúc nhập thô đến lúc bào hết sạch. | Tạo module Quản lý Đợt Mía (`sugarcaneBatches`), hỗ trợ: Tạo đợt mới ➔ Ghi nhận cộng dồn từng lần bào ➔ Báo cáo tổng kết hiệu suất đợt (1 bó ➔ X bó 10kg, giá vốn thực tế) ➔ Đóng đợt. |

---

## 5. CƠ CHẾ KỸ THUẬT NỘI BỘ (TECHNICAL INTERNALS & ARCHITECTURE)

### 5.1. Cấu trúc mã nguồn chi tiết:
```
D:/localhost/app-thu-chi-quan-nuoc/
├── www/
│   ├── index.html            # File HTML duy nhất (SPA), chứa layout và tất cả modals
│   ├── js/
│   │   ├── app.js            # Controller chính (~6.750 dòng):
│   │   │                     # - Khởi tạo ứng dụng, renderAll()
│   │   │                     # - Bán hàng POS, tính tiền thối, QR code
│   │   │                     # - Quản lý modal NVL & 3 hành động Mía
│   │   │                     # - Quản lý modal Lô Đợt Mía & Báo cáo tổng kết
│   │   ├── db.js             # Model & Data Access Layer (~2.490 dòng):
│   │   │                     # - DEFAULT_DATA (menu, quickIngredients, inventoryStock, sugarcaneBatches)
│   │   │                     # - mergeData(data): Chuẩn hóa dữ liệu khi load
│   │   │                     # - taoGiaoDich(), themGiaoDich(), xoaGiaoDich() (kèm hoàn kho)
│   │   │                     # - nhapKhoNguyenLieu() (tính giá vốn bình quân liên hoàn)
│   │   │                     # - taoDotNhapMia(), ghiNhanSoCheDotMia(), dongDotNhapMia()
│   │   ├── sync-model.js     # Adapter Supabase: toRemoteTransaction(), fromRemoteTransaction()
│   │   ├── report.js         # Phân tích 4 Hũ tiền (computeFundBalances), báo cáo EV
│   │   ├── speech.js         # Loa AI thông báo nhận tiền chuyển khoản QR
│   │   └── logic/
│   │       ├── inventory.js  # Nghiệp vụ quản lý tồn kho, cảnh báo sắp hết
│   │       └── tax.js        # Mẫu biểu thuế khoán 01/CNKD
│   └── assets/
│       ├── ingredients/      # Ảnh thực tế .jpg của 13 nguyên liệu
│       └── menu/             # Ảnh thực tế .jpg của các món nước
└── tests/                    # Toàn bộ Unit Tests tự động
    ├── test-sugarcane-workflow.test.mjs  # Test 3 mắt xích Mía & Lô đợt
    ├── test-xuat-dung.test.mjs           # Test xuất dùng, hoàn kho & Supabase adapter
    ├── test-quick-ingredients.test.mjs   # Test 13 nguyên liệu & ảnh
    └── test-jars-tab.test.mjs            # Test phân bổ 4 hũ tiền
```

### 5.2. Offline-First & Supabase Sync Engine:
- **Luồng ghi dữ liệu:** Thao tác trên giao diện ➔ Ghi ngay vào `state` & lưu vào `localStorage` ➔ Render lại giao diện tức thì (<10ms) ➔ Gọi `triggerAutoSync()` đẩy ngầm lên Supabase.
- **Nếu mất mạng:** Phiếu lưu cờ `daSync: false`. Khi có mạng trở lại, sync engine tự động quét các bản ghi chưa sync để đẩy lên.
- **Realtime Listener:** Lắng nghe kênh `giao_dich` từ Supabase để tự động cập nhật nếu có chi nhánh khác cùng bán hàng.

### 5.3. Xử lý Check Constraint Supabase bằng payload [EXT:...]:
Trong `www/js/sync-model.js`:
- Supabase có Check Constraint SQL: `loai IN ('thu', 'chi')`.
- Để lưu được giao dịch nội bộ `xuat_dung` mà không bị vi phạm ràng buộc:
  - Hàm `toRemoteTransaction`: Gán `dbLoai = 'chi'`, `so_tien = 0`, và nén metadata vào cuối ghi chú: `[EXT:{"loai":"xuat_dung",...}]`.
  - Hàm `fromRemoteTransaction`: Quét regex `\\[EXT:(.+?)\\]`, phục hồi lại `loai: 'xuat_dung'` và làm sạch ghi chú hiển thị.

### 5.4. Thuật toán tự động hoàn kho khi xóa giao dịch:
Trong hàm `xoaGiaoDich(id)` (`www/js/db.js`):
Nếu người dùng bấm xóa một phiếu `xuat_dung` (ví dụ ghi nhầm xuất 2 bó mía):
1. Hệ thống tìm thấy giao dịch bị xóa có `loai === 'xuat_dung'`.
2. Lấy số lượng `qty` đã xuất.
3. Tìm món tương ứng trong kho của chi nhánh đó (`mia_10kg` hoặc `mia_cay` bằng bộ so khớp thông minh).
4. **Tự động cộng trả lại tồn kho:** `matched.stockQty += qty`.
5. Đánh dấu cờ `deleted = true` để sync xóa lên Supabase.

---

## 6. HƯỚNG DẪN DÀNH CHO DEVELOPER TIẾP QUẢN (HOW-TO & MAINTAIN)

### 6.1. Cách chạy kiểm thử tự động (Unit Tests):
Mỗi khi sửa bất kỳ logic nào trong `app.js` hay `db.js`, bắt buộc chạy lệnh này trong PowerShell:
```bash
node tests/test-sugarcane-workflow.test.mjs
node tests/test-xuat-dung.test.mjs
node tests/test-quick-ingredients.test.mjs
node tests/test-jars-tab.test.mjs
```
👉 **Tiêu chuẩn:** Toàn bộ 4 test suite phải in ra `✅ PASS` 100%!

### 6.2. Cách build & deploy lên Vercel:
```bash
# 1. Kiểm tra cú pháp JS trước
node -c www/js/app.js
node -c www/js/db.js

# 2. Build và deploy trực tiếp lên Vercel Production
npx vercel build --prod --yes
npx vercel deploy --prebuilt --prod --yes
```

### 6.3. Cách thêm món nước / thêm nguyên liệu mới:
1. **Thêm món nước mới vào Menu POS:**
   - Mở `www/js/db.js` ➔ tìm mảng `DEFAULT_DATA.menu`.
   - Thêm object món: `{ id: "ten_mon", name: "Tên Món", price: 15000, cost: 7000, category: "Nước Mía", image: "./assets/menu/ten_mon.jpg" }`.
2. **Thêm nguyên liệu mới vào danh mục theo dõi:**
   - Mở `www/js/db.js` ➔ tìm mảng `DEFAULT_DATA.quickIngredients` và `DEFAULT_DATA.inventoryStock`.
   - Khai báo `id`, `name`, `unit`, `unitCost`, `yieldPerUnit`.
   - Đặt ảnh tương ứng vào thư mục `www/assets/ingredients/`.

### 6.4. BẢNG NHỮNG ĐIỀU TUYỆT ĐỐI KHÔNG ĐƯỢC PHÁ VỠ (CRITICAL DONTS)

| # | ĐIỀU CẤM KỴ | HẬU QUẢ NẾU LÀM SAI |
| :---: | :--- | :--- |
| ❌ | **KHÔNG** gửi trực tiếp `loai = 'xuat_dung'` lên Supabase mà không qua adapter | Bị văng lỗi SQL Check Constraint `giao_dich_loai_check`, đồng bộ Supabase thất bại 100%. |
| ❌ | **KHÔNG** gắn logic trừ hao nguyên liệu tự động vào nút bán nước trên POS | Khách mua 1 ly nước bị trừ 0.03 bao đá; trong khi quầy đã trừ cả bao đá lúc đầu ngày ➔ Tồn kho bị trừ 2 lần (âm kho). |
| ❌ | **KHÔNG** xóa bỏ `Bó mía 10kg bào sạch` hoặc `Bó 12 cây dài` | Phá vỡ quy trình tự cung tự cấp của quán: Quán mua bó 12 cây thô về bào ra các bó 10kg để bán. |
| ❌ | **KHÔNG** gán cứng tiền mặt bằng cho Quán Nhà | Quán Nhà là nhà ở của chủ quán (tiền mặt bằng = 0 đ). Chỉ có Chi nhánh 2 mới gánh tiền mặt bằng 6tr/tháng. |
| ❌ | **KHÔNG** dùng lệnh sửa file mà quên kiểm tra xuống dòng CRLF trên Windows | Gây lỗi tìm không thấy đoạn mã cần thay thế (mismatch string do khác biệt `\r\n` và `\n`). |

---

## 7. THÔNG TIN LIÊN HỆ & BÀN GIAO
- **Thư mục dự án:** `D:/localhost/app-thu-chi-quan-nuoc`
- **Toàn bộ lịch sử trao đổi chi tiết:** File `TOAN_BO_LICH_SU_CHAT_SESSION.md` (cùng nằm trong thư mục `Downloads`).
- **File sao lưu dữ liệu chat thô:** File `chat_transcript_raw.jsonl` (trong thư mục `Downloads`).

*Chúc bạn tiếp quản dự án thành công và phát triển thêm nhiều tính năng tuyệt vời cho quán!* 🎋🚀
