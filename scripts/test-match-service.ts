import { db, pool } from "../src/db";
import { players, matches, matchPlayers, goals } from "../src/db/schema";
import { eq } from "drizzle-orm";
import {
  createMatch,
  updateMatch,
  deleteMatch,
  getMatchDetail,
  MatchValidationError,
  DuplicateMatchDateError,
} from "../src/lib/matchService";
import type { MatchInput } from "../src/lib/matchValidation";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`ASSERTION FAILED: ${msg}`);
  console.log(`PASS: ${msg}`);
}

async function resetTables() {
  await pool.query("TRUNCATE TABLE goals, match_players, matches, players RESTART IDENTITY CASCADE;");
}

async function main() {
  await resetTables();

  // Create 16 players: 14 starters (7v7) + 2 subs, plus one irregular
  const names = Array.from({ length: 16 }, (_, i) => `Player ${i + 1}`);
  const inserted = await db
    .insert(players)
    .values(names.map((name) => ({ name, playerType: "regular" as const })))
    .returning();

  const ids = inserted.map((p) => p.id);
  const teamAStarters = ids.slice(0, 7);
  const teamBStarters = ids.slice(7, 14);
  const sub1 = ids[14];
  const sub2 = ids[15];

  function buildBasicInput(overrides: Partial<MatchInput> = {}): MatchInput {
    return {
      matchDate: "2026-01-01",
      teamAScore: 3,
      teamBScore: 1,
      players: [
        ...teamAStarters.map((id) => ({
          playerId: id,
          team: "A" as const,
          role: "starter" as const,
          played: true,
        })),
        ...teamBStarters.map((id) => ({
          playerId: id,
          team: "B" as const,
          role: "starter" as const,
          played: true,
        })),
      ],
      goals: [
        { playerId: teamAStarters[0], team: "A", minute: 10 },
        { playerId: teamAStarters[0], team: "A", minute: 20 },
        { playerId: teamAStarters[1], team: "A", minute: 30 },
        { playerId: teamBStarters[0], team: "B", minute: 40 },
      ],
      ...overrides,
    };
  }

  // --- Test 1: valid match creates successfully ---
  const validInput = buildBasicInput();
  const matchId = await createMatch(validInput);
  assert(typeof matchId === "number", "valid match creates and returns an id");

  const detail = await getMatchDetail(matchId);
  assert(detail !== null, "match detail is retrievable after creation");
  assert(detail!.matchPlayers.length === 14, "14 match_players rows created (7+7 starters)");
  assert(detail!.goals.length === 4, "4 goal rows created");

  const teamAResults = detail!.matchPlayers.filter((mp) => mp.team === "A");
  const teamBResults = detail!.matchPlayers.filter((mp) => mp.team === "B");
  assert(teamAResults.every((mp) => mp.result === "win"), "Team A (3-1 winner) all marked as win");
  assert(teamBResults.every((mp) => mp.result === "loss"), "Team B (3-1 loser) all marked as loss");

  // --- Test 2: duplicate date rejected at service layer ---
  let duplicateDateRejected = false;
  try {
    await createMatch(buildBasicInput({ matchDate: "2026-01-01" }));
  } catch (err) {
    duplicateDateRejected = err instanceof DuplicateMatchDateError;
  }
  assert(duplicateDateRejected, "duplicate match_date rejected with DuplicateMatchDateError");

  // --- Test 3: fewer than 7 starters on a team rejected ---
  let tooFewStartersRejected = false;
  try {
    await createMatch(
      buildBasicInput({
        matchDate: "2026-01-02",
        players: [
          ...teamAStarters.slice(0, 6).map((id) => ({
            playerId: id,
            team: "A" as const,
            role: "starter" as const,
            played: true,
          })),
          ...teamBStarters.map((id) => ({
            playerId: id,
            team: "B" as const,
            role: "starter" as const,
            played: true,
          })),
        ],
        goals: [],
        teamAScore: 0,
        teamBScore: 0,
      })
    );
  } catch (err) {
    tooFewStartersRejected = err instanceof MatchValidationError;
  }
  assert(tooFewStartersRejected, "fewer than 7 starters on Team A rejected");

  // --- Test 4: exactly 2 subs is allowed (sanity check) ---
  let tooManySubsRejected = false;
  try {
    await createMatch(
      buildBasicInput({
        matchDate: "2026-01-03",
        players: [
          ...teamAStarters.map((id) => ({
            playerId: id,
            team: "A" as const,
            role: "starter" as const,
            played: true,
          })),
          ...teamBStarters.map((id) => ({
            playerId: id,
            team: "B" as const,
            role: "starter" as const,
            played: true,
          })),
          { playerId: sub1, team: "A" as const, role: "substitute" as const, played: true },
          { playerId: sub2, team: "A" as const, role: "substitute" as const, played: true },
        ],
        goals: [],
        teamAScore: 0,
        teamBScore: 0,
      })
    );
  } catch {
    tooManySubsRejected = false;
  }
  assert(tooManySubsRejected === false, "exactly 2 subs on a team is allowed (sanity check)");

  // --- Test 5: player on both teams rejected ---
  let dupPlayerRejected = false;
  try {
    await createMatch(
      buildBasicInput({
        matchDate: "2026-01-04",
        players: [
          ...teamAStarters.map((id) => ({
            playerId: id,
            team: "A" as const,
            role: "starter" as const,
            played: true,
          })),
          ...teamBStarters.slice(0, 6).map((id) => ({
            playerId: id,
            team: "B" as const,
            role: "starter" as const,
            played: true,
          })),
          { playerId: teamAStarters[0], team: "B" as const, role: "starter" as const, played: true },
        ],
        goals: [],
        teamAScore: 0,
        teamBScore: 0,
      })
    );
  } catch (err) {
    dupPlayerRejected = err instanceof MatchValidationError;
  }
  assert(dupPlayerRejected, "player appearing on both teams rejected");

  // --- Test 6: negative score rejected ---
  let negativeScoreRejected = false;
  try {
    await createMatch(buildBasicInput({ matchDate: "2026-01-05", teamAScore: -1 }));
  } catch (err) {
    negativeScoreRejected = err instanceof MatchValidationError;
  }
  assert(negativeScoreRejected, "negative score rejected");

  // --- Test 7: goal count mismatch rejected ---
  let goalMismatchRejected = false;
  try {
    await createMatch(
      buildBasicInput({
        matchDate: "2026-01-06",
        teamAScore: 5,
      })
    );
  } catch (err) {
    goalMismatchRejected = err instanceof MatchValidationError;
  }
  assert(goalMismatchRejected, "goal entry count mismatch with scoreboard rejected");

  // --- Test 8: goal scorer must have actually played ---
  let unplayedScorerRejected = false;
  try {
    await createMatch(
      buildBasicInput({
        matchDate: "2026-01-07",
        goals: [
          { playerId: sub1, team: "A", minute: 5 },
          { playerId: teamAStarters[0], team: "A" },
          { playerId: teamAStarters[1], team: "A" },
          { playerId: teamBStarters[0], team: "B" },
        ],
      })
    );
  } catch (err) {
    unplayedScorerRejected = err instanceof MatchValidationError;
  }
  assert(unplayedScorerRejected, "goal scorer who didn't play rejected");

  // --- Test 9: substitute marked played=false does not count as having played ---
  let subNotPlayedScorerRejected = false;
  try {
    await createMatch(
      buildBasicInput({
        matchDate: "2026-01-08",
        players: [
          ...teamAStarters.map((id) => ({
            playerId: id,
            team: "A" as const,
            role: "starter" as const,
            played: true,
          })),
          ...teamBStarters.map((id) => ({
            playerId: id,
            team: "B" as const,
            role: "starter" as const,
            played: true,
          })),
          { playerId: sub1, team: "A" as const, role: "substitute" as const, played: false },
        ],
        goals: [
          { playerId: sub1, team: "A", minute: 5 },
          { playerId: teamAStarters[0], team: "A" },
          { playerId: teamAStarters[1], team: "A" },
          { playerId: teamBStarters[0], team: "B" },
        ],
      })
    );
  } catch (err) {
    subNotPlayedScorerRejected = err instanceof MatchValidationError;
  }
  assert(subNotPlayedScorerRejected, "substitute with played=false cannot be credited a goal");

  // --- Test 10: DB-level unique constraint still enforced even bypassing service ---
  let dbLevelRejected = false;
  try {
    await pool.query(
      "INSERT INTO matches (match_date, team_a_score, team_b_score) VALUES ($1, $2, $3)",
      ["2026-01-01", 9, 9]
    );
  } catch (err) {
    dbLevelRejected = err instanceof Error && err.message.includes("duplicate key value");
  }
  assert(dbLevelRejected, "DB-level unique constraint on match_date still enforced directly");

  // --- Test 11: editing a match recomputes results (draw scenario) ---
  await updateMatch(
    matchId,
    buildBasicInput({
      matchDate: "2026-01-01",
      teamAScore: 2,
      teamBScore: 2,
      goals: [
        { playerId: teamAStarters[0], team: "A" },
        { playerId: teamAStarters[1], team: "A" },
        { playerId: teamBStarters[0], team: "B" },
        { playerId: teamBStarters[1], team: "B" },
      ],
    })
  );
  const updatedDetail = await getMatchDetail(matchId);
  assert(
    updatedDetail!.matchPlayers.every((mp) => mp.result === "draw"),
    "editing match to a 2-2 scoreline recomputes all rows to draw"
  );
  assert(updatedDetail!.goals.length === 4, "editing match replaces goal rows correctly (4 goals for 2-2)");

  // --- Test 12: deleting a match cascades to match_players and goals ---
  const beforeDeletePlayers = await db.select().from(matchPlayers).where(eq(matchPlayers.matchId, matchId));
  const beforeDeleteGoals = await db.select().from(goals).where(eq(goals.matchId, matchId));
  assert(beforeDeletePlayers.length > 0, "sanity: match has match_players rows before delete");
  assert(beforeDeleteGoals.length > 0, "sanity: match has goal rows before delete");

  await deleteMatch(matchId);
  const deletedDetail = await getMatchDetail(matchId);
  assert(deletedDetail === null, "deleted match no longer retrievable");
  const orphanPlayers = await db.select().from(matchPlayers).where(eq(matchPlayers.matchId, matchId));
  const orphanGoals = await db.select().from(goals).where(eq(goals.matchId, matchId));
  assert(orphanPlayers.length === 0, "deleting match cascades to remove its match_players rows");
  assert(orphanGoals.length === 0, "deleting match cascades to remove its goals rows");

  console.log("\nALL MATCH SERVICE TESTS PASSED");
}

main()
  .then(() => pool.end())
  .catch((err) => {
    console.error(err);
    pool.end();
    process.exit(1);
  });
