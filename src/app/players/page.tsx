import Link from "next/link";
import { ArrowLeftRight } from "lucide-react";
import { getAllPlayers } from "@/lib/players";
import { getInjuryRangesByPlayer, injuryDurationDays } from "@/lib/injuries";
import { PlayerCard } from "@/components/players/PlayerCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { PlayersFilterBar } from "./PlayersFilterBar";
import { PlayerNameSearch } from "./PlayerNameSearch";

export const dynamic = "force-dynamic";

export default async function PlayersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; type?: string; q?: string }>;
}) {
  const { status = "active", type = "all", q = "" } = await searchParams;
  const [all, injuryRanges] = await Promise.all([getAllPlayers(), getInjuryRangesByPlayer()]);

  const today = new Date().toISOString().slice(0, 10);
  // Who is injured right now, and for how long.
  const injuryInfo = new Map<number, { injured: boolean; days: number }>();
  for (const [pid, ranges] of injuryRanges) {
    const active = ranges.find((r) => r.start <= today && (r.end === null || r.end >= today));
    if (active) injuryInfo.set(pid, { injured: true, days: injuryDurationDays(active.start, active.end, today) });
  }

  const filtered = all.filter((p) => {
    const injured = injuryInfo.get(p.id)?.injured ?? false;
    const statusOk =
      status === "all"
        ? true
        : status === "active"
          ? p.isActive
          : status === "injured"
            ? injured
            : !p.isActive;
    const typeOk = type === "all" ? true : p.playerType === type;
    const nameOk = q.trim() ? p.name.toLowerCase().includes(q.trim().toLowerCase()) : true;
    return statusOk && typeOk && nameOk;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-ink">Players</h1>
        <div className="flex items-center gap-3">
          <p className="text-sm text-ink-muted">{filtered.length} shown</p>
          <Link
            href="/compare"
            className="inline-flex items-center gap-1.5 rounded-lg bg-pitch-tint px-3 py-1.5 text-sm font-semibold text-pitch-dark transition hover:bg-pitch hover:text-white"
          >
            <ArrowLeftRight size={15} /> Compare
          </Link>
        </div>
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
                injured: injuryInfo.get(p.id)?.injured ?? false,
                injuryDays: injuryInfo.get(p.id)?.days,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
