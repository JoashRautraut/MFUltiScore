import "server-only";

import { randomUUID } from "node:crypto";
import { google, sheets_v4 } from "googleapis";
import { Game, Player, STAT_TYPES, StatEntry, StatType } from "@/types/stats";
import fs from "node:fs/promises";
import path from "node:path";

const DB_PATH = path.join(process.cwd(), "data", "db.json");

const SHEET_NAMES = {
  players: "Players",
  games: "Games",
  stats: "Stats",
  teams: "Teams",
} as const;

export interface Team {
  teamId: string;
  name: string;
  dateCreated: string;
}

interface LocalDb {
  players: Player[];
  games: Game[];
  stats: StatEntry[];
  activeGame?: any;
  teams: Team[];
}

// Helper to read local JSON db
async function readLocalDb(): Promise<LocalDb> {
  try {
    const data = await fs.readFile(DB_PATH, "utf-8");
    const parsed = JSON.parse(data);
    if (!parsed.teams) {
      parsed.teams = [
        { teamId: "team1", name: "Team 1", dateCreated: new Date().toISOString() },
        { teamId: "team2", name: "Team 2", dateCreated: new Date().toISOString() },
        { teamId: "team3", name: "Team 3", dateCreated: new Date().toISOString() },
        { teamId: "team4", name: "Team 4", dateCreated: new Date().toISOString() },
        { teamId: "team5", name: "Team 5", dateCreated: new Date().toISOString() },
      ];
      await writeLocalDb(parsed);
    }
    return parsed;
  } catch (error) {
    // Fallback: initialize database with default seed players
    const initialDb: LocalDb = {
      players: [
        { playerId: "seed-1", name: "Ava", dateAdded: new Date().toISOString() },
        { playerId: "seed-2", name: "Mia", dateAdded: new Date().toISOString() },
        { playerId: "seed-3", name: "Noah", dateAdded: new Date().toISOString() },
        { playerId: "seed-4", name: "Kai", dateAdded: new Date().toISOString() },
        { playerId: "seed-5", name: "Liam", dateAdded: new Date().toISOString() },
        { playerId: "seed-6", name: "Zoe", dateAdded: new Date().toISOString() },
        { playerId: "seed-7", name: "Eli", dateAdded: new Date().toISOString() },
        { playerId: "seed-8", name: "Jade", dateAdded: new Date().toISOString() },
      ],
      games: [],
      stats: [],
      activeGame: null,
      teams: [
        { teamId: "team1", name: "Team 1", dateCreated: new Date().toISOString() },
        { teamId: "team2", name: "Team 2", dateCreated: new Date().toISOString() },
        { teamId: "team3", name: "Team 3", dateCreated: new Date().toISOString() },
        { teamId: "team4", name: "Team 4", dateCreated: new Date().toISOString() },
        { teamId: "team5", name: "Team 5", dateCreated: new Date().toISOString() },
      ],
    };

    await writeLocalDb(initialDb);
    return initialDb;
  }
}

// Helper to write local JSON db
async function writeLocalDb(data: LocalDb): Promise<void> {
  await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
  await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
}

// Check if Google Sheets credentials are configured on the server
export function isGoogleSheetsConfigured(): boolean {
  return !!(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY);
}

// Helper to ensure a specific sheet exists in the spreadsheet
async function ensureSheetExists(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  sheetName: string,
  headers: string[],
): Promise<void> {
  try {
    // Check if the sheet exists by getting headers
    await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A1:A`,
    });
  } catch (error: any) {
    // If error status is 400 or range is invalid, we assume sheet does not exist
    if (error?.status === 400 || error?.message?.includes("unable to parse") || String(error).includes("unable to parse")) {
      try {
        // Create the sheet
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: {
            requests: [
              {
                addSheet: {
                  properties: {
                    title: sheetName,
                  },
                },
              },
            ],
          },
        });

        // Set the headers in row 1
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${sheetName}!A1`,
          valueInputOption: "RAW",
          requestBody: {
            values: [headers],
          },
        });
      } catch (err) {
        console.error(`[ensureSheetExists] Failed to create sheet "${sheetName}":`, err);
      }
    } else {
      console.error(`[ensureSheetExists] Unexpected error checking sheet "${sheetName}":`, error);
    }
  }
}

