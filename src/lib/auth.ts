export type { AuthUser, PlayerGender, PublicUser, RegisteredUser, UserRole } from "@/types/auth";

import type { AuthUser, PlayerGender, PublicUser } from "@/types/auth";

const AUTH_STORAGE_KEY = "mfultiscore_auth";
const ADMIN_UNLOCK_KEY = "mfultiscore_admin_unlock";

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

export function toRegisteredPlayers(users: PublicUser[]): { name: string; gender: PlayerGender }[] {
  return users.map((user) => ({
    name: user.playerName,
    gender: user.gender,
  }));
}
