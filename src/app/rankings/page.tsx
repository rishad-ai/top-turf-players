import Link from "next/link";
import { calculateLeaderboard, type LeaderboardMetric } from "@/lib/stats";
import { PlayerAvatar } from "@/components/players/PlayerAvatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { RankingTabs } from "./RankingTabs";

const VALID_METRICS: LeaderboardMetric[] = [
  "wins",
  "goals",
  "winPercentage",
  "winningStreak",
  "losingStreak",
];

function formatValue(metric: LeaderboardMetric, entry: Awaited<ReturnType<typeof calculateLeaderboard>>[number]) {
  switch (metric) {
    case "wins":
      return `${entry.wins}W`;
    case "goals":
      return `${entry.goals} ⚽`;
    case "winPercentage":
      return `${entry.winPercentage}%`;
    case "winningStreak":
      return entry.winningStreak > 0 ? `🔥 ${entry.winningStreak}` : "—";
    case "losingStreak":
      return entry.losingStreak > 0
        ? `🔻 ${entry.losingStreak}${entry.playerType === "irregular" ? "m" : "d"}`
        : "—";
  }
}

export default async function RankingsPage({
  searchParams,
}: {
  searchParams: Promise<{ metric?: string }>;
}) {
  const { metric: metricParam } = await searchParams;
  const metric: LeaderboardMetric = VALID_METRICS.includes(metricParam as LeaderboardMetric)
    ? (metricParam as LeaderboardMetric)
    : "wins";

  const leaderboard = await calculateLeaderboard(metric);
  // Players with zero matches clutter every ranking view - hide them here (they still
  // show up fine on their own profile and in the players list).
  const ranked = leaderboard.filter((p) => p.matchesPlayed > 0);

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-semibold text-ink">Rankings</h1>

      <RankingTabs active={metric} />

      {ranked.length === 0 ? (
        <EmptyState
          title="No rankings yet"
          description="Rankings will appear once players have match history."
        />
      ) : (
        <div className="rounded-2xl bg-surface shadow-sm ring-1 ring-line">
          {ranked.map((p, i) => (
            <Link
              key={p.playerId}
              href={`/players/${p.playerId}`}
              className={`flex items-center gap-3 px-4 py-3 ${i !== 0 ? "border-t border-line" : ""}`}
            >
              <span
                className={`w-6 text-center font-display text-sm font-bold ${
                  i === 0 ? "text-amber" : i === 1 ? "text-ink-muted" : i === 2 ? "text-red" : "text-ink-muted"
                }`}
              >
                {i + 1}
              </span>
              <PlayerAvatar name={p.name} photoUrl={p.photoUrl} size="md" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">{p.name}</p>
                <p className="text-xs text-ink-muted">{p.matchesPlayed} played</p>
              </div>
              <span className="font-display text-base font-bold text-pitch-dark">
                {formatValue(metric, p)}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
