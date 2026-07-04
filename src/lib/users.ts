import "server-only";

import { AuthUser, PlayerGender, PublicUser, UserRole } from "@/types/auth";
import { addPlayer, addUser, getPlayers, getUsers, removeUserByUsername } from "@/lib/sheets";

function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

function toAuthUser(user: {
  username: string;
  playerName: string;
  gender: PlayerGender;
  role: UserRole;
}): AuthUser {
  return {
    username: user.username,
    playerName: user.playerName,
    gender: user.gender,
    role: user.role,
  };
}

function toPublicUser(user: Awaited<ReturnType<typeof getUsers>>[number]): PublicUser {
  return {
    userId: user.userId,
    username: user.username,
    playerName: user.playerName,
    gender: user.gender,
    role: user.role,
    dateAdded: user.dateAdded,
  };
}

function validateRegistrationInput(input: {
  username: string;
  password: string;
  playerName: string;
}) {
  const username = input.username.trim();
  const password = input.password.trim();
  const playerName = input.playerName.trim();

  if (!username) {
    throw new Error("Please enter a username.");
  }

  if (username.length < 2) {
    throw new Error("Username must be at least 2 characters.");
  }

  if (!playerName) {
    throw new Error("Please enter your player name.");
  }

  if (password.length < 4) {
    throw new Error("Password must be at least 4 characters.");
  }

  return { username, password, playerName };
}

async function ensurePlayerExists(playerName: string) {
  const players = await getPlayers();
  const normalizedName = playerName.trim().toLowerCase();

  if (players.some((player) => player.name.trim().toLowerCase() === normalizedName)) {
    return;
  }

  await addPlayer(playerName);
}

export async function listPublicUsers(): Promise<PublicUser[]> {
  const users = await getUsers();
  return users.map(toPublicUser);
}

export async function registerSheetUser(input: {
  username: string;
  password: string;
  playerName: string;
  gender: PlayerGender;
  role?: UserRole;
}): Promise<AuthUser> {
  const validated = validateRegistrationInput(input);
  const role = input.role ?? "user";

  const user = await addUser({
    ...validated,
    gender: input.gender,
    role,
  });

  await ensurePlayerExists(validated.playerName);

  return toAuthUser(user);
}

export async function loginSheetUser(
  username: string,
  password: string,
): Promise<AuthUser> {
  const normalizedUsername = normalizeUsername(username);
  const normalizedPassword = password.trim();

  if (!normalizedUsername) {
    throw new Error("Please enter your username.");
  }

  if (normalizedPassword.length < 4) {
    throw new Error("Password must be at least 4 characters.");
  }

  const matchedUser = (await getUsers()).find(
    (user) =>
      normalizeUsername(user.username) === normalizedUsername &&
      user.password === normalizedPassword,
  );

  if (!matchedUser) {
    throw new Error("Invalid username or password.");
  }

  return toAuthUser(matchedUser);
}

export async function removeSheetUser(input: {
  targetUsername: string;
  actingUsername: string;
}): Promise<void> {
  const normalizedTarget = normalizeUsername(input.targetUsername);
  const normalizedActor = normalizeUsername(input.actingUsername);

  if (!normalizedTarget || !normalizedActor) {
    throw new Error("Both usernames are required.");
  }

  if (normalizedTarget === normalizedActor) {
    throw new Error("You cannot remove your own account.");
  }

  const users = await getUsers();
  const actingUser = users.find((user) => normalizeUsername(user.username) === normalizedActor);
  const targetUser = users.find((user) => normalizeUsername(user.username) === normalizedTarget);

  if (!actingUser || actingUser.role !== "admin") {
    throw new Error("Only admins can remove accounts.");
  }

  if (!targetUser) {
    throw new Error("Account not found.");
  }

  const remainingAdmins = users.filter(
    (user) => user.role === "admin" && normalizeUsername(user.username) !== normalizedTarget,
  );

  if (targetUser.role === "admin" && remainingAdmins.length === 0) {
    throw new Error("Cannot remove the last admin account.");
  }

  await removeUserByUsername(input.targetUsername);
}
