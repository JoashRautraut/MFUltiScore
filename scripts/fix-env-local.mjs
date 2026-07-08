import { readFileSync, writeFileSync } from "node:fs";

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

function normalizePrivateKey(raw) {
  return raw.replace(/\\n/g, "\n").trim();
}

function writeEnvLocal(values) {
  const escapedKey = values.GOOGLE_PRIVATE_KEY.replace(/\n/g, "\\n");
  const content = [
    `GOOGLE_SERVICE_ACCOUNT_EMAIL=${values.GOOGLE_SERVICE_ACCOUNT_EMAIL}`,
    `GOOGLE_PRIVATE_KEY="${escapedKey}"`,
    `GOOGLE_SPREADSHEET_ID=${values.GOOGLE_SPREADSHEET_ID.trim()}`,
    "",
  ].join("\n");

  writeFileSync(".env.local", content, "utf8");
}

const env = loadEnvLocal();
const key = normalizePrivateKey(env.GOOGLE_PRIVATE_KEY ?? "");

if (!env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !key || !env.GOOGLE_SPREADSHEET_ID) {
  console.error("Missing one or more GOOGLE_* values in .env.local");
  process.exit(1);
}

if (!key.includes("BEGIN PRIVATE KEY") || !key.includes("END PRIVATE KEY")) {
  console.error("GOOGLE_PRIVATE_KEY does not look like a valid PEM key.");
  process.exit(1);
}

writeEnvLocal({
  ...env,
  GOOGLE_PRIVATE_KEY: key,
  GOOGLE_SPREADSHEET_ID: env.GOOGLE_SPREADSHEET_ID.replace(
    /https:\/\/docs\.google\.com\/spreadsheets\/d\/([^/]+).*/,
    "$1",
  ),
});

console.log("Fixed .env.local formatting.");
console.log(`Service account: ${env.GOOGLE_SERVICE_ACCOUNT_EMAIL}`);
console.log(`Spreadsheet ID: ${env.GOOGLE_SPREADSHEET_ID.trim()}`);
console.log(`Private key length: ${key.length} characters`);
console.log(`System time: ${new Date().toString()}`);
