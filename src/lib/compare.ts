import { db } from "@/db";
import { matchPlayers, matches, goals } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { getPlayerById } from "./players";
import { calculatePlayerStats, calculatePlayerMatchHistory, type PlayerStats, type PlayerMatchHistoryEntry } from "./stats";
import { calculatePlayerStreaks, type StreakSummary } from "./streaks";

export type ComparePlayer = {
  id: number;
  name: string;
  photoUrl: string | null;
  playerType: "regular" | "irregular";
  stats: PlayerStats;
  streaks: StreakSummary;
  recentForm: ("win" | "loss" | "draw")[]; // most recent first, up to 5
};

/** Opposite-teams head-to-head record, counting only matches BOTH players actually
 * played AND were on opposing sides. */
export type HeadToHead = {
  meetings: number; // opposite-team matches both played
  aWins: number; // matches player A's team won
  bWins: number; // matches player B's team won
  draws: number;
  aGoals: number; // goals A scored across those meetings
  bGoals: number; // goals B scored across those meetings
};

export type Comparison = {
  a: ComparePlayer;
  b: ComparePlayer;
  headToHead: HeadToHead;
};

async function buildComparePlayer(id: number): Promise<ComparePlayer | null> {
  const player = await getPlayerById(id);
  if (!player) return null;

  const [stats, streaks, history] = await Promise.all([
    calculatePlayerStats(id),
    calculatePlayerStreaks(id),
    calculatePlayerMatchHistory(id),
  ]);

  const recentForm = history
    .filter((h: PlayerMatchHistoryEntry) => h.played)
    .slice(0, 5)
    .map((h) => h.result);

  return {
    id: player.id,
    name: player.name,
    photoUrl: player.photoUrl,
    playerType: player.playerType as "regular" | "irregular",
    stats,
    streaks,
    recentForm,
  };
}

/** Opposite-teams head-to-head between two players. */
async function computeHeadToHead(idA: number, idB: number): Promise<HeadToHead> {
  const empty: HeadToHead = { meetings: 0, aWins: 0, bWins: 0, draws: 0, aGoals: 0, bGoals: 0 };

  // Each player's played matches -> team.
  const rows = await db
    .select({ playerId: matchPlayers.playerId, matchId: matchPlayers.matchId, team: matchPlayers.team })
    .from(matchPlayers)
    .where(and(inArray(matchPlayers.playerId, [idA, idB]), eq(matchPlayers.played, true)));

  const teamA = new Map<number, "A" | "B">();
  const teamB = new Map<number, "A" | "B">();
  for (const r of rows) {
    if (r.playerId === idA) teamA.set(r.matchId, r.team as "A" | "B");
    else if (r.playerId === idB) teamB.set(r.matchId, r.team as "A" | "B");
  }

  // Opposite-team matches both played.
  const meetingIds: number[] = [];
  for (const [matchId, tA] of teamA) {
    const tB = teamB.get(matchId);
    if (tB && tB !== tA) meetingIds.push(matchId);
  }
  if (meetingIds.length === 0) return empty;

  const matchRows = await db
    .select({ id: matches.id, teamAScore: matches.teamAScore, teamBScore: matches.teamBScore })
    .from(matches)
    .where(inArray(matches.id, meetingIds));
  const scoreById = new Map<number, { a: number; b: number }>();
  for (const m of matchRows) scoreById.set(m.id, { a: m.teamAScore, b: m.teamBScore });

  // Goals scored by each player in those meetings (own goals excluded).
  const goalRows = await db
    .select({ playerId: goals.playerId, matchId: goals.matchId, isOwnGoal: goals.isOwnGoal })
    .from(goals)
    .where(and(inArray(goals.playerId, [idA, idB]), inArray(goals.matchId, meetingIds)));

  const result: HeadToHead = { ...empty, meetings: meetingIds.length };

  for (const matchId of meetingIds) {
    const score = scoreById.get(matchId);
    if (!score) continue;
    const winningTeam = score.a === score.b ? null : score.a > score.b ? "A" : "B";
    if (winningTeam === null) {
      result.draws++;
    } else if (teamA.get(matchId) === winningTeam) {
      result.aWins++;
    } else {
      result.bWins++;
    }
  }

  for (const g of goalRows) {
    if (g.isOwnGoal) continue;
    if (g.playerId === idA) result.aGoals++;
    else if (g.playerId === idB) result.bGoals++;
  }

  return result;
}

/** Full side-by-side comparison of two players, with an opposite-teams head-to-head. */
export async function comparePlayers(idA: number, idB: number): Promise<Comparison | null> {
  if (idA === idB) return null;
  const [a, b] = await Promise.all([buildComparePlayer(idA), buildComparePlayer(idB)]);
  if (!a || !b) return null;
  const headToHead = await computeHeadToHead(idA, idB);
  return { a, b, headToHead };
}
