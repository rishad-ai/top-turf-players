export type MatchPlayerInput = {
  playerId: number;
  team: "A" | "B";
  role: "starter" | "substitute";
  played: boolean; // for substitutes: whether they actually played
};

export type GoalInput = {
  playerId: number;
  team: "A" | "B";
  minute?: number | null;
};

export type MatchInput = {
  matchDate: string; // YYYY-MM-DD
  teamAScore: number;
  teamBScore: number;
  players: MatchPlayerInput[];
  goals: GoalInput[];
};

export type ValidationResult = { ok: true } | { ok: false; error: string };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function validateMatchInput(input: MatchInput): ValidationResult {
  // --- Date ---
  if (!input.matchDate || !DATE_RE.test(input.matchDate)) {
    return { ok: false, error: "A valid match date (YYYY-MM-DD) is required." };
  }

  // --- Scores ---
  if (
    !Number.isInteger(input.teamAScore) ||
    !Number.isInteger(input.teamBScore) ||
    input.teamAScore < 0 ||
    input.teamBScore < 0
  ) {
    return { ok: false, error: "Scores must be whole numbers and cannot be negative." };
  }

  // --- Players: split by team/role ---
  const teamA = input.players.filter((p) => p.team === "A");
  const teamB = input.players.filter((p) => p.team === "B");

  const teamAStarters = teamA.filter((p) => p.role === "starter");
  const teamBStarters = teamB.filter((p) => p.role === "starter");
  const teamASubs = teamA.filter((p) => p.role === "substitute");
  const teamBSubs = teamB.filter((p) => p.role === "substitute");

  if (teamAStarters.length !== 7) {
    return { ok: false, error: `Team A must have exactly 7 starters (has ${teamAStarters.length}).` };
  }
  if (teamBStarters.length !== 7) {
    return { ok: false, error: `Team B must have exactly 7 starters (has ${teamBStarters.length}).` };
  }
  if (teamASubs.length > 2) {
    return { ok: false, error: "Team A cannot have more than 2 substitutes." };
  }
  if (teamBSubs.length > 2) {
    return { ok: false, error: "Team B cannot have more than 2 substitutes." };
  }

  // --- No duplicate players anywhere in the match (also prevents a player on both teams) ---
  const allPlayerIds = input.players.map((p) => p.playerId);
  const uniqueIds = new Set(allPlayerIds);
  if (uniqueIds.size !== allPlayerIds.length) {
    return { ok: false, error: "A player cannot appear more than once in the same match (or be selected on both teams)." };
  }

  if (allPlayerIds.length === 0) {
    return { ok: false, error: "At least the starters must be selected." };
  }

  // --- Goal scorers must be players who actually played, on the correct team ---
  const playedPlayerTeams = new Map<number, "A" | "B">();
  for (const p of input.players) {
    const actuallyPlayed = p.role === "starter" ? true : p.played;
    if (actuallyPlayed) playedPlayerTeams.set(p.playerId, p.team);
  }

  for (const g of input.goals) {
    if (!Number.isInteger(g.playerId)) {
      return { ok: false, error: "Each goal must reference a player." };
    }
    const team = playedPlayerTeams.get(g.playerId);
    if (!team) {
      return { ok: false, error: "A goal scorer must be a player who actually played in this match." };
    }
    if (team !== g.team) {
      return { ok: false, error: "A goal's team must match the scoring player's actual team." };
    }
    if (g.minute !== undefined && g.minute !== null) {
      if (!Number.isInteger(g.minute) || g.minute < 0 || g.minute > 120) {
        return { ok: false, error: "Goal minute must be a whole number between 0 and 120." };
      }
    }
  }

  // --- Total goal entries must equal each team's final score ---
  const teamAGoalCount = input.goals.filter((g) => g.team === "A").length;
  const teamBGoalCount = input.goals.filter((g) => g.team === "B").length;

  if (teamAGoalCount !== input.teamAScore) {
    return {
      ok: false,
      error: `Team A has ${input.teamAScore} goals on the scoreboard but ${teamAGoalCount} scorer entries. They must match.`,
    };
  }
  if (teamBGoalCount !== input.teamBScore) {
    return {
      ok: false,
      error: `Team B has ${input.teamBScore} goals on the scoreboard but ${teamBGoalCount} scorer entries. They must match.`,
    };
  }

  return { ok: true };
}

/** Computes each match_player row's result from the final scoreline. */
export function computeResult(
  team: "A" | "B",
  teamAScore: number,
  teamBScore: number
): "win" | "loss" | "draw" {
  if (teamAScore === teamBScore) return "draw";
  const teamAWon = teamAScore > teamBScore;
  if (team === "A") return teamAWon ? "win" : "loss";
  return teamAWon ? "loss" : "win";
}
