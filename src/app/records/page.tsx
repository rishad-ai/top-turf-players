import Link from "next/link";
import { calculateRecords, type ScorerRow, type WinsRow, type StreakRow, type ResultRow, type TopGameRow } from "@/lib/records";
import { PlayerAvatar } from "@/components/players/PlayerAvatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { teamName } from "@/lib/teams";

export const dynamic = "force-dynamic";

function Rank({ i }: { i: number }) {
  const medal = i === 0 ? "text-amber" : i === 1 ? "text-ink-muted" : i === 2 ? "text-[#B8862E]" : "text-ink-muted/70";
  return <span className={`w-5 shrink-0 text-center font-display text-sm font-bold ${medal}`}>{i + 1}</span>;
}

function PlayerRow({
  i,
  playerId,
  name,
  photoUrl,
  value,
}: {
  i: number;
  playerId: number;
  name: string;
  photoUrl: string | null;
  value: string;
}) {
  return (
    <Link
      href={`/players/${playerId}`}
      className="flex items-center gap-2.5 border-b border-line py-2 last:border-0"
    >
      <Rank i={i} />
      <PlayerAvatar name={name} photoUrl={photoUrl} size="sm" />
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{name}</span>
      <span className="shrink-0 font-display text-sm font-bold text-ink">{value}</span>
    </Link>
  );
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-line">
      <p className="font-display text-base font-semibold text-ink">{title}</p>
      {subtitle && <p className="mb-1 text-xs text-ink-muted">{subtitle}</p>}
      <div className="mt-2">{children}</div>
    </div>
  );
}

function Empty() {
  return <p className="py-3 text-center text-sm text-ink-muted">No data yet</p>;
}

function ScorerCard({ title, subtitle, rows }: { title: string; subtitle?: string; rows: ScorerRow[] }) {
  return (
    <Card title={title} subtitle={subtitle}>
      {rows.length === 0 ? (
        <Empty />
      ) : (
        rows.map((r, i) => (
          <PlayerRow key={r.playerId} i={i} playerId={r.playerId} name={r.name} photoUrl={r.photoUrl} value={`${r.goals} ⚽`} />
        ))
      )}
    </Card>
  );
}

function WinsCard({ title, subtitle, rows }: { title: string; subtitle?: string; rows: WinsRow[] }) {
  return (
    <Card title={title} subtitle={subtitle}>
      {rows.length === 0 ? (
        <Empty />
      ) : (
        rows.map((r, i) => (
          <PlayerRow key={r.playerId} i={i} playerId={r.playerId} name={r.name} photoUrl={r.photoUrl} value={`${r.wins}W`} />
        ))
      )}
    </Card>
  );
}

function StreakCard({ title, subtitle, rows }: { title: string; subtitle?: string; rows: StreakRow[] }) {
  return (
    <Card title={title} subtitle={subtitle}>
      {rows.length === 0 ? (
        <Empty />
      ) : (
        rows.map((r, i) => (
          <PlayerRow
            key={r.playerId}
            i={i}
            playerId={r.playerId}
            name={r.name}
            photoUrl={r.photoUrl}
            value={`🔻 ${r.streak}${r.playerType === "irregular" ? "m" : "d"}`}
          />
        ))
      )}
    </Card>
  );
}

function ResultsCard({ title, rows }: { title: string; rows: ResultRow[] }) {
  return (
    <Card title={title}>
      {rows.length === 0 ? (
        <Empty />
      ) : (
        rows.map((r, i) => (
          <Link
            key={r.matchId}
            href={`/matches/${r.matchId}`}
            className="flex items-center gap-2.5 border-b border-line py-2 last:border-0"
          >
            <Rank i={i} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">
                {teamName(r.winningTeam)} won by {r.margin}
              </p>
              <p className="text-xs text-ink-muted">{r.matchDate}</p>
            </div>
            <span className="shrink-0 font-display text-sm font-bold text-ink">
              {r.teamAScore}–{r.teamBScore}
            </span>
          </Link>
        ))
      )}
    </Card>
  );
}

function TopGamesCard({ title, rows }: { title: string; rows: TopGameRow[] }) {
  return (
    <Card title={title}>
      {rows.length === 0 ? (
        <Empty />
      ) : (
        rows.map((r, i) => (
          <Link
            key={r.matchId}
            href={`/matches/${r.matchId}`}
            className="flex items-center gap-2.5 border-b border-line py-2 last:border-0"
          >
            <Rank i={i} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">
                {r.teamAScore}–{r.teamBScore}
              </p>
              <p className="text-xs text-ink-muted">{r.matchDate}</p>
            </div>
            <span className="shrink-0 font-display text-sm font-bold text-pitch">{r.totalGoals} ⚽</span>
          </Link>
        ))
      )}
    </Card>
  );
}

export default async function RecordsPage() {
  const r = await calculateRecords();

  const hasAnything =
    r.scorersAllTime.length > 0 || r.biggestResults.length > 0 || r.topScoringGames.length > 0;

  if (!hasAnything) {
    return (
      <div className="space-y-4">
        <h1 className="font-display text-2xl font-semibold text-ink">Records</h1>
        <EmptyState title="No records yet" description="Records appear once matches have been recorded." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-ink">Records</h1>
        <Link href="/rankings" className="text-sm font-semibold text-pitch-dark hover:underline">
          Rankings →
        </Link>
      </div>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold text-ink">⚽ Top scorers</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <ScorerCard title="This month" rows={r.scorersThisMonth} />
          <ScorerCard title="Last month" subtitle={r.lastMonthLabel} rows={r.scorersLastMonth} />
          <ScorerCard title="This year" subtitle={String(r.currentYear)} rows={r.scorersThisYear} />
          <ScorerCard title="All time" rows={r.scorersAllTime} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold text-ink">🏆 Most wins</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <WinsCard title="Last month" subtitle={r.lastMonthLabel} rows={r.winsLastMonth} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold text-ink">🔻 Longest losing streaks</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <StreakCard title="Last month" subtitle={r.lastMonthLabel} rows={r.losingStreakLastMonth} />
          <StreakCard title="All time" rows={r.losingStreakAllTime} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold text-ink">📊 Match records</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <ResultsCard title="Biggest wins & losses" rows={r.biggestResults} />
          <TopGamesCard title="Top-scoring games" rows={r.topScoringGames} />
        </div>
      </section>
    </div>
  );
}
