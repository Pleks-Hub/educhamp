/**
 * diagnosticFollowUp.ts — Email template for diagnostic assessment follow-up.
 *
 * Sent 24 hours after a student completes a diagnostic assessment if they
 * haven't started working on their recommended units yet.
 */
import { BRAND, wrapEmailHtml, ctaButton } from "./emailBase";

export interface DiagnosticFollowUpEmailOptions {
  studentName: string;
  courseName: string;
  overallScore: number;
  prerequisiteScore: number;
  /** Units that need attention (status = "needs_instruction" or "partial_understanding") */
  weakUnits: Array<{ unitNumber: number; unitTitle: string; status: string }>;
  /** Units already mastered */
  strongUnits: Array<{ unitNumber: number; unitTitle: string }>;
  resumeUrl: string;
  /** If the student has a linked parent, include parent name for context */
  isParentEmail?: boolean;
  parentName?: string;
}

export function buildDiagnosticFollowUpEmail(opts: DiagnosticFollowUpEmailOptions) {
  const {
    studentName,
    courseName,
    overallScore,
    prerequisiteScore,
    weakUnits,
    strongUnits,
    resumeUrl,
    isParentEmail,
    parentName,
  } = opts;

  const firstName = studentName.split(" ")[0];
  const greeting = isParentEmail
    ? `Hi ${parentName?.split(" ")[0] ?? "there"}`
    : `Hi ${firstName}`;

  const scorePercent = Math.round((overallScore / 24) * 100);
  const prereqPercent = Math.round((prerequisiteScore / 6) * 100);

  // Build the weak units list
  const weakUnitsHtml = weakUnits.length > 0
    ? weakUnits
        .slice(0, 5)
        .map(
          (u) =>
            `<tr>
              <td style="padding:8px 12px;border-bottom:1px solid ${BRAND.borderColor};color:${BRAND.textPrimary};font-size:14px;">
                Unit ${u.unitNumber}: ${u.unitTitle}
              </td>
              <td style="padding:8px 12px;border-bottom:1px solid ${BRAND.borderColor};color:${u.status === "needs_instruction" ? BRAND.accentColor : "#F59E0B"};font-size:13px;text-align:right;">
                ${u.status === "needs_instruction" ? "Needs Practice" : "Partial"}
              </td>
            </tr>`
        )
        .join("")
    : "";

  const strongUnitsHtml = strongUnits.length > 0
    ? `<p style="margin:16px 0 8px;font-size:14px;color:${BRAND.textMuted};">
        ✅ Already strong in: ${strongUnits.map((u) => u.unitTitle).slice(0, 3).join(", ")}${strongUnits.length > 3 ? ` +${strongUnits.length - 3} more` : ""}
      </p>`
    : "";

  const studentBodyHtml = `
    <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:${BRAND.textPrimary};">
      ${greeting}, your diagnostic results are ready! 🎯
    </h2>
    <p style="margin:0 0 20px;font-size:15px;color:${BRAND.textMuted};line-height:1.6;">
      You completed the <strong style="color:${BRAND.textPrimary};">${courseName}</strong> diagnostic assessment yesterday.
      Here's a quick summary and your personalized learning path.
    </p>

    <!-- Score Summary -->
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 20px;">
      <tr>
        <td style="background:${BRAND.bgColor};border-radius:10px;padding:16px;text-align:center;width:48%;">
          <div style="font-size:28px;font-weight:700;color:${BRAND.brandColor};">${scorePercent}%</div>
          <div style="font-size:12px;color:${BRAND.textMuted};margin-top:4px;">Unit Score</div>
        </td>
        <td style="width:4%;"></td>
        <td style="background:${BRAND.bgColor};border-radius:10px;padding:16px;text-align:center;width:48%;">
          <div style="font-size:28px;font-weight:700;color:${prereqPercent >= 67 ? "#10B981" : BRAND.accentColor};">${prereqPercent}%</div>
          <div style="font-size:12px;color:${BRAND.textMuted};margin-top:4px;">Prerequisite Score</div>
        </td>
      </tr>
    </table>

    ${weakUnits.length > 0 ? `
    <!-- Recommended Focus Areas -->
    <p style="margin:0 0 8px;font-size:15px;font-weight:600;color:${BRAND.textPrimary};">
      📚 Recommended Focus Areas
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 16px;background:${BRAND.bgColor};border-radius:10px;overflow:hidden;">
      ${weakUnitsHtml}
    </table>
    ` : ""}

    ${strongUnitsHtml}

    <p style="margin:20px 0 8px;font-size:15px;color:${BRAND.textMuted};line-height:1.6;">
      ${isParentEmail
        ? `${firstName} has a personalized learning path ready. Encourage them to start with the recommended units above.`
        : `Your personalized learning path is ready! Start with the units above to build a strong foundation.`}
    </p>

    ${ctaButton(isParentEmail ? "View Learning Path" : "Start Learning", resumeUrl)}

    <p style="margin:0;font-size:13px;color:${BRAND.textMuted};">
      ${isParentEmail
        ? "This follow-up is sent 24 hours after a diagnostic to encourage timely engagement."
        : "Tip: Even 15 minutes a day can make a big difference. You've got this! 💪"}
    </p>
  `;

  const subject = isParentEmail
    ? `${firstName}'s Diagnostic Results — Personalized Learning Path Ready`
    : `${firstName}, your learning path is ready! Start with your focus areas`;

  const previewText = isParentEmail
    ? `${firstName} scored ${scorePercent}% on the ${courseName} diagnostic. ${weakUnits.length} units need attention.`
    : `You scored ${scorePercent}% — ${weakUnits.length} focus areas identified. Your personalized path awaits!`;

  return {
    subject,
    html: wrapEmailHtml({ bodyHtml: studentBodyHtml, previewText }),
    text: `${greeting},\n\nYou completed the ${courseName} diagnostic assessment yesterday.\n\nUnit Score: ${scorePercent}% | Prerequisite Score: ${prereqPercent}%\n\nFocus Areas:\n${weakUnits.map((u) => `- Unit ${u.unitNumber}: ${u.unitTitle} (${u.status})`).join("\n")}\n\nStart learning: ${resumeUrl}\n\n— ${BRAND.appName}`,
  };
}
