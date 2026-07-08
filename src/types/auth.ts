export type PlayerGender = "male" | "female";

export type UserRole = "user" | "admin";

export type RegisteredUser = {
  userId: string;
  username: string;
  password: string;
  playerName: string;
  gender: PlayerGender;
  role: UserRole;
  dateAdded: string;
};

export type PublicUser = Omit<RegisteredUser, "password">;

export type AuthUser = {
  username: string;
  playerName: string;
  gender: PlayerGender;
  role: UserRole;
};
