# KẾ HOẠCH CHI TIẾT: APP THU CHI GIỌNG NÓI "SỔ QUÁN NƯỚC MÍA"
### Từ số 0 → File APK cài lên điện thoại mẹ | Dành cho người code bằng AI

---

## 0. TÓM TẮT LỘ TRÌNH

| Giai đoạn | Kết quả | Thời gian ước tính |
|---|---|---|
| GĐ 0 | Cài đặt môi trường trên máy tính | 1 buổi |
| GĐ 1 | Web app chạy trên Chrome máy tính (đã có prototype) | 2–4 buổi |
| GĐ 2 | Đóng gói thành APK bằng Capacitor, chạy được trên Android | 2–3 buổi |
| GĐ 3 | Gắn nhận giọng nói native (plugin), test với giọng mẹ | 2–3 buổi |
| GĐ 4 | Thống kê, xuất Excel, sao lưu | 3–5 buổi |
| GĐ 5 | Ký APK bản release, cài chính thức cho mẹ | 1 buổi |

**Công nghệ chọn: HTML/CSS/JavaScript + Capacitor.**

Lý do chọn (quan trọng với người code bằng AI):
- AI viết HTML/JS tốt nhất trong mọi ngôn ngữ → bạn sửa lỗi, hỏi AI dễ nhất.
- Tái sử dụng được 90% prototype web đã có.
- Capacitor "bọc" web app thành app Android thật, xuất ra file `.apk`.
- Không cần lên Google Play (cài APK trực tiếp), không tốn phí.
- Nhận giọng nói dùng engine Google có sẵn trong Android → chính xác hơn Web Speech API trên trình duyệt.

Phương án thay thế: Flutter (xem Phụ lục D) — chỉ cân nhắc nếu Capacitor gặp vấn đề.

---

## GIAI ĐOẠN 0: CÀI MÔI TRƯỜNG (làm 1 lần duy nhất)

### 0.1. Phần mềm cần cài trên máy tính (Windows/Mac đều được)

Cài theo đúng thứ tự:

1. **Node.js LTS** — tải tại nodejs.org, bản LTS mới nhất (20.x trở lên).
   Kiểm tra: mở Terminal/CMD gõ `node -v` và `npm -v` → hiện số phiên bản là được.
2. **VS Code** — code.visualstudio.com. Cài thêm extension: *Live Server* (chạy thử web app 1 click).
3. **JDK 17** — phù hợp với Android Gradle Plugin 8.x. Tải Temurin JDK 17 tại adoptium.net.
   Kiểm tra: `java -version` → hiện `17.x`.
4. **Android Studio** — developer.android.com/studio. Cài bản mới nhất ổn định. Khi cài, tick chọn:
   - Android SDK
   - Android SDK Platform mới nhất (tối thiểu API 24 theo yêu cầu Capacitor; nên cài thêm API mới nhất mà Android Studio đề xuất)
   - Android SDK Build-Tools
   - Android Virtual Device (máy ảo — không bắt buộc, test máy thật tốt hơn)
5. **Biến môi trường** (Windows): thêm `ANDROID_HOME` trỏ tới thư mục SDK
   (thường là `C:\Users\<tên bạn>\AppData\Local\Android\Sdk`) và thêm
   `%ANDROID_HOME%\platform-tools` vào PATH.
   Kiểm tra: gõ `adb version` → hiện phiên bản là xong.

### 0.2. Chuẩn bị điện thoại test (dùng máy bạn trước, máy mẹ sau)

1. Vào **Cài đặt → Giới thiệu điện thoại → bấm 7 lần vào "Số bản dựng"** → mở khóa "Tùy chọn nhà phát triển".
2. Vào **Tùy chọn nhà phát triển → bật "Gỡ lỗi USB" (USB Debugging)**.
3. Cắm cáp USB vào máy tính, gõ `adb devices` → thấy serial máy là kết nối thành công.

### 0.3. Prompt mẫu cho AI khi gặp lỗi cài đặt

> "Tôi đang cài [Node.js / Android Studio / JDK] trên [Windows 11 / macOS], khi chạy lệnh `...` thì gặp lỗi này: [dán nguyên văn lỗi]. Hãy hướng dẫn tôi sửa từng bước."

**Quy tắc vàng khi code bằng AI: luôn dán NGUYÊN VĂN thông báo lỗi, kèm hệ điều hành và lệnh vừa chạy.**

