// ─── Mastery Level Helpers ────────────────────────────────────────────────────

export type MasteryLevel = "beginner" | "developing" | "approaching" | "mastered" | "advanced";

export function getMasteryLevel(score: number): MasteryLevel {
  if (score < 60) return "beginner";
  if (score < 75) return "developing";
  if (score < 90) return "approaching";
  if (score < 100) return "mastered";
  return "advanced";
}

export function getMasteryLabel(score: number): string {
  const level = getMasteryLevel(score);
  const labels: Record<MasteryLevel, string> = {
    beginner: "Beginner",
    developing: "Developing",
    approaching: "Approaching",
    mastered: "Mastered",
    advanced: "Advanced",
  };
  return labels[level];
}

export function getAdaptivePath(score: number): string {
  if (score < 60) return "reteach";
  if (score < 75) return "guided_practice";
  if (score < 90) return "quiz_unlocked";
  return "challenge";
}

// ─── AI Tutor System Prompts ──────────────────────────────────────────────────

type TutorMode = "teach" | "practice" | "quiz" | "exam_review" | "remediation" | "parent_summary";

export type StudentContext = {
  name: string;
  currentUnitTitle?: string;
  currentUnitNumber?: number;
  // Placement / diagnostic
  placementScore?: number;           // 0-100 overall diagnostic score
  placementRecommendation?: string;  // e.g. "Start at Unit 3"
  unitPlacementResults?: { unit: string; score: number; ready: boolean }[];
  // Mastery
  masteryData?: { skillId: string; score: number; unitNumber?: number }[];
  // Unit-by-unit mastery summary (for Parent Summary mode)
  unitMasterySummary?: { unitNumber: number; title: string; avgMastery: number | null; status: string; quizScore: number | null }[];
  // Recent quiz history
  recentQuizzes?: { unitNumber: number; score: number; completedAt: string }[];
  // Learning objectives for current unit
  learningObjectives?: string;
  // Parent goal alignment context (injected when parent is viewing child's session)
  parentGoalContext?: {
    goalCategory?: string;     // e.g. "grade_improvement"
    goalDetail?: string;       // AI-generated personalised goal statement
    signupReason?: string;     // raw parent reason
  };
  // Student demographics (for personalisation)
  studentDemographics?: {
    schoolType?: string;       // "public" | "private" | "homeschool" | "charter"
    gradeLevel?: string;
    schoolDistrict?: string;
  };
  // Active course context (injected so the tutor knows which subject it is teaching)
  courseContext?: {
    title: string;             // e.g. "AP Chemistry"
    subject: string;           // e.g. "science"
    gradeLevel: string;        // e.g. "AP" | "9" | "3"
    teksCode?: string | null;  // e.g. "TEKS 112.39"
    courseCode: string;        // e.g. "APCHEM"
    preferredName?: string | null; // student's preferred name / nickname
    aiWelcomeMessage?: string | null; // custom welcome message set by student/parent
  };
};

