/**
 * Safety guard for destructive test scripts.
 *
 * Every script in this folder TRUNCATEs the players/matches/goals tables, so it
 * MUST only ever run against a local or throwaway database — never production.
 *
 * This guard aborts the process if DATABASE_URL points at a hosted/cloud
 * database (e.g. a *.neon.tech endpoint) unless the operator has explicitly
 * opted in by setting ALLOW_DB_WIPE=1. A plain `localhost`/`127.0.0.1` target
 * is always allowed.
 *
 * Import and call assertSafeTestDatabase() as the FIRST line of a destructive
 * script's main(), before any TRUNCATE.
 */
export function assertSafeTestDatabase(): void {
  const url = process.env.DATABASE_URL ?? "";

  let host = "";
  try {
    host = new URL(url).host;
  } catch {
    host = url;
  }

  const isLocal =
    host.startsWith("localhost") ||
    host.startsWith("127.0.0.1") ||
    host.startsWith("[::1]");

  // Anything that isn't obviously local is treated as potentially production.
  const looksRemote = !isLocal;

  const optedIn = process.env.ALLOW_DB_WIPE === "1";

  if (looksRemote && !optedIn) {
    console.error(
      [
        "",
        "  ⛔  DESTRUCTIVE TEST BLOCKED",
        "",
        `  This script TRUNCATEs all match/player tables, and DATABASE_URL points at:`,
        `      ${host || "(unparseable URL)"}`,
        "",
        "  That is not a local database, so it was refused to protect production data.",
        "",
        "  To run destructive tests, point DATABASE_URL at a LOCAL or throwaway database,",
        "  e.g.  postgresql://postgres:postgres@localhost:5432/topturf_test",
        "",
        "  If you are CERTAIN this target is a disposable test database, re-run with:",
        "      ALLOW_DB_WIPE=1  (prefix the command)",
        "",
      ].join("\n")
    );
    process.exit(1);
  }

  console.log(
    `[guard] destructive test running against: ${host || "(local)"}${optedIn ? "  (ALLOW_DB_WIPE=1)" : ""}`
  );
}
