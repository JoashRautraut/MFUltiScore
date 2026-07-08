import { NextResponse } from "next/server";
import { createGame, getGames } from "@/lib/sheets";

export async function GET() {
  try {
    const games = await getGames();
    return NextResponse.json({ games });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch games.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      date?: string;
      opponent?: string;
      location?: string;
    };

    if (!body.date?.trim() || !body.opponent?.trim()) {
      return NextResponse.json(
        { error: "Date and opponent are required." },
        { status: 400 },
      );
    }

    const game = await createGame({
      date: body.date,
      opponent: body.opponent,
      location: body.location,
    });

    return NextResponse.json({ game }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create game.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
