import { calculateDashboardStats } from "@/lib/dashboard";
import { getSession, getMemberSession } from "@/lib/auth";
import { DashboardMatchCard, DashboardNoMatchCard } from "@/components/dashboard/DashboardMatchCard";
import { WinnersStrip } from "@/components/dashboard/WinnersStrip";
import { BiggestResultCard } from "@/components/dashboard/BiggestResultCard";
import { HotStreaksRow, ColdStreaksRow } from "@/components/dashboard/StreakRows";
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
  for (const g of stats.match?.goals ?? []) {
    if (g.isOwnGoal) continue;
    goalsByPlayer.set(g.playerId, (goalsByPlayer.get(g.playerId) ?? 0) + 1);
  }

  const teamAStarters = stats.match?.matchPlayers
    .filter((mp) => mp.team === "A" && mp.role === "starter")
    .map((mp) => ({
      playerId: mp.playerId,
      name: mp.player.name,
      photoUrl: mp.player.photoUrl,
      position: mp.position as "GK" | "DEF" | "ATT" | null,
      goals: goalsByPlayer.get(mp.playerId) ?? 0,
    })) ?? [];
  const teamBStarters = stats.match?.matchPlayers
    .filter((mp) => mp.team === "B" && mp.role === "starter")
    .map((mp) => ({
      playerId: mp.playerId,
      name: mp.player.name,
      photoUrl: mp.player.photoUrl,
      position: mp.position as "GK" | "DEF" | "ATT" | null,
      goals: goalsByPlayer.get(mp.playerId) ?? 0,
    })) ?? [];

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
