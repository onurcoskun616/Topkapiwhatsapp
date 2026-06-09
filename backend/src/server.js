import { config } from "dotenv";
config(); // .env varsa yükle, yoksa Railway env değişkenlerini kullan
import express from "express";
import cors from "cors";
import { supabase } from "./supabase.js";
import { sendText, parseIncoming } from "./whatsapp.js";
import { analyzeConversation, generateReply } from "./openai.js";

const app = express();
app.use(express.json());
app.use(cors({
  origin: (origin, cb) => cb(null, true),
  credentials: true,
}));

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
      type: msg.type, wa_message_id: msg.waMessageId,
    });
    await supabase.from("leads")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", lead.id);

    // 3) AI aktifse otomatik analiz + (mode'a göre) yanıt
    if (lead.ai_enabled) {
      const { data: msgs } = await supabase
        .from("messages").select("*").eq("lead_id", lead.id).order("created_at");

      // analiz
      const analysis = await analyzeConversation(msgs);
      if (analysis) {
        await supabase.from("leads").update({
          department: analysis.department || lead.department,
          grade: analysis.grade || lead.grade,
          stage: analysis.stage || lead.stage,
          ai_score: analysis.score ?? lead.ai_score,
          ai_summary: analysis.summary, ai_next: analysis.next,
          ai_evaluated: true,
        }).eq("id", lead.id);
      }

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
  res.json(data);
});

// Tek görüşme + mesajlar
app.get("/api/leads/:id", async (req, res) => {
  const { data: lead } = await supabase.from("leads").select("*").eq("id", req.params.id).single();
  const { data: messages } = await supabase
    .from("messages").select("*").eq("lead_id", req.params.id).order("created_at");
  res.json({ lead, messages });
});

// Güncelle (aşama, bölüm, sınıf, ai_mode, ai_enabled)
app.patch("/api/leads/:id", async (req, res) => {
  const allowed = ["stage", "department", "grade", "ai_mode", "ai_enabled", "ai_evaluated", "campus", "source", "operator_id", "name"];
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

// LLM ile analiz et
app.post("/api/leads/:id/analyze", async (req, res) => {
  const { data: msgs } = await supabase.from("messages").select("*").eq("lead_id", req.params.id).order("created_at");
  const analysis = await analyzeConversation(msgs);
  if (!analysis) return res.status(500).json({ error: "Analiz başarısız" });
  await supabase.from("leads").update({
    department: analysis.department, grade: analysis.grade, stage: analysis.stage,
    ai_score: analysis.score, ai_summary: analysis.summary, ai_next: analysis.next,
    ai_evaluated: true,
  }).eq("id", req.params.id);
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
  // TODO: periyot (günlük/haftalık/aylık/yıllık) parametresine göre hesapla.
  // status_log ve leads tablolarından: huni, mecra, bölüm, operatör performansı,
  // günlük yeni görüşme (son 30 gün), haftanın günü kırılımı.
  const { data: leads } = await supabase.from("leads").select("*");
  res.json({ totalLeads: leads?.length || 0, note: "Rapor hesaplama TODO" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => console.log(`Backend çalışıyor: port ${PORT}`));
