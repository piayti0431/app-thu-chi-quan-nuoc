# App Thu Chi Quan Nuoc Mia

App HTML/CSS/JS thuan, dong goi Android bang Capacitor va dong bo tuy chon qua Supabase.

## Chay web local

```bash
npm install
npm start
```

Mo `http://127.0.0.1:4173`.

## Supabase CLI setup

Supabase da duoc khoi tao bang CLI trong folder `supabase/`, migration dau tien nam trong `supabase/migrations/`.

Khi da co Project Ref, Personal Access Token va Database Password:

```powershell
rtk powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\setup-supabase.ps1 -ProjectRef <PROJECT_REF>
```

Script se chay:

```bash
npx supabase login
npx supabase link --project-ref <PROJECT_REF>
npx supabase db push
```

Trong app, vao `Cai dat` de nhap Project URL, anon key, email va mat khau tai khoan gia dinh.

## Android APK

```bash
npm run cap:add:android
npm run cap:sync
npx cap run android
```

Build debug APK:

```bash
cd android
.\gradlew.bat assembleDebug
```

Hoac dung script da set san JDK/Android SDK:

```powershell
rtk powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\build-debug-apk.ps1
```

Chay may ao Android:

```powershell
rtk powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\start-emulator.ps1
```

Cai va mo app tren emulator dang chay:

```powershell
rtk powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\install-on-emulator.ps1
```
