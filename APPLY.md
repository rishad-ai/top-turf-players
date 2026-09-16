# Update: substitution arrows (who replaced whom)

Copy files in, overwriting matches. NO new dependencies. ONE migration.

## Database migration (REQUIRED)
drizzle/0004_glorious_charles_xavier.sql adds match_players.replaced_player_id.
Non-destructive. Run:  npx drizzle-kit migrate  (against production)

## Changes
1. MATCH ENTRY: for each substitute marked as "played", a "came on for ___" dropdown
   lets you pick which starter they replaced (optional).
2. LINEUP (dashboard + match detail): the substitute who came on shows a green ↑ badge;
   the starter they replaced shows a red ↓ badge. Both still appear in the lineup and
   both are counted in stats (standard football - both were on the pitch).
3. Validation: a sub can only replace a starter from their own team, and two subs
   can't replace the same starter.

## Steps
1. Copy files in, overwriting matches.
2. git add . && git commit -m "Substitution arrows - record who replaced whom" && git push
3. npx drizzle-kit migrate   (against production)

Vercel auto-builds on push. Existing matches are unaffected (replaced_player_id is null
for them - no arrows, which is correct since that info wasn't recorded before).
