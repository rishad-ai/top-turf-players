# Update: member match entry + self photo + merged full-width lineup

Copy these files into your project, overwriting matches. NO new dependencies,
NO database migration needed this time.

## IMPORTANT: delete two old files
After copying, DELETE these two files from your project (they've been replaced by
DashboardMatchCard.tsx and are no longer used):
  src/components/dashboard/TodaysMatchCard.tsx
  src/components/dashboard/MatchLineupCard.tsx
If you leave them, the build still works, but they're dead code.

## What changed
- Logged-in members (not just admin) can now ENTER today's match, via a new page at
  /matches/new and the "Enter today's match" button on the dashboard. Editing and
  deleting matches remains ADMIN ONLY.
- Logged-in members can change their OWN profile photo (a "Change my photo" button
  appears only on their own player page). They cannot change anyone else's - verified
  the target is taken from their login session, never from the request, so a member
  can't target another player's id even by tampering with the request.
- Dashboard now shows ONE merged card: "Team A [score] : [score] Team B" heading over
  both teams' lineups, on a navy background matching the crest. The lineup is stretched
  full-width (no more big empty side margins). Winners show in a strip below.

## Steps
1. Copy files in, overwriting matches.
2. Delete the two files listed above.
3. git add . && git commit -m "Member match entry + self photo + merged lineup" && git push

That's it. Vercel auto-builds. No migration, no npm install needed.
