import { config } from "dotenv";
config(); // .env varsa yükle, yoksa Railway env değişkenlerini kullan
// (rebuild tetiklemek için küçük yorum güncellemesi v2)
import express from "express";
import cors from "cors";
import { supabase } from "./supabase.js";
import { sendText, parseIncoming, getMediaInfo, downloadMedia } from "./whatsapp.js";
import { analyzeConversation, generateReply, generateFollowUp } from "./openai.js";
import { matchFaq } from "./faq.js";
import ExcelJS from "exceljs";

const app = express();
app.use(express.json());
app.use(cors({
  origin: (origin, cb) => cb(null, true),
  credentials: true,
}));

// Analiz sonucunu lead'e ve gerekirse randevu tablosuna işle
async function applyAnalysis(lead, analysis) {
  await supabase.from("leads").update({
    department: analysis.department || lead.department,
    grade: analysis.grade || lead.grade,
    parent_name: analysis.parent_name || lead.parent_name,
    student_name: analysis.student_name || lead.student_name,
    name: analysis.parent_name || lead.name,
    campus: analysis.campus || lead.campus,
    district: analysis.district || lead.district,
    stage: analysis.stage || lead.stage,
    ai_score: analysis.score ?? lead.ai_score,
    ai_summary: analysis.summary, ai_next: analysis.next,
    ai_evaluated: true,
  }).eq("id", lead.id);

  if (analysis.appointment_date) {
    const when = new Date(analysis.appointment_date);
    if (!isNaN(when.getTime())) {
      const { data: existing } = await supabase
        .from("appointments").select("id").eq("lead_id", lead.id)
        .eq("confirmed", false).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (existing) {
        await supabase.from("appointments").update({ scheduled_at: when.toISOString() }).eq("id", existing.id);
      } else {
        await supabase.from("appointments").insert({ lead_id: lead.id, scheduled_at: when.toISOString() });
      }
    }
  }
}

// ---------- Sağlık kontrolü ----------
app.get("/health", (_req, res) => res.json({ ok: true, ts: Date.now() }));

// ============================================================
// WHATSAPP WEBHOOK
// ============================================================

// Meta webhook doğrulama (kurulumda bir kez)
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

// Gelen mesajlar
app.post("/webhook", async (req, res) => {
  res.sendStatus(200); // Meta'ya hemen 200 dön
  const msg = parseIncoming(req.body);
  if (!msg) return;

  try {
    // Meta aynı mesajı birden fazla kez gönderebilir (retry) — daha önce işlendiyse atla
    if (msg.waMessageId) {
      const { data: existing } = await supabase
        .from("messages").select("id").eq("wa_message_id", msg.waMessageId).maybeSingle();
      if (existing) return;
    }

    // 1) Lead var mı, yoksa oluştur
    let { data: lead } = await supabase
      .from("leads").select("*").eq("wa_id", msg.waId).single();

    if (!lead) {
      const { data: created } = await supabase
        .from("leads")
        .insert({ wa_id: msg.waId, name: msg.name, phone: msg.waId, stage: "yeni" })
        .select().single();
      lead = created;
    }

    // 2) Mesajı kaydet
    await supabase.from("messages").insert({
      lead_id: lead.id, direction: "in", body: msg.text,
      type: msg.type, media_url: msg.mediaId || null, wa_message_id: msg.waMessageId,
    });
    await supabase.from("leads")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", lead.id);

    // 3) AI aktifse otomatik analiz + (mode'a göre) yanıt
    if (lead.ai_enabled) {
      const { data: msgs } = await supabase
        .from("messages").select("*").eq("lead_id", lead.id).order("created_at");

      // Sık sorulan sorular için OpenAI'a gitmeden hazır cevap dene
      const faqAnswer = matchFaq(msg.text);
      if (faqAnswer && lead.ai_mode === "auto") {
        await sendText(msg.waId, faqAnswer);
        await supabase.from("messages").insert({
          lead_id: lead.id, direction: "out", body: faqAnswer, by_ai: true,
        });
        return;
      }

      // analiz
      const analysis = await analyzeConversation(msgs);
      if (analysis) await applyAnalysis(lead, analysis);

      // yanıt
      const reply = await generateReply(msgs);
      if (lead.ai_mode === "auto") {
        await sendText(msg.waId, reply);
        await supabase.from("messages").insert({
          lead_id: lead.id, direction: "out", body: reply, by_ai: true,
        });
      } else {
        await supabase.from("leads").update({ ai_draft: reply }).eq("id", lead.id);
      }
    }
    // TODO: panele realtime push (Supabase Realtime otomatik yapar)
  } catch (e) {
    console.error("Webhook işleme hatası:", e.message);
  }
});