function getSheetsClient(): sheets_v4.Sheets {
  if (!isGoogleSheetsConfigured()) {
    throw new Error("Google Sheets is not configured on this server.");
  }

  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return google.sheets({ version: "v4", auth });
}

export async function getPlayers(): Promise<Player[]> {
  const db = await readLocalDb();
  return db.players;
}

export async function addPlayer(name: string, spreadsheetId?: string): Promise<Player> {
  const normalizedName = name.trim();
  if (!normalizedName) {
    throw new Error("Player name is required.");
  }

  const db = await readLocalDb();

  // Check if player name already exists (case-insensitive)
  const existingPlayer = db.players.find(
    (p) => p.name.toLowerCase() === normalizedName.toLowerCase(),
  );
  if (existingPlayer) {
    return existingPlayer;
  }

  const player: Player = {
    playerId: randomUUID(),
    name: normalizedName,
    dateAdded: new Date().toISOString(),
  };

  db.players.push(player);
  await writeLocalDb(db);

  // Sync to Google Spreadsheet if ID is specified and configured
  if (spreadsheetId && isGoogleSheetsConfigured()) {
    try {
      const sheets = getSheetsClient();
      await ensureSheetExists(sheets, spreadsheetId, SHEET_NAMES.players, [
        "playerId",
        "name",
        "dateAdded",
      ]);
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${SHEET_NAMES.players}!A:C`,
        valueInputOption: "RAW",
        requestBody: {
          values: [[player.playerId, player.name, player.dateAdded]],
        },
      });
    } catch (error) {
      console.error("Failed to sync player to Google Sheet:", error);
    }
  }

  return player;
}

export async function createGame(
  input: {
    date: string;
    opponent: string;
    location?: string;
  },
  spreadsheetId?: string,
): Promise<Game> {
  const date = input.date.trim();
  const opponent = input.opponent.trim();
  const location = input.location?.trim() ?? "";

  if (!date || !opponent) {
    throw new Error("Game date and opponent are required.");
  }

  const db = await readLocalDb();

  const game: Game = {
    gameId: randomUUID(),
    date,
    opponent,
    location,
  };

  db.games.push(game);
  await writeLocalDb(db);

  // Sync to Google Spreadsheet if ID is specified and configured
  if (spreadsheetId && isGoogleSheetsConfigured()) {
    try {
      const sheets = getSheetsClient();
      await ensureSheetExists(sheets, spreadsheetId, SHEET_NAMES.games, [
        "gameId",
        "date",
        "opponent",
        "location",
      ]);
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${SHEET_NAMES.games}!A:D`,
        valueInputOption: "RAW",
        requestBody: {
          values: [[game.gameId, game.date, game.opponent, game.location]],
        },
      });
    } catch (error) {
      console.error("Failed to sync game to Google Sheet:", error);
    }
  }

  return game;
}

export async function appendStat(
  input: {
    gameId: string;
    playerName: string;
    statType: StatType;
    timestamp?: string;
  },
  spreadsheetId?: string,
): Promise<StatEntry> {
  const gameId = input.gameId.trim();
  const playerName = input.playerName.trim();

  if (!gameId || !playerName) {
    throw new Error("Game ID and player name are required.");
  }

  if (!STAT_TYPES.includes(input.statType)) {
    throw new Error(`Unsupported stat type "${input.statType}".`);
  }

  const db = await readLocalDb();

  const entry: StatEntry = {
    statId: randomUUID(),
    gameId,
    playerName,
    statType: input.statType,
    timestamp: input.timestamp ?? new Date().toISOString(),
  };

  db.stats.push(entry);
  await writeLocalDb(db);

  // Sync to Google Spreadsheet if ID is specified and configured
  if (spreadsheetId && isGoogleSheetsConfigured()) {
    try {
      const sheets = getSheetsClient();
      await ensureSheetExists(sheets, spreadsheetId, SHEET_NAMES.stats, [
        "statId",
        "gameId",
        "playerName",
        "statType",
        "timestamp",
      ]);
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
    } catch (error) {
      console.error("Failed to sync stat to Google Sheet:", error);
    }
  }

  return entry;
}

