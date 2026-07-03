export type PlayerGender = "male" | "female";

export type UserRole = "user" | "admin";

export type RegisteredUser = {
  username: string;
  password: string;
  playerName: string;
  gender: PlayerGender;
  role: UserRole;
};

export type AuthUser = {
  username: string;
  playerName: string;
  gender: PlayerGender;
  role: UserRole;
};

const AUTH_STORAGE_KEY = "mfultiscore_auth";
const USERS_STORAGE_KEY = "mfultiscore_users";
const ADMIN_UNLOCK_KEY = "mfultiscore_admin_unlock";

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
    const user = JSON.parse(raw) as AuthUser;
    return {
      ...user,
      role: user.role ?? "user",
    };
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

export function unlockAdminRegister() {
  sessionStorage.setItem(ADMIN_UNLOCK_KEY, "1");
}

export function isAdminRegisterUnlocked(): boolean {
  return sessionStorage.getItem(ADMIN_UNLOCK_KEY) === "1";
}

export function isAdmin(user: AuthUser | null): boolean {
  return user?.role === "admin";
}

function normalizeRegisteredUser(user: RegisteredUser & { role?: UserRole }): RegisteredUser {
  return {
    ...user,
    role: user.role ?? "user",
  };
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
    return (JSON.parse(raw) as Array<RegisteredUser & { role?: UserRole }>).map(normalizeRegisteredUser);
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

export function getAllRegisteredUsers(): Omit<RegisteredUser, "password">[] {
  return getRegisteredUsers().map(({ password: _password, ...user }) => user);
}

function validateRegistrationInput(input: {
  username: string;
  password: string;
  playerName: string;
}): { ok: true; username: string; password: string; playerName: string } | { ok: false; error: string } {
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

  return { ok: true, username, password, playerName };
}

function createRegisteredUser(
  input: {
    username: string;
    password: string;
    playerName: string;
    gender: PlayerGender;
  },
  role: UserRole,
): { ok: true } | { ok: false; error: string } {
  const validated = validateRegistrationInput(input);
  if (!validated.ok) {
    return validated;
  }

  const normalizedUsername = normalizeUsername(validated.username);
  const users = getRegisteredUsers();

  if (users.some((user) => normalizeUsername(user.username) === normalizedUsername)) {
    return { ok: false, error: "That username is already taken." };
  }

  users.push({
    username: validated.username,
    password: validated.password,
    playerName: validated.playerName,
    gender: input.gender,
    role,
  });

  saveRegisteredUsers(users);
  return { ok: true };
}

export function registerUser(input: {
  username: string;
  password: string;
  playerName: string;
  gender: PlayerGender;
}): { ok: true } | { ok: false; error: string } {
  return createRegisteredUser(input, "admin");
}

export function registerAdminUser(input: {
  username: string;
  password: string;
  playerName: string;
  gender: PlayerGender;
}): { ok: true } | { ok: false; error: string } {
  if (!isAdminRegisterUnlocked()) {
    return { ok: false, error: "Admin registration is locked." };
  }

  return createRegisteredUser(input, "admin");
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
      role: matchedUser.role,
    },
  };
}

export function removeRegisteredUser(
  targetUsername: string,
  actingUser: AuthUser,
): { ok: true } | { ok: false; error: string } {
  if (!isAdmin(actingUser)) {
    return { ok: false, error: "Only admins can remove accounts." };
  }

  const normalizedTarget = normalizeUsername(targetUsername);
  const normalizedActor = normalizeUsername(actingUser.username);

  if (normalizedTarget === normalizedActor) {
    return { ok: false, error: "You cannot remove your own account." };
  }

  const users = getRegisteredUsers();
  const targetUser = users.find(
    (user) => normalizeUsername(user.username) === normalizedTarget,
  );

  if (!targetUser) {
    return { ok: false, error: "Account not found." };
  }

  const remainingAdmins = users.filter(
    (user) =>
      user.role === "admin" &&
      normalizeUsername(user.username) !== normalizedTarget,
  );

  if (targetUser.role === "admin" && remainingAdmins.length === 0) {
    return { ok: false, error: "Cannot remove the last admin account." };
  }

  saveRegisteredUsers(
    users.filter((user) => normalizeUsername(user.username) !== normalizedTarget),
  );

  return { ok: true };
}
