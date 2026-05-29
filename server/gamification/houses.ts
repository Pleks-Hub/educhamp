/**
 * gamification/houses.ts
 * House system: assignment, point contribution, and leaderboard.
 * Four houses: Titans, Eagles, Lions, Falcons
 */

import { getDb } from "../db";
import { houses, userHouses } from "../../drizzle/schema";
import { eq, sql, asc, desc } from "drizzle-orm";

// ─── Default houses ───────────────────────────────────────────────────────────

export const DEFAULT_HOUSES = [
  { name: "Titans",  color: "#ef4444", mascotEmoji: "⚡" },
  { name: "Eagles",  color: "#3b82f6", mascotEmoji: "🦅" },
  { name: "Lions",   color: "#f59e0b", mascotEmoji: "🦁" },
  { name: "Falcons", color: "#10b981", mascotEmoji: "🦆" },
];

// ─── Seed default houses ──────────────────────────────────────────────────────

export async function seedDefaultHouses(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  for (const house of DEFAULT_HOUSES) {
    await db
      .insert(houses)
      .values({ ...house, totalPoints: 0 })
      .onDuplicateKeyUpdate({ set: { color: house.color, mascotEmoji: house.mascotEmoji } });
  }
}

// ─── Assign user to house (balanced assignment) ───────────────────────────────

export async function assignHouse(userId: number): Promise<typeof houses.$inferSelect | null> {
  const db = await getDb();
  if (!db) return null;

  // Check if already assigned
  const [existing] = await db
    .select({ houseId: userHouses.houseId })
    .from(userHouses)
    .where(eq(userHouses.userId, userId))
    .limit(1);

  if (existing) {
    const [house] = await db.select().from(houses).where(eq(houses.id, existing.houseId)).limit(1);
    return house ?? null;
  }

  // Count members per house to balance
  const allHouses = await db.select().from(houses).orderBy(asc(houses.id));
  if (allHouses.length === 0) return null;

  // Pick house with fewest members (simple round-robin via member count)
  const memberCounts = await Promise.all(
    allHouses.map(async (h) => {
      const [{ n }] = await db
        .select({ n: sql<number>`count(*)` })
        .from(userHouses)
        .where(eq(userHouses.houseId, h.id));
      return { house: h, count: Number(n) };
    }),
  );

  memberCounts.sort((a, b) => a.count - b.count);
  const targetHouse = memberCounts[0].house;

  await db.insert(userHouses).values({ userId, houseId: targetHouse.id, pointsContributed: 0 });

  return targetHouse;
}

// ─── Award house points ───────────────────────────────────────────────────────

export async function awardHousePoints(userId: number, points: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const [membership] = await db
    .select({ houseId: userHouses.houseId })
    .from(userHouses)
    .where(eq(userHouses.userId, userId))
    .limit(1);

  if (!membership) return;

  await db
    .update(userHouses)
    .set({ pointsContributed: sql`pointsContributed + ${points}` })
    .where(eq(userHouses.userId, userId));

  await db
    .update(houses)
    .set({ totalPoints: sql`totalPoints + ${points}` })
    .where(eq(houses.id, membership.houseId));
}

// ─── Get house leaderboard ────────────────────────────────────────────────────

export async function getHouseLeaderboard() {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(houses).orderBy(desc(houses.totalPoints));
}

// ─── Get user's house ─────────────────────────────────────────────────────────

export async function getUserHouse(userId: number) {
  const db = await getDb();
  if (!db) return null;

  const [row] = await db
    .select({ membership: userHouses, house: houses })
    .from(userHouses)
    .innerJoin(houses, eq(userHouses.houseId, houses.id))
    .where(eq(userHouses.userId, userId))
    .limit(1);

  return row ?? null;
}
