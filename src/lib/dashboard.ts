import { getMatchDetail } from "./matchService";
import { db } from "@/db";
import { matches, players } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { calculatePlayerStats, type PlayerStats } from "./stats";
import { calculatePlayerStreaks, type StreakSummary } from "./streaks";

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
  isLatestFallback: boolean; // true when showing the latest past match instead of today's
  winners: { playerId: number; name: string; photoUrl: string | null }[];
  isDraw: boolean;
  hotStreakPlayers: DashboardPlayerSummary[];
  coldStreakPlayers: DashboardPlayerSummary[];
  topScorer: DashboardPlayerSummary | null;
  topPlayersByWins: DashboardPlayerSummary[];
  biggestResultThisYear: YearlyExtreme | null;
};

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** The single largest-margin (most lopsided) match played in the given year, if any. */
export async function calculateBiggestResultOfYear(year: number): Promise<YearlyExtreme | null> {
  const allMatches = await db.query.matches.findMany();
  const yearMatches = allMatches.filter((m) => m.matchDate.startsWith(`${year}-`));

  let best: YearlyExtreme | null = null;
  for (const m of yearMatches) {
    const margin = Math.abs(m.teamAScore - m.teamBScore);
    if (margin === 0) continue; // draws have no "winner" for this stat
    if (!best || margin > best.margin) {
      best = {
        matchId: m.id,
        matchDate: m.matchDate,
        teamAScore: m.teamAScore,
        teamBScore: m.teamBScore,
        winningTeam: m.teamAScore > m.teamBScore ? "A" : "B",
        margin,
      };
    }
  }
  return best;
}

export async function calculateDashboardStats(): Promise<DashboardStats> {
  const today = todayISO();

  const todayMatchRow = await db.query.matches.findFirst({
    where: eq(matches.matchDate, today),
  });

  let match: MatchDetailResult | null = null;
  let isLatestFallback = false;

  if (todayMatchRow) {
    match = await getMatchDetail(todayMatchRow.id);
  } else {
    const latest = await db.query.matches.findFirst({
      orderBy: [desc(matches.matchDate)],
    });
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

  const activePlayers = await db.query.players.findMany({ where: eq(players.isActive, true) });

  const summaries: DashboardPlayerSummary[] = [];
  for (const p of activePlayers) {
    const [stats, streaks] = await Promise.all([
      calculatePlayerStats(p.id),
      calculatePlayerStreaks(p.id),
    ]);
    summaries.push({
      ...stats,
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

  const topPlayersByWins = [...summaries].sort((a, b) => b.wins - a.wins).slice(0, 5);

  const currentYear = new Date(today).getFullYear();
  const biggestResultThisYear = await calculateBiggestResultOfYear(currentYear);

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
    topPlayersByWins,
    biggestResultThisYear,
  };
}
