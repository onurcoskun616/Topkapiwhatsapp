-- ============================================================
-- Topkapı WhatsApp Kayıt Merkezi — Supabase / PostgreSQL Şeması
-- Supabase > SQL Editor'a yapıştırıp "Run" deyin.
-- ============================================================

-- Operatörler
create table if not exists operators (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text unique,
  role        text not null default 'operator',   -- 'admin' | 'operator'
  campus      text,                                -- atanan kampüs (opsiyonel)
  created_at  timestamptz default now()
);

-- Veliler / Görüşmeler (lead)
create table if not exists leads (
  id              uuid primary key default gen_random_uuid(),
  wa_id           text unique not null,            -- WhatsApp telefon kimliği (ör. 905xxxxxxxxx)
  name            text,                            -- veli/öğrenci adı
  parent_name     text,                            -- veli adı soyadı (LLM/operatör doldurur)
  student_name    text,                            -- öğrenci adı soyadı (LLM/operatör doldurur)
  phone           text,
  campus          text,                            -- İkitelli OSB | İstanbul OSB | Esenyurt | Kıraç | Çorlu
  source          text,                            -- mecra: WhatsApp Reklam | Web Sitesi | Instagram | Tavsiye
  department      text,                            -- Otomotiv | Makine | Mekatronik | Elektrik-Elektronik | Kimya | Biyomedikal | İnşaat
  grade           text,                            -- 9. Sınıf .. 12. Sınıf
  stage           text not null default 'yeni',    -- yeni | olumlu | olumsuz | randevu | kayit
  ai_score        int default 0,                   -- kayıt eğilim skoru 0-100
  ai_summary      text,
  ai_next         text,
  ai_evaluated    boolean default false,           -- aşamayı AI mı belirledi
  ai_enabled      boolean default true,            -- bu görüşmede LLM aktif mi
  ai_mode         text default 'auto',             -- 'auto' (kendi gönderir) | 'draft' (öneri)
  ai_draft        text,                            -- bekleyen AI taslağı
  operator_id     uuid references operators(id),
  started_at      timestamptz default now(),       -- sohbetin başladığı an
  registered_at   timestamptz,                     -- kayıt olduğu an (stage=kayit olunca)
  last_message_at timestamptz default now(),
  created_at      timestamptz default now()
);

-- Mesajlar
create table if not exists messages (
  id            uuid primary key default gen_random_uuid(),
  lead_id       uuid not null references leads(id) on delete cascade,
  direction     text not null,                     -- 'in' (veliden) | 'out' (operatör/AI)
  body          text,
  type          text default 'text',               -- text | image | document | video
  media_url     text,
  by_ai         boolean default false,             -- AI mı gönderdi
  follow_up_sent boolean default false,            -- bu mesaj için hatırlatma gönderildi mi
  wa_message_id text,                               -- Meta mesaj kimliği
  created_at    timestamptz default now()
);

-- Randevular
create table if not exists appointments (
  id            uuid primary key default gen_random_uuid(),
  lead_id       uuid not null references leads(id) on delete cascade,
  scheduled_at  timestamptz not null,
  confirmed     boolean default false,
  reminder_sent boolean default false,             -- 1 gün önce bildirim gönderildi mi
  created_at    timestamptz default now()
);

-- Aşama değişiklik geçmişi (raporlama için kritik)
create table if not exists status_log (
  id          uuid primary key default gen_random_uuid(),
  lead_id     uuid not null references leads(id) on delete cascade,
  old_stage   text,
  new_stage   text,
  changed_by  text,                                -- 'ai' | 'operator'
  created_at  timestamptz default now()
);

-- Hazır şablon yanıtlar
create table if not exists templates (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  body          text not null,
  meta_name     text,                              -- Meta onaylı template adı (24 saat kuralı dışı gönderim için)
  created_at    timestamptz default now()
);

-- Medya kütüphanesi
create table if not exists media (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  type        text not null,                       -- image | document | video
  storage_url text,
  created_at  timestamptz default now()
);

-- ---------- İndeksler (performans) ----------
create index if not exists idx_leads_stage       on leads(stage);
create index if not exists idx_leads_campus      on leads(campus);
create index if not exists idx_leads_started      on leads(started_at);
create index if not exists idx_messages_lead     on messages(lead_id);
create index if not exists idx_messages_created   on messages(created_at);
create index if not exists idx_status_log_lead   on status_log(lead_id);
create index if not exists idx_appointments_date on appointments(scheduled_at);

-- ---------- Aşama değişince otomatik log + kayıt tarihi ----------
create or replace function log_stage_change() returns trigger as $$
begin
  if new.stage is distinct from old.stage then
    insert into status_log(lead_id, old_stage, new_stage, changed_by)
    values (new.id, old.stage, new.stage,
            case when new.ai_evaluated then 'ai' else 'operator' end);
    if new.stage = 'kayit' and new.registered_at is null then
      new.registered_at := now();
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_stage_change on leads;
create trigger trg_stage_change
  before update on leads
  for each row execute function log_stage_change();

-- ---------- Başlangıç verisi (örnek operatör + şablonlar) ----------
insert into operators(name, email, role) values
  ('Yönetici', 'admin@topkapi.example', 'admin')
on conflict (email) do nothing;

insert into templates(title, body) values
  ('Karşılama', 'Merhaba 👋 Topkapı Mesleki ve Teknik Anadolu Lisesi''ne hoş geldiniz. Hangi bölüm ve sınıf düzeyi için bilgi almak istersiniz?'),
  ('Bölümler', 'Bölümlerimiz: Otomotiv, Makine, Mekatronik, Elektrik-Elektronik, Kimya, Biyomedikal ve İnşaat. Hangisine ilgi duyuyorsunuz?'),
  ('Ücret bilgisi', 'Ücret ve size özel burs oranımız öğrencinin başarı durumuna göre belirleniyor. Kısa bir görüşme için uygun olduğunuz gün/saati paylaşır mısınız?'),
  ('Servis', 'Servis güzergahlarımız geniş bir bölgeyi kapsıyor. Adresinizi (mahalle/ilçe) paylaşırsanız en yakın güzergahı iletelim.'),
  ('Randevu daveti', 'Sizi kampüsümüzde ağırlamak isteriz 🏫 Atölyelerimizi gezmek için bu hafta hangi gün uygun olur?'),
  ('Belgeler', 'Kayıt için: öğrenci nüfus cüzdanı fotokopisi, 2 vesikalık, önceki karne/diploma ve veli kimlik fotokopisi gerekiyor 📄')
on conflict do nothing;

-- NOT: Üretimde Row Level Security (RLS) politikaları eklenmelidir.
-- Başlangıçta backend service_role anahtarı kullandığı için RLS bypass edilir.
