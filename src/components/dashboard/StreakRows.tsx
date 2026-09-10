import Link from "next/link";
import { PlayerAvatar } from "@/components/players/PlayerAvatar";
import type { DashboardPlayerSummary } from "@/lib/dashboard";
import { Flame, Snowflake } from "lucide-react";

function StreakCard({
  player,
  count,
  unit,
  variant,
}: {
  player: DashboardPlayerSummary;
  count: number;
  unit: string;
  variant: "hot" | "cold";
}) {
  const isHot = variant === "hot";
  return (
    <Link
      href={`/players/${player.playerId}`}
      className={`flex min-w-[132px] shrink-0 flex-col items-center gap-2 rounded-2xl p-3 text-center shadow-sm ring-1 ${
        isHot ? "bg-amber-tint ring-amber/30" : "bg-red-tint ring-red/20"
      }`}
    >
      <PlayerAvatar name={player.name} photoUrl={player.photoUrl} size="lg" />
      <p className="truncate text-sm font-semibold text-ink">{player.name}</p>
      <span
        className={`flex items-center gap-1 text-xs font-bold ${isHot ? "text-amber" : "text-red"}`}
      >
        {isHot ? <Flame size={13} /> : <Snowflake size={13} />}
        {count} {unit}
      </span>
    </Link>
  );
}

export function HotStreaksRow({ players }: { players: DashboardPlayerSummary[] }) {
  if (players.length === 0) return null;
  return (
    <section>
      <p className="mb-2 font-display text-base font-semibold text-ink">🔥 Hot streaks</p>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {players.map((p) => (
          <StreakCard key={p.playerId} player={p} count={p.winningStreak} unit="wins" variant="hot" />
        ))}
      </div>
    </section>
  );
}

export function ColdStreaksRow({ players }: { players: DashboardPlayerSummary[] }) {
  if (players.length === 0) return null;
  return (
    <section>
      <p className="mb-2 font-display text-base font-semibold text-ink">🔻 Cold streaks</p>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {players.map((p) => (
          <StreakCard
            key={p.playerId}
            player={p}
            count={p.losingStreak}
            unit={p.playerType === "irregular" ? "matches" : "days"}
            variant="cold"
          />
        ))}
      </div>
    </section>
  );
}
