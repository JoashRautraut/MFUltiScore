import { AuthUser, PlayerGender, PublicUser, UserRole } from "@/types/auth";
import { Player } from "@/types/stats";
import { SaveCompletedGameInput, SerializedCompletedGame } from "@/types/completed-game";

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const body = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(body.error ?? `Request failed (${response.status}).`);
  }
  return body;
}

export async function fetchSheetPlayers(): Promise<Player[]> {
  const response = await fetch("/api/players");
  const body = await parseJsonResponse<{ players: Player[] }>(response);
  return body.players;
}

export async function addSheetPlayer(name: string): Promise<Player> {
  const response = await fetch("/api/players", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  const body = await parseJsonResponse<{ player: Player }>(response);
  return body.player;
}

export async function fetchCompletedGames(): Promise<SerializedCompletedGame[]> {
  const response = await fetch("/api/completed-games");
  const body = await parseJsonResponse<{ games: SerializedCompletedGame[] }>(response);
  return body.games;
}

export async function saveCompletedGame(
  input: SaveCompletedGameInput,
): Promise<SerializedCompletedGame> {
  const response = await fetch("/api/completed-games", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const body = await parseJsonResponse<{ game: SerializedCompletedGame }>(response);
  return body.game;
}

export async function fetchRegisteredUsers(): Promise<PublicUser[]> {
  const response = await fetch("/api/users");
  const body = await parseJsonResponse<{ users: PublicUser[] }>(response);
  return body.users;
}

export async function registerAccount(input: {
  username: string;
  password: string;
  playerName: string;
  gender: PlayerGender;
  role?: UserRole;
}): Promise<AuthUser> {
  const response = await fetch("/api/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const body = await parseJsonResponse<{ user: AuthUser }>(response);
  return body.user;
}

export async function loginAccount(username: string, password: string): Promise<AuthUser> {
  const response = await fetch("/api/users/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const body = await parseJsonResponse<{ user: AuthUser }>(response);
  return body.user;
}

export async function removeAccount(input: {
  targetUsername: string;
  actingUsername: string;
}): Promise<void> {
  const response = await fetch("/api/users/remove", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  await parseJsonResponse<{ ok: true }>(response);
}
