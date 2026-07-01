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
 */
const TTS_ELIGIBLE_SUBJECTS = [
  "english", "ela", "reading", "language arts",
  "spanish", "french", "history", "social studies",
  "science", // passage-based science content
];

export function isListenModeEligible(subjectName: string | undefined | null): boolean {
  if (!subjectName) return false;
  const s = subjectName.toLowerCase().trim();
  return TTS_ELIGIBLE_SUBJECTS.some(eligible => s.includes(eligible));
}

/**
 * Get the BCP 47 language tag for TTS based on the course subject.
 */
export function getTtsLanguage(subjectName: string | undefined | null): string {
  if (!subjectName) return "en-US";
  const s = subjectName.toLowerCase().trim();
  if (s.includes("spanish")) return "es-ES";
  if (s.includes("french")) return "fr-FR";
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
