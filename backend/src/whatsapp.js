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
    return {
      waId: msg.from,                         // gönderenin telefonu
      name: contact?.profile?.name || null,
      waMessageId: msg.id,
      type: msg.type,                          // text | image | document | ...
      text: msg.text?.body || "",
      timestamp: msg.timestamp,
    };
  } catch {
    return null;
  }
}
