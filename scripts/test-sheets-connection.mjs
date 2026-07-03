import { readFileSync } from "node:fs";
import { google } from "googleapis";

function loadEnvLocal() {
  const raw = readFileSync(".env.local", "utf8");
  const values = {};

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separator = trimmed.indexOf("=");
    if (separator === -1) {
      continue;
    }

    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    values[key] = value;
  }

  return values;
}

const env = loadEnvLocal();
const email = env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const privateKey = env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
const spreadsheetId = env.GOOGLE_SPREADSHEET_ID?.trim();

console.log("System time:", new Date().toString());
console.log("UTC time:", new Date().toISOString());
console.log("Service account:", email);
console.log("Spreadsheet ID:", spreadsheetId);
console.log(
  "Private key looks valid:",
  Boolean(privateKey?.includes("BEGIN PRIVATE KEY") && privateKey.includes("END PRIVATE KEY")),
);

try {
  const auth = new google.auth.JWT({
    email,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  await auth.authorize();
  console.log("Google auth: SUCCESS");

  const sheets = google.sheets({ version: "v4", auth });
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "Players!A1:C1",
  });

  console.log("Sheet headers:", response.data.values?.[0] ?? "(empty)");
  console.log("Google Sheets connection is working.");
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error("Google auth: FAILED");
  console.error(message);

  if (message.includes("invalid_grant")) {
    console.error("");
    console.error("This is usually caused by your PC clock being wrong.");
    console.error("Fix: Settings -> Time & language -> Date & time");
    console.error("Turn on 'Set time automatically' and click Sync now.");
    console.error("If the year/date is wrong, correct it manually first.");
  }

  process.exit(1);
}