// ============================================================
// PANEL API
// ============================================================

// Görüşme listesi (filtreler: campus, stage, since)
app.get("/api/leads", async (req, res) => {
  let q = supabase.from("leads").select("*").order("last_message_at", { ascending: false });
  if (req.query.campus) q = q.eq("campus", req.query.campus);
  if (req.query.stage) q = q.eq("stage", req.query.stage);
  const { data, error } = await q;
  if (error) return res.status(500).json({ error: error.message });

  const ids = (data || []).map((l) => l.id);
  let appts = [];
  if (ids.length) {
    const { data: a } = await supabase.from("appointments").select("*").in("lead_id", ids).order("scheduled_at", { ascending: false });
    appts = a || [];
  }
  let lastDirByLead = {};
  if (ids.length) {
    const { data: msgs } = await supabase
      .from("messages").select("lead_id, direction, created_at").in("lead_id", ids)
      .order("created_at", { ascending: false });
    for (const m of msgs || []) {
      if (!(m.lead_id in lastDirByLead)) lastDirByLead[m.lead_id] = m.direction;
    }
  }
  const result = (data || []).map((l) => ({
    ...l,
    appointment: appts.find((a) => a.lead_id === l.id) || null,
    last_direction: lastDirByLead[l.id] || null,
  }));
  res.json(result);
});

// Tek görüşme + mesajlar
app.get("/api/leads/:id", async (req, res) => {
  const { data: lead } = await supabase.from("leads").select("*").eq("id", req.params.id).single();
  const { data: messages } = await supabase
    .from("messages").select("*").eq("lead_id", req.params.id).order("created_at");
  const { data: appointment } = await supabase
    .from("appointments").select("*").eq("lead_id", req.params.id).order("scheduled_at", { ascending: false }).limit(1).maybeSingle();
  res.json({ lead: { ...lead, appointment: appointment || null }, messages });
});

// Görüşmenin randevusunu oluştur/güncelle/sil
app.put("/api/leads/:id/appointment", async (req, res) => {
  const { scheduled_at } = req.body;
  if (!scheduled_at) {
    await supabase.from("appointments").delete().eq("lead_id", req.params.id);
    return res.json({ ok: true, appointment: null });
  }
  const { data: existing } = await supabase
    .from("appointments").select("id").eq("lead_id", req.params.id).order("scheduled_at", { ascending: false }).limit(1).maybeSingle();
  let result;
  if (existing) {
    ({ data: result } = await supabase.from("appointments").update({ scheduled_at, confirmed: false }).eq("id", existing.id).select().single());
  } else {
    ({ data: result } = await supabase.from("appointments").insert({ lead_id: req.params.id, scheduled_at }).select().single());
  }
  res.json({ ok: true, appointment: result });
});

