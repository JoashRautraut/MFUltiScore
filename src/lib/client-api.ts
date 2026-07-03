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
