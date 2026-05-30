/**
 * server/utils/grade.ts
 *
 * Grade label, sorting, and validation helpers.
 * Pure functions — no DB calls.
 */

import { gradeToNum } from "./age";

/**
 * Human-readable grade label.
 */
export function gradeLabel(gradeLevel: string | null | undefined): string {
  if (!gradeLevel) return "All Grades";
  const g = gradeLevel.trim();
  if (g === "Pre-K") return "Pre-K";
  if (g === "Kindergarten") return "Kindergarten";
  if (g === "AP") return "AP";
  if (g === "SAT") return "SAT Prep";
  if (g === "Adult") return "Adult";
  const num = parseInt(g, 10);
  if (!isNaN(num)) {
    if (num === 1) return "Grade 1";
    return `Grade ${num}`;
  }
  return g;
}

/**
 * Sort comparator for grade levels.
 * Pre-K (-1) < Kindergarten (0) < 1 < … < 12 < AP/SAT (99)
 */
export function gradeSort(a: string | null | undefined, b: string | null | undefined): number {
  const numA = gradeToNum(a) ?? 99;
  const numB = gradeToNum(b) ?? 99;
  return numA - numB;
}

/**
 * Returns the list of grade levels a student can access given their own grade.
 * Always includes AP and SAT.
 */
export function eligibleGradeLevels(studentGrade: string | null | undefined): string[] {
  const num = gradeToNum(studentGrade);
  if (num === null) return []; // no restriction
  const grades: string[] = ["AP", "SAT"];
  for (let g = Math.max(-1, num - 2); g <= Math.min(12, num + 2); g++) {
    if (g === -1) grades.push("Pre-K");
    else if (g === 0) grades.push("Kindergarten");
    else grades.push(String(g));
  }
  return grades;
}
