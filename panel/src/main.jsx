
import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { api } from "./api.js";
import ReactDOM from "react-dom/client";

const PATHS = {
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
  msg: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  check: '<path d="M21.8 10A10 10 0 1 1 17 3.3"/><polyline points="9 11 12 14 22 4"/>',
  image: '<rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>',
  file: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/>',
  video: '<path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2"/>',
  clip: '<path d="m21.4 11.1-8.5 8.5a6 6 0 0 1-8.5-8.5l8.5-8.5a4 4 0 0 1 5.7 5.7l-8.5 8.5a2 2 0 0 1-2.8-2.8l7.8-7.8"/>',
  zap: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
  sparkles: '<path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/>',
  back: '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
  filter: '<polygon points="22 3 2 3 10 12.5 10 19 14 21 14 12.5 22 3"/>',
  calendar: '<path d="M8 2v4M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',
  timer: '<line x1="10" x2="14" y1="2" y2="2"/><line x1="12" x2="15" y1="14" y2="11"/><circle cx="12" cy="14" r="8"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9"/><path d="M16 3.1a4 4 0 0 1 0 7.8"/>',
  target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.4-.5-2-1-3-1.1-2.4-.4-4.6 1-6 .2 2.3 1.2 3.5 2.5 4.5C15 8.7 16 10 16 12.5a4 4 0 0 1-8 0c0-.5 0-1 .5-2Z"/>',
  snow: '<line x1="2" x2="22" y1="12" y2="12"/><line x1="12" x2="12" y1="2" y2="22"/><path d="m20 16-4-4 4-4M4 8l4 4-4 4M16 4l-4 4-4-4M8 20l4-4 4 4"/>',
  bars: '<line x1="12" x2="12" y1="20" y2="10"/><line x1="18" x2="18" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="16"/>',
  inbox: '<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.5 5.5 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.5A2 2 0 0 0 16.7 4H7.3a2 2 0 0 0-1.8 1.1z"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  tag: '<path d="M12.6 2.7a2.4 2.4 0 0 0-1.7-.7H4a2 2 0 0 0-2 2v6.9c0 .6.2 1.2.7 1.7l8.3 8.3a2.4 2.4 0 0 0 3.4 0l6.2-6.2a2.4 2.4 0 0 0 0-3.4Z"/><circle cx="7.5" cy="7.5" r="1.2"/>',
  bell: '<path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/><path d="M21 19H3l1.5-2A8 8 0 0 0 6 12a6 6 0 0 1 12 0 8 8 0 0 0 1.5 5Z"/>',
  bot: '<rect width="18" height="10" x="3" y="11" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4M8 16h0M16 16h0"/>',
  power: '<path d="M12 2v10"/><path d="M18.4 6.6a9 9 0 1 1-12.8 0"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>',
};
function I({ n, size = 16, color }) {
  return <svg className="ic" viewBox="0 0 24 24" style={{ width: size, height: size, color }} dangerouslySetInnerHTML={{ __html: PATHS[n] || '' }} />;
}

// ===================== SABİTLER =====================
const gold = "#c8a14a", green = "#25D366";
const CAMPUSES = ["İkitelli OSB", "İstanbul OSB", "Esenyurt", "Kıraç", "Çorlu"];
const SOURCES = ["WhatsApp Reklam", "Web Sitesi Butonu", "Instagram", "Tavsiye"];
const OPERATORS = ["Ayşe K.", "Mehmet T.", "Zeynep A.", "Burak Y."];
const DEPARTMENTS = ["Otomotiv","Makine","Mekatronik","Elektrik-Elektronik","Kimya","Biyomedikal","İnşaat"];
const GRADES = ["9. Sınıf","10. Sınıf","11. Sınıf","12. Sınıf"];
// Tek birleşik DEĞERLENDİRME alanı (eski "aşama" + "etiket" birleşti)
const STAGES = {
  yeni:    { label: "Yeni",    color: "#3b82f6" },
  olumlu:  { label: "Olumlu",  color: "#10b981" },
  olumsuz: { label: "Olumsuz", color: "#ef4444" },
  randevu: { label: "Randevu", color: "#f59e0b" },
  kayit:   { label: "Kayıt",   color: "#22c55e" },
};

// ===================== MOCK =====================
const NAMES = ["Ayşe Yıldız","Murat Demir","Selin Kaya","Hakan Şahin","Derya Öztürk","Emre Arslan","Gül Çelik","Okan Doğan","Pınar Aydın","Tolga Koç","Sevda Aksoy","Barış Kurt"];
// Görüşme senaryoları — bazıları bölüm/sınıf ipucu içerir (LLM bunları yakalar)
const HISTORIES = [
  [["in","Merhaba, oğlum için 9. sınıf otomotiv bölümü bilgisi almak istiyorum"],["out","Merhaba 👋 Otomotiv bölümümüz çok güçlü. Hangi kampüsü düşünüyorsunuz?"],["in","İkitelli yakınız. Ücret ne kadar acaba?"]],
  [["in","Mekatronik bölümünüz var mı? 10. sınıfa geçiyor kızım"],["out","Evet, Mekatronik bölümümüz mevcut. LGS yüzdelik diliminiz nedir?"],["in","%6 civarı"],["out","Güzel bir derece 👏 Burs imkanımız var, görüşme ayarlayalım mı?"],["in","Olur, cumartesi müsaitim"]],
  [["in","Elektrik elektronik bölümü servisi Esenyurt'a geliyor mu?"],["out","Evet Esenyurt güzergahımız aktif 🚌 Mahallenizi paylaşır mısınız?"]],
  [["in","Merhaba bilgi almak istiyorum"]],
  [["in","Biyomedikal bölümü 11. sınıf nakil alıyor musunuz?"],["out","Kontenjana göre nakil değerlendiriyoruz."],["in","Teşekkürler, düşüneceğim"]],
];
// LLM'in tespit edebileceği bölüm/sınıf (senaryoya göre)
function detectFromText(msgs) {
  const text = msgs.map(m=>m.text).join(" ").toLowerCase();
  let dep = "", grade = "";
  const depMap = { "otomotiv":"Otomotiv","makine":"Makine","mekatronik":"Mekatronik","elektrik":"Elektrik-Elektronik","elektronik":"Elektrik-Elektronik","kimya":"Kimya","biyomedikal":"Biyomedikal","inşaat":"İnşaat","insaat":"İnşaat" };
  for (const k in depMap) if (text.includes(k)) { dep = depMap[k]; break; }
  const gm = text.match(/(9|10|11|12)\s*\.?\s*sınıf/);
  if (gm) grade = gm[1] + ". Sınıf";
  return { dep, grade };
}
function buildConvos() {
  const evalKeys = ["yeni","olumlu","olumsuz","randevu","kayit"];
  const N = 60;
  return Array.from({ length: N }, (_, i) => {
    const base = HISTORIES[i % HISTORIES.length];
    // konuşmanın başladığı gün: son 30 güne dağıt (hafta sonu/hafta içi gerçekçi yoğunluk)
    const daysAgo = Math.floor(Math.random() * 30);
    const started = new Date(); started.setDate(started.getDate() - daysAgo);
    started.setHours(9 + Math.floor(Math.random()*9), Math.floor(Math.random()*60), 0, 0);
    const hist = base.map((m, j) => ({ from: m[0], text: m[1], time: new Date(started.getTime() + j * 9e5) }));
    // KURAL: tek mesajlı (sadece 1 mesaj, henüz diyalog yok) => "yeni"
    let stage = hist.length <= 1 ? "yeni" : evalKeys[1 + (i % (evalKeys.length-1))];
    const score = stage === "kayit" ? 95 : stage === "randevu" ? 80 : stage === "olumlu" ? 62 : stage === "olumsuz" ? 15 : 40 + Math.floor(Math.random()*25);
    const det = detectFromText(hist);
    let appt = null;
    if (stage === "randevu") {
      const d = new Date(); d.setDate(d.getDate() + (i % 4 === 0 ? 1 : 3)); d.setHours(14, 0, 0, 0);
      appt = { date: d, confirmed: false };
    }
    // kayıt aşamasındaysa kayıt günü = başlangıçtan birkaç gün sonra (ama bugünü geçmesin)
    let registeredAt = null;
    if (stage === "kayit") {
      const rd = new Date(started); rd.setDate(rd.getDate() + Math.floor(Math.random()*4));
      if (rd > new Date()) rd.setTime(Date.now());
      registeredAt = rd;
    }
    return { id: i+1, name: NAMES[i % NAMES.length], phone: `+90 5${30+(i%60)} ${100+i} ${10+(i%80)} ${20+(i%70)}`,
      campus: CAMPUSES[i % CAMPUSES.length], source: SOURCES[i % SOURCES.length], operator: OPERATORS[i % OPERATORS.length],
      stage, score, msgs: hist, unread: Math.random() > 0.5 ? Math.floor(1+Math.random()*3) : 0, respMin: Math.floor(2 + Math.random()*55),
      department: det.dep,
      grade: det.grade,
      appointment: appt,
      aiEnabled: true,
      aiMode: (i % 2 === 0) ? "auto" : "draft",
      aiDraft: "",
      aiFilled: !!(det.dep || det.grade),
      aiEvaluated: true,
      startedAt: started,        // sohbetin başladığı gün
      registeredAt,              // kayıt günü (varsa)
    };
  });
}
const aiTemp = (s) => s >= 70 ? { l: "Sıcak", c: "#ef4444", i: "flame" } : s >= 45 ? { l: "Ilık", c: "#f59e0b", i: "zap" } : { l: "Soğuk", c: "#3b82f6", i: "snow" };
function aiAnalysis(c) {
  const t = aiTemp(c.score);
  const next = c.stage === "kayit" ? "Kayıt tamamlandı — hoş geldin mesajı gönder." :
    c.stage === "randevu" ? "Randevu öncesi hatırlatma mesajı planla." :
    c.stage === "olumsuz" ? "Düşük ilgi — tek hatırlatma sonrası bırak." :
    c.score >= 60 ? "Randevu daveti gönder — ilgi yüksek." :
    "Bölüm/burs bilgisiyle ilgilen, sıcak tut.";
  const summary = c.stage === "randevu" ? "Veli görüşmeye sıcak bakıyor, gün belirlendi." :
    c.stage === "kayit" ? "Kayıt sürecini tamamladı." :
    c.stage === "olumsuz" ? "İlgi zayıf, kısa temas." :
    c.score >= 60 ? "Net kayıt niyeti var, bölüm/fiyat sorguluyor." :
    "Bilgi topluyor, kararsız aşamada.";
  return { temp: t, summary, next };
}
// randevusu yarın olan & teyit edilmemiş görüşmeler
function pendingConfirmations(convos) {
  const now = new Date(); const tomorrow = new Date(now); tomorrow.setDate(now.getDate()+1);
  return convos.filter(c => c.appointment && !c.appointment.confirmed &&
    c.appointment.date.toDateString() === tomorrow.toDateString());
}

