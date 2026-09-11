import { redirect } from "next/navigation";
import { getActivePlayersForPicker } from "@/lib/matchService";
import { getSession, getMemberSession } from "@/lib/auth";
import { MatchForm } from "@/components/matches/MatchForm";

export const dynamic = "force-dynamic";

export default async function MemberNewMatchPage() {
  // Entering a match requires being logged in - as admin or as a member.
  const admin = await getSession();
  const member = admin ? null : await getMemberSession();
  if (!admin && !member) {
    redirect("/");
  }

  const players = await getActivePlayersForPicker();

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="font-display text-2xl font-semibold text-ink">Enter today&apos;s match</h1>
      <p className="text-sm text-ink-muted">
        Anyone logged in can enter today&apos;s match. Only the admin can edit or delete it
        afterwards.
      </p>
      <MatchForm
        allPlayers={players.map((p) => ({ id: p.id, name: p.name, photoUrl: p.photoUrl }))}
        redirectTo="/matches"
      />
    </div>
  );
}
