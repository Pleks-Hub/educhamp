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
 * Returns true if the student is under 13 (COPPA threshold).
 * Returns false if age cannot be determined (conservative: do not gate
 * students whose age is unknown — they will be prompted to enter DOB).
 */
export function isUnder13(dob: string | null | undefined): boolean {
  const age = calcAge(dob);
  if (age === null) return false;
  return age < 13;
}

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
 * Students can access courses within ±2 grades of their own grade.
 * AP and SAT courses are always accessible (no grade restriction).
 */
export function gradeWindow(studentGrade: string | null | undefined): {
  floor: number | null;
  ceiling: number | null;
} {
  const num = gradeToNum(studentGrade);
  if (num === null) return { floor: null, ceiling: null };
  return { floor: num - 2, ceiling: num + 2 };
}

/**
 * Returns true if a course's gradeLevel is within the student's grade window.
 * AP and SAT courses always return true.
 */
export function isCourseEligible(
  courseGradeLevel: string | null | undefined,
  studentGrade: string | null | undefined
): boolean {
  if (!courseGradeLevel) return true;
  const cg = courseGradeLevel.trim();
  if (cg === "AP" || cg === "SAT") return true;
  const courseNum = gradeToNum(cg);
  if (courseNum === null) return true;
  const { floor, ceiling } = gradeWindow(studentGrade);
  if (floor === null || ceiling === null) return true;
  return courseNum >= floor && courseNum <= ceiling;
}
