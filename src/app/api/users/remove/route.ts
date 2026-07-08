import { NextResponse } from "next/server";
import { removeSheetUser } from "@/lib/users";
import { formatSheetsError } from "@/lib/sheets-errors";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      targetUsername?: string;
      actingUsername?: string;
    };

    await removeSheetUser({
      targetUsername: body.targetUsername ?? "",
      actingUsername: body.actingUsername ?? "",
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : formatSheetsError(error);
    const status =
      message.includes("Only admins") ||
      message.includes("cannot remove") ||
      message.includes("not found") ||
      message.includes("required")
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
