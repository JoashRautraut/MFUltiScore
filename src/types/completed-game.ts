import { StatType } from "@/types/stats";

export type SerializedActivePlayer = {
  name: string;
  team: string;
  counts: Record<StatType, number>;
};

export type SerializedCompletedGame = {
  id: string;
  date: string;
  endedAt: string;
  timerSeconds: number;
  matchup: {
    home: string;
    away: string;
  };
  teamPlayers: Record<string, SerializedActivePlayer[]>;
  bestPlayer: {
    name: string;
    team: string;
    percentage: number;
    points: number;
  };
};

export type SaveCompletedGameInput = Omit<SerializedCompletedGame, "id"> & {
  matchupLabel: string;
};

export type StoredGameMetadata = Omit<SaveCompletedGameInput, "matchupLabel">;
