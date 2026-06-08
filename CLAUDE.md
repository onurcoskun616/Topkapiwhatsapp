# Topkapı Okulları — WhatsApp Kayıt İletişim Merkezi

> Bu dosya Claude Code için hazırlanmış devir (handoff) promptudur. Projenin
> ne olduğunu, neyin halihazırda yapıldığını ve canlıya almak için sırayla neyin
> kurulması gerektiğini eksiksiz anlatır. Bu dosyayı bir kez tamamen oku, sonra
> "Yol Haritası" bölümündeki adımları sırayla uygula.

---

## 1. Proje Amacı

Topkapı **Mesleki ve Teknik Anadolu Lisesi** (5 kampüs: İkitelli OSB, İstanbul OSB,
Esenyurt, Kıraç, Çorlu) için bir **WhatsApp tabanlı kayıt iletişim merkezi**.

Sorun: Yeni kayıt için çok sayıda veli WhatsApp'tan yazıyor; telefonla tek tek
dönmek ve süreci raporlamak zor.

Çözüm: Operatörlerin tek panelden tüm veli görüşmelerini yönettiği, AI'ın
görüşmeleri analiz edip yanıt taslağı ürettiği ve tüm sürecin raporlandığı bir sistem.

### Bölümler (meslek lisesi)
Otomotiv, Makine, Mekatronik, Elektrik-Elektronik, Kimya, Biyomedikal, İnşaat

### Sınıf kademeleri
9, 10, 11, 12. Sınıf

---

## 2. Özellikler (panelde HALİHAZIRDA tasarlanmış — `panel-mevcut.jsx`)

Mevcut panel React (tek dosya, demo veriyle) olarak çalışıyor. Canlı sisteme
bu özellikleri **gerçek backend'e bağlayarak** taşıyacağız:

1. **Gelen Kutusu (Inbox):** WhatsApp benzeri canlı sohbet arayüzü. Solda veli
   listesi (okunmamış rozeti, AI sıcaklık etiketi, aşama), ortada sohbet.
2. **Hazır şablon yanıtlar:** Karşılama, ücret, servis, randevu, burs, belgeler.
   Tek tıkla gönderim.
3. **Medya kütüphanesi:** Önceden yüklenmiş broşür/görsel/video, tek tıkla paylaşım.
4. **Tek "Aşama" alanı (birleşik durum):** Yeni / Olumlu / Olumsuz / Randevu / Kayıt.
   - Konuşma ilk geldiğinde (tek mesaj) otomatik **Yeni**.
   - Sonraki mesajlara göre LLM aşamayı belirler (yanında "AI" rozeti).
   - Operatör elle değiştirebilir (değiştirince AI rozeti kalkar).
5. **Bölüm & Sınıf:** Operatör seçer; LLM görüşmeden otomatik doldurabilir ("AI" rozeti).
6. **Randevu + teyit:** Tarih/saat atanır. Randevudan **1 gün önce** operatöre
   bildirim (üstteki çan ikonunda), operatör "Teyit Et" der.
7. **LLM analiz (her görüşme):** Sıcaklık (Sıcak/Ilık/Soğuk), kayıt eğilim skoru (%),
   aşama önerisi, konuşma özeti, sonraki adım önerisi.
8. **LLM yanıt — iki mod (operatör başına seçilir):**
   - **Otomatik:** AI yanıtı doğrudan veliye gönderir.
   - **Taslak:** AI yanıt önerir, operatör onaylayıp gönderir.
   - **AI Aç/Kapa:** Operatör bir görüşmede LLM'i tamamen devre dışı bırakabilir.
9. **Raporlar (günlük/haftalık/aylık/yıllık periyot seçici):**
   - KPI'lar: toplam konuşma, bugün yeni, olumlu/potansiyel, randevu, kayıt,
     dönüşüm %, ortalama yanıt süresi, hızlı dönüş oranı (<15 dk).
   - Dönüşüm hunisi: konuşma → olumlu → randevu → kayıt.
   - Mecra dağılımı (hangi kanaldan kaç görüşme).
   - Bölüm talebi dağılımı.
   - Değerlendirme/aşama dağılımı.
   - Operatör performans tablosu (konuşma, kayıt, dönüşüm, ort. yanıt).
   - **Günlük yeni görüşme grafiği — son 30 gün** (bar chart).
   - **Haftanın günü kırılımı:** en çok sohbet başlatılan gün + en çok kayıt
     alınan gün, ve 30 günde en çok kayıt alınan tekil tarih.

### LLM yanıt politikası (sağlayıcı: OpenAI)
- Sağlayıcı: **OpenAI** (varsayılan model `gpt-4o-mini`, maliyet için).
- API anahtarı **ASLA** frontend'e/HTML'e yazılmaz. Sadece backend'de env değişkeni.

---

## 3. Hedef Mimari

```
Veli (WhatsApp)
   │
   ▼
Meta WhatsApp Cloud API  ──webhook──►  BACKEND (Node.js / Express, Railway)
                                          │   │
                                          │   ├── Supabase (PostgreSQL) — kalıcı veri
                                          │   ├── OpenAI API — analiz + yanıt
                                          │   └── REST + WebSocket → PANEL (operatör arayüzü)
                                          ▼
                              Operatörler paneli (React, Netlify)
```

