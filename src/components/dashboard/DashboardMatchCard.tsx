"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { toPng } from "html-to-image";
import { Download, Plus } from "lucide-react";

type LineupPlayer = {
  playerId: number;
  name: string;
  photoUrl: string | null;
  position: "GK" | "DEF" | "ATT" | null;
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function PlainAvatar({ name, photoUrl, size = 48 }: { name: string; photoUrl: string | null; size?: number }) {
  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoUrl}
        alt={name}
        crossOrigin="anonymous"
        style={{ width: size, height: size }}
        className="rounded-full border-2 border-white/80 object-cover shadow"
      />
    );
  }
  return (
    <div
      style={{ width: size, height: size }}
      className="flex items-center justify-center rounded-full border-2 border-white/80 bg-white/90 font-display text-sm font-bold text-pitch-dark shadow"
    >
      {initials(name)}
    </div>
  );
}

// A position row stretched across the full width using justify-around, so players
// spread edge to edge instead of clustering in the center.
function PositionRow({ players }: { players: LineupPlayer[] }) {
  if (players.length === 0) return null;
  return (
    <div className="flex items-start justify-around gap-1">
      {players.map((p) => (
        <div key={p.playerId} className="flex flex-1 flex-col items-center gap-1 text-center">
          <PlainAvatar name={p.name} photoUrl={p.photoUrl} />
          <span className="w-full truncate px-0.5 text-[10px] font-semibold leading-tight text-white drop-shadow sm:text-[11px]">
            {p.name}
          </span>
        </div>
      ))}
    </div>
  );
}

function TeamHalf({
  teamName,
  score,
  players,
}: {
  teamName: string;
  score: number;
  players: LineupPlayer[];
}) {
  const att = players.filter((p) => p.position === "ATT");
  const def = players.filter((p) => p.position === "DEF");
  const gk = players.filter((p) => p.position === "GK");
  const unassigned = players.filter((p) => p.position === null);
  const hasFormation = gk.length + def.length + att.length > 0;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <span className="font-display text-sm font-bold text-white">{teamName}</span>
        <span className="font-display text-lg font-bold text-white">{score}</span>
      </div>
      {hasFormation ? (
        <div className="space-y-5 py-1">
          {/* Goal line to attack: Goalkeeper, then Defenders, then Attackers */}
          <PositionRow players={gk} />
          <PositionRow players={def} />
          <PositionRow players={att} />
        </div>
      ) : (
        <div className="space-y-4 py-1">
          <PositionRow players={unassigned} />
        </div>
      )}
    </div>
  );
}

export function DashboardMatchCard({
  matchDate,
  label,
  teamAScore,
  teamBScore,
  teamAPlayers,
  teamBPlayers,
}: {
  matchDate: string;
  label: string;
  teamAScore: number;
  teamBScore: number;
  teamAPlayers: LineupPlayer[];
  teamBPlayers: LineupPlayer[];
}) {
  const captureRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    if (!captureRef.current) return;
    setDownloading(true);
    try {
      const dataUrl = await toPng(captureRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#0E1B33",
      });
      const link = document.createElement("a");
      link.download = `top-turf-players-${matchDate}.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      // photo cross-origin load can fail; on-screen view still works
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div>
      <div ref={captureRef} className="overflow-hidden rounded-2xl bg-navy shadow-sm ring-1 ring-navy-dark">
        {/* Header: logo + label + date */}
        <div className="flex items-center justify-between px-4 pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/60">{label}</p>
          <div className="flex items-center gap-1.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="" crossOrigin="anonymous" className="h-6 w-6 rounded-full" />
            <span className="font-display text-xs font-bold text-white">TOP Turf Players</span>
          </div>
        </div>

        {/* Scoreboard summary: Team A [score] : [score] Team B */}
        <div className="flex items-center justify-center gap-4 px-4 py-3">
          <span className="flex-1 text-right font-display text-sm font-bold text-white sm:text-base">Team A</span>
          <span className="font-display text-3xl font-bold text-white sm:text-4xl">
            {teamAScore} : {teamBScore}
          </span>
          <span className="flex-1 text-left font-display text-sm font-bold text-white sm:text-base">Team B</span>
        </div>
        <p className="pb-2 text-center text-[11px] text-white/50">{matchDate}</p>

        {/* Team A pitch - goal line (GK) at top, attackers toward the middle */}
        <div className="relative mx-3 mb-3 overflow-hidden rounded-xl" style={{ background: "linear-gradient(180deg, #1E7A46 0%, #145C34 100%)" }}>
          <div className="pointer-events-none absolute inset-x-3 bottom-0 h-px bg-white/20" />
          <div className="px-3 pb-2 pt-3">
            <TeamHalf teamName="Team A" score={teamAScore} players={teamAPlayers} />
          </div>
        </div>

        {/* Team B pitch - same orientation, goal line (GK) at top */}
        <div className="relative mx-3 mb-4 overflow-hidden rounded-xl" style={{ background: "linear-gradient(180deg, #B8862E 0%, #8C6620 100%)" }}>
          <div className="pointer-events-none absolute inset-x-3 top-0 h-px bg-white/20" />
          <div className="px-3 pb-2 pt-3">
            <TeamHalf teamName="Team B" score={teamBScore} players={teamBPlayers} />
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={handleDownload}
        disabled={downloading}
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-pitch px-4 py-2 text-sm font-semibold text-white transition hover:bg-pitch-dark disabled:opacity-60"
      >
        <Download size={16} /> {downloading ? "Preparing image…" : "Download lineup image"}
      </button>
    </div>
  );
}

/** Empty state shown when there's no match yet, with entry button for logged-in users. */
export function DashboardNoMatchCard({ canEnterMatch }: { canEnterMatch: boolean }) {
  return (
    <div className="rounded-2xl bg-navy p-6 text-center shadow-sm ring-1 ring-navy-dark">
      <p className="text-xs font-semibold uppercase tracking-wide text-white/60">Today&apos;s match</p>
      <p className="mt-1 text-sm text-white/60">6:00 – 7:00 AM</p>
      <p className="mt-4 font-display text-xl font-bold text-white">MATCH NOT UPDATED</p>
      {canEnterMatch && (
        <Link
          href="/matches/new"
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-pitch px-4 py-2 text-sm font-semibold text-white transition hover:bg-pitch-dark"
        >
          <Plus size={16} /> Enter today&apos;s match
        </Link>
      )}
    </div>
  );
}
