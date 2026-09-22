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
  const undefeatedStreak = computeUndefeatedStreakFromSequence(seqDesc);
  const longestUndefeatedStreak = computeLongestUndefeatedStreakFromSequence(seqAsc);

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

  return {
    winningStreak,
    longestWinningStreak,
    undefeatedStreak,
    longestUndefeatedStreak,
    losingStreak,
    longestLosingStreak,
  };
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

/** Current undefeated streak: consecutive matches without a loss, counting back from
 * the most recent played match. Both WIN and DRAW extend it; only a LOSS breaks it.
 * Absences are not part of the played-match sequence, so they neither break nor extend
 * it (mirrors the winning-streak absence handling, for regular and irregular alike). */
export function computeUndefeatedStreakFromSequence(resultsDesc: Result[]): number {
  let streak = 0;
  for (const r of resultsDesc) {
    if (r === "loss") break;
    streak++;
  }
  return streak;
}

/** Longest undefeated streak ever, from chronologically ascending played-match results.
 * A run of consecutive non-loss results (wins and draws); a loss resets it. */
export function computeLongestUndefeatedStreakFromSequence(resultsAsc: Result[]): number {
  let current = 0;
  let max = 0;
  for (const r of resultsAsc) {
    if (r === "loss") {
      current = 0;
    } else {
      current++;
      max = Math.max(max, current);
    }
  }
  return max;
}

/**
 * Regular player current losing streak, measured in calendar days.
 *
 * The streak STARTS on the "losing date" — the first actual LOSS the player recorded
 * after their most recent WIN — and runs in calendar days from that date up to the
 * latest match date in the system. Once started, LOSS/DRAW/ABSENT all continue it;
 * only a WIN resets it.
 *
 * A DRAW does NOT start a streak: a player who won and then only drew (no loss) has no
 * losing streak. Absent days after a win but before the first loss are not counted
 * either. If the player has no loss since their last win, the streak is 0.
 */
export function computeRegularLosingStreakFromMap(
  resultsByDate: Map<string, Result>,
  latestSystemDate: string,
  startBoundary: string
): number {
  // Most recent WIN within [startBoundary, latestSystemDate].
  let lastWin: string | null = null;
  for (const [date, result] of resultsByDate) {
    if (result !== "win") continue;
    if (isBefore(date, startBoundary) || isAfter(date, latestSystemDate)) continue;
    if (lastWin === null || isAfter(date, lastWin)) lastWin = date;
  }

  // Only a LOSS strictly after the last win (or from the start boundary if never won)
  // can begin the current streak. Draws before the first loss do not start it.
  const lowerBound = lastWin ? addDays(lastWin, 1) : startBoundary;

  // Earliest LOSS at/after the lower bound = the "losing date".
  let streakStart: string | null = null;
  for (const [date, result] of resultsByDate) {
    if (result !== "loss") continue;
    if (isBefore(date, lowerBound) || isAfter(date, latestSystemDate)) continue;
    if (streakStart === null || isBefore(date, streakStart)) streakStart = date;
  }

  if (!streakStart) return 0;

  // Calendar days from the losing date through the latest system date (inclusive).
  let streak = 0;
  let day = streakStart;
  while (!isAfter(day, latestSystemDate)) {
    streak++;
    day = addDays(day, 1);
  }
  return streak;
}

/** Longest-ever regular-player losing streak, in calendar days, across full history.
 * Each run starts on a "losing date" (first LOSS after a win, matching the current
 * streak's rule) and ends the day before the next win (or the latest system date). A draw
 * never starts a run; draws and absences after the first loss continue it. */
export function computeRegularLongestLosingStreakFromMap(
  resultsByDate: Map<string, Result>,
  startBoundary: string,
  latestSystemDate: string
): number {
  let max = 0;
  let runStart: string | null = null; // date the current run began, or null if not in a run
  let day = startBoundary;
  while (!isAfter(day, latestSystemDate)) {
    const result = resultsByDate.get(day);
    if (result === "win") {
      // A win ends any open run the day before it.
      if (runStart) {
        max = Math.max(max, daysInclusive(runStart, addDays(day, -1)));
        runStart = null;
      }
    } else if (result === "loss") {
      // Only a LOSS begins a run; a run already open just continues.
      if (!runStart) runStart = day;
    }
    // Draws and absent days: continue an open run implicitly; never start one.
    day = addDays(day, 1);
  }
  if (runStart) {
    max = Math.max(max, daysInclusive(runStart, latestSystemDate));
  }
  return max;
}

