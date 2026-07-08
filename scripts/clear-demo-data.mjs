import { readFileSync } from "node:fs";
import { google } from "googleapis";

const DEMO_PLAYER_NAMES = new Set(
  ["Ava", "Mia", "Noah", "Kai", "Test Admin"].map((name) => name.toLowerCase()),
);
const DEMO_USERNAMES = new Set(["testadmin"]);
const DEMO_GAME_MARKERS = [
  { opponent: "Team 2", location: "Main Field" },
];

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

function cleanCell(value = "") {
  return value.replace(/\r/g, "").trim();
}

async function getSheetId(sheets, spreadsheetId, sheetName) {
  const response = await sheets.spreadsheets.get({ spreadsheetId });
  const sheet = response.data.sheets?.find((entry) => entry.properties?.title === sheetName);

  if (sheet?.properties?.sheetId === undefined || sheet.properties.sheetId === null) {
    throw new Error(`Sheet tab "${sheetName}" not found.`);
  }

  return sheet.properties.sheetId;
}

async function deleteRowsByDataIndexes(sheets, spreadsheetId, sheetName, dataRowIndexes) {
  if (dataRowIndexes.length === 0) {
    return 0;
  }

  const sheetId = await getSheetId(sheets, spreadsheetId, sheetName);
  const requests = [...dataRowIndexes]
    .sort((a, b) => b - a)
    .map((dataRowIndex) => ({
      deleteDimension: {
        range: {
          sheetId,
          dimension: "ROWS",
          startIndex: dataRowIndex + 1,
          endIndex: dataRowIndex + 2,
        },
      },
    }));

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: { requests },
  });

  return dataRowIndexes.length;
}

function isDemoGame(opponent, location) {
  return DEMO_GAME_MARKERS.some(
    (marker) =>
      cleanCell(opponent) === marker.opponent && cleanCell(location) === marker.location,
  );
}

async function main() {
  const env = loadEnvLocal();
  const email = env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const spreadsheetId = env.GOOGLE_SPREADSHEET_ID?.trim();

  if (!email || !privateKey || !spreadsheetId) {
    throw new Error("Missing GOOGLE_* values in .env.local");
  }

  const auth = new google.auth.JWT({
    email,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  await auth.authorize();
  const sheets = google.sheets({ version: "v4", auth });

  const [playersRes, gamesRes, statsRes, usersRes] = await Promise.all([
    sheets.spreadsheets.values.get({ spreadsheetId, range: "Players!A2:C" }),
    sheets.spreadsheets.values.get({ spreadsheetId, range: "Games!A2:D" }),
    sheets.spreadsheets.values.get({ spreadsheetId, range: "Stats!A2:E" }),
    sheets.spreadsheets.values.get({ spreadsheetId, range: "Users!A2:G" }),
  ]);

  const playerRows = playersRes.data.values ?? [];
  const gameRows = gamesRes.data.values ?? [];
  const statRows = statsRes.data.values ?? [];
  const userRows = usersRes.data.values ?? [];

  const demoGameIds = new Set(
    gameRows
      .map((row, index) => ({
        gameId: cleanCell(row[0]),
        opponent: cleanCell(row[2]),
        location: cleanCell(row[3]),
        index,
      }))
      .filter((game) => game.gameId && isDemoGame(game.opponent, game.location))
      .map((game) => game.gameId),
  );

  const playerIndexes = playerRows
    .map((row, index) => ({ name: cleanCell(row[1]), index }))
    .filter((row) => row.name && DEMO_PLAYER_NAMES.has(row.name.toLowerCase()))
    .map((row) => row.index);

  const gameIndexes = gameRows
    .map((row, index) => ({
      gameId: cleanCell(row[0]),
      opponent: cleanCell(row[2]),
      location: cleanCell(row[3]),
      index,
    }))
    .filter(
      (row) =>
        row.gameId &&
        (demoGameIds.has(row.gameId) || isDemoGame(row.opponent, row.location)),
    )
    .map((row) => row.index);

  const statIndexes = statRows
    .map((row, index) => ({
      playerName: cleanCell(row[2]),
      gameId: cleanCell(row[1]),
      index,
    }))
    .filter(
      (row) =>
        (row.playerName && DEMO_PLAYER_NAMES.has(row.playerName.toLowerCase())) ||
        (row.gameId && demoGameIds.has(row.gameId)),
    )
    .map((row) => row.index);

  const userIndexes = userRows
    .map((row, index) => ({ username: cleanCell(row[1]), index }))
    .filter((row) => row.username && DEMO_USERNAMES.has(row.username.toLowerCase()))
    .map((row) => row.index);

  const removedStats = await deleteRowsByDataIndexes(sheets, spreadsheetId, "Stats", statIndexes);
  const removedGames = await deleteRowsByDataIndexes(sheets, spreadsheetId, "Games", gameIndexes);
  const removedPlayers = await deleteRowsByDataIndexes(
    sheets,
    spreadsheetId,
    "Players",
    playerIndexes,
  );
  const removedUsers = await deleteRowsByDataIndexes(sheets, spreadsheetId, "Users", userIndexes);

  console.log("Demo data removed from Google Sheets:");
  console.log(`- Users: ${removedUsers}`);
  console.log(`- Players: ${removedPlayers}`);
  console.log(`- Games: ${removedGames}`);
  console.log(`- Stats: ${removedStats}`);
}

main().catch((error) => {
  console.error("\nClear demo failed:", error.message);
  process.exit(1);
});
