import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { addInjury, getPlayerInjuries } from "@/lib/injuries";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const playerId = Number(id);
  if (!Number.isInteger(playerId)) return NextResponse.json({ error: "Invalid player id." }, { status: 400 });
  return NextResponse.json({ injuries: await getPlayerInjuries(playerId) });
}

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { id } = await context.params;
  const playerId = Number(id);
  if (!Number.isInteger(playerId)) return NextResponse.json({ error: "Invalid player id." }, { status: 400 });

  const body = await req.json().catch(() => null);
  const startDate = typeof body?.startDate === "string" ? body.startDate : "";
  if (!ISO_DATE.test(startDate)) return NextResponse.json({ error: "startDate must be YYYY-MM-DD." }, { status: 400 });

  let endDate: string | null = null;
  if (body?.endDate != null && body.endDate !== "") {
    if (typeof body.endDate !== "string" || !ISO_DATE.test(body.endDate))
      return NextResponse.json({ error: "endDate must be YYYY-MM-DD." }, { status: 400 });
    if (body.endDate < startDate)
      return NextResponse.json({ error: "End date can't be before the start date." }, { status: 400 });
    endDate = body.endDate;
  }

  const note = typeof body?.note === "string" && body.note.trim() ? body.note.trim().slice(0, 200) : null;

  await addInjury(playerId, startDate, note, endDate);
  return NextResponse.json({ ok: true });
}
