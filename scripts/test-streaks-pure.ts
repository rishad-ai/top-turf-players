import {
  computeWinningStreakFromSequence,
  computeLongestWinningStreakFromSequence,
  computeRegularLosingStreakFromMap,
  computeRegularLongestLosingStreakFromMap,
  computeIrregularLosingStreakFromSequence,
  computeIrregularLongestLosingStreakFromSequence,
} from "../src/lib/streaks";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`ASSERTION FAILED: ${msg}`);
  console.log(`PASS: ${msg}`);
}

// ===================== WINNING STREAK =====================
// Spec (as clarified): absence is SKIPPED, not a reset. Sequence passed in is
// "played matches only", most-recent-first.

assert(computeWinningStreakFromSequence(["win", "win", "win"]) === 3, "WIN-WIN-WIN = 3");
assert(computeWinningStreakFromSequence(["loss", "win", "win"]) === 0, "WIN-WIN-LOSS (desc: loss,win,win) = 0");
assert(computeWinningStreakFromSequence(["draw", "win", "win"]) === 0, "WIN-WIN-DRAW (desc: draw,win,win) = 0");
// WIN -> WIN -> ABSENT -> WIN: absence is skipped entirely (not in the played sequence),
// so the played-match sequence is WIN, WIN, WIN (all three actual wins chain together) = 3.
assert(computeWinningStreakFromSequence(["win", "win", "win"]) === 3, "WIN-WIN-ABSENT-WIN (absence skipped) = 3");
assert(computeWinningStreakFromSequence([]) === 0, "no matches played = 0 winning streak");

// Longest winning streak
assert(
  computeLongestWinningStreakFromSequence(["win", "win", "loss", "win", "win", "win", "draw"]) === 3,
  "longest winning streak finds the 3-run in the middle of history"
);
assert(computeLongestWinningStreakFromSequence([]) === 0, "no matches = longest winning streak 0");

// ===================== REGULAR PLAYER LOSING STREAK =====================
// Example 1: Sun LOSS, Mon ABSENT, Tue ABSENT, Wed DRAW, Thu ABSENT, Fri LOSS -> 6 days
{
  const resultsByDate = new Map<string, "win" | "loss" | "draw">([
    ["2026-02-01", "loss"], // Sunday
    // Monday, Tuesday absent (no entry)
    ["2026-02-04", "draw"], // Wednesday
    // Thursday absent
    ["2026-02-06", "loss"], // Friday
  ]);
  const streak = computeRegularLosingStreakFromMap(resultsByDate, "2026-02-06", "2026-02-01");
  assert(streak === 6, `Example 1: Sun LOSS..Fri LOSS with absences/draw = 6 days (got ${streak})`);
}

// Example 2: Sun LOSS, Mon DRAW, Tue ABSENT, Wed LOSS, Thu DRAW, Fri LOSS -> 6 days
{
  const resultsByDate = new Map<string, "win" | "loss" | "draw">([
    ["2026-02-01", "loss"], // Sunday
    ["2026-02-02", "draw"], // Monday
    // Tuesday absent
    ["2026-02-04", "loss"], // Wednesday
    ["2026-02-05", "draw"], // Thursday
    ["2026-02-06", "loss"], // Friday
  ]);
  const streak = computeRegularLosingStreakFromMap(resultsByDate, "2026-02-06", "2026-02-01");
  assert(streak === 6, `Example 2: mixed loss/draw/absent = 6 days (got ${streak})`);
}

// Reset example: Sun LOSS, Mon DRAW, Tue ABSENT, Wed WIN -> 0
{
  const resultsByDate = new Map<string, "win" | "loss" | "draw">([
    ["2026-02-01", "loss"], // Sunday
    ["2026-02-02", "draw"], // Monday
    // Tuesday absent
    ["2026-02-04", "win"], // Wednesday
  ]);
  const streak = computeRegularLosingStreakFromMap(resultsByDate, "2026-02-04", "2026-02-01");
  assert(streak === 0, `Reset example: streak is 0 the day of and after a WIN (got ${streak})`);
}

// A draw does NOT reset the streak - critical rule, tested in isolation
{
  const resultsByDate = new Map<string, "win" | "loss" | "draw">([
    ["2026-03-01", "win"],
    ["2026-03-02", "draw"], // should continue counting AFTER this, not reset
    ["2026-03-03", "loss"],
  ]);
  const streak = computeRegularLosingStreakFromMap(resultsByDate, "2026-03-03", "2026-03-01");
  // Walking back from 03-03 (loss, streak=1), 03-02 (draw, streak=2), 03-01 (win, stop) => 2
  assert(streak === 2, `draw does not reset losing streak (got ${streak}, expected 2)`);
}

// Pure absence-only run (no matches ever recorded for the player in the range) still counts
{
  const resultsByDate = new Map<string, "win" | "loss" | "draw">([
    ["2026-04-01", "loss"],
  ]);
  const streak = computeRegularLosingStreakFromMap(resultsByDate, "2026-04-05", "2026-04-01");
  // 04-05 absent(1), 04-04 absent(2), 04-03 absent(3), 04-02 absent(4), 04-01 loss(5)
  assert(streak === 5, `absence-only days after an initial loss continue the streak (got ${streak}, expected 5)`);
}

// Longest regular losing streak across full history
{
  const resultsByDate = new Map<string, "win" | "loss" | "draw">([
    ["2026-05-01", "loss"],
    ["2026-05-02", "loss"],
    ["2026-05-03", "win"], // resets
    ["2026-05-04", "loss"],
    ["2026-05-05", "draw"],
    ["2026-05-06", "loss"],
    ["2026-05-07", "loss"],
    ["2026-05-08", "loss"], // this run of 5 (04-08) is the longest
  ]);
  const longest = computeRegularLongestLosingStreakFromMap(resultsByDate, "2026-05-01", "2026-05-08");
  assert(longest === 5, `longest regular losing streak finds the 5-day run (got ${longest})`);
}

// ===================== IRREGULAR PLAYER LOSING STREAK =====================
// LOSS -> ABSENT -> ABSENT -> LOSS = 2 played-match losses (absences don't count as days)
{
  // played-match sequence, most recent first: [loss, loss] (the two absences aren't
  // matches the player played, so they're simply not in this sequence at all)
  const streak = computeIrregularLosingStreakFromSequence(["loss", "loss"]);
  assert(streak === 2, `irregular: LOSS-ABSENT-ABSENT-LOSS = 2 played-match losses (got ${streak})`);
}

// Irregular: a win resets, draw continues (same semantics as regular, different unit)
{
  const streak = computeIrregularLosingStreakFromSequence(["loss", "draw", "loss", "win", "loss"]);
  // desc order: most recent first = loss, draw, loss stop at win
  assert(streak === 3, `irregular: draw does not reset, win does (got ${streak}, expected 3)`);
}

{
  const streak = computeIrregularLosingStreakFromSequence([]);
  assert(streak === 0, "irregular player who never played has losing streak 0");
}

// Longest irregular losing streak
{
  const longest = computeIrregularLongestLosingStreakFromSequence([
    "loss", "loss", "win", "loss", "draw", "loss", "loss", "loss",
  ]);
  // After the win (index 2), the remaining 5 entries (loss,draw,loss,loss,loss) are
  // all non-win and contiguous - that 5-run is longer than the leading 2-run.
  assert(longest === 5, `longest irregular losing streak finds the 5-match run after the win (got ${longest})`);
}

console.log("\nALL PURE STREAK CALCULATION TESTS PASSED");
