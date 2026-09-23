"use client";

import { useRouter } from "next/navigation";
import { ArrowLeftRight } from "lucide-react";

type Option = { id: number; name: string };

export function CompareSelectors({
  players,
  a,
  b,
}: {
  players: Option[];
  a: number | null;
  b: number | null;
}) {
  const router = useRouter();

  function go(nextA: number | null, nextB: number | null) {
    const params = new URLSearchParams();
    if (nextA) params.set("a", String(nextA));
    if (nextB) params.set("b", String(nextB));
    router.push(`/compare${params.toString() ? `?${params.toString()}` : ""}`);
  }

  return (
    <div className="flex items-end gap-2 rounded-2xl bg-surface p-3 shadow-sm ring-1 ring-line">
      <label className="flex-1">
        <span className="mb-1 block text-xs font-semibold text-ink-muted">Player 1</span>
        <select
          value={a ?? ""}
          onChange={(e) => go(e.target.value ? Number(e.target.value) : null, b)}
          className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm font-medium text-ink"
        >
          <option value="">Select…</option>
          {players.map((p) => (
            <option key={p.id} value={p.id} disabled={p.id === b}>
              {p.name}
            </option>
          ))}
        </select>
      </label>

      <button
        type="button"
        onClick={() => go(b, a)}
        disabled={!a || !b}
        title="Swap"
        className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-pitch-tint text-pitch-dark transition hover:bg-pitch hover:text-white disabled:opacity-40"
      >
        <ArrowLeftRight size={16} />
      </button>

      <label className="flex-1">
        <span className="mb-1 block text-xs font-semibold text-ink-muted">Player 2</span>
        <select
          value={b ?? ""}
          onChange={(e) => go(a, e.target.value ? Number(e.target.value) : null)}
          className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm font-medium text-ink"
        >
          <option value="">Select…</option>
          {players.map((p) => (
            <option key={p.id} value={p.id} disabled={p.id === a}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
