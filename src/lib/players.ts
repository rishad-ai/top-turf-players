import { db } from "@/db";
import { players } from "@/db/schema";
import { asc, eq } from "drizzle-orm";

export async function getAllPlayers() {
  return db.query.players.findMany({ orderBy: [asc(players.name)] });
}

export async function getPlayerById(id: number) {
  return db.query.players.findFirst({ where: eq(players.id, id) });
}
