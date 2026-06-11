// Sık sorulan sorulara hazır cevaplar — OpenAI çağrısı yapmadan yanıtlamak için.
// Eşleşme bulunursa o sabit cevap gönderilir, bulunamazsa null döner ve
// normal LLM akışı devam eder.

const FAQS = [
  {
    patterns: [/burs/i],
    answer:
      "Maalesef okulumuzda burs uygulamamız bulunmamaktadır.",
  },
  {
    patterns: [/k[ıi]yafet/i, /yemek/i],
    answer:
      "Kıyafet ve yemek ücreti bulunmaktadır, eğitim-öğretim ücretsizdir.",
  },
  {
    patterns: [/[uü]cret/i, /paral[ıi]\s*m[ıi]/i, /kaç\s*para/i, /ne\s*kadar/i],
    answer:
      "Okulumuz Devlet Destekli olup 4 yıl boyunca eğitim-öğretim ücretsizdir.",
  },
  {
    patterns: [/servis/i],
    answer:
      "Servis güzergahları kayıt esnasında servis firmasından detaylıca bilgilendirilir.",
  },
  {
    patterns: [/belge/i, /evrak/i],
    answer:
      "Kayıt için: öğrenci nüfus cüzdanı fotokopisi, 2 vesikalık fotoğraf, önceki karne/diploma ve veli kimlik fotokopisi gerekmektedir.",
  },
];

// Bu kelimeler geçen mesajlarda hazır cevap KULLANMA — bağlam/akış önemli,
// LLM'in görüşme akışını yönetmesi gerekir.
const SKIP_PATTERNS = [/randevu/i, /görüş/i, /kampüs/i, /bölüm/i];

export function matchFaq(text) {
  if (!text) return null;
  if (SKIP_PATTERNS.some((p) => p.test(text))) return null;

  for (const faq of FAQS) {
    if (faq.patterns.some((p) => p.test(text))) return faq.answer;
  }
  return null;
}
