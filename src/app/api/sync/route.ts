import { NextResponse } from "next/server";
import { importSpreadsheetData } from "@/lib/sheets";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { spreadsheetId?: string };
    const spreadsheetId = body.spreadsheetId?.trim();

    if (!spreadsheetId) {
      return NextResponse.json(
        { error: "Spreadsheet ID or URL is required." },
        { status: 400 },
      );
    }

    const result = await importSpreadsheetData(spreadsheetId);
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to sync spreadsheet.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
