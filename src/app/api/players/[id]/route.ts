import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { players } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq } from "drizzle-orm";

async function getPlayerId(context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const playerId = Number(id);
  return Number.isFinite(playerId) ? playerId : null;
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const playerId = await getPlayerId(context);
  if (playerId === null) {
    return NextResponse.json({ error: "Invalid player id." }, { status: 400 });
  }

  const player = await db.query.players.findFirst({
    where: eq(players.id, playerId),
  });

  if (!player) {
    return NextResponse.json({ error: "Player not found." }, { status: 404 });
  }

  return NextResponse.json({ player });
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const playerId = await getPlayerId(context);
  if (playerId === null) {
    return NextResponse.json({ error: "Invalid player id." }, { status: 400 });
  }

  const existing = await db.query.players.findFirst({
    where: eq(players.id, playerId),
  });
  if (!existing) {
    return NextResponse.json({ error: "Player not found." }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const updates: Partial<typeof players.$inferInsert> = {};

  if (typeof body?.name === "string" && body.name.trim()) {
    updates.name = body.name.trim();
  }
  if (body?.playerType === "regular" || body?.playerType === "irregular") {
    updates.playerType = body.playerType;
  }
  if (typeof body?.isActive === "boolean") {
    updates.isActive = body.isActive;
  }
  if (typeof body?.photoUrl === "string" || body?.photoUrl === null) {
    updates.photoUrl = body.photoUrl;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update." }, { status: 400 });
  }

  const [updated] = await db
    .update(players)
    .set(updates)
    .where(eq(players.id, playerId))
    .returning();

  return NextResponse.json({ player: updated });
}
