import { db } from "@/db";
import { players, matches } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function getAdminOverview() {
  const allPlayers = await db.query.players.findMany();
  const activePlayers = allPlayers.filter((p) => p.isActive);
  const inactivePlayers = allPlayers.filter((p) => !p.isActive);

  const allMatches = await db.query.matches.findMany();
  const latestMatch = await db.query.matches.findFirst({
    orderBy: [desc(matches.matchDate)],
  });

  const today = new Date().toISOString().slice(0, 10);
  const todayMatch = await db.query.matches.findFirst({
    where: eq(matches.matchDate, today),
  });

  return {
    totalPlayers: allPlayers.length,
    activePlayers: activePlayers.length,
    inactivePlayers: inactivePlayers.length,
    totalMatches: allMatches.length,
    latestMatchDate: latestMatch?.matchDate ?? null,
    hasTodayMatch: Boolean(todayMatch),
    todayDate: today,
  };
}