Bileşenler:
- **Veritabanı:** Supabase (PostgreSQL). Ücretsiz başlar.
- **Backend:** Node.js + Express, Railway'de host. 7/24 açık (webhook için şart).
- **Realtime:** Supabase Realtime *veya* Socket.IO ile panele anlık mesaj iletimi.
- **WhatsApp:** Meta Cloud API (doğrudan Meta, BSP aracısı yok).
- **AI:** OpenAI API (anahtar backend env'de).
- **Panel:** React (mevcut `panel-mevcut.jsx` temel alınır), Vite ile build, Netlify.

---

## 4. Veritabanı Şeması (Supabase — `db/schema.sql` dosyasını uygula)

Tablolar: `operators`, `leads` (veli/görüşme), `messages`, `appointments`,
`status_log`, `templates`, `media`. Tam SQL `db/schema.sql` dosyasında. Şema özeti:

- **leads:** veli adı, telefon (wa_id), kampüs, kaynak (mecra), bölüm, sınıf,
  aşama (yeni/olumlu/olumsuz/randevu/kayit), ai_score, ai_summary, ai_next,
  ai_evaluated (bool), ai_enabled (bool), ai_mode (auto/draft), atanan operatör,
  started_at, registered_at, last_message_at.
- **messages:** lead_id, yön (in/out), içerik, tip (text/image/document/video),
  by_ai (bool), wa_message_id, created_at.
- **appointments:** lead_id, tarih, confirmed (bool), reminder_sent (bool).
- **status_log:** lead_id, eski_asama, yeni_asama, kim (operator/ai), created_at
  (raporlama ve "ne zaman hangi aşamaya geçti" için).
- **operators:** ad, e-posta, rol (admin/operator), atanan kampüs.
- **templates:** başlık, içerik, (Meta onaylı template adı — opsiyonel).
- **media:** ad, tip, storage_url.

---

## 5. Backend API Uçları (kurulacak — `backend/`)

```
POST   /webhook              Meta'dan gelen mesajları alır (WhatsApp Cloud API)
GET    /webhook              Meta webhook doğrulama (hub.challenge)
GET    /api/leads            Tüm görüşmeler (filtre: kampüs, aşama, tarih)
GET    /api/leads/:id        Tek görüşme + mesaj geçmişi
PATCH  /api/leads/:id        Aşama/bölüm/sınıf/ai_mode/ai_enabled güncelle
POST   /api/leads/:id/send   Veliye mesaj gönder (operatör veya onaylı AI taslağı)
POST   /api/leads/:id/analyze   LLM ile görüşmeyi analiz et, alanları doldur
POST   /api/leads/:id/reply     LLM yanıt üret (auto→gönder / draft→döndür)
GET    /api/appointments/pending  Yarınki teyit bekleyen randevular
PATCH  /api/appointments/:id/confirm  Randevu teyidi
GET    /api/templates        Şablonlar
GET    /api/media            Medya kütüphanesi
GET    /api/reports          Raporlama metrikleri (periyot parametreli)
```

Realtime: yeni mesaj gelince panele WebSocket/Realtime ile push.

---

## 6. Çevre Değişkenleri (`.env` — `.env.example` örnek alın)

```
# Supabase
SUPABASE_URL=
SUPABASE_SERVICE_KEY=        # service_role key (sadece backend)

# WhatsApp Cloud API (Meta)
WHATSAPP_TOKEN=              # kalıcı access token
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_VERIFY_TOKEN=       # webhook doğrulama için kendi belirlediğiniz gizli dize
WHATSAPP_BUSINESS_ACCOUNT_ID=

# OpenAI
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini

# Sunucu
PORT=3000
PANEL_ORIGIN=               # Netlify panel adresi (CORS için)
```

> GÜVENLİK: Bu dosya asla git'e commit edilmez (.gitignore'da). OpenAI ve
> WhatsApp anahtarları yalnızca backend'de durur, frontend'e geçmez.

---

## 7. LLM Sistem Promptu

LLM'in nasıl davranacağı `backend/prompts/system-prompt.md` dosyasında.
Taslak halde hazırlandı; kullanıcıyla (Onur) birlikte gözden geçirilip
gerçek okul bilgileriyle (ücret aralıkları, burs koşulları, kampüs detayları)
zenginleştirilecek. İki görev için kullanılır:
1. **Analiz:** Görüşmeyi okuyup JSON döndürür (department, grade, stage, score,
   summary, next).
2. **Yanıt:** Veli mesajına okul danışmanı kimliğiyle Türkçe cevap üretir.

---

## 8. YOL HARİTASI — sırayla uygula, her adım test edilebilir

> Kullanıcı (Onur) teknik adımları rehberle kendisi uygulayacak. Her adımda
> NE yapılacağını net söyle, gereken kodu/dosyayı üret, "şunu yapıp bana sonucu
> söyle" de. Bir adım çalışmadan diğerine geçme.

