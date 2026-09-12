import Link from "next/link";
import type { YearlyExtreme } from "@/lib/dashboard";
import { teamName } from "@/lib/teams";

export function BiggestResultCard({ result, year }: { result: YearlyExtreme | null; year: number }) {
  if (!result) return null;

  const winnerLabel = teamName(result.winningTeam);
  const loserLabel = teamName(result.winningTeam === "A" ? "B" : "A");

  return (
    <section>
      <p className="mb-2 font-display text-base font-semibold text-ink">🏆 Biggest result of {year}</p>
      <Link
        href={`/matches/${result.matchId}`}
        className="block rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-line transition hover:shadow-md hover:ring-pitch/30"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-pitch-dark">Biggest win — {winnerLabel}</p>
            <p className="text-xs text-ink-muted">Won by {result.margin} goal{result.margin === 1 ? "" : "s"}</p>
          </div>
          <p className="font-display text-2xl font-bold text-ink">
            {result.teamAScore} : {result.teamBScore}
          </p>
        </div>
        <div className="mt-2 border-t border-line pt-2">
          <p className="text-sm font-semibold text-red">Biggest loss — {loserLabel}</p>
          <p className="text-xs text-ink-muted">{result.matchDate}</p>
        </div>
      </Link>
    </section>
  );
}
