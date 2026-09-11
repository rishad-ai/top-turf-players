# Update: Member login, analytics, speed fix, formation, logo, biggest-result

Copy every file in this zip into your project, overwriting where paths match.
Then follow the steps at the bottom.

## What's included

### Member mobile-number login (option c)
- Dashboard/scores stay PUBLIC — no login needed to view.
- Admin registers each member's mobile number in the player add/edit form.
- A member enters their number once -> stays logged in ~5 years on that device.
- Header shows "Log in" / "Hi, <name>". Admin players list shows each member's
  number and a "logged in <date>" marker so you can see who has identified themselves.
- Photo edits remain admin-only.

### Analytics (Vercel)
- Vercel Web Analytics + Speed Insights added. After deploying, enable both in
  the Vercel dashboard (Project -> Analytics tab, and Speed Insights tab -> Enable).
  Web Analytics gives you visits / countries / devices; the member logins above give
  you the named "who is engaging" data.

### Performance
- The dashboard used to make hundreds of DB queries (one+ per player) which made it
  slow. It now fetches all data in ~5 queries and computes in memory. Verified to
  produce identical numbers to the old version.

### Formation, logo, lineup, biggest result
- 1-3-3 formation (1 GK, 3 DEF, 3 ATT) on match entry + pitch-style match view.
- Your crest logo across icons + header (navy header to match the crest).
- Full 14-player downloadable lineup image on the dashboard. Matches entered before
  the formation feature (no positions saved) still show all players in a plain row;
  edit such a match in the admin panel to assign positions and get the 1-3-3 layout.
- "Biggest result of <year>" card on the dashboard.

## Files with NEW dependencies
package.json changed (adds @vercel/analytics, @vercel/speed-insights, html-to-image).
Run `npm install` after copying.

## Database migrations included
- drizzle/0001_groovy_taskmaster.sql  -> adds match_players.position (formation)
- drizzle/0002_absurd_starfox.sql     -> adds players.mobile_number + last_login_at

Both are additive and non-destructive (your existing players/matches/admin login are
untouched).

## Steps to apply

1. Copy all files from this zip into your project, overwriting matches.
2. Install new dependencies:
   npm install
3. Commit and push:
   git add .
   git commit -m "Member login, analytics, speed fix, formation, logo"
   git push
4. Run the new migrations against production (adds the two columns):
   npx drizzle-kit migrate
5. In the Vercel dashboard, turn on Web Analytics and Speed Insights for the project
   (one click each).

That's it — Vercel auto-builds on push. After it's live, open the admin panel and add
mobile numbers to your players so they can log in.
