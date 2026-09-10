import { NextRequest, NextResponse } from "next/server";
import { calculateLeaderboard, type LeaderboardMetric } from "@/lib/stats";

const VALID_METRICS: LeaderboardMetric[] = [
  "wins",
  "goals",
  "winPercentage",
  "winningStreak",
  "losingStreak",
];

export async function GET(req: NextRequest) {
  const metricParam = req.nextUrl.searchParams.get("metric") || "wins";
  if (!VALID_METRICS.includes(metricParam as LeaderboardMetric)) {
    return NextResponse.json(
      { error: `metric must be one of: ${VALID_METRICS.join(", ")}` },
      { status: 400 }
    );
  }

  const leaderboard = await calculateLeaderboard(metricParam as LeaderboardMetric);
  return NextResponse.json({ leaderboard });
}
