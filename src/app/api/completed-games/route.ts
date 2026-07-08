import { NextResponse } from "next/server";
import {
  getCompletedGamesFromSheet,
  saveCompletedGameToSheet,
} from "@/lib/completed-games";
import { SaveCompletedGameInput } from "@/types/completed-game";

import { formatSheetsError } from "@/lib/sheets-errors";

export async function GET() {
  try {
    const games = await getCompletedGamesFromSheet();
    return NextResponse.json({ games });
  } catch (error) {
    return NextResponse.json({ error: formatSheetsError(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SaveCompletedGameInput;

    if (!body.date?.trim() || !body.matchupLabel?.trim()) {
      return NextResponse.json(
        { error: "Date and matchup label are required." },
        { status: 400 },
      );
    }

    const game = await saveCompletedGameToSheet(body);
    return NextResponse.json({ game }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: formatSheetsError(error) }, { status: 500 });
  }
}
