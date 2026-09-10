import { getActivePlayersForPicker } from "@/lib/matchService";
import { MatchForm } from "@/components/matches/MatchForm";

export const dynamic = "force-dynamic";

export default async function NewMatchPage() {
  const players = await getActivePlayersForPicker();

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="font-display text-2xl font-semibold text-ink">Enter today&apos;s match</h1>
      <MatchForm
        allPlayers={players.map((p) => ({ id: p.id, name: p.name, photoUrl: p.photoUrl }))}
      />
    </div>
  );
}
