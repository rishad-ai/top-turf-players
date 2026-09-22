import {
  computeWinningStreakFromSequence,
  computeLongestWinningStreakFromSequence,
  computeRegularLosingStreakFromMap,
  computeRegularLongestLosingStreakFromMap,
  computeIrregularLosingStreakFromSequence,
  computeIrregularLongestLosingStreakFromSequence,
  computeUndefeatedStreakFromSequence,
  computeLongestUndefeatedStreakFromSequence,
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

// ===================== UNDEFEATED STREAK =====================
// Unbeaten = consecutive played matches without a LOSS. WIN and DRAW both extend it;
// only a LOSS breaks it. Absences are skipped (not in the played sequence), matching
// the winning-streak handling, for regular and irregular players alike. Sequence passed
// in for the current run is played-matches-only, most-recent-first.

assert(computeUndefeatedStreakFromSequence(["win", "win", "win"]) === 3, "undefeated: WIN-WIN-WIN = 3");
assert(computeUndefeatedStreakFromSequence(["draw", "win", "win"]) === 3, "undefeated: WIN-WIN-DRAW (desc) = 3 (draw extends)");
assert(computeUndefeatedStreakFromSequence(["draw", "draw", "draw"]) === 3, "undefeated: three draws = 3");
assert(computeUndefeatedStreakFromSequence(["loss", "win", "win"]) === 0, "undefeated: most recent LOSS = 0");
assert(computeUndefeatedStreakFromSequence(["draw", "loss", "win"]) === 1, "undefeated: DRAW then a LOSS before it = 1");
assert(computeUndefeatedStreakFromSequence(["win", "draw", "loss", "win", "win"]) === 2, "undefeated: WIN,DRAW then LOSS stops = 2");
assert(computeUndefeatedStreakFromSequence([]) === 0, "undefeated: no matches played = 0");

// Longest undefeated run across ascending history
assert(
  computeLongestUndefeatedStreakFromSequence(["win", "draw", "win", "loss", "win", "win"]) === 3,
  "longest undefeated: the WIN-DRAW-WIN run of 3 beats the trailing 2-run"
);
assert(
  computeLongestUndefeatedStreakFromSequence(["loss", "loss"]) === 0,
  "longest undefeated: all losses = 0"
);
assert(
  computeLongestUndefeatedStreakFromSequence(["draw", "win", "draw", "win", "draw"]) === 5,
  "longest undefeated: unbroken wins+draws = full length 5"
);
assert(computeLongestUndefeatedStreakFromSequence([]) === 0, "longest undefeated: no matches = 0");

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

// Streak starts from the LOSING DATE, not from the day after the last win:
// absent days between a win and the first non-win result are NOT counted.
{
  // A losing streak starts only on an actual LOSS. WIN 18th, DRAW 20th, LOSS 22nd:
  // the streak starts on the 22nd (the loss), not on the earlier draw.
  const resultsByDate = new Map<string, "win" | "loss" | "draw">([
    ["2026-09-18", "win"],
    ["2026-09-20", "draw"],
    ["2026-09-22", "loss"],
  ]);
  const streak = computeRegularLosingStreakFromMap(resultsByDate, "2026-09-22", "2026-09-01");
  assert(streak === 1, `streak starts on the LOSS date (22nd), not the earlier draw: expect 1 (got ${streak})`);
}

// A DRAW must NOT start a losing streak: won then only drew = no cold streak.
{
  const resultsByDate = new Map<string, "win" | "loss" | "draw">([
    ["2026-09-18", "win"],
    ["2026-09-19", "draw"],
    // 20-22 absent, no loss anywhere
  ]);
  const streak = computeRegularLosingStreakFromMap(resultsByDate, "2026-09-22", "2026-09-01");
  assert(streak === 0, `win then only a draw (no loss) = NO losing streak, expect 0 (got ${streak})`);
}

// If the player has only won or been absent since their last win, there is no losing streak.
{
  const resultsByDate = new Map<string, "win" | "loss" | "draw">([
    ["2026-09-18", "win"],
    // 19-22 all absent
  ]);
  const streak = computeRegularLosingStreakFromMap(resultsByDate, "2026-09-22", "2026-09-01");
  assert(streak === 0, `won last, then only absent = no losing streak, expect 0 (got ${streak})`);
}

// Once a LOSS starts the streak, a later draw CONTINUES it (does not reset).
{
  const resultsByDate = new Map<string, "win" | "loss" | "draw">([
    ["2026-03-01", "loss"], // starts the streak
    ["2026-03-02", "draw"], // continues (does not reset)
    ["2026-03-03", "loss"], // continues
  ]);
  const streak = computeRegularLosingStreakFromMap(resultsByDate, "2026-03-03", "2026-03-01");
  assert(streak === 3, `draw after a loss continues the streak: LOSS,DRAW,LOSS = 3 (got ${streak})`);
}

// A draw BEFORE the first loss (after a win) is not counted.
{
  const resultsByDate = new Map<string, "win" | "loss" | "draw">([
    ["2026-03-01", "win"],
    ["2026-03-02", "draw"], // after win, before loss -> not counted
    ["2026-03-03", "loss"], // streak starts here
  ]);
  const streak = computeRegularLosingStreakFromMap(resultsByDate, "2026-03-03", "2026-03-01");
  assert(streak === 1, `draw after a win (before the loss) is not counted: expect 1 (got ${streak})`);
}

// Longest run also starts on a loss: a leading absence/draw after a win isn't counted.
{
  const resultsByDate = new Map<string, "win" | "loss" | "draw">([
    ["2026-09-01", "win"],
    // 09-02 absent (after win, before first loss) - must NOT count
    ["2026-09-03", "loss"],
    ["2026-09-04", "win"],
  ]);
  const longest = computeRegularLongestLosingStreakFromMap(resultsByDate, "2026-09-01", "2026-09-04");
  assert(longest === 1, `longest run excludes the absent gap after a win: expect 1 (got ${longest})`);
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

// Irregular: a draw does NOT start a losing streak (most recent played match is a draw, no loss since last win).
{
  // desc: draw (most recent), then a win before it -> no loss since the win
  const streak = computeIrregularLosingStreakFromSequence(["draw", "win", "loss"]);
  assert(streak === 0, `irregular: only a draw since last win = no losing streak (got ${streak})`);
}

// Irregular: a draw AFTER a loss still counts (streak already started).
{
  // desc: draw (most recent), loss, then win -> streak = loss + the later draw = 2
  const streak = computeIrregularLosingStreakFromSequence(["draw", "loss", "win"]);
  assert(streak === 2, `irregular: draw after a loss continues the streak = 2 (got ${streak})`);
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
