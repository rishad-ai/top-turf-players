import { db } from "@/db";
import { injuries } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export type Injury = {
  id: number;
  playerId: number;
  startDate: string; // YYYY-MM-DD
  endDate: string | null; // null = still injured
  note: string | null;
};

/** A date range for streak exclusion; end null = ongoing. */
export type InjuryRange = { start: string; end: string | null };

// ---- Pure helpers (no DB) ----

/** Returns a predicate: is this ISO date inside any injury range (end null = ongoing)? */
export function makeIsInjured(ranges: InjuryRange[]): (date: string) => boolean {
  if (ranges.length === 0) return () => false;
  return (date: string) => ranges.some((r) => date >= r.start && (r.end === null || date <= r.end));
}

/** The injury covering `today`, if any (ongoing or a range that includes today). */
export function currentInjury(list: Injury[], today: string): Injury | null {
  return list.find((r) => r.startDate <= today && (r.endDate === null || r.endDate >= today)) ?? null;
}

export function isCurrentlyInjured(list: Injury[], today: string): boolean {
  return currentInjury(list, today) !== null;
}

/** Inclusive number of days from start to (end ?? today). */
export function injuryDurationDays(startDate: string, endDate: string | null, today: string): number {
  const to = endDate ?? today;
  const a = Date.parse(`${startDate}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b) || b < a) return 0;
  return Math.floor((b - a) / 86400000) + 1;
}

// ---- Data access ----

export async function getPlayerInjuries(playerId: number): Promise<Injury[]> {
  const rows = await db
    .select()
    .from(injuries)
    .where(eq(injuries.playerId, playerId))
    .orderBy(desc(injuries.startDate));
  return rows.map((r) => ({
    id: r.id,
    playerId: r.playerId,
    startDate: r.startDate,
    endDate: r.endDate,
    note: r.note,
  }));
}

/** All injuries in the system, grouped by playerId as streak-exclusion ranges. */
export async function getInjuryRangesByPlayer(): Promise<Map<number, InjuryRange[]>> {
  const rows = await db.select().from(injuries);
  const map = new Map<number, InjuryRange[]>();
  for (const r of rows) {
    const list = map.get(r.playerId) ?? [];
    list.push({ start: r.startDate, end: r.endDate });
    map.set(r.playerId, list);
  }
  return map;
}

export async function addInjury(
  playerId: number,
  startDate: string,
  note: string | null,
  endDate: string | null = null
): Promise<void> {
  await db.insert(injuries).values({ playerId, startDate, endDate, note });
}

export async function endInjury(injuryId: number, endDate: string): Promise<void> {
  await db.update(injuries).set({ endDate }).where(eq(injuries.id, injuryId));
}

export async function deleteInjury(injuryId: number): Promise<void> {
  await db.delete(injuries).where(eq(injuries.id, injuryId));
}
