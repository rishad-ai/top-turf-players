import Link from "next/link";
import { getAllMatchesSummary } from "@/lib/matchService";
import { EmptyState } from "@/components/ui/EmptyState";
import { DeleteMatchButton } from "./DeleteMatchButton";
import { Plus } from "lucide-react";

export default async function AdminMatchesPage() {
  const all = await getAllMatchesSummary();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-ink">Manage matches</h1>
        <Link
          href="/admin/matches/new"
          className="flex items-center gap-1.5 rounded-lg bg-pitch px-3 py-2 text-sm font-semibold text-white transition hover:bg-pitch-dark"
        >
          <Plus size={16} /> Enter match
        </Link>
      </div>

      {all.length === 0 ? (
        <EmptyState
          title="No matches yet"
          description="Enter today's match to get started."
        />
      ) : (
        <div className="space-y-2">
          {all.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-line"
            >
              <div>
                <p className="font-display text-lg font-bold text-ink">
                  {m.teamAScore} : {m.teamBScore}
                </p>
                <p className="text-sm text-ink-muted">{m.matchDate}</p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/admin/matches/${m.id}/edit`}
                  className="rounded-lg px-3 py-1.5 text-sm font-medium text-pitch-dark ring-1 ring-line transition hover:bg-pitch-tint"
                >
                  Edit
                </Link>
                <DeleteMatchButton matchId={m.id} matchDate={m.matchDate} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
