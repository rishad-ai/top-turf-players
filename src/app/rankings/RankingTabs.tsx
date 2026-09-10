"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import type { LeaderboardMetric } from "@/lib/stats";

const TABS: { value: LeaderboardMetric; label: string }[] = [
  { value: "wins", label: "Wins" },
  { value: "goals", label: "Goals" },
  { value: "winPercentage", label: "Win %" },
  { value: "winningStreak", label: "Win streak" },
  { value: "losingStreak", label: "Losing streak" },
];

export function RankingTabs({ active }: { active: LeaderboardMetric }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function selectTab(metric: LeaderboardMetric) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("metric", metric);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1">
      {TABS.map((tab) => (
        <button
          key={tab.value}
          type="button"
          onClick={() => selectTab(tab.value)}
          className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
            active === tab.value
              ? "bg-pitch text-white"
              : "bg-surface text-ink-muted ring-1 ring-line hover:text-ink"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
