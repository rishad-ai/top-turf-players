# Update: subs in lineup, own goals red, "Losing streaks", hide never-played

Copy files in, overwriting matches. No new dependencies, NO migration.

## Changes
1. SUBSTITUTES now appear in the lineup (dashboard AND match detail) in a "Substitutes"
   row below each team's formation. Only subs who actually PLAYED are shown.
   (Their stats were already counted correctly - verified with scripts/test-sub-stats.ts:
   a sub who plays on the winning team gets the win.)
2. OWN GOALS are marked in RED with an "(OG)" label under the scorer.
3. "Cold streaks" renamed to "Losing streaks" on the dashboard.
4. Players who have NEVER played no longer appear in Hot/Losing streak sections.

## Steps
1. Copy files in, overwriting matches.
2. git add . && git commit -m "Subs in lineup, own goals red, losing streaks, hide never-played" && git push

No npm install, no migration. Vercel auto-builds.
