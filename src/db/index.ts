import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

// Plain node-postgres works identically against local Postgres, Neon (via its standard
// Postgres connection string), or any other Postgres host - and supports real
// multi-statement transactions, which matchService.ts relies on for atomic match writes.
// This app already requires the Node.js runtime (bcrypt/JWT need Node's crypto), so
// there's no edge-runtime benefit to a specialized serverless/HTTP driver here.
const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL (or POSTGRES_URL) is not set. Add a Postgres connection string to your environment."
  );
}

// Neon (and some other managed Postgres hosts) require SSL; local Postgres does not.
const isLocal = /localhost|127\.0\.0\.1/.test(connectionString);

const pool = new Pool({
  connectionString,
  ssl: isLocal ? false : { rejectUnauthorized: false },
});

export { pool };
export const db = drizzle(pool, { schema });
