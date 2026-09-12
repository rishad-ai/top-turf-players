"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PlayerPicker, type PickablePlayer } from "./PlayerPicker";
import { GoalEntryList, type GoalEntry, type EligibleScorer } from "./GoalEntryList";
import { TEAM_A_NAME, TEAM_B_NAME, teamName } from "@/lib/teams";
import {
  validateMatchInput,
  type MatchInput,
  type MatchPlayerInput,
  type GoalInput,
  type Position,
} from "@/lib/matchValidation";

type SubEntry = { playerId: number; played: boolean };

type FormationState = {
  gk: number | null;
  def: number[]; // exactly 3 when complete
  att: number[]; // exactly 3 when complete
};

const emptyFormation = (): FormationState => ({ gk: null, def: [], att: [] });

export type MatchFormInitial = {
  matchId?: number;
  matchDate: string;
  teamAScore: number;
  teamBScore: number;
  teamAFormation: FormationState;
  teamBFormation: FormationState;
  teamASubs: SubEntry[];
  teamBSubs: SubEntry[];
  goalsA: { playerId: number; minute: number | null; isOwnGoal?: boolean }[];
  goalsB: { playerId: number; minute: number | null; isOwnGoal?: boolean }[];
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function formationStarters(f: FormationState, team: "A" | "B"): MatchPlayerInput[] {
  const rows: MatchPlayerInput[] = [];
  if (f.gk !== null) rows.push({ playerId: f.gk, team, role: "starter", position: "GK", played: true });
  for (const id of f.def) rows.push({ playerId: id, team, role: "starter", position: "DEF", played: true });
  for (const id of f.att) rows.push({ playerId: id, team, role: "starter", position: "ATT", played: true });
  return rows;
}

function allFormationIds(f: FormationState): number[] {
  return [...(f.gk !== null ? [f.gk] : []), ...f.def, ...f.att];
}

export function MatchForm({
  allPlayers,
  initial,
  redirectTo = "/admin/matches",
}: {
  allPlayers: PickablePlayer[];
  initial?: MatchFormInitial;
  redirectTo?: string;
}) {
  const router = useRouter();
  const isEdit = Boolean(initial?.matchId);

  const [matchDate, setMatchDate] = useState(initial?.matchDate || todayISO());
  const [teamA, setTeamA] = useState<FormationState>(initial?.teamAFormation || emptyFormation());
  const [teamB, setTeamB] = useState<FormationState>(initial?.teamBFormation || emptyFormation());
  const [teamASubs, setTeamASubs] = useState<SubEntry[]>(initial?.teamASubs || []);
  const [teamBSubs, setTeamBSubs] = useState<SubEntry[]>(initial?.teamBSubs || []);
  const [teamAScore, setTeamAScore] = useState<number>(initial?.teamAScore ?? 0);
  const [teamBScore, setTeamBScore] = useState<number>(initial?.teamBScore ?? 0);

  const [goalsA, setGoalsA] = useState<GoalEntry[]>(
    (initial?.goalsA || []).map((g) => ({ key: crypto.randomUUID(), ...g }))
  );
  const [goalsB, setGoalsB] = useState<GoalEntry[]>(
    (initial?.goalsB || []).map((g) => ({ key: crypto.randomUUID(), ...g }))
  );

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  function toggleGK(team: "A" | "B", id: number) {
    const setter = team === "A" ? setTeamA : setTeamB;
    setter((cur) => ({ ...cur, gk: cur.gk === id ? null : id }));
  }
  function toggleDef(team: "A" | "B", id: number) {
    const setter = team === "A" ? setTeamA : setTeamB;
    setter((cur) => ({
      ...cur,
      def: cur.def.includes(id) ? cur.def.filter((x) => x !== id) : [...cur.def, id],
    }));
  }
  function toggleAtt(team: "A" | "B", id: number) {
    const setter = team === "A" ? setTeamA : setTeamB;
    setter((cur) => ({
      ...cur,
      att: cur.att.includes(id) ? cur.att.filter((x) => x !== id) : [...cur.att, id],
    }));
  }
  function toggleSubA(id: number) {
    setTeamASubs((cur) =>
      cur.some((s) => s.playerId === id) ? cur.filter((s) => s.playerId !== id) : [...cur, { playerId: id, played: true }]
    );
  }
  function toggleSubB(id: number) {
    setTeamBSubs((cur) =>
      cur.some((s) => s.playerId === id) ? cur.filter((s) => s.playerId !== id) : [...cur, { playerId: id, played: true }]
    );
  }

  const takenIds = useMemo(
    () => [
      ...allFormationIds(teamA),
      ...allFormationIds(teamB),
      ...teamASubs.map((s) => s.playerId),
      ...teamBSubs.map((s) => s.playerId),
    ],
    [teamA, teamB, teamASubs, teamBSubs]
  );

  const playersById = useMemo(() => {
    const m = new Map<number, PickablePlayer>();
    for (const p of allPlayers) m.set(p.id, p);
    return m;
  }, [allPlayers]);

  function eligibleScorers(f: FormationState, subs: SubEntry[], team: "A" | "B"): EligibleScorer[] {
    const list: EligibleScorer[] = allFormationIds(f).map((id) => ({
      playerId: id,
      name: playersById.get(id)?.name || `#${id}`,
      team,
    }));
    for (const s of subs) {
      if (s.played) list.push({ playerId: s.playerId, name: playersById.get(s.playerId)?.name || `#${s.playerId}`, team });
    }
    return list;
  }

  const eligibleScorersA = useMemo(() => eligibleScorers(teamA, teamASubs, "A"), [teamA, teamASubs, playersById]);
  const eligibleScorersB = useMemo(() => eligibleScorers(teamB, teamBSubs, "B"), [teamB, teamBSubs, playersById]);

  function buildMatchInput(): MatchInput {
    const matchPlayers: MatchPlayerInput[] = [
      ...formationStarters(teamA, "A"),
      ...formationStarters(teamB, "B"),
      ...teamASubs.map((s) => ({ playerId: s.playerId, team: "A" as const, role: "substitute" as const, position: null as Position | null, played: s.played })),
      ...teamBSubs.map((s) => ({ playerId: s.playerId, team: "B" as const, role: "substitute" as const, position: null as Position | null, played: s.played })),
    ];

    const goals: GoalInput[] = [
      ...goalsA.filter((g) => g.playerId).map((g) => ({ playerId: g.playerId as number, team: "A" as const, minute: g.minute, isOwnGoal: g.isOwnGoal ?? false })),
      ...goalsB.filter((g) => g.playerId).map((g) => ({ playerId: g.playerId as number, team: "B" as const, minute: g.minute, isOwnGoal: g.isOwnGoal ?? false })),
    ];

    return { matchDate, teamAScore, teamBScore, players: matchPlayers, goals };
  }

  const liveValidation = useMemo(
    () => validateMatchInput(buildMatchInput()),
    [matchDate, teamA, teamB, teamASubs, teamBSubs, teamAScore, teamBScore, goalsA, goalsB]
  );

  async function handleSave() {
    setError(null);
    const input = buildMatchInput();
    const validation = validateMatchInput(input);
    if (!validation.ok) {
      setError(validation.error);
      return;
    }

    setSaving(true);
    const url = isEdit ? `/api/matches/${initial!.matchId}` : "/api/matches";
    const method = isEdit ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    setSaving(false);

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error || "Failed to save match.");
      return;
    }

    router.push(redirectTo);
    router.refresh();
  }

  function FormationPickers({ team, formation }: { team: "A" | "B"; formation: FormationState }) {
    const accent = team === "A" ? "border-pitch bg-pitch-tint" : "border-amber bg-amber-tint";
    return (
      <div className="space-y-4">
        <PlayerPicker
          label={`${teamName(team)} — Goalkeeper (exactly 1)`}
          players={allPlayers}
          selectedIds={formation.gk !== null ? [formation.gk] : []}
          onToggle={(id) => toggleGK(team, id)}
          disabledIds={takenIds.filter((id) => id !== formation.gk)}
          maxCount={1}
          accentClass={accent}
        />
        <PlayerPicker
          label={`${teamName(team)} — Defenders (exactly 3)`}
          players={allPlayers}
          selectedIds={formation.def}
          onToggle={(id) => toggleDef(team, id)}
          disabledIds={takenIds.filter((id) => !formation.def.includes(id))}
          maxCount={3}
          accentClass={accent}
        />
        <PlayerPicker
          label={`${teamName(team)} — Attackers (exactly 3)`}
          players={allPlayers}
          selectedIds={formation.att}
          onToggle={(id) => toggleAtt(team, id)}
          disabledIds={takenIds.filter((id) => !formation.att.includes(id))}
          maxCount={3}
          accentClass={accent}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <p className="rounded-lg bg-red-tint px-3 py-2 text-sm text-red">{error}</p>
      )}

      {/* 1. Date */}
      <section className="space-y-2 rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-line">
        <label className="block text-sm font-medium text-ink">Match date</label>
        <input
          type="date"
          value={matchDate}
          onChange={(e) => setMatchDate(e.target.value)}
          disabled={isEdit}
          className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink outline-none focus:border-pitch focus:ring-1 focus:ring-pitch disabled:opacity-60"
        />
        {isEdit && (
          <p className="text-xs text-ink-muted">Date can&apos;t be changed once a match is entered.</p>
        )}
      </section>

      {/* 2 & 3. Team formations - 1 GK, 3 DEF, 3 ATT each (1-3-3) */}
      <section className="space-y-6 rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-line">
        <p className="text-sm font-semibold text-ink">Formation: 1-3-3 (Goalkeeper – Defenders – Attackers)</p>
        <FormationPickers team="A" formation={teamA} />
        <div className="border-t border-line pt-4">
          <FormationPickers team="B" formation={teamB} />
        </div>
      </section>

      {/* 4. Substitutes */}
      <section className="space-y-4 rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-line">
        <div>
          <PlayerPicker
            label={`${TEAM_A_NAME} — substitutes (optional, up to 2)`}
            players={allPlayers}
            selectedIds={teamASubs.map((s) => s.playerId)}
            onToggle={toggleSubA}
            disabledIds={takenIds.filter((id) => !teamASubs.some((s) => s.playerId === id))}
            maxCount={2}
            accentClass="border-pitch bg-pitch-tint"
          />
          {teamASubs.length > 0 && (
            <div className="mt-2 space-y-1">
              {teamASubs.map((s) => (
                <label key={s.playerId} className="flex items-center gap-2 text-sm text-ink">
                  <input
                    type="checkbox"
                    checked={s.played}
                    onChange={(e) =>
                      setTeamASubs((cur) =>
                        cur.map((x) => (x.playerId === s.playerId ? { ...x, played: e.target.checked } : x))
                      )
                    }
                  />
                  {playersById.get(s.playerId)?.name} played the match
                </label>
              ))}
            </div>
          )}
        </div>

        <div>
          <PlayerPicker
            label={`${TEAM_B_NAME} — substitutes (optional, up to 2)`}
            players={allPlayers}
            selectedIds={teamBSubs.map((s) => s.playerId)}
            onToggle={toggleSubB}
            disabledIds={takenIds.filter((id) => !teamBSubs.some((s) => s.playerId === id))}
            maxCount={2}
            accentClass="border-amber bg-amber-tint"
          />
          {teamBSubs.length > 0 && (
            <div className="mt-2 space-y-1">
              {teamBSubs.map((s) => (
                <label key={s.playerId} className="flex items-center gap-2 text-sm text-ink">
                  <input
                    type="checkbox"
                    checked={s.played}
                    onChange={(e) =>
                      setTeamBSubs((cur) =>
                        cur.map((x) => (x.playerId === s.playerId ? { ...x, played: e.target.checked } : x))
                      )
                    }
                  />
                  {playersById.get(s.playerId)?.name} played the match
                </label>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 5. Score */}
      <section className="rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-line">
        <p className="mb-2 text-sm font-medium text-ink">Final score</p>
        <div className="flex items-center justify-center gap-4">
          <div className="text-center">
            <p className="mb-1 text-xs font-medium text-ink-muted">{TEAM_A_NAME}</p>
            <input
              type="number"
              min={0}
              value={teamAScore}
              onChange={(e) => setTeamAScore(Math.max(0, Number(e.target.value)))}
              className="w-20 rounded-lg border border-line bg-bg px-3 py-2 text-center font-display text-2xl font-bold text-ink outline-none focus:border-pitch focus:ring-1 focus:ring-pitch"
            />
          </div>
          <span className="font-display text-2xl font-bold text-ink-muted">:</span>
          <div className="text-center">
            <p className="mb-1 text-xs font-medium text-ink-muted">{TEAM_B_NAME}</p>
            <input
              type="number"
              min={0}
              value={teamBScore}
              onChange={(e) => setTeamBScore(Math.max(0, Number(e.target.value)))}
              className="w-20 rounded-lg border border-line bg-bg px-3 py-2 text-center font-display text-2xl font-bold text-ink outline-none focus:border-pitch focus:ring-1 focus:ring-pitch"
            />
          </div>
        </div>
      </section>

      {/* 6. Goal scorers */}
      <section className="space-y-4 rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-line">
        <GoalEntryList
          team="A"
          teamLabel={TEAM_A_NAME}
          eligibleScorers={eligibleScorersA}
          opposingScorers={eligibleScorersB}
          entries={goalsA}
          onChange={setGoalsA}
          expectedCount={teamAScore}
        />
        <GoalEntryList
          team="B"
          teamLabel={TEAM_B_NAME}
          eligibleScorers={eligibleScorersB}
          opposingScorers={eligibleScorersA}
          entries={goalsB}
          onChange={setGoalsB}
          expectedCount={teamBScore}
        />
      </section>

      {/* 7 & 8. Preview + Save */}
      <section className="space-y-3 rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-line">
        {!liveValidation.ok && (
          <p className="rounded-lg bg-amber-tint px-3 py-2 text-sm text-ink">
            {liveValidation.error}
          </p>
        )}

        <button
          type="button"
          onClick={() => setShowPreview((v) => !v)}
          className="w-full rounded-lg px-4 py-2 text-sm font-medium text-pitch-dark ring-1 ring-line transition hover:bg-pitch-tint"
        >
          {showPreview ? "Hide preview" : "Preview match"}
        </button>

        {showPreview && (
          <div className="rounded-lg border border-line bg-bg p-4">
            <p className="text-center font-display text-2xl font-bold text-ink">
              {teamAScore} : {teamBScore}
            </p>
            <p className="mt-1 text-center text-sm text-ink-muted">{matchDate} · 1-3-3</p>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="mb-1 font-medium text-ink">{TEAM_A_NAME}</p>
                <ul className="space-y-0.5 text-ink-muted">
                  {teamA.gk !== null && <li>GK: {playersById.get(teamA.gk)?.name}</li>}
                  {teamA.def.map((id) => <li key={id}>DEF: {playersById.get(id)?.name}</li>)}
                  {teamA.att.map((id) => <li key={id}>ATT: {playersById.get(id)?.name}</li>)}
                  {teamASubs.map((s) => <li key={s.playerId}>{playersById.get(s.playerId)?.name} (sub{!s.played && ", did not play"})</li>)}
                </ul>
              </div>
              <div>
                <p className="mb-1 font-medium text-ink">{TEAM_B_NAME}</p>
                <ul className="space-y-0.5 text-ink-muted">
                  {teamB.gk !== null && <li>GK: {playersById.get(teamB.gk)?.name}</li>}
                  {teamB.def.map((id) => <li key={id}>DEF: {playersById.get(id)?.name}</li>)}
                  {teamB.att.map((id) => <li key={id}>ATT: {playersById.get(id)?.name}</li>)}
                  {teamBSubs.map((s) => <li key={s.playerId}>{playersById.get(s.playerId)?.name} (sub{!s.played && ", did not play"})</li>)}
                </ul>
              </div>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !liveValidation.ok}
          className="w-full rounded-lg bg-pitch px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-pitch-dark disabled:opacity-50"
        >
          {saving ? "Saving…" : isEdit ? "Save changes" : "Save match"}
        </button>
      </section>
    </div>
  );
}
