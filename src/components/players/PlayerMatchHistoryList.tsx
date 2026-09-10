"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ResultBadge } from "./ResultBadge";
import type { PlayerMatchHistoryEntry } from "@/lib/stats";

const PAGE_SIZE = 10;

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs font-medium transition ${
        active ? "bg-pitch text-white" : "bg-bg text-ink-muted ring-1 ring-line hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

export function PlayerMatchHistoryList({ history }: { history: PlayerMatchHistoryEntry[] }) {
  const [filter, setFilter] = useState<"all" | "win" | "loss" | "draw">("all");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const filtered = useMemo(() => {
    if (filter === "all") return history;
    return history.filter((h) => h.result === filter);
  }, [history, filter]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = filtered.length > visibleCount;

  function handleFilterChange(next: typeof filter) {
    setFilter(next);
    setVisibleCount(PAGE_SIZE);
  }

  const counts = useMemo(
    () => ({
      all: history.length,
      win: history.filter((h) => h.result === "win").length,
      loss: history.filter((h) => h.result === "loss").length,
      draw: history.filter((h) => h.result === "draw").length,
    }),
    [history]
  );

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="font-display text-base font-semibold text-ink">Match history</p>
        <div className="flex gap-1.5">
          <FilterPill active={filter === "all"} onClick={() => handleFilterChange("all")}>
            All ({counts.all})
          </FilterPill>
          <FilterPill active={filter === "win"} onClick={() => handleFilterChange("win")}>
            Wins ({counts.win})
          </FilterPill>
          <FilterPill active={filter === "loss"} onClick={() => handleFilterChange("loss")}>
            Losses ({counts.loss})
          </FilterPill>
          <FilterPill active={filter === "draw"} onClick={() => handleFilterChange("draw")}>
            Draws ({counts.draw})
          </FilterPill>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="py-6 text-center text-sm text-ink-muted">No matches in this filter.</p>
      ) : (
        <>
          <ul className="divide-y divide-line">
            {visible.map((h) => (
              <li key={h.matchId} className="flex items-center justify-between py-2.5">
                <Link href={`/matches/${h.matchId}`} className="flex items-center gap-3">
                  <ResultBadge result={h.result} />
                  <div>
                    <p className="text-sm font-medium text-ink">
                      {h.teamAScore} : {h.teamBScore}
                      {!h.played && <span className="ml-2 text-xs text-ink-muted">(did not play)</span>}
                    </p>
                    <p className="text-xs text-ink-muted">{h.matchDate}</p>
                  </div>
                </Link>
                {h.goalsScored > 0 && (
                  <span className="text-xs font-medium text-ink-muted">⚽ {h.goalsScored}</span>
                )}
              </li>
            ))}
          </ul>

          {hasMore && (
            <button
              type="button"
              onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
              className="mt-3 w-full rounded-lg py-2 text-sm font-medium text-pitch-dark ring-1 ring-line transition hover:bg-pitch-tint"
            >
              Show more ({filtered.length - visibleCount} remaining)
            </button>
          )}
        </>
      )}
    </div>
  );
}
