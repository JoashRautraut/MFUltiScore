import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const jsonPath = process.argv[2];
const spreadsheetId = process.argv[3];

if (!jsonPath || !spreadsheetId) {
  console.error("Usage: node scripts/setup-env-from-json.mjs <path-to-json-key> <spreadsheet-id>");
  process.exit(1);
}

const creds = JSON.parse(readFileSync(resolve(jsonPath), "utf8"));

if (!creds.client_email || !creds.private_key) {
  console.error("Invalid service account JSON. Expected client_email and private_key.");
  process.exit(1);
}

const escapedKey = creds.private_key.replace(/\n/g, "\\n");
const env = [
  `GOOGLE_SERVICE_ACCOUNT_EMAIL=${creds.client_email}`,
  `GOOGLE_PRIVATE_KEY="${escapedKey}"`,
  `GOOGLE_SPREADSHEET_ID=${spreadsheetId.trim()}`,
  "",
].join("\n");

writeFileSync(".env.local", env, "utf8");
console.log("Created .env.local");
console.log(`Service account: ${creds.client_email}`);
console.log(`Spreadsheet ID: ${spreadsheetId.trim()}`);
