import { db } from "@/db";
import { players, matchPlayers, matches, goals } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { calculatePlayerStreaks, type StreakSummary } from "./streaks";

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
};

/**
 * Calculates a player's core stats purely from match history.
 * Only match_players rows with played=true count (a substitute who didn't
 * actually play is excluded, per spec).
 */
export async function calculatePlayerStats(playerId: number): Promise<PlayerStats> {
  const rows = await db
    .select({
      result: matchPlayers.result,
      matchDate: matches.matchDate,
    })
    .from(matchPlayers)
    .innerJoin(matches, eq(matchPlayers.matchId, matches.id))
    .where(and(eq(matchPlayers.playerId, playerId), eq(matchPlayers.played, true)))
    .orderBy(desc(matches.matchDate));

  const matchesPlayed = rows.length;
  const wins = rows.filter((r) => r.result === "win").length;
  const losses = rows.filter((r) => r.result === "loss").length;
  const draws = rows.filter((r) => r.result === "draw").length;

  const goalRows = await db
    .select()
    .from(goals)
    .where(eq(goals.playerId, playerId));
  const goalCount = goalRows.length;

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
  };
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

/** Leaderboard across all active players, sorted by the requested metric (descending). */
export async function calculateLeaderboard(
  metric: LeaderboardMetric,
  { includeInactive = false }: { includeInactive?: boolean } = {}
): Promise<LeaderboardEntry[]> {
  const allPlayers = includeInactive
    ? await db.query.players.findMany()
    : await db.query.players.findMany({ where: eq(players.isActive, true) });

  const withStats: LeaderboardEntry[] = [];
  for (const p of allPlayers) {
    const [stats, streaks] = await Promise.all([
      calculatePlayerStats(p.id),
      calculatePlayerStreaks(p.id),
    ]);
    withStats.push({
      ...stats,
      ...streaks,
      name: p.name,
      photoUrl: p.photoUrl,
      playerType: p.playerType as "regular" | "irregular",
    });
  }

  return withStats.sort((a, b) => b[metric] - a[metric]);
}
