import { db } from "@/db";
import { players, matchPlayers, matches, goals, injuries } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { calculatePlayerStreaks, computeStreaksFromData, type StreakSummary, type Result } from "./streaks";

export type Position = "GK" | "DEF" | "ATT";

export type PositionStat = {
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goals: number;
  teamGoalsFor: number;
  teamGoalsAgainst: number;
  winPercentage: number;
};

export function emptyPositionStat(): PositionStat {
  return { played: 0, wins: 0, draws: 0, losses: 0, goals: 0, teamGoalsFor: 0, teamGoalsAgainst: 0, winPercentage: 0 };
}

export const POSITION_LABELS: Record<Position, string> = {
  GK: "Goalkeeper",
  DEF: "Defence",
  ATT: "Attack",
};

export type PlayerStats = {
  playerId: number;
  matchesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  goals: number;
  winPercentage: number; // 0-100, rounded to 1 decimal
  lastMatchDate: string | null;
  lastResult: "win" | "loss" | "draw" | null;
  // Team goals across matches the player actually played: their team's total score (for)
  // and the opposing team's total score (against), summed over those matches. Optional
  // because the batched dashboard/leaderboard paths don't populate them.
  teamGoalsFor?: number;
  teamGoalsAgainst?: number;
  // Per-position breakdown (games/results/goals played as GK, DEF, ATT). Optional for the
  // batched paths that don't compute it.
  byPosition?: Record<Position, PositionStat>;
};

/**
 * Calculates a player's core stats purely from match history.
 * Only match_players rows with played=true count (a substitute who didn't
 * actually play is excluded, per spec).
 */
export async function calculatePlayerStats(playerId: number): Promise<PlayerStats> {
  const rows = await db
    .select({
      matchId: matchPlayers.matchId,
      result: matchPlayers.result,
      matchDate: matches.matchDate,
      team: matchPlayers.team,
      position: matchPlayers.position,
      teamAScore: matches.teamAScore,
      teamBScore: matches.teamBScore,
    })
    .from(matchPlayers)
    .innerJoin(matches, eq(matchPlayers.matchId, matches.id))
    .where(and(eq(matchPlayers.playerId, playerId), eq(matchPlayers.played, true)))
    .orderBy(desc(matches.matchDate));

  const matchesPlayed = rows.length;
  const wins = rows.filter((r) => r.result === "win").length;
  const losses = rows.filter((r) => r.result === "loss").length;
  const draws = rows.filter((r) => r.result === "draw").length;

  // Team goals for/against: the player's team score vs the opponent score, each match played.
  let teamGoalsFor = 0;
  let teamGoalsAgainst = 0;
  const byPosition: Record<Position, PositionStat> = {
    GK: emptyPositionStat(),
    DEF: emptyPositionStat(),
    ATT: emptyPositionStat(),
  };
  const positionByMatch = new Map<number, Position>();
  for (const r of rows) {
    const gf = r.team === "A" ? r.teamAScore : r.teamBScore;
    const ga = r.team === "A" ? r.teamBScore : r.teamAScore;
    teamGoalsFor += gf;
    teamGoalsAgainst += ga;

    const pos = (r.position as Position) ?? "ATT";
    positionByMatch.set(r.matchId, pos);
    const b = byPosition[pos];
    b.played++;
    if (r.result === "win") b.wins++;
    else if (r.result === "loss") b.losses++;
    else if (r.result === "draw") b.draws++;
    b.teamGoalsFor += gf;
    b.teamGoalsAgainst += ga;
  }

  const goalRows = await db
    .select()
    .from(goals)
    .where(eq(goals.playerId, playerId));
  // Own goals don't count toward a player's personal tally (standard football).
  const scoringGoals = goalRows.filter((g) => !g.isOwnGoal);
  const goalCount = scoringGoals.length;
  // Attribute each goal to the position the player held in that match.
  for (const g of scoringGoals) {
    const pos = positionByMatch.get(g.matchId);
    if (pos) byPosition[pos].goals++;
  }
  for (const pos of ["GK", "DEF", "ATT"] as Position[]) {
    const b = byPosition[pos];
    b.winPercentage = b.played === 0 ? 0 : Math.round((b.wins / b.played) * 1000) / 10;
  }

  const winPercentage = matchesPlayed === 0 ? 0 : Math.round((wins / matchesPlayed) * 1000) / 10;

  const last = rows[0]; // rows already ordered desc by matchDate
  return {
    playerId,
    matchesPlayed,
    wins,
    losses,
    draws,
    goals: goalCount,
    winPercentage,
    lastMatchDate: last?.matchDate ?? null,
    lastResult: (last?.result as "win" | "loss" | "draw" | undefined) ?? null,
    teamGoalsFor,
    teamGoalsAgainst,
    byPosition,
  };
}

/**
 * Counting stats for a player restricted to matches they played in a given position.
 * Used by the comparison's position filter. Streaks are not position-scoped.
 */
export async function calculatePlayerPositionStats(playerId: number, position: Position): Promise<PositionStat> {
  const full = await calculatePlayerStats(playerId);
  return full.byPosition?.[position] ?? emptyPositionStat();
}

export type PlayerMatchHistoryEntry = {
  matchId: number;
  matchDate: string;
  team: "A" | "B";
  role: "starter" | "substitute";
  played: boolean;
  result: "win" | "loss" | "draw";
  teamAScore: number;
  teamBScore: number;
  goalsScored: number;
};

