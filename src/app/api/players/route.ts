import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { players } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { asc } from "drizzle-orm";

export async function GET() {
  const all = await db.query.players.findMany({
    orderBy: [asc(players.name)],
  });
  return NextResponse.json({ players: all });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const name = body?.name?.trim();
  const playerType = body?.playerType;
  const photoUrl = body?.photoUrl || null;

  if (!name) {
    return NextResponse.json({ error: "Player name is required." }, { status: 400 });
  }
  if (playerType !== "regular" && playerType !== "irregular") {
    return NextResponse.json(
      { error: "playerType must be 'regular' or 'irregular'." },
      { status: 400 }
    );
  }

  const [created] = await db
    .insert(players)
    .values({ name, playerType, photoUrl, isActive: true })
    .returning();

  return NextResponse.json({ player: created }, { status: 201 });
}