---

## GIAI ĐOẠN 1: HOÀN THIỆN WEB APP (nền của APK)

### 1.1. Cấu trúc thư mục dự án

```
quan-nuoc-mia/
├── www/                  ← toàn bộ web app nằm đây (Capacitor sẽ đóng gói thư mục này)
│   ├── index.html        ← giao diện chính
│   ├── css/style.css
│   ├── js/
│   │   ├── app.js        ← luồng màn hình, sự kiện nút
│   │   ├── parser.js     ← phân tích câu nói → {loại, tiền, danh mục, ghi chú}
│   │   ├── db.js         ← lớp đọc/ghi dữ liệu (web: localStorage, APK: Preferences)
│   │   └── speech.js     ← lớp trung gian giọng nói (quan trọng, xem 3.2)
│   └── assets/           ← icon, âm thanh "ting" khi lưu thành công
├── package.json
└── (android/ sẽ tự sinh ra ở GĐ 2)
```

Tách file như trên để mỗi lần nhờ AI sửa, bạn chỉ gửi 1 file nhỏ thay vì cả app → AI ít sửa nhầm chỗ khác.

### 1.2. Mô hình dữ liệu (chốt trước khi code)

```js
// 1 giao dịch
{
  id: 1721000000000,        // Date.now()
  ngay: "2026-07-15",
  gio: "08:30",
  loai: "thu",              // "thu" | "chi"
  soTien: 40000,
  danhMuc: "Bán nước mía",  // xem danh sách dưới
  ghiChu: "Bán 2 ly",
  cauNoiGoc: "bán 2 ly 40 nghìn",  // giữ lại để cải thiện parser
  daSuaTay: false           // true nếu app hiểu sai, mẹ phải sửa
}
```

Danh mục mặc định — Thu: `Bán nước mía`, `Thu khác`. Chi: `Mua mía`, `Mua đá`, `Ly/ống hút/túi`, `Điện nước`, `Xăng xe`, `Chi khác`.

Khóa lưu trữ chung: `nuocmia_v1` = JSON `{ ds: [giao dịch...], danhMuc: {...} }`.

Ngay từ đầu, `db.js` phải là lớp trung gian duy nhất cho dữ liệu:
- Khi chạy web trên Chrome: dùng `localStorage`.
- Khi chạy trong APK Capacitor: dùng `@capacitor/preferences`.
- Các file khác chỉ gọi hàm của `db.js` (`docDuLieu`, `luuDuLieu`, `themGiaoDich`, `xoaGiaoDich`...), không đụng trực tiếp `localStorage` hay `Preferences`. Nhờ vậy sau này đổi nơi lưu không phải sửa cả app.

### 1.3. Danh sách màn hình (checklist code)

- [ ] **Màn chính**: thanh tổng Thu/Chi/Còn lại hôm nay + nút micro to cố định đáy màn hình + danh sách giao dịch hôm nay.
- [ ] **Thẻ xác nhận** (hiện sau khi nói): loại thu/chi (2 nút to), số tiền cỡ chữ ≥32px sửa được, danh mục, ghi chú, nút Lưu/Hủy.
- [ ] **Nút bán nhanh**: 3 nút `Ly 10k` `Ly 15k` `Ly 20k` (sửa được giá trong cài đặt) — bấm 1 phát lưu luôn.
- [ ] **Nhập tay**: form dự phòng khi ồn/mất mạng.
- [ ] **Màn lịch sử**: nhóm theo ngày, tổng từng ngày.
- [ ] **Màn thống kê**: chọn tháng → tổng thu, tổng chi, lời; biểu đồ cột theo ngày; tỉ lệ chi theo danh mục.
- [ ] **Cài đặt**: sửa danh mục, sửa giá bán nhanh, xuất dữ liệu, xóa dữ liệu.

### 1.4. Yêu cầu parser tiếng Việt (viết test trước)

Bảng test bắt buộc phải qua — đưa nguyên bảng này cho AI khi nhờ viết `parser.js`:

