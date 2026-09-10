import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

/**
 * PLAYERS
 * - player_type drives which losing-streak algorithm applies (regular = calendar-day,
 *   irregular = consecutive-played-match).
 * - is_active controls whether a player shows up in "add to match" pickers / active rankings,
 *   but historical stats for inactive players are still computed from their match history.
 */
export const players = pgTable("players", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  photoUrl: text("photo_url"),
  playerType: text("player_type", { enum: ["regular", "irregular"] })
    .notNull()
    .default("regular"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

/**
 * MATCHES
 * - matchDate has a UNIQUE constraint at the DB level: only one match per calendar date.
 *   This is enforced here, not just in the UI/API layer.
 * - teamAScore / teamBScore are the source of truth for computing each match_players row's
 *   `result` at write time.
 */
export const matches = pgTable(
  "matches",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    matchDate: text("match_date").notNull(), // ISO date string YYYY-MM-DD (kept as text to match existing date-math helpers)
    teamAScore: integer("team_a_score").notNull(),
    teamBScore: integer("team_b_score").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => [uniqueIndex("matches_match_date_unique").on(table.matchDate)]
);

/**
 * MATCH_PLAYERS
 * - One row per player who was selected into a match (starter or substitute).
 * - `played` distinguishes "selected as sub" vs "actually played" — only played=true rows
 *   count toward stats/streaks.
 * - `result` is denormalized (win/loss/draw) computed from the match's scores + this row's
 *   team, at the time the match is saved/edited. Never hand-edited directly.
 * - UNIQUE(match_id, player_id) prevents a player appearing twice in the same match
 *   (which also structurally prevents being on both teams at once).
 */
export const matchPlayers = pgTable(
  "match_players",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    matchId: integer("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    playerId: integer("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    team: text("team", { enum: ["A", "B"] }).notNull(),
    role: text("role", { enum: ["starter", "substitute"] }).notNull(),
    played: boolean("played").notNull().default(true),
    result: text("result", { enum: ["win", "loss", "draw"] }).notNull(),
  },
  (table) => [
    uniqueIndex("match_players_match_player_unique").on(table.matchId, table.playerId),
  ]
);

/**
 * GOALS
 * - Player may score multiple goals -> multiple rows.
 * - minute is optional.
 */
export const goals = pgTable("goals", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  matchId: integer("match_id")
    .notNull()
    .references(() => matches.id, { onDelete: "cascade" }),
  playerId: integer("player_id")
    .notNull()
    .references(() => players.id, { onDelete: "cascade" }),
  team: text("team", { enum: ["A", "B"] }).notNull(),
  minute: integer("minute"),
});

/**
 * ADMIN USERS
 * - Only admins can log in. Regular members never authenticate; the whole rest of the
 *   app is public/read-only.
 */
export const adminUsers = pgTable("admin_users", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

// ---- Relations (for query convenience) ----

export const playersRelations = relations(players, ({ many }) => ({
  matchPlayers: many(matchPlayers),
  goals: many(goals),
}));

export const matchesRelations = relations(matches, ({ many }) => ({
  matchPlayers: many(matchPlayers),
  goals: many(goals),
}));

export const matchPlayersRelations = relations(matchPlayers, ({ one }) => ({
  match: one(matches, {
    fields: [matchPlayers.matchId],
    references: [matches.id],
  }),
  player: one(players, {
    fields: [matchPlayers.playerId],
    references: [players.id],
  }),
}));

export const goalsRelations = relations(goals, ({ one }) => ({
  match: one(matches, {
    fields: [goals.matchId],
    references: [matches.id],
  }),
  player: one(players, {
    fields: [goals.playerId],
    references: [players.id],
  }),
}));
