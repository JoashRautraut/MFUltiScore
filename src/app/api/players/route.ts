import { NextResponse } from "next/server";
import { addPlayer, getPlayers } from "@/lib/sheets";

export async function GET() {
  try {
    const players = await getPlayers();
    return NextResponse.json({ players });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch players.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { name?: string; spreadsheetId?: string };
    const name = body.name?.trim();

    if (!name) {
      return NextResponse.json(
        { error: "Name is required." },
        { status: 400 },
      );
    }

    const player = await addPlayer(name, body.spreadsheetId);
    return NextResponse.json({ player }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create player.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