/** Inclusive count of calendar days from `from` to `to` (both YYYY-MM-DD). */
function daysInclusive(from: string, to: string): number {
  if (isAfter(from, to)) return 0;
  let n = 0;
  let day = from;
  while (!isAfter(day, to)) {
    n++;
    day = addDays(day, 1);
  }
  return n;
}

/**
 * Irregular/foreign player current losing streak, measured in consecutive matches
 * actually played (calendar gaps from absence are ignored entirely - not counted as
 * days, just skipped since they're not in the played-match sequence).
 *
 * Like the regular streak, it STARTS only on a LOSS: draws played since the last win
 * (with no loss among them) are not a losing streak. Once a loss starts it, draws played
 * afterwards continue it; only a win resets it. So the streak = number of played matches
 * from the first loss after the last win, through the most recent played match.
 */
export function computeIrregularLosingStreakFromSequence(resultsDesc: Result[]): number {
  // Played matches since the last win, oldest-first.
  const sinceWin: Result[] = [];
  for (const r of resultsDesc) {
    if (r === "win") break;
    sinceWin.push(r);
  }
  sinceWin.reverse(); // now ascending (oldest played-since-win first)

  const firstLoss = sinceWin.indexOf("loss");
  if (firstLoss === -1) return 0; // only draws since the last win -> no losing streak
  return sinceWin.length - firstLoss; // first loss through most recent played match
}

/** Longest-ever irregular-player losing streak, in played matches. Each run starts on a
 * loss (a draw never starts one) and ends before the next win; draws after the first loss
 * in a run continue it. */
export function computeIrregularLongestLosingStreakFromSequence(resultsAsc: Result[]): number {
  let max = 0;
  let inRun = false;
  let runLen = 0;
  for (const r of resultsAsc) {
    if (r === "win") {
      inRun = false;
      runLen = 0;
    } else if (r === "loss") {
      inRun = true;
      runLen++;
      max = Math.max(max, runLen);
    } else {
      // draw: counts only if a loss already started this run
      if (inRun) {
        runLen++;
        max = Math.max(max, runLen);
      }
    }
  }
  return max;
}

// ---- Public API (DB-backed) ----

export type StreakSummary = {
  winningStreak: number;
  longestWinningStreak: number;
  undefeatedStreak: number;
  longestUndefeatedStreak: number;
  losingStreak: number;
  longestLosingStreak: number;
};

export async function calculateWinningStreak(playerId: number): Promise<number> {
  const sequence = await getPlayerResultsSequence(playerId);
  return computeWinningStreakFromSequence([...sequence].reverse());
}

export async function calculateUndefeatedStreak(playerId: number): Promise<number> {
  const sequence = await getPlayerResultsSequence(playerId);
  return computeUndefeatedStreakFromSequence([...sequence].reverse());
}

export async function calculateLongestUndefeatedStreak(playerId: number): Promise<number> {
  const sequence = await getPlayerResultsSequence(playerId);
  return computeLongestUndefeatedStreakFromSequence(sequence);
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
  const [
    winningStreak,
    longestWinningStreak,
    undefeatedStreak,
    longestUndefeatedStreak,
    losingStreak,
    longestLosingStreak,
  ] = await Promise.all([
    calculateWinningStreak(playerId),
    calculateLongestWinningStreak(playerId),
    calculateUndefeatedStreak(playerId),
    calculateLongestUndefeatedStreak(playerId),
    calculateLosingStreak(playerId),
    calculateLongestLosingStreak(playerId),
  ]);
  return {
    winningStreak,
    longestWinningStreak,
    undefeatedStreak,
    longestUndefeatedStreak,
    losingStreak,
    longestLosingStreak,
  };
}
