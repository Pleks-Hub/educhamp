# EduChamp Phase 1 Migration Plan

**Status:** Awaiting founder approval before any code changes.
**Prepared:** May 30, 2026
**Scope:** Multi-district data layer, COPPA age gate, landing page de-Katying.
**Out of scope:** Gamification, auth, payments, admin console.

---

## 1. How `userMastery` (skill-level) maps to `MasteryRecord` (standard-level)

### Current state

The `userMastery` table stores mastery at the **skill** granularity:

```
userMastery
  userId      INT
  skillId     VARCHAR(32)   -- e.g. "ALG1-U1-S1"
  score       INT (0–100)
  attemptCount INT
  lastAttemptAt TIMESTAMP
```

Skills are identified by the pattern `{COURSE}-U{unit}-S{skill}` (e.g. `ALG1-U3-S2`). There is no direct foreign key to a standards row because the standards table does not yet exist.

### Target state

`MasteryRecord` stores mastery at the **learning objective** granularity, which maps 1-to-1 with a `Standard` row:

```
masteryRecords
  id               INT PK
  studentId        INT FK → users.id
  objectiveId      INT FK → learningObjectives.id   -- NULL allowed during Phase A
  standardId       INT FK → standards.id            -- NULL allowed during Phase A
  frameworkId      INT FK → standardFrameworks.id
  enrollmentContextId INT FK → enrollmentContexts.id
  score            INT (0–100)
  isMastered       BOOLEAN  (score >= masteryThreshold, default 75)
  attemptCount     INT
  lastAssessedAt   TIMESTAMP
  sourceType       ENUM('quiz','diagnostic','manual','backfill')
  createdAt        TIMESTAMP
  updatedAt        TIMESTAMP
```

### Migration steps

**Step 1 — Resolve skillId to standardId**

Each `skillId` encodes a unit number. The `units` table has a `teksAlignment` free-text column (see Section 2 for extraction). The backfill script will:

1. Parse the unit number from `skillId` (e.g. `ALG1-U3-S2` → unit 3).
2. Look up `units.id` where `courseId = ALG1_course_id AND unitNumber = 3`.
3. Look up the `unitStandards` join table to find the `standardId` for that unit (populated in Phase 1C).
4. If a unit maps to multiple standards (e.g. unit 3 has 4 TEKS standards), create one `masteryRecord` row per standard, all with the same score. This is conservative — it avoids under-crediting the student.

**Step 2 — Resolve enrollmentContextId**

All existing students are Katy ISD students. A default `enrollmentContext` row will be created for every existing student with:
- `districtId` = Katy ISD
- `frameworkId` = TEKS
- `academicYear` = "2025-26"
- `isActive` = true

**Step 3 — Insert masteryRecords**

```sql
-- Pseudocode for the backfill script
INSERT INTO masteryRecords (
  studentId, standardId, frameworkId, enrollmentContextId,
  score, isMastered, attemptCount, lastAssessedAt, sourceType
)
SELECT
  um.userId,
  us.standardId,
  teks_framework_id,
  ec.id,
  um.score,
  (um.score >= 75),
  um.attemptCount,
  um.lastAttemptAt,
  'backfill'
FROM userMastery um
JOIN skills sk ON sk.skillId = um.skillId
JOIN units u ON u.id = sk.unitId
JOIN unitStandards us ON us.unitId = u.id
JOIN enrollmentContexts ec ON ec.studentId = um.userId AND ec.isActive = true
ON DUPLICATE KEY UPDATE
  score = GREATEST(masteryRecords.score, VALUES(score)),
  isMastered = (GREATEST(masteryRecords.score, VALUES(score)) >= 75),
  attemptCount = masteryRecords.attemptCount + VALUES(attemptCount),
  updatedAt = NOW();
```

**Invariant:** `userMastery` is **not dropped** in Phase 1. It remains the live write target for quiz and diagnostic scoring. `masteryRecords` is read-only in Phase 1 (populated by backfill only). Phase 2 will dual-write to both tables; Phase 3 will migrate reads to `masteryRecords` and deprecate `userMastery`.

---

## 2. How TEKS codes are extracted from `teksAlignment` free-text

### Pattern analysis

The `teksAlignment` column contains strings in two formats:

| Format | Example |
|---|---|
| Unit-level (narrative) | `"Aligned to TEKS Algebra I — solving linear equations"` |
| Unit-level (with code) | `"TEKS 111.5(b)(2)"` |
| Lesson-level (narrative) | `"Aligned to TEKS Algebra I — algebraic reasoning"` |

The **unit-level rows with explicit codes** (format 2) are the most valuable. These appear in the Grade 3 and other elementary/secondary courses seeded via `seed-courses.mjs`. The Algebra I units use narrative-only format (format 1).

### Extraction algorithm

The backfill script (`server/backfill-standards.mjs`) will run the following logic:

