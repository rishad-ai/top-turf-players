import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { players } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getMemberSession } from "@/lib/auth";

/**
 * Lets a logged-in member set THEIR OWN profile photo. The target player id comes
 * from the member's session cookie, never from the request body - so a member can
 * only ever change their own photo, not anyone else's.
 */
export async function POST(req: NextRequest) {
  const member = await getMemberSession();
  if (!member) {
    return NextResponse.json({ error: "You must be logged in." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const photoUrl = body?.photoUrl;

  if (typeof photoUrl !== "string" || !photoUrl.trim()) {
    return NextResponse.json({ error: "A photo URL is required." }, { status: 400 });
  }

  // Basic sanity: only accept URLs our own upload endpoint produces (Vercel Blob
  // public URL, or the local /uploads path). Prevents pointing the photo at arbitrary
  // external URLs.
  const isAllowed =
    photoUrl.startsWith("/uploads/players/") ||
    /^https:\/\/[a-z0-9.-]+\.public\.blob\.vercel-storage\.com\//i.test(photoUrl);
  if (!isAllowed) {
    return NextResponse.json({ error: "Invalid photo URL." }, { status: 400 });
  }

  const [updated] = await db
    .update(players)
    .set({ photoUrl })
    .where(eq(players.id, member.playerId))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Player not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, photoUrl });
}
