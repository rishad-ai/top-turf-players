import { db, pool } from "../src/db";
import { players } from "../src/db/schema";
import { createMatch, getMatchDetail } from "../src/lib/matchService";
import { calculatePlayerStats } from "../src/lib/stats";
import { validateMatchInput, type MatchInput } from "../src/lib/matchValidation";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`ASSERTION FAILED: ${msg}`);
  console.log(`PASS: ${msg}`);
}

function withPositions(ids: number[], team: "A" | "B") {
  const pos: ("GK" | "DEF" | "ATT")[] = ["GK", "DEF", "DEF", "DEF", "ATT", "ATT", "ATT"];
  return ids.map((id, i) => ({
    playerId: id,
    team,
    role: "starter" as const,
    position: pos[i] ?? ("ATT" as const),
    played: true,
  }));
}

async function main() {
  await pool.query("TRUNCATE TABLE goals, match_players, matches, players RESTART IDENTITY CASCADE;");

  const inserted = await db
    .insert(players)
    .values(Array.from({ length: 14 }, (_, i) => ({ name: `P${i + 1}`, playerType: "regular" as const })))
    .returning();
  const ids = inserted.map((p) => p.id);
  const A = ids.slice(0, 7);
  const B = ids.slice(7, 14);

  // River Side (A) win 2-1. Of A's 2 goals, one is a NORMAL goal by A's striker (A[4]),
  // and one is an OWN GOAL scored by a B defender (B[1]) - it counts for A's score.
  // B's 1 goal is a normal goal by B's striker (B[4]).
  const input: MatchInput = {
    matchDate: "2026-06-01",
    teamAScore: 2,
    teamBScore: 1,
    players: [...withPositions(A, "A"), ...withPositions(B, "B")],
    goals: [
      { playerId: A[4], team: "A", isOwnGoal: false },        // normal A goal
      { playerId: B[1], team: "A", isOwnGoal: true },          // own goal by B player, counts for A
      { playerId: B[4], team: "B", isOwnGoal: false },        // normal B goal
    ],
  };

  // Validation should accept it.
  const v = validateMatchInput(input);
  assert(v.ok, "match with an own goal passes validation");

  const matchId = await createMatch(input);
  const detail = await getMatchDetail(matchId);
  assert(detail !== null, "match created");
  assert(detail!.match.teamAScore === 2 && detail!.match.teamBScore === 1, "scoreboard is 2-1");
  assert(detail!.goals.length === 3, "3 goal rows stored");
  assert(detail!.goals.filter((g) => g.isOwnGoal).length === 1, "exactly one goal flagged as own goal");

  // A's striker (normal scorer) gets 1 personal goal.
  const strikerA = await calculatePlayerStats(A[4]);
  assert(strikerA.goals === 1, `A striker has 1 personal goal (got ${strikerA.goals})`);

  // B's defender who scored the own goal gets 0 personal goals (own goals don't count).
  const ownGoalScorer = await calculatePlayerStats(B[1]);
  assert(ownGoalScorer.goals === 0, `own-goal scorer has 0 personal goals (got ${ownGoalScorer.goals})`);

  // B's striker gets 1 personal goal.
  const strikerB = await calculatePlayerStats(B[4]);
  assert(strikerB.goals === 1, `B striker has 1 personal goal (got ${strikerB.goals})`);

  // Results: A won, so A players are 'win', B players are 'loss'.
  assert(strikerA.wins === 1, "A striker credited a win");
  assert(strikerB.losses === 1, "B striker credited a loss");
  assert(ownGoalScorer.losses === 1, "own-goal scorer (on B) credited a loss");

  // --- Rejection: an own goal credited to a player on the SAME side is invalid ---
  const bad: MatchInput = {
    ...input,
    matchDate: "2026-06-02",
    goals: [
      { playerId: A[4], team: "A", isOwnGoal: false },
      { playerId: A[5], team: "A", isOwnGoal: true },  // A player own-goal FOR team A = nonsense
      { playerId: B[4], team: "B", isOwnGoal: false },
    ],
  };
  const bv = validateMatchInput(bad);
  assert(!bv.ok, "own goal credited to a same-side player is rejected");

  console.log("\nALL OWN-GOAL TESTS PASSED");
}

main()
  .then(() => pool.end())
  .catch((err) => {
    console.error(err);
    pool.end();
    process.exit(1);
  });
