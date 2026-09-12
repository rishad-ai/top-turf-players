import Link from "next/link";
import { PlayerAvatar } from "@/components/players/PlayerAvatar";
import type { DashboardPlayerSummary } from "@/lib/dashboard";

type MiniScorer = { playerId: number; name: string; photoUrl: string | null; goals: number };

export function TopScorersCard({ scorers }: { scorers: DashboardPlayerSummary[] }) {
  if (scorers.length === 0) return null;
  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <p className="font-display text-base font-semibold text-ink">⚽ Top scorers</p>
        <Link href="/rankings?metric=goals" className="text-sm font-medium text-pitch-dark">
          View all →
        </Link>
      </div>
      <div className="rounded-2xl bg-surface shadow-sm ring-1 ring-line">
        {scorers.map((p, i) => (
          <Link
            key={p.playerId}
            href={`/players/${p.playerId}`}
            className={`flex items-center gap-3 px-4 py-2.5 ${i !== 0 ? "border-t border-line" : ""}`}
          >
            <span className="w-4 text-sm font-semibold text-ink-muted">{i + 1}</span>
            <PlayerAvatar name={p.name} photoUrl={p.photoUrl} size="sm" />
            <span className="flex-1 truncate text-sm font-medium text-ink">{p.name}</span>
            <span className="text-sm font-semibold text-pitch-dark">{p.goals} ⚽</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function PeriodTopScorers({
  monthScorer,
  yearScorer,
  year,
  monthLabel,
}: {
  monthScorer: MiniScorer | null;
  yearScorer: MiniScorer | null;
  year: number;
  monthLabel: string;
}) {
  if (!monthScorer && !yearScorer) return null;
  return (
    <section>
      <p className="mb-2 font-display text-base font-semibold text-ink">👑 Top scorer</p>
      <div className="grid grid-cols-2 gap-3">
        <TopScorerTile label={monthLabel} scorer={monthScorer} />
        <TopScorerTile label={String(year)} scorer={yearScorer} />
      </div>
    </section>
  );
}

function TopScorerTile({ label, scorer }: { label: string; scorer: MiniScorer | null }) {
  return (
    <div className="rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-line">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">{label}</p>
      {scorer ? (
        <Link href={`/players/${scorer.playerId}`} className="flex items-center gap-2">
          <PlayerAvatar name={scorer.name} photoUrl={scorer.photoUrl} size="md" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">{scorer.name}</p>
            <p className="text-xs text-ink-muted">{scorer.goals} goals</p>
          </div>
        </Link>
      ) : (
        <p className="text-sm text-ink-muted">No goals yet</p>
      )}
    </div>
  );
}
