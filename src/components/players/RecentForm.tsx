import { ResultBadge } from "./ResultBadge";
import type { PlayerMatchHistoryEntry } from "@/lib/stats";

export function RecentForm({ history, count = 5 }: { history: PlayerMatchHistoryEntry[]; count?: number }) {
  const played = history.filter((h) => h.played);
  if (played.length === 0) return null;

  const recent = played.slice(0, count).reverse(); // oldest-of-the-recent-set first, most recent last (reads left-to-right like a timeline)

  return (
    <div className="flex items-center gap-3">
      <p className="text-xs font-medium text-ink-muted">Recent form</p>
      <div className="flex items-center gap-1">
        {recent.map((h) => (
          <ResultBadge key={h.matchId} result={h.result} size="sm" />
        ))}
      </div>
    </div>
  );
}
