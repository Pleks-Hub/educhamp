/**
 * Determine whether a course subject requires the math symbol keyboard.
 * Math and Science courses need math symbols; all other subjects do not.
 */
export function needsMathKeyboard(courseSubject: string | undefined | null): boolean {
  if (!courseSubject) return false;
  const s = courseSubject.toLowerCase().trim();
  return s === "math" || s === "mathematics" || s === "science";
}
