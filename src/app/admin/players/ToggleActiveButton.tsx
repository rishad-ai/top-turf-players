"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ToggleActiveButton({
  playerId,
  isActive,
}: {
  playerId: number;
  isActive: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleToggle() {
    setLoading(true);
    await fetch(`/api/players/${playerId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`rounded-lg px-3 py-1.5 text-sm font-medium ring-1 transition disabled:opacity-60 ${
        isActive
          ? "text-ink-muted ring-line hover:bg-red-tint hover:text-red"
          : "text-pitch-dark ring-line hover:bg-pitch-tint"
      }`}
    >
      {isActive ? "Deactivate" : "Activate"}
    </button>
  );
}
