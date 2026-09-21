import Link from "next/link";
import { PlayerAvatar } from "@/components/players/PlayerAvatar";
import type { DashboardPlayerSummary } from "@/lib/dashboard";
import { Flame, Snowflake, Shield } from "lucide-react";

function StreakCard({
  player,
  count,
  unit,
  variant,
}: {
  player: DashboardPlayerSummary;
  count: number;
  unit: string;
  variant: "hot" | "cold" | "undefeated";
}) {
  const ring =
    variant === "hot"
      ? "bg-amber-tint ring-amber/30"
      : variant === "undefeated"
        ? "bg-pitch-tint ring-pitch/30"
        : "bg-red-tint ring-red/20";
  const text =
    variant === "hot" ? "text-amber" : variant === "undefeated" ? "text-pitch" : "text-red";
  const Icon = variant === "hot" ? Flame : variant === "undefeated" ? Shield : Snowflake;
  return (
    <Link
      href={`/players/${player.playerId}`}
      className={`flex min-w-[132px] shrink-0 flex-col items-center gap-2 rounded-2xl p-3 text-center shadow-sm ring-1 ${ring}`}
    >
      <PlayerAvatar name={player.name} photoUrl={player.photoUrl} size="lg" />
      <p className="truncate text-sm font-semibold text-ink">{player.name}</p>
      <span className={`flex items-center gap-1 text-xs font-bold ${text}`}>
        <Icon size={13} />
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

export function UndefeatedStreaksRow({ players }: { players: DashboardPlayerSummary[] }) {
  if (players.length === 0) return null;
  return (
    <section>
      <p className="mb-2 font-display text-base font-semibold text-ink">🛡️ Undefeated runs</p>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {players.map((p) => (
          <StreakCard
            key={p.playerId}
            player={p}
            count={p.undefeatedStreak}
            unit="unbeaten"
            variant="undefeated"
          />
        ))}
      </div>
    </section>
  );
}

export function ColdStreaksRow({ players }: { players: DashboardPlayerSummary[] }) {
  if (players.length === 0) return null;
  return (
    <section>
      <p className="mb-2 font-display text-base font-semibold text-ink">🔻 Losing streaks</p>
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
