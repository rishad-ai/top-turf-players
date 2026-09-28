"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Injury } from "@/lib/injuries";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function InjuryManager({ playerId, injuries }: { playerId: number; injuries: Injury[] }) {
  const router = useRouter();
  const [startDate, setStartDate] = useState(todayISO());
  const [endDate, setEndDate] = useState(""); // optional recovery date when adding
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recoverDate, setRecoverDate] = useState(todayISO()); // date used when ending an ongoing injury

  const activeInjury = injuries.find((i) => i.endDate === null);

  async function add() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/players/${playerId}/injuries`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startDate, endDate: endDate || undefined, note: note.trim() || undefined }),
    });
    setBusy(false);
    if (!res.ok) {
      setError((await res.json().catch(() => null))?.error ?? "Couldn't add injury.");
      return;
    }
    setNote("");
    setEndDate("");
    router.refresh();
  }

  async function endOn(injuryId: number, date: string) {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/injuries/${injuryId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endDate: date }),
    });
    setBusy(false);
    if (!res.ok) setError((await res.json().catch(() => null))?.error ?? "Couldn't update injury.");
    else router.refresh();
  }

  async function remove(injuryId: number) {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/injuries/${injuryId}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) setError("Couldn't delete injury.");
    else router.refresh();
  }

  return (
    <div className="space-y-3 rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-line">
      <div>
        <p className="font-display text-base font-semibold text-ink">🚑 Injuries</p>
        <p className="text-xs text-ink-muted">
          Injury days are excluded from the player&apos;s losing streak. Leave an injury open while the
          player is still out; mark recovered when they return.
        </p>
      </div>

      {injuries.length > 0 && (
        <ul className="space-y-1.5">
          {injuries.map((inj) => {
            const ongoing = inj.endDate === null;
            return (
              <li key={inj.id} className="flex items-center gap-2 border-b border-line py-1.5 text-sm last:border-0">
                <span className="min-w-0 flex-1 truncate text-ink">
                  {inj.startDate} → {ongoing ? <span className="font-semibold text-red">ongoing</span> : inj.endDate}
                  {inj.note ? <span className="text-ink-muted"> · {inj.note}</span> : null}
                </span>
                {ongoing && (
                  <div className="flex shrink-0 items-center gap-1.5">
                    <input
                      type="date"
                      value={recoverDate}
                      max={todayISO()}
                      min={inj.startDate}
                      onChange={(e) => setRecoverDate(e.target.value)}
                      className="rounded-md border border-line bg-bg px-2 py-1 text-xs text-ink"
                    />
                    <button
                      type="button"
                      onClick={() => endOn(inj.id, recoverDate)}
                      disabled={busy}
                      className="rounded-md bg-pitch-tint px-2.5 py-1 text-xs font-semibold text-pitch-dark transition hover:bg-pitch hover:text-white disabled:opacity-50"
                    >
                      End
                    </button>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => remove(inj.id)}
                  disabled={busy}
                  className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-ink-muted ring-1 ring-line transition hover:bg-red-tint hover:text-red disabled:opacity-50"
                >
                  Delete
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {!activeInjury && (
        <div className="space-y-2 border-t border-line pt-3">
          <p className="text-sm font-semibold text-ink">Mark injured</p>
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex flex-col">
              <span className="mb-1 text-xs text-ink-muted">Injured since</span>
              <input
                type="date"
                value={startDate}
                max={todayISO()}
                onChange={(e) => setStartDate(e.target.value)}
                className="rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink"
              />
            </label>
            <label className="flex flex-col">
              <span className="mb-1 text-xs text-ink-muted">Recovered on (optional)</span>
              <input
                type="date"
                value={endDate}
                min={startDate}
                max={todayISO()}
                onChange={(e) => setEndDate(e.target.value)}
                className="rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink"
              />
            </label>
            <label className="flex flex-1 flex-col">
              <span className="mb-1 text-xs text-ink-muted">Note (optional)</span>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. ankle sprain"
                className="rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink"
              />
            </label>
            <button
              type="button"
              onClick={add}
              disabled={busy}
              className="rounded-lg bg-red px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
            >
              Mark injured
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red">{error}</p>}
    </div>
  );
}