export async function appendStatsBatch(
  statsInput: Array<{
    gameId: string;
    playerName: string;
    statType: StatType;
    timestamp?: string;
  }>,
  spreadsheetId?: string,
): Promise<StatEntry[]> {
  const db = await readLocalDb();
  const entries: StatEntry[] = [];

  for (const input of statsInput) {
    const gameId = input.gameId.trim();
    const playerName = input.playerName.trim();

    if (!gameId || !playerName || !STAT_TYPES.includes(input.statType)) {
      continue;
    }

    const entry: StatEntry = {
      statId: randomUUID(),
      gameId,
      playerName,
      statType: input.statType,
      timestamp: input.timestamp ?? new Date().toISOString(),
    };

    entries.push(entry);
    db.stats.push(entry);
  }

  await writeLocalDb(db);

  // Sync to Google Spreadsheet if ID is specified and configured
  if (spreadsheetId && isGoogleSheetsConfigured() && entries.length > 0) {
    try {
      const sheets = getSheetsClient();
      await ensureSheetExists(sheets, spreadsheetId, SHEET_NAMES.stats, [
        "statId",
        "gameId",
        "playerName",
        "statType",
        "timestamp",
      ]);

      const values = entries.map((entry) => [
        entry.statId,
        entry.gameId,
        entry.playerName,
        entry.statType,
        entry.timestamp,
      ]);

      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${SHEET_NAMES.stats}!A:E`,
        valueInputOption: "RAW",
        requestBody: {
          values,
        },
      });
    } catch (error) {
      console.error("Failed to sync stats batch to Google Sheet:", error);
    }
  }

  return entries;
}

export async function getAllStats(): Promise<StatEntry[]> {
  const db = await readLocalDb();
  return db.stats;
}

export async function getGameStats(gameId: string): Promise<StatEntry[]> {
  const allStats = await getAllStats();
  return allStats.filter((entry) => entry.gameId === gameId);
}

export async function getGames(): Promise<Game[]> {
  const db = await readLocalDb();
  return db.games;
}

export async function importSpreadsheetData(
  spreadsheetId: string,
): Promise<{ success: boolean; message: string }> {
  if (!isGoogleSheetsConfigured()) {
    throw new Error("Google Sheets is not configured on this server.");
  }

  const sheets = getSheetsClient();
  const db = await readLocalDb();

  const getRows = async (sheetName: string, range: string): Promise<string[][]> => {
    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetName}!${range}`,
      });
      return response.data.values ?? [];
    } catch (error) {
      console.warn(`Failed to fetch sheet "${sheetName}":`, error);
      return [];
    }
  };

  // Fetch from Google Sheet
  const playerRows = await getRows(SHEET_NAMES.players, "A2:C");
  const importedPlayers = playerRows
    .filter((row) => row[0] && row[1])
    .map(([playerId = "", name = "", dateAdded = ""]) => ({ playerId, name, dateAdded }));

  const gameRows = await getRows(SHEET_NAMES.games, "A2:D");
  const importedGames = gameRows
    .filter((row) => row[0] && row[1] && row[2])
    .map(([gameId = "", date = "", opponent = "", location = ""]) => ({
      gameId,
      date,
      opponent,
      location,
    }));

  const statRows = await getRows(SHEET_NAMES.stats, "A2:E");
  const importedStats = statRows
    .filter((row) => row[0] && row[1] && row[2] && row[3])
    .map(([statId = "", gameId = "", playerName = "", statType = "", timestamp = ""]) => {
      const normalizedStat = STAT_TYPES.includes(statType as StatType)
        ? (statType as StatType)
        : ("Score" as StatType);
      return { statId, gameId, playerName, statType: normalizedStat, timestamp };
    });

  let updatedCount = 0;

  // Merge Players
  for (const ip of importedPlayers) {
    if (
      !db.players.some(
        (p) => p.playerId === ip.playerId || p.name.toLowerCase() === ip.name.toLowerCase(),
      )
    ) {
      db.players.push(ip);
      updatedCount++;
    }
  }

  // Merge Games
  for (const ig of importedGames) {
    if (!db.games.some((g) => g.gameId === ig.gameId)) {
      db.games.push(ig);
      updatedCount++;
    }
  }

  // Merge Stats
  for (const is of importedStats) {
    if (!db.stats.some((s) => s.statId === is.statId)) {
      db.stats.push(is);
      updatedCount++;
    }
  }

  if (updatedCount > 0) {
    await writeLocalDb(db);
  }

  return {
    success: true,
    message: `Successfully synchronized ${updatedCount} new records from Google Sheets.`,
  };
}

