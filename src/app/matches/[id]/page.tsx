import { notFound } from "next/navigation";
import Link from "next/link";
import { getMatchDetail } from "@/lib/matchService";
import { DashboardMatchCard } from "@/components/dashboard/DashboardMatchCard";
import { TEAM_A_NAME, TEAM_B_NAME } from "@/lib/teams";

export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const matchId = Number(id);
  if (!Number.isFinite(matchId)) notFound();

  const detail = await getMatchDetail(matchId);
  if (!detail) notFound();

  const { match, matchPlayers, goals } = detail;

  const goalsByPlayer = new Map<number, number>();
  for (const g of goals) {
    if (g.isOwnGoal) continue;
    goalsByPlayer.set(g.playerId, (goalsByPlayer.get(g.playerId) ?? 0) + 1);
  }

  const teamAStarters = matchPlayers
    .filter((mp) => mp.team === "A" && mp.role === "starter")
    .map((mp) => ({
      playerId: mp.playerId,
      name: mp.player.name,
      photoUrl: mp.player.photoUrl,
      position: mp.position as "GK" | "DEF" | "ATT" | null,
      goals: goalsByPlayer.get(mp.playerId) ?? 0,
    }));
  const teamBStarters = matchPlayers
    .filter((mp) => mp.team === "B" && mp.role === "starter")
    .map((mp) => ({
      playerId: mp.playerId,
      name: mp.player.name,
      photoUrl: mp.player.photoUrl,
      position: mp.position as "GK" | "DEF" | "ATT" | null,
      goals: goalsByPlayer.get(mp.playerId) ?? 0,
    }));

  const teamASubs = matchPlayers.filter((mp) => mp.team === "A" && mp.role === "substitute");
  const teamBSubs = matchPlayers.filter((mp) => mp.team === "B" && mp.role === "substitute");

  const goalsA = goals.filter((g) => g.team === "A").sort((a, b) => (a.minute ?? 999) - (b.minute ?? 999));
  const goalsB = goals.filter((g) => g.team === "B").sort((a, b) => (a.minute ?? 999) - (b.minute ?? 999));

  function TeamExtras({
    teamLabel,
    subs,
    scorers,
  }: {
    teamLabel: string;
    subs: typeof teamASubs;
    scorers: typeof goalsA;
  }) {
    if (subs.length === 0 && scorers.length === 0) return null;
    return (
      <div className="rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-line">
        <p className="mb-2 font-display text-sm font-semibold text-ink">{teamLabel}</p>
        <div className="grid grid-cols-2 gap-4 text-sm">
          {scorers.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-medium text-ink-muted">⚽ Scorers</p>
              <ul className="space-y-0.5 text-ink">
                {scorers.map((g) => (
                  <li key={g.id}>
                    {g.player.name}
                    {g.minute !== null && <span className="text-ink-muted"> {g.minute}&apos;</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {subs.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-medium text-ink-muted">Substitutes</p>
              <ul className="space-y-0.5 text-ink">
                {subs.map((mp) => (
                  <li key={mp.playerId}>
                    {mp.player.name}
                    {!mp.played && <span className="text-ink-muted"> (did not play)</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Link href="/matches" className="text-sm font-medium text-pitch-dark">
        ← Back to match history
      </Link>

      {/* Same merged scoreboard-over-lineup card as the dashboard (Team B mirrored). */}
      <DashboardMatchCard
        matchDate={match.matchDate}
        label="Match result"
        teamAScore={match.teamAScore}
        teamBScore={match.teamBScore}
        teamAPlayers={teamAStarters}
        teamBPlayers={teamBStarters}
      />

      <TeamExtras teamLabel={TEAM_A_NAME} subs={teamASubs} scorers={goalsA} />
      <TeamExtras teamLabel={TEAM_B_NAME} subs={teamBSubs} scorers={goalsB} />
    </div>
  );
}
