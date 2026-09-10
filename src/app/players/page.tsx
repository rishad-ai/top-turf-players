import { getAllPlayers } from "@/lib/players";
import { PlayerCard } from "@/components/players/PlayerCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { PlayersFilterBar } from "./PlayersFilterBar";
import { PlayerNameSearch } from "./PlayerNameSearch";

export default async function PlayersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; type?: string; q?: string }>;
}) {
  const { status = "active", type = "all", q = "" } = await searchParams;
  const all = await getAllPlayers();

  const filtered = all.filter((p) => {
    const statusOk =
      status === "all" ? true : status === "active" ? p.isActive : !p.isActive;
    const typeOk = type === "all" ? true : p.playerType === type;
    const nameOk = q.trim() ? p.name.toLowerCase().includes(q.trim().toLowerCase()) : true;
    return statusOk && typeOk && nameOk;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-ink">Players</h1>
        <p className="text-sm text-ink-muted">{filtered.length} shown</p>
      </div>

      <PlayerNameSearch initialQuery={q} />
      <PlayersFilterBar status={status} type={type} />

      {filtered.length === 0 ? (
        <EmptyState
          title={all.length === 0 ? "No players yet" : "No players match these filters"}
          description={
            all.length === 0
              ? "Add your first player from the admin panel to get started."
              : "Try switching the status or type filter above."
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <PlayerCard
              key={p.id}
              player={{
                id: p.id,
                name: p.name,
                photoUrl: p.photoUrl,
                playerType: p.playerType as "regular" | "irregular",
                isActive: p.isActive,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
