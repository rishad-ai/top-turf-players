# Update: faster rankings, this-month matches, formation order, team names

Copy these files in, overwriting matches. No new dependencies, no migration.

## Changes
1. RANKINGS speed + top 10: the rankings page was slow (per-player DB queries) - now
   fetches everything in ~4 queries and computes in memory, same as the dashboard.
   Also capped to the top 10 for a fast, focused view.
2. MATCHES this month only: the matches page now shows only the current month by
   default. Using any filter (date/player/winner/score) searches all history as before.
3. LINEUP formation order: both teams now read goal-line-to-attack
   (Goalkeeper -> Defenders -> Attackers), matching your sample.
4. TEAM NAMES: "Team A" / "Team B" now appear on each lineup half (they were missing).

## Steps
1. Copy files in, overwriting matches.
2. git add . && git commit -m "Faster rankings, this-month matches, formation order, team names" && git push

No npm install, no migration needed. Vercel auto-builds.
