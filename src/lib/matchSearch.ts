import { db } from "@/db";
import { matches, matchPlayers } from "@/db/schema";
import { eq, and, inArray, desc } from "drizzle-orm";

export type MatchSearchFilters = {
  date?: string;
  playerId?: number;
  team?: "A" | "B";
  result?: "win" | "loss" | "draw"; // relative to playerId - ignored if no playerId given
  winner?: "A" | "B" | "draw"; // overall match outcome, independent of any specific player
  score?: string; // "3-1" - matches this scoreline in either orientation
};

export type MatchSearchResult = {
  id: number;
  matchDate: string;
  teamAScore: number;
  teamBScore: number;
};

function parseScoreFilter(score: string): { a: number; b: number } | null {
  const match = score.trim().match(/^(\d+)\s*-\s*(\d+)$/);
  if (!match) return null;
  return { a: Number(match[1]), b: Number(match[2]) };
}

export async function searchMatches(filters: MatchSearchFilters): Promise<MatchSearchResult[]> {
  // If a player filter is set, first resolve which match ids that player appears in
  // (optionally narrowed by team and/or result), then intersect with everything else.
  let allowedMatchIds: Set<number> | null = null;

  if (filters.playerId !== undefined) {
    const conditions = [eq(matchPlayers.playerId, filters.playerId)];
    if (filters.team) conditions.push(eq(matchPlayers.team, filters.team));
    if (filters.result) conditions.push(eq(matchPlayers.result, filters.result));

    const rows = await db
      .select({ matchId: matchPlayers.matchId })
      .from(matchPlayers)
      .where(and(...conditions));

    allowedMatchIds = new Set(rows.map((r) => r.matchId));
    if (allowedMatchIds.size === 0) return [];
  }

  const whereConditions = [];
  if (filters.date) whereConditions.push(eq(matches.matchDate, filters.date));
  if (allowedMatchIds) whereConditions.push(inArray(matches.id, [...allowedMatchIds]));

  const rows = await db
    .select()
    .from(matches)
    .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
    .orderBy(desc(matches.matchDate));

  let results = rows;

  if (filters.winner) {
    results = results.filter((m) => {
      if (filters.winner === "draw") return m.teamAScore === m.teamBScore;
      if (filters.winner === "A") return m.teamAScore > m.teamBScore;
      return m.teamBScore > m.teamAScore;
    });
  }

  if (filters.score) {
    const parsed = parseScoreFilter(filters.score);
    if (parsed) {
      results = results.filter((m) => {
        const pair = [m.teamAScore, m.teamBScore].sort();
        const target = [parsed.a, parsed.b].sort();
        return pair[0] === target[0] && pair[1] === target[1];
      });
    }
  }

  return results.map((m) => ({
    id: m.id,
    matchDate: m.matchDate,
    teamAScore: m.teamAScore,
    teamBScore: m.teamBScore,
  }));
}
