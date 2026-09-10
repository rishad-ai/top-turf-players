"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PlayerPicker, type PickablePlayer } from "./PlayerPicker";
import { GoalEntryList, type GoalEntry, type EligibleScorer } from "./GoalEntryList";
import {
  validateMatchInput,
  type MatchInput,
  type MatchPlayerInput,
  type GoalInput,
} from "@/lib/matchValidation";

type SubEntry = { playerId: number; played: boolean };

export type MatchFormInitial = {
  matchId?: number;
  matchDate: string;
  teamAScore: number;
  teamBScore: number;
  teamAStarters: number[];
  teamBStarters: number[];
  teamASubs: SubEntry[];
  teamBSubs: SubEntry[];
  goalsA: { playerId: number; minute: number | null }[];
  goalsB: { playerId: number; minute: number | null }[];
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function MatchForm({
  allPlayers,
  initial,
}: {
  allPlayers: PickablePlayer[];
  initial?: MatchFormInitial;
}) {
  const router = useRouter();
  const isEdit = Boolean(initial?.matchId);

  const [matchDate, setMatchDate] = useState(initial?.matchDate || todayISO());
  const [teamAStarters, setTeamAStarters] = useState<number[]>(initial?.teamAStarters || []);
  const [teamBStarters, setTeamBStarters] = useState<number[]>(initial?.teamBStarters || []);
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

  function toggleTeamA(id: number) {
    setTeamAStarters((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  }
  function toggleTeamB(id: number) {
    setTeamBStarters((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  }
  function toggleSubA(id: number) {
    setTeamASubs((cur) =>
      cur.some((s) => s.playerId === id)
        ? cur.filter((s) => s.playerId !== id)
        : [...cur, { playerId: id, played: true }]
    );
  }
  function toggleSubB(id: number) {
    setTeamBSubs((cur) =>
      cur.some((s) => s.playerId === id)
        ? cur.filter((s) => s.playerId !== id)
        : [...cur, { playerId: id, played: true }]
    );
  }

  const takenIds = useMemo(
    () => [
      ...teamAStarters,
      ...teamBStarters,
      ...teamASubs.map((s) => s.playerId),
      ...teamBSubs.map((s) => s.playerId),
    ],
    [teamAStarters, teamBStarters, teamASubs, teamBSubs]
  );

  const playersById = useMemo(() => {
    const m = new Map<number, PickablePlayer>();
    for (const p of allPlayers) m.set(p.id, p);
    return m;
  }, [allPlayers]);

  const eligibleScorersA: EligibleScorer[] = useMemo(() => {
    const list: EligibleScorer[] = teamAStarters.map((id) => ({
      playerId: id,
      name: playersById.get(id)?.name || `#${id}`,
      team: "A" as const,
    }));
    for (const s of teamASubs) {
      if (s.played) {
        list.push({ playerId: s.playerId, name: playersById.get(s.playerId)?.name || `#${s.playerId}`, team: "A" });
      }
    }
    return list;
  }, [teamAStarters, teamASubs, playersById]);

  const eligibleScorersB: EligibleScorer[] = useMemo(() => {
    const list: EligibleScorer[] = teamBStarters.map((id) => ({
      playerId: id,
      name: playersById.get(id)?.name || `#${id}`,
      team: "B" as const,
    }));
    for (const s of teamBSubs) {
      if (s.played) {
        list.push({ playerId: s.playerId, name: playersById.get(s.playerId)?.name || `#${s.playerId}`, team: "B" });
      }
    }
    return list;
  }, [teamBStarters, teamBSubs, playersById]);

  function buildMatchInput(): MatchInput {
    const matchPlayers: MatchPlayerInput[] = [
      ...teamAStarters.map((id) => ({ playerId: id, team: "A" as const, role: "starter" as const, played: true })),
      ...teamBStarters.map((id) => ({ playerId: id, team: "B" as const, role: "starter" as const, played: true })),
      ...teamASubs.map((s) => ({ playerId: s.playerId, team: "A" as const, role: "substitute" as const, played: s.played })),
      ...teamBSubs.map((s) => ({ playerId: s.playerId, team: "B" as const, role: "substitute" as const, played: s.played })),
    ];

    const goals: GoalInput[] = [
      ...goalsA.filter((g) => g.playerId).map((g) => ({ playerId: g.playerId as number, team: "A" as const, minute: g.minute })),
      ...goalsB.filter((g) => g.playerId).map((g) => ({ playerId: g.playerId as number, team: "B" as const, minute: g.minute })),
    ];

    return { matchDate, teamAScore, teamBScore, players: matchPlayers, goals };
  }

  const liveValidation = useMemo(() => validateMatchInput(buildMatchInput()), [
    matchDate,
    teamAStarters,
    teamBStarters,
    teamASubs,
    teamBSubs,
    teamAScore,
    teamBScore,
    goalsA,
    goalsB,
  ]);

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

    router.push("/admin/matches");
    router.refresh();
  }

  const availableForA = allPlayers;
  const availableForB = allPlayers;
  const availableForSubA = allPlayers;
  const availableForSubB = allPlayers;

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

      {/* 2 & 3. Team selection */}
      <section className="space-y-4 rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-line">
        <PlayerPicker
          label="Team A — starters (exactly 7)"
          players={availableForA}
          selectedIds={teamAStarters}
          onToggle={toggleTeamA}
          disabledIds={takenIds.filter((id) => !teamAStarters.includes(id))}
          maxCount={7}
          accentClass="border-pitch bg-pitch-tint"
        />
        <PlayerPicker
          label="Team B — starters (exactly 7)"
          players={availableForB}
          selectedIds={teamBStarters}
          onToggle={toggleTeamB}
          disabledIds={takenIds.filter((id) => !teamBStarters.includes(id))}
          maxCount={7}
          accentClass="border-amber bg-amber-tint"
        />
      </section>

      {/* 4. Substitutes */}
      <section className="space-y-4 rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-line">
        <div>
          <PlayerPicker
            label="Team A — substitutes (optional, up to 2)"
            players={availableForSubA}
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
            label="Team B — substitutes (optional, up to 2)"
            players={availableForSubB}
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
            <p className="mb-1 text-xs font-medium text-ink-muted">Team A</p>
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
            <p className="mb-1 text-xs font-medium text-ink-muted">Team B</p>
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
          teamLabel="Team A"
          eligibleScorers={eligibleScorersA}
          entries={goalsA}
          onChange={setGoalsA}
          expectedCount={teamAScore}
        />
        <GoalEntryList
          team="B"
          teamLabel="Team B"
          eligibleScorers={eligibleScorersB}
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
            <p className="mt-1 text-center text-sm text-ink-muted">{matchDate}</p>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="mb-1 font-medium text-ink">Team A ({teamAStarters.length} + {teamASubs.length} subs)</p>
                <ul className="space-y-0.5 text-ink-muted">
                  {teamAStarters.map((id) => <li key={id}>{playersById.get(id)?.name}</li>)}
                  {teamASubs.map((s) => <li key={s.playerId}>{playersById.get(s.playerId)?.name} (sub{!s.played && ", did not play"})</li>)}
                </ul>
              </div>
              <div>
                <p className="mb-1 font-medium text-ink">Team B ({teamBStarters.length} + {teamBSubs.length} subs)</p>
                <ul className="space-y-0.5 text-ink-muted">
                  {teamBStarters.map((id) => <li key={id}>{playersById.get(id)?.name}</li>)}
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
