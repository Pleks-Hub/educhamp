# TEKS → NY_NGLS Crosswalk Confidence Report

**Updated:** Phase 4C (2026-05-30)  
**Previous version:** Phase 3C (initial crosswalk — 26 rows; 19 none-mappings excluded as DB gap)

---

## Summary

| Alignment Type | Count | Weight | Status |
|---|---|---|---|
| `exact` | 13 | 1.00 | ✅ Committed |
| `partial` | 19 | 0.75 | ✅ Committed |
| `approximate` | 8 | 0.50 | ✅ Committed (founder-approved Phase 3C) |
| `none` (process standards) | 3 | — | ✅ Permanently none |
| **Total committed rows** | **40** | — | — |

**Phase 4C added 14 new rows** for the content-gap topics that were excluded in Phase 3C because the target NY_NGLS standards did not yet exist in the database. Those 10 NY_NGLS standards were seeded in Phase 4C before this crosswalk pass ran.

---

## Phase 4C New Mappings (14 rows)

### Polynomial Operations — TEKS A.10.x → AI-A.APR.x / AI-A.SSE.3c

| TEKS Code | Description | NY_NGLS Code | Type | Weight | Rationale |
|---|---|---|---|---|---|
| A.10(A) | Add and subtract polynomials | AI-A.APR.1 | `exact` | 1.00 | Direct 1-to-1: TEKS specifies add/subtract; NY APR.1 covers arithmetic on polynomials including add/subtract |
| A.10(B) | Multiply polynomials | AI-A.APR.1 | `exact` | 1.00 | NY APR.1 explicitly states polynomials are closed under multiplication |
| A.10(C) | Divide polynomial (degree-1 ÷ degree-1) | AI-A.APR.1 | `partial` | 0.75 | NY APR.1 does not emphasize division at Algebra I level; partial coverage only |
| A.10(D) | Rewrite polynomial expressions | AI-A.SSE.3c | `partial` | 0.75 | Rewriting to reveal structure maps to SSE.3c (equivalent forms); not a direct polynomial arithmetic standard |
| A.10(E) | Factor trinomials ax² + bx + c | AI-A.APR.3 | `exact` | 1.00 | APR.3 explicitly covers identifying zeros via factorization, which requires factoring trinomials |
| A.10(F) | Difference of two squares | AI-A.APR.3 | `partial` | 0.75 | Specific factoring case within APR.3 scope; partial because APR.3 is broader |

### Radicals and Exponents — TEKS A.11.x → AI-N.RN.2

| TEKS Code | Description | NY_NGLS Code | Type | Weight | Rationale |
|---|---|---|---|---|---|
| A.11(A) | Simplify numerical radical expressions | AI-N.RN.2 | `exact` | 1.00 | Direct 1-to-1: NY N.RN.2 covers rewriting radical expressions using exponent properties |
| A.11(B) | Laws of exponents (numeric and algebraic) | AI-N.RN.2 | `exact` | 1.00 | NY N.RN.2 explicitly covers properties of exponents for radicals and rational exponents |

### Systems of Equations — TEKS A.3(C)/A.3(F)/A.5(C) → AI-A.REI.5/6/10

| TEKS Code | Description | NY_NGLS Code | Type | Weight | Rationale |
|---|---|---|---|---|---|
| A.3(C) | Graph linear functions / identify key features (systems variant) | AI-A.REI.10 | `partial` | 0.75 | TEKS A.3(C) systems variant partially aligns with REI.10 (graph = set of solutions); not a full systems standard |
| A.3(F) | Graph systems of two linear equations | AI-A.REI.6 | `exact` | 1.00 | REI.6 explicitly covers solving systems graphically ("approximately, e.g., with graphs") |
| A.5(C) | Solve systems algebraically (substitution / elimination) | AI-A.REI.5 | `exact` | 1.00 | REI.5 covers elimination method; REI.6 covers exact algebraic solution — A.5(C) maps to REI.5 as primary |

### Parallel and Perpendicular Lines — TEKS A.2(E)/A.2(F) → AI-G.GPE.5

