import { PlayerAvatar } from "@/components/players/PlayerAvatar";

export type FormationPlayer = {
  playerId: number;
  name: string;
  photoUrl: string | null;
  position: "GK" | "DEF" | "ATT" | null;
};

function PositionRow({
  players,
  label,
}: {
  players: FormationPlayer[];
  label: string;
}) {
  if (players.length === 0) return null;
  return (
    <div className="flex flex-wrap items-start justify-center gap-4">
      {players.map((p) => (
        <div key={p.playerId} className="flex w-16 flex-col items-center gap-1 text-center">
          <PlayerAvatar name={p.name} photoUrl={p.photoUrl} size="md" className="ring-2 ring-white/70" />
          <span className="w-full truncate text-[11px] font-medium leading-tight text-white drop-shadow">
            {p.name}
          </span>
          <span className="text-[9px] font-bold uppercase tracking-wide text-white/70">{label}</span>
        </div>
      ))}
    </div>
  );
}

export function FormationPitch({
  teamLabel,
  players,
  accent,
}: {
  teamLabel: string;
  players: FormationPlayer[];
  accent: "pitch" | "amber";
}) {
  const attackers = players.filter((p) => p.position === "ATT");
  const defenders = players.filter((p) => p.position === "DEF");
  const goalkeeper = players.filter((p) => p.position === "GK");

  return (
    <div>
      <p className={`mb-2 text-sm font-semibold ${accent === "pitch" ? "text-pitch-dark" : "text-ink"}`}>
        {teamLabel} · 1-3-3
      </p>
      <div
        className="relative overflow-hidden rounded-2xl p-4"
        style={{
          background:
            accent === "pitch"
              ? "linear-gradient(180deg, #1E7A46 0%, #145C34 100%)"
              : "linear-gradient(180deg, #B8862E 0%, #8C6620 100%)",
        }}
      >
        {/* center line + circle, purely decorative pitch markings */}
        <div className="pointer-events-none absolute inset-x-4 top-1/2 h-px -translate-y-1/2 bg-white/20" />
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/20" />

        <div className="relative space-y-6 py-2">
          <PositionRow players={goalkeeper} label="GK" />
          <PositionRow players={defenders} label="DEF" />
          <PositionRow players={attackers} label="ATT" />
        </div>
      </div>
    </div>
  );
}
