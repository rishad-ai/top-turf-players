import { getMatchDetail } from "./matchService";
import { db } from "@/db";
import { matches, players, matchPlayers, goals } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { computeStreaksFromData, type Result, type StreakSummary } from "./streaks";
import type { PlayerStats } from "./stats";

type MatchDetailResult = NonNullable<Awaited<ReturnType<typeof getMatchDetail>>>;

export type DashboardPlayerSummary = PlayerStats &
  StreakSummary & {
    name: string;
    photoUrl: string | null;
    playerType: "regular" | "irregular";
  };

export type YearlyExtreme = {
  matchId: number;
  matchDate: string;
  teamAScore: number;
  teamBScore: number;
  winningTeam: "A" | "B";
  margin: number;
};

export type DashboardStats = {
  todayDate: string;
  hasTodayMatch: boolean;
  match: MatchDetailResult | null;
  isLatestFallback: boolean;
  winners: { playerId: number; name: string; photoUrl: string | null }[];
  isDraw: boolean;
  hotStreakPlayers: DashboardPlayerSummary[];
  coldStreakPlayers: DashboardPlayerSummary[];
  topScorer: DashboardPlayerSummary | null;
  topScorers: DashboardPlayerSummary[];
  topScorerThisMonth: { playerId: number; name: string; photoUrl: string | null; goals: number } | null;
  topScorerThisYear: { playerId: number; name: string; photoUrl: string | null; goals: number } | null;
  topPlayersByWins: DashboardPlayerSummary[];
  biggestResultThisYear: YearlyExtreme | null;
};

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Single optimized pass for the whole dashboard. Fetches every table once
 * (players, matches, match_players, goals) and computes all per-player stats and
 * streaks in memory, instead of issuing hundreds of per-player queries. This is the
 * main fix for slow dashboard loads.
 */
export async function calculateDashboardStats(): Promise<DashboardStats> {
  const today = todayISO();

  // --- Fetch everything once ---
  const [allPlayers, allMatches, allMatchPlayers, allGoals] = await Promise.all([
    db.query.players.findMany(),
    db.query.matches.findMany(),
    db.query.matchPlayers.findMany(),
    db.query.goals.findMany(),
  ]);

  // --- System date bounds ---
  let systemEarliest: string | null = null;
  let systemLatest: string | null = null;
  for (const m of allMatches) {
    if (!systemEarliest || m.matchDate < systemEarliest) systemEarliest = m.matchDate;
    if (!systemLatest || m.matchDate > systemLatest) systemLatest = m.matchDate;
  }

  const matchDateById = new Map<number, string>();
  const matchById = new Map<number, (typeof allMatches)[number]>();
  for (const m of allMatches) {
    matchDateById.set(m.id, m.matchDate);
    matchById.set(m.id, m);
  }

  // --- Today's match (or latest fallback) with full detail ---
  const todayMatchRow = allMatches.find((m) => m.matchDate === today) ?? null;
  let match: MatchDetailResult | null = null;
  let isLatestFallback = false;

  if (todayMatchRow) {
    match = await getMatchDetail(todayMatchRow.id);
  } else {
    const latest = [...allMatches].sort((a, b) => (a.matchDate < b.matchDate ? 1 : -1))[0];
    if (latest) {
      match = await getMatchDetail(latest.id);
      isLatestFallback = true;
    }
  }

  let winners: DashboardStats["winners"] = [];
  let isDraw = false;
  if (match) {
    if (match.match.teamAScore === match.match.teamBScore) {
      isDraw = true;
    } else {
      const winningTeam = match.match.teamAScore > match.match.teamBScore ? "A" : "B";
      winners = match.matchPlayers
        .filter((mp) => mp.team === winningTeam && mp.played)
        .map((mp) => ({ playerId: mp.playerId, name: mp.player.name, photoUrl: mp.player.photoUrl }));
    }
  }

  // --- Group played results and goals by player, in memory ---
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

  // --- Build a summary per active player ---
  const summaries: DashboardPlayerSummary[] = [];
  for (const p of allPlayers) {
    if (!p.isActive) continue;

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
      systemLatest
    );

    summaries.push({
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

  const hotStreakPlayers = summaries
    .filter((s) => s.winningStreak >= 3)
    .sort((a, b) => b.winningStreak - a.winningStreak);

  const coldStreakPlayers = summaries
    .filter((s) => s.losingStreak >= 3)
    .sort((a, b) => b.losingStreak - a.losingStreak);

  const scorers = summaries.filter((s) => s.goals > 0).sort((a, b) => b.goals - a.goals);
  const topScorer = scorers.length > 0 ? scorers[0] : null;
  const topScorers = scorers.slice(0, 5); // top 5 for the dashboard, with "view all"

  const topPlayersByWins = [...summaries].sort((a, b) => b.wins - a.wins).slice(0, 5);

  // --- Top scorer this month and this year (goals within the period) ---
  const currentYear = new Date(today).getFullYear();
  const currentMonth = today.slice(0, 7); // "YYYY-MM"
  const nameById = new Map<number, { name: string; photoUrl: string | null }>();
  for (const p of allPlayers) nameById.set(p.id, { name: p.name, photoUrl: p.photoUrl });

  const monthGoals = new Map<number, number>();
  const yearGoals = new Map<number, number>();
  for (const g of allGoals) {
    if (g.isOwnGoal) continue;
    const d = matchDateById.get(g.matchId);
    if (!d) continue;
    if (d.startsWith(`${currentYear}-`)) yearGoals.set(g.playerId, (yearGoals.get(g.playerId) ?? 0) + 1);
    if (d.startsWith(`${currentMonth}-`)) monthGoals.set(g.playerId, (monthGoals.get(g.playerId) ?? 0) + 1);
  }

  function topFromMap(m: Map<number, number>): { playerId: number; name: string; photoUrl: string | null; goals: number } | null {
    let best: { playerId: number; goals: number } | null = null;
    for (const [pid, goals] of m) {
      if (!best || goals > best.goals) best = { playerId: pid, goals };
    }
    if (!best) return null;
    const info = nameById.get(best.playerId);
    return { playerId: best.playerId, name: info?.name ?? `#${best.playerId}`, photoUrl: info?.photoUrl ?? null, goals: best.goals };
  }

  const topScorerThisMonth = topFromMap(monthGoals);
  const topScorerThisYear = topFromMap(yearGoals);

  // --- Biggest result of the current year ---
  let biggestResultThisYear: YearlyExtreme | null = null;
  for (const m of allMatches) {
    if (!m.matchDate.startsWith(`${currentYear}-`)) continue;
    const margin = Math.abs(m.teamAScore - m.teamBScore);
    if (margin === 0) continue;
    if (!biggestResultThisYear || margin > biggestResultThisYear.margin) {
      biggestResultThisYear = {
        matchId: m.id,
        matchDate: m.matchDate,
        teamAScore: m.teamAScore,
        teamBScore: m.teamBScore,
        winningTeam: m.teamAScore > m.teamBScore ? "A" : "B",
        margin,
      };
    }
  }

  return {
    todayDate: today,
    hasTodayMatch: Boolean(todayMatchRow),
    match,
    isLatestFallback,
    winners,
    isDraw,
    hotStreakPlayers,
    coldStreakPlayers,
    topScorer,
    topScorers,
    topScorerThisMonth,
    topScorerThisYear,
    topPlayersByWins,
    biggestResultThisYear,
  };
}
