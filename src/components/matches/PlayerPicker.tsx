"use client";

import { useMemo, useState } from "react";
import { PlayerAvatar } from "@/components/players/PlayerAvatar";

export type PickablePlayer = {
  id: number;
  name: string;
  photoUrl: string | null;
};

export function PlayerPicker({
  label,
  players,
  selectedIds,
  onToggle,
  disabledIds = [],
  maxCount,
  accentClass = "border-pitch bg-pitch-tint",
}: {
  label: string;
  players: PickablePlayer[];
  selectedIds: number[];
  onToggle: (id: number) => void;
  disabledIds?: number[];
  maxCount?: number;
  accentClass?: string;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return players;
    return players.filter((p) => p.name.toLowerCase().includes(q));
  }, [players, query]);

  const atMax = maxCount !== undefined && selectedIds.length >= maxCount;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-medium text-ink">{label}</p>
        {maxCount !== undefined && (
          <p
            className={`text-xs font-medium ${
              selectedIds.length === maxCount ? "text-pitch-dark" : "text-ink-muted"
            }`}
          >
            {selectedIds.length}/{maxCount} selected
          </p>
        )}
      </div>

      <input
        type="text"
        placeholder="Search players…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="mb-2 w-full rounded-lg border border-line bg-bg px-3 py-1.5 text-sm text-ink outline-none focus:border-pitch focus:ring-1 focus:ring-pitch"
      />

      <div className="flex max-h-64 flex-wrap gap-2 overflow-y-auto rounded-lg border border-line p-2">
        {filtered.length === 0 && (
          <p className="p-2 text-sm text-ink-muted">No players match.</p>
        )}
        {filtered.map((p) => {
          const selected = selectedIds.includes(p.id);
          const disabled = disabledIds.includes(p.id) || (!selected && atMax);
          return (
            <button
              type="button"
              key={p.id}
              disabled={disabled}
              onClick={() => onToggle(p.id)}
              className={`flex items-center gap-2 rounded-full border px-2 py-1 pr-3 text-sm transition ${
                selected
                  ? accentClass + " text-ink"
                  : disabled
                    ? "cursor-not-allowed border-line bg-bg text-ink-muted/50"
                    : "border-line bg-bg text-ink hover:border-pitch/50"
              }`}
            >
              <PlayerAvatar name={p.name} photoUrl={p.photoUrl} size="sm" />
              {p.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
