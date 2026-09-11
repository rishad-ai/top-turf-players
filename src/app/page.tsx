import { calculateDashboardStats } from "@/lib/dashboard";
import { getSession, getMemberSession } from "@/lib/auth";
import { DashboardMatchCard, DashboardNoMatchCard } from "@/components/dashboard/DashboardMatchCard";
import { WinnersStrip } from "@/components/dashboard/WinnersStrip";
import { BiggestResultCard } from "@/components/dashboard/BiggestResultCard";
import { HotStreaksRow, ColdStreaksRow } from "@/components/dashboard/StreakRows";
import { TopScorerCard, MiniRankings } from "@/components/dashboard/TopScorerAndRankings";

export default async function HomePage() {
  const [stats, admin, member] = await Promise.all([
    calculateDashboardStats(),
    getSession(),
    getMemberSession(),
  ]);
  const canEnterMatch = Boolean(admin || member);
  const currentYear = new Date(stats.todayDate).getFullYear();

  const teamAStarters = stats.match?.matchPlayers
    .filter((mp) => mp.team === "A" && mp.role === "starter")
    .map((mp) => ({
      playerId: mp.playerId,
      name: mp.player.name,
      photoUrl: mp.player.photoUrl,
      position: mp.position as "GK" | "DEF" | "ATT" | null,
    })) ?? [];
  const teamBStarters = stats.match?.matchPlayers
    .filter((mp) => mp.team === "B" && mp.role === "starter")
    .map((mp) => ({
      playerId: mp.playerId,
      name: mp.player.name,
      photoUrl: mp.player.photoUrl,
      position: mp.position as "GK" | "DEF" | "ATT" | null,
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
            <TopScorerCard scorer={stats.topScorer} />
          </div>
        </div>

        <div className="space-y-6">
          <HotStreaksRow players={stats.hotStreakPlayers} />
          <ColdStreaksRow players={stats.coldStreakPlayers} />
          <BiggestResultCard result={stats.biggestResultThisYear} year={currentYear} />
          <div className="md:hidden">
            <TopScorerCard scorer={stats.topScorer} />
          </div>
          <MiniRankings players={stats.topPlayersByWins} />
        </div>
      </div>
    </div>
  );
}
