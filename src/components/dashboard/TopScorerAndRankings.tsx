import Link from "next/link";
import { PlayerAvatar } from "@/components/players/PlayerAvatar";
import type { DashboardPlayerSummary } from "@/lib/dashboard";

export function TopScorerCard({ scorer }: { scorer: DashboardPlayerSummary | null }) {
  if (!scorer) return null;
  return (
    <section>
      <p className="mb-2 font-display text-base font-semibold text-ink">⚽ Top scorer</p>
      <Link
        href={`/players/${scorer.playerId}`}
        className="flex items-center gap-3 rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-line transition hover:shadow-md hover:ring-pitch/30"
      >
        <PlayerAvatar name={scorer.name} photoUrl={scorer.photoUrl} size="lg" />
        <div>
          <p className="font-display text-base font-semibold text-ink">{scorer.name}</p>
          <p className="text-sm text-ink-muted">{scorer.goals} goals</p>
        </div>
      </Link>
    </section>
  );
}

export function MiniRankings({ players }: { players: DashboardPlayerSummary[] }) {
  if (players.length === 0) return null;
  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <p className="font-display text-base font-semibold text-ink">Top players</p>
        <Link href="/rankings" className="text-sm font-medium text-pitch-dark">
          See full rankings →
        </Link>
      </div>
      <div className="rounded-2xl bg-surface shadow-sm ring-1 ring-line">
        {players.map((p, i) => (
          <Link
            key={p.playerId}
            href={`/players/${p.playerId}`}
            className={`flex items-center gap-3 px-4 py-2.5 ${i !== 0 ? "border-t border-line" : ""}`}
          >
            <span className="w-4 text-sm font-semibold text-ink-muted">{i + 1}</span>
            <PlayerAvatar name={p.name} photoUrl={p.photoUrl} size="sm" />
            <span className="flex-1 truncate text-sm font-medium text-ink">{p.name}</span>
            <span className="text-sm font-semibold text-pitch-dark">{p.wins}W</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
