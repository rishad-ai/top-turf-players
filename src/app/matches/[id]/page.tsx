import { notFound } from "next/navigation";
import Link from "next/link";
import { getMatchDetail } from "@/lib/matchService";
import { PlayerAvatar } from "@/components/players/PlayerAvatar";

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

  const teamA = matchPlayers.filter((mp) => mp.team === "A");
  const teamB = matchPlayers.filter((mp) => mp.team === "B");
  const goalsA = goals.filter((g) => g.team === "A").sort((a, b) => (a.minute ?? 999) - (b.minute ?? 999));
  const goalsB = goals.filter((g) => g.team === "B").sort((a, b) => (a.minute ?? 999) - (b.minute ?? 999));

  function TeamColumn({
    label,
    roster,
    scorers,
    accent,
  }: {
    label: string;
    roster: typeof teamA;
    scorers: typeof goalsA;
    accent: "pitch" | "amber";
  }) {
    return (
      <div>
        <p className={`mb-2 text-sm font-semibold ${accent === "pitch" ? "text-pitch-dark" : "text-ink"}`}>
          {label}
        </p>
        <ul className="space-y-2">
          {roster.map((mp) => (
            <li key={mp.playerId} className="flex items-center gap-2">
              <PlayerAvatar name={mp.player.name} photoUrl={mp.player.photoUrl} size="sm" />
              <span className="text-sm text-ink">{mp.player.name}</span>
              {mp.role === "substitute" && (
                <span className="text-xs text-ink-muted">
                  (sub{!mp.played && ", did not play"})
                </span>
              )}
            </li>
          ))}
        </ul>
        {scorers.length > 0 && (
          <div className="mt-3 border-t border-line pt-2">
            <p className="mb-1 text-xs font-medium text-ink-muted">⚽ Scorers</p>
            <ul className="space-y-0.5 text-sm text-ink">
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

      <div className="grid grid-cols-2 gap-4 rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-line">
        <TeamColumn label="Team A" roster={teamA} scorers={goalsA} accent="pitch" />
        <TeamColumn label="Team B" roster={teamB} scorers={goalsB} accent="amber" />
      </div>
    </div>
  );
}
