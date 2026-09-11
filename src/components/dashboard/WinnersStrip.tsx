import { PlayerAvatar } from "@/components/players/PlayerAvatar";

export function WinnersStrip({
  winners,
  isDraw,
}: {
  winners: { playerId: number; name: string; photoUrl: string | null }[];
  isDraw: boolean;
}) {
  if (isDraw) {
    return (
      <div className="rounded-2xl bg-surface p-4 text-center shadow-sm ring-1 ring-line">
        <p className="text-sm font-medium text-ink-muted">It ended level — no winner today.</p>
      </div>
    );
  }
  if (winners.length === 0) return null;

  return (
    <div className="rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-line">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
        🏆 Today&apos;s winners
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {winners.map((w) => (
          <div key={w.playerId} className="flex items-center gap-1.5">
            <PlayerAvatar name={w.name} photoUrl={w.photoUrl} size="sm" />
            <span className="text-sm font-medium text-ink">{w.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