| Câu nói | Loại | Tiền | Danh mục |
|---|---|---|---|
| bán 2 ly 40 nghìn | thu | 40000 | Bán nước mía |
| bán nước mía 20 nghìn | thu | 20000 | Bán nước mía |
| khách trả 50 ngàn | thu | 50000 | Bán nước mía |
| mua mía 200k | chi | 200000 | Mua mía |
| mua 5 bó mía 150 nghìn | chi | 150000 | Mua mía |
| trả tiền đá 30 nghìn | chi | 30000 | Mua đá |
| tiền điện 1 triệu rưỡi | chi | 1500000 | Điện nước |
| đổ xăng 50 | chi | 50000 | Xăng xe |
| mua ống hút 25 nghìn | chi | 25000 | Ly/ống hút/túi |

Luật chính: từ khóa `mua/trả/tốn/tiền điện/tiền nước/đổ xăng` → chi; `bán/thu/khách/được` → thu; ưu tiên số có đơn vị (`nghìn/ngàn/k/triệu`), nếu không lấy **số cuối câu**; số < 1000 không đơn vị → nhân 1000.

Quy tắc `rưỡi` phải viết rõ trong test:
- `1 triệu rưỡi` → `1_500_000`, `2 triệu rưỡi` → `2_500_000`.
- `2 nghìn rưỡi` → `2_500` nếu sau này cần nhận câu nhỏ lẻ.
- Câu mơ hồ kiểu `50 rưỡi` không tự đoán ở bản đầu; để app hiện thẻ xác nhận cho sửa tay.

### 1.5. Prompt mẫu cho AI ở giai đoạn này

> "Viết file `parser.js` thuần JavaScript, export hàm `phanTich(text)` trả về `{loai, soTien, danhMuc, ghiChu}`. Phải qua hết bảng test sau: [dán bảng 1.4]. Viết kèm hàm `chayTest()` in kết quả từng ca để tôi kiểm tra."

> "Đây là file `app.js` hiện tại [dán code]. Hãy thêm màn thống kê tháng dùng thư viện Chart.js. Không phụ thuộc CDN khi chạy APK: cài bằng `npm install chart.js` hoặc copy file minified vào `www/vendor/chart.umd.min.js`, rồi nhúng local. Gồm biểu đồ cột thu theo ngày và biểu đồ tròn chi theo danh mục. Chỉ sửa những chỗ cần, đánh dấu chỗ sửa bằng comment."

**Nghiệm thu GĐ 1:** mở `index.html` bằng Live Server trên Chrome máy tính, nhập tay + bán nhanh + thống kê chạy đúng. (Giọng nói test kỹ ở GĐ 3 — trên Chrome có thể dùng Web Speech API tạm.)

---

## GIAI ĐOẠN 2: ĐÓNG GÓI THÀNH APK BẰNG CAPACITOR

### 2.1. Khởi tạo Capacitor (chạy trong thư mục `quan-nuoc-mia/`)

```bash
npm init -y
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init "So Quan Nuoc Mia" "com.giadinh.nuocmia" --web-dir=www
npx cap add android
```

Giải thích: `com.giadinh.nuocmia` là ID app (đặt gì cũng được nhưng **không đổi về sau**); `npx cap add android` sinh ra thư mục `android/` — đây là project Android thật.

### 2.2. Chu trình làm việc hằng ngày (thuộc lòng 3 lệnh)

```bash
# 1. Sau khi sửa code trong www/ → đồng bộ vào project Android:
npx cap sync android

# 2. Cắm điện thoại (đã bật USB Debugging) → chạy thẳng lên máy:
npx cap run android

# 3. Hoặc mở bằng Android Studio để build/debug sâu hơn:
npx cap open android
```

### 2.3. Build file APK bản test (debug)

Cách A — dòng lệnh (nhanh nhất):
```bash
cd android
./gradlew assembleDebug        # Windows: gradlew.bat assembleDebug
```
File APK nằm tại: `android/app/build/outputs/apk/debug/app-debug.apk`

Cách B — Android Studio: `npx cap open android` → menu **Build → Build App Bundle(s)/APK(s) → Build APK(s)** → bấm *locate* khi build xong.

### 2.4. Cài APK lên điện thoại

- Qua cáp: `adb install -r android/app/build/outputs/apk/debug/app-debug.apk`
- Qua Zalo: gửi file `app-debug.apk` cho máy mẹ → tải về → mở → Android hỏi "cài từ nguồn không xác định" → **Cho phép** → Cài đặt.

### 2.5. Icon và tên app

