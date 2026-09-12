import { notFound } from "next/navigation";
import { getMatchDetail } from "@/lib/matchService";
import { getAllPlayers } from "@/lib/players";
import { MatchForm, type MatchFormInitial } from "@/components/matches/MatchForm";

export default async function EditMatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const matchId = Number(id);
  if (!Number.isFinite(matchId)) notFound();

  const detail = await getMatchDetail(matchId);
  if (!detail) notFound();

  // Include ALL players (not just active) so a historical match involving a
  // now-inactive/edited-out player still renders correctly for editing.
  const allPlayers = await getAllPlayers();

  function buildFormation(team: "A" | "B") {
    const starters = detail!.matchPlayers.filter((mp) => mp.team === team && mp.role === "starter");
    return {
      gk: starters.find((mp) => mp.position === "GK")?.playerId ?? null,
      def: starters.filter((mp) => mp.position === "DEF").map((mp) => mp.playerId),
      att: starters.filter((mp) => mp.position === "ATT").map((mp) => mp.playerId),
    };
  }

  const teamAFormation = buildFormation("A");
  const teamBFormation = buildFormation("B");
  const teamASubs = detail.matchPlayers
    .filter((mp) => mp.team === "A" && mp.role === "substitute")
    .map((mp) => ({ playerId: mp.playerId, played: mp.played }));
  const teamBSubs = detail.matchPlayers
    .filter((mp) => mp.team === "B" && mp.role === "substitute")
    .map((mp) => ({ playerId: mp.playerId, played: mp.played }));

  const goalsA = detail.goals
    .filter((g) => g.team === "A")
    .map((g) => ({ playerId: g.playerId, minute: g.minute, isOwnGoal: g.isOwnGoal }));
  const goalsB = detail.goals
    .filter((g) => g.team === "B")
    .map((g) => ({ playerId: g.playerId, minute: g.minute, isOwnGoal: g.isOwnGoal }));

  const initial: MatchFormInitial = {
    matchId: detail.match.id,
    matchDate: detail.match.matchDate,
    teamAScore: detail.match.teamAScore,
    teamBScore: detail.match.teamBScore,
    teamAFormation,
    teamBFormation,
    teamASubs,
    teamBSubs,
    goalsA,
    goalsB,
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="font-display text-2xl font-semibold text-ink">
        Edit match — {detail.match.matchDate}
      </h1>
      <MatchForm
        allPlayers={allPlayers.map((p) => ({ id: p.id, name: p.name, photoUrl: p.photoUrl }))}
        initial={initial}
      />
    </div>
  );
}
