export type PlayerGender = "male" | "female";

export type RegisteredUser = {
  username: string;
  password: string;
  playerName: string;
  gender: PlayerGender;
};

export type AuthUser = {
  username: string;
  playerName: string;
  gender: PlayerGender;
};

const AUTH_STORAGE_KEY = "mfultiscore_auth";
const USERS_STORAGE_KEY = "mfultiscore_users";

function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

export function getAuthUser(): AuthUser | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = sessionStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function setAuthUser(user: AuthUser) {
  sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
}

export function clearAuthUser() {
  sessionStorage.removeItem(AUTH_STORAGE_KEY);
}

export function isAuthenticated(): boolean {
  return getAuthUser() !== null;
}

function getRegisteredUsers(): RegisteredUser[] {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = localStorage.getItem(USERS_STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    return JSON.parse(raw) as RegisteredUser[];
  } catch {
    return [];
  }
}

function saveRegisteredUsers(users: RegisteredUser[]) {
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
}

export function getRegisteredPlayers(): { name: string; gender: PlayerGender }[] {
  return getRegisteredUsers().map((user) => ({
    name: user.playerName,
    gender: user.gender,
  }));
}

export function registerUser(input: {
  username: string;
  password: string;
  playerName: string;
  gender: PlayerGender;
}): { ok: true } | { ok: false; error: string } {
  const username = input.username.trim();
  const password = input.password.trim();
  const playerName = input.playerName.trim();

  if (!username) {
    return { ok: false, error: "Please enter a username." };
  }

  if (username.length < 2) {
    return { ok: false, error: "Username must be at least 2 characters." };
  }

  if (!playerName) {
    return { ok: false, error: "Please enter your player name." };
  }

  if (password.length < 4) {
    return { ok: false, error: "Password must be at least 4 characters." };
  }

  const normalizedUsername = normalizeUsername(username);
  const users = getRegisteredUsers();

  if (users.some((user) => normalizeUsername(user.username) === normalizedUsername)) {
    return { ok: false, error: "That username is already taken." };
  }

  users.push({
    username,
    password,
    playerName,
    gender: input.gender,
  });

  saveRegisteredUsers(users);
  return { ok: true };
}

export function loginUser(
  username: string,
  password: string,
): { ok: true; user: AuthUser } | { ok: false; error: string } {
  const normalizedUsername = normalizeUsername(username);
  const normalizedPassword = password.trim();

  if (!normalizedUsername) {
    return { ok: false, error: "Please enter your username." };
  }

  if (normalizedPassword.length < 4) {
    return { ok: false, error: "Password must be at least 4 characters." };
  }

  const matchedUser = getRegisteredUsers().find(
    (user) =>
      normalizeUsername(user.username) === normalizedUsername &&
      user.password === normalizedPassword,
  );

  if (!matchedUser) {
    return { ok: false, error: "Invalid username or password." };
  }

  return {
    ok: true,
    user: {
      username: matchedUser.username,
      playerName: matchedUser.playerName,
      gender: matchedUser.gender,
    },
  };
}
