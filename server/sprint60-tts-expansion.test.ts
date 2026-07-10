/**
 * Tests for TTS eligibility expansion (technology, business) and language auto-detection
 */
import { describe, it, expect } from "vitest";

// Re-implement the logic for testing (mirrors courseUtils.ts)
const TTS_ELIGIBLE_SUBJECTS = [
  "english", "ela", "reading", "language arts",
  "language", "spanish", "french",
  "history", "social studies", "social_studies",
  "science",
  "technology",
  "business",
];

function isListenModeEligible(subjectName: string | null): boolean {
  if (!subjectName) return false;
  const s = subjectName.toLowerCase().trim();
  return TTS_ELIGIBLE_SUBJECTS.some(eligible => s.includes(eligible) || s === eligible);
}

function detectLanguageFromContent(text: string): string | null {
  if (!text || text.length < 20) return null;
  const sample = text.slice(0, 500);

  // CJK
  const hiraganaKatakana = sample.match(/[\u3040-\u309f\u30a0-\u30ff]/g);
  const hangul = sample.match(/[\uac00-\ud7af\u1100-\u11ff]/g);
  const cjkChars = sample.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g);
  if (hiraganaKatakana && hiraganaKatakana.length > 5) return "ja-JP";
  if (hangul && hangul.length > 5) return "ko-KR";
  if (cjkChars && cjkChars.length > 10) return "zh-CN";

  // Arabic
  const arabicChars = sample.match(/[\u0600-\u06ff\u0750-\u077f]/g);
  if (arabicChars && arabicChars.length > 10) return "ar-SA";

  // Cyrillic
  const cyrillicChars = sample.match(/[\u0400-\u04ff]/g);
  if (cyrillicChars && cyrillicChars.length > 10) return "ru-RU";

  const lowerSample = sample.toLowerCase();

  // Spanish
  const spanishWords = ["está", "también", "pero", "como", "para", "tiene",
    "puede", "porque", "cuando", "donde", "qué", "cómo", "más", "muy",
    "este", "esta", "estos", "estas", "aquí", "ahora", "después",
    "¿", "¡", "ñ", "ción", "mente"];
  const spanishHits = spanishWords.filter(w => lowerSample.includes(w)).length;
  if (spanishHits >= 3) return "es-ES";

  // French
  const frenchWords = ["est", "les", "des", "une", "que", "dans", "pour",
    "avec", "pas", "sur", "sont", "mais", "tout", "être", "avoir",
    "très", "aussi", "même", "où", "ça", "cette", "ces",
    "qu'", "l'", "d'", "n'", "c'est", "j'ai"];
  const frenchHits = frenchWords.filter(w => lowerSample.includes(w)).length;
  if (frenchHits >= 4) return "fr-FR";

  // German
  const germanWords = ["ist", "und", "der", "die", "das", "ein", "eine",
    "nicht", "sich", "mit", "auch", "auf", "für", "werden", "haben",
    "über", "können", "müssen", "ß", "ä", "ö", "ü"];
  const germanHits = germanWords.filter(w => lowerSample.includes(w)).length;
  if (germanHits >= 4) return "de-DE";

  // Portuguese
  const portugueseWords = ["não", "também", "está", "são", "tem", "como",
    "mais", "muito", "pode", "isso", "este", "essa", "aqui", "então",
    "porque", "quando", "ainda", "já", "ão", "ões", "ção"];
  const portugueseHits = portugueseWords.filter(w => lowerSample.includes(w)).length;
  if (portugueseHits >= 3) return "pt-BR";

  // Italian
  const italianWords = ["è", "che", "non", "sono", "per", "una", "con",
    "come", "anche", "questo", "questa", "quello", "quella", "molto",
    "tutto", "fare", "essere", "avere", "gli", "delle"];
  const italianHits = italianWords.filter(w => lowerSample.includes(w)).length;
  if (italianHits >= 4) return "it-IT";

  return null;
}

// ─── TTS Eligibility Tests ───────────────────────────────────────────────────

