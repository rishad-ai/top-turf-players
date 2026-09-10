import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getMatchDetail,
  updateMatch,
  deleteMatch,
  MatchValidationError,
  DuplicateMatchDateError,
} from "@/lib/matchService";
import type { MatchInput } from "@/lib/matchValidation";

async function getMatchId(context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const matchId = Number(id);
  return Number.isFinite(matchId) ? matchId : null;
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const matchId = await getMatchId(context);
  if (matchId === null) {
    return NextResponse.json({ error: "Invalid match id." }, { status: 400 });
  }

  const detail = await getMatchDetail(matchId);
  if (!detail) {
    return NextResponse.json({ error: "Match not found." }, { status: 404 });
  }

  return NextResponse.json(detail);
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const matchId = await getMatchId(context);
  if (matchId === null) {
    return NextResponse.json({ error: "Invalid match id." }, { status: 400 });
  }

  const body = (await req.json().catch(() => null)) as MatchInput | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  try {
    await updateMatch(matchId, body);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof MatchValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof DuplicateMatchDateError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    console.error(err);
    return NextResponse.json({ error: "Failed to update match." }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const matchId = await getMatchId(context);
  if (matchId === null) {
    return NextResponse.json({ error: "Invalid match id." }, { status: 400 });
  }

  try {
    await deleteMatch(matchId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to delete match." }, { status: 500 });
  }
}
