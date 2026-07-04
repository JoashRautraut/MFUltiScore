import { NextResponse } from "next/server";
import { listPublicUsers, registerSheetUser } from "@/lib/users";
import { PlayerGender, UserRole } from "@/types/auth";
import { formatSheetsError } from "@/lib/sheets-errors";

export async function GET() {
  try {
    const users = await listPublicUsers();
    return NextResponse.json({ users });
  } catch (error) {
    return NextResponse.json({ error: formatSheetsError(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      username?: string;
      password?: string;
      playerName?: string;
      gender?: PlayerGender;
      role?: UserRole;
    };

    const user = await registerSheetUser({
      username: body.username ?? "",
      password: body.password ?? "",
      playerName: body.playerName ?? "",
      gender: body.gender ?? "male",
      role: body.role ?? "user",
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : formatSheetsError(error);
    const status = message.includes("already taken") || message.includes("Please enter") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
