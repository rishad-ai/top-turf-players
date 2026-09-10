"use client";

import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import { Download } from "lucide-react";

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

// Plain <img>-based avatar (not next/image) so html-to-image can capture it reliably
// without dealing with Next's image-optimization proxy/blur placeholders.
function PlainAvatar({ name, photoUrl }: { name: string; photoUrl: string | null }) {
  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoUrl}
        alt={name}
        crossOrigin="anonymous"
        className="h-12 w-12 rounded-full border-2 border-white/80 object-cover shadow"
      />
    );
  }
  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-white/80 bg-white/90 font-display text-sm font-bold text-pitch-dark shadow">
      {initials(name)}
    </div>
  );
}

function PositionRow({ players }: { players: LineupPlayer[] }) {
  if (players.length === 0) return null;
  return (
    <div className="flex flex-wrap items-start justify-center gap-4">
      {players.map((p) => (
        <div key={p.playerId} className="flex w-16 flex-col items-center gap-1 text-center">
          <PlainAvatar name={p.name} photoUrl={p.photoUrl} />
          <span className="w-full truncate text-[10px] font-semibold leading-tight text-white drop-shadow">
            {p.name}
          </span>
        </div>
      ))}
    </div>
  );
}

function TeamPitch({
  label,
  score,
  players,
  gradientFrom,
  gradientTo,
}: {
  label: string;
  score: number;
  players: LineupPlayer[];
  gradientFrom: string;
  gradientTo: string;
}) {
  const att = players.filter((p) => p.position === "ATT");
  const def = players.filter((p) => p.position === "DEF");
  const gk = players.filter((p) => p.position === "GK");

  return (
    <div
      className="relative overflow-hidden rounded-2xl p-4"
      style={{ background: `linear-gradient(180deg, ${gradientFrom} 0%, ${gradientTo} 100%)` }}
    >
      <div className="pointer-events-none absolute inset-x-4 top-1/2 h-px -translate-y-1/2 bg-white/20" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/20" />

      <div className="relative mb-3 flex items-center justify-between text-white">
        <span className="font-display text-sm font-bold">{label}</span>
        <span className="font-display text-lg font-bold">{score}</span>
      </div>
      <div className="relative space-y-5 py-1">
        <PositionRow players={att} />
        <PositionRow players={def} />
        <PositionRow players={gk} />
      </div>
      <p className="relative mt-3 text-center text-[10px] font-bold uppercase tracking-wider text-white/60">
        1-3-3
      </p>
    </div>
  );
}

export function MatchLineupCard({
  matchDate,
  teamAScore,
  teamBScore,
  teamAPlayers,
  teamBPlayers,
}: {
  matchDate: string;
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
        backgroundColor: "#FAFAF7",
      });
      const link = document.createElement("a");
      link.download = `top-turf-players-${matchDate}.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      // If a photo fails to load cross-origin, html-to-image throws - fail quietly,
      // the user can still see the lineup on screen even if download doesn't work.
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div>
      <div ref={captureRef} className="space-y-3 rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-line">
        <div className="flex items-center justify-between">
          <p className="font-display text-sm font-semibold text-ink-muted">{matchDate}</p>
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="" className="h-6 w-6 rounded-full" crossOrigin="anonymous" />
            <span className="font-display text-sm font-bold text-ink">TOP Turf Players</span>
          </div>
        </div>
        <TeamPitch label="Team A" score={teamAScore} players={teamAPlayers} gradientFrom="#1E7A46" gradientTo="#145C34" />
        <TeamPitch label="Team B" score={teamBScore} players={teamBPlayers} gradientFrom="#B8862E" gradientTo="#8C6620" />
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
