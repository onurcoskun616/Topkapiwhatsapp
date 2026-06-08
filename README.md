# Topkapı Okulları — WhatsApp Kayıt İletişim Merkezi

WhatsApp üzerinden gelen veli görüşmelerini operatörlerin tek panelden yönettiği,
yapay zekânın görüşmeleri analiz edip yanıt taslağı ürettiği ve tüm sürecin
raporlandığı kayıt yönetim sistemi.

> **Claude Code ile çalışıyorsanız:** Önce `CLAUDE.md` dosyasını okuyun. Tüm proje
> bağlamı, mimari ve adım adım kurulum yol haritası oradadır.

## Klasör Yapısı

```
CLAUDE.md            Devir promptu — projenin tam bağlamı ve yol haritası
db/schema.sql        Supabase veritabanı şeması
backend/             Node.js + Express backend (WhatsApp webhook, API, OpenAI)
panel/               React (Vite) operatör paneli
panel-mevcut.jsx     Mevcut çalışan panel (referans)
```

## Hızlı Başlangıç (özet — detay CLAUDE.md'de)

### 1. Veritabanı (Supabase)
- supabase.com'da proje aç (Region: Frankfurt).
- `db/schema.sql`'i SQL Editor'da çalıştır.
- URL ve service_role anahtarını not al.

### 2. Backend
```bash
cd backend
npm install
cp .env.example .env      # değerleri doldur
npm run dev               # http://localhost:3000/health
```

### 3. Panel
```bash
cd panel
npm install
cp .env.example .env      # VITE_API_URL'i backend adresine ayarla
npm run dev               # http://localhost:5173
```

### 4. Canlıya alma
- Backend → Railway (7/24 açık, webhook için şart)
- Panel → Netlify (statik)
- WhatsApp → Meta Cloud API webhook'unu Railway adresine bağla
- OpenAI → anahtarı backend `.env`'ine koy

## Önemli Güvenlik Notu

OpenAI ve WhatsApp API anahtarları **yalnızca backend `.env` dosyasında** durur.
Asla panele/HTML'e veya git'e konmaz (`.gitignore` ile korunur).

## Teknoloji

Supabase (PostgreSQL) · Node.js/Express · OpenAI · Meta WhatsApp Cloud API ·
React + Vite · Railway · Netlify
