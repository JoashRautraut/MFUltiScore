"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PlayerProgressChart } from "@/components/PlayerProgressChart";
import { HubPanelCard, PANEL_IMAGE_PATHS } from "@/components/HubPanelCard";
import { ProfilePhotoAvatar } from "@/components/ProfilePhotoPicker";
import { ProfileScreen, type PersonalProgress, type ProfileSubject } from "@/components/ProfileScreen";
import { fetchCompletedGames, fetchProfileMedia, fetchRegisteredUsers, fetchSheetPlayers, isStaticHosting, saveCompletedGame } from "@/lib/client-api";
import { cacheProfileMediaBundle } from "@/lib/profile-media-cache";
import { STAT_TYPES, StatType, type Player } from "@/types/stats";
import { clearAuthUser, getAuthUser, isAdmin, toRegisteredPlayers, type AuthUser } from "@/lib/auth";
import type { PublicUser } from "@/types/auth";
import { clearLiveGameState, loadLiveGameState, saveLiveGameState } from "@/lib/live-game-storage";

type Screen = "home" | "setup" | "live" | "summary" | "dashboard" | "profile";

const SCREEN_TITLES: Record<Screen, string> = {
  home: "MFULTISCORE",
  setup: "Setup",
  live: "Live Game",
  summary: "Summary",
  dashboard: "Dashboard",
  profile: "Profile",
};

type PersonalGameRecord = {
  gameId: string;
  date: string;
  endedAt: string;
  team: TeamKey;
  matchupLabel: string;
  counts: Record<StatType, number>;
  points: number;
  wasMvp: boolean;
  mvpPercentage: number;
};
type TeamIndex = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15;
type TeamKey = `team${TeamIndex}`;
type PlayerGender = "male" | "female";

type DashboardPlayer = {
  name: string;
  gender: PlayerGender;
  points: number;
  games: number;
  bestPlayerWins: number;
  topPercentage: number;
};

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

type CompletedGame = {
  id: string;
  date: string;
  endedAt: string;
  timerSeconds: number;
  matchup: {
    home: TeamKey;
    away: TeamKey;
  };
  teamPlayers: Record<TeamKey, ActivePlayer[]>;
  bestPlayer: {
    name: string;
    team: TeamKey;
    percentage: number;
    points: number;
  };
};

const TEAM_OPTIONS = Array.from({ length: 15 }, (_, index) => ({
  key: `team${index + 1}` as TeamKey,
  label: `Team ${index + 1}`,
}));

const STAT_ABBR: Record<StatType, string> = {
  Score: "G",
  Assist: "A",
  Block: "B",
  Callahan: "C",
};

function toCompletedGame(game: Awaited<ReturnType<typeof fetchCompletedGames>>[number]): CompletedGame {
  const teamPlayers = createEmptyTeamPlayers();
  for (const option of TEAM_OPTIONS) {
    teamPlayers[option.key] = (game.teamPlayers[option.key] ?? []).map((player) => ({
      name: player.name,
      team: player.team as TeamKey,
      counts: player.counts,
    }));
  }

  return {
    id: game.id,
    date: game.date,
    endedAt: game.endedAt,
    timerSeconds: game.timerSeconds,
    matchup: {
      home: game.matchup.home as TeamKey,
      away: game.matchup.away as TeamKey,
    },
    teamPlayers,
    bestPlayer: {
      name: game.bestPlayer.name,
      team: game.bestPlayer.team as TeamKey,
      percentage: game.bestPlayer.percentage,
      points: game.bestPlayer.points,
    },
  };
}

function emptyCounts(): Record<StatType, number> {
  return { Block: 0, Assist: 0, Score: 0, Callahan: 0 };
}

function createPlayer(name: string, team: TeamKey): ActivePlayer {
  return { name, team, counts: emptyCounts() };
}

function createEmptyTeamPlayers(): Record<TeamKey, ActivePlayer[]> {
  return TEAM_OPTIONS.reduce(
    (acc, option) => {
      acc[option.key] = [];
      return acc;
    },
    {} as Record<TeamKey, ActivePlayer[]>,
  );
}

function createEmptyTeamNameGroups(): Record<TeamKey, string[]> {
  return TEAM_OPTIONS.reduce(
    (acc, option) => {
      acc[option.key] = [];
      return acc;
    },
    {} as Record<TeamKey, string[]>,
  );
}

function flattenPlayers(teamPlayers: Record<TeamKey, ActivePlayer[]>) {
  return TEAM_OPTIONS.flatMap(({ key }) => teamPlayers[key]);
}

function getTeamLabel(team: TeamKey) {
  return TEAM_OPTIONS.find((option) => option.key === team)?.label ?? team;
}

function getTeamAccent(team: TeamKey) {
  const palette = [
    { soft: "bg-slate-900/80", strong: "bg-blue-600", ring: "border-blue-500/40", badge: "bg-blue-500/20 text-blue-200", label: "text-blue-300" },
    { soft: "bg-slate-900/80", strong: "bg-emerald-600", ring: "border-emerald-500/40", badge: "bg-emerald-500/20 text-emerald-200", label: "text-emerald-300" },
    { soft: "bg-slate-900/80", strong: "bg-amber-500", ring: "border-amber-500/40", badge: "bg-amber-500/20 text-amber-200", label: "text-amber-300" },
    { soft: "bg-slate-900/80", strong: "bg-violet-600", ring: "border-violet-500/40", badge: "bg-violet-500/20 text-violet-200", label: "text-violet-300" },
    { soft: "bg-slate-900/80", strong: "bg-rose-600", ring: "border-rose-500/40", badge: "bg-rose-500/20 text-rose-200", label: "text-rose-300" },
    { soft: "bg-slate-900/80", strong: "bg-cyan-600", ring: "border-cyan-500/40", badge: "bg-cyan-500/20 text-cyan-200", label: "text-cyan-300" },
    { soft: "bg-slate-900/80", strong: "bg-orange-500", ring: "border-orange-500/40", badge: "bg-orange-500/20 text-orange-200", label: "text-orange-300" },
    { soft: "bg-slate-900/80", strong: "bg-indigo-600", ring: "border-indigo-500/40", badge: "bg-indigo-500/20 text-indigo-200", label: "text-indigo-300" },
    { soft: "bg-slate-900/80", strong: "bg-lime-600", ring: "border-lime-500/40", badge: "bg-lime-500/20 text-lime-200", label: "text-lime-300" },
    { soft: "bg-slate-900/80", strong: "bg-fuchsia-600", ring: "border-fuchsia-500/40", badge: "bg-fuchsia-500/20 text-fuchsia-200", label: "text-fuchsia-300" },
    { soft: "bg-slate-900/80", strong: "bg-sky-600", ring: "border-sky-500/40", badge: "bg-sky-500/20 text-sky-200", label: "text-sky-300" },
    { soft: "bg-slate-900/80", strong: "bg-teal-600", ring: "border-teal-500/40", badge: "bg-teal-500/20 text-teal-200", label: "text-teal-300" },
    { soft: "bg-slate-900/80", strong: "bg-pink-600", ring: "border-pink-500/40", badge: "bg-pink-500/20 text-pink-200", label: "text-pink-300" },
    { soft: "bg-slate-900/80", strong: "bg-red-600", ring: "border-red-500/40", badge: "bg-red-500/20 text-red-200", label: "text-red-300" },
    { soft: "bg-slate-900/80", strong: "bg-yellow-500", ring: "border-yellow-500/40", badge: "bg-yellow-500/20 text-yellow-200", label: "text-yellow-300" },
  ];
  const index = TEAM_OPTIONS.findIndex((option) => option.key === team);
  return palette[index % palette.length];
}

function getDifferentTeam(team: TeamKey): TeamKey {
  return (TEAM_OPTIONS.find((option) => option.key !== team)?.key ?? "team1") as TeamKey;
}

function totalCounts(counts: Record<StatType, number>) {
  return STAT_TYPES.reduce((sum, statType) => sum + counts[statType], 0);
}