- Đặt icon 1024×1024 tại `assets/icon.png` rồi chạy:
  ```bash
  npm install @capacitor/assets --save-dev
  npx capacitor-assets generate --android
  ```
- Đổi tên hiển thị: sửa `android/app/src/main/res/values/strings.xml` → thẻ `app_name`.

**Nghiệm thu GĐ 2:** app cài được lên máy, mở lên thấy đúng giao diện web app, icon và tên đúng. (Giọng nói chưa cần chạy — GĐ 3.)

---

## GIAI ĐOẠN 3: NHẬN GIỌNG NÓI NATIVE (quan trọng nhất)

Lưu ý kỹ thuật then chốt: **Web Speech API KHÔNG chạy trong APK** (WebView của Android không hỗ trợ). Phải dùng plugin gọi engine nhận giọng nói của Android.

### 3.1. Cài plugin

```bash
npm install @capacitor-community/speech-recognition
npx cap sync android
```

Thêm quyền micro vào `android/app/src/main/AndroidManifest.xml` (trong thẻ `<manifest>`):
```xml
<uses-permission android:name="android.permission.RECORD_AUDIO" />
```

### 3.2. Viết lớp trung gian `speech.js` (chìa khóa để code 1 lần chạy 2 nơi)

Ý tưởng: file `speech.js` tự phát hiện môi trường — nếu đang chạy trong app Capacitor thì dùng plugin native, nếu đang chạy trên Chrome (lúc dev) thì dùng Web Speech API. Nhờ vậy bạn vẫn dev nhanh trên máy tính.

Prompt mẫu cho AI:
> "Viết file `speech.js` cho app Capacitor + web. Export 2 hàm: `batDauNghe(onKetQua, onLoi)` và `dungNghe()`. Nếu `window.Capacitor?.isNativePlatform()` là true thì dùng plugin `@capacitor-community/speech-recognition` với `language: 'vi-VN'`, `partialResults: true`, `popup: false`, nhớ xin quyền micro trước bằng `SpeechRecognition.requestPermissions()`. Với partial results, đăng ký `SpeechRecognition.addListener('partialResults', ...)` và nhớ remove listener khi dừng nghe. Nếu không thì fallback sang `webkitSpeechRecognition` với `lang='vi-VN'`. Kết quả trả về dạng `{text, isFinal}`."

Lưu ý: trên Android, partial results của plugin dễ lỗi/không trả về nếu bật popup hệ thống. Vì vậy bản đầu nên ưu tiên `popup: false`, tự hiển thị trạng thái nghe trong UI của app.

### 3.3. Trải nghiệm xác nhận bằng giọng đọc lại (nên có)

Dùng Text-to-Speech để app đọc: *"Thu 40 nghìn, bán nước mía. Đúng không?"* — mẹ không cần đeo kính vẫn kiểm tra được.

```bash
npm install @capacitor-community/text-to-speech
npx cap sync android
```

### 3.4. Test với người dùng thật — bước quyết định thành bại

Checklist test với chính mẹ bạn, tại quán, khi máy ép mía đang chạy:

- [ ] 20 câu nói tự nhiên của mẹ (đừng dạy mẹ nói theo mẫu — để mẹ nói kiểu của mẹ)
- [ ] Ghi lại các câu app hiểu sai vào 1 file (app đã lưu `cauNoiGoc` nên xuất ra được)
- [ ] Đưa danh sách câu sai cho AI: "Cập nhật parser.js để xử lý đúng thêm các câu sau, không làm hỏng các ca test cũ: [...]"
- [ ] Đo tỉ lệ đúng. Mục tiêu: ≥ 80% câu không phải sửa tay thì mẹ mới chịu dùng lâu dài.
- [ ] Test khi mất mạng: engine Google trên nhiều máy Android nhận tiếng Việt offline được nếu đã tải gói ngôn ngữ (Cài đặt → Google → Nhập bằng giọng nói → Thêm tiếng Việt offline). Kiểm tra trên đúng máy của mẹ.

---

## GIAI ĐOẠN 4: THỐNG KÊ – XUẤT FILE – SAO LƯU

### 4.1. Thống kê (đã có khung ở GĐ 1, hoàn thiện ở đây)

Ưu tiên theo thứ tự: tổng hôm nay (có sẵn) → tổng tháng + lời tháng → biểu đồ cột doanh thu theo ngày → cơ cấu chi theo danh mục → so sánh tháng trước.

