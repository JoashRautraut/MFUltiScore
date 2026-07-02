"use client";

import { useEffect, useMemo, useState } from "react";
import { STAT_TYPES, StatType } from "@/types/stats";

type Screen = "setup" | "live" | "summary" | "dashboard";
type TeamKey = "team1" | "team2" | "team3" | "team4" | "team5";

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
  teamPlayers: Record<TeamKey, ActivePlayer[]>;
  bestPlayer: {
    name: string;
    team: TeamKey;
    percentage: number;
    points: number;
  };
};

const TEAM_OPTIONS: { key: TeamKey; label: string }[] = [
  { key: "team1", label: "Team 1" },
  { key: "team2", label: "Team 2" },
  { key: "team3", label: "Team 3" },
  { key: "team4", label: "Team 4" },
  { key: "team5", label: "Team 5" },
];

const initialCompletedGames: CompletedGame[] = [
  {
    id: 1,
    date: "2026-06-28",
    endedAt: "04:42 PM",
    timerSeconds: 3180,
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
  return {
    team1: [],
    team2: [],
    team3: [],
    team4: [],
    team5: [],
  };
}

function createEmptyTeamNameGroups(): Record<TeamKey, string[]> {
  return {
    team1: [],
    team2: [],
    team3: [],
    team4: [],
    team5: [],
  };
}

function flattenPlayers(teamPlayers: Record<TeamKey, ActivePlayer[]>) {
  return TEAM_OPTIONS.flatMap(({ key }) => teamPlayers[key]);
}

function getTeamLabel(team: TeamKey) {
  return TEAM_OPTIONS.find((option) => option.key === team)?.label ?? team;
}

function getTeamAccent(team: TeamKey) {
  const accents: Record<TeamKey, { soft: string; strong: string; ring: string }> = {
    team1: { soft: "bg-blue-50", strong: "bg-blue-600", ring: "border-blue-200" },
    team2: { soft: "bg-emerald-50", strong: "bg-emerald-600", ring: "border-emerald-200" },
    team3: { soft: "bg-amber-50", strong: "bg-amber-500", ring: "border-amber-200" },
    team4: { soft: "bg-violet-50", strong: "bg-violet-600", ring: "border-violet-200" },
    team5: { soft: "bg-rose-50", strong: "bg-rose-600", ring: "border-rose-200" },
  };
  return accents[team];
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
  const [screen, setScreen] = useState<Screen>("setup");
  const [date, setDate] = useState("2026-07-02");
  const [gameDurationMinutes, setGameDurationMinutes] = useState(20);
  const [quickAddName, setQuickAddName] = useState("");
  const [playerSearch, setPlayerSearch] = useState("");
  const [matchup, setMatchup] = useState<{ home: TeamKey; away: TeamKey }>({
    home: "team1",
    away: "team2",
  });
  const [playerAssignments, setPlayerAssignments] = useState<Record<string, TeamKey | null>>({
    Ava: null,
    Mia: null,
    Noah: null,
    Kai: null,
    Liam: null,
    Zoe: null,
    Eli: null,
    Jade: null,
  });
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

  const unassignedPlayers = useMemo(
    () => allSetupPlayers.filter((player) => playerAssignments[player] === null),
    [allSetupPlayers, playerAssignments],
  );

  const filteredSetupPlayers = useMemo(() => {
    const query = playerSearch.trim().toLowerCase();
    if (!query) {
      return allSetupPlayers;
    }

    return allSetupPlayers.filter((player) =>
      player.toLowerCase().includes(query),
    );
  }, [allSetupPlayers, playerSearch]);

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
      getBestPlayer({
        team1: matchup.home === "team1" || matchup.away === "team1" ? teamPlayers.team1 : [],
        team2: matchup.home === "team2" || matchup.away === "team2" ? teamPlayers.team2 : [],
        team3: matchup.home === "team3" || matchup.away === "team3" ? teamPlayers.team3 : [],
        team4: matchup.home === "team4" || matchup.away === "team4" ? teamPlayers.team4 : [],
        team5: matchup.home === "team5" || matchup.away === "team5" ? teamPlayers.team5 : [],
      }),
    [matchup, teamPlayers],
  );

  const dashboardPlayers = useMemo(() => {
    const totals = new Map<
      string,
      { name: string; team: TeamKey; points: number; games: number; bestPlayerWins: number; topPercentage: number }
    >();

    for (const game of completedGames) {
      for (const player of flattenPlayers(game.teamPlayers)) {
        const current = totals.get(player.name) ?? {
          name: player.name,
          team: player.team,
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

    return [...totals.values()].sort((a, b) => b.points - a.points);
  }, [completedGames]);

  function assignPlayer(name: string, team: TeamKey | null) {
    setPlayerAssignments((current) => ({
      ...current,
      [name]: team,
    }));
  }

  function quickAddPlayer() {
    const normalized = quickAddName.trim();
    if (!normalized) {
      return;
    }

    setPlayerAssignments((current) =>
      current[normalized] !== undefined
        ? current
        : {
            ...current,
            [normalized]: null,
          },
    );

    setQuickAddName("");
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
    setCompletedGames((current) => [
      {
        id: Date.now(),
        date,
        endedAt: formatClockTime(new Date()),
        timerSeconds: elapsedSeconds,
        teamPlayers,
        bestPlayer: getBestPlayer({
          team1: matchup.home === "team1" || matchup.away === "team1" ? teamPlayers.team1 : [],
          team2: matchup.home === "team2" || matchup.away === "team2" ? teamPlayers.team2 : [],
          team3: matchup.home === "team3" || matchup.away === "team3" ? teamPlayers.team3 : [],
          team4: matchup.home === "team4" || matchup.away === "team4" ? teamPlayers.team4 : [],
          team5: matchup.home === "team5" || matchup.away === "team5" ? teamPlayers.team5 : [],
        }),
      },
      ...current,
    ]);

    setScreen("summary");
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

            <nav className="grid grid-cols-2 gap-2 sm:flex">
              {[
                ["setup", "Setup"],
                ["live", "Live Game"],
                ["summary", "Summary"],
                ["dashboard", "Dashboard"],
              ].map(([value, label]) => (
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
        </header>

        {screen === "setup" && (
          <section className="grid gap-4 xl:grid-cols-[1fr_1.7fr]">
            <div className="space-y-4">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-slate-500">Step 1</p>
                <h2 className="mt-1 text-2xl font-semibold text-slate-900">Prepare the game</h2>
                <p className="mt-2 text-sm text-slate-600">
                  Add players, then choose whether each player belongs to Team 1 to Team 5, or no team yet.
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

                <div className="mt-4">
                  <span className="text-sm font-medium text-slate-600">Quick add player</span>
                  <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                    <input
                      value={quickAddName}
                      onChange={(event) => setQuickAddName(event.target.value)}
                      placeholder="Type a new player name"
                      className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
                    />
                    <button
                      type="button"
                      onClick={quickAddPlayer}
                      className="rounded-2xl bg-slate-900 px-4 py-3 font-medium text-white"
                    >
                      Add player
                    </button>
                  </div>
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
                          away: current.away === nextHome ? "team2" : current.away,
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
                          home: current.home === nextAway ? "team1" : current.home,
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

              <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
                <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-sm text-slate-500">No team</p>
                  <p className="mt-2 text-3xl font-semibold">{unassignedPlayers.length}</p>
                </div>
                {TEAM_OPTIONS.map((option) => (
                  <div
                    key={option.key}
                    className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <p className="text-sm text-slate-500">{option.label}</p>
                    <p className="mt-2 text-3xl font-semibold">
                      {teamSelections[option.key].length}
          </p>
        </div>
                ))}
              </div>

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

              <div className="grid gap-3">
                {filteredSetupPlayers.map((player) => {
                  const assignment = playerAssignments[player];

                  return (
                    <div
                      key={player}
                      className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 md:flex-row md:items-center md:justify-between"
                    >
                      <div>
                        <p className="font-medium text-slate-900">{player}</p>
                        <p className="text-sm text-slate-500">
                          {assignment === null
                            ? "No team assigned"
                            : assignment === "team1"
                              ? "Assigned to Team 1"
                              : "Assigned to Team 2"}
                        </p>
                      </div>

                      <label className="w-full md:w-44">
                        <span className="sr-only">Assign team for {player}</span>
                        <select
                          value={assignment ?? ""}
                          onChange={(event) => {
                            const value = event.target.value;
                            assignPlayer(
                              player,
                              value === "" ? null : (value as TeamKey),
                            );
                          }}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-slate-400"
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
                })}

                {filteredSetupPlayers.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                    No players match your search.
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {screen === "live" && (
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

            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-5 py-4">
                <h3 className="text-lg font-semibold text-slate-900">Summary records</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Saved game summaries stay visible here and new games are added to this list.
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
                View player totals and every saved game in one clean overview.
              </p>
            </div>

            <div className="grid gap-3 lg:grid-cols-3">
              {dashboardPlayers.map((player) => (
                <div key={player.name} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">{player.name}</h3>
                      <p className="text-sm text-slate-500">
                        {getTeamLabel(player.team)}
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600">
                      {player.points} pts
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <p className="text-slate-500">Games</p>
                      <p className="mt-1 font-semibold text-slate-900">{player.games}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <p className="text-slate-500">MPV</p>
                      <p className="mt-1 font-semibold text-slate-900">{player.bestPlayerWins}x</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <p className="text-slate-500">Top %</p>
                      <p className="mt-1 font-semibold text-slate-900">{player.topPercentage}%</p>
                    </div>
                  </div>
                </div>
              ))}
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
        </div>
      </main>
  );
}
