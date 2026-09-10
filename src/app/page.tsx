import { calculateDashboardStats } from "@/lib/dashboard";
import { getSession } from "@/lib/auth";
import { TodaysMatchCard } from "@/components/dashboard/TodaysMatchCard";
import { HotStreaksRow, ColdStreaksRow } from "@/components/dashboard/StreakRows";
import { TopScorerCard, MiniRankings } from "@/components/dashboard/TopScorerAndRankings";

export default async function HomePage() {
  const [stats, session] = await Promise.all([calculateDashboardStats(), getSession()]);
  const isAdmin = Boolean(session);

  return (
    <div className="space-y-6">
      {/* Mobile: single stacked column. Desktop: hero + winners on the left,
          streaks/scorer/rankings on the right. */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[1.1fr_1fr]">
        <div className="space-y-6">
          <TodaysMatchCard stats={stats} isAdmin={isAdmin} />
          <div className="hidden md:block">
            <TopScorerCard scorer={stats.topScorer} />
          </div>
        </div>

        <div className="space-y-6">
          <HotStreaksRow players={stats.hotStreakPlayers} />
          <ColdStreaksRow players={stats.coldStreakPlayers} />
          <div className="md:hidden">
            <TopScorerCard scorer={stats.topScorer} />
          </div>
          <MiniRankings players={stats.topPlayersByWins} />
        </div>
      </div>
    </div>
  );
}