### Adım 0 — Proje iskeleti
- Bu paketteki `backend/` ve `panel/` klasörlerini kur.
- `npm install` çalıştır. `.env.example`'ı `.env`'e kopyala.

### Adım 1 — Supabase (veritabanı)
- Kullanıcı supabase.com'da proje açtı (Region: Frankfurt).
- `db/schema.sql`'i Supabase SQL Editor'da çalıştır → tablolar oluşsun.
- `SUPABASE_URL` ve `SUPABASE_SERVICE_KEY`'i `.env`'e ekle.
- Test: backend'den basit bir `SELECT` ile bağlantıyı doğrula.

### Adım 2 — Backend ayağa kaldırma (lokal)
- `backend/`'i lokal çalıştır (`npm run dev`), `GET /health` → 200 dönsün.
- `/api/leads` boş dizi dönsün (Supabase bağlı).

### Adım 3 — Railway deploy
- Railway'de yeni proje, GitHub reposunu bağla *veya* CLI ile deploy.
- Env değişkenlerini Railway paneline gir.
- Canlı URL al (örn. `https://topkapi-xxx.up.railway.app`). `/health` dışarıdan açılsın.

### Adım 4 — WhatsApp Cloud API
- Meta Business hesabı VAR (Onur'un erişimi var).
- developers.facebook.com → uygulama → WhatsApp ürünü ekle.
- Test numarası al; `WHATSAPP_PHONE_NUMBER_ID`, geçici token'ı `.env`'e koy.
- Webhook'u Railway URL'ine bağla: `https://.../webhook`, verify token eşleşsin.
- Test: kendi telefonundan test numarasına yaz → backend log'da mesajı gör →
  Supabase `messages` tablosuna düşsün.
- Sonra: kalıcı (permanent) token üret.

### Adım 5 — OpenAI
- platform.openai.com'dan API anahtarı al, `.env`'e koy.
- `system-prompt.md`'yi gözden geçir, okul bilgileriyle doldur.
- `/api/leads/:id/analyze` ve `/reply` uçlarını gerçek OpenAI'a bağla.
- Test: bir görüşmede analiz çalışsın, aşama/skor dolsun; taslak yanıt üretsin.

### Adım 6 — Panel bağlama
- `panel-mevcut.jsx`'teki demo veri üretimini (`buildConvos`) kaldır.
- Veriyi backend API'den çek (`/api/leads` vb.). Realtime aboneliği ekle.
- LLM modülündeki `proxyUrl`'i backend adresine ayarla.
- Şablon/medya gönderimini gerçek `/send` ucuna bağla.

### Adım 7 — Panel yayını
- `panel/`'i Vite ile build et, Netlify'a deploy et.
- CORS için backend `PANEL_ORIGIN`'e Netlify adresini ekle.
- Operatör girişi (Supabase Auth ile basit e-posta/şifre).

### Adım 8 — Otomasyonlar
- Randevu hatırlatma: günlük cron (Railway cron veya Supabase scheduled function)
  → yarınki randevuları bul → operatöre bildirim işaretle.
- Yeni mesaj geldiğinde: `ai_enabled` ise otomatik analiz; `ai_mode=auto` ise
  otomatik yanıt, `draft` ise taslak üretip beklet.

---

## 9. Çalışma Tarzı Tercihleri (kullanıcı: Onur)

- Türkçe konuş, açık ve adım adım ilerle.
- Tam rewrite yerine hedefli, küçük değişiklikler yap.
- Her adımı tek tek doğrulat ("şunu yap, sonucu söyle").
- Tek dosya / taşınabilir çözümler kullanıcının hoşuna gider ama bu proje
  backend gerektirdiği için çok parçalı; bunu net anlat.
- Güvenlik kritik: API anahtarları asla frontend'e konmaz.

---

## 10. Bu Paketteki Dosyalar

```
CLAUDE.md                      ← bu dosya (devir promptu)
README.md                      ← hızlı başlangıç
panel-mevcut.jsx               ← mevcut çalışan panel (React, demo veri) — referans/temel
db/schema.sql                  ← Supabase tablo şeması
backend/                       ← Node.js backend iskeleti
  package.json
  .env.example
  src/server.js                ← Express + uçlar (iskelet, TODO'lu)
  src/whatsapp.js              ← WhatsApp Cloud API yardımcıları (iskelet)
  src/openai.js                ← OpenAI analiz + yanıt (iskelet)
  src/supabase.js              ← Supabase istemci
  prompts/system-prompt.md     ← LLM sistem promptu (taslak)
panel/
  package.json
  vite.config.js
  index.html
  src/main.jsx                 ← panel giriş (panel-mevcut.jsx buraya taşınacak)
  src/api.js                   ← backend'e bağlanan fonksiyonlar (iskelet)
```

İlk iş: bu dosyayı okuduğunu ve Yol Haritası'nı anladığını belirt, sonra
**Adım 0**'dan başla. Kullanıcı Supabase projesini henüz yeni açıyor; Adım 1'e
geçmeden önce `db/schema.sql`'i birlikte gözden geçirin.
