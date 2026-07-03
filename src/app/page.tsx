"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PlayerProgressChart } from "@/components/PlayerProgressChart";
import { STAT_TYPES, StatType } from "@/types/stats";
import { clearAuthUser, getAuthUser, getRegisteredPlayers, isAdmin, type AuthUser } from "@/lib/auth";

type Screen = "setup" | "live" | "summary" | "dashboard" | "profile";

const ADMIN_NAV_ITEMS: Array<[Screen, string]> = [
  ["setup", "Setup"],
  ["live", "Live Game"],
  ["summary", "Summary"],
  ["dashboard", "Dashboard"],
  ["profile", "Profile"],
];

const USER_NAV_ITEMS: Array<[Screen, string]> = [
  ["summary", "Summary"],
  ["dashboard", "Dashboard"],
  ["profile", "Profile"],
];

type PersonalGameRecord = {
  gameId: number;
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
  id: number;
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

const initialCompletedGames: CompletedGame[] = [
  {
    id: 1,
    date: "2026-06-28",
    endedAt: "04:42 PM",
    timerSeconds: 3180,
    matchup: {
      home: "team1",
      away: "team2",
    },
    teamPlayers: {
      team1: [
        { name: "Ava", team: "team1", counts: { Block: 1, Assist: 2, Score: 2, Callahan: 0 } },
        { name: "Mia", team: "team1", counts: { Block: 0, Assist: 1, Score: 1, Callahan: 0 } },
      ],
      team2: [
        { name: "Noah", team: "team2", counts: { Block: 2, Assist: 0, Score: 1, Callahan: 0 } },
        { name: "Kai", team: "team2", counts: { Block: 0, Assist: 1, Score: 0, Callahan: 0 } },
      ],
      team3: [],
      team4: [],
      team5: [],
      team6: [],
      team7: [],
      team8: [],
      team9: [],
      team10: [],
      team11: [],
      team12: [],
      team13: [],
      team14: [],
      team15: [],
    },
    bestPlayer: { name: "Ava", team: "team1", percentage: 38, points: 7 },
  },
];

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

export default function Home() {
  const router = useRouter();
  const [authUser, setAuthUserState] = useState<AuthUser | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [screen, setScreen] = useState<Screen>("setup");
  const [date, setDate] = useState("2026-07-02");
  const [gameDurationMinutes, setGameDurationMinutes] = useState(20);
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
  const [completedGames, setCompletedGames] = useState<CompletedGame[]>(initialCompletedGames);

  const configuredDurationSeconds = useMemo(
    () => Math.max(gameDurationMinutes, 1) * 60,
    [gameDurationMinutes],
  );

  useEffect(() => {
    const user = getAuthUser();
    if (!user) {
      router.replace("/login");
      return;
    }

    setAuthUserState(user);
    setScreen(isAdmin(user) ? "setup" : "summary");

    const registeredPlayers = getRegisteredPlayers();
    setPlayerAssignments((current) => {
      const next: Record<string, TeamKey | null> = {};
      for (const player of registeredPlayers) {
        next[player.name] = current[player.name] ?? null;
      }
      return next;
    });
    setPlayerGenders(() => {
      const next: Record<string, PlayerGender> = {};
      for (const player of registeredPlayers) {
        next[player.name] = player.gender;
      }
      return next;
    });

    setIsAuthChecking(false);
  }, [router]);

  const userIsAdmin = isAdmin(authUser);
  const navItems = userIsAdmin ? ADMIN_NAV_ITEMS : USER_NAV_ITEMS;

  useEffect(() => {
    if (isAuthChecking || userIsAdmin) {
      return;
    }

    if (screen === "setup" || screen === "live") {
      setScreen("summary");
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
      gameHistory: [...gameHistory].sort((a, b) => b.gameId - a.gameId),
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

  function assignPlayer(name: string, team: TeamKey | null) {
    setPlayerAssignments((current) => ({
      ...current,
      [name]: team,
    }));
  }

  function startMockGame() {
    const nextTeamPlayers = createEmptyTeamPlayers();
    for (const key of matchupTeams) {
      nextTeamPlayers[key] = teamSelections[key].map((name) => createPlayer(name, key));
    }
    setTeamPlayers(nextTeamPlayers);
    setLogEntries([]);
    setTimerSeconds(configuredDurationSeconds);
    setTimerRunning(true);
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
    setScreen("summary");
  }

  function saveGame() {
    if (!userIsAdmin) {
      return;
    }

    setCompletedGames((current) => [
      {
        id: Date.now(),
        date,
        endedAt: formatClockTime(new Date()),
        timerSeconds: elapsedSeconds,
        matchup,
        teamPlayers,
        bestPlayer: getBestPlayer(
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
      },
      ...current,
    ]);

    setScreen("summary");
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
      <div className="space-y-3">
        {players.map((player, index) => {
          const widthPercent = Math.max(4, Math.round((player.points / maxPoints) * 100));
          return (
            <div key={player.name} className="grid grid-cols-[56px_140px_1fr_auto] items-center gap-3">
              <div className="rounded-xl bg-slate-100 px-2 py-2 text-center text-sm font-semibold text-slate-700">
                #{index + 1}
              </div>
              <div className="min-w-0">
                <p className="font-medium text-slate-900">{player.name}</p>
              </div>
              <div className="h-6 rounded-full bg-slate-100 p-1">
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
      <main className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
        <p className="text-sm text-slate-500">Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 px-4 py-6 text-slate-900 sm:px-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="rounded-3xl bg-white px-6 py-6 text-slate-900 shadow-sm border border-slate-200">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-700">
                Ultimate Frisbee Stat Tracker
              </p>
              <h1 className="mt-2 text-3xl font-semibold">MFULTISCORE</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                Clean scorekeeping flow: assign players to up to five teams, track stats live, review the game,
                and keep saved results on the dashboard.
              </p>
            </div>

            <div className="flex flex-col gap-3 lg:items-end">
              <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600">
                  Signed in as{" "}
                  <button
                    type="button"
                    onClick={() => setScreen("profile")}
                    className="font-medium text-slate-900 underline-offset-2 hover:underline"
                  >
                    {authUser?.playerName}
                  </button>
                  <span className="text-slate-400"> · @{authUser?.username}</span>
                </span>
                {userIsAdmin && (
                  <button
                    type="button"
                    onClick={() => router.push("/admin")}
                    className="rounded-full border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-medium text-violet-700 transition hover:bg-violet-100"
                  >
                    Admin panel
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Log out
                </button>
              </div>

              <nav className="grid grid-cols-2 gap-2 sm:flex">
              {navItems.map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setScreen(value as Screen)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    screen === value
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {label}
                </button>
              ))}
              </nav>
            </div>
          </div>
        </header>

        {userIsAdmin && screen === "setup" && (
          <section className="grid gap-4 xl:grid-cols-[1fr_1.7fr]">
            <div className="space-y-4">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-slate-500">Step 1</p>
                <h2 className="mt-1 text-2xl font-semibold text-slate-900">Prepare the game</h2>
                <p className="mt-2 text-sm text-slate-600">
                  Registered users are added as players automatically. Assign each player to a team, or leave them unassigned.
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
                      max={180}
                      value={gameDurationMinutes}
                      onChange={(event) => {
                        const value = Number(event.target.value);
                        if (Number.isNaN(value)) {
                          return;
                        }
                        setGameDurationMinutes(Math.min(180, Math.max(1, value)));
                      }}
                      className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
                    />
                  </label>
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
                onClick={startMockGame}
                disabled={matchup.home === matchup.away}
                className="w-full rounded-3xl bg-blue-600 px-5 py-4 text-lg font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                Start live scoring
              </button>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4">
                <p className="text-sm font-medium text-slate-500">Player assignment</p>
                <h2 className="mt-1 text-2xl font-semibold text-slate-900">Choose each player&apos;s team</h2>
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
                      : "No registered players yet. Create an account to be added as a player."}
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

                <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="px-4 py-3">Player</th>
                        <th className="px-4 py-3">Team</th>
                        <th className="px-4 py-3">Block</th>
                        <th className="px-4 py-3">Assist</th>
                        <th className="px-4 py-3">Score</th>
                        <th className="px-4 py-3">Callahan</th>
                        <th className="px-4 py-3">Points</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allActivePlayers.map((player) => (
                        <tr key={`${player.team}-${player.name}`} className="border-t border-slate-200">
                          <td className="px-4 py-3 font-medium text-slate-900">{player.name}</td>
                          <td className="px-4 py-3 text-slate-600">{getTeamLabel(player.team)}</td>
                          <td className="px-4 py-3">{player.counts.Block}</td>
                          <td className="px-4 py-3">{player.counts.Assist}</td>
                          <td className="px-4 py-3">{player.counts.Score}</td>
                          <td className="px-4 py-3">{player.counts.Callahan}</td>
                          <td className="px-4 py-3">{playerPoints(player.counts)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
                    className="rounded-2xl bg-blue-600 px-5 py-3 font-medium text-white"
                  >
                    Save summary record
                  </button>
                </div>
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
                  {userIsAdmin
                    ? "Saved game summaries stay visible here and new games are added to this list."
                    : "Browse saved game summaries in read-only mode."}
                </p>
              </div>
              <div className="divide-y divide-slate-200">
                {completedGames.map((game) => (
                  <details key={game.id} className="group px-5 py-4" open>
                    <summary className="grid cursor-pointer list-none gap-4 md:grid-cols-4">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Date</p>
                        <p className="mt-1 font-medium text-slate-900">{game.date}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Ended</p>
                        <p className="mt-1 font-medium text-slate-900">{game.endedAt}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Length</p>
                        <p className="mt-1 font-medium text-slate-900">{formatTime(game.timerSeconds)}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">MPV</p>
                        <p className="mt-1 font-medium text-slate-900">
                          {game.bestPlayer.name} ({game.bestPlayer.percentage}%) ·{" "}
                          {getTeamLabel(game.bestPlayer.team)}
                        </p>
                      </div>
                    </summary>

                    <div className="mt-3 rounded-xl bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-900">
                      {getTeamLabel(game.matchup.home)} VS {getTeamLabel(game.matchup.away)}
                    </div>

                    <div className="mt-3 grid gap-3 lg:grid-cols-2">
                      {[game.matchup.home, game.matchup.away].map((teamKey) => (
                        <div
                          key={`${game.id}-${teamKey}`}
                          className="rounded-2xl border border-slate-200 bg-white p-4"
                        >
                          <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
                            {getTeamLabel(teamKey)}
                          </h4>
                          <div className="mt-2 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                            <table className="min-w-full text-left text-sm">
                              <thead className="bg-slate-100 text-slate-600">
                                <tr>
                                  <th className="px-3 py-2">Player</th>
                                  <th className="px-3 py-2">B</th>
                                  <th className="px-3 py-2">A</th>
                                  <th className="px-3 py-2">S</th>
                                  <th className="px-3 py-2">C</th>
                                  <th className="px-3 py-2">Pts</th>
                                </tr>
                              </thead>
                              <tbody>
                                {game.teamPlayers[teamKey].map((player) => (
                                  <tr key={`${game.id}-${teamKey}-${player.name}`} className="border-t border-slate-200 bg-white">
                                    <td className="px-3 py-2 font-medium text-slate-900">{player.name}</td>
                                    <td className="px-3 py-2">{player.counts.Block}</td>
                                    <td className="px-3 py-2">{player.counts.Assist}</td>
                                    <td className="px-3 py-2">{player.counts.Score}</td>
                                    <td className="px-3 py-2">{player.counts.Callahan}</td>
                                    <td className="px-3 py-2">{playerPoints(player.counts)}</td>
                                  </tr>
                                ))}
                                {game.teamPlayers[teamKey].length === 0 && (
                                  <tr>
                                    <td colSpan={6} className="px-3 py-3 text-center text-slate-500">
                                      No players in this team.
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                      <table className="min-w-full text-left text-sm">
                        <thead className="bg-slate-100 text-slate-600">
                          <tr>
                            <th className="px-4 py-3">Player</th>
                            <th className="px-4 py-3">Team</th>
                            <th className="px-4 py-3">Block</th>
                            <th className="px-4 py-3">Assist</th>
                            <th className="px-4 py-3">Score</th>
                            <th className="px-4 py-3">Callahan</th>
                            <th className="px-4 py-3">Points</th>
                          </tr>
                        </thead>
                        <tbody>
                          {flattenPlayers(game.teamPlayers).map((player) => (
                            <tr
                              key={`${game.id}-${player.team}-${player.name}`}
                              className="border-t border-slate-200 bg-white"
                            >
                              <td className="px-4 py-3 font-medium text-slate-900">{player.name}</td>
                              <td className="px-4 py-3 text-slate-600">{getTeamLabel(player.team)}</td>
                              <td className="px-4 py-3">{player.counts.Block}</td>
                              <td className="px-4 py-3">{player.counts.Assist}</td>
                              <td className="px-4 py-3">{player.counts.Score}</td>
                              <td className="px-4 py-3">{player.counts.Callahan}</td>
                              <td className="px-4 py-3">{playerPoints(player.counts)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </details>
                ))}
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
              <div className="divide-y divide-slate-200">
                {completedGames.map((game) => (
                  <div key={game.id} className="grid gap-4 px-5 py-4 md:grid-cols-4">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Date</p>
                      <p className="mt-1 font-medium text-slate-900">{game.date}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Ended</p>
                      <p className="mt-1 font-medium text-slate-900">{game.endedAt}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Length</p>
                      <p className="mt-1 font-medium text-slate-900">{formatTime(game.timerSeconds)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">MPV</p>
                      <p className="mt-1 font-medium text-slate-900">
                        {game.bestPlayer.name} ({game.bestPlayer.percentage}%) · {getTeamLabel(game.bestPlayer.team)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {screen === "profile" && personalProgress && authUser && (
          <section className="space-y-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Profile</p>
              <h2 className="mt-1 text-2xl font-semibold text-slate-900">{authUser.playerName}</h2>
              <p className="mt-2 text-sm text-slate-600">
                @{authUser.username} · {authUser.gender === "female" ? "Female" : "Male"}
                {authUser.role === "admin" ? " · Admin" : ""}
              </p>
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
    </main>
  );
}