### 4.2. Xuất Excel/CSV gửi Zalo

```bash
npm install @capacitor/filesystem @capacitor/share
npx cap sync android
```
Luồng: nút "Xuất báo cáo tháng" → tạo file CSV (cột: Ngày, Giờ, Loại, Số tiền, Danh mục, Ghi chú) → `Filesystem.writeFile` → `Share.share` → mẹ chọn Zalo gửi cho bạn. CSV mở được bằng Excel, đủ dùng; nếu muốn .xlsx đẹp thì thêm thư viện SheetJS.

Để Excel trên Windows đọc tiếng Việt ít lỗi:
- Thêm BOM UTF-8 ở đầu file: `\ufeff`.
- Ưu tiên dấu phân cách `;` thay vì `,` vì nhiều máy dùng định dạng số Việt Nam.
- Tên file nên có tháng, ví dụ `bao-cao-nuoc-mia-2026-07.csv`.

### 4.3. Sao lưu 3 tầng

1. **Tầng 1 (bắt buộc):** dữ liệu local. Cài **@capacitor/preferences** ngay khi bắt đầu làm APK:
   ```bash
   npm install @capacitor/preferences
   ```
   `db.js` tự chọn nơi lưu: web dùng `localStorage`, APK dùng `Preferences.get/set`. Không viết logic lưu trữ trực tiếp trong `app.js`.
2. **Tầng 2 (nên có):** nút "Sao lưu" xuất toàn bộ dữ liệu ra file JSON, gửi Zalo; nút "Khôi phục" đọc lại file đó. Phòng khi mất máy/đổi máy.
3. **Tầng 3 (làm sau):** tự đồng bộ lên **Supabase** để bạn xem doanh thu từ xa theo thời gian thực — nguyên tắc **local-first**: lưu máy trước, có mạng mới đẩy lên, mất mạng vẫn ghi bình thường. Toàn bộ setup tự động bằng Supabase CLI + AI: xem **Phụ lục C**. (Phương án đơn giản hơn nếu chỉ cần xem tổng cuối tháng: Google Apps Script + Google Sheets.)

---

## GIAI ĐOẠN 5: BUILD APK RELEASE VÀ BÀN GIAO

APK debug chỉ để test. Bản cài lâu dài nên là bản **release có ký** (nhẹ hơn, nhanh hơn, không cảnh báo lung tung).

### 5.1. Tạo khóa ký (1 lần duy nhất — GIỮ FILE NÀY CẨN THẬN)

```bash
keytool -genkey -v -keystore nuocmia.keystore -alias nuocmia -keyalg RSA -keysize 2048 -validity 10000
```
Nhập mật khẩu và thông tin. **Lưu file `nuocmia.keystore` + mật khẩu vào nơi an toàn** (mất là không cập nhật đè app được, phải cài lại từ đầu).

### 5.2. Khai báo ký trong `android/app/build.gradle`

Không ghi mật khẩu trực tiếp vào `build.gradle`. Tạo file `android/keystore.properties` (không commit Git):

```properties
storeFile=../../nuocmia.keystore
storePassword=MAT_KHAU_CUA_BAN
keyAlias=nuocmia
keyPassword=MAT_KHAU_CUA_BAN
```

Thêm `android/keystore.properties`, `*.keystore`, `*.jks`, `GHI-CHU.md` vào `.gitignore`.

Trong `android/app/build.gradle`, đặt đoạn đọc file **ngay phía trên** khối `android { }`:
```gradle
def keystorePropertiesFile = rootProject.file("keystore.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}
```

Rồi trong khối `android { }`, khai báo:
```gradle
signingConfigs {
    release {
        if (keystorePropertiesFile.exists()) {
            storeFile file(keystoreProperties["storeFile"])
            storePassword keystoreProperties["storePassword"]
            keyAlias keystoreProperties["keyAlias"]
            keyPassword keystoreProperties["keyPassword"]
        }
    }
}
buildTypes {
    release {
        signingConfig signingConfigs.release
        minifyEnabled false
    }
}
```

### 5.3. Build và cài

```bash
cd android
./gradlew assembleRelease
# File: android/app/build/outputs/apk/release/app-release.apk
```
Gửi file này cho máy mẹ cài như mục 2.4. Về sau mỗi lần cập nhật: tăng `versionCode` trong `build.gradle` → build lại → gửi file mới → cài đè (dữ liệu giữ nguyên).

