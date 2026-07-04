import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const KEYS = [
  "GOOGLE_SERVICE_ACCOUNT_EMAIL",
  "GOOGLE_PRIVATE_KEY",
  "GOOGLE_SPREADSHEET_ID",
];

function loadEnvLocal() {
  const raw = readFileSync(resolve(".env.local"), "utf8");
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

for (const key of KEYS) {
  let value = env[key];

  if (!value) {
    console.error(`Missing ${key} in .env.local`);
    process.exit(1);
  }

  if (key === "GOOGLE_PRIVATE_KEY") {
    value = value.replace(/\\n/g, "\n");
  }

  console.log(`Adding ${key} to Vercel...`);

  for (const target of ["production", "preview", "development"]) {
    const result = spawnSync("npx", ["vercel", "env", "add", key, target], {
      input: value,
      stdio: ["pipe", "inherit", "inherit"],
      shell: true,
    });

    if (result.status !== 0) {
      console.error(`Failed to add ${key} (${target})`);
      process.exit(result.status ?? 1);
    }
  }
}

console.log("All environment variables added. Run: npx vercel --prod");
