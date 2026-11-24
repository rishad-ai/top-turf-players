"use client";

import { useRouter } from "next/navigation";

type Pos = "all" | "GK" | "DEF" | "ATT";

const TABS: { value: Pos; label: string }[] = [
  { value: "all", label: "All" },
  { value: "GK", label: "🧤 GK" },
  { value: "DEF", label: "🛡️ Defence" },
  { value: "ATT", label: "⚡ Attack" },
];

export function ComparePositionTabs({
  a,
  b,
  pos,
}: {
  a: number | null;
  b: number | null;
  pos: Pos;
}) {
  const router = useRouter();

  function go(nextPos: Pos) {
    const params = new URLSearchParams();
    if (a) params.set("a", String(a));
    if (b) params.set("b", String(b));
    if (nextPos !== "all") params.set("pos", nextPos);
    router.push(`/compare${params.toString() ? `?${params.toString()}` : ""}`);
  }

  return (
    <div className="flex gap-1 overflow-x-auto rounded-xl bg-bg p-1 ring-1 ring-line">
      {TABS.map((t) => (
        <button
          key={t.value}
          type="button"
          onClick={() => go(t.value)}
          className={`flex-1 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
            pos === t.value ? "bg-pitch text-white" : "text-ink-muted hover:text-ink"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
