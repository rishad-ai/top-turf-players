import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { players } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { asc } from "drizzle-orm";
import { normalizeMobile, isValidMobile } from "@/lib/mobile";

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
  const rawMobile = body?.mobileNumber?.trim() || "";

  if (!name) {
    return NextResponse.json({ error: "Player name is required." }, { status: 400 });
  }
  if (playerType !== "regular" && playerType !== "irregular") {
    return NextResponse.json(
      { error: "playerType must be 'regular' or 'irregular'." },
      { status: 400 }
    );
  }

  let mobileNumber: string | null = null;
  if (rawMobile) {
    if (!isValidMobile(rawMobile)) {
      return NextResponse.json(
        { error: "Mobile number must be 10 digits." },
        { status: 400 }
      );
    }
    mobileNumber = normalizeMobile(rawMobile);

    const all = await db.query.players.findMany();
    const clash = all.find((p) => p.mobileNumber && normalizeMobile(p.mobileNumber) === mobileNumber);
    if (clash) {
      return NextResponse.json(
        { error: `That mobile number is already assigned to ${clash.name}.` },
        { status: 409 }
      );
    }
  }

  const [created] = await db
    .insert(players)
    .values({ name, playerType, photoUrl, isActive: true, mobileNumber })
    .returning();

  return NextResponse.json({ player: created }, { status: 201 });
}