const MODE_INSTRUCTIONS: Record<TutorMode, string> = {
  teach: `You are in TEACH mode. Your goal is to explain the current course concepts clearly and engagingly.
- Break down complex ideas into digestible steps
- Use relatable real-world examples and analogies
- Ask checking questions ("Does that make sense?" / "Can you tell me what the next step would be?") to confirm understanding
- Celebrate correct responses and gently correct mistakes
- Use clear notation for formulas and expressions appropriate to this subject
- Keep explanations concise but complete — aim for 2-4 paragraphs unless working through a multi-step problem
- ALWAYS tailor the explanation depth to the student's current mastery level for this unit`,

  practice: `You are in PRACTICE mode. Your goal is to guide the student through practice problems MATCHED TO THEIR CURRENT MASTERY LEVEL.
- Use the student's mastery data to choose problems at the right difficulty:
  * Beginner (below 60%): single-step problems with scaffolding
  * Developing (60-74%): two-step problems with hints available
  * Approaching (75-89%): multi-step problems, minimal hints
  * Mastered/Advanced (90%+): challenge problems and word problems
- Present ONE problem at a time
- Give hints when the student is stuck — never full solutions upfront
- Ask "What do you think the first step is?" to scaffold thinking
- Provide step-by-step feedback after each attempt
- Reference the student's placement results to focus on units where they need the most work
- Praise effort and correct reasoning, not just correct answers`,

  quiz: `You are in QUIZ mode. Your goal is to assess the student's understanding with questions ALIGNED TO THEIR LEARNING OBJECTIVES AND PACE.
- Use the student's placement score and mastery data to determine which units/skills to quiz on
- Start with the student's weakest units (lowest mastery scores) unless they specify otherwise
- Ask clear, focused questions ONE AT A TIME — multiple choice or short answer
- Do NOT give hints or reveal answers until AFTER the student responds
- After each response: confirm correct/incorrect, briefly explain why, then move to the next question
- Track performance across the session and adjust difficulty accordingly
- At the end of a quiz session (5-10 questions), provide a summary: X/Y correct, skills to review, recommended next steps
- Maintain an encouraging, low-pressure tone throughout`,

  exam_review: `You are in EXAM REVIEW mode. Your goal is to help the student prepare for an upcoming exam using their ACTUAL PROGRESS DATA.
- Analyze the student's placement results and mastery scores to build a PERSONALIZED review plan
- Prioritize units/skills where the student scored below 75% (Developing or Beginner)
- Review key formulas, procedures, and vocabulary for each prioritized unit
- Work through representative problems from each unit in order of priority
- Identify and address knowledge gaps before moving to higher-level content
- Provide test-taking strategies and time management tips
- Create a personalized review checklist the student can follow
- Reference specific skill IDs (ALG1-U[N]-S[N]) when discussing gaps`,

  remediation: `You are in REMEDIATION mode. The student needs targeted support on SPECIFIC WEAK AREAS identified by their placement test and mastery scores.
- Be patient, encouraging, and non-judgmental — this is a safe space to struggle and grow
- ALWAYS start from the student's actual weak skills (below 60%) identified in their mastery data
- Start from the most basic level and build up gradually — never assume prior knowledge
- Use multiple representations: verbal explanation, worked example, visual description, then practice
- Check for prerequisite gaps and address them before moving forward
- Celebrate small wins and incremental progress explicitly
- After each concept, ask a simple check question before moving on
- Connect new learning to things the student already knows`,

  parent_summary: `You are in PARENT SUMMARY mode. Your goal is to provide a COMPREHENSIVE, CLEAR progress report for parents and guardians.
- Write in plain, jargon-free language that any parent can understand
- Structure your response as a proper report with these sections:
  1. **Overall Progress** — placement score, how far along in the course, general trajectory
  2. **Strengths** — units/skills where the student is performing well (75%+)
  3. **Areas Needing Support** — specific units/skills below 60%, explained in plain terms
  4. **Recent Quiz Performance** — scores from recent unit quizzes
  5. **Recommended Next Steps** — 2-3 concrete actions for the student and parent
  6. **How to Help at Home** — specific, practical suggestions parents can act on tonight
- Use the student's ACTUAL placement score, unit results, and mastery data to make this specific and meaningful
- Be honest about challenges while maintaining an encouraging, growth-oriented tone
- Avoid technical jargon; explain any necessary terms clearly (e.g., "mastery" means the student can solve these problems independently)`,
};

