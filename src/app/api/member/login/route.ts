import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { players } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createMemberToken, setMemberCookie } from "@/lib/auth";
import { normalizeMobile, isValidMobile } from "@/lib/mobile";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const rawMobile = body?.mobileNumber;

  if (!rawMobile || !isValidMobile(rawMobile)) {
    return NextResponse.json(
      { error: "Please enter a valid 10-digit mobile number." },
      { status: 400 }
    );
  }

  const normalized = normalizeMobile(rawMobile);

  // Match against stored numbers (also normalized) - find the member with this number.
  const all = await db.query.players.findMany();
  const member = all.find(
    (p) => p.mobileNumber && normalizeMobile(p.mobileNumber) === normalized
  );

  if (!member) {
    return NextResponse.json(
      { error: "This number isn't registered. Ask the admin to add you." },
      { status: 401 }
    );
  }

  // Record the login timestamp (best-effort; don't fail login if this errors).
  try {
    await db
      .update(players)
      .set({ lastLoginAt: new Date() })
      .where(eq(players.id, member.id));
  } catch {
    // ignore
  }

  const token = createMemberToken({ playerId: member.id, name: member.name });
  await setMemberCookie(token);

  return NextResponse.json({ ok: true, name: member.name });
}
