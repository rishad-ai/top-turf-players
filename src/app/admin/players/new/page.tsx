import { PlayerForm } from "@/components/players/PlayerForm";

export const dynamic = "force-dynamic";

export default function NewPlayerPage() {
  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="font-display text-2xl font-semibold text-ink">Add player</h1>
      <PlayerForm />
    </div>
  );
}