| TEKS Code | Description | NY_NGLS Code | Type | Weight | Rationale |
|---|---|---|---|---|---|
| A.2(E) | Write equation of a line parallel to a given line through a point | AI-G.GPE.5 | `exact` | 1.00 | GPE.5 explicitly covers slope criteria for parallel lines and finding equations through a point |
| A.2(F) | Write equation of a line perpendicular to a given line through a point | AI-G.GPE.5 | `exact` | 1.00 | GPE.5 explicitly covers slope criteria for perpendicular lines and finding equations through a point |

### Correlation Coefficient — TEKS A.4(A) → AI-S.ID.8

| TEKS Code | Description | NY_NGLS Code | Type | Weight | Rationale |
|---|---|---|---|---|---|
| A.4(A) | Calculate correlation coefficient using technology | AI-S.ID.8 | `exact` | 1.00 | Direct 1-to-1: NY S.ID.8 covers computing and interpreting the correlation coefficient of a linear fit |

---

## Phase 3C Existing Mappings (26 rows — unchanged)

These rows were committed in Phase 3C and remain unchanged. Weights are read directly from the `standardCrosswalk.alignmentWeight` column — no hardcoded values in `transferStudent()`.

### Exact (Phase 3C)

| TEKS Code | NY_NGLS Code | Weight |
|---|---|---|
| A.5(A) | AI-A.REI.3 | 1.00 |
| A.5(B) | AI-A.REI.3 | 1.00 |

### Partial (Phase 3C)

| TEKS Code | NY_NGLS Code | Weight |
|---|---|---|
| A.12(B) | AI-F.IF.1 | 0.75 |
| A.12(C) | AI-F.BF.1 | 0.75 |
| A.2(A) | AI-F.IF.1 | 0.75 |
| A.2(B) | AI-F.BF.1 | 0.75 |
| A.2(C) | AI-F.BF.1 | 0.75 |
| A.2(D) | AI-F.BF.1 | 0.75 |
| A.4(C) | AI-F.BF.1 | 0.75 |
| A.5(A) | AI-F.IF.1 | 0.75 |
| A.6(A) | AI-F.IF.1 | 0.75 |
| A.6(B) | AI-F.BF.1 | 0.75 |
| A.6(D) | AI-F.BF.1 | 0.75 |
| A.8(B) | AI-F.BF.1 | 0.75 |

### Approximate (Phase 3C — founder-approved)

| TEKS Code | NY_NGLS Code | Weight |
|---|---|---|
| A.2(H) | AI-A.REI.3 | 0.50 |
| A.3(C) | AI-F.IF.1 | 0.50 |
| A.4(A) | AI-F.BF.1 | 0.50 |
| A.6(B) | AI-F.BF.1 | 0.50 |
| A.6(C) | AI-F.BF.1 | 0.50 |
| A.7(A) | AI-F.IF.1 | 0.50 |
| A.7(C) | AI-F.BF.1 | 0.50 |
| A.8(A) | AI-F.BF.1 | 0.50 |

---

## Permanently None — Process Standards (3 standards)

These three TEKS process standards have no NY_NGLS equivalent by design. They describe mathematical practices, not content objectives, and are not crosswalkable.

| TEKS Code | Description | Decision |
|---|---|---|
| A.1(A) | Apply mathematics to problems in everyday life | Permanently none — NY Mathematical Practice Standards cover this differently and are not in scope |
| A.1(B) | Use a problem-solving model | Permanently none — process standard, no content equivalent |
| A.1(G) | Display, explain, and justify mathematical ideas | Permanently none — process standard, no content equivalent |

---

## Transfer Weight Policy

All weights are stored in `standardCrosswalk.alignmentWeight` and read directly by `transferStudent()`. No hardcoded values exist in application code. Future weight adjustments require only a database UPDATE.

| Type | Weight | Interpretation |
|---|---|---|
| `exact` | 1.00 | Full mastery credit transfers |
| `partial` | 0.75 | 75% mastery credit transfers |
| `approximate` | 0.50 | 50% mastery credit transfers |
| `none` | — | No mastery transfer (process standards only) |

---

## Phase 4C DB State

- **NY_NGLS standards in DB:** 14 (4 pre-existing + 10 seeded Phase 4C)
- **Crosswalk rows in DB:** 40 (26 Phase 3C + 14 Phase 4C)
- **TEKS standards with no crosswalk:** 3 (process standards — permanent)
