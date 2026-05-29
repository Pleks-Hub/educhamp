/**
 * YoungLearnerRewards — star/sticker/treasure chest reward display for Pre-K–Grade 2.
 * Shows a large, colourful reward panel with animated stars earned per lesson/quiz.
 * Designed for maximum visual engagement and minimal text.
 */
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { cn } from "@/lib/utils";

// ─── Star Chart ───────────────────────────────────────────────────────────────

interface StarChartProps {
  stars: number;   // 0–10 stars earned today
  maxStars?: number;
  label?: string;
}

export function StarChart({ stars, maxStars = 10, label = "Stars Today" }: StarChartProps) {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-950/30 dark:to-amber-950/30 border border-yellow-200 dark:border-yellow-800">
      <p className="text-sm font-bold text-amber-700 dark:text-amber-300">{label}</p>
      <div className="flex flex-wrap justify-center gap-2">
        {Array.from({ length: maxStars }).map((_, i) => (
          <span
            key={i}
            className={cn(
              "text-3xl transition-all duration-300",
              i < stars
                ? "opacity-100 scale-100 drop-shadow-md"
                : "opacity-25 scale-90 grayscale",
            )}
            style={{
              transitionDelay: animated && i < stars ? `${i * 80}ms` : "0ms",
              transform: animated && i < stars ? "scale(1.1)" : "scale(0.9)",
            }}
            aria-label={i < stars ? "Earned star" : "Empty star"}
          >
            ⭐
          </span>
        ))}
      </div>
      <p className="text-2xl font-black text-amber-600 dark:text-amber-400">
        {stars} / {maxStars}
      </p>
    </div>
  );
}

// ─── Sticker Collection ───────────────────────────────────────────────────────

const STICKER_SETS = [
  { emoji: "🦁", label: "Lion" },
  { emoji: "🐬", label: "Dolphin" },
  { emoji: "🦋", label: "Butterfly" },
  { emoji: "🌈", label: "Rainbow" },
  { emoji: "🚀", label: "Rocket" },
  { emoji: "🎨", label: "Art" },
  { emoji: "🎵", label: "Music" },
  { emoji: "🌟", label: "Star" },
  { emoji: "🏆", label: "Trophy" },
  { emoji: "🎉", label: "Party" },
  { emoji: "🦊", label: "Fox" },
  { emoji: "🐉", label: "Dragon" },
];

interface StickerCollectionProps {
  earnedCount: number;  // how many stickers unlocked
}

export function StickerCollection({ earnedCount }: StickerCollectionProps) {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 border border-purple-200 dark:border-purple-800 p-4">
      <p className="text-sm font-bold text-purple-700 dark:text-purple-300 mb-3 text-center">
        🎨 My Sticker Collection
      </p>
      <div className="grid grid-cols-4 gap-2">
        {STICKER_SETS.map((sticker, i) => {
          const unlocked = i < earnedCount;
          return (
            <div
              key={sticker.label}
              className={cn(
                "flex flex-col items-center gap-1 p-2 rounded-xl transition-all",
                unlocked
                  ? "bg-white dark:bg-white/10 shadow-sm"
                  : "opacity-30 grayscale",
              )}
              title={unlocked ? sticker.label : "Keep learning to unlock!"}
            >
              <span className="text-2xl">{sticker.emoji}</span>
              {unlocked && (
                <span className="text-[9px] text-muted-foreground font-medium">{sticker.label}</span>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-center text-xs text-muted-foreground mt-3">
        {earnedCount} / {STICKER_SETS.length} unlocked
      </p>
    </div>
  );
}

// ─── Treasure Chest ───────────────────────────────────────────────────────────

interface TreasureChestProps {
  xp: number;
  level: number;
  levelName: string;
  nextLevelXp: number;
  progressPercent: number;
}

export function TreasureChest({ xp, level, levelName, nextLevelXp, progressPercent }: TreasureChestProps) {
  const chestEmoji = level >= 10 ? "🏆" : level >= 7 ? "💎" : level >= 5 ? "🥇" : level >= 3 ? "🥈" : "📦";

  return (
    <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border border-emerald-200 dark:border-emerald-800 p-4 text-center">
      <div className="text-5xl mb-2 animate-bounce">{chestEmoji}</div>
      <p className="text-lg font-black text-emerald-700 dark:text-emerald-300">{levelName}</p>
      <p className="text-xs text-muted-foreground mb-3">Level {level}</p>
      <div className="h-3 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full transition-all duration-700"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground mt-1">
        {xp.toLocaleString()} / {nextLevelXp.toLocaleString()} XP
      </p>
    </div>
  );
}

// ─── Full Young Learner Rewards Panel ─────────────────────────────────────────

export function YoungLearnerRewardsPanel() {
  const { user } = useAuth();

  const { data: profile } = trpc.gamification.getProfile.useQuery(undefined, {
    enabled: !!user,
    staleTime: 30_000,
  });

  if (!profile) return null;

  const { xp, level, badges } = profile;

  // Stars = lessons completed today (approximate from XP ledger — use badge count as proxy)
  const starsToday = Math.min(badges.earnedCount, 10);
  const stickersEarned = Math.min(badges.earnedCount, STICKER_SETS.length);

  return (
    <div className="space-y-4">
      <StarChart stars={starsToday} label="⭐ Stars Earned" />
      <TreasureChest
        xp={xp?.totalXp ?? 0}
        level={level.level}
        levelName={level.levelName}
        nextLevelXp={(xp?.totalXp ?? 0) + level.xpNeeded}
        progressPercent={level.progressPercent}
      />
      <StickerCollection earnedCount={stickersEarned} />
    </div>
  );
}
