/**
 * Shared age-validation utilities used by both server procedures and client UI.
 *
 * U.S. Age-of-Majority rules (guardian/parent registration):
 *   - Mississippi (MS): 21 years
 *   - Alabama (AL), Nebraska (NE): 19 years
 *   - All other states / no state provided: 18 years (federal default)
 *
 * Student age range:
 *   - Must be at least 3 years old (Pre-K minimum)
 *   - Must be no older than 21 years (post-secondary edge case)
 */

/** Minimum age of majority by U.S. state abbreviation. */
export const STATE_MIN_AGE: Record<string, number> = {
  MS: 21, // Mississippi
  AL: 19, // Alabama
  NE: 19, // Nebraska
};

/** Default age of majority for states not listed above. */
export const DEFAULT_GUARDIAN_MIN_AGE = 18;

/** Minimum age a student can register. */
export const STUDENT_MIN_AGE = 3;

/** Maximum age a student can register. */
export const STUDENT_MAX_AGE = 21;

/**
 * Calculate age in full years from a YYYY-MM-DD date-of-birth string.
 * Returns null if the string is missing or invalid.
 */
export function calcAge(dob: string): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

/**
 * Return the minimum guardian age for a given U.S. state abbreviation.
 * Falls back to DEFAULT_GUARDIAN_MIN_AGE when the state is unknown or omitted.
 */
export function getGuardianMinAge(stateAbbr?: string | null): number {
  if (!stateAbbr) return DEFAULT_GUARDIAN_MIN_AGE;
  return STATE_MIN_AGE[stateAbbr.toUpperCase()] ?? DEFAULT_GUARDIAN_MIN_AGE;
}

export type AgeValidationResult =
  | { valid: true }
  | { valid: false; reason: string };

/**
 * Validate that a guardian/parent meets the age-of-majority requirement for their state.
 *
 * @param dob   YYYY-MM-DD date of birth string (required — returns invalid if missing)
 * @param state U.S. state abbreviation (e.g. "TX"). Optional; defaults to 18.
 */
export function validateGuardianAge(
  dob: string | null | undefined,
  state?: string | null
): AgeValidationResult {
  if (!dob) {
    return { valid: false, reason: "Date of birth is required to verify eligibility." };
  }
  const age = calcAge(dob);
  if (age === null) {
    return { valid: false, reason: "Please enter a valid date of birth." };
  }
  const minAge = getGuardianMinAge(state);
  const stateLabel = state ? ` in ${state}` : "";
  if (age < minAge) {
    return {
      valid: false,
      reason: `You must be at least ${minAge} years old to register as a parent or guardian${stateLabel}. Please check your date of birth and state.`,
    };
  }
  return { valid: true };
}

/**
 * Validate that a student's age falls within the expected range for the platform.
 *
 * @param dob YYYY-MM-DD date of birth string (required — returns invalid if missing)
 */
export function validateStudentAge(
  dob: string | null | undefined
): AgeValidationResult {
  if (!dob) {
    return { valid: false, reason: "Date of birth is required to create a student account." };
  }
  const age = calcAge(dob);
  if (age === null) {
    return { valid: false, reason: "Please enter a valid date of birth." };
  }
  if (age < STUDENT_MIN_AGE) {
    return {
      valid: false,
      reason: `Students must be at least ${STUDENT_MIN_AGE} years old to register. If your child is younger, a parent or guardian account is required.`,
    };
  }
  if (age > STUDENT_MAX_AGE) {
    return {
      valid: false,
      reason: `Student accounts are available for learners up to ${STUDENT_MAX_AGE} years old. Please contact support if you need assistance.`,
    };
  }
  return { valid: true };
}
