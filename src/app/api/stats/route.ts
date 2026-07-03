import { NextRequest, NextResponse } from "next/server";
import { appendStat, appendStatsBatch, getAllStats, getGameStats } from "@/lib/sheets";
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
    const body = await request.json();

    // Check if bulk stats insert
    if (body.stats && Array.isArray(body.stats)) {
      const statsInput = body.stats as Array<{
        gameId: string;
        playerName: string;
        statType: StatType;
        timestamp?: string;
      }>;

      const stats = await appendStatsBatch(statsInput, body.spreadsheetId);
      return NextResponse.json({ stats }, { status: 201 });
    }

    // Single stat insert
    const singleBody = body as {
      gameId?: string;
      playerName?: string;
      statType?: string;
      timestamp?: string;
      spreadsheetId?: string;
    };

    if (!singleBody.gameId?.trim() || !singleBody.playerName?.trim() || !singleBody.statType) {
      return NextResponse.json(
        { error: "Game ID, player name, and stat type are required." },
        { status: 400 },
      );
    }

    if (!STAT_TYPES.includes(singleBody.statType as StatType)) {
      return NextResponse.json(
        {
          error: `Invalid stat type. Allowed values: ${STAT_TYPES.join(", ")}`,
        },
        { status: 400 },
      );
    }

    const stat = await appendStat(
      {
        gameId: singleBody.gameId,
        playerName: singleBody.playerName,
        statType: singleBody.statType as StatType,
        timestamp: singleBody.timestamp,
      },
      singleBody.spreadsheetId,
    );

    return NextResponse.json({ stat }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to append stat.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
