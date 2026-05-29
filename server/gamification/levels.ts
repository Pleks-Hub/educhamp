/**
 * gamification/levels.ts
 * XP thresholds and level name map for the student leveling system.
 *
 * Level design philosophy:
 * - Early levels (1–10) are quick to achieve to build momentum.
 * - Mid levels (11–30) require consistent engagement.
 * - High levels (31–50) require deep mastery and long-term commitment.
 */

// LEVEL_THRESHOLDS[i] = minimum total XP to reach level (i+1)
// Index 0 = Level 1 (0 XP), Index 1 = Level 2 (200 XP), etc.
export const LEVEL_THRESHOLDS: number[] = [
  0,       // Level 1  — Rookie Learner
  200,     // Level 2  — Curious Starter
  500,     // Level 3  — Eager Learner
  900,     // Level 4  — Active Student
  1400,    // Level 5  — Knowledge Seeker
  2000,    // Level 6  — Dedicated Scholar
  2700,    // Level 7  — Skill Builder
  3500,    // Level 8  — Academic Achiever
  4400,    // Level 9  — Rising Star
  5500,    // Level 10 — Scholar
  7000,    // Level 11 — Advanced Scholar
  8700,    // Level 12 — Honor Student
  10600,   // Level 13 — Merit Scholar
  12700,   // Level 14 — Excellence Award
  15000,   // Level 15 — Distinguished Learner
  17500,   // Level 16 — Academic Leader
  20200,   // Level 17 — Knowledge Master
  23100,   // Level 18 — Curriculum Champion
  26200,   // Level 19 — Academic Warrior
  29500,   // Level 20 — Academic Warrior II
  33000,   // Level 21 — Genius Builder
  36700,   // Level 22 — Genius Builder II
  40600,   // Level 23 — Brain Trust
  44700,   // Level 24 — Mastermind
  49000,   // Level 25 — Grand Scholar
  53500,   // Level 26 — Platinum Learner
  58200,   // Level 27 — Diamond Student
  63100,   // Level 28 — Elite Scholar
  68200,   // Level 29 — Academic Elite
  73500,   // Level 30 — Genius Builder III
  79000,   // Level 31 — Legendary Learner
  84700,   // Level 32 — Legendary Scholar
  90600,   // Level 33 — Legendary Master
  96700,   // Level 34 — Legendary Champion
  103000,  // Level 35 — Legendary Warrior
  109500,  // Level 36 — Mythic Learner
  116200,  // Level 37 — Mythic Scholar
  123100,  // Level 38 — Mythic Master
  130200,  // Level 39 — Mythic Champion
  137500,  // Level 40 — Mythic Warrior
  145000,  // Level 41 — Transcendent Scholar
  152700,  // Level 42 — Transcendent Master
  160600,  // Level 43 — Transcendent Champion
  168700,  // Level 44 — Transcendent Warrior
  177000,  // Level 45 — Ascended Scholar
  185500,  // Level 46 — Ascended Master
  194200,  // Level 47 — Ascended Champion
  203100,  // Level 48 — Ascended Warrior
  212200,  // Level 49 — EduChamp Elite
  225000,  // Level 50 — EduChamp Legend
];

export const LEVEL_NAMES: Record<number, string> = {
  1: "Rookie Learner",
  2: "Curious Starter",
  3: "Eager Learner",
  4: "Active Student",
  5: "Knowledge Seeker",
  6: "Dedicated Scholar",
  7: "Skill Builder",
  8: "Academic Achiever",
  9: "Rising Star",
  10: "Scholar",
  11: "Advanced Scholar",
  12: "Honor Student",
  13: "Merit Scholar",
  14: "Excellence Award",
  15: "Distinguished Learner",
  16: "Academic Leader",
  17: "Knowledge Master",
  18: "Curriculum Champion",
  19: "Academic Warrior",
  20: "Academic Warrior II",
  21: "Genius Builder",
  22: "Genius Builder II",
  23: "Brain Trust",
  24: "Mastermind",
  25: "Grand Scholar",
  26: "Platinum Learner",
  27: "Diamond Student",
  28: "Elite Scholar",
  29: "Academic Elite",
  30: "Genius Builder III",
  31: "Legendary Learner",
  32: "Legendary Scholar",
  33: "Legendary Master",
  34: "Legendary Champion",
  35: "Legendary Warrior",
  36: "Mythic Learner",
  37: "Mythic Scholar",
  38: "Mythic Master",
  39: "Mythic Champion",
  40: "Mythic Warrior",
  41: "Transcendent Scholar",
  42: "Transcendent Master",
  43: "Transcendent Champion",
  44: "Transcendent Warrior",
  45: "Ascended Scholar",
  46: "Ascended Master",
  47: "Ascended Champion",
  48: "Ascended Warrior",
  49: "EduChamp Elite",
  50: "EduChamp Legend",
};

export function getLevelName(level: number): string {
  return LEVEL_NAMES[level] ?? `Level ${level}`;
}

export function getLevelProgress(totalXp: number): {
  level: number;
  levelName: string;
  xpInLevel: number;
  xpNeeded: number;
  progressPercent: number;
  xpToNextLevel: number;
} {
  let level = 1;
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (totalXp >= LEVEL_THRESHOLDS[i]) {
      level = i + 1;
      break;
    }
  }

  const currentThreshold = LEVEL_THRESHOLDS[level - 1] ?? 0;
  const nextThreshold = LEVEL_THRESHOLDS[level] ?? LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  const xpInLevel = totalXp - currentThreshold;
  const xpNeeded = nextThreshold - currentThreshold;
  const progressPercent = xpNeeded > 0 ? Math.min(100, Math.round((xpInLevel / xpNeeded) * 100)) : 100;

  return {
    level,
    levelName: getLevelName(level),
    xpInLevel,
    xpNeeded,
    progressPercent,
    xpToNextLevel: Math.max(0, nextThreshold - totalXp),
  };
}
