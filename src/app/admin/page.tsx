import Link from "next/link";
import { getSession } from "@/lib/auth";
import { getAdminOverview } from "@/lib/adminOverview";
import { LogoutButton } from "./LogoutButton";
import { Users, Swords, Plus } from "lucide-react";

function StatBlock({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-bg px-3 py-2 text-center">
      <p className="font-display text-xl font-bold text-ink">{value}</p>
      <p className="text-xs text-ink-muted">{label}</p>
    </div>
  );
}

export default async function AdminHomePage() {
  const [session, overview] = await Promise.all([getSession(), getAdminOverview()]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Admin</h1>
          <p className="text-sm text-ink-muted">Signed in as {session?.username}</p>
        </div>
        <LogoutButton />
      </div>

      <div className="rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-line">
        {overview.hasTodayMatch ? (
          <p className="text-sm text-ink">
            ✅ Today&apos;s match ({overview.todayDate}) has been entered.
          </p>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-ink">
              ⚠️ Today&apos;s match ({overview.todayDate}) hasn&apos;t been entered yet.
            </p>
            <Link
              href="/admin/matches/new"
              className="flex shrink-0 items-center gap-1 rounded-lg bg-pitch px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-pitch-dark"
            >
              <Plus size={14} /> Enter it
            </Link>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-line sm:grid-cols-4">
        <StatBlock label="Active players" value={overview.activePlayers} />
        <StatBlock label="Inactive players" value={overview.inactivePlayers} />
        <StatBlock label="Total matches" value={overview.totalMatches} />
        <StatBlock label="Latest match" value={overview.latestMatchDate ?? "—"} />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Link
          href="/admin/players"
          className="flex items-center gap-3 rounded-2xl bg-surface p-5 shadow-sm ring-1 ring-line transition hover:shadow-md hover:ring-pitch/30"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-pitch-tint text-pitch-dark">
            <Users size={22} />
          </span>
          <div>
            <p className="font-display text-base font-semibold text-ink">
              Manage players
            </p>
            <p className="text-sm text-ink-muted">Add, edit, activate/deactivate</p>
          </div>
        </Link>

        <Link
          href="/admin/matches"
          className="flex items-center gap-3 rounded-2xl bg-surface p-5 shadow-sm ring-1 ring-line transition hover:shadow-md hover:ring-pitch/30"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-tint text-ink">
            <Swords size={22} />
          </span>
          <div>
            <p className="font-display text-base font-semibold text-ink">
              Manage matches
            </p>
            <p className="text-sm text-ink-muted">Enter, edit, or delete matches</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
