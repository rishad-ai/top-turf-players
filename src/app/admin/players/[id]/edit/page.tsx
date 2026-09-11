import { notFound } from "next/navigation";
import { getPlayerById } from "@/lib/players";
import { PlayerForm } from "@/components/players/PlayerForm";

export default async function EditPlayerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const playerId = Number(id);
  if (!Number.isFinite(playerId)) notFound();

  const player = await getPlayerById(playerId);
  if (!player) notFound();

  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="font-display text-2xl font-semibold text-ink">Edit player</h1>
      <PlayerForm
        initial={{
          id: player.id,
          name: player.name,
          playerType: player.playerType as "regular" | "irregular",
          photoUrl: player.photoUrl,
          mobileNumber: player.mobileNumber,
        }}
      />
    </div>
  );
}
