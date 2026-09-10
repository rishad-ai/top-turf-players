import Link from "next/link";
import { PlayerAvatar } from "@/components/players/PlayerAvatar";
import type { DashboardStats } from "@/lib/dashboard";
import { Plus } from "lucide-react";

export function TodaysMatchCard({
  stats,
  isAdmin,
}: {
  stats: DashboardStats;
  isAdmin: boolean;
}) {
  if (!stats.match) {
    return (
      <div className="rounded-2xl bg-surface p-6 text-center shadow-sm ring-1 ring-line">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
          Today&apos;s match
        </p>
        <p className="mt-1 text-sm text-ink-muted">6:00 – 7:00 AM</p>
        <p className="mt-4 font-display text-xl font-bold text-ink">
          MATCH NOT UPDATED
        </p>
        {isAdmin && (
          <Link
            href="/admin/matches/new"
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-pitch px-4 py-2 text-sm font-semibold text-white transition hover:bg-pitch-dark"
          >
            <Plus size={16} /> Enter today&apos;s match
          </Link>
        )}
      </div>
    );
  }

  const { match } = stats;
  const label = stats.isLatestFallback ? "Latest result" : "Today's match";

  return (
    <div className="rounded-2xl bg-surface p-6 text-center shadow-sm ring-1 ring-line">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
        {label}
      </p>
      <p className="mt-1 text-sm text-ink-muted">{match.match.matchDate}</p>
      <Link href={`/matches/${match.match.id}`} className="block">
        <p className="mt-3 font-display text-5xl font-bold text-ink">
          {match.match.teamAScore} : {match.match.teamBScore}
        </p>
      </Link>

      {stats.winners.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
            🏆 Today&apos;s winners
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {stats.winners.map((w) => (
              <div key={w.playerId} className="flex items-center gap-1.5">
                <PlayerAvatar name={w.name} photoUrl={w.photoUrl} size="sm" />
                <span className="text-sm font-medium text-ink">{w.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {stats.isDraw && (
        <p className="mt-5 text-sm font-medium text-ink-muted">It ended level — no winner today.</p>
      )}
    </div>
  );
}
