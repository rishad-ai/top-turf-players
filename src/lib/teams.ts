/**
 * Fixed, permanent team names. Team "A" and Team "B" remain the internal keys used in
 * the database (match_players.team), but everywhere they're shown to people we use
 * these labels. Change them here and they update across the whole app.
 */
export const TEAM_A_NAME = "River Side Team";
export const TEAM_B_NAME = "Road Side Team";

export function teamName(team: "A" | "B"): string {
  return team === "A" ? TEAM_A_NAME : TEAM_B_NAME;
}
