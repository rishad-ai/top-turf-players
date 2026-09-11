import Link from "next/link";
import { getAllPlayers } from "@/lib/players";
import { PlayerAvatar } from "@/components/players/PlayerAvatar";
import { PlayerTypeBadge, InactiveBadge } from "@/components/players/PlayerBadges";
import { EmptyState } from "@/components/ui/EmptyState";
import { ToggleActiveButton } from "./ToggleActiveButton";
import { Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminPlayersPage() {
  const all = await getAllPlayers();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-ink">
          Manage players
        </h1>
        <Link
          href="/admin/players/new"
          className="flex items-center gap-1.5 rounded-lg bg-pitch px-3 py-2 text-sm font-semibold text-white transition hover:bg-pitch-dark"
        >
          <Plus size={16} /> Add player
        </Link>
      </div>

      {all.length === 0 ? (
        <EmptyState
          title="No players yet"
          description="Add your first player to get started."
        />
      ) : (
        <div className="space-y-2">
          {all.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-3 rounded-2xl bg-surface p-3 shadow-sm ring-1 ring-line"
            >
              <PlayerAvatar name={p.name} photoUrl={p.photoUrl} size="md" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-sm font-semibold text-ink">
                  {p.name}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <PlayerTypeBadge type={p.playerType as "regular" | "irregular"} />
                  {!p.isActive && <InactiveBadge />}
                  {p.mobileNumber ? (
                    <span className="text-xs text-ink-muted">📱 {p.mobileNumber}</span>
                  ) : (
                    <span className="text-xs text-ink-muted/70">no number</span>
                  )}
                  {p.lastLoginAt && (
                    <span className="text-xs text-pitch-dark">
                      ✓ logged in {new Date(p.lastLoginAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <ToggleActiveButton playerId={p.id} isActive={p.isActive} />
                <Link
                  href={`/admin/players/${p.id}/edit`}
                  className="rounded-lg px-3 py-1.5 text-sm font-medium text-pitch-dark ring-1 ring-line transition hover:bg-pitch-tint"
                >
                  Edit
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
