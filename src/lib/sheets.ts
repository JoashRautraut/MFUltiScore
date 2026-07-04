import "server-only";

import { randomUUID } from "node:crypto";
import { google, sheets_v4 } from "googleapis";
import { PlayerGender, RegisteredUser, UserRole } from "@/types/auth";
import { Game, Player, STAT_TYPES, StatEntry, StatType } from "@/types/stats";

const SHEET_NAMES = {
  players: "Players",
  games: "Games",
  stats: "Stats",
  users: "Users",
} as const;

const USER_ROLES: UserRole[] = ["user", "admin"];
const PLAYER_GENDERS: PlayerGender[] = ["male", "female"];

const REQUIRED_ENV_VARS = [
  "GOOGLE_SERVICE_ACCOUNT_EMAIL",
  "GOOGLE_PRIVATE_KEY",
  "GOOGLE_SPREADSHEET_ID",
] as const;

function assertEnvVars() {
  for (const key of REQUIRED_ENV_VARS) {
    if (!process.env[key]) {
      throw new Error(`Missing required env var: ${key}`);
    }
  }
}

function normalizePrivateKey(raw: string | undefined) {
  if (!raw) {
    throw new Error("Missing GOOGLE_PRIVATE_KEY");
  }

  let key = raw.trim();
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1);
  }

  return key.replace(/\\n/g, "\n");
}

function getSheetsClient(): sheets_v4.Sheets {
  assertEnvVars();

  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: normalizePrivateKey(process.env.GOOGLE_PRIVATE_KEY),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return google.sheets({ version: "v4", auth });
}

function getSpreadsheetId() {
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
  if (!spreadsheetId) {
    throw new Error("Missing GOOGLE_SPREADSHEET_ID");
  }
  return spreadsheetId;
}

function cleanCell(value = "") {
  return value.replace(/\r/g, "").trim();
}

function toPlayerRow(row: string[]): Player {
  const [playerId = "", name = "", dateAdded = ""] = row.map(cleanCell);
  return { playerId, name, dateAdded };
}

function toGameRow(row: string[]): Game {
  const [gameId = "", date = "", opponent = "", location = ""] = row.map(cleanCell);
  return { gameId, date, opponent, location };
}

function toStatRow(row: string[]): StatEntry {
  const [statId = "", gameId = "", playerName = "", statType = "", timestamp = ""] =
    row.map(cleanCell);

  if (!STAT_TYPES.includes(statType as StatType)) {
    throw new Error(`Invalid stat type in sheet row: "${statType}"`);
  }

  return {
    statId,
    gameId,
    playerName,
    statType: statType as StatType,
    timestamp,
  };
}

export async function getPlayers(): Promise<Player[]> {
  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEET_NAMES.players}!A2:C`,
  });

  const rows = (response.data.values ?? []) as string[][];
  return rows.filter((row) => row[0] && row[1]).map(toPlayerRow);
}

export async function addPlayer(name: string): Promise<Player> {
  const normalizedName = name.trim();
  if (!normalizedName) {
    throw new Error("Player name is required.");
  }

  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  const player: Player = {
    playerId: randomUUID(),
    name: normalizedName,
    dateAdded: new Date().toISOString(),
  };

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${SHEET_NAMES.players}!A:C`,
    valueInputOption: "RAW",
    requestBody: {
      values: [[player.playerId, player.name, player.dateAdded]],
    },
  });

  return player;
}

export async function createGame(input: {
  date: string;
  opponent: string;
  location?: string;
}): Promise<Game> {
  const date = input.date.trim();
  const opponent = input.opponent.trim();
  const location = input.location?.trim() ?? "";

  if (!date || !opponent) {
    throw new Error("Game date and opponent are required.");
  }

  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  const game: Game = {
    gameId: randomUUID(),
    date,
    opponent,
    location,
  };

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${SHEET_NAMES.games}!A:D`,
    valueInputOption: "RAW",
    requestBody: {
      values: [[game.gameId, game.date, game.opponent, game.location]],
    },
  });

  return game;
}

export async function appendStat(input: {
  gameId: string;
  playerName: string;
  statType: StatType;
  timestamp?: string;
}): Promise<StatEntry> {
  const gameId = input.gameId.trim();
  const playerName = input.playerName.trim();

  if (!gameId || !playerName) {
    throw new Error("Game ID and player name are required.");
  }

  if (!STAT_TYPES.includes(input.statType)) {
    throw new Error(`Unsupported stat type "${input.statType}".`);
  }

  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  const entry: StatEntry = {
    statId: randomUUID(),
    gameId,
    playerName,
    statType: input.statType,
    timestamp: input.timestamp ?? new Date().toISOString(),
  };

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${SHEET_NAMES.stats}!A:E`,
    valueInputOption: "RAW",
    requestBody: {
      values: [
        [
          entry.statId,
          entry.gameId,
          entry.playerName,
          entry.statType,
          entry.timestamp,
        ],
      ],
    },
  });

  return entry;
}

