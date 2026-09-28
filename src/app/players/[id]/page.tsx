import Link from "next/link";
import { ArrowLeftRight } from "lucide-react";
import { notFound } from "next/navigation";
import { getPlayerById } from "@/lib/players";
import { calculatePlayerStats, calculatePlayerMatchHistory } from "@/lib/stats";
import { calculatePlayerStreaks } from "@/lib/streaks";
import { getPlayerInjuries, currentInjury, injuryDurationDays } from "@/lib/injuries";
import { getMemberSession } from "@/lib/auth";
import { PlayerAvatar } from "@/components/players/PlayerAvatar";
import { PlayerTypeBadge, InactiveBadge, InjuredBadge } from "@/components/players/PlayerBadges";
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
  const injuryList = await getPlayerInjuries(playerId);
  const member = await getMemberSession();
  const isOwnProfile = member?.playerId === playerId;

  const today = new Date().toISOString().slice(0, 10);
  const activeInjury = currentInjury(injuryList, today);
  const activeInjuryDays = activeInjury ? injuryDurationDays(activeInjury.startDate, activeInjury.endDate, today) : 0;

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
            {activeInjury && <InjuredBadge days={activeInjuryDays} />}
            {!player.isActive && <InactiveBadge />}
            <HotStreakBadge count={streaks.winningStreak} />
            <ColdStreakBadge
              count={streaks.losingStreak}
              unit={player.playerType === "irregular" ? "matches" : "days"}
            />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Link
              href={`/compare?a=${player.id}`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-pitch-tint px-3 py-1.5 text-sm font-semibold text-pitch-dark transition hover:bg-pitch hover:text-white"
            >
              <ArrowLeftRight size={15} /> Compare with…
            </Link>
            {isOwnProfile && <ChangeMyPhotoButton />}
          </div>
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

          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-line sm:grid-cols-3 lg:grid-cols-6">
            <StatBlock label="Current win streak" value={streaks.winningStreak} />
            <StatBlock label="Longest win streak" value={streaks.longestWinningStreak} />
            <StatBlock label="Current unbeaten run" value={streaks.undefeatedStreak} />
            <StatBlock label="Longest unbeaten run" value={streaks.longestUndefeatedStreak} />
            <StatBlock label="Current losing streak" value={streaks.losingStreak} />
            <StatBlock label="Longest losing streak" value={streaks.longestLosingStreak} />
          </div>

          <div className="rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-line">
            <PlayerMatchHistoryList history={history} />
          </div>
        </>
      )}

      {(activeInjury || injuryList.length > 0) && (
        <div className="rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-line">
          <p className="mb-2 font-display text-base font-semibold text-ink">🚑 Injuries</p>
          {activeInjury && (
            <div className="mb-3 rounded-xl bg-red-tint p-3">
              <p className="text-sm font-semibold text-red">
                Currently injured · {activeInjuryDays} day{activeInjuryDays === 1 ? "" : "s"}
              </p>
              <p className="mt-0.5 text-xs text-ink-muted">
                Since {activeInjury.startDate}
                {activeInjury.note ? ` — ${activeInjury.note}` : ""}
              </p>
              <p className="mt-1 text-xs text-ink-muted">These days are excluded from the losing streak.</p>
            </div>
          )}
          {injuryList.length > 0 && (
            <ul className="space-y-1.5">
              {injuryList.map((inj) => {
                const ongoing = inj.endDate === null;
                const days = injuryDurationDays(inj.startDate, inj.endDate, today);
                return (
                  <li key={inj.id} className="flex items-center justify-between border-b border-line py-1.5 text-sm last:border-0">
                    <span className="text-ink">
                      {inj.startDate} → {ongoing ? "ongoing" : inj.endDate}
                      {inj.note ? <span className="text-ink-muted"> · {inj.note}</span> : null}
                    </span>
                    <span className="shrink-0 font-medium text-ink-muted">{days}d</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