// ===================== LLM MODÜLÜ (OpenAI) =====================
// API anahtarı GÜVENLİK için buraya YAZILMAZ. Gerçek kullanımda
// istekler kendi sunucunuzdaki (proxy) bir uç noktaya gider, anahtar orada saklanır.
const LLM = {
  provider: "openai",
  model: "gpt-4o-mini",
  proxyUrl: "",   // <-- Sonra: kendi sunucunuzun adresi, örn "https://okul-sunucu.com/api/llm"
  enabled: false, // proxyUrl dolunca otomatik true olur (aşağıda)

  // Sistem promptu — İÇERİĞİNİ SONRA BİRLİKTE YAZACAĞIZ
  systemPrompt: `[BURAYA SİSTEM PROMPTU GELECEK]
Sen Topkapı Mesleki ve Teknik Anadolu Lisesi'nin WhatsApp kayıt danışmanısın.
(Detaylı talimatlar sonra eklenecek.)`,

  // Merkezi çağrı noktası — gerçek API buraya bağlanacak
  async call(messages) {
    if (this.enabled && this.proxyUrl) {
      // GERÇEK MOD (API alınınca): proxy üzerinden OpenAI'a istek
      const res = await fetch(this.proxyUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: this.model, messages, temperature: 0.4 }),
      });
      const data = await res.json();
      return data.choices?.[0]?.message?.content || "";
    }
    // DEMO MOD (şu an): sahte ama gerçekçi yanıt üret
    return this._demo(messages);
  },

  // Demo simülasyonu — gerçek API yokken
  _demo(messages) {
    const userText = (messages.filter(m=>m.role==="user").pop()?.content || "").toLowerCase();
    if (userText.includes("[analiz]")) {
      // analiz isteği — JSON döndür
      const det = { dep:"", grade:"" };
      const dm = {"otomotiv":"Otomotiv","makine":"Makine","mekatronik":"Mekatronik","elektrik":"Elektrik-Elektronik","kimya":"Kimya","biyomedikal":"Biyomedikal","inşaat":"İnşaat"};
      for (const k in dm) if (userText.includes(k)) { det.dep = dm[k]; break; }
      const gm = userText.match(/(9|10|11|12)\s*\.?\s*sın/);
      if (gm) det.grade = gm[1] + ". Sınıf";
      let stage = "yeni", score = 40;
      if (userText.includes("kayıt") || userText.includes("kaydol")) { stage="kayit"; score=92; }
      else if (userText.includes("randevu") || userText.includes("cumartesi") || userText.includes("müsait")) { stage="randevu"; score=80; }
      else if (userText.includes("ücret") || userText.includes("burs") || userText.includes("kontenjan")) { stage="olumlu"; score=64; }
      else if (userText.includes("teşekkür") || userText.includes("düşün")) { stage="olumsuz"; score=22; }
      return JSON.stringify({ department:det.dep, grade:det.grade, stage, score,
        summary: stage==="randevu"?"Veli görüşmeye sıcak, gün belirlendi.":stage==="olumlu"?"İlgili, bölüm/ücret soruyor.":stage==="olumsuz"?"İlgi zayıf.":"Yeni görüşme.",
        next: stage==="randevu"?"Randevu hatırlatması planla.":stage==="olumlu"?"Randevu daveti gönder.":"Karşılama ve bölüm bilgisi ver." });
    }
    // yanıt üretimi (demo)
    if (userText.includes("otomotiv")) return "Otomotiv bölümümüz çok güçlü 🚗 Hangi sınıf düzeyi için bilgi almak istersiniz?";
    if (userText.includes("ücret") || userText.includes("burs")) return "Ücret ve burs oranımız öğrencinin başarı durumuna göre belirleniyor. Kısa bir görüşme ayarlayalım mı?";
    if (userText.includes("servis")) return "Servis güzergahlarımız geniş bir bölgeyi kapsıyor. Adresinizi paylaşır mısınız?";
    return "Merhaba 👋 Topkapı Mesleki ve Teknik Anadolu Lisesi'ne hoş geldiniz. Size nasıl yardımcı olabilirim?";
  },
};
LLM.enabled = !!LLM.proxyUrl;

// Görüşmeyi analiz et (bölüm, sınıf, aşama, skor, özet, öneri)
async function llmAnalyze(convo) {
  const transcript = convo.msgs.map(m => `${m.from==="in"?"Veli":"Operatör"}: ${m.text}`).join("\n");
  const out = await LLM.call([
    { role:"system", content: LLM.systemPrompt },
    { role:"user", content: `[ANALIZ] Aşağıdaki görüşmeyi analiz et ve SADECE JSON döndür (department, grade, stage[yeni|olumlu|olumsuz|randevu|kayit], score[0-100], summary, next):\n\n${transcript}` },
  ]);
  try { return JSON.parse(out); } catch { return null; }
}
// Veliye yanıt üret
async function llmReply(convo) {
  const history = convo.msgs.map(m => ({ role: m.from==="in"?"user":"assistant", content: m.text }));
  return await LLM.call([{ role:"system", content: LLM.systemPrompt }, ...history]);
}

// ===================== VERİ NORMALIZASYONU =====================
function normalizeLead(lead, messages = []) {
  return {
    id: lead.id,
    name: lead.name || lead.wa_id || "Bilinmiyor",
    phone: lead.phone || lead.wa_id || "",
    campus: lead.campus || "",
    source: lead.source || "",
    operator: lead.operator_id || "",
    stage: lead.stage || "yeni",
    score: lead.ai_score || 0,
    msgs: messages.map(m => ({
      from: m.direction,
      text: m.body || "",
      time: new Date(m.created_at),
      byAI: m.by_ai,
      type: m.type || "text",
      mediaId: m.media_url || null,
    })),
    unread: 0,
    respMin: 5,
    department: lead.department || "",
    grade: lead.grade || "",
    parentName: lead.parent_name || "",
    studentName: lead.student_name || "",
    district: lead.district || "",
    appointment: lead.appointment ? { id: lead.appointment.id, date: new Date(lead.appointment.scheduled_at), confirmed: lead.appointment.confirmed } : null,
    aiEnabled: lead.ai_enabled !== false,
    aiMode: lead.ai_mode || "draft",
    aiDraft: lead.ai_draft || "",
    lastDirection: lead.last_direction || null,
    aiFilled: !!(lead.department || lead.grade),
    aiEvaluated: lead.ai_evaluated || false,
    llmSummary: lead.ai_summary || "",
    llmNext: lead.ai_next || "",
    startedAt: new Date(lead.started_at || lead.created_at),
    registeredAt: lead.registered_at ? new Date(lead.registered_at) : null,
    last_message_at: lead.last_message_at,
  };
}

