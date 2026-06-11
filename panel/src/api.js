// Backend'e bağlanan fonksiyonlar.
// VITE_API_URL'i panel/.env dosyasına koyun: VITE_API_URL=https://...railway.app

const API = import.meta.env.VITE_API_URL || "http://localhost:3000";

async function j(path, opts = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}

export const api = {
  listLeads: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return j(`/api/leads${q ? "?" + q : ""}`);
  },
  getLead: (id) => j(`/api/leads/${id}`),
  updateLead: (id, patch) => j(`/api/leads/${id}`, { method: "PATCH", body: patch }),
  send: (id, text, byAI = false) => j(`/api/leads/${id}/send`, { method: "POST", body: { text, byAI } }),
  analyze: (id) => j(`/api/leads/${id}/analyze`, { method: "POST" }),
  reply: (id) => j(`/api/leads/${id}/reply`, { method: "POST" }),
  setAppointment: (id, scheduled_at) => j(`/api/leads/${id}/appointment`, { method: "PUT", body: { scheduled_at } }),
  pendingAppointments: () => j(`/api/appointments/pending`),
  confirmAppointment: (id) => j(`/api/appointments/${id}/confirm`, { method: "PATCH" }),
  templates: () => j(`/api/templates`),
  media: () => j(`/api/media`),
  reports: (period) => j(`/api/reports?period=${period}`),
  exportLeadsUrl: ({ from, to, period }) => {
    const q = new URLSearchParams();
    if (from) q.set("from", from);
    if (to) q.set("to", to);
    if (!from && !to && period) q.set("period", period);
    return `${API}/api/export/leads?${q.toString()}`;
  },
  feedback: (id, original, edited) => j(`/api/leads/${id}/feedback`, { method: "POST", body: { original, edited } }),
  mediaProxyUrl: (mediaId) => `${API}/api/media-proxy/${mediaId}`,
};

// Realtime için (Supabase): yeni mesaj/lead değişimini dinle.
// import { createClient } from "@supabase/supabase-js";
// const sb = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);
// sb.channel('leads').on('postgres_changes', {event:'*', schema:'public', table:'messages'}, cb).subscribe();
