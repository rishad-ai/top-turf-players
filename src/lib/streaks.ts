import { db } from "@/db";
import { players, matchPlayers, matches } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";

export type Result = "win" | "loss" | "draw";

// ---- Date helpers (pure UTC, string-based YYYY-MM-DD to avoid timezone drift) ----

export function toUTCDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00Z`);
}

export function toISO(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(dateStr: string, delta: number): string {
  const d = toUTCDate(dateStr);
  d.setUTCDate(d.getUTCDate() + delta);
  return toISO(d);
}

export function isBefore(a: string, b: string): boolean {
  return toUTCDate(a).getTime() < toUTCDate(b).getTime();
}

export function isAfter(a: string, b: string): boolean {
  return toUTCDate(a).getTime() > toUTCDate(b).getTime();
}

export function maxDate(a: string, b: string): string {
  return isAfter(a, b) ? a : b;
}

/**
 * Computes all four streak numbers for a single player from already-fetched data,
 * with no database access. Used by the batched dashboard/leaderboard path to avoid
 * per-player queries.
 */
export function computeStreaksFromData(
  playerType: "regular" | "irregular",
  resultsAscByDate: { matchDate: string; result: Result }[], // this player's PLAYED matches, ascending
  createdDate: string,
  systemEarliest: string | null,
  systemLatest: string | null
): StreakSummary {
  const seqAsc = resultsAscByDate.map((r) => r.result);
  const seqDesc = [...seqAsc].reverse();

  const winningStreak = computeWinningStreakFromSequence(seqDesc);
  const longestWinningStreak = computeLongestWinningStreakFromSequence(seqAsc);

  let losingStreak = 0;
  let longestLosingStreak = 0;

  if (playerType === "irregular") {
    losingStreak = computeIrregularLosingStreakFromSequence(seqDesc);
    longestLosingStreak = computeIrregularLongestLosingStreakFromSequence(seqAsc);
  } else if (systemEarliest && systemLatest) {
    const startBoundary = maxDate(systemEarliest, createdDate);
    const resultsByDate = new Map<string, Result>();
    for (const r of resultsAscByDate) resultsByDate.set(r.matchDate, r.result);
    losingStreak = computeRegularLosingStreakFromMap(resultsByDate, systemLatest, startBoundary);
    longestLosingStreak = computeRegularLongestLosingStreakFromMap(resultsByDate, startBoundary, systemLatest);
  }

  return { winningStreak, longestWinningStreak, losingStreak, longestLosingStreak };
}

// ---- Data access ----

/** Map of calendar date -> result, for matches this player actually played (played=true). */
async function getPlayerResultsByDate(playerId: number): Promise<Map<string, Result>> {
  const rows = await db
    .select({ matchDate: matches.matchDate, result: matchPlayers.result })
    .from(matchPlayers)
    .innerJoin(matches, eq(matchPlayers.matchId, matches.id))
    .where(and(eq(matchPlayers.playerId, playerId), eq(matchPlayers.played, true)));

  const map = new Map<string, Result>();
  for (const r of rows) {
    map.set(r.matchDate, r.result as Result);
  }
  return map;
}

/** Player's played match results ordered chronologically ascending (oldest first). */
async function getPlayerResultsSequence(playerId: number): Promise<Result[]> {
  const rows = await db
    .select({ result: matchPlayers.result, matchDate: matches.matchDate })
    .from(matchPlayers)
    .innerJoin(matches, eq(matchPlayers.matchId, matches.id))
    .where(and(eq(matchPlayers.playerId, playerId), eq(matchPlayers.played, true)))
    .orderBy(asc(matches.matchDate));

  return rows.map((r) => r.result as Result);
}

async function getSystemMatchDateBounds(): Promise<{ earliest: string | null; latest: string | null }> {
  const rows = await db.select({ matchDate: matches.matchDate }).from(matches);
  if (rows.length === 0) return { earliest: null, latest: null };
  let earliest = rows[0].matchDate;
  let latest = rows[0].matchDate;
  for (const r of rows) {
    if (isBefore(r.matchDate, earliest)) earliest = r.matchDate;
    if (isAfter(r.matchDate, latest)) latest = r.matchDate;
  }
  return { earliest, latest };
}

async function getPlayerCreatedDate(playerId: number): Promise<string | null> {
  const player = await db.query.players.findFirst({ where: eq(players.id, playerId) });
  if (!player) return null;
  // createdAt is a Date object (Postgres timestamp) - take the UTC date part.
  return player.createdAt.toISOString().slice(0, 10);
}

// ---- Pure calculation helpers (unit-testable without DB) ----

/** Current winning streak: consecutive wins counting back from the most recent played
 * match. Absences are not part of this sequence at all (skipped, per spec clarification),
 * so they neither break nor extend it. */
export function computeWinningStreakFromSequence(resultsDesc: Result[]): number {
  let streak = 0;
  for (const r of resultsDesc) {
    if (r === "win") streak++;
    else break;
  }
  return streak;
}

/** Longest winning streak ever, from chronologically ascending played-match results. */
export function computeLongestWinningStreakFromSequence(resultsAsc: Result[]): number {
  let current = 0;
  let max = 0;
  for (const r of resultsAsc) {
    if (r === "win") {
      current++;
      max = Math.max(max, current);
    } else {
      current = 0;
    }
  }
  return max;
}

/**
 * Regular player current losing streak, measured in calendar days.
 * Walks backward day-by-day from the latest match date in the whole system to the
 * player's activity start boundary. LOSS/DRAW/ABSENT all continue the streak;
 * only a WIN stops it (and that WIN day itself is not counted).
 */
export function computeRegularLosingStreakFromMap(
  resultsByDate: Map<string, Result>,
  latestSystemDate: string,
  startBoundary: string
): number {
  let streak = 0;
  let day = latestSystemDate;
  while (!isBefore(day, startBoundary)) {
    const result = resultsByDate.get(day);
    if (result === "win") break;
    streak++;
    day = addDays(day, -1);
  }
  return streak;
}

/** Longest-ever regular-player losing streak, in calendar days, across full history. */
export function computeRegularLongestLosingStreakFromMap(
  resultsByDate: Map<string, Result>,
  startBoundary: string,
  latestSystemDate: string
): number {
  let current = 0;
  let max = 0;
  let day = startBoundary;
  while (!isAfter(day, latestSystemDate)) {
    const result = resultsByDate.get(day);
    if (result === "win") {
      current = 0;
    } else {
      current++;
      max = Math.max(max, current);
    }
    day = addDays(day, 1);
  }
  return max;
}

/**
 * Irregular/foreign player current losing streak, measured in consecutive matches
 * actually played (calendar gaps from absence are ignored entirely - not counted as
 * days, just skipped since they're not in the played-match sequence).
 */
export function computeIrregularLosingStreakFromSequence(resultsDesc: Result[]): number {
  let streak = 0;
  for (const r of resultsDesc) {
    if (r === "win") break;
    streak++;
  }
  return streak;
}

/** Longest-ever irregular-player losing streak, in played matches. */
export function computeIrregularLongestLosingStreakFromSequence(resultsAsc: Result[]): number {
  let current = 0;
  let max = 0;
  for (const r of resultsAsc) {
    if (r === "win") {
      current = 0;
    } else {
      current++;
      max = Math.max(max, current);
    }
  }
  return max;
}

// ---- Public API (DB-backed) ----

export type StreakSummary = {
  winningStreak: number;
  longestWinningStreak: number;
  losingStreak: number;
  longestLosingStreak: number;
};

export async function calculateWinningStreak(playerId: number): Promise<number> {
  const sequence = await getPlayerResultsSequence(playerId);
  return computeWinningStreakFromSequence([...sequence].reverse());
}

export async function calculateLongestWinningStreak(playerId: number): Promise<number> {
  const sequence = await getPlayerResultsSequence(playerId);
  return computeLongestWinningStreakFromSequence(sequence);
}

export async function calculateLosingStreak(playerId: number): Promise<number> {
  const player = await db.query.players.findFirst({ where: eq(players.id, playerId) });
  if (!player) return 0;

  if (player.playerType === "irregular") {
    const sequence = await getPlayerResultsSequence(playerId);
    return computeIrregularLosingStreakFromSequence([...sequence].reverse());
  }

  // regular
  const { earliest, latest } = await getSystemMatchDateBounds();
  if (!earliest || !latest) return 0;

  const createdDate = await getPlayerCreatedDate(playerId);
  const startBoundary = createdDate ? maxDate(earliest, createdDate) : earliest;

  const resultsByDate = await getPlayerResultsByDate(playerId);
  return computeRegularLosingStreakFromMap(resultsByDate, latest, startBoundary);
}

export async function calculateLongestLosingStreak(playerId: number): Promise<number> {
  const player = await db.query.players.findFirst({ where: eq(players.id, playerId) });
  if (!player) return 0;

  if (player.playerType === "irregular") {
    const sequence = await getPlayerResultsSequence(playerId);
    return computeIrregularLongestLosingStreakFromSequence(sequence);
  }

  const { earliest, latest } = await getSystemMatchDateBounds();
  if (!earliest || !latest) return 0;

  const createdDate = await getPlayerCreatedDate(playerId);
  const startBoundary = createdDate ? maxDate(earliest, createdDate) : earliest;

  const resultsByDate = await getPlayerResultsByDate(playerId);
  return computeRegularLongestLosingStreakFromMap(resultsByDate, startBoundary, latest);
}

export async function calculatePlayerStreaks(playerId: number): Promise<StreakSummary> {
  const [winningStreak, longestWinningStreak, losingStreak, longestLosingStreak] = await Promise.all([
    calculateWinningStreak(playerId),
    calculateLongestWinningStreak(playerId),
    calculateLosingStreak(playerId),
    calculateLongestLosingStreak(playerId),
  ]);
  return { winningStreak, longestWinningStreak, losingStreak, longestLosingStreak };
}
