import { NextResponse } from "next/server";

export async function GET() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || null;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY || null;

  return NextResponse.json({
    isGoogleSheetsSupported: !!(email && privateKey),
    serviceAccountEmail: email,
  });
}
