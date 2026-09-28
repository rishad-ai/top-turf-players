"use client";

import { useState } from "react";
import Link from "next/link";
import { teamName } from "@/lib/teams";
import type { ResultRow, TopGameRow } from "@/lib/records";

type Range = "allTime" | "thisYear";

function Rank({ i }: { i: number }) {
  const medal = i === 0 ? "text-amber" : i === 1 ? "text-ink-muted" : i === 2 ? "text-[#B8862E]" : "text-ink-muted/70";
  return <span className={`w-5 shrink-0 text-center font-display text-sm font-bold ${medal}`}>{i + 1}</span>;
}

function Empty() {
  return <p className="py-3 text-center text-sm text-ink-muted">No data yet</p>;
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-line">
      <p className="font-display text-base font-semibold text-ink">{title}</p>
      <div className="mt-2">{children}</div>
    </div>
  );
}

export function MatchRecordsSection({
  currentYear,
  biggestResultsAllTime,
  biggestResultsThisYear,
  topScoringGamesAllTime,
  topScoringGamesThisYear,
}: {
  currentYear: number;
  biggestResultsAllTime: ResultRow[];
  biggestResultsThisYear: ResultRow[];
  topScoringGamesAllTime: TopGameRow[];
  topScoringGamesThisYear: TopGameRow[];
}) {
  const [range, setRange] = useState<Range>("allTime");

  const results = range === "allTime" ? biggestResultsAllTime : biggestResultsThisYear;
  const games = range === "allTime" ? topScoringGamesAllTime : topScoringGamesThisYear;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold text-ink">📊 Match records</h2>
        <div className="flex rounded-lg bg-bg p-0.5 ring-1 ring-line">
          <button
            type="button"
            onClick={() => setRange("allTime")}
            className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
              range === "allTime" ? "bg-pitch text-white" : "text-ink-muted"
            }`}
          >
            All time
          </button>
          <button
            type="button"
            onClick={() => setRange("thisYear")}
            className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
              range === "thisYear" ? "bg-pitch text-white" : "text-ink-muted"
            }`}
          >
            {currentYear}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Card title="Biggest wins (by margin)">
          {results.length === 0 ? (
            <Empty />
          ) : (
            results.map((r, i) => (
              <Link
                key={r.matchId}
                href={`/matches/${r.matchId}`}
                className="flex items-center gap-2.5 border-b border-line py-2 last:border-0"
              >
                <Rank i={i} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">
                    {teamName(r.winningTeam)} won by {r.margin}
                  </p>
                  <p className="text-xs text-ink-muted">{r.matchDate}</p>
                </div>
                <span className="shrink-0 font-display text-sm font-bold text-ink">
                  {r.teamAScore}–{r.teamBScore}
                </span>
              </Link>
            ))
          )}
        </Card>

        <Card title="Top-scoring games">
          {games.length === 0 ? (
            <Empty />
          ) : (
            games.map((g, i) => (
              <Link
                key={g.matchId}
                href={`/matches/${g.matchId}`}
                className="flex items-center gap-2.5 border-b border-line py-2 last:border-0"
              >
                <Rank i={i} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">
                    {g.teamAScore}–{g.teamBScore}
                  </p>
                  <p className="text-xs text-ink-muted">{g.matchDate}</p>
                </div>
                <span className="shrink-0 font-display text-sm font-bold text-pitch">{g.totalGoals} ⚽</span>
              </Link>
            ))
          )}
        </Card>
      </div>
    </section>
  );
}
