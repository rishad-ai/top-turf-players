# Update: own goals, photo cropper, team names, boots, scorer cards, mobile download

Copy all files in, overwriting matches. Then run the steps at the bottom.

## New dependencies (run npm install)
- react-easy-crop (photo zoom/align cropper)
(html-to-image was already added earlier)

## Database migration (REQUIRED - adds one column)
drizzle/0003_nosy_excalibur.sql adds goals.is_own_goal (boolean, default false).
Non-destructive. Run: npx drizzle-kit migrate  (against production, as before)

## What changed
1. TEAM NAMES: "Team A" -> River Side Team, "Team B" -> Road Side Team, everywhere.
   (Defined once in src/lib/teams.ts - change there if you ever want to rename.)
2. OWN GOALS: match entry now has an "Own goal" checkbox per goal. An own goal counts
   for the opposing team's score (standard football) and is NOT counted in the scorer's
   personal goal stats. Fully tested.
3. PHOTO CROPPER: uploading a photo (admin player form, or a member changing their own
   photo) now opens a zoom + drag-to-position cropper before saving, output as a square.
4. GOAL BOOTS: each scorer shows one ⚽ per goal on the lineup (Isak-style). Own goals
   don't add a boot to the scorer.
5. TOP SCORERS on dashboard: top-5 scorers list with "View all", plus separate
   "top scorer this month" and "top scorer this year" tiles.
6. MOBILE DOWNLOAD: on phones the lineup image now opens in a new tab so you can
   long-press -> "Save to Photos" (fixes the camera-roll issue in the installed app).
7. Players with zero games remain hidden from rankings/scorer analytics (unchanged),
   and now the scorer lists also only include players who've actually scored.

## Steps
1. Copy files in, overwriting matches.
2. npm install
3. git add . && git commit -m "Own goals, photo cropper, team names, boots, scorer cards" && git push
4. Run the migration against production:
   npx drizzle-kit migrate

Vercel auto-builds on push.

## Note on match history
Matches entered before this update keep their goals as normal goals (is_own_goal=false),
which is correct - nothing to backfill.
