export function formatSheetsError(error: unknown): string {
  const message = error instanceof Error ? error.message : "Failed to connect to Google Sheets.";

  if (message.includes("invalid_grant")) {
    return "Google Sheets login failed because your computer clock is wrong. Open Windows Settings -> Date & time, turn on Set time automatically, click Sync now, then restart npm run dev.";
  }

  if (message.includes("Missing required env var")) {
    return "Missing Google Sheets credentials. Create .env.local and restart npm run dev.";
  }

  if (message.includes("403") || message.toLowerCase().includes("permission")) {
    return "Google Sheets permission denied. Share your spreadsheet with the service account email as Editor.";
  }

  return message;
}
