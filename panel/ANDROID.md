# Android APK (Capacitor)

Bu panel, Capacitor ile sarmalanarak Android APK'ya dönüştürülebilir
(Play Store'a yüklemeye gerek yok — APK doğrudan telefona kurulabilir).

## Gereksinimler (kendi bilgisayarında)

- Node.js (zaten panel için kurulu)
- [Android Studio](https://developer.android.com/studio) (Android SDK ile birlikte gelir)

## Kurulum / Build adımları

```bash
cd panel
npm install

# (varsa) gerçek backend adresini ayarla
echo "VITE_API_URL=https://<railway-backend-adresin>" > .env

# Web build + android projesine kopyala
npm run android:sync
```

İlk seferde Android projesini Android Studio ile açıp gradle/SDK
indirmelerinin tamamlanmasını sağla:

```bash
npm run android:open
```

Android Studio açıldıktan sonra sağ üstten **Build > Build APK(s)** veya
sağdaki Gradle panelinden `app > Tasks > build > assembleDebug` çalıştır.

Alternatif olarak terminalden (Android SDK kurulu ve `ANDROID_HOME` ayarlıysa):

```bash
npm run android:apk
```

Üretilen APK:
```
panel/android/app/build/outputs/apk/debug/app-debug.apk
```

Bu dosyayı telefona kopyalayıp (WhatsApp/Drive/USB ile) açarak kurabilirsin.
Telefonda "Bilinmeyen kaynaklardan yükleme" iznini açman gerekir.

## Notlar

- `capacitor.config.json` içindeki `appId` ve `appName` uygulama kimliğini belirler.
- Backend adresi değiştiğinde `.env` dosyasındaki `VITE_API_URL`'i güncelleyip
  `npm run android:sync` ile tekrar senkronize et.
- Uygulama ikonunu/splash ekranını değiştirmek istersen
  [@capacitor/assets](https://github.com/ionic-team/capacitor-assets) paketini kullanabilirsin.
