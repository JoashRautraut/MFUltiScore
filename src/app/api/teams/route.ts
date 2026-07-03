import { NextResponse } from "next/server";
import { getTeams, addOrUpdateTeam, deleteTeam } from "@/lib/sheets";

export async function GET() {
  try {
    const teams = await getTeams();
    return NextResponse.json({ teams });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch teams.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, teamId, spreadsheetId } = body;
    const team = await addOrUpdateTeam(name, teamId, spreadsheetId);
    return NextResponse.json({ success: true, team });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to add/update team.";
    return NextResponse.json({ error: message }, { status: 550 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get("teamId");
    const spreadsheetId = searchParams.get("spreadsheetId") || undefined;

    if (!teamId) {
      return NextResponse.json({ error: "teamId parameter is required." }, { status: 400 });
    }

    await deleteTeam(teamId, spreadsheetId);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete team.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