```javascript
function extractTeksCode(teksAlignment) {
  if (!teksAlignment) return null;

  // Pattern 1: explicit TEKS code — "TEKS 111.5(b)(2)" or "TEKS 110.39"
  const explicit = teksAlignment.match(/TEKS\s+(\d+\.\d+(?:\([^)]+\))*)/i);
  if (explicit) return explicit[1];  // e.g. "111.5(b)(2)"

  // Pattern 2: narrative strand — extract the strand label after the em-dash
  const narrative = teksAlignment.match(/TEKS\s+\w[\w\s]+—\s+(.+)$/i);
  if (narrative) return narrative[1].trim().toLowerCase().replace(/\s+/g, '_');
  // e.g. "solving_linear_equations"

  return null;
}
```

For **explicit codes**, the script creates a `standards` row with:
- `code` = extracted code (e.g. `"111.5(b)(2)"`)
- `frameworkId` = TEKS framework ID
- `description` = the full `teksAlignment` string
- `gradeLevel` = from the parent course

For **narrative-only codes**, the script creates a `standards` row with:
- `code` = synthesised slug (e.g. `"alg1_solving_linear_equations"`)
- `frameworkId` = TEKS framework ID
- `description` = the full `teksAlignment` string
- `gradeLevel` = from the parent course
- `isCanonical` = false (flagged for human review before publishing)

The `unitStandards` join table is then populated:

```sql
INSERT INTO unitStandards (unitId, standardId, isPrimary)
VALUES (?, ?, true)
ON DUPLICATE KEY UPDATE isPrimary = VALUES(isPrimary);
```

**Gap flag:** Units with narrative-only codes will be surfaced in a `docs/BACKFILL_GAPS.md` report generated by the script. These are candidates for manual TEKS code assignment in Phase 2.

---

## 3. COPPA age gate design

### Trigger condition

The age gate fires when a student selects **grade 6 or below** during `StudentOnboarding`. This is the conservative threshold recommended by the companion spec (Section 8). The exact legal threshold (grade 6 vs. under-13 by birth date) should be confirmed with legal counsel before going live; the implementation uses grade level as a proxy since date of birth is not currently collected.

### Flow

```
StudentOnboarding step 2 (school + demographics)
  └─ gradeLevel ≤ 6?
       ├─ NO  → complete onboarding normally
       └─ YES → show "Parental Consent Required" screen
                  └─ student enters parent email
                       └─ server sends consent request email to parent
                            └─ parent clicks link → /consent?token=xxx
                                 └─ parent reviews student info + approves
                                      └─ parentalConsents row created (status='approved')
                                           └─ student redirected to dashboard
```

### New table: `parentalConsents`

```sql
CREATE TABLE parentalConsents (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  studentId       INT NOT NULL,
  parentEmail     VARCHAR(256) NOT NULL,
  parentName      VARCHAR(256),
  token           VARCHAR(64) NOT NULL UNIQUE,
  status          ENUM('pending','approved','denied','expired') DEFAULT 'pending',
  requestedAt     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  respondedAt     TIMESTAMP NULL,
  expiresAt       TIMESTAMP NOT NULL,  -- 7 days from requestedAt
  ipAddress       VARCHAR(64),
  INDEX idx_pc_student (studentId),
  INDEX idx_pc_token (token)
);
```

### Guard on AI tutor access

`tutorStream.ts` will add a pre-flight check:

```typescript
// Before streaming begins
const consentRequired = await requiresParentalConsent(ctx.user.id);
if (consentRequired) {
  res.status(403).json({ error: 'PARENTAL_CONSENT_REQUIRED' });
  return;
}
```

`requiresParentalConsent(userId)` queries:
1. `userProfiles.gradeLevel ≤ 6`
2. AND no approved `parentalConsents` row for this student

### Grandfathering existing students (founder addition, May 30)

When `COPPA_GATE_ENABLED` is switched on, existing students who are already grade ≤ 6 must not be locked out. On activation the guard checks the `parentChildren` table first:

```typescript
async function requiresParentalConsent(userId: number): Promise<boolean> {
  if (!COPPA_GATE_ENABLED) return false;
  const profile = await getUserProfile(userId);
  if (!profile || profile.gradeLevel > 6) return false;

  // Grandfathering: student already has a parent link → no new consent needed
  const hasParentLink = await db.select().from(parentChildren)
    .where(eq(parentChildren.childId, userId)).limit(1);
  if (hasParentLink.length > 0) return false;

  // Check for an approved consent record
  const consent = await db.select().from(parentalConsents)
    .where(and(
      eq(parentalConsents.studentId, userId),
      eq(parentalConsents.status, 'approved')
    )).limit(1);
  return consent.length === 0;
}
```

### Consent form validation (founder addition, May 30)

The consent form must reject a `parentEmail` that equals the student's own login email. This is enforced both server-side (tRPC input validation) and client-side (inline error message):

