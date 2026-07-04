import { NextResponse } from "next/server";
import { loginSheetUser } from "@/lib/users";
import { formatSheetsError } from "@/lib/sheets-errors";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { username?: string; password?: string };
    const user = await loginSheetUser(body.username ?? "", body.password ?? "");
    return NextResponse.json({ user });
  } catch (error) {
    const message = error instanceof Error ? error.message : formatSheetsError(error);
    const status =
      message === "Invalid username or password." ||
      message.includes("Please enter") ||
      message.includes("Password must")
        ? 401
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