### 5.4. Checklist bàn giao cho mẹ

- [ ] Icon app nằm ngay màn hình chính, tên tiếng Việt dễ hiểu
- [ ] Mở app lần đầu cùng mẹ, bấm cho phép micro
- [ ] Hướng dẫn 1 thao tác duy nhất: "Bấm nút xanh → nói → bấm Lưu"
- [ ] Dạy thêm nút bán nhanh Ly 10k/15k/20k
- [ ] Kiểm tra gói tiếng Việt offline của Google đã tải trên máy mẹ
- [ ] Hẹn sau 1 tuần xem file `cauNoiGoc` để tinh chỉnh parser

---

## PHỤ LỤC A: XỬ LÝ SỰ CỐ THƯỜNG GẶP

| Triệu chứng | Nguyên nhân thường gặp | Cách xử lý |
|---|---|---|
| `gradlew` báo lỗi JDK/JAVA_HOME | Sai phiên bản Java | Cài JDK 17, đặt JAVA_HOME trỏ đúng |
| `adb devices` không thấy máy | Chưa bật USB Debugging / thiếu driver | Bật lại gỡ lỗi USB, đổi cáp, cài driver hãng máy |
| App trắng màn hình khi mở | Sai đường dẫn file trong www/ | Dùng đường dẫn tương đối `./js/app.js`, xem log bằng `npx cap run android -l` |
| Micro không chạy trong APK | Thiếu quyền RECORD_AUDIO / chưa requestPermissions | Kiểm tra AndroidManifest + gọi xin quyền trước khi nghe |
| Nói không ra chữ | Máy chưa có Google app / thiếu gói tiếng Việt | Cập nhật Google app, tải gói vi-VN offline |
| Build release báo lỗi ký | Sai đường dẫn keystore/mật khẩu | Kiểm tra đường dẫn tương đối trong build.gradle |
| Mất dữ liệu sau khi cài đè | Đổi ID app hoặc gỡ app rồi cài lại | Không đổi appId; luôn cài đè; dùng sao lưu JSON |

## PHỤ LỤC B: QUY TRÌNH LÀM VIỆC VỚI AI HIỆU QUẢ

1. **Mỗi lần chỉ nhờ 1 việc nhỏ** (1 màn hình, 1 hàm) — không nhờ "viết cả app".
2. **Luôn gửi kèm file liên quan** và yêu cầu "chỉ sửa chỗ cần, đánh dấu bằng comment".
3. **Bắt AI viết test trước** với parser (bảng 1.4) — sửa gì cũng phải chạy lại test.
4. **Dán nguyên văn lỗi** + hệ điều hành + lệnh vừa chạy khi hỏi lỗi.
5. **Commit Git sau mỗi bước chạy được** (`git init` ngay từ đầu; mỗi buổi tối `git add -A && git commit -m "xong màn thống kê"`) — hỏng còn quay lại được.
6. Lưu 1 file `GHI-CHU.md` ghi lại các quyết định (ID app, mật khẩu keystore để đâu, lệnh hay dùng) — AI không nhớ giữa các phiên, file này thay trí nhớ. Nếu file có mật khẩu/token thì phải nằm trong `.gitignore`.

## PHỤ LỤC C: ĐỒNG BỘ SUPABASE — SETUP TỰ ĐỘNG BẰNG CLI + AI

Mục tiêu: mẹ ghi ở quán → dữ liệu tự đẩy lên Supabase khi có mạng → bạn xem doanh thu từ xa. Toàn bộ schema database được quản lý bằng **file migration SQL** trong project, để AI viết được, Git lưu được, và chạy lại được trên project mới nếu cần.

### C.1. Chuẩn bị (làm tay 1 lần, ~10 phút — phần duy nhất CLI không tự làm được)

1. Tạo tài khoản tại supabase.com → **New project** (chọn region *Southeast Asia (Singapore)* cho nhanh) → đặt **Database Password** và lưu lại.
2. Lấy 3 thứ, ghi vào file `GHI-CHU.md`:
   - **Project Ref** (chuỗi trong URL dashboard, dạng `abcdefghijk`)
   - **Project URL** và **anon key** (Settings → API) — anon key được phép nằm trong app
   - **Personal Access Token** cho CLI (Account → Access Tokens → Generate)
