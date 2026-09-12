"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { TEAM_A_NAME, TEAM_B_NAME } from "@/lib/teams";

export type MatchFilterPlayer = { id: number; name: string };

export function MatchSearchFilters({ players }: { players: MatchFilterPlayer[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [expanded, setExpanded] = useState(false);

  const date = searchParams.get("date") || "";
  const playerId = searchParams.get("player") || "";
  const team = searchParams.get("team") || "";
  const result = searchParams.get("result") || "";
  const winner = searchParams.get("winner") || "";
  const score = searchParams.get("score") || "";

  const activeCount = [date, playerId, team, result, winner, score].filter(Boolean).length;

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);

    // team/result only make sense with a player selected
    if (key === "player" && !value) {
      params.delete("team");
      params.delete("result");
    }

    router.push(`${pathname}?${params.toString()}`);
  }

  function clearAll() {
    router.push(pathname);
  }

  return (
    <div className="rounded-2xl bg-surface p-3 shadow-sm ring-1 ring-line">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between text-sm font-medium text-ink"
      >
        <span>
          Search &amp; filter
          {activeCount > 0 && (
            <span className="ml-2 rounded-full bg-pitch-tint px-2 py-0.5 text-xs font-semibold text-pitch-dark">
              {activeCount} active
            </span>
          )}
        </span>
        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {expanded && (
        <div className="mt-3 space-y-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-muted">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => update("date", e.target.value)}
                className="w-full rounded-lg border border-line bg-bg px-2 py-1.5 text-sm text-ink outline-none focus:border-pitch focus:ring-1 focus:ring-pitch"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-ink-muted">Player</label>
              <select
                value={playerId}
                onChange={(e) => update("player", e.target.value)}
                className="w-full rounded-lg border border-line bg-bg px-2 py-1.5 text-sm text-ink outline-none focus:border-pitch focus:ring-1 focus:ring-pitch"
              >
                <option value="">Any player</option>
                {players.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-ink-muted">Score (e.g. 3-1)</label>
              <input
                type="text"
                placeholder="3-1"
                value={score}
                onChange={(e) => update("score", e.target.value)}
                className="w-full rounded-lg border border-line bg-bg px-2 py-1.5 text-sm text-ink outline-none focus:border-pitch focus:ring-1 focus:ring-pitch"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-ink-muted">Winner</label>
              <select
                value={winner}
                onChange={(e) => update("winner", e.target.value)}
                className="w-full rounded-lg border border-line bg-bg px-2 py-1.5 text-sm text-ink outline-none focus:border-pitch focus:ring-1 focus:ring-pitch"
              >
                <option value="">Any</option>
                <option value="A">{TEAM_A_NAME}</option>
                <option value="B">{TEAM_B_NAME}</option>
                <option value="draw">Draw</option>
              </select>
            </div>

            {playerId && (
              <>
                <div>
                  <label className="mb-1 block text-xs font-medium text-ink-muted">Their team</label>
                  <select
                    value={team}
                    onChange={(e) => update("team", e.target.value)}
                    className="w-full rounded-lg border border-line bg-bg px-2 py-1.5 text-sm text-ink outline-none focus:border-pitch focus:ring-1 focus:ring-pitch"
                  >
                    <option value="">Any</option>
                    <option value="A">{TEAM_A_NAME}</option>
                    <option value="B">{TEAM_B_NAME}</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-ink-muted">Their result</label>
                  <select
                    value={result}
                    onChange={(e) => update("result", e.target.value)}
                    className="w-full rounded-lg border border-line bg-bg px-2 py-1.5 text-sm text-ink outline-none focus:border-pitch focus:ring-1 focus:ring-pitch"
                  >
                    <option value="">Any</option>
                    <option value="win">Win</option>
                    <option value="loss">Loss</option>
                    <option value="draw">Draw</option>
                  </select>
                </div>
              </>
            )}
          </div>

          {activeCount > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="flex items-center gap-1 text-sm font-medium text-ink-muted hover:text-red"
            >
              <X size={14} /> Clear all filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
