import { db } from "@/db";
import { matches, matchPlayers, goals, players } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import {
  validateMatchInput,
  computeResult,
  type MatchInput,
} from "./matchValidation";

export class MatchValidationError extends Error {}
export class DuplicateMatchDateError extends Error {}

/** Creates a match + its match_players + goals rows atomically. */
export async function createMatch(input: MatchInput) {
  const validation = validateMatchInput(input);
  if (!validation.ok) throw new MatchValidationError(validation.error);

  return db.transaction(async (tx) => {
    let matchId: number;
    try {
      const [created] = await tx
        .insert(matches)
        .values({
          matchDate: input.matchDate,
          teamAScore: input.teamAScore,
          teamBScore: input.teamBScore,
        })
        .returning();
      matchId = created.id;
    } catch (err: unknown) {
      if (isUniqueConstraintError(err)) {
        throw new DuplicateMatchDateError(
          `A match already exists for ${input.matchDate}. Only one match per date is allowed.`
        );
      }
      throw err;
    }

    await insertMatchPlayersAndGoals(tx, matchId, input);
    return matchId;
  });
}

/** Replaces a match's players/goals and updates its scores atomically. */
export async function updateMatch(matchId: number, input: MatchInput) {
  const validation = validateMatchInput(input);
  if (!validation.ok) throw new MatchValidationError(validation.error);

  return db.transaction(async (tx) => {
    try {
      await tx
        .update(matches)
        .set({
          matchDate: input.matchDate,
          teamAScore: input.teamAScore,
          teamBScore: input.teamBScore,
          updatedAt: new Date(),
        })
        .where(eq(matches.id, matchId));
    } catch (err: unknown) {
      if (isUniqueConstraintError(err)) {
        throw new DuplicateMatchDateError(
          `A match already exists for ${input.matchDate}. Only one match per date is allowed.`
        );
      }
      throw err;
    }

    // Clear existing rows for this match, then re-insert fresh (simplest way to
    // guarantee consistency when editing lineups/scorers).
    await tx.delete(goals).where(eq(goals.matchId, matchId));
    await tx.delete(matchPlayers).where(eq(matchPlayers.matchId, matchId));

    await insertMatchPlayersAndGoals(tx, matchId, input);
    return matchId;
  });
}

export async function deleteMatch(matchId: number) {
  await db.delete(matches).where(eq(matches.id, matchId));
}

// Minimal structural type covering what we need from a transaction handle,
// so this helper works whether called with `tx` inside a transaction.
type TxLike = Pick<typeof db, "insert">;

async function insertMatchPlayersAndGoals(tx: TxLike, matchId: number, input: MatchInput) {
  const rows = input.players.map((p) => ({
    matchId,
    playerId: p.playerId,
    team: p.team,
    role: p.role,
    played: p.role === "starter" ? true : p.played,
    result: computeResult(p.team, input.teamAScore, input.teamBScore),
  }));
  if (rows.length > 0) {
    await tx.insert(matchPlayers).values(rows);
  }

  if (input.goals.length > 0) {
    await tx.insert(goals).values(
      input.goals.map((g) => ({
        matchId,
        playerId: g.playerId,
        team: g.team,
        minute: g.minute ?? null,
      }))
    );
  }
}

function isUniqueConstraintError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const withCause = err as Error & { cause?: { code?: string; message?: string } };
  const cause = withCause.cause;
  const code = cause?.code;
  const causeMessage = cause?.message || "";
  // Postgres unique_violation error code, or a message mentioning our specific index.
  return (
    code === "23505" ||
    causeMessage.includes("matches_match_date_unique") ||
    causeMessage.includes("duplicate key value") ||
    err.message.includes("matches_match_date_unique") ||
    err.message.includes("duplicate key value")
  );
}

export async function getAllMatchesSummary() {
  const all = await db.query.matches.findMany({
    orderBy: [desc(matches.matchDate)],
  });
  return all;
}

export async function getMatchDetail(matchId: number) {
  const match = await db.query.matches.findFirst({
    where: eq(matches.id, matchId),
  });
  if (!match) return null;

  const matchPlayerRows = await db.query.matchPlayers.findMany({
    where: eq(matchPlayers.matchId, matchId),
    with: { player: true },
  });

  const goalRows = await db.query.goals.findMany({
    where: eq(goals.matchId, matchId),
    with: { player: true },
  });

  return { match, matchPlayers: matchPlayerRows, goals: goalRows };
}

export async function getActivePlayersForPicker() {
  return db.query.players.findMany({
    where: eq(players.isActive, true),
  });
}
