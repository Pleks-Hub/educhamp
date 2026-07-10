/**
 * Determine whether a course subject requires the math symbol keyboard.
 * Math and Science courses need math symbols; all other subjects do not.
 */
export function needsMathKeyboard(courseSubject: string | undefined | null): boolean {
  if (!courseSubject) return false;
  const s = courseSubject.toLowerCase().trim();
  return s === "math" || s === "mathematics" || s === "science";
}

/**
 * Subjects eligible for TTS Listen Mode.
 * Language-heavy, text-heavy, and passage-based subjects benefit from audio.
 * Math/STEM subjects with equations are excluded.
 * Matches against DB subject values: "english", "ELA", "English Language Arts",
 * "language" (Spanish/French), "social_studies", "Social Studies", "science",
 * "technology", "Business", etc.
 */
const TTS_ELIGIBLE_SUBJECTS = [
  "english", "ela", "reading", "language arts",
  "language", // DB value for Spanish, French, and other language courses
  "spanish", "french",
  "history", "social studies", "social_studies",
  "science", // passage-based science content
  "technology", // technology courses are text-heavy
  "business", // business courses are text-heavy
];

export function isListenModeEligible(subjectName: string | undefined | null): boolean {
  if (!subjectName) return false;
  const s = subjectName.toLowerCase().trim();
  return TTS_ELIGIBLE_SUBJECTS.some(eligible => s.includes(eligible) || s === eligible);
}

/**
 * Get the BCP 47 language tag for TTS based on the course subject and title.
 * For "language" subject courses, we check the title to determine the actual language.
 */
export function getTtsLanguage(subjectName: string | undefined | null, courseTitle?: string | null): string {
  if (!subjectName) return "en-US";
  const s = subjectName.toLowerCase().trim();
  const t = (courseTitle ?? "").toLowerCase().trim();
  // Check subject name first
  if (s.includes("spanish")) return "es-ES";
  if (s.includes("french")) return "fr-FR";
  // For generic "language" subject, check course title
  if (s === "language" || s.includes("language")) {
    if (t.includes("spanish")) return "es-ES";
    if (t.includes("french")) return "fr-FR";
    if (t.includes("german")) return "de-DE";
    if (t.includes("italian")) return "it-IT";
    if (t.includes("portuguese")) return "pt-BR";
    if (t.includes("mandarin") || t.includes("chinese")) return "zh-CN";
    if (t.includes("japanese")) return "ja-JP";
    if (t.includes("korean")) return "ko-KR";
  }
  return "en-US";
}

/**
 * Auto-detect language from text content using Unicode character ranges
 * and common word/character patterns. Used as a fallback when course subject
 * and title don't clearly indicate the language.
 *
 * Returns a BCP 47 language tag or null if detection is inconclusive.
 */
export function detectLanguageFromContent(text: string): string | null {
  if (!text || text.length < 20) return null;

  // Take a sample of the text (first 500 chars after stripping markdown)
  const sample = text.slice(0, 500);

  // ─── CJK Detection (high confidence from character ranges) ─────────────
  const cjkChars = sample.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g);
  const hiraganaKatakana = sample.match(/[\u3040-\u309f\u30a0-\u30ff]/g);
  const hangul = sample.match(/[\uac00-\ud7af\u1100-\u11ff]/g);

  if (hiraganaKatakana && hiraganaKatakana.length > 5) return "ja-JP";
  if (hangul && hangul.length > 5) return "ko-KR";
  if (cjkChars && cjkChars.length > 10) return "zh-CN";

  // ─── Arabic script ─────────────────────────────────────────────────────
  const arabicChars = sample.match(/[\u0600-\u06ff\u0750-\u077f]/g);
  if (arabicChars && arabicChars.length > 10) return "ar-SA";

  // ─── Cyrillic (Russian) ────────────────────────────────────────────────
  const cyrillicChars = sample.match(/[\u0400-\u04ff]/g);
  if (cyrillicChars && cyrillicChars.length > 10) return "ru-RU";

  // ─── Latin-based languages (use common word patterns) ──────────────────
  const lowerSample = sample.toLowerCase();

  // Spanish indicators
  const spanishWords = ["está", "también", "pero", "como", "para", "tiene",
    "puede", "porque", "cuando", "donde", "qué", "cómo", "más", "muy",
    "este", "esta", "estos", "estas", "aquí", "ahora", "después",
    "¿", "¡", "ñ", "ción", "mente"];
  const spanishHits = spanishWords.filter(w => lowerSample.includes(w)).length;
  if (spanishHits >= 3) return "es-ES";

  // French indicators
  const frenchWords = ["est", "les", "des", "une", "que", "dans", "pour",
    "avec", "pas", "sur", "sont", "mais", "tout", "être", "avoir",
    "très", "aussi", "même", "où", "ça", "cette", "ces",
    "qu'", "l'", "d'", "n'", "c'est", "j'ai"];
  const frenchHits = frenchWords.filter(w => lowerSample.includes(w)).length;
  if (frenchHits >= 4) return "fr-FR";

  // German indicators
  const germanWords = ["ist", "und", "der", "die", "das", "ein", "eine",
    "nicht", "sich", "mit", "auch", "auf", "für", "werden", "haben",
    "über", "können", "müssen", "ß", "ä", "ö", "ü"];
  const germanHits = germanWords.filter(w => lowerSample.includes(w)).length;
  if (germanHits >= 4) return "de-DE";

  // Portuguese indicators
  const portugueseWords = ["não", "também", "está", "são", "tem", "como",
    "mais", "muito", "pode", "isso", "este", "essa", "aqui", "então",
    "porque", "quando", "ainda", "já", "ão", "ões", "ção"];
  const portugueseHits = portugueseWords.filter(w => lowerSample.includes(w)).length;
  if (portugueseHits >= 3) return "pt-BR";

  // Italian indicators
  const italianWords = ["è", "che", "non", "sono", "per", "una", "con",
    "come", "anche", "questo", "questa", "quello", "quella", "molto",
    "tutto", "fare", "essere", "avere", "gli", "delle"];
  const italianHits = italianWords.filter(w => lowerSample.includes(w)).length;
  if (italianHits >= 4) return "it-IT";

  // If no strong signal, return null (inconclusive)
  return null;
}

/**
 * Strip markdown formatting from text before passing to TTS.
 * Removes **, *, #, `, [], (), and other common markdown syntax.
 */
export function stripMarkdownForTts(text: string): string {
  return text
    .replace(/#{1,6}\s*/g, "")           // headings
    .replace(/\*\*(.+?)\*\*/g, "$1")     // bold
    .replace(/\*(.+?)\*/g, "$1")         // italic
    .replace(/__(.+?)__/g, "$1")         // bold alt
    .replace(/_(.+?)_/g, "$1")           // italic alt
    .replace(/~~(.+?)~~/g, "$1")         // strikethrough
    .replace(/`{1,3}[^`]*`{1,3}/g, "")   // inline code / code blocks
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // links [text](url)
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "") // images
    .replace(/^[\s]*[-*+]\s/gm, "")      // unordered list markers
    .replace(/^[\s]*\d+\.\s/gm, "")      // ordered list markers
    .replace(/^>\s?/gm, "")              // blockquotes
    .replace(/---+/g, "")                // horizontal rules
    .replace(/\|/g, " ")                 // table pipes
    .replace(/\n{3,}/g, "\n\n")          // excessive newlines
    .trim();
}