export async function appendStatsBatch(
  entries: Array<{
    gameId: string;
    playerName: string;
    statType: StatType;
    timestamp?: string;
  }>,
): Promise<void> {
  if (entries.length === 0) {
    return;
  }

  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();
  const timestamp = new Date().toISOString();

  const values = entries.map((entry) => [
    randomUUID(),
    entry.gameId.trim(),
    entry.playerName.trim(),
    entry.statType,
    entry.timestamp ?? timestamp,
  ]);

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${SHEET_NAMES.stats}!A:E`,
    valueInputOption: "RAW",
    requestBody: { values },
  });
}

export async function getAllStats(): Promise<StatEntry[]> {
  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEET_NAMES.stats}!A2:E`,
  });

  const rows = (response.data.values ?? []) as string[][];
  return rows
    .filter((row) => row[0] && row[1] && row[2] && row[3] && row[4])
    .map(toStatRow);
}

export async function getGameStats(gameId: string): Promise<StatEntry[]> {
  const trimmedGameId = gameId.trim();
  if (!trimmedGameId) {
    throw new Error("Game ID is required.");
  }

  const allStats = await getAllStats();
  return allStats.filter((entry) => entry.gameId === trimmedGameId);
}

export async function getGames(): Promise<Game[]> {
  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEET_NAMES.games}!A2:D`,
  });

  const rows = (response.data.values ?? []) as string[][];
  return rows.filter((row) => row[0] && row[1] && row[2]).map(toGameRow);
}

function toUserRow(row: string[]): RegisteredUser {
  const [
    userId = "",
    username = "",
    password = "",
    playerName = "",
    gender = "",
    role = "",
    dateAdded = "",
  ] = row.map(cleanCell);
  if (!USER_ROLES.includes(role as UserRole)) {
    throw new Error(`Invalid role in sheet row: "${role}"`);
  }

  if (!PLAYER_GENDERS.includes(gender as PlayerGender)) {
    throw new Error(`Invalid gender in sheet row: "${gender}"`);
  }

  return {
    userId,
    username,
    password,
    playerName,
    gender: gender as PlayerGender,
    role: role as UserRole,
    dateAdded,
  };
}

async function getSheetId(sheetName: string): Promise<number> {
  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  const response = await sheets.spreadsheets.get({ spreadsheetId });
  const sheet = response.data.sheets?.find((entry) => entry.properties?.title === sheetName);

  if (sheet?.properties?.sheetId === undefined || sheet.properties.sheetId === null) {
    throw new Error(
      `Sheet tab "${sheetName}" not found. Add a "${sheetName}" tab with the correct headers.`,
    );
  }

  return sheet.properties.sheetId;
}

export async function getUsers(): Promise<RegisteredUser[]> {
  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEET_NAMES.users}!A2:G`,
  });

  const rows = (response.data.values ?? []) as string[][];
  return rows.filter((row) => row[0] && row[1] && row[2]).map(toUserRow);
}

export async function addUser(input: {
  username: string;
  password: string;
  playerName: string;
  gender: PlayerGender;
  role: UserRole;
}): Promise<RegisteredUser> {
  const username = input.username.trim();
  const password = input.password.trim();
  const playerName = input.playerName.trim();

  if (!username || !password || !playerName) {
    throw new Error("Username, password, and player name are required.");
  }

  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();
  const existingUsers = await getUsers();
  const normalizedUsername = username.toLowerCase();

  if (existingUsers.some((user) => user.username.trim().toLowerCase() === normalizedUsername)) {
    throw new Error("That username is already taken.");
  }

  const user: RegisteredUser = {
    userId: randomUUID(),
    username,
    password,
    playerName,
    gender: input.gender,
    role: input.role,
    dateAdded: new Date().toISOString(),
  };

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${SHEET_NAMES.users}!A:G`,
    valueInputOption: "RAW",
    requestBody: {
      values: [
        [
          user.userId,
          user.username,
          user.password,
          user.playerName,
          user.gender,
          user.role,
          user.dateAdded,
        ],
      ],
    },
  });

  return user;
}

export async function removeUserByUsername(username: string): Promise<void> {
  const targetUsername = username.trim().toLowerCase();
  if (!targetUsername) {
    throw new Error("Username is required.");
  }

  const users = await getUsers();
  const rowIndex = users.findIndex(
    (user) => user.username.trim().toLowerCase() === targetUsername,
  );

  if (rowIndex === -1) {
    throw new Error("Account not found.");
  }

  const sheetId = await getSheetId(SHEET_NAMES.users);
  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId,
              dimension: "ROWS",
              startIndex: rowIndex + 1,
              endIndex: rowIndex + 2,
            },
          },
        },
      ],
    },
  });
}
