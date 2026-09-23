import { getAllPlayers } from "@/lib/players";
import { comparePlayers, type Comparison } from "@/lib/compare";
import { PlayerAvatar } from "@/components/players/PlayerAvatar";
import { ResultBadge } from "@/components/players/ResultBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { CompareSelectors } from "./CompareSelectors";

export const dynamic = "force-dynamic";

function parseId(v: string | undefined): number | null {
  if (!v) return null;
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
}

// One comparison row: A value on the left, label in the middle, B value on the right.
// The stronger side is tinted green; ties are neutral.
function CompareRow({
  label,
  aValue,
  bValue,
  aDisplay,
  bDisplay,
  higherIsBetter = true,
}: {
  label: string;
  aValue: number;
  bValue: number;
  aDisplay?: string;
  bDisplay?: string;
  higherIsBetter?: boolean;
}) {
  let aWins = false;
  let bWins = false;
  if (aValue !== bValue) {
    const aBetter = higherIsBetter ? aValue > bValue : aValue < bValue;
    aWins = aBetter;
    bWins = !aBetter;
  }
  const cell = (win: boolean) =>
    `font-display text-lg font-bold ${win ? "text-pitch" : "text-ink"}`;

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 border-b border-line py-2.5 last:border-0">
      <div className="text-left">
        <span className={cell(aWins)}>{aDisplay ?? aValue}</span>
      </div>
      <div className="px-2 text-center text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
        {label}
      </div>
      <div className="text-right">
        <span className={cell(bWins)}>{bDisplay ?? bValue}</span>
      </div>
    </div>
  );
}

function PlayerHead({
  name,
  photoUrl,
  playerType,
}: {
  name: string;
  photoUrl: string | null;
  playerType: "regular" | "irregular";
}) {
  return (
    <div className="flex flex-1 flex-col items-center gap-2 text-center">
      <PlayerAvatar name={name} photoUrl={photoUrl} size="lg" />
      <div>
        <p className="font-display text-base font-semibold leading-tight text-ink">{name}</p>
        <p className="text-[11px] capitalize text-ink-muted">{playerType}</p>
      </div>
    </div>
  );
}

function FormStrip({ form }: { form: ("win" | "loss" | "draw")[] }) {
  if (form.length === 0) return <span className="text-xs text-ink-muted">—</span>;
  return (
    <div className="flex gap-1">
      {form.map((r, i) => (
        <ResultBadge key={i} result={r} size="sm" />
      ))}
    </div>
  );
}