// ===================== APP =====================
function App() {
  const [tab, setTab] = useState("inbox");
  const [convos, setConvos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState(null);
  const [showBell, setShowBell] = useState(false);
  const isMobile = useIsMobile();
  const pending = pendingConfirmations(convos);
  const pendingDrafts = convos.filter(c => c.aiDraft);
  const needsReply = convos.filter(c => !c.aiEnabled && c.lastDirection === "in" && c.stage !== "olumsuz" && c.stage !== "kayit");
  const bellCount = pending.length + pendingDrafts.length + needsReply.length;

  const loadLeads = useCallback(async () => {
    try {
      const leads = await api.listLeads();
      setConvos(prev => {
        const prevById = new Map(prev.map(c => [c.id, c]));
        return leads.map(l => {
          const fresh = normalizeLead(l);
          const old = prevById.get(l.id);
          return old ? { ...fresh, msgs: old.msgs } : fresh;
        });
      });
      setLoading(false);
    } catch (e) {
      console.error("Lead yükleme hatası:", e);
      setLoading(false);
    }
  }, []);

  const activeIdRef = useRef(activeId);
  useEffect(() => { activeIdRef.current = activeId; }, [activeId]);

  const refreshActive = useCallback(async () => {
    const id = activeIdRef.current;
    if (!id) return;
    try {
      const { lead, messages } = await api.getLead(id);
      setConvos(prev => prev.map(c => c.id === id ? { ...normalizeLead(lead, messages) } : c));
    } catch (e) { console.error("Mesaj yenileme hatası:", e); }
  }, []);

  useEffect(() => {
    loadLeads();
    const interval = setInterval(() => { loadLeads(); refreshActive(); }, 4000); // 4 sn'de bir yenile
    return () => clearInterval(interval);
  }, [loadLeads, refreshActive]);

  function update(id, patch) {
    setConvos(p => p.map(c => c.id === id ? { ...c, ...(typeof patch==="function"?patch(c):patch) } : c));
  }

  return (
    <div style={S.app}>
      <header style={S.topbar}>
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <img src="https://i.ibb.co/N2vYQjDn/442418253-960808149388725-8401339798021113572-n.jpg" style={{ width:40, height:40, borderRadius:"50%", objectFit:"cover" }} alt="logo" />
          <div><div style={{ fontWeight: 800, fontSize: 14, color: "#fff" }}>Topkapı · WhatsApp Merkezi</div>
          <div style={{ fontSize: 10.5, color: "#fbbf24" }}>● CANLI</div></div>
        </div>
        <div style={{ display: "flex", gap: 7, alignItems:"center" }}>
          {/* Bildirim zili */}
          <div style={{ position:"relative" }}>
            <button onClick={()=>setShowBell(!showBell)} style={{ ...S.tab, position:"relative" }}>
              <I n="bell" size={16}/>
              {bellCount>0 && <span style={S.bellBadge}>{bellCount}</span>}
            </button>
            {showBell && (
              <div style={S.bellDrop}>
                <div style={{ fontSize:12, fontWeight:700, color:"#fff", marginBottom:8 }}>Yarınki Randevular — Teyit Gerekli</div>
                {pending.length===0 && <div style={{ fontSize:12, color:"#64748b", marginBottom:10 }}>Bekleyen teyit yok.</div>}
                {pending.map(c=>(
                  <div key={c.id} style={S.bellItem}>
                    <div><b style={{ fontSize:12.5, color:"#fff" }}>{c.name}</b>
                      <div style={{ fontSize:11, color:"#94a3b8" }}>{c.appointment.date.toLocaleString("tr-TR",{weekday:"short",hour:"2-digit",minute:"2-digit"})} · {c.campus}</div></div>
                    <button style={S.confirmBtn} onClick={async ()=>{
                      try { await api.confirmAppointment(c.appointment.id); } catch(err) { console.error(err); }
                      update(c.id, cc=>({ appointment:{...cc.appointment, confirmed:true} }));
                    }}>Teyit Et</button>
                  </div>
                ))}

                <div style={{ fontSize:12, fontWeight:700, color:"#fff", margin:"12px 0 8px" }}>Onay Bekleyen AI Taslakları</div>
                {pendingDrafts.length===0 && <div style={{ fontSize:12, color:"#64748b", marginBottom:10 }}>Bekleyen taslak yok.</div>}
                {pendingDrafts.map(c=>(
                  <div key={c.id} style={S.bellItem} onClick={()=>{ setTab("inbox"); setActiveId(c.id); setShowBell(false); }}>
                    <div style={{ cursor:"pointer" }}><b style={{ fontSize:12.5, color:"#fff" }}>{c.name}</b>
                      <div style={{ fontSize:11, color:"#94a3b8", maxWidth:220, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{c.aiDraft}</div></div>
                  </div>
                ))}

                <div style={{ fontSize:12, fontWeight:700, color:"#fff", margin:"12px 0 8px" }}>Yanıt Bekleyen Görüşmeler (AI kapalı)</div>
                {needsReply.length===0 && <div style={{ fontSize:12, color:"#64748b" }}>Bekleyen yanıt yok.</div>}
                {needsReply.map(c=>(
                  <div key={c.id} style={S.bellItem} onClick={()=>{ setTab("inbox"); setActiveId(c.id); setShowBell(false); }}>
                    <div style={{ cursor:"pointer" }}><b style={{ fontSize:12.5, color:"#fff" }}>{c.name}</b>
                      <div style={{ fontSize:11, color:"#94a3b8" }}>{c.campus || "Kampüs belirtilmedi"}</div></div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button onClick={() => setTab("inbox")} style={tab==="inbox"?S.tabA:S.tab}><I n="inbox" size={15}/> <span className="hide-sm">Gelen Kutusu</span></button>
          <button onClick={() => setTab("reports")} style={tab==="reports"?S.tabA:S.tab}><I n="bars" size={15}/> <span className="hide-sm">Raporlar</span></button>
        </div>
      </header>
      {loading
        ? <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", color:"#64748b", fontSize:14 }}>Yükleniyor…</div>
        : tab==="inbox"
          ? <Inboxer convos={convos} update={update} setConvos={setConvos} activeId={activeId} setActiveId={setActiveId} isMobile={isMobile}/>
          : <Reports/>}
    </div>
  );
}
function useIsMobile() {
  const [m, setM] = useState(typeof window !== "undefined" && window.innerWidth < 820);
  useEffect(() => { const f = () => setM(window.innerWidth < 820); window.addEventListener("resize", f); return () => window.removeEventListener("resize", f); }, []);
  return m;
}

function Inboxer({ convos, update, setConvos, activeId, setActiveId, isMobile }) {
  const [q, setQ] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const active = convos.find((c) => c.id === activeId);
  const list = convos.filter((c) =>
    (!q || c.name.toLowerCase().includes(q.toLowerCase()) || c.phone.includes(q)) &&
    (!stageFilter || c.stage === stageFilter));

  async function send(text) {
    if (!text.trim()) return;
    update(activeId, c => ({ msgs:[...c.msgs,{from:"out",text,time:new Date()}], unread:0 }));
    try { await api.send(activeId, text); } catch(e) { console.error("Gönderim hatası:", e); }
  }

  async function open(id) {
    setActiveId(id);
    update(id, { unread:0 });
    try {
      const { lead, messages } = await api.getLead(id);
      update(id, normalizeLead(lead, messages));
    } catch(e) { console.error("Mesaj yükleme hatası:", e); }
  }
  const showList = !isMobile || !active, showChat = !isMobile || active;
  return (
    <div style={S.inboxWrap}>
      {showList && (
        <div style={{ ...S.listCol, ...(isMobile?{width:"100%",borderRight:"none"}:{}) }}>
          <div style={S.searchBox}><I n="search" size={15} color="#64748b"/>
            <input placeholder="Veli ara…" value={q} onChange={(e)=>setQ(e.target.value)} style={S.searchInput}/></div>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap", padding:"0 12px 10px" }}>
            <button onClick={()=>setStageFilter("")} style={!stageFilter?S.stageChipA:S.stageChip}>Tümü</button>
            {Object.keys(STAGES).map(k=>(
              <button key={k} onClick={()=>setStageFilter(k)}
                style={stageFilter===k?{...S.stageChipA, background:`${STAGES[k].color}26`, color:STAGES[k].color, borderColor:STAGES[k].color}:S.stageChip}>
                {STAGES[k].label}
              </button>
            ))}
          </div>
          <div style={S.convList}>
            {list.map((c) => { const t = aiTemp(c.score); const last = c.msgs[c.msgs.length-1]; return (
              <div key={c.id} className="conv" style={{ ...S.convItem, ...(c.id===activeId?S.convActive:{}) }} onClick={()=>open(c.id)}>
                <div style={{ ...S.avatar, borderColor: t.c }}>{c.name[0]}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", gap:6 }}>
                    <b style={{ fontSize:13.5, color:"#fff", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{c.name}</b>
                    <span style={{ fontSize:10, color:"#64748b", flexShrink:0 }}>{last ? last.time.toLocaleTimeString("tr-TR",{hour:"2-digit",minute:"2-digit"}) : ""}</span>
                  </div>
                  <div style={{ display:"flex", justifyContent:"space-between", gap:6, marginTop:2 }}>
                    <span style={{ fontSize:11.5, color:"#94a3b8", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{last ? last.text : "Henüz mesaj yok"}</span>
                    {c.unread>0 && <span style={S.unread}>{c.unread}</span>}
                  </div>
                  <div style={{ display:"flex", gap:5, marginTop:6, flexWrap:"wrap", alignItems:"center" }}>
                    <span style={{ ...S.dot, background:`${t.c}1f`, color:t.c }}><I n={t.i} size={10}/> {t.l}</span>
                    <span style={{ ...S.dot, background:`${STAGES[c.stage].color}1f`, color:STAGES[c.stage].color }}>{STAGES[c.stage].label}{c.aiEvaluated?" ·AI":""}</span>
                    {c.aiEnabled && <span style={{ ...S.dot, background:`${gold}1f`, color:gold }}><I n="bot" size={10}/> Oto</span>}
                    {c.appointment && <span style={{ ...S.dot, background: c.appointment.confirmed?"#10b9811f":"#f59e0b1f", color: c.appointment.confirmed?"#10b981":"#f59e0b" }}><I n="calendar" size={10}/> {c.appointment.confirmed?"Teyit":"Randevu"}</span>}
                  </div>
                </div>
              </div> ); })}
          </div>
        </div>
      )}
      {showChat && (active
        ? <ChatView convo={active} onSend={send} update={update} onBack={()=>setActiveId(null)} isMobile={isMobile}/>
        : <div style={S.noChat}><I n="msg" size={40} color="#1e3a5f"/><p style={{ color:"#475569", fontSize:14 }}>Bir konuşma seçin</p></div>)}
    </div>
  );
}

function MsgContent({ m }) {
  if (m.type === "image" && m.mediaId) {
    return <div>
      <img src={api.mediaProxyUrl(m.mediaId)} alt="" style={{ maxWidth:240, borderRadius:8, display:"block" }}/>
      {m.text && <div style={{ marginTop:6 }}>{m.text}</div>}
    </div>;
  }
  if (m.type === "video" && m.mediaId) {
    return <div>
      <video src={api.mediaProxyUrl(m.mediaId)} controls style={{ maxWidth:240, borderRadius:8, display:"block" }}/>
      {m.text && <div style={{ marginTop:6 }}>{m.text}</div>}
    </div>;
  }
  if (m.type === "document" && m.mediaId) {
    return <a href={api.mediaProxyUrl(m.mediaId)} target="_blank" rel="noreferrer"
      style={{ display:"flex", alignItems:"center", gap:8, color:"inherit", textDecoration:"none" }}>
      <I n="file" size={18}/> {m.text || "Belge"}
    </a>;
  }
  return m.text;
}

function ChatView({ convo, onSend, update, onBack, isMobile }) {
  const [text, setText] = useState("");
  const [panel, setPanel] = useState(null); // templates | media | ai | info
  const [busy, setBusy] = useState(false);
  const [draftText, setDraftText] = useState("");
  const [tplList, setTplList] = useState([]);
  const [mediaList, setMediaList] = useState([]);
  const [newTpl, setNewTpl] = useState({ title:"", body:"" });
  const [newMedia, setNewMedia] = useState({ name:"", type:"image", storage_url:"" });
  useEffect(() => {
    api.templates().then(setTplList).catch(console.error);
    api.media().then(setMediaList).catch(console.error);
  }, []);
  async function addTemplate() {
    if (!newTpl.title.trim() || !newTpl.body.trim()) return;
    try {
      const created = await api.createTemplate(newTpl);
      setTplList(prev => [...prev, created]);
      setNewTpl({ title:"", body:"" });
    } catch(e) { console.error("Şablon ekleme hatası:", e); }
  }
  async function removeTemplate(id) {
    try { await api.deleteTemplate(id); setTplList(prev => prev.filter(t=>t.id!==id)); }
    catch(e) { console.error("Şablon silme hatası:", e); }
  }
  async function addMedia() {
    if (!newMedia.name.trim() || !newMedia.storage_url.trim()) return;
    try {
      const created = await api.createMedia(newMedia);
      setMediaList(prev => [...prev, created]);
      setNewMedia({ name:"", type:"image", storage_url:"" });
    } catch(e) { console.error("Medya ekleme hatası:", e); }
  }
  async function removeMedia(id) {
    try { await api.deleteMedia(id); setMediaList(prev => prev.filter(m=>m.id!==id)); }
    catch(e) { console.error("Medya silme hatası:", e); }
  }
  useEffect(() => { setDraftText(convo.aiDraft || ""); }, [convo.aiDraft]);
  const endRef = useRef(null);
  useEffect(() => { if (endRef.current) endRef.current.scrollIntoView({ behavior:"smooth" }); }, [convo.msgs.length]);
  const ai = aiAnalysis(convo);

  async function setEval(v) {
    update(convo.id, { stage: v, aiEvaluated: false });
    try { await api.updateLead(convo.id, { stage: v, ai_evaluated: false }); } catch(e) { console.error(e); }
  }

  async function runAnalyze() {
    setBusy(true);
    try {
      const r = await api.analyze(convo.id);
      update(convo.id, {
        department: r.department || convo.department,
        grade: r.grade || convo.grade,
        stage: r.stage || convo.stage,
        score: typeof r.score==="number" ? r.score : convo.score,
        aiEvaluated: true, aiFilled: !!(r.department || r.grade),
        llmSummary: r.summary, llmNext: r.next,
      });
    } catch(e) { console.error("Analiz hatası:", e); }
    setBusy(false);
  }

  async function runReply() {
    setBusy(true);
    try {
      const r = await api.reply(convo.id);
      if (r.sent) {
        update(convo.id, c => ({ msgs:[...c.msgs,{from:"out",text:r.reply,time:new Date(),byAI:true}] }));
      } else {
        update(convo.id, { aiDraft: r.reply });
      }
    } catch(e) { console.error("Yanıt hatası:", e); }
    setBusy(false);
  }

  async function sendDraft(final) {
    const original = convo.aiDraft;
    update(convo.id, c => ({ msgs:[...c.msgs,{from:"out",text:final,time:new Date(),byAI:true}], aiDraft:"" }));
    try {
      await api.send(convo.id, final, true);
      if (final.trim() !== original.trim()) {
        await api.feedback(convo.id, original, final).catch(console.error);
      }
    } catch(e) { console.error(e); }
  }

  return (
    <div style={S.chatCol}>
      <div style={S.chatHead}>
        {isMobile && <button onClick={onBack} style={S.backBtn}><I n="back" size={18}/></button>}
        <div style={{ ...S.avatar, width:38, height:38, borderColor:ai.temp.c }}>{convo.name[0]}</div>
        <div style={{ flex:1, minWidth:0 }}><b style={{ fontSize:14, color:"#fff" }}>{convo.name}</b>
          <div style={{ fontSize:11, color:"#64748b" }}>{convo.phone} · {convo.campus}{convo.department?` · ${convo.department}`:""}{convo.grade?` · ${convo.grade}`:""}</div></div>
        {/* LLM aç/kapa */}
        <button onClick={()=>{
            const next = !convo.aiEnabled;
            update(convo.id,{ aiEnabled:next });
            api.updateLead(convo.id,{ ai_enabled:next }).catch(console.error);
          }}
          style={{ ...S.aiBtn, ...(convo.aiEnabled?{background:gold,color:"#0a1020",borderColor:gold}:{}) }} title="LLM otomatik yanıt">
          <I n="power" size={14}/> <span>{convo.aiEnabled?"Açık":"Kapalı"}</span>
        </button>
        {/* AI mod: tam otomatik / taslak öner */}
        {convo.aiEnabled && (
          <button onClick={()=>update(convo.id,{ aiMode: convo.aiMode==="auto"?"draft":"auto" })}
            style={{ ...S.aiBtn, background: convo.aiMode==="auto"?"#1e5245":"#3a2e13", borderColor: convo.aiMode==="auto"?green:gold, color: convo.aiMode==="auto"?"#5eead4":gold }}
            title="Otomatik: AI kendi gönderir · Taslak: AI önerir, siz onaylarsınız">
            <I n="bot" size={14}/> <span>{convo.aiMode==="auto"?"Otomatik":"Taslak"}</span>
          </button>
        )}
        <button onClick={()=>setPanel(panel==="info"?null:"info")} style={{ ...S.aiBtn, ...(panel==="info"?{background:"#13203a"}:{}) }} title="Detay & Etiket">
          <I n="tag" size={14}/>
        </button>
        <button onClick={()=>setPanel(panel==="ai"?null:"ai")} style={{ ...S.aiBtn, ...(panel==="ai"?{background:"#13203a"}:{}) }}><I n="sparkles" size={15}/></button>
      </div>

      {/* LLM kapalı uyarısı */}
      {!convo.aiEnabled && (
        <div style={S.aiOff}><I n="power" size={12}/> Otomatik yanıt kapalı — bu görüşmeyi siz yönetiyorsunuz.</div>
      )}

      {/* AI analiz paneli */}
      {panel==="ai" && (
        <div style={S.aiPanel}>
          <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:10 }}>
            <span style={{ ...S.aiChip, background:`${ai.temp.c}1f`, color:ai.temp.c }}><I n={ai.temp.i} size={13}/> {ai.temp.l}</span>
            <span style={S.aiChip2}><I n="target" size={13}/> Kayıt eğilimi: <b style={{ color:gold }}>%{convo.score}</b></span>
            <span style={{ ...S.aiChip, background:`${STAGES[convo.stage].color}1f`, color:STAGES[convo.stage].color }}>Aşama: {STAGES[convo.stage].label}</span>
          </div>
          <div style={S.aiRow}><b style={{ color:"#94a3b8" }}>Özet:</b> {convo.llmSummary || ai.summary}</div>
          <div style={S.aiRow}><b style={{ color:gold }}>Öneri:</b> {convo.llmNext || ai.next}</div>
          {convo.aiFilled && <div style={{ ...S.aiRow, color:"#10b981" }}><I n="check" size={12}/> LLM bölüm/sınıf bilgisini görüşmeden doldurdu.</div>}
          {/* LLM eylem butonları */}
          <div style={{ display:"flex", gap:8, marginTop:12, flexWrap:"wrap" }}>
            <button onClick={runAnalyze} disabled={busy} style={S.llmBtn}><I n="sparkles" size={13}/> {busy?"Analiz ediliyor…":"Görüşmeyi Analiz Et"}</button>
            <button onClick={runReply} disabled={busy} style={S.llmBtn}><I n="bot" size={13}/> {convo.aiMode==="auto"?"AI Yanıtı Gönder":"AI Taslağı Üret"}</button>
          </div>
        </div>
      )}

      {/* Yarı-otomatik: bekleyen AI taslağı */}
      {convo.aiDraft && (
        <div style={S.draftBox}>
          <div style={{ fontSize:11, fontWeight:700, color:gold, marginBottom:6, display:"flex", alignItems:"center", gap:5 }}><I n="bot" size={12}/> AI TASLAĞI — düzenleyip onaylayabilirsiniz</div>
          <textarea value={draftText} rows={3}
            onChange={(e)=>setDraftText(e.target.value)}
            style={{ ...S.select, resize:"vertical", marginBottom:10, fontFamily:"inherit", lineHeight:1.5 }}/>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={()=>sendDraft(draftText)} style={S.draftSend}><I n="send" size={13}/> Onayla & Gönder</button>
            <button onClick={()=>update(convo.id,{aiDraft:""})} style={S.draftCancel}>İptal</button>
          </div>
        </div>
      )}

      {/* Detay + etiket + bölüm/sınıf + randevu paneli */}
      {panel==="info" && (
        <div style={S.infoPanel}>
          {/* Veli & Öğrenci adı soyadı */}
          <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:12 }}>
            <div style={{ flex:1, minWidth:150 }}>
              <label style={S.fieldLbl}>Veli Adı Soyadı {convo.parentName && <span style={S.aiTag}>AI</span>}</label>
              <input value={convo.parentName} placeholder="Belirtilmedi"
                onChange={(e)=>update(convo.id,{parentName:e.target.value})}
                onBlur={(e)=>{ api.updateLead(convo.id,{parent_name:e.target.value}).catch(console.error); }}
                style={S.select}/>
            </div>
            <div style={{ flex:1, minWidth:150 }}>
              <label style={S.fieldLbl}>Öğrenci Adı Soyadı {convo.studentName && <span style={S.aiTag}>AI</span>}</label>
              <input value={convo.studentName} placeholder="Belirtilmedi"
                onChange={(e)=>update(convo.id,{studentName:e.target.value})}
                onBlur={(e)=>{ api.updateLead(convo.id,{student_name:e.target.value}).catch(console.error); }}
                style={S.select}/>
            </div>
          </div>
          {/* İlçe & Kampüs */}
          <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:12 }}>
            <div style={{ flex:1, minWidth:150 }}>
              <label style={S.fieldLbl}>İlçe {convo.district && <span style={S.aiTag}>AI</span>}</label>
              <input value={convo.district} placeholder="Belirtilmedi"
                onChange={(e)=>update(convo.id,{district:e.target.value})}
                onBlur={(e)=>{ api.updateLead(convo.id,{district:e.target.value}).catch(console.error); }}
                style={S.select}/>
            </div>
            <div style={{ flex:1, minWidth:150 }}>
              <label style={S.fieldLbl}>Kampüs {convo.aiFilled && convo.campus && <span style={S.aiTag}>AI</span>}</label>
              <select value={convo.campus} onChange={(e)=>{ update(convo.id,{campus:e.target.value}); api.updateLead(convo.id,{campus:e.target.value}).catch(console.error); }} style={S.select}>
                <option value="">Seçiniz…</option>
                {CAMPUSES.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          {/* Bölüm & Sınıf */}
          <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:12 }}>
            <div style={{ flex:1, minWidth:150 }}>
              <label style={S.fieldLbl}>Bölüm {convo.aiFilled && convo.department && <span style={S.aiTag}>AI</span>}</label>
              <select value={convo.department} onChange={(e)=>{ update(convo.id,{department:e.target.value}); api.updateLead(convo.id,{department:e.target.value}).catch(console.error); }} style={S.select}>
                <option value="">Seçiniz…</option>
                {DEPARTMENTS.map(d=><option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div style={{ flex:1, minWidth:120 }}>
              <label style={S.fieldLbl}>Sınıf {convo.aiFilled && convo.grade && <span style={S.aiTag}>AI</span>}</label>
              <select value={convo.grade} onChange={(e)=>{ update(convo.id,{grade:e.target.value}); api.updateLead(convo.id,{grade:e.target.value}).catch(console.error); }} style={S.select}>
                <option value="">Seçiniz…</option>
                {GRADES.map(g=><option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          </div>
          {/* Değerlendirme (birleşik: durum) — LLM belirler, operatör değiştirir */}
          <div style={{ marginBottom:12 }}>
            <label style={S.fieldLbl}>Aşama {convo.aiEvaluated && <span style={S.aiTag}>AI</span>}</label>
            <div style={{ display:"flex", gap:7, flexWrap:"wrap" }}>
              {Object.keys(STAGES).map(k=>{ const on=convo.stage===k; const col=STAGES[k].color; return (
                <button key={k} onClick={()=>setEval(k)}
                  style={{ ...S.labelBtn, ...(on?{ background:`${col}26`, color:col, borderColor:col }:{}) }}>{STAGES[k].label}</button>
              ); })}
            </div>
            {convo.aiEvaluated && <div style={{ fontSize:11, color:"#10b981", marginTop:7, display:"flex", alignItems:"center", gap:5 }}><I n="check" size={11}/> LLM görüşmeyi değerlendirdi. Değiştirirseniz sizin değerlendirmeniz geçerli olur.</div>}
          </div>
          {/* Randevu */}
          <div style={{ marginBottom:12 }}>
            <label style={S.fieldLbl}>Randevu</label>
            <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
              <input type="datetime-local" style={S.dateInput}
                value={convo.appointment ? toLocalInput(convo.appointment.date) : ""}
                onChange={async (e)=>{
                  const v = e.target.value;
                  if (!v) {
                    update(convo.id, { appointment: null });
                    try { await api.setAppointment(convo.id, null); } catch(err) { console.error(err); }
                    return;
                  }
                  const iso = new Date(v).toISOString();
                  try {
                    const r = await api.setAppointment(convo.id, iso);
                    update(convo.id, { appointment: r.appointment ? { id:r.appointment.id, date:new Date(r.appointment.scheduled_at), confirmed:r.appointment.confirmed } : null });
                  } catch(err) { console.error(err); }
                }}/>
              {convo.appointment && (
                <span style={{ ...S.dot, background: convo.appointment.confirmed?"#10b9811f":"#f59e0b1f", color: convo.appointment.confirmed?"#10b981":"#f59e0b" }}>
                  {convo.appointment.confirmed ? "✓ Teyit edildi" : "Teyit bekliyor"}
                </span>
              )}
              {convo.appointment && !convo.appointment.confirmed &&
                <button style={S.confirmBtn} onClick={async ()=>{
                  update(convo.id, c=>({ appointment:{...c.appointment, confirmed:true} }));
                  try { await api.confirmAppointment(convo.appointment.id); } catch(err) { console.error(err); }
                }}>Teyit Et</button>}
            </div>
          </div>
        </div>
      )}

      {/* Mesajlar */}
      <div style={S.msgArea}>
        {convo.msgs.map((m, i) => (
          <div key={i} style={{ display:"flex", justifyContent: m.from==="out"?"flex-end":"flex-start" }}>
            <div style={{ ...S.bubble, ...(m.from==="out"?S.bubbleOut:S.bubbleIn) }}>
              <MsgContent m={m}/>
              <span style={S.msgTime}>{m.time.toLocaleTimeString("tr-TR",{hour:"2-digit",minute:"2-digit"})}</span></div>
          </div>
        ))}
        <div ref={endRef}/>
      </div>

      {/* Şablon / Medya */}
      {panel==="templates" && (
        <div style={S.quickPanel}>
          <div style={S.quickHead}><span>Hazır Şablonlar</span><button onClick={()=>setPanel(null)} style={S.xBtn}><I n="x" size={15}/></button></div>
          <div style={S.quickGrid}>{tplList.map((tp)=>(
            <div key={tp.id} style={{ position:"relative" }}>
              <button style={S.tplBtn} onClick={()=>{onSend(tp.body);setPanel(null);}}>
                <b style={{ fontSize:12, color:gold }}>{tp.title}</b>
                <span style={{ fontSize:11, color:"#94a3b8", display:"block", marginTop:3, lineHeight:1.4 }}>{tp.body.slice(0,70)}…</span>
              </button>
              <button onClick={()=>removeTemplate(tp.id)} title="Sil" style={{ position:"absolute", top:4, right:4, background:"none", border:"none", color:"#64748b", cursor:"pointer" }}><I n="x" size={13}/></button>
            </div>))}</div>
          <div style={{ display:"flex", flexDirection:"column", gap:6, marginTop:10, padding:"10px", borderTop:"1px solid #1e293b" }}>
            <input value={newTpl.title} onChange={(e)=>setNewTpl({...newTpl, title:e.target.value})} placeholder="Başlık" style={S.msgInput}/>
            <textarea value={newTpl.body} onChange={(e)=>setNewTpl({...newTpl, body:e.target.value})} placeholder="Mesaj içeriği" rows={2} style={{ ...S.msgInput, resize:"vertical" }}/>
            <button onClick={addTemplate} style={S.sendBtn}>+ Şablon Ekle</button>
          </div>
        </div>
      )}
      {panel==="media" && (
        <div style={S.quickPanel}>
          <div style={S.quickHead}><span>Medya Kütüphanesi</span><button onClick={()=>setPanel(null)} style={S.xBtn}><I n="x" size={15}/></button></div>
          <div style={S.mediaGrid}>{mediaList.map((md)=>(
            <div key={md.id} style={{ position:"relative" }}>
              <button style={S.mediaBtn} onClick={()=>{onSend(md.storage_url || `📎 ${md.name} gönderildi`);setPanel(null);}}>
                <I n={md.type==="video"?"video":md.type==="document"?"file":"image"} size={20} color={gold}/>
                <span style={{ fontSize:10.5, marginTop:6, textAlign:"center", lineHeight:1.3, color:"#e2e8f0" }}>{md.name}</span>
              </button>
              <button onClick={()=>removeMedia(md.id)} title="Sil" style={{ position:"absolute", top:4, right:4, background:"none", border:"none", color:"#64748b", cursor:"pointer" }}><I n="x" size={13}/></button>
            </div>))}</div>
          <div style={{ display:"flex", flexDirection:"column", gap:6, marginTop:10, padding:"10px", borderTop:"1px solid #1e293b" }}>
            <input value={newMedia.name} onChange={(e)=>setNewMedia({...newMedia, name:e.target.value})} placeholder="Ad" style={S.msgInput}/>
            <select value={newMedia.type} onChange={(e)=>setNewMedia({...newMedia, type:e.target.value})} style={S.msgInput}>
              <option value="image">Görsel</option>
              <option value="video">Video</option>
              <option value="document">Belge</option>
            </select>
            <input value={newMedia.storage_url} onChange={(e)=>setNewMedia({...newMedia, storage_url:e.target.value})} placeholder="Dosya/Link URL" style={S.msgInput}/>
            <button onClick={addMedia} style={S.sendBtn}>+ Medya Ekle</button>
          </div>
        </div>
      )}

      <div style={S.inputBar}>
        <button onClick={()=>setPanel(panel==="templates"?null:"templates")} style={{ ...S.toolBtn, ...(panel==="templates"?{color:gold}:{}) }}><I n="zap" size={19}/></button>
        <button onClick={()=>setPanel(panel==="media"?null:"media")} style={{ ...S.toolBtn, ...(panel==="media"?{color:gold}:{}) }}><I n="clip" size={19}/></button>
        <input value={text} onChange={(e)=>setText(e.target.value)} onKeyDown={(e)=>{if(e.key==="Enter"){onSend(text);setText("");}}} placeholder="Mesaj yazın…" style={S.msgInput}/>
        <button onClick={()=>{onSend(text);setText("");}} style={S.sendBtn}><I n="send" size={17}/></button>
      </div>
    </div>
  );
}
function toLocalInput(d) {
  const p = (n)=>String(n).padStart(2,"0");
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function Reports() {
  const [period, setPeriod] = useState("Haftalık");
  const periods = ["Günlük","Haftalık","Aylık","Yıllık"];
  const [r, setR] = useState(null);
  const [exportFrom, setExportFrom] = useState("");
  const [exportTo, setExportTo] = useState("");

  useEffect(() => {
    let cancelled = false;
    api.reports(period).then((data) => { if (!cancelled) setR(data); }).catch((e) => console.error("Rapor yükleme hatası:", e));
    return () => { cancelled = true; };
  }, [period]);

  if (!r) return <div style={S.reportBody}><div style={{ color:"#64748b", fontSize:13 }}>Yükleniyor…</div></div>;

  const funnel = { total: r.total, olumlu: r.olumlu, olumsuz: r.stageDist?.olumsuz || 0, randevu: r.randevu, kayit: r.kayit };
  const srcDist = SOURCES.map((s) => ({ s, n: r.srcDist[s] || 0 }));
  const depDist = DEPARTMENTS.map((d) => ({ d, n: r.depDist[d] || 0 })).filter((x) => x.n > 0);
  const maxSrc = Math.max(...srcDist.map((s) => s.n), 1);
  const maxDep = Math.max(...depDist.map((s) => s.n), 1);

  const last30 = r.last30;
  const maxStarted = Math.max(...last30.map((x) => x.started), 1);

  const byDow = r.byDow;
  const maxDowStart = Math.max(...byDow.map((x) => x.start), 1);
  const maxDowReg = Math.max(...byDow.map((x) => x.reg), 1);
  const topStartDay = byDow.reduce((a, b) => (b.start > a.start ? b : a), byDow[0]);
  const topRegDay = byDow.reduce((a, b) => (b.reg > a.reg ? b : a), byDow[0]);
  const topRegDate = r.topRegDate;

  return (
    <div style={S.reportBody}>
      <div style={S.periodRow}>{periods.map((p)=>(<button key={p} onClick={()=>setPeriod(p)} style={p===period?S.perA:S.per}>{p}</button>))}</div>
      <div style={{...S.periodRow, alignItems:"center", background:"#0a1020", border:"1px solid #1e293b", padding:10, borderRadius:10}}>
        <span style={{fontSize:13, fontWeight:600, color:"#e2e8f0"}}>Excel Raporu:</span>
        <input type="date" value={exportFrom} onChange={(e)=>setExportFrom(e.target.value)} style={S.dateInput}/>
        <span style={{fontSize:13, color:"#64748b"}}>–</span>
        <input type="date" value={exportTo} onChange={(e)=>setExportTo(e.target.value)} style={S.dateInput}/>
        <a
          href={api.exportLeadsUrl(exportFrom || exportTo ? { from: exportFrom, to: exportTo } : { period })}
          style={{...S.perA, display:"inline-flex", alignItems:"center", gap:6, textDecoration:"none"}}
        >
          <I n="download" size={14}/> İndir ({exportFrom || exportTo ? "Tarih Aralığı" : period})
        </a>
        {(exportFrom || exportTo) && <button onClick={()=>{ setExportFrom(""); setExportTo(""); }} style={S.per}>Tarih Filtresini Temizle</button>}
      </div>
      <div style={S.kpiRow}>
        <Kpi i="msg" l="Toplam Konuşma" v={funnel.total} c="#3b82f6"/>
        <Kpi i="calendar" l="Bugün Yeni" v={r.today} c="#06b6d4"/>
        <Kpi i="msg" l="Yeni" v={r.stageDist?.yeni || 0} c="#3b82f6"/>
        <Kpi i="users" l="Olumlu / Potansiyel" v={funnel.olumlu} c="#10b981"/>
        <Kpi i="users" l="Olumsuz" v={funnel.olumsuz} c="#ef4444"/>
        <Kpi i="calendar" l="Randevu" v={funnel.randevu} c="#f59e0b"/>
        <Kpi i="check" l="Kayıt" v={funnel.kayit} c="#10b981"/>
        <Kpi i="target" l="Dönüşüm" v={`%${r.convRate}`} c={gold}/>
        <Kpi i="timer" l="Ort. Yanıt" v={`${r.avgResp} dk`} c="#06b6d4"/>
        <Kpi i="zap" l="Hızlı Dönüş (15dk altı)" v={`%${r.fastRate}`} c="#ec4899"/>
      </div>
      <div style={S.repGrid}>
        <div style={S.repCard}>
          <h3 style={S.repTitle}><I n="target" size={15}/> Dönüşüm Hunisi · {period}</h3>
          {[{l:"Toplam Konuşma",v:funnel.total,c:"#3b82f6"},{l:"Olumlu / Potansiyel",v:funnel.olumlu,c:"#10b981"},{l:"Olumsuz",v:funnel.olumsuz,c:"#ef4444"},{l:"Randevu Verildi",v:funnel.randevu,c:"#f59e0b"},{l:"Kayıt Oldu",v:funnel.kayit,c:"#22c55e"}].map((f)=>(
            <div key={f.l} style={{ marginBottom:13 }}>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:12.5, marginBottom:5 }}><b style={{color:"#e2e8f0"}}>{f.l}</b><span style={{ color:"#64748b" }}>{f.v} · <b style={{ color:f.c }}>%{funnel.total?Math.round(f.v/funnel.total*100):0}</b></span></div>
              <div style={S.track}><div style={{ ...S.fill, width:`${funnel.total?(f.v/funnel.total)*100:0}%`, background:f.c }}/></div>
            </div>))}
        </div>
        <div style={S.repCard}>
          <h3 style={S.repTitle}><I n="filter" size={15}/> Mecra Dağılımı · {period}</h3>
          {srcDist.map((s)=>(
            <div key={s.s} style={{ marginBottom:13 }}>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:12.5, marginBottom:5 }}><b style={{color:"#e2e8f0"}}>{s.s}</b><span style={{ color:"#64748b" }}>{s.n}</span></div>
              <div style={S.track}><div style={{ ...S.fill, width:`${(s.n/maxSrc)*100}%`, background:gold }}/></div>
            </div>))}
        </div>
        {/* Değerlendirme dağılımı (LLM + operatör) */}
        <div style={S.repCard}>
          <h3 style={S.repTitle}><I n="target" size={15}/> Değerlendirme Dağılımı · {period}</h3>
          {Object.keys(STAGES).map((k)=>{ const n=r.stageDist[k]||0; const max=funnel.total||1; return (
            <div key={k} style={{ marginBottom:13 }}>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:12.5, marginBottom:5 }}><b style={{color:"#e2e8f0"}}>{STAGES[k].label}</b><span style={{ color:"#64748b" }}>{n}</span></div>
              <div style={S.track}><div style={{ ...S.fill, width:`${(n/max)*100}%`, background:STAGES[k].color }}/></div>
            </div>); })}
        </div>
        {/* Bölüm talebi dağılımı */}
        <div style={S.repCard}>
          <h3 style={S.repTitle}><I n="tag" size={15}/> Bölüm Talebi · {period}</h3>
          {depDist.length===0 && <div style={{ fontSize:12, color:"#64748b" }}>Henüz bölüm verisi yok.</div>}
          {depDist.map((s)=>(
            <div key={s.d} style={{ marginBottom:13 }}>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:12.5, marginBottom:5 }}><b style={{color:"#e2e8f0"}}>{s.d}</b><span style={{ color:"#64748b" }}>{s.n}</span></div>
              <div style={S.track}><div style={{ ...S.fill, width:`${(s.n/maxDep)*100}%`, background:"#8b5cf6" }}/></div>
            </div>))}
        </div>
        <div style={{ ...S.repCard, gridColumn:"1 / -1" }}>
          <h3 style={S.repTitle}><I n="users" size={15}/> Operatör Performansı · {period}</h3>
          <div style={{ overflowX:"auto" }}>
            <table style={S.table}><thead><tr>{["Operatör","Konuşma","Kayıt","Dönüşüm","Ort. Yanıt"].map((h)=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
              <tbody>{r.opPerf.length===0 && <tr><td style={S.td} colSpan={5}>Veri yok.</td></tr>}
              {r.opPerf.map((o)=>(
                <tr key={o.operator} style={{ borderTop:"1px solid #1e293b" }}>
                  <td style={S.td}><b style={{color:"#fff"}}>{o.operator}</b></td><td style={S.td}>{o.total}</td><td style={S.td}>{o.kayit}</td>
                  <td style={S.td}><span style={{ color:gold, fontWeight:700 }}>%{o.convRate}</span></td>
                  <td style={S.td}><span style={{ color:o.avgResp<=15?"#10b981":o.avgResp<=30?"#f59e0b":"#ef4444" }}>{o.avgResp} dk</span></td>
                </tr>))}</tbody>
            </table>
          </div>
        </div>

        {/* === ZAMAN ANALİZİ: Günlük yeni görüşmeler (son 30 gün) === */}
        <div style={{ ...S.repCard, gridColumn:"1 / -1" }}>
          <h3 style={S.repTitle}><I n="calendar" size={15}/> Günlük Yeni Görüşme — Son 30 Gün</h3>
          <div style={{ display:"flex", alignItems:"flex-end", gap:3, height:140, overflowX:"auto", paddingBottom:4 }}>
            {last30.map((d,idx)=>(
              <div key={idx} title={`${d.label}: ${d.started} yeni, ${d.reg} kayıt`} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4, minWidth:18, flex:1 }}>
                <div style={{ width:"70%", display:"flex", flexDirection:"column", justifyContent:"flex-end", height:104, position:"relative" }}>
                  <div style={{ height:`${(d.started/maxStarted)*100}%`, background:"#3b82f6", borderRadius:"4px 4px 0 0", minHeight: d.started?3:0 }}/>
                  {d.reg>0 && <div style={{ height:`${(d.reg/maxStarted)*100}%`, background:"#22c55e", borderRadius:"4px 4px 0 0", minHeight:3 }}/>}
                </div>
                <span style={{ fontSize:8, color:"#64748b", transform:"rotate(-50deg)", whiteSpace:"nowrap", marginTop:4 }}>{d.label}</span>
              </div>
            ))}
          </div>
          <div style={{ display:"flex", gap:16, marginTop:10, fontSize:11.5 }}>
            <span style={{ display:"flex", alignItems:"center", gap:5 }}><span style={{ width:10, height:10, background:"#3b82f6", borderRadius:3 }}/> Yeni görüşme</span>
            <span style={{ display:"flex", alignItems:"center", gap:5 }}><span style={{ width:10, height:10, background:"#22c55e", borderRadius:3 }}/> Kayıt</span>
          </div>
        </div>

        {/* === Haftanın günü: en çok sohbet & en çok kayıt === */}
        <div style={S.repCard}>
          <h3 style={S.repTitle}><I n="bars" size={15}/> Sohbet Başlatılan Gün (Hafta)</h3>
          {byDow.map((d)=>(
            <div key={d.name} style={{ marginBottom:11 }}>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:12.5, marginBottom:5 }}>
                <b style={{color: d.name===topStartDay.name?gold:"#e2e8f0"}}>{d.name}{d.name===topStartDay.name?" ★":""}</b><span style={{ color:"#64748b" }}>{d.start}</span></div>
              <div style={S.track}><div style={{ ...S.fill, width:`${(d.start/maxDowStart)*100}%`, background:"#3b82f6" }}/></div>
            </div>))}
          <div style={{ marginTop:10, padding:11, background:"#13203a", borderRadius:9, fontSize:12, color:"#cbd5e1" }}>
            En çok sohbet başlayan gün: <b style={{ color:gold }}>{topStartDay.name}</b>
          </div>
        </div>

        <div style={S.repCard}>
          <h3 style={S.repTitle}><I n="check" size={15}/> Kayıt Alınan Gün (Hafta)</h3>
          {byDow.map((d)=>(
            <div key={d.name} style={{ marginBottom:11 }}>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:12.5, marginBottom:5 }}>
                <b style={{color: d.name===topRegDay.name?"#22c55e":"#e2e8f0"}}>{d.name}{d.name===topRegDay.name?" ★":""}</b><span style={{ color:"#64748b" }}>{d.reg}</span></div>
              <div style={S.track}><div style={{ ...S.fill, width:`${(d.reg/maxDowReg)*100}%`, background:"#22c55e" }}/></div>
            </div>))}
          <div style={{ marginTop:10, padding:11, background:"#13203a", borderRadius:9, fontSize:12, color:"#cbd5e1" }}>
            En çok kayıt alınan gün: <b style={{ color:"#22c55e" }}>{topRegDay.name}</b>
            {topRegDate && topRegDate.reg>0 ? <span><br/>{"30 günde rekor: "}<b style={{ color:"#22c55e" }}>{topRegDate.label}</b>{" ("+topRegDate.reg+" kayıt)"}</span> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
function Kpi({ i, l, v, c }) {
  return <div style={S.kpi}><div style={{ ...S.kpiIcon, background:`${c}1a`, color:c }}><I n={i} size={17}/></div>
    <div><div style={{ fontSize:21, fontWeight:800, color:"#fff" }}>{v}</div><div style={{ fontSize:10.5, color:"#64748b", fontWeight:600 }}>{l}</div></div></div>;
}

// ===================== STİLLER =====================
const S = {
  app: { background:"#070b14", color:"#e2e8f0", minHeight:"100vh", display:"flex", flexDirection:"column" },
  topbar: { display:"flex", justifyContent:"space-between", alignItems:"center", padding:"11px 16px", background:"#0a1020", borderBottom:"1px solid #1e293b", position:"sticky", top:0, zIndex:30 },
  brandMark: { width:36, height:36, borderRadius:10, background:"linear-gradient(135deg,#c8a14a,#8a6d2f)", display:"grid", placeItems:"center", fontWeight:900, fontSize:18, color:"#0a1020" },
  tab: { display:"flex", alignItems:"center", gap:6, padding:"8px 13px", borderRadius:9, background:"#0f1729", border:"1px solid #1e293b", color:"#94a3b8", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" },
  tabA: { display:"flex", alignItems:"center", gap:6, padding:"8px 13px", borderRadius:9, background:"#13203a", border:"1px solid #1e3a5f", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" },
  bellBadge: { position:"absolute", top:-4, right:-4, background:"#ef4444", color:"#fff", fontSize:9, fontWeight:800, minWidth:16, height:16, borderRadius:99, display:"grid", placeItems:"center", padding:"0 4px" },
  bellDrop: { position:"absolute", top:42, right:0, width:300, background:"#0a1020", border:"1px solid #1e3a5f", borderRadius:12, padding:14, zIndex:40, boxShadow:"0 10px 40px rgba(0,0,0,.5)" },
  bellItem: { display:"flex", justifyContent:"space-between", alignItems:"center", gap:8, padding:"9px 0", borderTop:"1px solid #1e293b" },
  confirmBtn: { background:"#10b981", border:"none", color:"#fff", fontSize:11, fontWeight:700, padding:"6px 11px", borderRadius:8, cursor:"pointer", fontFamily:"inherit", flexShrink:0 },
  inboxWrap: { display:"flex", flex:1, minHeight:0, height:"calc(100vh - 59px)" },
  listCol: { width:340, borderRight:"1px solid #1e293b", display:"flex", flexDirection:"column", background:"#0a1020" },
  searchBox: { display:"flex", alignItems:"center", gap:8, margin:12, padding:"9px 12px", background:"#0f1729", border:"1px solid #1e293b", borderRadius:10 },
  searchInput: { background:"transparent", border:"none", outline:"none", color:"#e2e8f0", fontSize:13, width:"100%", fontFamily:"inherit" },
  convList: { flex:1, overflowY:"auto" },
  convItem: { display:"flex", gap:11, padding:"12px 14px", cursor:"pointer", borderBottom:"1px solid #0f1729" },
  convActive: { background:"#13203a" },
  avatar: { width:44, height:44, borderRadius:99, background:"#13203a", border:"2px solid", display:"grid", placeItems:"center", fontWeight:800, fontSize:16, color:"#fff", flexShrink:0 },
  unread: { background:green, color:"#fff", fontSize:10, fontWeight:800, minWidth:18, height:18, borderRadius:99, display:"grid", placeItems:"center", padding:"0 5px", flexShrink:0 },
  dot: { display:"inline-flex", alignItems:"center", gap:3, fontSize:9.5, fontWeight:700, padding:"2px 7px", borderRadius:99 },
  chatCol: { flex:1, display:"flex", flexDirection:"column", minWidth:0, background:"#070b14" },
  noChat: { flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:12 },
  chatHead: { display:"flex", alignItems:"center", gap:8, padding:"11px 14px", borderBottom:"1px solid #1e293b", background:"#0a1020" },
  backBtn: { background:"#0f1729", border:"1px solid #1e293b", color:"#e2e8f0", width:34, height:34, borderRadius:8, cursor:"pointer", display:"grid", placeItems:"center" },
  aiBtn: { display:"flex", alignItems:"center", gap:5, padding:"8px 11px", borderRadius:9, background:"#13203a", border:"1px solid #1e3a5f", color:gold, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" },
  aiOff: { background:"#1a1212", borderBottom:"1px solid #3a1e1e", color:"#f87171", fontSize:11.5, fontWeight:600, padding:"7px 16px", display:"flex", alignItems:"center", gap:6 },
  aiPanel: { background:"#0a1020", borderBottom:"1px solid #1e293b", padding:"13px 16px", fontSize:12.5, lineHeight:1.6 },
  aiChip: { display:"inline-flex", alignItems:"center", gap:5, fontSize:11.5, fontWeight:700, padding:"4px 10px", borderRadius:99 },
  aiChip2: { display:"inline-flex", alignItems:"center", gap:5, fontSize:11.5, fontWeight:600, padding:"4px 10px", borderRadius:99, background:"#0f1729", border:"1px solid #1e293b", color:"#cbd5e1" },
  aiRow: { marginTop:5, color:"#cbd5e1", display:"flex", alignItems:"center", gap:5 },
  llmBtn: { display:"flex", alignItems:"center", gap:6, padding:"8px 13px", borderRadius:9, background:"#13203a", border:`1px solid ${gold}`, color:gold, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" },
  draftBox: { background:"#13203a", borderBottom:"1px solid #1e3a5f", borderLeft:`3px solid ${gold}`, padding:"12px 16px" },
  draftSend: { display:"flex", alignItems:"center", gap:6, padding:"8px 14px", borderRadius:9, background:green, border:"none", color:"#fff", fontSize:12.5, fontWeight:700, cursor:"pointer", fontFamily:"inherit" },
  draftCancel: { padding:"8px 14px", borderRadius:9, background:"#0f1729", border:"1px solid #1e293b", color:"#94a3b8", fontSize:12.5, fontWeight:700, cursor:"pointer", fontFamily:"inherit" },
  infoPanel: { background:"#0a1020", borderBottom:"1px solid #1e293b", padding:"14px 16px" },
  fieldLbl: { display:"block", fontSize:11, fontWeight:700, color:"#94a3b8", marginBottom:5, textTransform:"uppercase", letterSpacing:"0.03em" },
  aiTag: { fontSize:9, fontWeight:800, color:"#0a1020", background:gold, padding:"1px 5px", borderRadius:5, marginLeft:6, verticalAlign:"middle" },
  select: { width:"100%", background:"#0f1729", border:"1px solid #1e293b", borderRadius:9, padding:"9px 11px", color:"#e2e8f0", fontSize:13, outline:"none" },
  dateInput: { background:"#0f1729", border:"1px solid #1e293b", borderRadius:9, padding:"8px 10px", color:"#e2e8f0", fontSize:12.5, outline:"none", colorScheme:"dark", fontFamily:"inherit" },
  labelBtn: { background:"#0f1729", border:"1px solid #1e293b", color:"#94a3b8", fontSize:11.5, fontWeight:700, padding:"6px 12px", borderRadius:99, cursor:"pointer", fontFamily:"inherit" },
  msgArea: { flex:1, overflowY:"auto", padding:"16px 18px", display:"flex", flexDirection:"column", gap:9, background:"linear-gradient(180deg,#070b14,#0a1020)" },
  bubble: { maxWidth:"75%", padding:"9px 13px 16px", borderRadius:13, fontSize:13.5, lineHeight:1.45, position:"relative", color:"#e2e8f0" },
  bubbleIn: { background:"#1a2336", borderTopLeftRadius:4 },
  bubbleOut: { background:"#1e5245", borderTopRightRadius:4 },
  msgTime: { position:"absolute", right:10, bottom:4, fontSize:9, color:"#94a3b8" },
  quickPanel: { background:"#0a1020", borderTop:"1px solid #1e293b", maxHeight:240, overflowY:"auto" },
  quickHead: { display:"flex", justifyContent:"space-between", alignItems:"center", padding:"11px 14px", fontSize:12.5, fontWeight:700, color:"#94a3b8", borderBottom:"1px solid #1e293b", position:"sticky", top:0, background:"#0a1020" },
  xBtn: { background:"transparent", border:"none", color:"#64748b", cursor:"pointer" },
  quickGrid: { display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))", gap:9, padding:12 },
  tplBtn: { textAlign:"left", background:"#0f1729", border:"1px solid #1e293b", borderRadius:10, padding:11, cursor:"pointer", fontFamily:"inherit" },
  mediaGrid: { display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(100px,1fr))", gap:9, padding:12 },
  mediaBtn: { display:"flex", flexDirection:"column", alignItems:"center", background:"#0f1729", border:"1px solid #1e293b", borderRadius:10, padding:"14px 8px", cursor:"pointer", fontFamily:"inherit" },
  inputBar: { display:"flex", alignItems:"center", gap:7, padding:"11px 13px", borderTop:"1px solid #1e293b", background:"#0a1020" },
  toolBtn: { background:"transparent", border:"none", color:"#94a3b8", cursor:"pointer", padding:4, display:"grid", placeItems:"center" },
  msgInput: { flex:1, background:"#0f1729", border:"1px solid #1e293b", borderRadius:11, padding:"11px 15px", color:"#e2e8f0", fontSize:13.5, outline:"none", fontFamily:"inherit" },
  sendBtn: { width:42, height:42, borderRadius:11, background:green, border:"none", color:"#fff", cursor:"pointer", display:"grid", placeItems:"center", flexShrink:0 },
  reportBody: { padding:"18px 16px", maxWidth:1200, margin:"0 auto", width:"100%" },
  periodRow: { display:"flex", gap:8, marginBottom:18, flexWrap:"wrap" },
  per: { padding:"8px 16px", borderRadius:99, background:"#0f1729", border:"1px solid #1e293b", color:"#94a3b8", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" },
  perA: { padding:"8px 16px", borderRadius:99, background:gold, border:`1px solid ${gold}`, color:"#0a1020", fontSize:13, fontWeight:800, cursor:"pointer", fontFamily:"inherit" },
  stageChip: { padding:"5px 12px", borderRadius:99, background:"#0f1729", border:"1px solid #1e293b", color:"#94a3b8", fontSize:11.5, fontWeight:700, cursor:"pointer", fontFamily:"inherit" },
  stageChipA: { padding:"5px 12px", borderRadius:99, background:`${gold}26`, border:`1px solid ${gold}`, color:gold, fontSize:11.5, fontWeight:800, cursor:"pointer", fontFamily:"inherit" },
  kpiRow: { display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(155px,1fr))", gap:11, marginBottom:18 },
  kpi: { display:"flex", alignItems:"center", gap:11, background:"#0a1020", border:"1px solid #1e293b", borderRadius:13, padding:"13px 15px" },
  kpiIcon: { width:38, height:38, borderRadius:10, display:"grid", placeItems:"center", flexShrink:0 },
  repGrid: { display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))", gap:16 },
  repCard: { background:"#0a1020", border:"1px solid #1e293b", borderRadius:13, padding:20 },
  repTitle: { display:"flex", alignItems:"center", gap:8, fontSize:14, fontWeight:700, margin:"0 0 18px", color:"#fff" },
  track: { height:9, background:"#0f1729", borderRadius:99, overflow:"hidden" },
  fill: { height:"100%", borderRadius:99 },
  table: { width:"100%", borderCollapse:"collapse", minWidth:440 },
  th: { textAlign:"left", fontSize:11, color:"#64748b", fontWeight:700, padding:"0 12px 10px", textTransform:"uppercase", letterSpacing:"0.04em" },
  td: { padding:"11px 12px", fontSize:13, color:"#e2e8f0" },
  note: { marginTop:18, padding:14, background:"#0f1729", borderRadius:10, fontSize:12, color:"#94a3b8", lineHeight:1.6 },
};

ReactDOM.createRoot(document.getElementById("root")).render(<App />);