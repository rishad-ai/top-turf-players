import { notFound } from "next/navigation";
import { getPlayerById } from "@/lib/players";
import { calculatePlayerStats, calculatePlayerMatchHistory } from "@/lib/stats";
import { calculatePlayerStreaks } from "@/lib/streaks";
import { getMemberSession } from "@/lib/auth";
import { PlayerAvatar } from "@/components/players/PlayerAvatar";
import { PlayerTypeBadge, InactiveBadge } from "@/components/players/PlayerBadges";
import { HotStreakBadge, ColdStreakBadge } from "@/components/players/StreakBadges";
import { RecentForm } from "@/components/players/RecentForm";
import { PlayerMatchHistoryList } from "@/components/players/PlayerMatchHistoryList";
import { ChangeMyPhotoButton } from "@/components/players/ChangeMyPhotoButton";
import { EmptyState } from "@/components/ui/EmptyState";

function StatBlock({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-bg px-3 py-2 text-center">
      <p className="font-display text-xl font-bold text-ink">{value}</p>
      <p className="text-xs text-ink-muted">{label}</p>
    </div>
  );
}

export default async function PlayerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const playerId = Number(id);
  if (!Number.isFinite(playerId)) notFound();

  const player = await getPlayerById(playerId);
  if (!player) notFound();

  const stats = await calculatePlayerStats(playerId);
  const history = await calculatePlayerMatchHistory(playerId);
  const streaks = await calculatePlayerStreaks(playerId);
  const member = await getMemberSession();
  const isOwnProfile = member?.playerId === playerId;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 rounded-2xl bg-surface p-5 shadow-sm ring-1 ring-line">
        <PlayerAvatar name={player.name} photoUrl={player.photoUrl} size="xl" />
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">
            {player.name}
          </h1>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <PlayerTypeBadge type={player.playerType as "regular" | "irregular"} />
            {!player.isActive && <InactiveBadge />}
            <HotStreakBadge count={streaks.winningStreak} />
            <ColdStreakBadge
              count={streaks.losingStreak}
              unit={player.playerType === "irregular" ? "matches" : "days"}
            />
          </div>
          {isOwnProfile && (
            <div className="mt-3">
              <ChangeMyPhotoButton />
            </div>
          )}
        </div>
      </div>

      {stats.matchesPlayed === 0 ? (
        <EmptyState
          title="No matches played yet"
          description={`${player.name} hasn't appeared in a recorded match.`}
        />
      ) : (
        <>
          <RecentForm history={history} />

          <div className="grid grid-cols-3 gap-2 rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-line sm:grid-cols-6">
            <StatBlock label="Played" value={stats.matchesPlayed} />
            <StatBlock label="Wins" value={stats.wins} />
            <StatBlock label="Draws" value={stats.draws} />
            <StatBlock label="Losses" value={stats.losses} />
            <StatBlock label="Goals" value={stats.goals} />
            <StatBlock label="Win %" value={`${stats.winPercentage}%`} />
          </div>

          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-line sm:grid-cols-4">
            <StatBlock label="Current win streak" value={streaks.winningStreak} />
            <StatBlock label="Longest win streak" value={streaks.longestWinningStreak} />
            <StatBlock label="Current losing streak" value={streaks.losingStreak} />
            <StatBlock label="Longest losing streak" value={streaks.longestLosingStreak} />
          </div>

          <div className="rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-line">
            <PlayerMatchHistoryList history={history} />
          </div>
        </>
      )}
    </div>
  );
}