function HeadToHeadCard({ c }: { c: Comparison }) {
  const { a, b, headToHead: h } = c;
  if (h.meetings === 0) {
    return (
      <div className="rounded-2xl bg-navy p-4 text-center text-white shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-white/60">Head to head</p>
        <p className="mt-2 text-sm text-white/80">
          {a.name} and {b.name} haven&apos;t played on opposite teams yet.
        </p>
      </div>
    );
  }
  return (
    <div className="rounded-2xl bg-navy p-4 text-white shadow-sm">
      <p className="text-center text-xs font-semibold uppercase tracking-wide text-white/60">
        Head to head · {h.meetings} match{h.meetings === 1 ? "" : "es"} on opposite teams
      </p>
      <div className="mt-3 flex items-center justify-center gap-4">
        <span className={`font-display text-4xl font-bold ${h.aWins > h.bWins ? "text-pitch" : "text-white"}`}>
          {h.aWins}
        </span>
        <span className="font-display text-sm font-semibold text-white/50">
          {h.draws} draw{h.draws === 1 ? "" : "s"}
        </span>
        <span className={`font-display text-4xl font-bold ${h.bWins > h.aWins ? "text-amber" : "text-white"}`}>
          {h.bWins}
        </span>
      </div>
      <div className="mt-1 flex items-center justify-between text-[11px] text-white/60">
        <span>{a.name} wins</span>
        <span>{b.name} wins</span>
      </div>
      <div className="mt-3 border-t border-white/15 pt-2 text-center text-xs text-white/70">
        Goals in these matches — {a.name}: <b className="text-white">{h.aGoals}</b> · {b.name}:{" "}
        <b className="text-white">{h.bGoals}</b>
      </div>
    </div>
  );
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string }>;
}) {
  const { a: aRaw, b: bRaw } = await searchParams;
  const aId = parseId(aRaw);
  const bId = parseId(bRaw);

  const players = await getAllPlayers();
  const options = players.map((p) => ({ id: p.id, name: p.name }));

  const comparison = aId && bId ? await comparePlayers(aId, bId) : null;

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-semibold text-ink">Compare players</h1>

      <CompareSelectors players={options} a={aId} b={bId} />

      {!comparison ? (
        <EmptyState
          title={aId && bId ? "Pick two different players" : "Pick two players to compare"}
          description="Choose a player on each side to see their stats side by side and their head-to-head record."
        />
      ) : (
        <>
          <div className="flex items-start gap-2 rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-line">
            <PlayerHead
              name={comparison.a.name}
              photoUrl={comparison.a.photoUrl}
              playerType={comparison.a.playerType}
            />
            <span className="mt-6 font-display text-sm font-bold text-ink-muted">VS</span>
            <PlayerHead
              name={comparison.b.name}
              photoUrl={comparison.b.photoUrl}
              playerType={comparison.b.playerType}
            />
          </div>

          <HeadToHeadCard c={comparison} />

          <div className="rounded-2xl bg-surface px-4 py-2 shadow-sm ring-1 ring-line">
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 border-b border-line py-2.5">
              <div className="text-left"><FormStrip form={comparison.a.recentForm} /></div>
              <div className="px-2 text-center text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                Recent form
              </div>
              <div className="flex justify-end"><FormStrip form={comparison.b.recentForm} /></div>
            </div>

            <CompareRow label="Played" aValue={comparison.a.stats.matchesPlayed} bValue={comparison.b.stats.matchesPlayed} />
            <CompareRow label="Wins" aValue={comparison.a.stats.wins} bValue={comparison.b.stats.wins} />
            <CompareRow label="Draws" aValue={comparison.a.stats.draws} bValue={comparison.b.stats.draws} higherIsBetter={false} />
            <CompareRow label="Losses" aValue={comparison.a.stats.losses} bValue={comparison.b.stats.losses} higherIsBetter={false} />
            <CompareRow label="Goals" aValue={comparison.a.stats.goals} bValue={comparison.b.stats.goals} />
            <CompareRow
              label="Win %"
              aValue={comparison.a.stats.winPercentage}
              bValue={comparison.b.stats.winPercentage}
              aDisplay={`${comparison.a.stats.winPercentage}%`}
              bDisplay={`${comparison.b.stats.winPercentage}%`}
            />
            <CompareRow label="Current win streak" aValue={comparison.a.streaks.winningStreak} bValue={comparison.b.streaks.winningStreak} />
            <CompareRow label="Longest win streak" aValue={comparison.a.streaks.longestWinningStreak} bValue={comparison.b.streaks.longestWinningStreak} />
            <CompareRow label="Current unbeaten" aValue={comparison.a.streaks.undefeatedStreak} bValue={comparison.b.streaks.undefeatedStreak} />
            <CompareRow label="Longest unbeaten" aValue={comparison.a.streaks.longestUndefeatedStreak} bValue={comparison.b.streaks.longestUndefeatedStreak} />
            <CompareRow label="Current losing streak" aValue={comparison.a.streaks.losingStreak} bValue={comparison.b.streaks.losingStreak} higherIsBetter={false} />
            <CompareRow label="Longest losing streak" aValue={comparison.a.streaks.longestLosingStreak} bValue={comparison.b.streaks.longestLosingStreak} higherIsBetter={false} />
          </div>
        </>
      )}
    </div>
  );
}
