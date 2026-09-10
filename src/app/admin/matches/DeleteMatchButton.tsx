"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteMatchButton({
  matchId,
  matchDate,
}: {
  matchId: number;
  matchDate: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    await fetch(`/api/matches/${matchId}`, { method: "DELETE" });
    setDeleting(false);
    router.refresh();
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-ink-muted">Delete {matchDate}?</span>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="rounded-lg bg-red px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-red/90 disabled:opacity-60"
        >
          {deleting ? "…" : "Confirm"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-ink-muted ring-1 ring-line"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="rounded-lg px-3 py-1.5 text-sm font-medium text-ink-muted ring-1 ring-line transition hover:bg-red-tint hover:text-red"
    >
      Delete
    </button>
  );
}
