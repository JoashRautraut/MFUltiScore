import { NextResponse } from "next/server";
import { addPlayer, getPlayers } from "@/lib/sheets";
import { formatSheetsError } from "@/lib/sheets-errors";

export async function GET() {
  try {
    const players = await getPlayers();
    return NextResponse.json({ players });
  } catch (error) {
    return NextResponse.json({ error: formatSheetsError(error) }, { status: 500 });
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
    return NextResponse.json({ error: formatSheetsError(error) }, { status: 500 });
  }
}
