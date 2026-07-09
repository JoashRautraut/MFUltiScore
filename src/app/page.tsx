"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PlayerProgressChart } from "@/components/PlayerProgressChart";
import {
  DashboardPanelArt,
  HubPanelCard,
  LivePanelArt,
  ProfilePanelArt,
  SetupPanelArt,
  SummaryPanelArt,
} from "@/components/HubPanelCard";
import { ProfilePhotoAvatar, ProfilePhotoPicker } from "@/components/ProfilePhotoPicker";
import { fetchCompletedGames, fetchRegisteredUsers, fetchSheetPlayers, saveCompletedGame } from "@/lib/client-api";
import { STAT_TYPES, StatType } from "@/types/stats";
import { clearAuthUser, getAuthUser, isAdmin, toRegisteredPlayers, type AuthUser } from "@/lib/auth";
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

const ADMIN_NAV_ITEMS: Array<[Screen, string]> = [
  ["home", "Home"],
  ["setup", "Setup"],
  ["live", "Live Game"],
  ["summary", "Summary"],
  ["dashboard", "Dashboard"],
  ["profile", "Profile"],
];

const USER_NAV_ITEMS: Array<[Screen, string]> = [
  ["home", "Home"],
  ["summary", "Summary"],
  ["dashboard", "Dashboard"],
  ["profile", "Profile"],
];

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
    { soft: "bg-blue-50", strong: "bg-blue-600", ring: "border-blue-300", badge: "bg-blue-100 text-blue-800", label: "text-blue-700" },
    { soft: "bg-emerald-50", strong: "bg-emerald-600", ring: "border-emerald-300", badge: "bg-emerald-100 text-emerald-800", label: "text-emerald-700" },
    { soft: "bg-amber-50", strong: "bg-amber-500", ring: "border-amber-300", badge: "bg-amber-100 text-amber-800", label: "text-amber-700" },
    { soft: "bg-violet-50", strong: "bg-violet-600", ring: "border-violet-300", badge: "bg-violet-100 text-violet-800", label: "text-violet-700" },
    { soft: "bg-rose-50", strong: "bg-rose-600", ring: "border-rose-300", badge: "bg-rose-100 text-rose-800", label: "text-rose-700" },
    { soft: "bg-cyan-50", strong: "bg-cyan-600", ring: "border-cyan-300", badge: "bg-cyan-100 text-cyan-800", label: "text-cyan-700" },
    { soft: "bg-orange-50", strong: "bg-orange-500", ring: "border-orange-300", badge: "bg-orange-100 text-orange-800", label: "text-orange-700" },
    { soft: "bg-indigo-50", strong: "bg-indigo-600", ring: "border-indigo-300", badge: "bg-indigo-100 text-indigo-800", label: "text-indigo-700" },
    { soft: "bg-lime-50", strong: "bg-lime-600", ring: "border-lime-300", badge: "bg-lime-100 text-lime-800", label: "text-lime-700" },
    { soft: "bg-fuchsia-50", strong: "bg-fuchsia-600", ring: "border-fuchsia-300", badge: "bg-fuchsia-100 text-fuchsia-800", label: "text-fuchsia-700" },
    { soft: "bg-sky-50", strong: "bg-sky-600", ring: "border-sky-300", badge: "bg-sky-100 text-sky-800", label: "text-sky-700" },
    { soft: "bg-teal-50", strong: "bg-teal-600", ring: "border-teal-300", badge: "bg-teal-100 text-teal-800", label: "text-teal-700" },
    { soft: "bg-pink-50", strong: "bg-pink-600", ring: "border-pink-300", badge: "bg-pink-100 text-pink-800", label: "text-pink-700" },
    { soft: "bg-red-50", strong: "bg-red-600", ring: "border-red-300", badge: "bg-red-100 text-red-800", label: "text-red-700" },
    { soft: "bg-yellow-50", strong: "bg-yellow-500", ring: "border-yellow-300", badge: "bg-yellow-100 text-yellow-800", label: "text-yellow-700" },
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

