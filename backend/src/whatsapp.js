// WhatsApp Cloud API yardımcıları
// Dokümantasyon: https://developers.facebook.com/docs/whatsapp/cloud-api

const API = "https://graph.facebook.com/v21.0";

// Veliye serbest metin mesajı gönder (24 saat penceresi içindeyken)
export async function sendText(toWaId, text) {
  const res = await fetch(`${API}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: toWaId,
      type: "text",
      text: { body: text },
    }),
  });
  if (!res.ok) throw new Error(`WhatsApp gönderim hatası: ${res.status} ${await res.text()}`);
  return res.json();
}

// Onaylı şablon mesajı gönder (24 saat penceresi DIŞINDA tek yol budur)
export async function sendTemplate(toWaId, templateName, langCode = "tr") {
  const res = await fetch(`${API}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: toWaId,
      type: "template",
      template: { name: templateName, language: { code: langCode } },
    }),
  });
  if (!res.ok) throw new Error(`Template gönderim hatası: ${res.status} ${await res.text()}`);
  return res.json();
}

// Gelen webhook gövdesinden mesajı normalize et
export function parseIncoming(body) {
  try {
    const entry = body.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const msg = value?.messages?.[0];
    if (!msg) return null;
    const contact = value.contacts?.[0];
    const media = msg.image || msg.document || msg.video || null;
    return {
      waId: msg.from,                         // gönderenin telefonu
      name: contact?.profile?.name || null,
      waMessageId: msg.id,
      type: msg.type,                          // text | image | document | video | ...
      text: msg.text?.body || media?.caption || "",
      mediaId: media?.id || null,
      timestamp: msg.timestamp,
    };
  } catch {
    return null;
  }
}

// Meta'daki bir medyanın geçici indirme URL'sini ve içerik tipini al
export async function getMediaInfo(mediaId) {
  const res = await fetch(`${API}/${mediaId}`, {
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` },
  });
  if (!res.ok) throw new Error(`Medya bilgisi alınamadı: ${res.status} ${await res.text()}`);
  return res.json(); // { url, mime_type, ... }
}

// Meta medya URL'sinden dosyayı indir (auth gerektirir)
export async function downloadMedia(url) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` },
  });
  if (!res.ok) throw new Error(`Medya indirilemedi: ${res.status}`);
  return res;
}
