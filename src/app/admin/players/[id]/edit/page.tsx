import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { getPlayerById } from "@/lib/players";
import { getPlayerInjuries } from "@/lib/injuries";
import { PlayerForm } from "@/components/players/PlayerForm";
import { InjuryManager } from "./InjuryManager";

export const dynamic = "force-dynamic";

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
  const injuryList = await getPlayerInjuries(playerId);

  return (
    <div className="mx-auto max-w-md space-y-4">
      <Link
        href="/admin/players"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted transition hover:text-ink"
      >
        <ArrowLeft size={16} /> Back to players
      </Link>
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
      <InjuryManager playerId={player.id} injuries={injuryList} />
    </div>
  );
}
