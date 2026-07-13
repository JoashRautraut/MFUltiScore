import { type StatType } from "@/types/stats";

const STORAGE_PREFIX = "mfultiscore_live_game";

type TeamIndex = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
type TeamKey = `team${TeamIndex}`;
type PlayerGender = "male" | "female";
type Screen = "home" | "setup" | "live" | "summary" | "dashboard" | "profile";

type ActivePlayer = {
  name: string;
  team: TeamKey;
  counts: Record<StatType, number>;
};

type LogEntry = {
  id: number;
  playerName: string;
  team: TeamKey;
  statType: StatType;
  timestampLabel: string;
};

export type PersistedLiveGameState = {
  version: 1;
  liveGameActive: boolean;
  liveGameEnded?: boolean;
  screen: Screen;
  date: string;
  gameDurationMinutes: string;
  matchup: { home: TeamKey; away: TeamKey };
  playerAssignments: Record<string, TeamKey | null>;
  playerGenders: Record<string, PlayerGender>;
  teamPlayers: Record<TeamKey, ActivePlayer[]>;
  logEntries: LogEntry[];
  timerSeconds: number;
  timerRunning: boolean;
  timerUpdatedAt: string;
};

function storageKey(username: string) {
  return `${STORAGE_PREFIX}:${username}`;
}

function isTeamKey(value: string): value is TeamKey {
  return /^team([1-9]|1[0-5])$/.test(value);
}

function parsePersistedState(raw: string): PersistedLiveGameState | null {
  try {
    const parsed = JSON.parse(raw) as PersistedLiveGameState;
    if (parsed.version !== 1 || !parsed.liveGameActive) {
      return null;
    }

    if (!parsed.matchup || !isTeamKey(parsed.matchup.home) || !isTeamKey(parsed.matchup.away)) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function adjustTimer(state: PersistedLiveGameState): PersistedLiveGameState {
  if (!state.timerRunning || !state.timerUpdatedAt) {
    return state;
  }

  const elapsed = Math.floor((Date.now() - new Date(state.timerUpdatedAt).getTime()) / 1000);
  const timerSeconds = Math.max(0, state.timerSeconds - elapsed);

  return {
    ...state,
    timerSeconds,
    timerRunning: timerSeconds > 0 && state.timerRunning,
    timerUpdatedAt: new Date().toISOString(),
  };
}

export function loadLiveGameState(username: string): PersistedLiveGameState | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = localStorage.getItem(storageKey(username));
  if (!raw) {
    return null;
  }

  const parsed = parsePersistedState(raw);
  if (!parsed) {
    return null;
  }

  return adjustTimer(parsed);
}

export function saveLiveGameState(username: string, state: Omit<PersistedLiveGameState, "version" | "timerUpdatedAt">) {
  if (typeof window === "undefined" || !state.liveGameActive) {
    return;
  }

  const payload: PersistedLiveGameState = {
    version: 1,
    ...state,
    timerUpdatedAt: new Date().toISOString(),
  };

  localStorage.setItem(storageKey(username), JSON.stringify(payload));
}

export function clearLiveGameState(username: string) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem(storageKey(username));
}
