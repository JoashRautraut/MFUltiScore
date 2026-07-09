import { AuthUser, PlayerGender, PublicUser, UserRole } from "@/types/auth";
import { Player } from "@/types/stats";
import { SaveCompletedGameInput, SerializedCompletedGame } from "@/types/completed-game";

const DEMO_USERS_STORAGE_KEY = "mfultiscore_demo_users";

function isStaticHosting() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.location.hostname.endsWith("github.io");
}

function randomId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function loadDemoUsers(): Array<
  PublicUser & {
    password: string;
  }
> {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = localStorage.getItem(DEMO_USERS_STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    return JSON.parse(raw) as Array<PublicUser & { password: string }>;
  } catch {
    return [];
  }
}

function saveDemoUsers(users: Array<PublicUser & { password: string }>) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(DEMO_USERS_STORAGE_KEY, JSON.stringify(users));
}

function ensureDemoAdminUser() {
  const users = loadDemoUsers();
  if (users.some((user) => user.role === "admin")) {
    return;
  }

  users.push({
    userId: randomId(),
    username: "admin",
    password: "admin1234",
    playerName: "Admin",
    gender: "male",
    role: "admin",
    dateAdded: new Date().toISOString(),
  });
  saveDemoUsers(users);
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const raw = await response.text();
  let body: T & { error?: string };

  try {
    body = JSON.parse(raw) as T & { error?: string };
  } catch {
    if (raw.trimStart().startsWith("<!DOCTYPE") || raw.trimStart().startsWith("<html")) {
      throw new Error(
        response.status === 404
          ? "API route not found. Stop the dev server, run npm run dev again from the MFULTISCORE folder, then retry."
          : `Server returned HTML instead of JSON (${response.status}). Restart npm run dev and try again.`,
      );
    }

    throw new Error(`Unexpected server response (${response.status}).`);
  }

  if (!response.ok) {
    throw new Error(body.error ?? `Request failed (${response.status}).`);
  }

  return body;
}

export async function fetchSheetPlayers(): Promise<Player[]> {
  if (isStaticHosting()) {
    return [];
  }

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
  if (isStaticHosting()) {
    return [];
  }

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
  if (isStaticHosting()) {
    ensureDemoAdminUser();
    return loadDemoUsers().map(({ password: _password, ...user }) => user);
  }

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
  if (isStaticHosting()) {
    ensureDemoAdminUser();
    const users = loadDemoUsers();
    const normalizedUsername = input.username.trim().toLowerCase();
    if (!normalizedUsername || input.password.trim().length < 4 || !input.playerName.trim()) {
      throw new Error("Please complete all required fields.");
    }
    if (users.some((user) => user.username.trim().toLowerCase() === normalizedUsername)) {
      throw new Error("That username is already taken.");
    }

    const user = {
      userId: randomId(),
      username: input.username.trim(),
      password: input.password.trim(),
      playerName: input.playerName.trim(),
      gender: input.gender,
      role: input.role ?? "user",
      dateAdded: new Date().toISOString(),
    } as const;

    users.push(user);
    saveDemoUsers(users);
    return {
      username: user.username,
      playerName: user.playerName,
      gender: user.gender,
      role: user.role,
    };
  }

  const response = await fetch("/api/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const body = await parseJsonResponse<{ user: AuthUser }>(response);
  return body.user;
}

export async function loginAccount(username: string, password: string): Promise<AuthUser> {
  if (isStaticHosting()) {
    ensureDemoAdminUser();
    const normalizedUsername = username.trim().toLowerCase();
    const normalizedPassword = password.trim();
    const user = loadDemoUsers().find(
      (candidate) =>
        candidate.username.trim().toLowerCase() === normalizedUsername &&
        candidate.password === normalizedPassword,
    );

    if (!user) {
      throw new Error(
        "Invalid username or password. For GitHub Pages demo, try admin / admin1234.",
      );
    }

    return {
      username: user.username,
      playerName: user.playerName,
      gender: user.gender,
      role: user.role,
    };
  }

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
  if (isStaticHosting()) {
    const users = loadDemoUsers();
    const normalizedTarget = input.targetUsername.trim().toLowerCase();
    const normalizedActor = input.actingUsername.trim().toLowerCase();
    const actor = users.find((user) => user.username.trim().toLowerCase() === normalizedActor);
    if (!actor || actor.role !== "admin") {
      throw new Error("Only admins can remove accounts.");
    }
    if (normalizedTarget === normalizedActor) {
      throw new Error("You cannot remove your own account.");
    }

    saveDemoUsers(users.filter((user) => user.username.trim().toLowerCase() !== normalizedTarget));
    return;
  }

  const response = await fetch("/api/users/remove", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  await parseJsonResponse<{ ok: true }>(response);
}