function playerPoints(counts: Record<StatType, number>) {
  return counts.Block + counts.Assist + counts.Score + counts.Callahan * 2;
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

function formatClockTime(dateValue: Date) {
  return dateValue.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getBestPlayer(teamPlayers: Record<TeamKey, ActivePlayer[]>) {
  const players = flattenPlayers(teamPlayers);
  const totalPoints = players.reduce((sum, player) => sum + playerPoints(player.counts), 0);
  const winner =
    [...players].sort((a, b) => playerPoints(b.counts) - playerPoints(a.counts))[0] ??
    createPlayer("No player", "team1");
  const winnerPoints = playerPoints(winner.counts);

  return {
    name: winner.name,
    team: winner.team,
    points: winnerPoints,
    percentage: totalPoints === 0 ? 0 : Math.round((winnerPoints / totalPoints) * 100),
  };
}

function buildPlayerProgress(
  playerName: string,
  gender: PlayerGender,
  completedGames: CompletedGame[],
  dashboardPlayers: DashboardPlayer[],
): PersonalProgress {
  const normalizedName = playerName.trim().toLowerCase();
  const gameHistory: PersonalGameRecord[] = [];
  const statsTotals = emptyCounts();
  let totalPoints = 0;
  let mvpWins = 0;
  let bestMvpPercentage = 0;

  for (const game of completedGames) {
    for (const player of flattenPlayers(game.teamPlayers)) {
      if (player.name.trim().toLowerCase() !== normalizedName) {
        continue;
      }

      const points = playerPoints(player.counts);
      totalPoints += points;

      for (const statType of STAT_TYPES) {
        statsTotals[statType] += player.counts[statType];
      }

      const wasMvp = game.bestPlayer.name.trim().toLowerCase() === normalizedName;
      if (wasMvp) {
        mvpWins += 1;
        bestMvpPercentage = Math.max(bestMvpPercentage, game.bestPlayer.percentage);
      }

      gameHistory.push({
        gameId: game.id,
        date: game.date,
        endedAt: game.endedAt,
        team: player.team,
        matchupLabel: `${getTeamLabel(game.matchup.home)} vs ${getTeamLabel(game.matchup.away)}`,
        counts: player.counts,
        points,
        wasMvp,
        mvpPercentage: wasMvp ? game.bestPlayer.percentage : 0,
      });
    }
  }

  const genderRanking = dashboardPlayers.filter((player) => player.gender === gender);
  const rankIndex = genderRanking.findIndex(
    (player) => player.name.trim().toLowerCase() === normalizedName,
  );

  return {
    gameHistory: [...gameHistory].sort((a, b) => b.date.localeCompare(a.date)),
    gamesPlayed: gameHistory.length,
    totalPoints,
    statsTotals,
    mvpWins,
    bestMvpPercentage,
    genderRank: rankIndex >= 0 ? rankIndex + 1 : null,
    genderPoolSize: genderRanking.length,
    totalActions: totalCounts(statsTotals),
  };
}

function getRankMedal(rank: number) {
  if (rank === 1) {
    return { emoji: "🥇", rowClass: "bg-amber-500/10 ring-1 ring-amber-500/30", badgeClass: "bg-amber-500/20 text-amber-300" };
  }
  if (rank === 2) {
    return { emoji: "🥈", rowClass: "bg-slate-800/80 ring-1 ring-slate-600", badgeClass: "bg-slate-700 text-slate-200" };
  }
  if (rank === 3) {
    return { emoji: "🥉", rowClass: "bg-orange-500/10 ring-1 ring-orange-500/30", badgeClass: "bg-orange-500/20 text-orange-300" };
  }
  return null;
}

function buildActiveRosterNames(
  sheetPlayers: Player[],
  registeredPlayers: Array<{ name: string }>,
): string[] {
  const names = new Set<string>();
  for (const player of sheetPlayers) {
    names.add(player.name);
  }
  for (const player of registeredPlayers) {
    names.add(player.name);
  }
  return [...names].sort((a, b) => a.localeCompare(b));
}

function resolvePlayerGender(
  name: string,
  sheetPlayers: Player[],
  registeredPlayers: Array<{ name: string; gender: PlayerGender }>,
  fallback?: PlayerGender,
): PlayerGender {
  const normalized = name.trim().toLowerCase();
  const registered = registeredPlayers.find(
    (player) => player.name.trim().toLowerCase() === normalized,
  );
  if (registered) {
    return registered.gender;
  }

  const sheetPlayer = sheetPlayers.find(
    (player) => player.name.trim().toLowerCase() === normalized,
  );
  if (sheetPlayer) {
    return sheetPlayer.gender;
  }

  return fallback ?? "male";
}

export default function Home() {
  const router = useRouter();
  const [authUser, setAuthUserState] = useState<AuthUser | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [screen, setScreen] = useState<Screen>("home");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [gameDurationMinutes, setGameDurationMinutes] = useState("");
  const [playerSearch, setPlayerSearch] = useState("");
  const [matchup, setMatchup] = useState<{ home: TeamKey; away: TeamKey }>({
    home: "team1",
    away: "team2",
  });
  const [playerAssignments, setPlayerAssignments] = useState<Record<string, TeamKey | null>>({});
  const [playerGenders, setPlayerGenders] = useState<Record<string, PlayerGender>>({});
  const [teamPlayers, setTeamPlayers] = useState<Record<TeamKey, ActivePlayer[]>>(createEmptyTeamPlayers());
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [completedGames, setCompletedGames] = useState<CompletedGame[]>([]);
  const [isLoadingGames, setIsLoadingGames] = useState(true);
  const [gamesLoadError, setGamesLoadError] = useState("");
  const [isSavingGame, setIsSavingGame] = useState(false);
  const [saveGameError, setSaveGameError] = useState("");
  const [liveGameActive, setLiveGameActive] = useState(false);
  const [liveGameEnded, setLiveGameEnded] = useState(false);
  const [profilePhotoVersion, setProfilePhotoVersion] = useState(0);
  const [dashboardTab, setDashboardTab] = useState<"male" | "female">("male");
  const [registeredAccounts, setRegisteredAccounts] = useState<PublicUser[]>([]);
  const [viewingProfile, setViewingProfile] = useState<ProfileSubject | null>(null);
  const [profileReturnScreen, setProfileReturnScreen] = useState<Screen>("home");

  const canResumeLiveGame = liveGameActive && !liveGameEnded;

  const syncRosterFromSources = useCallback(
    (sheetPlayers: Player[], registeredUsers: PublicUser[]) => {
      const registeredPlayers = toRegisteredPlayers(registeredUsers);
      const activeRosterNames = buildActiveRosterNames(sheetPlayers, registeredPlayers);

      setRegisteredAccounts(registeredUsers);

      setPlayerAssignments((current) => {
        const next: Record<string, TeamKey | null> = {};
        for (const name of activeRosterNames) {
          next[name] = current[name] ?? null;
        }
        return next;
      });

      setPlayerGenders((current) => {
        const next: Record<string, PlayerGender> = {};
        for (const name of activeRosterNames) {
          next[name] = resolvePlayerGender(name, sheetPlayers, registeredPlayers, current[name]);
        }
        return next;
      });
    },
    [],
  );

  const parsedDurationMinutes = useMemo(() => {
    const value = Number(gameDurationMinutes);
    if (!Number.isFinite(value) || value <= 0) {
      return null;
    }
    return value;
  }, [gameDurationMinutes]);

  const configuredDurationSeconds = useMemo(
    () => (parsedDurationMinutes ?? 0) * 60,
    [parsedDurationMinutes],
  );

  function handleGameDurationMinutesChange(value: string) {
    setGameDurationMinutes(value);

    if (canResumeLiveGame) {
      return;
    }

    const minutes = Number(value);
    if (Number.isFinite(minutes) && minutes > 0) {
      setTimerSeconds(Math.floor(minutes * 60));
      setTimerRunning(false);
    }
  }

  useEffect(() => {
    const user = getAuthUser();
    if (!user) {
      router.replace("/login");
      return;
    }

    setAuthUserState(user);

    const savedLiveGame = loadLiveGameState(user.username);
    if (savedLiveGame?.liveGameActive) {
      setDate(savedLiveGame.date);
      setGameDurationMinutes(savedLiveGame.gameDurationMinutes);
      setMatchup(savedLiveGame.matchup);
      setPlayerAssignments(savedLiveGame.playerAssignments);
      setPlayerGenders(savedLiveGame.playerGenders);

      const restoredTeamPlayers = createEmptyTeamPlayers();
      for (const option of TEAM_OPTIONS) {
        restoredTeamPlayers[option.key] = savedLiveGame.teamPlayers[option.key] ?? [];
      }
      setTeamPlayers(restoredTeamPlayers);
      setLogEntries(savedLiveGame.logEntries);
      setTimerSeconds(savedLiveGame.timerSeconds);
      setTimerRunning(savedLiveGame.timerRunning);
      setLiveGameEnded(
        savedLiveGame.liveGameEnded ?? savedLiveGame.screen === "summary",
      );
      setLiveGameActive(true);
      setScreen(
        savedLiveGame.screen === "live" || savedLiveGame.screen === "summary"
          ? savedLiveGame.screen
          : "live",
      );
    } else {
      setScreen("home");
    }

    setIsAuthChecking(false);
  }, [router]);

  useEffect(() => {
    if (isAuthChecking) {
      return;
    }

    let cancelled = false;

    async function loadData() {
      setIsLoadingGames(true);
      setGamesLoadError("");

      try {
        const [games, sheetPlayers, registeredUsers] = await Promise.all([
          fetchCompletedGames(),
          fetchSheetPlayers(),
          fetchRegisteredUsers(),
        ]);

        if (cancelled) {
          return;
        }

        const gamesMapped = games.map(toCompletedGame);
        setCompletedGames(gamesMapped);
        syncRosterFromSources(sheetPlayers, registeredUsers);

        const user = getAuthUser();
        if (user && !isStaticHosting()) {
          const bundle = await fetchProfileMedia(user.username);
          if (!cancelled) {
            cacheProfileMediaBundle(bundle);
            setProfilePhotoVersion((current) => current + 1);
          }
        }
      } catch (error) {
        if (!cancelled) {
          setGamesLoadError(
            error instanceof Error ? error.message : "Failed to load data from Google Sheets.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoadingGames(false);
        }
      }
    }

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [isAuthChecking, syncRosterFromSources]);

  useEffect(() => {
    if (isAuthChecking) {
      return;
    }

    let cancelled = false;

    async function refreshRoster() {
      try {
        const [sheetPlayers, registeredUsers] = await Promise.all([
          fetchSheetPlayers(),
          fetchRegisteredUsers(),
        ]);

        if (!cancelled) {
          syncRosterFromSources(sheetPlayers, registeredUsers);
        }
      } catch {
        // Keep the current roster if a background refresh fails.
      }
    }

    const interval = window.setInterval(() => {
      void refreshRoster();
    }, 12000);

    function handleFocus() {
      void refreshRoster();
    }

    window.addEventListener("focus", handleFocus);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, [isAuthChecking, syncRosterFromSources]);

  useEffect(() => {
    if (isAuthChecking || !authUser || !liveGameActive) {
      return;
    }

    saveLiveGameState(authUser.username, {
      liveGameActive,
      liveGameEnded,
      screen,
      date,
      gameDurationMinutes,
      matchup,
      playerAssignments,
      playerGenders,
      teamPlayers,
      logEntries,
      timerSeconds,
      timerRunning,
    });
  }, [
    isAuthChecking,
    authUser,
    liveGameActive,
    liveGameEnded,
    screen,
    date,
    gameDurationMinutes,
    matchup,
    playerAssignments,
    playerGenders,
    teamPlayers,
    logEntries,
    timerSeconds,
    timerRunning,
  ]);

  const userIsAdmin = isAdmin(authUser);

  const hubPanels = useMemo(() => {
    const panels = [
      {
        screen: "setup" as const,
        title: "Setup",
        subtitle: "Teams, players & timer",
        colorClass: "bg-blue-600",
        imageSrc: PANEL_IMAGE_PATHS.setup,
        adminOnly: true,
        badge: undefined as string | undefined,
      },
      {
        screen: "live" as const,
        title: "Live Game",
        subtitle: "Track stats in real time",
        colorClass: "bg-rose-500",
        imageSrc: PANEL_IMAGE_PATHS.live,
        adminOnly: true,
        badge: canResumeLiveGame ? "In progress" : undefined,
      },
      {
        screen: "summary" as const,
        title: "Summary",
        subtitle: "Review & save game results",
        colorClass: "bg-violet-600",
        imageSrc: PANEL_IMAGE_PATHS.summary,
        adminOnly: false,
        badge: undefined,
      },
      {
        screen: "dashboard" as const,
        title: "Dashboard",
        subtitle: "Rankings & game history",
        colorClass: "bg-amber-500",
        imageSrc: PANEL_IMAGE_PATHS.dashboard,
        adminOnly: false,
        badge: undefined,
      },
      {
        screen: "profile" as const,
        title: "Profile",
        subtitle: "Your stats & photo",
        colorClass: "bg-slate-900",
        imageSrc: PANEL_IMAGE_PATHS.profile,
        adminOnly: false,
        badge: undefined,
      },
    ];

    return panels.filter((panel) => !panel.adminOnly || userIsAdmin);
  }, [userIsAdmin, canResumeLiveGame]);

  useEffect(() => {
    if (isAuthChecking || userIsAdmin) {
      return;
    }

    if (screen === "setup" || screen === "live") {
      setScreen("home");
    }
  }, [isAuthChecking, userIsAdmin, screen]);

  function handleLogout() {
    clearAuthUser();
    router.replace("/login");
  }

  useEffect(() => {
    if (!timerRunning || timerSeconds <= 0) {
      return;
    }

    const interval = window.setInterval(() => {
      setTimerSeconds((current) => {
        if (current <= 1) {
          window.clearInterval(interval);
          setTimerRunning(false);
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [timerRunning, timerSeconds]);

  const allSetupPlayers = useMemo(
    () => Object.keys(playerAssignments).sort((a, b) => a.localeCompare(b)),
    [playerAssignments],
  );

  const teamSelections = useMemo(() => {
    return TEAM_OPTIONS.reduce(
      (acc, option) => {
        acc[option.key] = allSetupPlayers.filter(
          (player) => playerAssignments[player] === option.key,
        );
        return acc;
      },
      createEmptyTeamNameGroups(),
    );
  }, [allSetupPlayers, playerAssignments]);

  const filteredSetupPlayers = useMemo(() => {
    const query = playerSearch.trim().toLowerCase();
    if (!query) {
      return allSetupPlayers;
    }

    return allSetupPlayers.filter((player) =>
      player.toLowerCase().includes(query),
    );
  }, [allSetupPlayers, playerSearch]);

  const filteredMalePlayers = useMemo(
    () =>
      filteredSetupPlayers.filter(
        (player) => (playerGenders[player] ?? "male") === "male",
      ),
    [filteredSetupPlayers, playerGenders],
  );

  const filteredFemalePlayers = useMemo(
    () =>
      filteredSetupPlayers.filter(
        (player) => playerGenders[player] === "female",
      ),
    [filteredSetupPlayers, playerGenders],
  );

  const allActivePlayers = useMemo(
    () => flattenPlayers(teamPlayers),
    [teamPlayers],
  );

  const matchupTeams = useMemo(
    () => [matchup.home, matchup.away],
    [matchup],
  );

  useEffect(() => {
    if (!liveGameActive) {
      return;
    }

    setTeamPlayers((current) => {
      const next = { ...current };

      for (const key of matchupTeams) {
        const assignedNames = teamSelections[key];
        const existingByName = new Map(current[key].map((player) => [player.name, player]));
        next[key] = assignedNames.map(
          (name) => existingByName.get(name) ?? createPlayer(name, key),
        );
      }

      return next;
    });
  }, [liveGameActive, matchupTeams, teamSelections]);

  const matchupPlayers = useMemo(
    () => ({
      home: teamPlayers[matchup.home],
      away: teamPlayers[matchup.away],
    }),
    [matchup, teamPlayers],
  );

  const matchupScore = useMemo(
    () => ({
      home: matchupPlayers.home.reduce((sum, player) => sum + player.counts.Score, 0),
      away: matchupPlayers.away.reduce((sum, player) => sum + player.counts.Score, 0),
    }),
    [matchupPlayers],
  );

  const elapsedSeconds = useMemo(
    () => Math.max(configuredDurationSeconds - timerSeconds, 0),
    [configuredDurationSeconds, timerSeconds],
  );

  const bestPlayerToday = useMemo(
    () =>
      getBestPlayer(
        TEAM_OPTIONS.reduce(
          (acc, option) => {
            acc[option.key] =
              matchup.home === option.key || matchup.away === option.key
                ? teamPlayers[option.key]
                : [];
            return acc;
          },
          createEmptyTeamPlayers(),
        ),
      ),
    [matchup, teamPlayers],
  );

  const dashboardPlayers = useMemo(() => {
    const totals = new Map<string, DashboardPlayer>();

    for (const game of completedGames) {
      for (const player of flattenPlayers(game.teamPlayers)) {
        const current = totals.get(player.name) ?? {
          name: player.name,
          gender: playerGenders[player.name] ?? "male",
          points: 0,
          games: 0,
          bestPlayerWins: 0,
          topPercentage: 0,
        };

        current.points += playerPoints(player.counts);
        current.games += 1;

        if (game.bestPlayer.name === player.name) {
          current.bestPlayerWins += 1;
          current.topPercentage = Math.max(current.topPercentage, game.bestPlayer.percentage);
        }

        totals.set(player.name, current);
      }
    }

    for (const playerName of allSetupPlayers) {
      if (!totals.has(playerName)) {
        totals.set(playerName, {
          name: playerName,
          gender: playerGenders[playerName] ?? "male",
          points: 0,
          games: 0,
          bestPlayerWins: 0,
          topPercentage: 0,
        });
      }
    }

    return [...totals.values()].sort((a, b) => b.points - a.points);
  }, [allSetupPlayers, completedGames, playerGenders]);

  const maleRanking = useMemo(
    () => dashboardPlayers.filter((player) => player.gender === "male"),
    [dashboardPlayers],
  );

  const femaleRanking = useMemo(
    () => dashboardPlayers.filter((player) => player.gender === "female"),
    [dashboardPlayers],
  );

  const bestMalePlayer = useMemo(() => maleRanking[0] ?? null, [maleRanking]);
  const bestFemalePlayer = useMemo(() => femaleRanking[0] ?? null, [femaleRanking]);

  const playerUsernameByName = useMemo(() => {
    const map = new Map<string, string>();
    for (const account of registeredAccounts) {
      map.set(account.playerName.trim().toLowerCase(), account.username);
    }
    return map;
  }, [registeredAccounts]);

  function getUsernameForPlayer(playerName: string) {
    return playerUsernameByName.get(playerName.trim().toLowerCase()) ?? "";
  }

  function openOwnProfile() {
    setViewingProfile(null);
    setProfileReturnScreen(screen);
    setScreen("profile");
  }

  function openPlayerProfile(playerName: string) {
    if (
      authUser &&
      authUser.playerName.trim().toLowerCase() === playerName.trim().toLowerCase()
    ) {
      openOwnProfile();
      return;
    }

    const account = registeredAccounts.find(
      (user) => user.playerName.trim().toLowerCase() === playerName.trim().toLowerCase(),
    );

    setProfileReturnScreen(screen);
    setViewingProfile({
      username: getUsernameForPlayer(playerName) || playerName,
      playerName,
      gender: playerGenders[playerName] ?? account?.gender ?? "male",
      role: account?.role,
    });
    setScreen("profile");
  }

  function closeProfile() {
    setViewingProfile(null);
    setScreen(profileReturnScreen);
  }

  const activeProfileUser = useMemo((): ProfileSubject | null => {
    if (!authUser) {
      return null;
    }

    if (viewingProfile) {
      return viewingProfile;
    }

    return {
      username: authUser.username,
      playerName: authUser.playerName,
      gender: authUser.gender,
      role: authUser.role,
    };
  }, [authUser, viewingProfile]);

  const activeProfileProgress = useMemo(() => {
    if (!activeProfileUser) {
      return null;
    }

    return buildPlayerProgress(
      activeProfileUser.playerName,
      activeProfileUser.gender,
      completedGames,
      dashboardPlayers,
    );
  }, [activeProfileUser, completedGames, dashboardPlayers]);

  function syncLiveRoster(name: string, team: TeamKey | null) {
    setTeamPlayers((current) => {
      const next = { ...current };
      let existingPlayer: ActivePlayer | null = null;

      for (const teamKey of matchupTeams) {
        const found = next[teamKey].find((player) => player.name === name);
        if (found) {
          existingPlayer = found;
        }
        next[teamKey] = next[teamKey].filter((player) => player.name !== name);
      }

      if (team && matchupTeams.includes(team)) {
        next[team] = [
          ...next[team],
          existingPlayer ?? createPlayer(name, team),
        ];
      }

      return next;
    });
  }

  function assignPlayer(name: string, team: TeamKey | null) {
    setPlayerAssignments((current) => ({
      ...current,
      [name]: team,
    }));

    if (liveGameActive) {
      syncLiveRoster(name, team);
    }
  }

  function startLiveGame() {
    if (!parsedDurationMinutes) {
      return;
    }

    const nextTeamPlayers = createEmptyTeamPlayers();
    for (const key of matchupTeams) {
      nextTeamPlayers[key] = teamSelections[key].map((name) => createPlayer(name, key));
    }
    setTeamPlayers(nextTeamPlayers);
    setLogEntries([]);
    setTimerSeconds(configuredDurationSeconds);
    setTimerRunning(true);
    setLiveGameEnded(false);
    setLiveGameActive(true);
    setScreen("live");
  }

  function updateTeamPlayers(team: TeamKey, updater: (players: ActivePlayer[]) => ActivePlayer[]) {
    setTeamPlayers((current) => ({
      ...current,
      [team]: updater(current[team]),
    }));
  }

  function addStat(playerName: string, team: TeamKey, statType: StatType) {
    updateTeamPlayers(team, (current) =>
      current.map((player) =>
        player.name === playerName
          ? {
              ...player,
              counts: {
                ...player.counts,
                [statType]: player.counts[statType] + 1,
              },
            }
          : player,
      ),
    );

    setLogEntries((current) => [
      {
        id: Date.now(),
        playerName,
        team,
        statType,
        timestampLabel: formatTime(elapsedSeconds),
      },
      ...current,
    ]);
  }

  function undoLastPlayerEntry(playerName: string, team: TeamKey) {
    let entryToUndo: LogEntry | undefined;

    setLogEntries((current) => {
      const entryIndex = current.findIndex(
        (entry) => entry.playerName === playerName && entry.team === team,
      );
      if (entryIndex === -1) {
        return current;
      }

      entryToUndo = current[entryIndex];
      return [...current.slice(0, entryIndex), ...current.slice(entryIndex + 1)];
    });

    if (!entryToUndo) {
      return;
    }

    const entry = entryToUndo;
    updateTeamPlayers(entry.team, (players) =>
      players.map((player) =>
        player.name === entry.playerName
          ? {
              ...player,
              counts: {
                ...player.counts,
                [entry.statType]: Math.max(player.counts[entry.statType] - 1, 0),
              },
            }
          : player,
      ),
    );
  }

  function canUndoPlayer(playerName: string, team: TeamKey) {
    return logEntries.some((entry) => entry.playerName === playerName && entry.team === team);
  }

  function endGame() {
    setTimerRunning(false);
    setLiveGameEnded(true);
    setScreen("summary");
  }

  async function saveGame() {
    if (!userIsAdmin) {
      return;
    }

    const matchupPlayers = TEAM_OPTIONS.reduce(
      (acc, option) => {
        acc[option.key] =
          matchup.home === option.key || matchup.away === option.key
            ? teamPlayers[option.key]
            : [];
        return acc;
      },
      createEmptyTeamPlayers(),
    );
    const bestPlayer = getBestPlayer(matchupPlayers);
    const endedAt = formatClockTime(new Date());
    const matchupLabel = `${getTeamLabel(matchup.home)} vs ${getTeamLabel(matchup.away)}`;

    setIsSavingGame(true);
    setSaveGameError("");

    try {
      const savedGame = await saveCompletedGame({
        date,
        endedAt,
        timerSeconds: elapsedSeconds,
        matchup: {
          home: matchup.home,
          away: matchup.away,
        },
        teamPlayers: matchupPlayers,
        bestPlayer,
        matchupLabel,
      });

      setCompletedGames((current) => [toCompletedGame(savedGame), ...current]);
      if (authUser) {
        clearLiveGameState(authUser.username);
      }
      setLiveGameActive(false);
      setLiveGameEnded(false);
      setTimerSeconds(0);
      setTimerRunning(false);
      setLogEntries([]);
      setTeamPlayers(createEmptyTeamPlayers());
      setScreen("summary");
    } catch (error) {
      setSaveGameError(
        error instanceof Error ? error.message : "Failed to save game to Google Sheets.",
      );
    } finally {
      setIsSavingGame(false);
    }
  }

  function renderSetupPlayerRow(player: string) {
    const assignment = playerAssignments[player];
    const accent = assignment ? getTeamAccent(assignment) : null;

    return (
      <div
        key={player}
        className={`flex flex-col gap-1.5 rounded-xl border px-2.5 py-2 sm:flex-row sm:items-center sm:gap-2 sm:px-3 ${
          accent ? `${accent.ring} ${accent.soft}` : "border-slate-700 bg-slate-900/80"
        }`}
      >
        <button
          type="button"
          onClick={() => openPlayerProfile(player)}
          className="w-full text-left text-sm font-medium leading-snug text-white transition hover:text-blue-300 sm:min-w-0 sm:flex-1 sm:truncate"
        >
          {player}
        </button>

        <label className="w-full shrink-0 sm:w-32">
          <span className="sr-only">Assign team for {player}</span>
          <select
            value={assignment ?? ""}
            onChange={(event) => {
              const value = event.target.value;
              assignPlayer(player, value === "" ? null : (value as TeamKey));
            }}
            className={`w-full rounded-lg border bg-slate-950 px-2 py-1.5 text-xs font-medium text-white outline-none focus:border-blue-400 sm:text-sm ${
              accent ? accent.ring : "border-slate-700"
            }`}
          >
            <option value="">No team</option>
            {TEAM_OPTIONS.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    );
  }

  function renderLiveTeamPanel(
    players: ActivePlayer[],
    team: TeamKey,
    label: string,
    options?: { embedded?: boolean },
  ) {
    const accent = getTeamAccent(team);
    const embedded = options?.embedded ?? false;
    const goals = matchupScore[team === matchup.home ? "home" : "away"];

    const content = (
      <>
        <div className="mb-2 flex shrink-0 items-center justify-between gap-2">
          <div className="min-w-0">
            <h3 className={`truncate text-sm font-semibold sm:text-base ${accent.label}`}>{label}</h3>
            <p className="text-xs text-slate-400">{players.length} players</p>
          </div>
          {!embedded && (
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold text-white ${accent.strong}`}>
              {goals} G
            </span>
          )}
        </div>

        <div
          className={`min-h-0 space-y-1.5 overflow-y-auto pr-1 ${
            embedded
              ? "max-h-[min(50vh,32rem)] sm:max-h-[min(58vh,36rem)] lg:max-h-[min(68vh,44rem)]"
              : "max-h-[min(62vh,42rem)] lg:max-h-[min(70vh,48rem)]"
          }`}
        >
          {players.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-600 bg-slate-950/40 p-3 text-sm text-slate-400">
              No players assigned.
            </div>
          ) : (
            players.map((player) => (
              <article
                key={player.name}
                className="rounded-xl border border-slate-800 bg-slate-950/80 px-2.5 py-2 sm:px-3"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-1">
                  <div className="min-w-0 sm:flex-1">
                    <h4 className="text-sm font-semibold leading-snug text-white sm:truncate">{player.name}</h4>
                    <p className="text-xs text-slate-400">{playerPoints(player.counts)} pts</p>
                  </div>

                  <div className="flex shrink-0 items-center gap-1 self-end sm:self-auto">
                    {STAT_TYPES.map((statType) => (
                      <button
                        key={statType}
                        type="button"
                        onClick={() => addStat(player.name, team, statType)}
                        title={statType}
                        className={`flex h-9 w-9 flex-col items-center justify-center rounded-lg text-white transition hover:opacity-90 sm:h-10 sm:w-10 ${accent.strong}`}
                      >
                        <span className="text-[9px] font-medium uppercase leading-none opacity-80">
                          {STAT_ABBR[statType]}
                        </span>
                        <span className="text-sm font-bold leading-none">{player.counts[statType]}</span>
                      </button>
                    ))}

                    <button
                      type="button"
                      onClick={() => undoLastPlayerEntry(player.name, team)}
                      disabled={!canUndoPlayer(player.name, team)}
                      aria-label={`Undo last action for ${player.name}`}
                      className="shrink-0 rounded-lg bg-slate-800 px-1 py-1 text-[10px] font-medium text-slate-200 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-35 sm:px-1.5 sm:py-1.5 sm:text-[11px]"
                    >
                      Undo
                    </button>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </>
    );

    if (embedded) {
      return (
        <section className={`flex min-h-0 flex-col rounded-xl border p-2.5 sm:p-3 ${accent.ring} ${accent.soft}`}>
          {content}
        </section>
      );
    }

    return (
      <section className={`flex min-h-0 flex-col rounded-[1.75rem] border p-3 shadow-sm sm:p-4 ${accent.ring} ${accent.soft}`}>
        {content}
      </section>
    );
  }

  function renderTopRankHero(player: DashboardPlayer | null, gender: "male" | "female") {
    const accent =
      gender === "male"
        ? {
            gradient: "from-blue-600/25 via-slate-900 to-slate-950",
            ring: "ring-blue-500/35",
            label: "text-blue-300",
            glow: "shadow-blue-500/20",
          }
        : {
            gradient: "from-pink-600/25 via-slate-900 to-slate-950",
            ring: "ring-pink-500/35",
            label: "text-pink-300",
            glow: "shadow-pink-500/20",
          };

    if (!player) {
      return (
        <div className="flex min-h-[148px] items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 p-5 text-sm text-slate-500">
          No {gender} #1 yet
        </div>
      );
    }

    const username = getUsernameForPlayer(player.name);

    return (
      <button
        type="button"
        onClick={() => openPlayerProfile(player.name)}
        className={`relative w-full overflow-hidden rounded-2xl bg-gradient-to-br ${accent.gradient} p-4 text-left shadow-lg transition hover:brightness-110 ${accent.glow} ring-1 ${accent.ring}`}
      >
        <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-amber-400/10 blur-2xl" />
        <div className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-amber-500/20 text-lg ring-1 ring-amber-400/40">
          🥇
        </div>

        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-amber-300 to-amber-600 opacity-80" />
            <ProfilePhotoAvatar
              key={`${username}-${player.name}-${profilePhotoVersion}`}
              username={username || player.name}
              playerName={player.name}
              className="relative h-20 w-20 ring-4 ring-slate-950"
            />
          </div>

          <div className="min-w-0 flex-1 pr-8">
            <p className={`text-xs font-semibold uppercase tracking-wider ${accent.label}`}>
              #{1} {gender === "male" ? "Male" : "Female"}
            </p>
            <h3 className="truncate text-xl font-bold text-white">{player.name}</h3>
            <p className="mt-1 text-sm text-slate-300">
              {player.points} pts · {player.games} games
            </p>
            {player.bestPlayerWins > 0 && (
              <span className="mt-2 inline-block rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-semibold text-amber-300">
                {player.bestPlayerWins} MPV
              </span>
            )}
          </div>
        </div>
      </button>
    );
  }

  function renderRankingList(players: DashboardPlayer[], barColorClass: string) {
    const maxPoints = players[0]?.points ?? 1;

    if (players.length === 0) {
      return (
        <div className="rounded-2xl bg-slate-950 p-4 text-sm text-slate-400">
          No players in this category yet.
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {players.map((player, index) => {
          const rank = index + 1;
          const medal = getRankMedal(rank);
          const widthPercent = Math.max(4, Math.round((player.points / maxPoints) * 100));

          return (
            <div
              key={player.name}
              className={`grid grid-cols-[44px_1fr_auto] items-center gap-3 rounded-2xl px-3 py-2.5 sm:grid-cols-[52px_minmax(0,140px)_1fr_auto] ${
                medal?.rowClass ?? "bg-slate-900/60"
              }`}
            >
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full text-lg ${
                  medal ? medal.badgeClass : "bg-slate-800 text-sm font-semibold text-slate-200"
                }`}
              >
                {medal ? medal.emoji : rank}
              </div>
              <div className="min-w-0">
                <button
                  type="button"
                  onClick={() => openPlayerProfile(player.name)}
                  className="truncate text-left font-medium text-white transition hover:text-blue-300"
                >
                  {player.name}
                </button>
                <p className="text-xs text-slate-400">{player.games} games · {player.bestPlayerWins} MPV</p>
              </div>
              <div className="hidden h-2 rounded-full bg-slate-800 p-0.5 sm:block">
                <div
                  className={`h-full rounded-full ${barColorClass}`}
                  style={{ width: `${widthPercent}%` }}
                />
              </div>
              <div className="whitespace-nowrap text-sm font-semibold text-slate-200">
                {player.points} pts
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  if (isAuthChecking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
        <p className="text-sm text-slate-400">Loading...</p>
      </main>
    );
  }

  const isWideGameScreen = screen === "setup" || screen === "live";

  return (
    <main className="min-h-screen bg-slate-950 pb-28 text-white">
      <div
        className={`mx-auto w-full pt-6 ${
          screen === "profile"
            ? "px-0 pt-0"
            : isWideGameScreen
              ? "max-w-7xl px-4 sm:px-6 lg:px-8"
              : "max-w-lg px-4 sm:max-w-xl"
        }`}
      >
        {screen !== "profile" && (
        <header className="mb-6 flex items-start justify-between gap-4 rounded-[2rem] border border-slate-800 bg-slate-900/90 px-5 py-5 shadow-xl">
          <div className="min-w-0">
            {screen !== "home" && (
              <button
                type="button"
                onClick={() => setScreen("home")}
                className="mb-2 text-sm font-medium text-slate-400 transition hover:text-white"
              >
                ← Back
              </button>
            )}
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              Ultimate Frisbee
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-white">
              {SCREEN_TITLES[screen]}
            </h1>
            {screen === "home" && (
              <p className="mt-2 text-sm text-slate-400">
                Choose a panel to manage games, stats, and your profile.
              </p>
            )}
          </div>

          <div className="flex shrink-0 flex-col items-end gap-2">
            {authUser && (
              <button type="button" onClick={openOwnProfile} aria-label="Open profile">
                <ProfilePhotoAvatar
                  key={profilePhotoVersion}
                  username={authUser.username}
                  playerName={authUser.playerName}
                  className="h-12 w-12"
                />
              </button>
            )}
            {userIsAdmin && (
              <button
                type="button"
                onClick={() => router.push("/admin")}
                className="rounded-full bg-violet-500/15 px-3 py-1 text-xs font-medium text-violet-300"
              >
                Admin
              </button>
            )}
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-200"
            >
              Log out
            </button>
          </div>
        </header>
        )}

        {screen === "home" && (
          <section className="space-y-4">
            {hubPanels.map((panel) => (
              <HubPanelCard
                key={panel.screen}
                title={panel.title}
                subtitle={panel.subtitle}
                colorClass={panel.colorClass}
                imageSrc={panel.imageSrc}
                badge={panel.badge}
                onClick={() => {
                  if (panel.screen === "profile") {
                    openOwnProfile();
                    return;
                  }
                  setScreen(panel.screen);
                }}
              />
            ))}
          </section>
        )}

        {userIsAdmin && screen === "setup" && (
          <section className="grid gap-3 lg:grid-cols-[minmax(0,18rem)_1fr] xl:grid-cols-[minmax(0,20rem)_1fr]">
            <div className="space-y-3 lg:sticky lg:top-4 lg:self-start">
              <div className="rounded-[1.75rem] border border-slate-800 bg-slate-900/90 p-3 shadow-xl sm:p-4">
                <div className="grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="text-xs font-medium text-slate-400">Date</span>
                    <input
                      type="date"
                      value={date}
                      onChange={(event) => setDate(event.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-2.5 py-2 text-sm text-white outline-none focus:border-blue-400"
                    />
                  </label>

                  <label className="block">
                    <span className="text-xs font-medium text-slate-400">Minutes</span>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      inputMode="numeric"
                      placeholder="20"
                      value={gameDurationMinutes}
                      onChange={(event) => handleGameDurationMinutesChange(event.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-2.5 py-2 text-sm text-white outline-none focus:border-blue-400"
                    />
                  </label>
                </div>
                {!parsedDurationMinutes && gameDurationMinutes.trim() !== "" && (
                  <p className="mt-1.5 text-xs text-red-500">Enter valid minutes.</p>
                )}

                <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-end gap-2">
                  <label className="block min-w-0">
                    <span className="text-xs text-slate-500">Home</span>
                    <select
                      value={matchup.home}
                      onChange={(event) => {
                        const nextHome = event.target.value as TeamKey;
                        setMatchup((current) => ({
                          home: nextHome,
                          away: current.away === nextHome ? getDifferentTeam(nextHome) : current.away,
                        }));
                      }}
                      className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-white outline-none focus:border-blue-400"
                    >
                      {TEAM_OPTIONS.map((option) => (
                        <option key={option.key} value={option.key}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <span className="pb-2 text-xs font-semibold text-slate-500">vs</span>

                  <label className="block min-w-0">
                    <span className="text-xs text-slate-500">Away</span>
                    <select
                      value={matchup.away}
                      onChange={(event) => {
                        const nextAway = event.target.value as TeamKey;
                        setMatchup((current) => ({
                          home: current.home === nextAway ? getDifferentTeam(nextAway) : current.home,
                          away: nextAway,
                        }));
                      }}
                      className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-white outline-none focus:border-blue-400"
                    >
                      {TEAM_OPTIONS.map((option) => (
                        <option key={option.key} value={option.key}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                {matchup.home === matchup.away && (
                  <p className="mt-2 text-xs text-amber-500">Pick two different teams.</p>
                )}

                {TEAM_OPTIONS.some((option) => teamSelections[option.key].length > 0) && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {TEAM_OPTIONS.filter((option) => teamSelections[option.key].length > 0).map(
                      (option) => {
                        const accent = getTeamAccent(option.key);
                        return (
                          <span
                            key={option.key}
                            className={`rounded-lg px-2 py-1 text-xs font-medium ${accent.badge}`}
                          >
                            {option.label} {teamSelections[option.key].length}
                          </span>
                        );
                      },
                    )}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => (canResumeLiveGame ? setScreen("live") : startLiveGame())}
                disabled={!canResumeLiveGame && (matchup.home === matchup.away || !parsedDurationMinutes)}
                className="w-full rounded-2xl bg-blue-500 px-4 py-3 text-sm font-semibold text-white shadow-lg disabled:cursor-not-allowed disabled:bg-slate-700 sm:text-base"
              >
                {canResumeLiveGame
                  ? "Back to live game"
                  : liveGameActive
                    ? "Start new game"
                    : "Start live scoring"}
              </button>

              {canResumeLiveGame && (
                <p className="rounded-xl bg-blue-500/10 px-3 py-2 text-xs text-blue-300">
                  Game in progress — assign players to {getTeamLabel(matchup.home)} or{" "}
                  {getTeamLabel(matchup.away)} to add them live.
                </p>
              )}
            </div>

            <div className="flex min-h-0 flex-col rounded-[1.75rem] border border-slate-800 bg-slate-900/90 p-3 shadow-xl sm:p-4">
              <div className="mb-3 shrink-0">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <h2 className="text-base font-semibold text-white sm:text-lg">Players</h2>
                  <input
                    value={playerSearch}
                    onChange={(event) => setPlayerSearch(event.target.value)}
                    placeholder="Search players"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-400 sm:max-w-xs"
                  />
                </div>
              </div>

              {filteredSetupPlayers.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-600 bg-slate-950/40 p-3 text-sm text-slate-400">
                  {playerSearch.trim()
                    ? "No players match your search."
                    : "No players in the roster yet."}
                </div>
              ) : (
                <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-stretch">
                  <section className="col-span-1 col-start-1 row-start-2 flex min-h-0 flex-col rounded-xl border border-blue-500/25 bg-slate-950/50 p-2.5 sm:p-3 lg:row-start-1">
                    <div className="mb-2 flex shrink-0 items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-blue-300">Male</h3>
                      <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[11px] font-medium text-blue-200 lg:hidden">
                        {filteredMalePlayers.length}
                      </span>
                    </div>
                    <div className="min-h-0 space-y-1.5 overflow-y-auto pr-1 max-h-[min(50vh,32rem)] sm:max-h-[min(58vh,36rem)] lg:max-h-[min(68vh,44rem)]">
                      {filteredMalePlayers.map((player) => renderSetupPlayerRow(player))}
                      {filteredMalePlayers.length === 0 && (
                        <p className="text-xs text-slate-500">No male players match.</p>
                      )}
                    </div>
                  </section>

                  <div className="col-span-1 col-start-1 row-start-1 flex items-stretch justify-center sm:col-span-2 lg:col-span-1 lg:col-start-2 lg:row-start-1">
                    <div className="flex w-full items-center justify-center gap-4 rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-3 lg:w-auto lg:flex-col lg:gap-5 lg:border-x lg:border-y-0 lg:bg-transparent lg:px-3 lg:py-8">
                      <div className="text-center">
                        <p className="text-[10px] font-medium uppercase tracking-wide text-blue-300">Male</p>
                        <p className="mt-1 text-2xl font-bold text-white">{filteredMalePlayers.length}</p>
                      </div>
                      <div className="h-10 w-px shrink-0 bg-slate-600 lg:h-auto lg:min-h-[4rem] lg:w-px" />
                      <div className="text-center">
                        <p className="text-[10px] font-medium uppercase tracking-wide text-pink-300">Female</p>
                        <p className="mt-1 text-2xl font-bold text-white">{filteredFemalePlayers.length}</p>
                      </div>
                    </div>
                  </div>

                  <section className="col-span-1 col-start-1 row-start-3 flex min-h-0 flex-col rounded-xl border border-pink-500/25 bg-slate-950/50 p-2.5 sm:col-start-2 sm:row-start-2 lg:col-start-3 lg:row-start-1">
                    <div className="mb-2 flex shrink-0 items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-pink-300">Female</h3>
                      <span className="rounded-full bg-pink-500/20 px-2 py-0.5 text-[11px] font-medium text-pink-200 lg:hidden">
                        {filteredFemalePlayers.length}
                      </span>
                    </div>
                    <div className="min-h-0 space-y-1.5 overflow-y-auto pr-1 max-h-[min(50vh,32rem)] sm:max-h-[min(58vh,36rem)] lg:max-h-[min(68vh,44rem)]">
                      {filteredFemalePlayers.map((player) => renderSetupPlayerRow(player))}
                      {filteredFemalePlayers.length === 0 && (
                        <p className="text-xs text-slate-500">No female players match.</p>
                      )}
                    </div>
                  </section>
                </div>
              )}
            </div>
          </section>
        )}

        {userIsAdmin && screen === "live" && (
          <section className="grid gap-3 lg:grid-cols-[minmax(0,18rem)_1fr] xl:grid-cols-[minmax(0,20rem)_1fr]">
            <div className="space-y-3 lg:sticky lg:top-4 lg:self-start">
              <div className="rounded-[1.75rem] border border-slate-800 bg-slate-900/90 p-3 shadow-xl sm:p-4">
                <p className="text-xs font-medium text-slate-400">Date</p>
                <p className="mt-1 text-sm font-semibold text-white">{date}</p>

                <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-end gap-2">
                  <div className="min-w-0 text-center">
                    <p className="truncate text-xs text-slate-500">{getTeamLabel(matchup.home)}</p>
                    <p className="mt-1 text-3xl font-bold tabular-nums text-white">{matchupScore.home}</p>
                  </div>
                  <span className="pb-2 text-xs font-semibold text-slate-500">vs</span>
                  <div className="min-w-0 text-center">
                    <p className="truncate text-xs text-slate-500">{getTeamLabel(matchup.away)}</p>
                    <p className="mt-1 text-3xl font-bold tabular-nums text-white">{matchupScore.away}</p>
                  </div>
                </div>
                <p className="mt-1 text-center text-[11px] uppercase tracking-wide text-slate-500">Goals</p>

                <div className="mt-3 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-center">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Time left</p>
                  <p className="text-2xl font-semibold tabular-nums text-white">{formatTime(timerSeconds)}</p>
                </div>

                <div className="mt-3 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => setTimerRunning((current) => !current)}
                    className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white"
                  >
                    {timerRunning ? "Pause" : "Resume"}
                  </button>
                  <button
                    type="button"
                    onClick={endGame}
                    className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white"
                  >
                    End game
                  </button>
                </div>

                <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-center">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">MPV</p>
                  <p className="truncate text-sm font-semibold text-white">{bestPlayerToday.name}</p>
                  <p className="text-xs text-slate-400">{bestPlayerToday.percentage}%</p>
                </div>
              </div>

              <section className="rounded-[1.75rem] border border-slate-800 bg-slate-900/90 p-3 shadow-xl sm:p-4">
                <h3 className="text-sm font-semibold text-white">Recent activity</h3>
                <div className="mt-2 max-h-40 space-y-1.5 overflow-y-auto">
                  {logEntries.length === 0 ? (
                    <p className="text-xs text-slate-400">No actions yet.</p>
                  ) : (
                    logEntries.slice(0, 8).map((entry) => (
                      <div key={entry.id} className="rounded-lg bg-slate-950 px-2.5 py-2">
                        <p className="truncate text-sm font-medium text-white">{entry.playerName}</p>
                        <p className="text-xs text-slate-400">
                          {STAT_ABBR[entry.statType]} · {entry.timestampLabel}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>

            <div className="flex min-h-0 flex-col rounded-[1.75rem] border border-slate-800 bg-slate-900/90 p-3 shadow-xl sm:p-4">
              <h2 className="mb-3 shrink-0 text-base font-semibold text-white sm:text-lg">Live scoring</h2>

              <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-stretch">
                <div className="col-span-1 col-start-1 row-start-2 lg:row-start-1">
                  {renderLiveTeamPanel(
                    matchupPlayers.home,
                    matchup.home,
                    getTeamLabel(matchup.home),
                    { embedded: true },
                  )}
                </div>

                <div className="col-span-1 col-start-1 row-start-1 flex items-stretch justify-center sm:col-span-2 lg:col-span-1 lg:col-start-2 lg:row-start-1">
                  <div className="flex w-full items-center justify-center gap-4 rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-3 lg:w-auto lg:flex-col lg:gap-5 lg:border-x lg:border-y-0 lg:bg-transparent lg:px-3 lg:py-8">
                    <div className="min-w-0 text-center">
                      <p className={`truncate text-[10px] font-medium uppercase tracking-wide ${getTeamAccent(matchup.home).label}`}>
                        {getTeamLabel(matchup.home)}
                      </p>
                      <p className="mt-1 text-2xl font-bold text-white">{matchupScore.home}</p>
                    </div>
                    <div className="h-10 w-px shrink-0 bg-slate-600 lg:h-auto lg:min-h-[4rem] lg:w-px" />
                    <div className="min-w-0 text-center">
                      <p className={`truncate text-[10px] font-medium uppercase tracking-wide ${getTeamAccent(matchup.away).label}`}>
                        {getTeamLabel(matchup.away)}
                      </p>
                      <p className="mt-1 text-2xl font-bold text-white">{matchupScore.away}</p>
                    </div>
                  </div>
                </div>

                <div className="col-span-1 col-start-1 row-start-3 sm:col-start-2 sm:row-start-2 lg:col-start-3 lg:row-start-1">
                  {renderLiveTeamPanel(
                    matchupPlayers.away,
                    matchup.away,
                    getTeamLabel(matchup.away),
                    { embedded: true },
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {screen === "summary" && (
          <section className="space-y-4">
            {userIsAdmin ? (
              <>
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-[2rem] border border-slate-800 bg-slate-900/90 p-4 shadow-xl">
                    <p className="text-sm text-slate-400">Date</p>
                    <p className="mt-2 text-2xl font-semibold text-white">{date}</p>
                  </div>
                  <div className="rounded-[2rem] border border-slate-800 bg-slate-900/90 p-4 shadow-xl">
                    <p className="text-sm text-slate-400">Game length</p>
                    <p className="mt-2 text-2xl font-semibold text-white">{formatTime(elapsedSeconds)}</p>
                  </div>
                  <div className="rounded-[2rem] border border-slate-800 bg-slate-900/90 p-4 shadow-xl">
                    <p className="text-sm text-slate-400">MPV</p>
                    <p className="mt-2 text-2xl font-semibold text-white">
                      {bestPlayerToday.name} ({bestPlayerToday.percentage}%)
                    </p>
                  </div>
                </div>

                <div className="rounded-[2rem] border border-slate-800 bg-slate-900/90 p-4 shadow-xl">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-slate-300">Players</p>
                    <p className="text-xs text-slate-400">{allActivePlayers.length} total</p>
                  </div>
                  <div className="divide-y divide-slate-800">
                    {[...allActivePlayers]
                      .sort((a, b) => playerPoints(b.counts) - playerPoints(a.counts))
                      .map((player) => (
                        <div
                          key={`${player.team}-${player.name}`}
                          className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-medium text-white">{player.name}</p>
                            <p className="text-xs text-slate-400">{getTeamLabel(player.team)}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-white">{playerPoints(player.counts)} pts</p>
                            <p className="text-xs text-slate-400">
                              {player.counts.Score}G · {player.counts.Assist}A · {player.counts.Block}B
                              {player.counts.Callahan > 0 ? ` · ${player.counts.Callahan}C` : ""}
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => {
                      setTimerRunning(timerSeconds > 0);
                      setScreen("live");
                    }}
                    className="rounded-2xl bg-slate-800 px-5 py-3 font-medium text-white"
                  >
                    Back to live game
                  </button>
                  <button
                    type="button"
                    onClick={saveGame}
                    disabled={isSavingGame}
                    className="rounded-2xl bg-blue-500 px-5 py-3 font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-700"
                  >
                    {isSavingGame ? "Saving to Google Sheets..." : "Save summary record"}
                  </button>
                </div>
                {saveGameError && (
                  <p className="text-sm text-red-600">{saveGameError}</p>
                )}
              </>
            ) : (
              <div className="rounded-[2rem] border border-slate-800 bg-slate-900/90 p-5 shadow-xl">
                <p className="text-sm font-medium text-slate-400">Summary</p>
                <h2 className="mt-1 text-2xl font-semibold text-white">Game summary records</h2>
                <p className="mt-2 text-sm text-slate-300">
                  View saved game results below. Only admins can save new summary records.
                </p>
              </div>
            )}

            <div className="overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-900/90 shadow-xl">
              <div className="border-b border-slate-800 px-5 py-4">
                <h3 className="text-lg font-semibold text-white">Summary records</h3>
                <p className="mt-1 text-sm text-slate-400">
                  Tap a game to see player points. Full stat breakdown is hidden by default.
                </p>
              </div>
              <div className="divide-y divide-slate-100">
                {isLoadingGames && (
                  <div className="px-5 py-8 text-sm text-slate-400">Loading saved games from Google Sheets...</div>
                )}
                {!isLoadingGames && gamesLoadError && (
                  <div className="px-5 py-8 text-sm text-red-600">{gamesLoadError}</div>
                )}
                {!isLoadingGames && !gamesLoadError && completedGames.length === 0 && (
                  <div className="px-5 py-8 text-sm text-slate-400">
                    No saved games yet. Play a game and save it to store data in Google Sheets.
                  </div>
                )}
                {completedGames.map((game) => {
                  const gamePlayers = [...flattenPlayers(game.teamPlayers)].sort(
                    (a, b) => playerPoints(b.counts) - playerPoints(a.counts),
                  );

                  return (
                    <details key={game.id} className="group px-5 py-3">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-1">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-white">
                            {getTeamLabel(game.matchup.home)} vs {getTeamLabel(game.matchup.away)}
                          </p>
                          <p className="mt-0.5 text-sm text-slate-400">
                            {game.date} · {formatTime(game.timerSeconds)} · MPV {game.bestPlayer.name}
                          </p>
                        </div>
                        <span className="shrink-0 text-xs font-medium text-slate-400 group-open:hidden">
                          Show
                        </span>
                        <span className="hidden shrink-0 text-xs font-medium text-slate-400 group-open:inline">
                          Hide
                        </span>
                      </summary>

                      <div className="mt-2 space-y-1 border-t border-slate-800 pt-2">
                        {gamePlayers.map((player) => (
                          <div
                            key={`${game.id}-${player.team}-${player.name}`}
                            className="flex items-center justify-between gap-3 rounded-xl px-2 py-1.5 text-sm"
                          >
                            <div className="min-w-0">
                              <span className="font-medium text-white">{player.name}</span>
                              <span className="ml-2 text-slate-400">{getTeamLabel(player.team)}</span>
                            </div>
                            <span className="font-semibold text-slate-200">{playerPoints(player.counts)} pts</span>
                          </div>
                        ))}
                      </div>
                    </details>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {screen === "dashboard" && (
          <section className="-mx-4 overflow-hidden rounded-[2rem] bg-slate-950 text-white shadow-2xl sm:mx-0">
            <div className="px-4 pt-5">
              <p className="text-sm text-slate-400">MFULTISCORE</p>
              <h2 className="text-2xl font-bold">Dashboard</h2>
            </div>

            <div className="grid gap-3 px-4 py-4 sm:grid-cols-2">
              {renderTopRankHero(bestMalePlayer, "male")}
              {renderTopRankHero(bestFemalePlayer, "female")}
            </div>

            <div className="grid grid-cols-4 gap-2 px-4 pb-4">
              <div className="rounded-2xl bg-slate-900/90 p-3 text-center">
                <p className="text-2xl font-bold text-blue-400">{completedGames.length}</p>
                <p className="mt-1 text-xs text-slate-400">Games</p>
              </div>
              <div className="rounded-2xl bg-slate-900/90 p-3 text-center">
                <p className="text-2xl font-bold text-emerald-400">{dashboardPlayers.length}</p>
                <p className="mt-1 text-xs text-slate-400">Players</p>
              </div>
              <div className="rounded-2xl bg-slate-900/90 p-3 text-center">
                <p className="text-2xl font-bold text-amber-400">{bestMalePlayer?.points ?? 0}</p>
                <p className="mt-1 text-xs text-slate-400">Male pts</p>
              </div>
              <div className="rounded-2xl bg-slate-900/90 p-3 text-center">
                <p className="text-2xl font-bold text-rose-400">{bestFemalePlayer?.points ?? 0}</p>
                <p className="mt-1 text-xs text-slate-400">Female pts</p>
              </div>
            </div>

            <div className="px-4 pb-2">
              <div className="flex rounded-full bg-slate-900 p-1">
                {(
                  [
                    ["male", "Male"],
                    ["female", "Female"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setDashboardTab(value)}
                    className={`flex-1 rounded-full px-3 py-2 text-sm font-medium transition ${
                      dashboardTab === value
                        ? "bg-white text-slate-900"
                        : "text-slate-300 hover:text-white"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4 px-4 pb-6 pt-3">
              <div className="rounded-2xl bg-slate-900/80 p-4">
                <h3 className="text-lg font-semibold">
                  {dashboardTab === "male" ? "Male" : "Female"} ranking
                </h3>
                <div className="mt-4">
                  {renderRankingList(
                    dashboardTab === "male" ? maleRanking : femaleRanking,
                    dashboardTab === "male" ? "bg-blue-500" : "bg-pink-500",
                  )}
                </div>
              </div>

              <div>
                <h3 className="mb-3 text-lg font-semibold">Recent games</h3>
                {completedGames.length === 0 ? (
                  <p className="rounded-2xl bg-slate-900/80 p-4 text-sm text-slate-400">
                    No saved games yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {completedGames.slice(0, 6).map((game) => (
                      <div
                        key={game.id}
                        className="flex items-center justify-between rounded-2xl bg-slate-900/80 px-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium">
                            {getTeamLabel(game.matchup.home)} vs {getTeamLabel(game.matchup.away)}
                          </p>
                          <p className="text-sm text-slate-400">
                            {game.date} · {formatTime(game.timerSeconds)}
                          </p>
                        </div>
                        <div className="text-right">
                          <button
                            type="button"
                            onClick={() => openPlayerProfile(game.bestPlayer.name)}
                            className="font-semibold text-white transition hover:text-amber-300"
                          >
                            {game.bestPlayer.name}
                          </button>
                          <span className="text-xs font-medium text-amber-400">MPV</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {screen === "profile" && activeProfileUser && activeProfileProgress && (
          <div className="px-4 pt-4">
            <ProfileScreen
            profileUser={activeProfileUser}
            personalProgress={activeProfileProgress}
            profilePhotoVersion={profilePhotoVersion}
            actingUsername={authUser?.username}
            readOnly={viewingProfile !== null}
            onPhotoChange={() => setProfilePhotoVersion((current) => current + 1)}
            onBack={closeProfile}
            getTeamLabel={(team) => getTeamLabel(team as TeamKey)}
            />
          </div>
        )}
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-800 bg-slate-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-lg justify-center px-2 py-3 sm:max-w-xl">
          <button
            type="button"
            onClick={() => setScreen("home")}
            className={`flex flex-col items-center gap-1 rounded-2xl px-6 py-1 text-xs font-medium transition ${
              screen === "home" ? "text-blue-400" : "text-slate-400 hover:text-white"
            }`}
          >
            <span
              className={`flex h-10 w-10 items-center justify-center rounded-full text-lg ${
                screen === "home" ? "bg-blue-500 text-white" : "bg-slate-800 text-slate-200"
              }`}
            >
              ⌂
            </span>
            <span>Home</span>
          </button>
        </div>
      </nav>
    </main>
  );
}
