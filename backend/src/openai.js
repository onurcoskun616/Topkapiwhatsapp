import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

const SYSTEM_PROMPT = fs.readFileSync(
  path.join(__dirname, "../prompts/system-prompt.md"),
  "utf-8"
);

// Görüşmeyi mesaj dizisine çevir
function toTranscript(messages) {
  return messages
    .map((m) => `${m.direction === "in" ? "Veli" : "Operatör"}: ${m.body}`)
    .join("\n");
}

// 1) ANALİZ — görüşmeden JSON çıkar (department, grade, stage, score, summary, next)
export async function analyzeConversation(messages) {
  const transcript = toTranscript(messages);
  const completion = await openai.chat.completions.create({
    model: MODEL,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content:
          `Aşağıdaki WhatsApp görüşmesini analiz et ve SADECE şu alanlarla JSON döndür:\n` +
          `department (Otomotiv|Makine|Mekatronik|Elektrik-Elektronik|Kimya|Biyomedikal|İnşaat veya ""),\n` +
          `grade ("9. Sınıf".."12. Sınıf" veya ""),\n` +
          `stage (yeni|olumlu|olumsuz|randevu|kayit),\n` +
          `score (0-100 kayıt eğilimi),\n` +
          `summary (kısa Türkçe özet),\n` +
          `next (operatöre sonraki adım önerisi).\n\n` +
          `Görüşme:\n${transcript}`,
      },
    ],
  });
  try {
    return JSON.parse(completion.choices[0].message.content);
  } catch {
    return null;
  }
}

// 2) YANIT — veliye okul danışmanı kimliğiyle cevap üret
export async function generateReply(messages) {
  const history = messages.map((m) => ({
    role: m.direction === "in" ? "user" : "assistant",
    content: m.body,
  }));
  const completion = await openai.chat.completions.create({
    model: MODEL,
    temperature: 0.5,
    messages: [{ role: "system", content: SYSTEM_PROMPT }, ...history],
  });
  return completion.choices[0].message.content;
}
