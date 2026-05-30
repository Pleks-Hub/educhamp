/**
 * server/utils/age.ts
 *
 * Age calculation helpers used by the COPPA gate and age-to-grade logic.
 * All functions are pure (no DB calls) and fully unit-testable.
 */

/**
 * Calculate age in whole years from a YYYY-MM-DD date string.
 * Returns null if the input is missing or unparseable.
 */
export function calcAge(dob: string | null | undefined): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

/**
 * Returns true if the student is under 14 (EduChamp product policy — one year
 * above the COPPA legal minimum of 13 to ensure all 8th-graders are gated).
 * Returns false if age cannot be determined (conservative: do not gate
 * students whose age is unknown — they will be prompted to enter DOB).
 */
export function isUnder14(dob: string | null | undefined): boolean {
  const age = calcAge(dob);
  if (age === null) return false;
  return age < 14;
}

/** @deprecated Use isUnder14 — kept for backwards compatibility during migration */
export const isUnder13 = isUnder14;

/**
 * Returns true if the student is under 18.
 */
export function isMinor(dob: string | null | undefined): boolean {
  const age = calcAge(dob);
  if (age === null) return false;
  return age < 18;
}

/**
 * Derive the expected US school grade from a date of birth.
 * US school year starts in September; cutoff is typically September 1.
 * Returns a grade string matching the gradeLevel enum used in the DB:
 *   "Pre-K" | "Kindergarten" | "1" … "12" | "Adult"
 */
export function ageToGrade(dob: string | null | undefined): string | null {
  const age = calcAge(dob);
  if (age === null) return null;
  if (age < 4) return "Pre-K";
  if (age === 4) return "Pre-K";
  if (age === 5) return "Kindergarten";
  if (age >= 6 && age <= 18) {
    // Grade = age - 5 (Kindergarten at 5, Grade 1 at 6, …, Grade 12 at 17-18)
    const grade = Math.min(age - 5, 12);
    return String(grade);
  }
  return "Adult";
}

/**
 * Convert a gradeLevel string to a numeric value for comparison.
 * Returns null if the grade is not numeric (AP, SAT, Adult, etc.).
 */
export function gradeToNum(gradeLevel: string | null | undefined): number | null {
  if (!gradeLevel) return null;
  const g = gradeLevel.trim();
  if (g === "Pre-K") return -1;
  if (g === "Kindergarten") return 0;
  const m = g.match(/^(\d+)$/);
  return m ? parseInt(m[1], 10) : null;
}

/**
 * Returns the grade floor and ceiling for a given student grade.
 *
 * Spec behaviour (approved 2026-05-30):
 *   - Floor: student grade - 1 (one grade below is always accessible)
 *   - Ceiling: none for Grade 7 and above (advanced students are not blocked)
 *   - Ceiling for Grade 6 and below: student grade + 2 (prevent very young
 *     students from seeing high-school content)
 *
 * AP and SAT courses are always accessible regardless of grade.
 */
export function gradeWindow(studentGrade: string | null | undefined): {
  floor: number | null;
  ceiling: number | null;
} {
  const num = gradeToNum(studentGrade);
  if (num === null) return { floor: null, ceiling: null };
  const floor = num - 1;
  // No upper ceiling for Grade 7+ (num >= 7); soft ceiling for younger students
  const ceiling = num >= 7 ? null : num + 2;
  return { floor, ceiling };
}

/**
 * Returns true if a course's gradeLevel is within the student's grade window.
 * AP and SAT courses always return true.
 * Grade 7+ students have no upper ceiling — they can access any course at or
 * above their floor (grade - 1).
 */
export function isCourseEligible(
  courseGradeLevel: string | null | undefined,
  studentGrade: string | null | undefined
): boolean {
  if (!courseGradeLevel) return true;
  const cg = courseGradeLevel.trim();
  if (cg === "AP" || cg === "SAT") return true;
  const courseNum = gradeToNum(cg);
  if (courseNum === null) return true; // non-numeric grade (AP, SAT, Adult) — always eligible
  const { floor, ceiling } = gradeWindow(studentGrade);
  if (floor === null) return true; // student grade unknown — show everything
  if (courseNum < floor) return false; // below floor — not eligible
  if (ceiling !== null && courseNum > ceiling) return false; // above soft ceiling (young students only)
  return true;
}
