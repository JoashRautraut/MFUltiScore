import { NextResponse } from "next/server";
import { getActiveGame, updateActiveGame, clearActiveGame } from "@/lib/sheets";

export async function GET() {
  try {
    const activeGame = await getActiveGame();
    return NextResponse.json({ activeGame });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch active game.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    await updateActiveGame(body);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update active game.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await clearActiveGame();
    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to clear active game.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
