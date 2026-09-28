import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { endInjury, deleteInjury } from "@/lib/injuries";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// PATCH: mark an injury recovered (set endDate).
export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { id } = await context.params;
  const injuryId = Number(id);
  if (!Number.isInteger(injuryId)) return NextResponse.json({ error: "Invalid injury id." }, { status: 400 });

  const body = await req.json().catch(() => null);
  const endDate = typeof body?.endDate === "string" ? body.endDate : "";
  if (!ISO_DATE.test(endDate)) return NextResponse.json({ error: "endDate must be YYYY-MM-DD." }, { status: 400 });

  await endInjury(injuryId, endDate);
  return NextResponse.json({ ok: true });
}

// DELETE: remove an injury record entirely.
export async function DELETE(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { id } = await context.params;
  const injuryId = Number(id);
  if (!Number.isInteger(injuryId)) return NextResponse.json({ error: "Invalid injury id." }, { status: 400 });

  await deleteInjury(injuryId);
  return NextResponse.json({ ok: true });
}