```typescript
// Server-side guard in requestParentalConsent procedure
if (input.parentEmail.toLowerCase() === ctx.user.email.toLowerCase()) {
  throw new TRPCError({
    code: 'BAD_REQUEST',
    message: 'Parent email must be different from the student\'s own email.'
  });
}
```

### Legal flag

> **Founder decision required:** The current implementation uses grade level ≤ 6 as the COPPA trigger. If date of birth is collected in a future sprint, the trigger should switch to `age < 13` calculated from DOB. Additionally, the consent form text and data retention policy for under-13 users should be reviewed by legal counsel before the feature goes live. The implementation will be built but the route will be behind a `COPPA_GATE_ENABLED` platform setting (default `false`) so it can be toggled on after legal review.

---

## 4. Phase 1 scope summary

| Work item | Phase | Touches existing tables? |
|---|---|---|
| New schema tables (17 tables) | 1A | No — additive only |
| Seed 3 district profiles | 1B | No — new rows only |
| Backfill `masteryRecords` from `userMastery` | 1C | Read-only from existing; new rows in new table |
| Add `frameworkId` to `courses` | 1C | ALTER TABLE — nullable, no data loss |
| Populate `unitStandards` join table | 1C | New rows only |
| Create default `enrollmentContexts` for existing students | 1C | New rows only |
| `parentalConsents` table | 1D | No — additive only |
| COPPA age gate in `StudentOnboarding` | 1D | UI + new procedure only |
| De-Katy landing page + chatbot | 1E | UI + server prompt only |

**No existing table columns are dropped in Phase 1.** All changes are additive or nullable-column additions. The running app continues to function identically for existing Katy ISD students throughout the migration.

---

## 5. Mastery threshold alignment (founder addition, May 30)

**Decision pending from founder.** The plan uses **75** as the `isMastered` threshold throughout, consistent with the existing `userMastery` label system (75–89 = "Mastered"). The companion spec specified **80**.

The threshold must be identical in both `userMastery` (existing) and `masteryRecords` (new) or the "am I at par" report will show different students as mastered depending on which table is read. The Phase 1C backfill script will use whichever value is confirmed before it runs.

| Threshold | Effect on existing students | Recommendation |
|---|---|---|
| **75** (current) | No change — students who scored 75–79 remain "Mastered" | Keep for continuity with existing progress reports |
| **80** (spec) | Students who scored 75–79 are retroactively re-classified as "Approaching" | Use only if product positioning requires the higher bar |

> **Awaiting founder confirmation: 75 or 80?** Phase 1C will not run until this is confirmed.

---

## 6. Algebra I TEKS gap — Phase 2 Day 1 priority (founder addition, May 30)

All 12 Algebra I units use narrative-only `teksAlignment` strings (e.g. `"Aligned to TEKS Algebra I — solving linear equations"`). The extraction algorithm will produce `isCanonical = false` slugs for all of them. This means:

- The `BACKFILL_GAPS.md` report will list all 12 Algebra I units as needing manual TEKS code assignment.
- The "am I at par" diagnostic **cannot work correctly for Algebra I** until real TEKS codes (e.g. `A.5(A)`, `A.7(C)`) replace the slugs.
- Algebra I is the flagship course and the STAAR EOC exam anchor.

**Phase 2 Day 1 task (before lesson content injection):** Review `BACKFILL_GAPS.md`, assign canonical TEKS codes to all 12 Algebra I units, and run the re-backfill script to update `unitStandards` and `masteryRecords` with the correct `standardId` values.

---

## 7. Phase 2 flag (tutorStream.ts lesson content injection)

As noted by the founder, Phase 2 Item 1 is:

> Update `tutorStream.ts` to inject lesson content (`explanation`, `workedExamples`, `misconceptions`) into `buildTutorSystemPrompt()` — the tutor should teach from the stored content, not parametric memory.

This is **not in Phase 1 scope** but is documented here as the first item in Phase 2. The current `buildTutorSystemPrompt` in `educhamp-helpers.ts` accepts a `courseContext` object but does not inject lesson-level content (the lesson rows store `explanation` as JSON, `workedExamples` as JSON, and `misconceptions` as JSON). Phase 2 will:

1. Accept `lessonId` as an optional parameter to `tutorStream.ts`.
2. Fetch `lessons.explanation`, `lessons.workedExamples`, `lessons.misconceptions` from the DB.
3. Inject them into the system prompt under a `## Lesson Content` section, instructing the LLM to teach from this material and not fabricate curriculum facts.
4. Fall back to the current parametric behaviour when `lessonId` is null (e.g. in free-chat mode).

---

*Phase 1 Migration Plan — approved May 30, 2026. Proceeding to Phase 1A.*

**Pending before Phase 1C:** Founder confirmation of mastery threshold (75 or 80).
