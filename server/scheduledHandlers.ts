/**
 * Scheduled Heartbeat Handlers
 * All handlers are mounted at /api/scheduled/* in server/_core/index.ts
 * They authenticate via sdk.authenticateRequest and only accept isCron requests.
 */
import type { Request, Response } from "express";
import { sdk } from "./_core/sdk";
import { getDb } from "./db";
import { userProfiles, platformSettings } from "../drizzle/schema";
import { eq, and, isNotNull } from "drizzle-orm";
import { notifyOwner } from "./_core/notification";

// Grade progression map: current grade → next grade
const GRADE_PROGRESSION: Record<string, string> = {
  "Kindergarten": "Grade 1",
  "Grade 1": "Grade 2",
  "Grade 2": "Grade 3",
  "Grade 3": "Grade 4",
  "Grade 4": "Grade 5",
  "Grade 5": "Grade 6",
  "Grade 6": "Grade 7",
  "Grade 7": "Grade 8",
  "Grade 8": "Grade 9",
  "Grade 9": "Grade 10",
  "Grade 10": "Grade 11",
  "Grade 11": "Grade 12",
  // Grade 12 graduates — no promotion
};

/**
 * POST /api/scheduled/grade-promotion
 * Runs once per year (configured via admin UI) to promote all students to the next grade.
 * Idempotent: checks a "lastPromotionYear" setting to avoid double-promotion.
 */
export async function gradePromotionHandler(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron) {
      return res.status(403).json({ error: "cron-only endpoint" });
    }

    const currentYear = new Date().getFullYear();

    // Idempotency check: read last promotion year from platformSettings
    const db = await getDb();
    if (!db) return res.status(503).json({ error: "database unavailable" });

    const [lastRunSetting] = await db
      .select()
      .from(platformSettings)
      .where(eq(platformSettings.key, "lastGradePromotionYear"))
      .limit(1);

    const lastYear = lastRunSetting ? parseInt(lastRunSetting.value ?? "0") : 0;
    if (lastYear >= currentYear) {
      return res.json({
        ok: true,
        skipped: `already promoted for ${currentYear}`,
        lastYear,
      });
    }

    // Fetch all student profiles that have a gradeLevel set
    const profiles = await db
      .select()
      .from(userProfiles)
      .where(and(isNotNull(userProfiles.gradeLevel)));

    let promoted = 0;
    let graduated = 0;
    let skipped = 0;

    for (const profile of profiles) {
      const currentGrade = profile.gradeLevel;
      if (!currentGrade) { skipped++; continue; }

      const nextGrade = GRADE_PROGRESSION[currentGrade];
      if (!nextGrade) {
        // Grade 12 — mark as graduated (keep grade, no change)
        graduated++;
        continue;
      }

      await db
        .update(userProfiles)
        .set({ gradeLevel: nextGrade })
        .where(eq(userProfiles.userId, profile.userId));
      promoted++;
    }

    // Update the idempotency marker
    if (lastRunSetting) {
      await db
        .update(platformSettings)
        .set({ value: String(currentYear) })
        .where(eq(platformSettings.key, "lastGradePromotionYear"));
    } else {
      await db.insert(platformSettings).values({
        key: "lastGradePromotionYear",
        value: String(currentYear),
        description: "Year of last end-of-year grade promotion run",
      });
    }

    // Notify the owner
    await notifyOwner({
      title: `✅ End-of-Year Grade Promotion Complete (${currentYear})`,
      content: `Promoted ${promoted} students to the next grade. ${graduated} Grade 12 students graduated. ${skipped} profiles had no grade set and were skipped.`,
    });

    return res.json({
      ok: true,
      year: currentYear,
      promoted,
      graduated,
      skipped,
    });
  } catch (err: any) {
    console.error("[grade-promotion]", err);
    return res.status(500).json({
      error: err?.message ?? "unknown error",
      stack: err?.stack,
      context: { url: req.url, taskUid: (req as any).taskUid },
      timestamp: new Date().toISOString(),
    });
  }
}