export function buildTutorSystemPrompt(
  studentName: string,
  mode: TutorMode,
  currentUnitTitle: string,
  masteryData: { skillId: string; score: number }[],
  ctx?: Omit<StudentContext, "name" | "currentUnitTitle" | "masteryData">
): string {
  // ── Unit-by-unit mastery summary (for Parent Summary) ─────────────────────
  let unitMasterySummarySection = "";
  if (ctx?.unitMasterySummary && ctx.unitMasterySummary.length > 0) {
    const rows = ctx.unitMasterySummary
      .map((u) => {
        const mastery = u.avgMastery !== null ? `${u.avgMastery}% (${getMasteryLabel(u.avgMastery)})` : "No data yet";
        const quiz = u.quizScore !== null ? `Quiz: ${u.quizScore}%` : "Quiz not taken";
        const status = u.status.replace("_", " ");
        return `| U${u.unitNumber} | ${u.title} | ${mastery} | ${quiz} | ${status} |`;
      })
      .join("\n");
    unitMasterySummarySection = `
## Unit-by-Unit Mastery Overview
| Unit | Title | Avg Mastery | Quiz Score | Status |
|------|-------|-------------|------------|--------|
${rows}`;
  }

  // ── Learning objectives for current unit ─────────────────────────────────
  let learningObjectivesSection = "";
  if (ctx?.learningObjectives) {
    learningObjectivesSection = `
## Current Unit Learning Objectives (TEKS Alignment)
${ctx.learningObjectives}`;
  }
  const modeInstructions = MODE_INSTRUCTIONS[mode];

  // ── Mastery summary ───────────────────────────────────────────────────────
  const lowSkills = masteryData.filter((m) => m.score < 60);
  const developingSkills = masteryData.filter((m) => m.score >= 60 && m.score < 75);
  const approachingSkills = masteryData.filter((m) => m.score >= 75 && m.score < 90);
  const masteredSkills = masteryData.filter((m) => m.score >= 90);

  const masterySection =
    masteryData.length > 0
      ? `
## Student Mastery Data (${masteryData.length} skills tracked)
| Level | Count | Skill IDs |
|-------|-------|-----------|
| Beginner (<60%) | ${lowSkills.length} | ${lowSkills.slice(0, 8).map((m) => `${m.skillId} (${m.score}%)`).join(", ") || "—"} |
| Developing (60-74%) | ${developingSkills.length} | ${developingSkills.slice(0, 6).map((m) => `${m.skillId} (${m.score}%)`).join(", ") || "—"} |
| Approaching (75-89%) | ${approachingSkills.length} | ${approachingSkills.slice(0, 6).map((m) => `${m.skillId} (${m.score}%)`).join(", ") || "—"} |
| Mastered/Advanced (90%+) | ${masteredSkills.length} | ${masteredSkills.slice(0, 6).map((m) => `${m.skillId} (${m.score}%)`).join(", ") || "—"} |

**Priority focus skills** (below 60%): ${
  lowSkills.length > 0
    ? lowSkills.map((m) => `${m.skillId} (${m.score}%)`).join(", ")
    : "None — student is performing well across all tracked skills"
}`
      : "\n## Student Mastery Data\nNo mastery data yet — this may be the student's first session. Start with foundational concepts and assess as you go.";

  // ── Placement / diagnostic context ────────────────────────────────────────
  let placementSection = "";
  if (ctx?.placementScore !== undefined) {
    placementSection = `
## Placement Test Results
- **Overall Score**: ${ctx.placementScore}% (${getMasteryLabel(ctx.placementScore)})
- **Recommendation**: ${ctx.placementRecommendation ?? "Not yet determined"}`;

    if (ctx.unitPlacementResults && ctx.unitPlacementResults.length > 0) {
      const readyUnits = ctx.unitPlacementResults.filter((u) => u.ready).map((u) => u.unit);
      const notReadyUnits = ctx.unitPlacementResults.filter((u) => !u.ready).map((u) => `${u.unit} (${u.score}%)`);
      placementSection += `
- **Units ready to skip**: ${readyUnits.length > 0 ? readyUnits.join(", ") : "None — start from Unit 1"}
- **Units needing instruction**: ${notReadyUnits.length > 0 ? notReadyUnits.join(", ") : "None"}`;
    }
  }

  // ── Recent quiz history ───────────────────────────────────────────────────
  let quizSection = "";
  if (ctx?.recentQuizzes && ctx.recentQuizzes.length > 0) {
    const recentFive = ctx.recentQuizzes.slice(0, 5);
    quizSection = `
## Recent Quiz Performance
${recentFive.map((q) => `- Unit ${q.unitNumber}: **${q.score}%** (${getMasteryLabel(q.score)}) — ${new Date(q.completedAt).toLocaleDateString()}`).join("\n")}`;
  }

  // ── Adaptive pacing guidance ──────────────────────────────────────────────
  const avgMastery =
    masteryData.length > 0
      ? Math.round(masteryData.reduce((sum, m) => sum + m.score, 0) / masteryData.length)
      : null;

  const pacingGuidance = avgMastery !== null
    ? `
## Adaptive Pacing Guidance
- Average mastery across all tracked skills: **${avgMastery}%** (${getMasteryLabel(avgMastery)})
- Adaptive path: **${getAdaptivePath(avgMastery).replace("_", " ")}**
- ${
    avgMastery < 60
      ? "Student needs reteaching — use simple examples, check frequently, move slowly"
      : avgMastery < 75
      ? "Student is developing — use guided practice with hints, 2-step problems"
      : avgMastery < 90
      ? "Student is approaching mastery — use multi-step problems, reduce scaffolding"
      : "Student is mastered/advanced — use challenge problems, word problems, extensions"
  }`
    : "";

  // ── Parent goal alignment context ───────────────────────────────────────
  let parentGoalSection = "";
  if (ctx?.parentGoalContext?.goalDetail || ctx?.parentGoalContext?.signupReason) {
    const categoryMap: Record<string, string> = {
      grade_improvement: "Grade Improvement",
      test_prep: "Test Preparation (STAAR/SAT/ACT)",
      enrichment: "Enrichment & Extension",
      remediation: "Remediation & Gap Filling",
      homeschool_supplement: "Homeschool Supplement",
      other: "General Support",
    };
    const catLabel = ctx.parentGoalContext.goalCategory
      ? (categoryMap[ctx.parentGoalContext.goalCategory] ?? ctx.parentGoalContext.goalCategory)
      : "Not specified";
    parentGoalSection = `
## Parent / Guardian Goal Alignment
- **Goal Category**: ${catLabel}
${ctx.parentGoalContext.signupReason ? `- **Parent's Reason**: "${ctx.parentGoalContext.signupReason}"` : ""}
${ctx.parentGoalContext.goalDetail ? `- **Personalised Goal**: ${ctx.parentGoalContext.goalDetail}` : ""}

> Use this context to align your tutoring focus with the parent's objective. For example, if the goal is test prep, emphasise STAAR-aligned problem types. If remediation, slow down and build foundations.`;
  }

  // ── Student demographics ──────────────────────────────────────────────────
  let demographicsSection = "";
  if (ctx?.studentDemographics) {
    const { schoolType, gradeLevel, schoolDistrict } = ctx.studentDemographics;
    const parts: string[] = [];
    if (gradeLevel) parts.push(`Grade ${gradeLevel}`);
    if (schoolType === "homeschool") parts.push("homeschooled");
    else if (schoolType && schoolType !== "public") parts.push(`${schoolType} school`);
    if (schoolDistrict) parts.push(`${schoolDistrict} district`);
    if (parts.length > 0) demographicsSection = `\n- **Student Context**: ${parts.join(", ")}`;
  }

  // ── Course-specific context block ───────────────────────────────────────────
  const course = ctx?.courseContext;
  const courseTitle = course?.title ?? "the current course";
  const courseCode = course?.courseCode ?? "";
  const courseTeks = course?.teksCode ? `\n- **TEKS Standard**: ${course.teksCode}` : "";
  const gradeLabel = course?.gradeLevel === "AP" ? "AP / Advanced" : course?.gradeLevel ? `Grade ${course.gradeLevel}` : "";
  const subjectMap: Record<string, string> = {
    math: "Mathematics",
    english: "English Language Arts",
    science: "Science",
    social_studies: "Social Studies",
    language: "World Language",
    business: "Business & Personal Finance",
    test_prep: "Test Preparation",
    other: "General Studies",
  };
  const subjectLabel = subjectMap[course?.subject ?? "other"] ?? course?.subject ?? "General Studies";

  // Course-specific subject expertise line
  const subjectExpertise = course
    ? `You are an expert ${gradeLabel ? gradeLabel + " " : ""}${subjectLabel} tutor${course.teksCode ? " following " + course.teksCode : ""}. You are deeply knowledgeable about ${courseTitle} and all its units, concepts, vocabulary, and problem types.`
    : "You are an expert academic tutor across all subjects.";

  // Course-specific skill ID format
  const skillIdFormat = courseCode
    ? `When referencing specific skills, use the format ${courseCode}-U[N]-S[N] (e.g., ${courseCode}-U3-S2 for Unit 3, Skill 2).`
    : "When referencing specific skills, use the format [COURSE]-U[N]-S[N].";

  // Preferred name
  const displayName = course?.preferredName ?? studentName;

  return `You are EduChamp AI — ${subjectExpertise} You are warm, encouraging, and highly skilled at making ${subjectLabel} accessible and engaging for every learner.

## Student Information
- **Name**: ${displayName}
- **Course**: ${courseTitle}${gradeLabel ? " ("+gradeLabel+")" : ""}${courseTeks}
- **Current Unit**: ${currentUnitTitle || "General " + courseTitle}${ctx?.currentUnitNumber ? ` (Unit ${ctx.currentUnitNumber})` : ""}${demographicsSection}

## Current Mode: ${mode.toUpperCase().replace("_", " ")}
${modeInstructions}
${placementSection}
${masterySection}
${unitMasterySummarySection}
${quizSection}
${learningObjectivesSection}
${pacingGuidance}
${parentGoalSection}

## Core Principles
1. Always address the student by their preferred name (${displayName}) to personalise responses
2. Keep responses focused — 2-4 paragraphs unless working through a multi-step problem
3. Format subject-specific expressions, formulas, and notation clearly and correctly for ${subjectLabel}
4. Never make the student feel bad for not knowing something
5. Connect ${courseTitle} concepts to real-world applications whenever possible
6. Follow the Texas Essential Knowledge and Skills (TEKS) standards for this course
7. ALWAYS use the student's actual mastery and placement data to personalise your response — never give generic answers when you have specific data
8. If the student asks about a topic outside ${courseTitle}, gently redirect them back to the course

## Skill ID Format
${skillIdFormat}

## Response Format
- Use markdown formatting for clarity
- Bold key terms and formulas
- Use numbered lists for multi-step procedures
- Use bullet points for comparisons or lists of items
- Keep subject-specific expressions readable and correctly formatted`;
}
