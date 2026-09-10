import Link from "next/link";
import { PlayerAvatar } from "./PlayerAvatar";
import { PlayerTypeBadge, InactiveBadge } from "./PlayerBadges";

export type PlayerCardData = {
  id: number;
  name: string;
  photoUrl: string | null;
  playerType: "regular" | "irregular";
  isActive: boolean;
};

export function PlayerCard({ player }: { player: PlayerCardData }) {
  return (
    <Link
      href={`/players/${player.id}`}
      className="flex items-center gap-3 rounded-2xl bg-surface p-3 shadow-sm ring-1 ring-line transition hover:shadow-md hover:ring-pitch/30"
    >
      <PlayerAvatar name={player.name} photoUrl={player.photoUrl} size="lg" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-base font-semibold text-ink">
          {player.name}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <PlayerTypeBadge type={player.playerType} />
          {!player.isActive && <InactiveBadge />}
        </div>
      </div>
    </Link>
  );
}
