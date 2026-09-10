import { db, pool } from "../src/db";
import { players } from "../src/db/schema";
import { createMatch } from "../src/lib/matchService";
import {
  calculateWinningStreak,
  calculateLongestWinningStreak,
  calculateLosingStreak,
  calculateLongestLosingStreak,
} from "../src/lib/streaks";
import type { MatchInput } from "../src/lib/matchValidation";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`ASSERTION FAILED: ${msg}`);
  console.log(`PASS: ${msg}`);
}

function goalsFor(count: number, playerId: number, team: "A" | "B") {
  return Array.from({ length: count }, () => ({ playerId, team }));
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

async function resetMatches() {
  await pool.query("TRUNCATE TABLE goals, match_players, matches RESTART IDENTITY CASCADE;");
}

async function main() {
  await pool.query("TRUNCATE TABLE goals, match_players, matches, players RESTART IDENTITY CASCADE;");

  const names = Array.from({ length: 16 }, (_, i) => `Player ${i + 1}`);
  const inserted = await db
    .insert(players)
    .values(
      names.map((name, i) => ({
        name,
        playerType: i === 14 ? ("irregular" as const) : ("regular" as const),
        createdAt: new Date("2025-12-01T00:00:00Z"),
      }))
    )
    .returning();
  const ids = inserted.map((p) => p.id);
  const teamA = ids.slice(0, 7);
  const teamB = ids.slice(7, 14);
  const irregular = ids[14];
  const spare = ids[15];
  const regularSubject = teamA[0];

  function match(matchDate: string, teamAScore: number, teamBScore: number, aPlayers = teamA, bPlayers = teamB): MatchInput {
    return {
      matchDate,
      teamAScore,
      teamBScore,
      players: [
        ...withPositions(aPlayers, "A"),
        ...withPositions(bPlayers, "B"),
      ],
      goals: [
        ...goalsFor(teamAScore, aPlayers[0], "A"),
        ...goalsFor(teamBScore, bPlayers[0], "B"),
      ],
    };
  }

  // ===================== WINNING STREAK (absence skipped, not reset) =====================
  await createMatch(match("2026-01-01", 0, 2)); // B wins
  await createMatch(match("2026-01-02", 1, 3)); // B wins
  const day3TeamB = [spare, ...teamB.slice(1)];
  await createMatch(match("2026-01-03", 0, 5, teamA, day3TeamB)); // B wins again, teamB[0] absent (spare fills in)
  await createMatch(match("2026-01-04", 0, 4)); // B wins again

  const teamB0WinStreak = await calculateWinningStreak(teamB[0]);
  assert(
    teamB0WinStreak === 3,
    `teamB[0]: WIN, WIN, ABSENT(day3), WIN -> absence skipped, streak=3 (got ${teamB0WinStreak})`
  );

  const teamB1WinStreak = await calculateWinningStreak(teamB[1]);
  assert(teamB1WinStreak === 4, `teamB[1] played every day and won every day -> streak=4 (got ${teamB1WinStreak})`);

  const longestB1 = await calculateLongestWinningStreak(teamB[1]);
  assert(longestB1 === 4, `teamB[1] longest winning streak also 4 (got ${longestB1})`);

  // ===================== REGULAR PLAYER LOSING STREAK (spec's exact example) =====================
  await resetMatches();

  const absentTeamA = [spare, ...teamA.slice(1)];
  await createMatch(match("2026-02-01", 0, 3));
  await createMatch(match("2026-02-02", 1, 1, absentTeamA, teamB));
  await createMatch(match("2026-02-03", 2, 2, absentTeamA, teamB));
  await createMatch(match("2026-02-04", 1, 1));
  await createMatch(match("2026-02-05", 0, 0, absentTeamA, teamB));
  await createMatch(match("2026-02-06", 0, 1));

  const regularLosingStreak = await calculateLosingStreak(regularSubject);
  assert(
    regularLosingStreak === 6,
    `Regular player: Sun LOSS..Fri LOSS with absences/draw = 6-day losing streak (got ${regularLosingStreak})`
  );

  const longestRegularLosing = await calculateLongestLosingStreak(regularSubject);
  assert(
    longestRegularLosing === 6,
    `Regular player: longest losing streak also 6 so far (got ${longestRegularLosing})`
  );

  await createMatch(match("2026-02-07", 5, 0));
  const afterWinStreak = await calculateLosingStreak(regularSubject);
  assert(afterWinStreak === 0, `Regular player: losing streak resets to 0 after a WIN (got ${afterWinStreak})`);
  const longestAfterWin = await calculateLongestLosingStreak(regularSubject);
  assert(longestAfterWin === 6, `Regular player: longest losing streak still remembers the earlier 6-day run (got ${longestAfterWin})`);

  // ===================== IRREGULAR PLAYER LOSING STREAK =====================
  await resetMatches();

  const irregularTeamA = [irregular, ...teamA.slice(1)];
  await createMatch(match("2026-03-01", 0, 2, irregularTeamA, teamB));
  await createMatch(match("2026-03-02", 3, 1));
  await createMatch(match("2026-03-03", 2, 2));
  await createMatch(match("2026-03-04", 0, 1, irregularTeamA, teamB));

  const irregularStreak = await calculateLosingStreak(irregular);
  assert(
    irregularStreak === 2,
    `Irregular player: LOSS-ABSENT-ABSENT-LOSS = 2 played-match losing streak, not 4 calendar days (got ${irregularStreak})`
  );

  // ===================== UNTOUCHED PLAYER: everything is zero, no crash =====================
  await resetMatches();
  const untouchedWin = await calculateWinningStreak(teamA[6]);
  const untouchedLoss = await calculateLosingStreak(teamA[6]);
  const untouchedLongestWin = await calculateLongestWinningStreak(teamA[6]);
  const untouchedLongestLoss = await calculateLongestLosingStreak(teamA[6]);
  assert(untouchedWin === 0, "player with zero matches: winning streak 0");
  assert(untouchedLoss === 0, "player with zero matches: losing streak 0");
  assert(untouchedLongestWin === 0, "player with zero matches: longest winning streak 0");
  assert(untouchedLongestLoss === 0, "player with zero matches: longest losing streak 0");

  console.log("\nALL DB-INTEGRATED STREAK TESTS PASSED");
}

main()
  .then(() => pool.end())
  .catch((err) => {
    console.error(err);
    pool.end();
    process.exit(1);
  });
