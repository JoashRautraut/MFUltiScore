import { NextRequest, NextResponse } from "next/server";
import { appendStat, getAllStats, getGameStats } from "@/lib/sheets";
import { STAT_TYPES, StatType } from "@/types/stats";

export async function GET(request: NextRequest) {
  try {
    const gameId = request.nextUrl.searchParams.get("gameId");
    const stats = gameId ? await getGameStats(gameId) : await getAllStats();
    return NextResponse.json({ stats });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch stats.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      gameId?: string;
      playerName?: string;
      statType?: string;
      timestamp?: string;
    };

    if (!body.gameId?.trim() || !body.playerName?.trim() || !body.statType) {
      return NextResponse.json(
        { error: "Game ID, player name, and stat type are required." },
        { status: 400 },
      );
    }

    if (!STAT_TYPES.includes(body.statType as StatType)) {
      return NextResponse.json(
        {
          error: `Invalid stat type. Allowed values: ${STAT_TYPES.join(", ")}`,
        },
        { status: 400 },
      );
    }

    const stat = await appendStat({
      gameId: body.gameId,
      playerName: body.playerName,
      statType: body.statType as StatType,
      timestamp: body.timestamp,
    });

    return NextResponse.json({ stat }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to append stat.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
