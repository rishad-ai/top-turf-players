import { NextRequest, NextResponse } from "next/server";
import { getSession, getMemberSession } from "@/lib/auth";
import {
  createMatch,
  getAllMatchesSummary,
  MatchValidationError,
  DuplicateMatchDateError,
} from "@/lib/matchService";
import type { MatchInput } from "@/lib/matchValidation";

export async function GET() {
  const all = await getAllMatchesSummary();
  return NextResponse.json({ matches: all });
}

export async function POST(req: NextRequest) {
  // Entering today's match is allowed for the admin OR any logged-in member.
  // (Editing/deleting existing matches stays admin-only - see [id]/route.ts.)
  const admin = await getSession();
  const member = admin ? null : await getMemberSession();
  if (!admin && !member) {
    return NextResponse.json(
      { error: "You must be logged in to enter a match." },
      { status: 401 }
    );
  }

  const body = (await req.json().catch(() => null)) as MatchInput | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  try {
    const matchId = await createMatch(body);
    return NextResponse.json({ matchId }, { status: 201 });
  } catch (err) {
    if (err instanceof MatchValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof DuplicateMatchDateError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    console.error(err);
    return NextResponse.json({ error: "Failed to create match." }, { status: 500 });
  }
}
