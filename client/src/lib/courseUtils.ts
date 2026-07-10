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
 * "language" (Spanish/French), "social_studies", "Social Studies", "science", etc.
 */
const TTS_ELIGIBLE_SUBJECTS = [
  "english", "ela", "reading", "language arts",
  "language", // DB value for Spanish, French, and other language courses
  "spanish", "french",
  "history", "social studies", "social_studies",
  "science", // passage-based science content
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