3. Trong Dashboard → **Authentication → Sign In / Up**: **tắt "Allow new users to sign up"** (chặn người lạ tự tạo tài khoản), rồi vào **Users → Add user** tạo 1 tài khoản gia đình duy nhất, ví dụ `me@giadinh.vn` + mật khẩu. Cả máy mẹ và máy bạn đăng nhập chung tài khoản này, mỗi máy chỉ đăng nhập 1 lần (session tự lưu).

**Quy tắc an toàn:** thứ duy nhất nằm trong code app là **Project URL + anon key**. KHÔNG BAO GIỜ đưa `service_role key` hay Database Password vào code app hoặc dán cho công cụ AI chạy tự động.

### C.2. Cài Supabase CLI và kết nối project

Chạy trong thư mục `quan-nuoc-mia/`:

```bash
npm install supabase --save-dev
npx supabase login            # dán Personal Access Token khi được hỏi
npx supabase init             # sinh thư mục supabase/ trong project
npx supabase link --project-ref <PROJECT_REF>   # nhập Database Password khi hỏi
```

Sau bước này, quy trình chuẩn mỗi lần thay đổi database chỉ còn 3 lệnh — và đây chính là chỗ AI tự làm:

```bash
npx supabase migration new <ten_thay_doi>   # tạo file SQL rỗng trong supabase/migrations/
# → nhờ AI viết SQL vào file vừa tạo
npx supabase db push                        # đẩy lên project thật
```

### C.3. Migration đầu tiên: bảng giao dịch + RLS (đưa nguyên khối này cho AI)

Chạy `npx supabase migration new tao_bang_giao_dich`, rồi dán SQL sau vào file vừa sinh ra trong `supabase/migrations/`:

```sql
-- Bảng giao dịch: id dùng chính Date.now() từ app để idempotent khi sync lại
create table public.giao_dich (
  id          bigint primary key,
  user_id     uuid not null default auth.uid(),
  device_id   text,
  ngay        date not null,
  gio         text,
  loai        text not null check (loai in ('thu','chi')),
  so_tien     integer not null check (so_tien > 0),
  danh_muc    text,
  ghi_chu     text,
  cau_noi_goc text,
  da_sua_tay  boolean default false,
  created_at  timestamptz default now()
);

-- Bật Row Level Security: bắt buộc, vì anon key nằm trong APK
alter table public.giao_dich enable row level security;

create policy "chu_tai_khoan_doc" on public.giao_dich
  for select to authenticated using (user_id = auth.uid());

create policy "chu_tai_khoan_ghi" on public.giao_dich
  for insert to authenticated with check (user_id = auth.uid());

create policy "chu_tai_khoan_sua" on public.giao_dich
  for update to authenticated using (user_id = auth.uid());

create policy "chu_tai_khoan_xoa" on public.giao_dich
  for delete to authenticated using (user_id = auth.uid());

create index idx_giao_dich_user_ngay on public.giao_dich (user_id, ngay);
```

Rồi chạy `npx supabase db push`. Kiểm tra: vào Dashboard → Table Editor thấy bảng `giao_dich` có biểu tượng khiên RLS là đạt.

### C.4. Code phía app: hàng đợi đồng bộ local-first

```bash
npm install @supabase/supabase-js
```

Nguyên tắc: mỗi giao dịch trong máy có thêm cờ `daSync: false`. App KHÔNG BAO GIỜ chờ mạng khi lưu — lưu local xong là xong với người dùng; việc đẩy lên Supabase chạy ngầm.

Tạo file `js/sync.js` với logic:

1. Khởi tạo client với Project URL + anon key; đăng nhập bằng `signInWithPassword` **một lần duy nhất** (màn hình đăng nhập chỉ hiện khi chưa có session — mẹ không bao giờ phải thấy nó lần 2).
2. Hàm `dongBo()`: lấy tất cả giao dịch `daSync = false` → `supabase.from('giao_dich').upsert(danhSach, { onConflict: 'id', ignoreDuplicates: true })` → thành công thì đánh dấu `daSync = true` và lưu lại local.
3. Gọi `dongBo()` tại 3 thời điểm: sau mỗi lần lưu giao dịch, khi app mở lên, và khi có mạng trở lại (`window.addEventListener('online', dongBo)`).
4. Xóa/sửa giao dịch: sửa local trước, rồi gọi `delete`/`update` lên Supabase kèm cơ chế thử lại tương tự.