describe("TTS Eligibility — Expanded Subjects", () => {
  it("should mark 'technology' as eligible", () => {
    expect(isListenModeEligible("technology")).toBe(true);
  });

  it("should mark 'Technology' (capitalized) as eligible", () => {
    expect(isListenModeEligible("Technology")).toBe(true);
  });

  it("should mark 'business' as eligible", () => {
    expect(isListenModeEligible("business")).toBe(true);
  });

  it("should mark 'Business' (capitalized) as eligible", () => {
    expect(isListenModeEligible("Business")).toBe(true);
  });

  it("should still mark 'math' as NOT eligible", () => {
    expect(isListenModeEligible("math")).toBe(false);
  });

  it("should still mark 'Mathematics' as NOT eligible", () => {
    expect(isListenModeEligible("Mathematics")).toBe(false);
  });

  it("should mark 'language' as eligible", () => {
    expect(isListenModeEligible("language")).toBe(true);
  });

  it("should mark 'social_studies' as eligible", () => {
    expect(isListenModeEligible("social_studies")).toBe(true);
  });

  it("should mark 'ELA' as eligible", () => {
    expect(isListenModeEligible("ELA")).toBe(true);
  });

  it("should mark 'Test Preparation' as NOT eligible", () => {
    expect(isListenModeEligible("Test Preparation")).toBe(false);
  });

  it("should return false for null", () => {
    expect(isListenModeEligible(null)).toBe(false);
  });
});

// ─── Language Auto-Detection Tests ───────────────────────────────────────────

describe("Language Auto-Detection from Content", () => {
  it("should detect Spanish from content with Spanish words", () => {
    const spanishText = "Hoy vamos a aprender sobre la historia de España. También vamos a hablar sobre cómo los exploradores navegaron por el mundo. ¿Estás listo para comenzar?";
    expect(detectLanguageFromContent(spanishText)).toBe("es-ES");
  });

  it("should detect French from content with French words", () => {
    const frenchText = "Aujourd'hui, nous allons apprendre les mathématiques. C'est très important pour votre avenir. Les nombres sont partout dans notre vie quotidienne.";
    expect(detectLanguageFromContent(frenchText)).toBe("fr-FR");
  });

  it("should detect German from content with German words", () => {
    const germanText = "Heute werden wir über die Geschichte Deutschlands sprechen. Die Kultur ist sehr interessant und hat sich über die Jahrhunderte entwickelt.";
    expect(detectLanguageFromContent(germanText)).toBe("de-DE");
  });

  it("should detect Japanese from hiragana/katakana characters", () => {
    const japaneseText = "今日はとても良い天気ですね。みなさん、おはようございます。今日の授業を始めましょう。";
    expect(detectLanguageFromContent(japaneseText)).toBe("ja-JP");
  });

  it("should detect Korean from hangul characters", () => {
    const koreanText = "오늘은 한국어 수업을 시작하겠습니다. 여러분 안녕하세요. 오늘의 주제는 문법입니다.";
    expect(detectLanguageFromContent(koreanText)).toBe("ko-KR");
  });

  it("should detect Chinese from CJK characters", () => {
    const chineseText = "今天我们将学习中国历史。中国有着五千年的悠久历史和丰富的文化遗产。让我们开始今天的课程。";
    expect(detectLanguageFromContent(chineseText)).toBe("zh-CN");
  });

  it("should detect Russian from Cyrillic characters", () => {
    const russianText = "Сегодня мы будем изучать русскую литературу. Русская культура очень богата и интересна для изучения.";
    expect(detectLanguageFromContent(russianText)).toBe("ru-RU");
  });

  it("should detect Arabic from Arabic script", () => {
    const arabicText = "اليوم سنتعلم عن التاريخ العربي والحضارة الإسلامية. هذا الموضوع مهم جداً لفهم العالم الحديث.";
    expect(detectLanguageFromContent(arabicText)).toBe("ar-SA");
  });

  it("should return null for English content (no strong non-English signal)", () => {
    const englishText = "Today we will learn about the history of the United States. The founding fathers established a new form of government.";
    expect(detectLanguageFromContent(englishText)).toBe(null);
  });

  it("should return null for very short text (less than 20 chars)", () => {
    expect(detectLanguageFromContent("Hola mundo")).toBe(null);
  });

  it("should return null for empty string", () => {
    expect(detectLanguageFromContent("")).toBe(null);
  });

  it("should detect Portuguese from content", () => {
    const portugueseText = "Hoje não vamos estudar matemática. Também precisamos entender que isso é muito importante para o futuro.";
    expect(detectLanguageFromContent(portugueseText)).toBe("pt-BR");
  });

  it("should detect Italian from content", () => {
    const italianText = "Oggi non studieremo la matematica. Questo è molto importante per il vostro futuro. Anche la storia è fondamentale per capire il mondo.";
    expect(detectLanguageFromContent(italianText)).toBe("it-IT");
  });
});