export async function getActiveGame(): Promise<any | null> {
  const db = await readLocalDb();
  return db.activeGame ?? null;
}

export async function updateActiveGame(data: any): Promise<void> {
  const db = await readLocalDb();
  db.activeGame = data;
  await writeLocalDb(db);
}

export async function clearActiveGame(): Promise<void> {
  const db = await readLocalDb();
  db.activeGame = null;
  await writeLocalDb(db);
}

export async function getTeams(): Promise<Team[]> {
  const db = await readLocalDb();
  return db.teams || [];
}

export async function addOrUpdateTeam(
  name: string,
  teamId?: string,
  spreadsheetId?: string,
): Promise<Team> {
  const normalized = name.trim();
  if (!normalized) {
    throw new Error("Team name is required.");
  }

  const db = await readLocalDb();
  let team: Team;

  if (teamId) {
    const index = db.teams.findIndex((t) => t.teamId === teamId);
    if (index === -1) {
      throw new Error("Team not found.");
    }
    db.teams[index].name = normalized;
    team = db.teams[index];
  } else {
    const exists = db.teams.some((t) => t.name.toLowerCase() === normalized.toLowerCase());
    if (exists) {
      throw new Error("A team with this name already exists.");
    }
    team = {
      teamId: randomUUID(),
      name: normalized,
      dateCreated: new Date().toISOString(),
    };
    db.teams.push(team);
  }

  await writeLocalDb(db);

  if (spreadsheetId && isGoogleSheetsConfigured()) {
    try {
      const sheets = getSheetsClient();
      await ensureSheetExists(sheets, spreadsheetId, SHEET_NAMES.teams, [
        "teamId",
        "name",
        "dateCreated",
      ]);

      if (teamId) {
        const values = db.teams.map((t) => [t.teamId, t.name, t.dateCreated]);
        await sheets.spreadsheets.values.clear({
          spreadsheetId,
          range: `${SHEET_NAMES.teams}!A2:C`,
        });
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${SHEET_NAMES.teams}!A2`,
          valueInputOption: "RAW",
          requestBody: { values },
        });
      } else {
        await sheets.spreadsheets.values.append({
          spreadsheetId,
          range: `${SHEET_NAMES.teams}!A:C`,
          valueInputOption: "RAW",
          requestBody: {
            values: [[team.teamId, team.name, team.dateCreated]],
          },
        });
      }
    } catch (error) {
      console.error("Failed to sync team to Google Sheet:", error);
    }
  }

  return team;
}

export async function deleteTeam(teamId: string, spreadsheetId?: string): Promise<void> {
  const db = await readLocalDb();
  db.teams = db.teams.filter((t) => t.teamId !== teamId);
  await writeLocalDb(db);

  if (spreadsheetId && isGoogleSheetsConfigured()) {
    try {
      const sheets = getSheetsClient();
      await ensureSheetExists(sheets, spreadsheetId, SHEET_NAMES.teams, [
        "teamId",
        "name",
        "dateCreated",
      ]);

      const values = db.teams.map((t) => [t.teamId, t.name, t.dateCreated]);
      await sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: `${SHEET_NAMES.teams}!A2:C`,
      });
      if (values.length > 0) {
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${SHEET_NAMES.teams}!A2`,
          valueInputOption: "RAW",
          requestBody: { values },
        });
      }
    } catch (error) {
      console.error("Failed to delete team from Google Sheet:", error);
    }
  }
}