// Güncelle (aşama, bölüm, sınıf, ai_mode, ai_enabled)
app.patch("/api/leads/:id", async (req, res) => {
  const allowed = ["stage", "department", "grade", "ai_mode", "ai_enabled", "ai_evaluated", "campus", "source", "operator_id", "name", "parent_name", "student_name", "district"];
  const patch = {};
  for (const k of allowed) if (k in req.body) patch[k] = req.body[k];
  const { data, error } = await supabase.from("leads").update(patch).eq("id", req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Veliye mesaj gönder (operatör veya onaylı taslak)
app.post("/api/leads/:id/send", async (req, res) => {
  const { text, byAI } = req.body;
  const { data: lead } = await supabase.from("leads").select("wa_id").eq("id", req.params.id).single();
  try {
    await sendText(lead.wa_id, text);
    await supabase.from("messages").insert({
      lead_id: req.params.id, direction: "out", body: text, by_ai: !!byAI,
    });
    if (byAI) await supabase.from("leads").update({ ai_draft: null }).eq("id", req.params.id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// AI taslağı düzenlenip gönderildiğinde geri bildirimi kaydet (prompt iyileştirme için)
app.post("/api/leads/:id/feedback", async (req, res) => {
  const { original, edited } = req.body;
  const { error } = await supabase.from("ai_feedback").insert({
    lead_id: req.params.id, original, edited,
  });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

// WhatsApp medyasını panele aktar (Meta medya URL'leri auth + süreli olduğu için proxy gerekir)
app.get("/api/media-proxy/:mediaId", async (req, res) => {
  try {
    const info = await getMediaInfo(req.params.mediaId);
    const upstream = await downloadMedia(info.url);
    res.setHeader("Content-Type", info.mime_type || "application/octet-stream");
    const buf = Buffer.from(await upstream.arrayBuffer());
    res.send(buf);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// LLM ile analiz et
app.post("/api/leads/:id/analyze", async (req, res) => {
  const { data: lead } = await supabase.from("leads").select("*").eq("id", req.params.id).single();
  const { data: msgs } = await supabase.from("messages").select("*").eq("lead_id", req.params.id).order("created_at");
  const analysis = await analyzeConversation(msgs);
  if (!analysis) return res.status(500).json({ error: "Analiz başarısız" });
  await applyAnalysis(lead, analysis);
  res.json(analysis);
});

// LLM yanıt üret (auto→gönder, draft→döndür)
app.post("/api/leads/:id/reply", async (req, res) => {
  const { data: lead } = await supabase.from("leads").select("*").eq("id", req.params.id).single();
  const { data: msgs } = await supabase.from("messages").select("*").eq("lead_id", req.params.id).order("created_at");
  const reply = await generateReply(msgs);
  if (lead.ai_mode === "auto") {
    await sendText(lead.wa_id, reply);
    await supabase.from("messages").insert({ lead_id: lead.id, direction: "out", body: reply, by_ai: true });
    return res.json({ sent: true, reply });
  }
  await supabase.from("leads").update({ ai_draft: reply }).eq("id", lead.id);
  res.json({ draft: true, reply });
});

// Yarınki teyit bekleyen randevular
app.get("/api/appointments/pending", async (_req, res) => {
  const start = new Date(); start.setDate(start.getDate() + 1); start.setHours(0, 0, 0, 0);
  const end = new Date(start); end.setHours(23, 59, 59, 999);
  const { data } = await supabase.from("appointments").select("*, leads(name, campus, wa_id)")
    .eq("confirmed", false).gte("scheduled_at", start.toISOString()).lte("scheduled_at", end.toISOString());
  res.json(data || []);
});

app.patch("/api/appointments/:id/confirm", async (req, res) => {
  const { data, error } = await supabase.from("appointments").update({ confirmed: true }).eq("id", req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.get("/api/templates", async (_req, res) => {
  const { data } = await supabase.from("templates").select("*").order("created_at");
  res.json(data || []);
});

app.get("/api/media", async (_req, res) => {
  const { data } = await supabase.from("media").select("*").order("created_at");
  res.json(data || []);
});

// Raporlama metrikleri
app.get("/api/reports", async (req, res) => {
  const period = req.query.period || "Haftalık";
  const since = new Date();
  if (period === "Günlük") since.setHours(0, 0, 0, 0);
  else if (period === "Haftalık") since.setDate(since.getDate() - 7);
  else if (period === "Aylık") since.setDate(since.getDate() - 30);
  else since.setDate(since.getDate() - 365);

  const { data: allLeads } = await supabase.from("leads").select("*");
  const { data: operators } = await supabase.from("operators").select("id, name");
  const opName = Object.fromEntries((operators || []).map((o) => [o.id, o.name]));

  const leads = (allLeads || []).filter((l) => new Date(l.started_at || l.created_at) >= since);

  const total = leads.length;
  const olumlu = leads.filter((l) => ["olumlu", "randevu", "kayit"].includes(l.stage)).length;
  const randevu = leads.filter((l) => ["randevu", "kayit"].includes(l.stage)).length;
  const kayit = leads.filter((l) => l.stage === "kayit").length;
  const convRate = total ? Math.round((kayit / total) * 100) : 0;

  const srcDist = {}, depDist = {}, stageDist = {};
  for (const l of leads) {
    if (l.source) srcDist[l.source] = (srcDist[l.source] || 0) + 1;
    if (l.department) depDist[l.department] = (depDist[l.department] || 0) + 1;
    stageDist[l.stage] = (stageDist[l.stage] || 0) + 1;
  }

  // Yanıt süreleri (veli mesajı -> bir sonraki operatör/AI mesajı arası)
  let respTimes = [];
  const opStats = {};
  const ids = leads.map((l) => l.id);
  if (ids.length) {
    const { data: msgs } = await supabase
      .from("messages").select("lead_id, direction, created_at").in("lead_id", ids).order("created_at");
    const byLead = {};
    for (const m of msgs || []) (byLead[m.lead_id] ??= []).push(m);
    for (const l of leads) {
      const arr = byLead[l.id] || [];
      const times = [];
      for (let i = 0; i < arr.length - 1; i++) {
        if (arr[i].direction === "in" && arr[i + 1].direction === "out") {
          times.push((new Date(arr[i + 1].created_at) - new Date(arr[i].created_at)) / 60000);
        }
      }
      respTimes.push(...times);
      const opId = l.operator_id || "unassigned";
      opStats[opId] ??= { total: 0, kayit: 0, respTimes: [] };
      opStats[opId].total++;
      if (l.stage === "kayit") opStats[opId].kayit++;
      opStats[opId].respTimes.push(...times);
    }
  }
  const avgResp = respTimes.length ? Math.round(respTimes.reduce((a, b) => a + b, 0) / respTimes.length) : 0;
  const fastRate = respTimes.length ? Math.round((respTimes.filter((t) => t <= 15).length / respTimes.length) * 100) : 0;

  const opPerf = Object.entries(opStats).map(([id, s]) => ({
    operator: opName[id] || "Atanmamış",
    total: s.total,
    kayit: s.kayit,
    convRate: s.total ? Math.round((s.kayit / s.total) * 100) : 0,
    avgResp: s.respTimes.length ? Math.round(s.respTimes.reduce((a, b) => a + b, 0) / s.respTimes.length) : 0,
  }));

  // Son 30 gün: günlük yeni görüşme + kayıt sayısı
  const DAYNAMES = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
  const last30 = [];
  for (let k = 29; k >= 0; k--) {
    const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - k);
    const next = new Date(d); next.setDate(d.getDate() + 1);
    const started = (allLeads || []).filter((l) => {
      const dt = new Date(l.started_at || l.created_at); return dt >= d && dt < next;
    }).length;
    const reg = (allLeads || []).filter((l) => l.registered_at && new Date(l.registered_at) >= d && new Date(l.registered_at) < next).length;
    last30.push({ date: d.toISOString().slice(0, 10), label: `${d.getDate()}.${d.getMonth() + 1}`, started, reg, dow: d.getDay() });
  }

  // Haftanın günü kırılımı (tüm zamanlar)
  const byDow = DAYNAMES.map((name, i) => ({
    name,
    start: (allLeads || []).filter((l) => new Date(l.started_at || l.created_at).getDay() === i).length,
    reg: (allLeads || []).filter((l) => l.registered_at && new Date(l.registered_at).getDay() === i).length,
  }));
  const topRegDate = last30.reduce((a, b) => (b.reg > a.reg ? b : a), last30[0]);

  res.json({
    period, total, olumlu, randevu, kayit, convRate, avgResp, fastRate,
    today: last30[last30.length - 1].started,
    srcDist, depDist, stageDist, opPerf, last30, byDow, topRegDate,
  });
});

// Excel raporu: tüm görüşmeler (telefon, veli/öğrenci adı, ilçe, kampüs,
// aşama, randevu tarihi, AI analiz, kayıt tahmini vb.)
// Tarih aralığı ?from=YYYY-MM-DD&to=YYYY-MM-DD veya ?period=Günlük|Haftalık|Aylık|Yıllık
app.get("/api/export/leads", async (req, res) => {
  const { from, to, period } = req.query;
  let since, until;
  if (from || to) {
    since = from ? new Date(from) : new Date(0);
    until = to ? new Date(to) : new Date();
    until.setHours(23, 59, 59, 999);
  } else {
    until = new Date();
    since = new Date();
    if (period === "Günlük") since.setHours(0, 0, 0, 0);
    else if (period === "Aylık") since.setMonth(since.getMonth() - 1);
    else if (period === "Yıllık") since.setFullYear(since.getFullYear() - 1);
    else since.setDate(since.getDate() - 7); // Haftalık (varsayılan)
  }

  const { data: leads, error } = await supabase
    .from("leads")
    .select("*, appointments(scheduled_at)")
    .gte("created_at", since.toISOString())
    .lte("created_at", until.toISOString())
    .order("created_at", { ascending: false });
  if (error) return res.status(500).json({ error: error.message });

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Görüşmeler");
  ws.columns = [
    { header: "Telefon", key: "phone", width: 16 },
    { header: "Veli Adı Soyadı", key: "parent_name", width: 24 },
    { header: "Öğrenci Adı Soyadı", key: "student_name", width: 24 },
    { header: "İlçe", key: "district", width: 16 },
    { header: "Kampüs", key: "campus", width: 16 },
    { header: "Bölüm", key: "department", width: 18 },
    { header: "Sınıf", key: "grade", width: 10 },
    { header: "Aşama", key: "stage", width: 12 },
    { header: "Randevu Tarihi", key: "appointment", width: 20 },
    { header: "AI Analiz Özeti", key: "ai_summary", width: 50 },
    { header: "Kayıt Tahmini (%)", key: "ai_score", width: 16 },
    { header: "Görüşme Başlangıcı", key: "started_at", width: 20 },
  ];
  ws.getRow(1).font = { bold: true };

  const stageLabels = { yeni: "Yeni", olumlu: "Olumlu", olumsuz: "Olumsuz", randevu: "Randevu", kayit: "Kayıt" };

  for (const l of leads || []) {
    const apptDates = (l.appointments || []).map((a) => a.scheduled_at).filter(Boolean).sort();
    const lastAppt = apptDates[apptDates.length - 1];
    ws.addRow({
      phone: l.wa_id || l.phone || "",
      parent_name: l.parent_name || "",
      student_name: l.student_name || "",
      district: l.district || "",
      campus: l.campus || "",
      department: l.department || "",
      grade: l.grade || "",
      stage: stageLabels[l.stage] || l.stage || "",
      appointment: lastAppt ? new Date(lastAppt).toLocaleString("tr-TR") : "",
      ai_summary: l.ai_summary || "",
      ai_score: l.ai_score ?? "",
      started_at: l.started_at ? new Date(l.started_at).toLocaleString("tr-TR") : "",
    });
  }

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="gorusmeler.xlsx"`);
  await wb.xlsx.write(res);
  res.end();
});

// ============================================================
// HATIRLATMA OTOMASYONU
// ============================================================
// AI'ın son sorusuna/mesajına 2 saat boyunca cevap gelmezse, aynı soruyu
// farklı bir ifadeyle tekrar hatırlatır. 22:00-08:00 (Türkiye saati)
// arasında hatırlatma gönderilmez.
const FOLLOW_UP_DELAY_MS = 2 * 60 * 60 * 1000;

async function checkFollowUps() {
  const turkeyHour = (new Date().getUTCHours() + 3) % 24;
  if (turkeyHour >= 22 || turkeyHour < 8) return;

  const cutoff = new Date(Date.now() - FOLLOW_UP_DELAY_MS).toISOString();

  const { data: leads } = await supabase
    .from("leads").select("id, wa_id, ai_enabled, stage")
    .eq("ai_enabled", true)
    .not("stage", "in", '("olumsuz","kayit")');

  for (const lead of leads || []) {
    const { data: msgs } = await supabase
      .from("messages").select("*").eq("lead_id", lead.id).order("created_at");
    if (!msgs || !msgs.length) continue;

    const lastMsg = msgs[msgs.length - 1];
    if (lastMsg.direction !== "out") continue;
    if (new Date(lastMsg.created_at) > new Date(cutoff)) continue;

    // Son veli mesajından sonra zaten 1 veya daha fazla "out" mesaj
    // gönderildiyse (ör. randevu hatırlatması), tekrar hatırlatma gönderme.
    let outCountSinceLastIn = 0;
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].direction === "in") break;
      outCountSinceLastIn++;
    }
    if (outCountSinceLastIn >= 2) continue;
    if (lastMsg.follow_up_sent) continue;

    try {
      // Önce mevcut son mesajı işaretle — yeni mesaj eklenmesi başarısız olsa
      // bile bu mesaj bir daha hatırlatma tetiklemesin.
      const { error: flagErr } = await supabase
        .from("messages").update({ follow_up_sent: true }).eq("id", lastMsg.id);
      if (flagErr) { console.error("follow_up_sent işaretleme hatası:", lead.id, flagErr.message); continue; }

      const followUp = await generateFollowUp(msgs);

      await sendText(lead.wa_id, followUp);
      const { error: insErr } = await supabase.from("messages").insert({
        lead_id: lead.id, direction: "out", body: followUp, by_ai: true, follow_up_sent: true,
      });
      if (insErr) console.error("Hatırlatma mesajı kayıt hatası:", lead.id, insErr.message);
      await supabase.from("leads").update({ last_message_at: new Date().toISOString() }).eq("id", lead.id);
    } catch (e) {
      console.error("Hatırlatma gönderme hatası:", lead.id, e.message);
    }
  }
}

setInterval(checkFollowUps, 10 * 60 * 1000);

// ============================================================
// RANDEVU HATIRLATMA OTOMASYONU
// ============================================================
// Yarın için planlanmış, henüz hatırlatma gönderilmemiş randevular için
// veliye WhatsApp üzerinden hatırlatma mesajı gönderir.
async function checkAppointmentReminders() {
  const turkeyHour = (new Date().getUTCHours() + 3) % 24;
  if (turkeyHour >= 22 || turkeyHour < 8) return;

  const start = new Date(); start.setDate(start.getDate() + 1); start.setHours(0, 0, 0, 0);
  const end = new Date(start); end.setHours(23, 59, 59, 999);

  const { data: appts } = await supabase
    .from("appointments").select("*, leads(wa_id, parent_name, name, campus)")
    .eq("reminder_sent", false)
    .gte("scheduled_at", start.toISOString()).lte("scheduled_at", end.toISOString());

  for (const appt of appts || []) {
    const lead = appt.leads;
    if (!lead?.wa_id) continue;

    const when = new Date(appt.scheduled_at);
    const saat = when.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" });
    const adSoyad = lead.parent_name || lead.name || "";
    const text =
      `Sayın ${adSoyad}, yarın saat ${saat} için ${lead.campus || "kampüsümüzde"} ` +
      `planladığımız görüşme/ziyaret randevunuzu hatırlatmak isteriz. ` +
      `Bu saat sizin için hâlâ uygun mu?`;

    try {
      await sendText(lead.wa_id, text);
      await supabase.from("messages").insert({
        lead_id: appt.lead_id, direction: "out", body: text, by_ai: true,
      });
      await supabase.from("appointments").update({ reminder_sent: true }).eq("id", appt.id);
    } catch (e) {
      console.error("Randevu hatırlatma hatası:", appt.id, e.message);
    }
  }
}

setInterval(checkAppointmentReminders, 30 * 60 * 1000);

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => console.log(`Backend çalışıyor: port ${PORT}`));
