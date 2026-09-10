import Link from "next/link";
import { searchMatches, type MatchSearchFilters } from "@/lib/matchSearch";
import { getAllPlayers } from "@/lib/players";
import { EmptyState } from "@/components/ui/EmptyState";
import { MatchSearchFilters as MatchSearchFiltersBar } from "./MatchSearchFilters";

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: Promise<{
    date?: string;
    player?: string;
    team?: string;
    result?: string;
    winner?: string;
    score?: string;
  }>;
}) {
  const sp = await searchParams;

  const filters: MatchSearchFilters = {
    date: sp.date || undefined,
    playerId: sp.player ? Number(sp.player) : undefined,
    team: sp.team === "A" || sp.team === "B" ? sp.team : undefined,
    result:
      sp.result === "win" || sp.result === "loss" || sp.result === "draw"
        ? sp.result
        : undefined,
    winner:
      sp.winner === "A" || sp.winner === "B" || sp.winner === "draw"
        ? sp.winner
        : undefined,
    score: sp.score || undefined,
  };

  const [results, allPlayers] = await Promise.all([
    searchMatches(filters),
    getAllPlayers(),
  ]);

  const hasFilters = Object.values(filters).some((v) => v !== undefined);

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-semibold text-ink">Match history</h1>

      <MatchSearchFiltersBar players={allPlayers.map((p) => ({ id: p.id, name: p.name }))} />

      <p className="text-sm text-ink-muted">
        {results.length} match{results.length === 1 ? "" : "es"}
        {hasFilters ? " match your filters" : " total"}
      </p>

      {results.length === 0 ? (
        <EmptyState
          title={hasFilters ? "No matches found" : "No matches yet"}
          description={
            hasFilters
              ? "Try adjusting or clearing your filters."
              : "Check back after the first match is entered."
          }
        />
      ) : (
        <div className="space-y-2">
          {results.map((m) => (
            <Link
              key={m.id}
              href={`/matches/${m.id}`}
              className="flex items-center justify-between rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-line transition hover:shadow-md hover:ring-pitch/30"
            >
              <p className="font-display text-lg font-bold text-ink">
                {m.teamAScore} : {m.teamBScore}
              </p>
              <p className="text-sm text-ink-muted">{m.matchDate}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
