import { db, pool } from "../src/db";
import { players } from "../src/db/schema";
import { createMatch } from "../src/lib/matchService";
import { calculatePlayerStats, calculatePlayerMatchHistory, calculateLeaderboard } from "../src/lib/stats";
import type { MatchInput } from "../src/lib/matchValidation";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`ASSERTION FAILED: ${msg}`);
  console.log(`PASS: ${msg}`);
}

/** Assigns a valid 1-3-3 formation (GK, 3xDEF, 3xATT) by index for a 7-player starter array. */
function withPositions(ids: number[], team: "A" | "B") {
  const positions: ("GK" | "DEF" | "ATT")[] = ["GK", "DEF", "DEF", "DEF", "ATT", "ATT", "ATT"];
  return ids.map((id, i) => ({
    playerId: id,
    team,
    role: "starter" as const,
    position: positions[i] ?? ("ATT" as const),
    played: true,
  }));
}

async function resetTables() {
  await pool.query("TRUNCATE TABLE goals, match_players, matches, players RESTART IDENTITY CASCADE;");
}

async function main() {
  await resetTables();

  const names = Array.from({ length: 16 }, (_, i) => `Player ${i + 1}`);
  const inserted = await db
    .insert(players)
    .values(names.map((name) => ({ name, playerType: "regular" as const })))
    .returning();
  const ids = inserted.map((p) => p.id);
  const teamA = ids.slice(0, 7);
  const teamB = ids.slice(7, 14);
  const sub = ids[14];

  function starterInput(matchDate: string, teamAScore: number, teamBScore: number, extra: Partial<MatchInput> = {}): MatchInput {
    return {
      matchDate,
      teamAScore,
      teamBScore,
      players: [
        ...withPositions(teamA, "A"),
        ...withPositions(teamB, "B"),
      ],
      goals: [],
      ...extra,
    };
  }

  // Match 1: 2026-01-01, A wins 2-0 (A's player[0] scores both)
  await createMatch(
    starterInput("2026-01-01", 2, 0, {
      goals: [
        { playerId: teamA[0], team: "A" },
        { playerId: teamA[0], team: "A" },
      ],
    })
  );

  // Match 2: 2026-01-02, draw 1-1
  await createMatch(
    starterInput("2026-01-02", 1, 1, {
      goals: [
        { playerId: teamA[1], team: "A" },
        { playerId: teamB[0], team: "B" },
      ],
    })
  );

  // Match 3: 2026-01-03, A player[0] absent (sub covers), B wins 0-3
  await createMatch({
    matchDate: "2026-01-03",
    teamAScore: 0,
    teamBScore: 3,
    players: [
      ...withPositions([...teamA.slice(1), sub], "A"),
      ...withPositions(teamB, "B"),
    ],
    goals: [
      { playerId: teamB[0], team: "B" },
      { playerId: teamB[0], team: "B" },
      { playerId: teamB[1], team: "B" },
    ],
  });

  // --- Test: teamA[0] stats (played matches 1 and 2, absent from match 3) ---
  const statsA0 = await calculatePlayerStats(teamA[0]);
  assert(statsA0.matchesPlayed === 2, `teamA[0] matchesPlayed=2 (got ${statsA0.matchesPlayed})`);
  assert(statsA0.wins === 1, `teamA[0] wins=1 (got ${statsA0.wins})`);
  assert(statsA0.draws === 1, `teamA[0] draws=1 (got ${statsA0.draws})`);
  assert(statsA0.losses === 0, `teamA[0] losses=0 (got ${statsA0.losses})`);
  assert(statsA0.goals === 2, `teamA[0] goals=2 (got ${statsA0.goals})`);
  assert(statsA0.winPercentage === 50, `teamA[0] winPercentage=50 (got ${statsA0.winPercentage})`);
  assert(statsA0.lastMatchDate === "2026-01-02", `teamA[0] lastMatchDate=2026-01-02 (got ${statsA0.lastMatchDate})`);
  assert(statsA0.lastResult === "draw", `teamA[0] lastResult=draw (got ${statsA0.lastResult})`);

  // --- Test: teamB[0] stats (played all 3 matches: loss, draw, win) ---
  const statsB0 = await calculatePlayerStats(teamB[0]);
  assert(statsB0.matchesPlayed === 3, `teamB[0] matchesPlayed=3 (got ${statsB0.matchesPlayed})`);
  assert(statsB0.wins === 1, `teamB[0] wins=1 (got ${statsB0.wins})`);
  assert(statsB0.draws === 1, `teamB[0] draws=1 (got ${statsB0.draws})`);
  assert(statsB0.losses === 1, `teamB[0] losses=1 (got ${statsB0.losses})`);
  assert(statsB0.goals === 3, `teamB[0] goals=3 (1 in match 2 + 2 in match 3) (got ${statsB0.goals})`);
  assert(statsB0.lastMatchDate === "2026-01-03", `teamB[0] lastMatchDate=2026-01-03 (got ${statsB0.lastMatchDate})`);
  assert(statsB0.lastResult === "win", `teamB[0] lastResult=win (got ${statsB0.lastResult})`);

  // --- Test: sub who covered match 3 as a starter should count that match ---
  const statsSub = await calculatePlayerStats(sub);
  assert(statsSub.matchesPlayed === 1, `sub matchesPlayed=1 (got ${statsSub.matchesPlayed})`);
  assert(statsSub.losses === 1, `sub losses=1 (got ${statsSub.losses})`);

  // --- Test: a player never in any match has zero stats, not an error ---
  const neverPlayedId = ids[15];
  const statsNever = await calculatePlayerStats(neverPlayedId);
  assert(statsNever.matchesPlayed === 0, "never-played player has matchesPlayed=0");
  assert(statsNever.winPercentage === 0, "never-played player has winPercentage=0 (not NaN/error)");
  assert(statsNever.lastMatchDate === null, "never-played player has lastMatchDate=null");

  // --- Test: match history for teamA[0] is ordered most-recent-first ---
  const historyA0 = await calculatePlayerMatchHistory(teamA[0]);
  assert(historyA0.length === 2, `teamA[0] history length=2 (got ${historyA0.length})`);
  assert(historyA0[0].matchDate === "2026-01-02", "teamA[0] history[0] is the most recent match (2026-01-02)");
  assert(historyA0[1].matchDate === "2026-01-01", "teamA[0] history[1] is the older match (2026-01-01)");
  assert(historyA0[0].goalsScored === 0, "teamA[0] scored 0 goals in the 2026-01-02 match");
  assert(historyA0[1].goalsScored === 2, "teamA[0] scored 2 goals in the 2026-01-01 match");

  // --- Test: leaderboard sorts by wins descending ---
  const leaderboard = await calculateLeaderboard("wins", { includeInactive: true });
  const top = leaderboard[0];
  assert(top.wins >= leaderboard[leaderboard.length - 1].wins, "leaderboard sorted descending by wins");
  const sortedCheck = leaderboard.every((entry, i) => i === 0 || leaderboard[i - 1].wins >= entry.wins);
  assert(sortedCheck, "leaderboard strictly non-increasing by wins across all entries");

  // --- Test: leaderboard sorts by goals descending ---
  const goalLeaderboard = await calculateLeaderboard("goals", { includeInactive: true });
  const goalSortedCheck = goalLeaderboard.every((entry, i) => i === 0 || goalLeaderboard[i - 1].goals >= entry.goals);
  assert(goalSortedCheck, "leaderboard strictly non-increasing by goals across all entries");

  console.log("\nALL STATS ENGINE TESTS PASSED");
}

main()
  .then(() => pool.end())
  .catch((err) => {
    console.error(err);
    pool.end();
    process.exit(1);
  });
