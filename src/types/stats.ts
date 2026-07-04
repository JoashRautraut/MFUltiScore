import { PlayerGender } from "@/types/auth";

export const STAT_TYPES = ["Block", "Assist", "Score", "Callahan"] as const;

export type StatType = (typeof STAT_TYPES)[number];

export type Player = {
  playerId: string;
  name: string;
  dateAdded: string;
  gender: PlayerGender;
};

export type Game = {
  gameId: string;
  date: string;
  opponent: string;
  location: string;
};

export type StatEntry = {
  statId: string;
  gameId: string;
  playerName: string;
  statType: StatType;
  timestamp: string;
};

export type GameSummaryRow = {
  playerName: string;
  Block: number;
  Assist: number;
  Score: number;
  Callahan: number;
  total: number;
};