Prompt mẫu cho AI:

> "Viết file `sync.js` cho app Capacitor dùng `@supabase/supabase-js`. Dữ liệu local do `db.js` quản lý (dán kèm file). Yêu cầu: local-first — lưu local luôn thành công tức thì, đồng bộ chạy ngầm; hàng đợi dựa trên cờ `daSync`; dùng `upsert` với `onConflict: 'id'` để chạy lại không bị trùng; tự đồng bộ khi mở app, sau khi lưu, và khi có mạng lại; export hàm `dangNhap(email, matKhau)`, `daDangNhap()`, `dongBo()`. Bảng Supabase tên `giao_dich` với các cột: [dán schema C.3]. Lưu ý tên cột SQL là snake_case (`so_tien`) còn object local là camelCase (`soTien`) — viết hàm chuyển đổi."

### C.5. Trang xem từ xa cho bạn (chủ quán)

Giai đoạn đầu chưa cần code gì: vào **Dashboard → Table Editor / SQL Editor** xem trực tiếp. Ví dụ query doanh thu theo ngày:

```sql
select ngay,
       sum(so_tien) filter (where loai = 'thu') as tong_thu,
       sum(so_tien) filter (where loai = 'chi') as tong_chi
from giao_dich
group by ngay order by ngay desc;
```

Khi muốn tiện hơn, nhờ AI viết 1 trang `bao-cao.html` (chạy trên máy tính/điện thoại của bạn, cũng đăng nhập tài khoản gia đình) đọc dữ liệu bằng `select` và vẽ biểu đồ Chart.js — khoảng 100 dòng code.

### C.6. Những điều phải nhớ với gói miễn phí

- Project **tự tạm dừng sau ~7 ngày không có hoạt động** → quán nghỉ Tết dài thì vào dashboard bấm Restore. App vẫn ghi local bình thường trong lúc đó, có lại thì sync bù.
- App phải chịu được mọi lỗi mạng/Supabase mà **không làm phiền mẹ** — lỗi sync chỉ ghi log và hiện 1 chấm nhỏ "chưa đồng bộ", không hiện popup.
- Backup JSON thủ công (Tầng 2, mục 4.3) vẫn giữ — Supabase là tiện theo dõi, không phải nơi duy nhất giữ dữ liệu.

### C.7. Checklist nghiệm thu phần Supabase

- [ ] `npx supabase db push` chạy sạch, bảng hiện trên dashboard kèm khiên RLS
- [ ] Đăng nhập 1 lần trên máy test, tắt mở app không phải đăng nhập lại
- [ ] Ghi 5 giao dịch khi CÓ mạng → thấy ngay trên Table Editor
- [ ] Bật chế độ máy bay, ghi 5 giao dịch → app vẫn mượt → bật mạng lại → 5 bản ghi tự xuất hiện trên dashboard, không trùng lặp
- [ ] Chạy sync 2 lần liên tiếp → số dòng trên Supabase không tăng (upsert idempotent)
- [ ] Mở trình duyệt ẩn danh, dùng anon key gọi `select` KHÔNG đăng nhập → bị RLS chặn, trả về rỗng

---

## PHỤ LỤC D: PHƯƠNG ÁN THAY THẾ — FLUTTER

Chỉ cân nhắc nếu: cần hiệu năng cao hơn, muốn học nghiêm túc mobile, hoặc Capacitor trục trặc.
- Ưu: 1 codebase ra cả Android + iOS, plugin `speech_to_text` rất ổn định, UI mượt.
- Nhược: phải học Dart; AI viết Dart tốt nhưng bạn khó tự đọc/sửa hơn JS; không tái dùng prototype.
- Đường đi: cài Flutter SDK → `flutter create` → plugin `speech_to_text` + `sqflite` + `fl_chart` → `flutter build apk --release`.

---

*Nguyên tắc xuyên suốt: mỗi giai đoạn phải chạy được và có thứ cầm nắm được (web chạy → APK cài được → giọng nói chạy → mẹ dùng thật) trước khi sang giai đoạn sau. Rủi ro lớn nhất vẫn là độ chính xác giọng nói với giọng của mẹ tại quán ồn — vì vậy GĐ 3 được test sớm nhất có thể, trước khi đầu tư nhiều vào GĐ 4.*
