import { calculateDashboardStats } from "@/lib/dashboard";
import { getSession, getMemberSession } from "@/lib/auth";
import { DashboardMatchCard, DashboardNoMatchCard } from "@/components/dashboard/DashboardMatchCard";
import { WinnersStrip } from "@/components/dashboard/WinnersStrip";
import { BiggestResultCard } from "@/components/dashboard/BiggestResultCard";
import { HotStreaksRow, UndefeatedStreaksRow, ColdStreaksRow } from "@/components/dashboard/StreakRows";
import { MiniRankings } from "@/components/dashboard/TopScorerAndRankings";
import { TopScorersCard, PeriodTopScorers } from "@/components/dashboard/ScorerCards";

export default async function HomePage() {
  const [stats, admin, member] = await Promise.all([
    calculateDashboardStats(),
    getSession(),
    getMemberSession(),
  ]);
  const canEnterMatch = Boolean(admin || member);
  const currentYear = new Date(stats.todayDate).getFullYear();
  const monthLabel = new Date(stats.todayDate + "T00:00:00Z").toLocaleDateString("en-US", {
    month: "long",
    timeZone: "UTC",
  });

  // Goals scored per player in the shown match, for the boot icons.
  const goalsByPlayer = new Map<number, number>();
  const ownGoalsByPlayer = new Map<number, number>();
  for (const g of stats.match?.goals ?? []) {
    if (g.isOwnGoal) {
      ownGoalsByPlayer.set(g.playerId, (ownGoalsByPlayer.get(g.playerId) ?? 0) + 1);
    } else {
      goalsByPlayer.set(g.playerId, (goalsByPlayer.get(g.playerId) ?? 0) + 1);
    }
  }

  const rows = stats.match?.matchPlayers ?? [];
  // Starters who were replaced (came off) = the replacedPlayerId of any played sub.
  const replacedStarterIds = new Set<number>();
  for (const mp of rows) {
    if (mp.role === "substitute" && mp.played && mp.replacedPlayerId) {
      replacedStarterIds.add(mp.replacedPlayerId);
    }
  }

  type MP = NonNullable<typeof stats.match>["matchPlayers"][number];
  const toLineup = (mp: MP) => ({
    playerId: mp.playerId,
    name: mp.player.name,
    photoUrl: mp.player.photoUrl,
    position: mp.position as "GK" | "DEF" | "ATT" | null,
    goals: goalsByPlayer.get(mp.playerId) ?? 0,
    ownGoals: ownGoalsByPlayer.get(mp.playerId) ?? 0,
    cameOff: replacedStarterIds.has(mp.playerId),
    cameOn: mp.role === "substitute" && mp.played && !!mp.replacedPlayerId,
  });

  const teamAStarters = rows.filter((mp) => mp.team === "A" && mp.role === "starter").map(toLineup);
  const teamBStarters = rows.filter((mp) => mp.team === "B" && mp.role === "starter").map(toLineup);
  // Only substitutes who actually played are shown (and they're already in stats).
  const teamASubs = rows.filter((mp) => mp.team === "A" && mp.role === "substitute" && mp.played).map(toLineup);
  const teamBSubs = rows.filter((mp) => mp.team === "B" && mp.role === "substitute" && mp.played).map(toLineup);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[1.1fr_1fr]">
        <div className="space-y-6">
          {stats.match ? (
            <>
              <DashboardMatchCard
                matchDate={stats.match.match.matchDate}
                label={stats.isLatestFallback ? "Latest result" : "Today's match"}
                teamAScore={stats.match.match.teamAScore}
                teamBScore={stats.match.match.teamBScore}
                teamAPlayers={teamAStarters}
                teamBPlayers={teamBStarters}
                teamASubs={teamASubs}
                teamBSubs={teamBSubs}
              />
              <WinnersStrip winners={stats.winners} isDraw={stats.isDraw} />
            </>
          ) : (
            <DashboardNoMatchCard canEnterMatch={canEnterMatch} />
          )}

          <div className="hidden md:block">
            <PeriodTopScorers
              monthScorer={stats.topScorerThisMonth}
              yearScorer={stats.topScorerThisYear}
              year={currentYear}
              monthLabel={monthLabel}
            />
          </div>
        </div>

        <div className="space-y-6">
          <HotStreaksRow players={stats.hotStreakPlayers} />
          <UndefeatedStreaksRow players={stats.undefeatedStreakPlayers} />
          <ColdStreaksRow players={stats.coldStreakPlayers} />
          <div className="md:hidden">
            <PeriodTopScorers
              monthScorer={stats.topScorerThisMonth}
              yearScorer={stats.topScorerThisYear}
              year={currentYear}
              monthLabel={monthLabel}
            />
          </div>
          <TopScorersCard scorers={stats.topScorers} />
          <BiggestResultCard result={stats.biggestResultThisYear} year={currentYear} />
          <MiniRankings players={stats.topPlayersByWins} />
        </div>
      </div>
    </div>
  );
}