/** Chronological (most recent first) history of every match a player was selected into. */
export async function calculatePlayerMatchHistory(
  playerId: number
): Promise<PlayerMatchHistoryEntry[]> {
  const rows = await db
    .select({
      matchId: matchPlayers.matchId,
      team: matchPlayers.team,
      role: matchPlayers.role,
      played: matchPlayers.played,
      result: matchPlayers.result,
      matchDate: matches.matchDate,
      teamAScore: matches.teamAScore,
      teamBScore: matches.teamBScore,
    })
    .from(matchPlayers)
    .innerJoin(matches, eq(matchPlayers.matchId, matches.id))
    .where(eq(matchPlayers.playerId, playerId))
    .orderBy(desc(matches.matchDate));

  const goalRows = await db
    .select()
    .from(goals)
    .where(eq(goals.playerId, playerId));
  const goalsByMatch = new Map<number, number>();
  for (const g of goalRows) {
    if (g.isOwnGoal) continue;
    goalsByMatch.set(g.matchId, (goalsByMatch.get(g.matchId) ?? 0) + 1);
  }

  return rows.map((r) => ({
    matchId: r.matchId,
    matchDate: r.matchDate,
    team: r.team as "A" | "B",
    role: r.role as "starter" | "substitute",
    played: r.played,
    result: r.result as "win" | "loss" | "draw",
    teamAScore: r.teamAScore,
    teamBScore: r.teamBScore,
    goalsScored: goalsByMatch.get(r.matchId) ?? 0,
  }));
}

export type LeaderboardMetric =
  | "wins"
  | "goals"
  | "winPercentage"
  | "winningStreak"
  | "losingStreak";

export type LeaderboardEntry = PlayerStats &
  StreakSummary & {
    name: string;
    photoUrl: string | null;
    playerType: "regular" | "irregular";
  };

/** Leaderboard across players, sorted by the requested metric (descending).
 * Batched: fetches all data once and computes in memory, instead of per-player
 * queries. This is the fix for slow rankings loads. */
export async function calculateLeaderboard(
  metric: LeaderboardMetric,
  { includeInactive = false }: { includeInactive?: boolean } = {}
): Promise<LeaderboardEntry[]> {
  const [allPlayers, allMatches, allMatchPlayers, allGoals, allInjuries] = await Promise.all([
    db.query.players.findMany(),
    db.query.matches.findMany(),
    db.query.matchPlayers.findMany(),
    db.query.goals.findMany(),
    db.select({ playerId: injuries.playerId, start: injuries.startDate, end: injuries.endDate }).from(injuries),
  ]);

  const injuryRangesByPlayer = new Map<number, { start: string; end: string | null }[]>();
  for (const inj of allInjuries) {
    const list = injuryRangesByPlayer.get(inj.playerId) ?? [];
    list.push({ start: inj.start, end: inj.end });
    injuryRangesByPlayer.set(inj.playerId, list);
  }

  let systemEarliest: string | null = null;
  let systemLatest: string | null = null;
  for (const m of allMatches) {
    if (!systemEarliest || m.matchDate < systemEarliest) systemEarliest = m.matchDate;
    if (!systemLatest || m.matchDate > systemLatest) systemLatest = m.matchDate;
  }

  const matchDateById = new Map<number, string>();
  for (const m of allMatches) matchDateById.set(m.id, m.matchDate);

  const playedByPlayer = new Map<number, { matchDate: string; result: Result }[]>();
  for (const mp of allMatchPlayers) {
    if (!mp.played) continue;
    const matchDate = matchDateById.get(mp.matchId);
    if (!matchDate) continue;
    const list = playedByPlayer.get(mp.playerId) ?? [];
    list.push({ matchDate, result: mp.result as Result });
    playedByPlayer.set(mp.playerId, list);
  }

  const goalsByPlayer = new Map<number, number>();
  for (const g of allGoals) {
    if (g.isOwnGoal) continue;
    goalsByPlayer.set(g.playerId, (goalsByPlayer.get(g.playerId) ?? 0) + 1);
  }

  const withStats: LeaderboardEntry[] = [];
  for (const p of allPlayers) {
    if (!includeInactive && !p.isActive) continue;

    const played = (playedByPlayer.get(p.id) ?? []).sort((a, b) =>
      a.matchDate < b.matchDate ? -1 : a.matchDate > b.matchDate ? 1 : 0
    );
    const wins = played.filter((r) => r.result === "win").length;
    const losses = played.filter((r) => r.result === "loss").length;
    const draws = played.filter((r) => r.result === "draw").length;
    const matchesPlayed = played.length;
    const goalCount = goalsByPlayer.get(p.id) ?? 0;
    const winPercentage = matchesPlayed === 0 ? 0 : Math.round((wins / matchesPlayed) * 1000) / 10;
    const last = played[played.length - 1];
    const createdDate = p.createdAt.toISOString().slice(0, 10);
    const streaks = computeStreaksFromData(
      p.playerType as "regular" | "irregular",
      played,
      createdDate,
      systemEarliest,
      systemLatest,
      injuryRangesByPlayer.get(p.id) ?? []
    );

    withStats.push({
      playerId: p.id,
      matchesPlayed,
      wins,
      losses,
      draws,
      goals: goalCount,
      winPercentage,
      lastMatchDate: last?.matchDate ?? null,
      lastResult: (last?.result as "win" | "loss" | "draw" | undefined) ?? null,
      ...streaks,
      name: p.name,
      photoUrl: p.photoUrl,
      playerType: p.playerType as "regular" | "irregular",
    });
  }

  return withStats.sort((a, b) => b[metric] - a[metric]);
}
