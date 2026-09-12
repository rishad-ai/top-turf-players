"use client";

import { Trash2, Plus } from "lucide-react";

export type GoalEntry = {
  key: string;
  playerId: number | null;
  minute: number | null;
  isOwnGoal?: boolean;
};

export type EligibleScorer = {
  playerId: number;
  name: string;
  team: "A" | "B";
};

export function GoalEntryList({
  team,
  teamLabel,
  eligibleScorers,
  opposingScorers,
  entries,
  onChange,
  expectedCount,
}: {
  team: "A" | "B";
  teamLabel: string;
  eligibleScorers: EligibleScorer[];
  opposingScorers: EligibleScorer[];
  entries: GoalEntry[];
  onChange: (entries: GoalEntry[]) => void;
  expectedCount: number;
}) {
  function addEntry() {
    onChange([
      ...entries,
      { key: crypto.randomUUID(), playerId: null, minute: null, isOwnGoal: false },
    ]);
  }

  function removeEntry(key: string) {
    onChange(entries.filter((e) => e.key !== key));
  }

  function updateEntry(key: string, patch: Partial<GoalEntry>) {
    onChange(entries.map((e) => (e.key === key ? { ...e, ...patch } : e)));
  }

  const countMismatch = entries.length !== expectedCount;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-medium text-ink">{teamLabel} scorers</p>
        <p className={`text-xs font-medium ${countMismatch ? "text-red" : "text-pitch-dark"}`}>
          {entries.length}/{expectedCount} goals entered
        </p>
      </div>

      <div className="space-y-2">
        {entries.map((entry) => {
          const options = entry.isOwnGoal ? opposingScorers : eligibleScorers;
          return (
            <div key={entry.key} className="rounded-lg border border-line bg-bg p-2">
              <div className="flex items-center gap-2">
                <select
                  value={entry.playerId ?? ""}
                  onChange={(e) =>
                    updateEntry(entry.key, { playerId: Number(e.target.value) || null })
                  }
                  className="flex-1 rounded-lg border border-line bg-surface px-2 py-1.5 text-sm text-ink outline-none focus:border-pitch focus:ring-1 focus:ring-pitch"
                >
                  <option value="">
                    {entry.isOwnGoal ? "Select opposing player\u2026" : "Select scorer\u2026"}
                  </option>
                  {options.map((s) => (
                    <option key={s.playerId} value={s.playerId}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  placeholder="Min"
                  min={0}
                  max={120}
                  value={entry.minute ?? ""}
                  onChange={(e) =>
                    updateEntry(entry.key, {
                      minute: e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                  className="w-16 rounded-lg border border-line bg-surface px-2 py-1.5 text-sm text-ink outline-none focus:border-pitch focus:ring-1 focus:ring-pitch"
                />
                <button
                  type="button"
                  onClick={() => removeEntry(entry.key)}
                  className="shrink-0 rounded-lg p-1.5 text-ink-muted transition hover:bg-red-tint hover:text-red"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <label className="mt-1.5 flex items-center gap-1.5 text-xs text-ink-muted">
                <input
                  type="checkbox"
                  checked={entry.isOwnGoal ?? false}
                  onChange={(e) =>
                    updateEntry(entry.key, { isOwnGoal: e.target.checked, playerId: null })
                  }
                />
                Own goal (scored by an opposing player)
              </label>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={addEntry}
        className="mt-2 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-pitch-dark ring-1 ring-line transition hover:bg-pitch-tint"
      >
        <Plus size={15} /> Add {teamLabel} goal
      </button>
    </div>
  );
}
