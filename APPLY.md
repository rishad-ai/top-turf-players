# Update: mirror Team B lineup to face Team A

One file changed. No dependencies, no migration.

Team A now reads goalkeeper (top) -> defenders -> attackers (bottom).
Team B is mirrored: attackers (top) -> defenders -> goalkeeper (bottom),
so the two teams face each other in the middle like a real pitch.

## Steps
1. Overwrite src/components/dashboard/DashboardMatchCard.tsx with the one in this zip.
2. git add . && git commit -m "Mirror Team B lineup to face Team A" && git push
