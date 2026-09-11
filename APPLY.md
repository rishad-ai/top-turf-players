# Update: match detail page now matches the dashboard lineup

One file changed. No dependencies, no migration.

When you click a match from history, it now shows the SAME merged card as the
dashboard: scoreboard heading (Team A [score] : [score] Team B) over both teams'
pitches, with Team B mirrored to face Team A, a "Download lineup image" button, and
scorers + substitutes listed below.

## Also delete this now-unused file (optional cleanup)
src/components/matches/FormationPitch.tsx
It was the old separate-cards layout, no longer used. The build works with or without
deleting it, but it's dead code now.

## Steps
1. Overwrite src/app/matches/[id]/page.tsx with the one in this zip.
2. (optional) delete src/components/matches/FormationPitch.tsx
3. git add . && git commit -m "Match detail page matches dashboard lineup" && git push
