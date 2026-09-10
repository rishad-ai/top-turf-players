import { notFound } from "next/navigation";
import Link from "next/link";
import { getMatchDetail } from "@/lib/matchService";
import { FormationPitch, type FormationPlayer } from "@/components/matches/FormationPitch";

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

  const teamAStarters: FormationPlayer[] = matchPlayers
    .filter((mp) => mp.team === "A" && mp.role === "starter")
    .map((mp) => ({
      playerId: mp.playerId,
      name: mp.player.name,
      photoUrl: mp.player.photoUrl,
      position: mp.position as "GK" | "DEF" | "ATT" | null,
    }));
  const teamBStarters: FormationPlayer[] = matchPlayers
    .filter((mp) => mp.team === "B" && mp.role === "starter")
    .map((mp) => ({
      playerId: mp.playerId,
      name: mp.player.name,
      photoUrl: mp.player.photoUrl,
      position: mp.position as "GK" | "DEF" | "ATT" | null,
    }));

  const teamASubs = matchPlayers.filter((mp) => mp.team === "A" && mp.role === "substitute");
  const teamBSubs = matchPlayers.filter((mp) => mp.team === "B" && mp.role === "substitute");

  const goalsA = goals.filter((g) => g.team === "A").sort((a, b) => (a.minute ?? 999) - (b.minute ?? 999));
  const goalsB = goals.filter((g) => g.team === "B").sort((a, b) => (a.minute ?? 999) - (b.minute ?? 999));

  function SubsAndScorers({
    subs,
    scorers,
  }: {
    subs: typeof teamASubs;
    scorers: typeof goalsA;
  }) {
    if (subs.length === 0 && scorers.length === 0) return null;
    return (
      <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
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
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link href="/matches" className="text-sm font-medium text-pitch-dark">
        ← Back to match history
      </Link>

      <div className="rounded-2xl bg-surface p-6 text-center shadow-sm ring-1 ring-line">
        <p className="text-sm text-ink-muted">{match.matchDate}</p>
        <p className="mt-1 font-display text-4xl font-bold text-ink">
          {match.teamAScore} : {match.teamBScore}
        </p>
      </div>

      <div className="space-y-3 rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-line">
        <FormationPitch teamLabel="Team A" players={teamAStarters} accent="pitch" />
        <SubsAndScorers subs={teamASubs} scorers={goalsA} />
      </div>

      <div className="space-y-3 rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-line">
        <FormationPitch teamLabel="Team B" players={teamBStarters} accent="amber" />
        <SubsAndScorers subs={teamBSubs} scorers={goalsB} />
      </div>
    </div>
  );
}