function getRankMedal(rank: number) {
  if (rank === 1) {
    return { emoji: "🥇", rowClass: "bg-amber-50/80 ring-1 ring-amber-200", badgeClass: "bg-amber-100 text-amber-900" };
  }
  if (rank === 2) {
    return { emoji: "🥈", rowClass: "bg-slate-50 ring-1 ring-slate-200", badgeClass: "bg-slate-200 text-slate-800" };
  }
  if (rank === 3) {
    return { emoji: "🥉", rowClass: "bg-orange-50/80 ring-1 ring-orange-200", badgeClass: "bg-orange-100 text-orange-900" };
  }
  return null;
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

  const canResumeLiveGame = liveGameActive && !liveGameEnded;

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

        const registeredPlayers = toRegisteredPlayers(registeredUsers);
        const historicalPlayerNames = new Set<string>();

        for (const game of gamesMapped) {
          for (const player of flattenPlayers(game.teamPlayers)) {
            historicalPlayerNames.add(player.name);
          }
        }

        const mergedNames = new Set([
          ...sheetPlayers.map((player) => player.name),
          ...historicalPlayerNames,
          ...registeredPlayers.map((player) => player.name),
        ]);

        setPlayerAssignments((current) => {
          const next: Record<string, TeamKey | null> = {};
          const allNames = new Set([...mergedNames, ...Object.keys(current)]);
          for (const name of allNames) {
            next[name] = current[name] ?? null;
          }
          return next;
        });

        setPlayerGenders((current) => {
          const next: Record<string, PlayerGender> = { ...current };

          for (const player of sheetPlayers) {
            next[player.name] = player.gender;
          }

          for (const player of registeredPlayers) {
            next[player.name] = player.gender;
          }

          for (const name of mergedNames) {
            if (!next[name]) {
              next[name] = "male";
            }
          }

          return next;
        });
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
  }, [isAuthChecking]);

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
  const navItems = userIsAdmin ? ADMIN_NAV_ITEMS : USER_NAV_ITEMS;

  const hubPanels = useMemo(() => {
    const panels = [
      {
        screen: "setup" as const,
        title: "Setup",
        subtitle: "Teams, players & timer",
        colorClass: "bg-blue-600",
        artwork: <SetupPanelArt />,
        adminOnly: true,
        badge: undefined as string | undefined,
      },
      {
        screen: "live" as const,
        title: "Live Game",
        subtitle: "Track stats in real time",
        colorClass: "bg-rose-500",
        artwork: <LivePanelArt />,
        adminOnly: true,
        badge: canResumeLiveGame ? "In progress" : undefined,
      },
      {
        screen: "summary" as const,
        title: "Summary",
        subtitle: "Review & save game results",
        colorClass: "bg-violet-600",
        artwork: <SummaryPanelArt />,
        adminOnly: false,
        badge: undefined,
      },
      {
        screen: "dashboard" as const,
        title: "Dashboard",
        subtitle: "Rankings & game history",
        colorClass: "bg-amber-500",
        artwork: <DashboardPanelArt />,
        adminOnly: false,
        badge: undefined,
      },
      {
        screen: "profile" as const,
        title: "Profile",
        subtitle: "Your stats & photo",
        colorClass: "bg-slate-900",
        artwork: <ProfilePanelArt />,
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

  const personalProgress = useMemo(() => {
    if (!authUser) {
      return null;
    }

    const playerName = authUser.playerName;
    const gameHistory: PersonalGameRecord[] = [];
    const statsTotals = emptyCounts();
    let totalPoints = 0;
    let mvpWins = 0;
    let bestMvpPercentage = 0;

    for (const game of completedGames) {
      for (const player of flattenPlayers(game.teamPlayers)) {
        if (player.name.trim().toLowerCase() !== playerName.trim().toLowerCase()) {
          continue;
        }

        const points = playerPoints(player.counts);
        totalPoints += points;

        for (const statType of STAT_TYPES) {
          statsTotals[statType] += player.counts[statType];
        }

        const wasMvp = game.bestPlayer.name === playerName;
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

    const genderRanking =
      authUser.gender === "female"
        ? dashboardPlayers.filter((player) => player.gender === "female")
        : dashboardPlayers.filter((player) => player.gender === "male");
    const rankIndex = genderRanking.findIndex((player) => player.name === playerName);

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
  }, [authUser, completedGames, dashboardPlayers]);

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

  function undoLastEntry() {
    setLogEntries((current) => {
      const [lastEntry, ...remaining] = current;
      if (!lastEntry) {
        return current;
      }

      updateTeamPlayers(lastEntry.team, (players) =>
        players.map((player) =>
          player.name === lastEntry.playerName
            ? {
                ...player,
                counts: {
                  ...player.counts,
                  [lastEntry.statType]: Math.max(player.counts[lastEntry.statType] - 1, 0),
                },
              }
            : player,
        ),
      );

      return remaining;
    });
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
        className={`flex flex-col gap-3 rounded-2xl border p-4 md:flex-row md:items-center md:justify-between ${
          accent ? `${accent.ring} ${accent.soft} border-2` : "border-slate-200 bg-white"
        }`}
      >
        <div className="flex items-center gap-3">
          {accent && <span className={`h-10 w-1.5 rounded-full ${accent.strong}`} />}
          <div>
            <p className="font-medium text-slate-900">{player}</p>
            <p className="text-sm text-slate-500">
              {assignment === null
                ? "No team assigned"
                : `Assigned to ${getTeamLabel(assignment)}`}
            </p>
            {accent && assignment && (
              <span
                className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${accent.badge}`}
              >
                {getTeamLabel(assignment)}
              </span>
            )}
          </div>
        </div>

        <label className="w-full md:w-44">
          <span className="sr-only">Assign team for {player}</span>
          <select
            value={assignment ?? ""}
            onChange={(event) => {
              const value = event.target.value;
              assignPlayer(player, value === "" ? null : (value as TeamKey));
            }}
            className={`w-full rounded-xl border bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-slate-400 ${
              accent ? accent.ring : "border-slate-200"
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

  function renderPlayerCards(players: ActivePlayer[], team: TeamKey, label: string) {
    const accent = getTeamAccent(team);
    return (
      <section className={`space-y-3 rounded-3xl border p-4 shadow-sm ${accent.ring} ${accent.soft}`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{label}</h3>
            <p className="text-sm text-slate-500">{players.length} active players</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-sm font-medium text-white ${accent.strong}`}>
            {label}
          </span>
        </div>

        {players.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
            No players assigned.
          </div>
        ) : (
          players.map((player) => (
            <article key={player.name} className="rounded-2xl border border-slate-200 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h4 className="text-lg font-semibold text-slate-900">{player.name}</h4>
                  <p className="text-sm text-slate-500">Total actions: {totalCounts(player.counts)}</p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600">
                  {playerPoints(player.counts)} pts
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {STAT_TYPES.map((statType) => (
                  <button
                    key={statType}
                    type="button"
                    onClick={() => addStat(player.name, team, statType)}
                    className={`rounded-2xl px-4 py-4 text-left text-white transition hover:opacity-90 ${accent.strong}`}
                  >
                    <span className="block text-sm text-slate-300">{statType}</span>
                    <span className="mt-1 block text-2xl font-semibold">{player.counts[statType]}</span>
                  </button>
                ))}
              </div>
            </article>
          ))
        )}
      </section>
    );
  }

  function renderBestPlayerCard(player: DashboardPlayer | null, accentClass: string) {
    if (!player) {
      return <p className="mt-3 text-sm text-slate-500">No records yet.</p>;
    }

    return (
      <div className="mt-3 grid gap-3 sm:grid-cols-4">
        <div className={`rounded-2xl p-4 ${accentClass}`}>
          <p className="text-sm text-slate-500">Player</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{player.name}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Total points</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{player.points}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">MPV wins</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{player.bestPlayerWins}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Top contribution</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{player.topPercentage}%</p>
        </div>
      </div>
    );
  }

  function renderRankingList(players: DashboardPlayer[], barColorClass: string) {
    const maxPoints = players[0]?.points ?? 1;

    if (players.length === 0) {
      return (
        <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
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
                medal?.rowClass ?? ""
              }`}
            >
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full text-lg ${
                  medal ? medal.badgeClass : "bg-slate-100 text-sm font-semibold text-slate-600"
                }`}
              >
                {medal ? medal.emoji : rank}
              </div>
              <div className="min-w-0">
                <p className="truncate font-medium text-slate-900">{player.name}</p>
                <p className="text-xs text-slate-500">{player.games} games · {player.bestPlayerWins} MPV</p>
              </div>
              <div className="hidden h-2 rounded-full bg-slate-100 p-0.5 sm:block">
                <div
                  className={`h-full rounded-full ${barColorClass}`}
                  style={{ width: `${widthPercent}%` }}
                />
              </div>
              <div className="whitespace-nowrap text-sm font-semibold text-slate-700">
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
      <main className="flex min-h-screen items-center justify-center bg-white px-4">
        <p className="text-sm text-slate-500">Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white pb-28 text-slate-900">
      <div className="mx-auto w-full max-w-lg px-4 pt-6 sm:max-w-xl">
        <header className="mb-6 flex items-start justify-between gap-4">
          <div className="min-w-0">
            {screen !== "home" && (
              <button
                type="button"
                onClick={() => setScreen("home")}
                className="mb-2 text-sm font-medium text-slate-500 transition hover:text-slate-800"
              >
                ← Back
              </button>
            )}
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
              Ultimate Frisbee
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
              {SCREEN_TITLES[screen]}
            </h1>
            {screen === "home" && (
              <p className="mt-2 text-sm text-slate-500">
                Choose a panel to manage games, stats, and your profile.
              </p>
            )}
          </div>

          <div className="flex shrink-0 flex-col items-end gap-2">
            {authUser && (
              <button type="button" onClick={() => setScreen("profile")} aria-label="Open profile">
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
                className="rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700"
              >
                Admin
              </button>
            )}
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600"
            >
              Log out
            </button>
          </div>
        </header>

        {screen === "home" && (
          <section className="space-y-4">
            {hubPanels.map((panel) => (
              <HubPanelCard
                key={panel.screen}
                title={panel.title}
                subtitle={panel.subtitle}
                colorClass={panel.colorClass}
                artwork={panel.artwork}
                badge={panel.badge}
                onClick={() => setScreen(panel.screen)}
              />
            ))}
          </section>
        )}

        {userIsAdmin && screen === "setup" && (
          <section className="grid gap-4 xl:grid-cols-[1fr_1.7fr]">
            <div className="space-y-4">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-slate-500">Step 1</p>
                <h2 className="mt-1 text-2xl font-semibold text-slate-900">Prepare the game</h2>
                <p className="mt-2 text-sm text-slate-600">
                  Registered players are added to the roster automatically. Assign each player to a team, or leave them unassigned.
                </p>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <label className="block">
                  <span className="text-sm font-medium text-slate-600">Game date</span>
                  <input
                    type="date"
                    value={date}
                    onChange={(event) => setDate(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
                  />
                </label>

                <div className="mt-4">
                  <label className="block">
                    <span className="text-sm font-medium text-slate-600">Match timer (minutes)</span>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      inputMode="numeric"
                      placeholder="Enter minutes (e.g. 20)"
                      value={gameDurationMinutes}
                      onChange={(event) => handleGameDurationMinutesChange(event.target.value)}
                      className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
                    />
                  </label>
                  {!parsedDurationMinutes && gameDurationMinutes.trim() !== "" && (
                    <p className="mt-2 text-sm text-red-600">Enter a valid number of minutes greater than 0.</p>
                  )}
                  {!gameDurationMinutes.trim() && (
                    <p className="mt-2 text-sm text-slate-500">Set how long the countdown should run before you start.</p>
                  )}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-slate-600">Who is playing?</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
                  <label className="block">
                    <span className="text-sm text-slate-500">Team</span>
                    <select
                      value={matchup.home}
                      onChange={(event) => {
                        const nextHome = event.target.value as TeamKey;
                        setMatchup((current) => ({
                          home: nextHome,
                          away: current.away === nextHome ? getDifferentTeam(nextHome) : current.away,
                        }));
                      }}
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-slate-400"
                    >
                      {TEAM_OPTIONS.map((option) => (
                        <option key={option.key} value={option.key}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="pb-3 text-center text-sm font-semibold uppercase tracking-wide text-slate-500">
                    vs
                  </div>

                  <label className="block">
                    <span className="text-sm text-slate-500">Team</span>
                    <select
                      value={matchup.away}
                      onChange={(event) => {
                        const nextAway = event.target.value as TeamKey;
                        setMatchup((current) => ({
                          home: current.home === nextAway ? getDifferentTeam(nextAway) : current.home,
                          away: nextAway,
                        }));
                      }}
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-slate-400"
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
                  <p className="mt-3 text-sm text-amber-700">
                    Choose two different teams for the matchup.
                  </p>
                )}
              </div>

              {TEAM_OPTIONS.some((option) => teamSelections[option.key].length > 0) && (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {TEAM_OPTIONS.filter((option) => teamSelections[option.key].length > 0).map(
                    (option) => {
                      const accent = getTeamAccent(option.key);
                      return (
                        <div
                          key={option.key}
                          className={`rounded-3xl border p-4 shadow-sm ${accent.ring} ${accent.soft}`}
                        >
                          <p className={`text-sm font-medium ${accent.label}`}>{option.label}</p>
                          <p className="mt-2 text-3xl font-semibold text-slate-900">
                            {teamSelections[option.key].length}
                          </p>
                        </div>
                      );
                    },
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={() => (canResumeLiveGame ? setScreen("live") : startLiveGame())}
                disabled={!canResumeLiveGame && (matchup.home === matchup.away || !parsedDurationMinutes)}
                className="w-full rounded-3xl bg-blue-600 px-5 py-4 text-lg font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {canResumeLiveGame
                  ? "Back to live game"
                  : liveGameActive
                    ? "Start new game"
                    : "Start live scoring"}
              </button>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4">
                <p className="text-sm font-medium text-slate-500">Player assignment</p>
                <h2 className="mt-1 text-2xl font-semibold text-slate-900">Choose each player&apos;s team</h2>
                {canResumeLiveGame && (
                  <p className="mt-2 text-sm text-blue-700">
                    Game in progress — assign a player to {getTeamLabel(matchup.home)} or{" "}
                    {getTeamLabel(matchup.away)} here to add them to the live game.
                  </p>
                )}
              </div>

              <div className="mb-4">
                <label className="block">
                  <span className="text-sm font-medium text-slate-600">Search players</span>
                  <input
                    value={playerSearch}
                    onChange={(event) => setPlayerSearch(event.target.value)}
                    placeholder="Search by player name"
                    className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
                  />
                </label>
              </div>

              <div className="space-y-6">
                {filteredSetupPlayers.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                    {playerSearch.trim()
                      ? "No players match your search."
                      : "No players in the roster yet. Register an account or add players to the Players sheet."}
                  </div>
                ) : (
                  <>
                    <section className="rounded-2xl border border-blue-200 bg-blue-50/40 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-blue-900">Male players</h3>
                        <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800">
                          {filteredMalePlayers.length}
                        </span>
                      </div>
                      <div className="grid gap-3">
                        {filteredMalePlayers.map((player) => renderSetupPlayerRow(player))}
                        {filteredMalePlayers.length === 0 && (
                          <div className="rounded-2xl border border-dashed border-blue-200 bg-white p-4 text-sm text-slate-500">
                            No male players match your search.
                          </div>
                        )}
                      </div>
                    </section>

                    <section className="rounded-2xl border border-pink-200 bg-pink-50/40 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-pink-900">Female players</h3>
                        <span className="rounded-full bg-pink-100 px-3 py-1 text-xs font-medium text-pink-800">
                          {filteredFemalePlayers.length}
                        </span>
                      </div>
                      <div className="grid gap-3">
                        {filteredFemalePlayers.map((player) => renderSetupPlayerRow(player))}
                        {filteredFemalePlayers.length === 0 && (
                          <div className="rounded-2xl border border-dashed border-pink-200 bg-white p-4 text-sm text-slate-500">
                            No female players match your search.
                          </div>
                        )}
                      </div>
                    </section>
                  </>
                )}
              </div>
            </div>
          </section>
        )}

        {userIsAdmin && screen === "live" && (
          <section className="space-y-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">Live game</p>
                  <h2 className="mt-1 text-2xl font-semibold text-slate-900">
                    {getTeamLabel(matchup.home)} vs {getTeamLabel(matchup.away)}
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">{date}</p>
                  <p className="mt-1 text-lg font-semibold text-slate-800">
                    Score: {matchupScore.home} - {matchupScore.away}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <div className="rounded-2xl border border-slate-200 px-4 py-3 text-center">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Time left</p>
                    <p className="text-2xl font-semibold text-slate-900">{formatTime(timerSeconds)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTimerRunning((current) => !current)}
                    className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-medium text-white"
                  >
                    {timerRunning ? "Pause" : "Resume"}
                  </button>
                  <button
                    type="button"
                    onClick={undoLastEntry}
                    className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-medium text-slate-900"
                  >
                    Undo last
                  </button>
                  <button
                    type="button"
                    onClick={endGame}
                    className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-medium text-white"
                  >
                    End game
                  </button>
                </div>
              </div>
            </div>

              <div className="grid gap-4 xl:grid-cols-[1.6fr_0.8fr]">
              <div className="grid gap-4 lg:grid-cols-2">
                {renderPlayerCards(matchupPlayers.home, matchup.home, getTeamLabel(matchup.home))}
                {renderPlayerCards(matchupPlayers.away, matchup.away, getTeamLabel(matchup.away))}
              </div>

              <aside className="space-y-4">
                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="text-lg font-semibold text-slate-900">Recent activity</h3>
                  <div className="mt-3 space-y-2">
                    {logEntries.length === 0 ? (
                      <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                        No actions yet. Tap a stat button to start logging.
                      </div>
                    ) : (
                      logEntries.slice(0, 6).map((entry) => (
                        <div
                          key={entry.id}
                          className="flex items-center justify-between rounded-2xl bg-slate-50 p-3"
                        >
                          <div>
                            <p className="font-medium text-slate-900">{entry.playerName}</p>
                            <p className="text-sm text-slate-500">
                              {getTeamLabel(entry.team)} · {entry.statType}
                            </p>
                          </div>
                          <span className="text-sm font-medium text-slate-500">{entry.timestampLabel}</span>
                        </div>
                      ))
                    )}
                  </div>
                </section>

                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="text-lg font-semibold text-slate-900">MPV today</h3>
                  <p className="mt-3 text-3xl font-semibold text-slate-900">
                    {bestPlayerToday.name}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {bestPlayerToday.percentage}% of weighted contributions
                  </p>
                </section>
              </aside>
            </div>
          </section>
        )}

        {screen === "summary" && (
          <section className="space-y-4">
            {userIsAdmin ? (
              <>
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-sm font-medium text-slate-500">Step 3</p>
                  <h2 className="mt-1 text-2xl font-semibold text-slate-900">Review before saving</h2>
                  <p className="mt-2 text-sm text-slate-600">
                    Check the totals, confirm the timer, and save the game to the dashboard.
                  </p>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-sm text-slate-500">Date</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900">{date}</p>
                  </div>
                  <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-sm text-slate-500">Game length</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900">{formatTime(elapsedSeconds)}</p>
                  </div>
                  <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-sm text-slate-500">MPV</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900">
                      {bestPlayerToday.name} ({bestPlayerToday.percentage}%)
                    </p>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-slate-600">Players</p>
                    <p className="text-xs text-slate-500">{allActivePlayers.length} total</p>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {[...allActivePlayers]
                      .sort((a, b) => playerPoints(b.counts) - playerPoints(a.counts))
                      .map((player) => (
                        <div
                          key={`${player.team}-${player.name}`}
                          className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-medium text-slate-900">{player.name}</p>
                            <p className="text-xs text-slate-500">{getTeamLabel(player.team)}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-slate-900">{playerPoints(player.counts)} pts</p>
                            <p className="text-xs text-slate-500">
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
                    className="rounded-2xl bg-slate-100 px-5 py-3 font-medium text-slate-900"
                  >
                    Back to live game
                  </button>
                  <button
                    type="button"
                    onClick={saveGame}
                    disabled={isSavingGame}
                    className="rounded-2xl bg-blue-600 px-5 py-3 font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {isSavingGame ? "Saving to Google Sheets..." : "Save summary record"}
                  </button>
                </div>
                {saveGameError && (
                  <p className="text-sm text-red-600">{saveGameError}</p>
                )}
              </>
            ) : (
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-slate-500">Summary</p>
                <h2 className="mt-1 text-2xl font-semibold text-slate-900">Game summary records</h2>
                <p className="mt-2 text-sm text-slate-600">
                  View saved game results below. Only admins can save new summary records.
                </p>
              </div>
            )}

            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-5 py-4">
                <h3 className="text-lg font-semibold text-slate-900">Summary records</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Tap a game to see player points. Full stat breakdown is hidden by default.
                </p>
              </div>
              <div className="divide-y divide-slate-100">
                {isLoadingGames && (
                  <div className="px-5 py-8 text-sm text-slate-500">Loading saved games from Google Sheets...</div>
                )}
                {!isLoadingGames && gamesLoadError && (
                  <div className="px-5 py-8 text-sm text-red-600">{gamesLoadError}</div>
                )}
                {!isLoadingGames && !gamesLoadError && completedGames.length === 0 && (
                  <div className="px-5 py-8 text-sm text-slate-500">
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
                          <p className="font-medium text-slate-900">
                            {getTeamLabel(game.matchup.home)} vs {getTeamLabel(game.matchup.away)}
                          </p>
                          <p className="mt-0.5 text-sm text-slate-500">
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

                      <div className="mt-2 space-y-1 border-t border-slate-100 pt-2">
                        {gamePlayers.map((player) => (
                          <div
                            key={`${game.id}-${player.team}-${player.name}`}
                            className="flex items-center justify-between gap-3 rounded-xl px-2 py-1.5 text-sm"
                          >
                            <div className="min-w-0">
                              <span className="font-medium text-slate-900">{player.name}</span>
                              <span className="ml-2 text-slate-400">{getTeamLabel(player.team)}</span>
                            </div>
                            <span className="font-semibold text-slate-700">{playerPoints(player.counts)} pts</span>
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
          <section className="space-y-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Dashboard</p>
              <h2 className="mt-1 text-2xl font-semibold text-slate-900">Saved game results</h2>
              <p className="mt-2 text-sm text-slate-600">
                View player totals, best male and female players, and game history in one clean overview.
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">Best male player</h3>
                {renderBestPlayerCard(bestMalePlayer, "bg-blue-50")}
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">Best female player</h3>
                {renderBestPlayerCard(bestFemalePlayer, "bg-pink-50")}
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">Male ranking</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Male players ranked by total points across all saved games.
                </p>
                <div className="mt-4">{renderRankingList(maleRanking, "bg-blue-600")}</div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">Female ranking</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Female players ranked by total points across all saved games.
                </p>
                <div className="mt-4">{renderRankingList(femaleRanking, "bg-pink-500")}</div>
              </div>
            </div>

            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-5 py-4">
                <h3 className="text-lg font-semibold text-slate-900">Game history</h3>
              </div>
              <div className="divide-y divide-slate-100">
                {completedGames.map((game) => (
                  <div key={game.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900">
                        {getTeamLabel(game.matchup.home)} vs {getTeamLabel(game.matchup.away)}
                      </p>
                      <p className="text-sm text-slate-500">
                        {game.date} · {formatTime(game.timerSeconds)}
                      </p>
                    </div>
                    <p className="text-sm text-slate-600">
                      MPV <span className="font-medium text-slate-900">{game.bestPlayer.name}</span>
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {screen === "profile" && personalProgress && authUser && (
          <section className="space-y-4">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col items-center text-center">
                <ProfilePhotoPicker
                  username={authUser.username}
                  playerName={authUser.playerName}
                  onPhotoChange={() => setProfilePhotoVersion((current) => current + 1)}
                />
                <h2 className="mt-4 text-2xl font-bold text-slate-900">{authUser.playerName}</h2>
                <p className="mt-1 text-sm text-slate-600">
                  @{authUser.username} · {authUser.gender === "female" ? "Female" : "Male"}
                  {authUser.role === "admin" ? " · Admin" : ""}
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">Total points</p>
                <p className="mt-2 text-3xl font-semibold text-slate-900">{personalProgress.totalPoints}</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">Games played</p>
                <p className="mt-2 text-3xl font-semibold text-slate-900">{personalProgress.gamesPlayed}</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">MPV wins</p>
                <p className="mt-2 text-3xl font-semibold text-slate-900">{personalProgress.mvpWins}</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">
                  {authUser.gender === "female" ? "Female" : "Male"} ranking
                </p>
                <p className="mt-2 text-3xl font-semibold text-slate-900">
                  {personalProgress.genderRank
                    ? `#${personalProgress.genderRank}`
                    : "—"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  of {personalProgress.genderPoolSize} players
                </p>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">Career stats</h3>
              <p className="mt-1 text-sm text-slate-500">
                {personalProgress.totalActions} total actions across all saved games.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {STAT_TYPES.map((statType) => (
                  <div key={statType} className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">{statType}</p>
                    <p className="mt-1 text-2xl font-semibold text-slate-900">
                      {personalProgress.statsTotals[statType]}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <PlayerProgressChart games={personalProgress.gameHistory} />

            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-5 py-4">
                <h3 className="text-lg font-semibold text-slate-900">Your game history</h3>
                <p className="mt-1 text-sm text-slate-500">Personal results from every saved game you played in.</p>
              </div>

              {personalProgress.gameHistory.length === 0 ? (
                <div className="px-5 py-8 text-sm text-slate-500">
                  No saved games yet. Once you play in a game and it is saved, your progress will show here.
                </div>
              ) : (
                <div className="divide-y divide-slate-200">
                  {personalProgress.gameHistory.map((game) => {
                    const accent = getTeamAccent(game.team);
                    return (
                      <div key={game.gameId} className="px-5 py-4">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                          <div>
                            <p className="font-medium text-slate-900">{game.matchupLabel}</p>
                            <p className="mt-1 text-sm text-slate-500">
                              {game.date} · Ended {game.endedAt}
                            </p>
                            <span className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${accent.badge}`}>
                              {getTeamLabel(game.team)}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
                              {game.points} pts
                            </span>
                            {game.wasMvp && (
                              <span className="rounded-full bg-amber-50 px-3 py-1 text-sm font-medium text-amber-700">
                                MPV · {game.mvpPercentage}%
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                          {STAT_TYPES.map((statType) => (
                            <div key={statType} className="rounded-xl bg-slate-50 px-3 py-2 text-sm">
                              <span className="text-slate-500">{statType}</span>
                              <span className="ml-2 font-semibold text-slate-900">{game.counts[statType]}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        )}
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center justify-around px-2 py-2 sm:max-w-xl">
          {navItems.map(([value, label]) => {
            const isActive = screen === value || (screen === "home" && value === "home");
            return (
              <button
                key={value}
                type="button"
                onClick={() => setScreen(value)}
                className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl px-1 py-2 text-[11px] font-medium transition ${
                  isActive ? "text-blue-600" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-base ${
                    isActive ? "bg-blue-600 text-white" : "bg-slate-100"
                  }`}
                >
                  {value === "home" && "⌂"}
                  {value === "setup" && "⚙"}
                  {value === "live" && "▶"}
                  {value === "summary" && "☰"}
                  {value === "dashboard" && "📊"}
                  {value === "profile" && "👤"}
                </span>
                <span className="truncate">{label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </main>
  );
}
