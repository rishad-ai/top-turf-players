import { db, pool } from "./index";
import { adminUsers } from "./schema";
import { hashPassword } from "../lib/auth";
import { eq } from "drizzle-orm";

async function main() {
  const username = process.env.SEED_ADMIN_USERNAME || "admin";
  const password = process.env.SEED_ADMIN_PASSWORD || "changeme123";

  const existing = await db.query.adminUsers.findFirst({
    where: eq(adminUsers.username, username),
  });

  if (existing) {
    console.log(`Admin user "${username}" already exists — skipping.`);
    return;
  }

  const passwordHash = await hashPassword(password);
  await db.insert(adminUsers).values({ username, passwordHash });

  console.log(`Created admin user "${username}".`);
  console.log(`Login with username="${username}" password="${password}" — change this immediately.`);
}

main()
  .then(() => pool.end())
  .catch((err) => {
    console.error(err);
    pool.end();
    process.exit(1);
  });
