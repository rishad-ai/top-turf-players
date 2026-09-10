import { NextRequest, NextResponse } from "next/server";
import { calculatePlayerStreaks } from "@/lib/streaks";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const playerId = Number(id);
  if (!Number.isFinite(playerId)) {
    return NextResponse.json({ error: "Invalid player id." }, { status: 400 });
  }

  const streaks = await calculatePlayerStreaks(playerId);
  return NextResponse.json({ streaks });
}
