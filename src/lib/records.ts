import { db } from "@/db";
import { players, matches, matchPlayers, goals } from "@/db/schema";
import {
  computeRegularLongestLosingStreakFromMap,
  computeIrregularLongestLosingStreakFromSequence,
  computeStreaksFromData,
  type Result,
} from "./streaks";

export type ScorerRow = { playerId: number; name: string; photoUrl: string | null; goals: number };
export type WinsRow = { playerId: number; name: string; photoUrl: string | null; wins: number };
export type StreakRow = {
  playerId: number;
  name: string;
  photoUrl: string | null;
  playerType: "regular" | "irregular";
  streak: number;
};
export type ResultRow = {
  matchId: number;
  matchDate: string;
  teamAScore: number;
  teamBScore: number;
  winningTeam: "A" | "B";
  margin: number;
};
export type TopGameRow = {
  matchId: number;
  matchDate: string;
  teamAScore: number;
  teamBScore: number;
  totalGoals: number;
};

export type Records = {
  lastMonthLabel: string; // e.g. "August 2026"
  currentYear: number;
  scorersThisMonth: ScorerRow[];
  scorersLastMonth: ScorerRow[];
  scorersThisYear: ScorerRow[];
  scorersAllTime: ScorerRow[];
  winsLastMonth: WinsRow[];
  losingStreakLastMonth: StreakRow[];
  losingStreakAllTime: StreakRow[];
  biggestResults: ResultRow[];
  topScoringGames: TopGameRow[];
};

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function calculateRecords(): Promise<Records> {
  const today = todayISO();
  const currentYear = Number(today.slice(0, 4));
  const thisMonthPrefix = today.slice(0, 7); // YYYY-MM

  // Previous calendar month window.
  const y = currentYear;
  const m = Number(today.slice(5, 7));
  const lm = m === 1 ? 12 : m - 1;
  const ly = m === 1 ? y - 1 : y;
  const lastMonthPrefix = `${ly}-${String(lm).padStart(2, "0")}`;
  const lastMonthStart = `${lastMonthPrefix}-01`;
  const lastMonthEnd = new Date(Date.UTC(ly, lm, 0)).toISOString().slice(0, 10); // day 0 of next month
  const lastMonthLabel = new Date(`${lastMonthStart}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  const [allPlayers, allMatches, allMatchPlayers, allGoals] = await Promise.all([
    db.query.players.findMany(),
    db.query.matches.findMany(),
    db.query.matchPlayers.findMany(),
    db.query.goals.findMany(),
  ]);

  const nameById = new Map<number, { name: string; photoUrl: string | null; playerType: "regular" | "irregular"; createdAt: Date; isActive: boolean }>();
  for (const p of allPlayers)
    nameById.set(p.id, {
      name: p.name,
      photoUrl: p.photoUrl,
      playerType: p.playerType as "regular" | "irregular",
      createdAt: p.createdAt,
      isActive: p.isActive,
    });

  const matchDateById = new Map<number, string>();
  for (const mt of allMatches) matchDateById.set(mt.id, mt.matchDate);

  let systemEarliest: string | null = null;
  let systemLatest: string | null = null;
  for (const mt of allMatches) {
    if (!systemEarliest || mt.matchDate < systemEarliest) systemEarliest = mt.matchDate;
    if (!systemLatest || mt.matchDate > systemLatest) systemLatest = mt.matchDate;
  }

  // ---- Scorer leaderboards (own goals excluded) ----
  function topScorers(inWindow: (date: string) => boolean, n = 5): ScorerRow[] {
    const counts = new Map<number, number>();
    for (const g of allGoals) {
      if (g.isOwnGoal) continue;
      const d = matchDateById.get(g.matchId);
      if (!d || !inWindow(d)) continue;
      counts.set(g.playerId, (counts.get(g.playerId) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([playerId, goalCount]) => {
        const info = nameById.get(playerId);
        return { playerId, name: info?.name ?? `#${playerId}`, photoUrl: info?.photoUrl ?? null, goals: goalCount };
      })
      .sort((a, b) => b.goals - a.goals)
      .slice(0, n);
  }

  const scorersThisMonth = topScorers((d) => d.startsWith(`${thisMonthPrefix}-`));
  const scorersLastMonth = topScorers((d) => d.startsWith(`${lastMonthPrefix}-`));
  const scorersThisYear = topScorers((d) => d.startsWith(`${currentYear}-`));
  const scorersAllTime = topScorers(() => true);

  // ---- Most wins last month ----
  const winCounts = new Map<number, number>();
  for (const mp of allMatchPlayers) {
    if (!mp.played || mp.result !== "win") continue;
    const d = matchDateById.get(mp.matchId);
    if (!d || !d.startsWith(`${lastMonthPrefix}-`)) continue;
    winCounts.set(mp.playerId, (winCounts.get(mp.playerId) ?? 0) + 1);
  }
  const winsLastMonth: WinsRow[] = [...winCounts.entries()]
    .map(([playerId, wins]) => {
      const info = nameById.get(playerId);
      return { playerId, name: info?.name ?? `#${playerId}`, photoUrl: info?.photoUrl ?? null, wins };
    })
    .sort((a, b) => b.wins - a.wins)
    .slice(0, 5);

  // ---- Losing streaks ----
  // Group each player's PLAYED results by date, ascending.
  const playedByPlayer = new Map<number, { matchDate: string; result: Result }[]>();
  for (const mp of allMatchPlayers) {
    if (!mp.played) continue;
    const d = matchDateById.get(mp.matchId);
    if (!d) continue;
    const list = playedByPlayer.get(mp.playerId) ?? [];
    list.push({ matchDate: d, result: mp.result as Result });
    playedByPlayer.set(mp.playerId, list);
  }
  for (const list of playedByPlayer.values())
    list.sort((a, b) => (a.matchDate < b.matchDate ? -1 : a.matchDate > b.matchDate ? 1 : 0));

  // Latest match date that falls within last month (to bound the windowed streak).
  let lastMonthLatest: string | null = null;
  for (const mt of allMatches) {
    if (mt.matchDate >= lastMonthStart && mt.matchDate <= lastMonthEnd) {
      if (!lastMonthLatest || mt.matchDate > lastMonthLatest) lastMonthLatest = mt.matchDate;
    }
  }

  const losingAllTime: StreakRow[] = [];
  const losingLastMonth: StreakRow[] = [];
  for (const p of allPlayers) {
    if (!p.isActive) continue;
    const played = playedByPlayer.get(p.id) ?? [];
    const info = nameById.get(p.id)!;
    const createdDate = p.createdAt.toISOString().slice(0, 10);

    // All-time longest losing streak (reuse the shared engine).
    const streaks = computeStreaksFromData(info.playerType, played, createdDate, systemEarliest, systemLatest);
    if (streaks.longestLosingStreak > 0)
      losingAllTime.push({ playerId: p.id, name: info.name, photoUrl: info.photoUrl, playerType: info.playerType, streak: streaks.longestLosingStreak });

    // Longest losing streak occurring within last month only.
    if (lastMonthLatest) {
      let windowStreak = 0;
      if (info.playerType === "irregular") {
        const seq = played.filter((r) => r.matchDate >= lastMonthStart && r.matchDate <= lastMonthEnd).map((r) => r.result);
        windowStreak = computeIrregularLongestLosingStreakFromSequence(seq);
      } else {
        const map = new Map<string, Result>();
        for (const r of played) if (r.matchDate >= lastMonthStart && r.matchDate <= lastMonthEnd) map.set(r.matchDate, r.result);
        const startBoundary = createdDate > lastMonthStart ? createdDate : lastMonthStart;
        windowStreak = computeRegularLongestLosingStreakFromMap(map, startBoundary, lastMonthLatest);
      }
      if (windowStreak > 0)
        losingLastMonth.push({ playerId: p.id, name: info.name, photoUrl: info.photoUrl, playerType: info.playerType, streak: windowStreak });
    }
  }
  losingAllTime.sort((a, b) => b.streak - a.streak);
  losingLastMonth.sort((a, b) => b.streak - a.streak);

  // ---- Biggest results (by margin) and top-scoring games (by combined goals) ----
  const decided = allMatches.filter((mt) => mt.teamAScore !== mt.teamBScore);
  const biggestResults: ResultRow[] = decided
    .map((mt) => ({
      matchId: mt.id,
      matchDate: mt.matchDate,
      teamAScore: mt.teamAScore,
      teamBScore: mt.teamBScore,
      winningTeam: (mt.teamAScore > mt.teamBScore ? "A" : "B") as "A" | "B",
      margin: Math.abs(mt.teamAScore - mt.teamBScore),
    }))
    .sort((a, b) => b.margin - a.margin || (a.matchDate < b.matchDate ? 1 : -1))
    .slice(0, 5);

  const topScoringGames: TopGameRow[] = allMatches
    .map((mt) => ({
      matchId: mt.id,
      matchDate: mt.matchDate,
      teamAScore: mt.teamAScore,
      teamBScore: mt.teamBScore,
      totalGoals: mt.teamAScore + mt.teamBScore,
    }))
    .sort((a, b) => b.totalGoals - a.totalGoals || (a.matchDate < b.matchDate ? 1 : -1))
    .slice(0, 5);

  return {
    lastMonthLabel,
    currentYear,
    scorersThisMonth,
    scorersLastMonth,
    scorersThisYear,
    scorersAllTime,
    winsLastMonth,
    losingStreakLastMonth: losingLastMonth.slice(0, 5),
    losingStreakAllTime: losingAllTime.slice(0, 5),
    biggestResults,
    topScoringGames,
  };
}
