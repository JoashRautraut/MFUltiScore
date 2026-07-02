"use client";

import { useEffect, useMemo, useState } from "react";
import { STAT_TYPES, StatType } from "@/types/stats";

type Screen = "setup" | "live" | "summary" | "dashboard" | "profile";
type TeamKey = "team1" | "team2";

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
  team1Players: ActivePlayer[];
  team2Players: ActivePlayer[];
  bestPlayer: {
    name: string;
    team: TeamKey;
    percentage: number;
    points: number;
  };
};

const initialCompletedGames: CompletedGame[] = [
  {
    id: 1,
    date: "2026-06-28",
    endedAt: "04:42 PM",
    timerSeconds: 3180,
    team1Players: [
      { name: "Ava", team: "team1", counts: { Block: 1, Assist: 2, Score: 2, Callahan: 0 } },
      { name: "Mia", team: "team1", counts: { Block: 0, Assist: 1, Score: 1, Callahan: 0 } },
    ],
    team2Players: [
      { name: "Noah", team: "team2", counts: { Block: 2, Assist: 0, Score: 1, Callahan: 0 } },
      { name: "Kai", team: "team2", counts: { Block: 0, Assist: 1, Score: 0, Callahan: 0 } },
    ],
    bestPlayer: { name: "Ava", team: "team1", percentage: 38, points: 7 },
  },
];

function emptyCounts(): Record<StatType, number> {
  return { Block: 0, Assist: 0, Score: 0, Callahan: 0 };
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

function createPlayer(name: string, team: TeamKey): ActivePlayer {
  return { name, team, counts: emptyCounts() };
}

function flattenPlayers(team1Players: ActivePlayer[], team2Players: ActivePlayer[]) {
  return [...team1Players, ...team2Players];
}

function getBestPlayer(team1Players: ActivePlayer[], team2Players: ActivePlayer[]) {
  const players = flattenPlayers(team1Players, team2Players);
  const totalPoints = players.reduce((sum, player) => sum + playerPoints(player.counts), 0);
  const sortedPlayers = [...players].sort(
    (a, b) => playerPoints(b.counts) - playerPoints(a.counts),
  );
  const winner = sortedPlayers[0] ?? createPlayer("No player", "team1");
  const winnerPoints = playerPoints(winner.counts);
  const percentage = totalPoints === 0 ? 0 : Math.round((winnerPoints / totalPoints) * 100);

  return {
    name: winner.name,
    team: winner.team,
    points: winnerPoints,
    percentage,
  };
}

export default function Home() {
  const [screen, setScreen] = useState<Screen>("setup");
  const [date, setDate] = useState("2026-07-02");
  const [quickAddName, setQuickAddName] = useState("");
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
  const [team1Players, setTeam1Players] = useState<ActivePlayer[]>([
    createPlayer("Ava", "team1"),
    createPlayer("Mia", "team1"),
    createPlayer("Zoe", "team1"),
  ]);
  const [team2Players, setTeam2Players] = useState<ActivePlayer[]>([
    createPlayer("Noah", "team2"),
    createPlayer("Kai", "team2"),
    createPlayer("Eli", "team2"),
  ]);
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [completedGames, setCompletedGames] = useState<CompletedGame[]>(initialCompletedGames);
  const [selectedProfileName, setSelectedProfileName] = useState("Ava");

  useEffect(() => {
    if (!timerRunning) {
      return;
    }

    const interval = window.setInterval(() => {
      setTimerSeconds((current) => current + 1);
    }, 1000);

    return () => window.clearInterval(interval);
  }, [timerRunning]);

  const allActivePlayers = useMemo(
    () => flattenPlayers(team1Players, team2Players),
    [team1Players, team2Players],
  );

  const allSetupPlayers = useMemo(
    () => Object.keys(playerAssignments).sort((a, b) => a.localeCompare(b)),
    [playerAssignments],
  );

  const team1Selection = useMemo(
    () =>
      allSetupPlayers.filter((player) => playerAssignments[player] === "team1"),
    [allSetupPlayers, playerAssignments],
  );

  const team2Selection = useMemo(
    () =>
      allSetupPlayers.filter((player) => playerAssignments[player] === "team2"),
    [allSetupPlayers, playerAssignments],
  );

  const unassignedPlayers = useMemo(
    () => allSetupPlayers.filter((player) => playerAssignments[player] === null),
    [allSetupPlayers, playerAssignments],
  );

  const bestPlayerToday = useMemo(
    () => getBestPlayer(team1Players, team2Players),
    [team1Players, team2Players],
  );

  const selectedProfileGames = useMemo(() => {
    return completedGames.filter((game) =>
      flattenPlayers(game.team1Players, game.team2Players).some(
        (player) => player.name === selectedProfileName,
      ),
    );
  }, [completedGames, selectedProfileName]);

  const selectedProfileTotals = useMemo(() => {
    return selectedProfileGames.reduce(
      (totals, game) => {
        const player = flattenPlayers(game.team1Players, game.team2Players).find(
          (entry) => entry.name === selectedProfileName,
        );

        if (!player) {
          return totals;
        }

        for (const statType of STAT_TYPES) {
          totals[statType] += player.counts[statType];
        }

        return totals;
      },
      emptyCounts(),
    );
  }, [selectedProfileGames, selectedProfileName]);

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
    setTeam1Players(team1Selection.map((name) => createPlayer(name, "team1")));
    setTeam2Players(team2Selection.map((name) => createPlayer(name, "team2")));
    setLogEntries([]);
    setTimerSeconds(0);
    setTimerRunning(true);
    setScreen("live");
  }

  function updateTeamPlayers(team: TeamKey, updater: (players: ActivePlayer[]) => ActivePlayer[]) {
    if (team === "team1") {
      setTeam1Players(updater);
      return;
    }

    setTeam2Players(updater);
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
        timestampLabel: formatTime(timerSeconds),
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
    const endedAt = formatClockTime(new Date());
    const bestPlayer = getBestPlayer(team1Players, team2Players);

    setCompletedGames((current) => [
      {
        id: Date.now(),
        date,
        endedAt,
        timerSeconds,
        team1Players,
        team2Players,
        bestPlayer,
      },
      ...current,
    ]);

    setSelectedProfileName(bestPlayer.name);
    setScreen("dashboard");
  }

  const dashboardPlayers = useMemo(() => {
    const totals = new Map<
      string,
      {
        name: string;
        team: TeamKey;
        points: number;
        games: number;
        mvpWins: number;
        lastPercentage: number;
      }
    >();

    for (const game of completedGames) {
      for (const player of flattenPlayers(game.team1Players, game.team2Players)) {
        const existing = totals.get(player.name) ?? {
          name: player.name,
          team: player.team,
          points: 0,
          games: 0,
          mvpWins: 0,
          lastPercentage: 0,
        };

        existing.points += playerPoints(player.counts);
        existing.games += 1;

        if (game.bestPlayer.name === player.name) {
          existing.mvpWins += 1;
          existing.lastPercentage = game.bestPlayer.percentage;
        }

        totals.set(player.name, existing);
      }
    }

    return [...totals.values()].sort((a, b) => b.points - a.points);
  }, [completedGames]);

  return (
    <main className="min-h-screen bg-stone-100 px-4 py-5 text-stone-900 sm:px-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
        <header className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">
                Ultimate Frisbee Stat Tracker
              </p>
              <h1 className="mt-1 text-3xl font-semibold">MFULTISCORE</h1>
              <p className="mt-2 max-w-2xl text-sm text-stone-600">
                Simple UI preview with two-team setup, live timer, end-of-game save,
                and a dashboard that keeps the best player percentage for each day.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex">
              {[
                ["setup", "Setup"],
                ["live", "Live"],
                ["summary", "Summary"],
                ["dashboard", "Dashboard"],
                ["profile", "Profile"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setScreen(value as Screen)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    screen === value
                      ? "bg-stone-900 text-white"
                      : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </header>

        <div className="grid gap-4 lg:grid-cols-[1.7fr_0.9fr]">
          <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
            {screen === "setup" && (
              <div className="space-y-6">
                <div>
                  <p className="text-sm font-medium text-stone-500">Step 1</p>
                  <h2 className="text-2xl font-semibold">Set up the game</h2>
                  <p className="mt-1 text-sm text-stone-600">
                    Pick the date and assign players to Team 1 or Team 2.
                  </p>
                </div>

                <label className="block rounded-2xl bg-stone-50 p-4">
                  <span className="text-sm font-medium text-stone-600">Game date</span>
                  <input
                    type="date"
                    value={date}
                    onChange={(event) => setDate(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-stone-200 bg-white px-3 py-3 outline-none"
                  />
                </label>

                <div className="rounded-2xl bg-stone-50 p-4">
                  <h3 className="text-lg font-semibold">Quick add player</h3>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <input
                      value={quickAddName}
                      onChange={(event) => setQuickAddName(event.target.value)}
                      placeholder="Add player with no team yet"
                      className="flex-1 rounded-xl border border-stone-200 bg-white px-4 py-3 outline-none"
                    />
                    <button
                      type="button"
                      onClick={quickAddPlayer}
                      className="rounded-xl bg-stone-900 px-4 py-3 font-medium text-white"
                    >
                      Add
                    </button>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                    <p className="text-sm text-stone-500">No team</p>
                    <p className="mt-1 text-2xl font-semibold">{unassignedPlayers.length}</p>
                  </div>
                  <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                    <p className="text-sm text-stone-500">Team 1</p>
                    <p className="mt-1 text-2xl font-semibold">{team1Selection.length}</p>
                  </div>
                  <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                    <p className="text-sm text-stone-500">Team 2</p>
                    <p className="mt-1 text-2xl font-semibold">{team2Selection.length}</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-stone-200 p-4">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold">Assign players</h3>
                    <p className="text-sm text-stone-500">
                      Every player starts with no team. Choose whether each player is on Team 1 or Team 2.
                    </p>
                  </div>

                  <div className="grid gap-3">
                    {allSetupPlayers.map((player) => {
                      const assignment = playerAssignments[player];

                      return (
                        <div
                          key={player}
                          className="flex flex-col gap-3 rounded-2xl border border-stone-200 p-4 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div>
                            <p className="font-medium">{player}</p>
                            <p className="text-sm text-stone-500">
                              {assignment === null
                                ? "No team assigned"
                                : assignment === "team1"
                                  ? "Assigned to Team 1"
                                  : "Assigned to Team 2"}
                            </p>
                          </div>

                          <div className="grid grid-cols-3 gap-2 sm:w-auto">
                            <button
                              type="button"
                              onClick={() => assignPlayer(player, null)}
                              className={`rounded-xl px-3 py-2 text-sm font-medium ${
                                assignment === null
                                  ? "bg-stone-900 text-white"
                                  : "bg-stone-100 text-stone-700"
                              }`}
                            >
                              No team
                            </button>
                            <button
                              type="button"
                              onClick={() => assignPlayer(player, "team1")}
                              className={`rounded-xl px-3 py-2 text-sm font-medium ${
                                assignment === "team1"
                                  ? "bg-stone-900 text-white"
                                  : "bg-stone-100 text-stone-700"
                              }`}
                            >
                              Team 1
                            </button>
                            <button
                              type="button"
                              onClick={() => assignPlayer(player, "team2")}
                              className={`rounded-xl px-3 py-2 text-sm font-medium ${
                                assignment === "team2"
                                  ? "bg-stone-900 text-white"
                                  : "bg-stone-100 text-stone-700"
                              }`}
                            >
                              Team 2
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={startMockGame}
                  className="w-full rounded-2xl bg-stone-900 px-5 py-4 text-lg font-semibold text-white"
                >
                  Start live scoring
                </button>
              </div>
            )}

            {screen === "live" && (
              <div className="space-y-4">
                <div className="rounded-2xl bg-stone-50 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm text-stone-500">{date}</p>
                      <h2 className="text-2xl font-semibold">Team 1 vs Team 2</h2>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <div className="rounded-xl border border-stone-200 bg-white px-4 py-3 text-center">
                        <p className="text-xs uppercase tracking-wide text-stone-500">Timer</p>
                        <p className="text-2xl font-semibold">{formatTime(timerSeconds)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setTimerRunning((current) => !current)}
                        className="rounded-xl bg-stone-900 px-4 py-3 text-sm font-medium text-white"
                      >
                        {timerRunning ? "Pause timer" : "Resume timer"}
                      </button>
                      <button
                        type="button"
                        onClick={undoLastEntry}
                        className="rounded-xl bg-stone-200 px-4 py-3 text-sm font-medium text-stone-900"
                      >
                        Undo last
                      </button>
                      <button
                        type="button"
                        onClick={endGame}
                        className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-medium text-white"
                      >
                        End game
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  {[
                    { key: "team1" as TeamKey, label: "Team 1", players: team1Players },
                    { key: "team2" as TeamKey, label: "Team 2", players: team2Players },
                  ].map((team) => (
                    <div key={team.key} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xl font-semibold">{team.label}</h3>
                        <span className="rounded-full bg-stone-100 px-3 py-1 text-sm text-stone-600">
                          {team.players.length} players
                        </span>
                      </div>

                      {team.players.map((player) => (
                        <article key={player.name} className="rounded-2xl border border-stone-200 p-4">
                          <div className="mb-3 flex items-center justify-between gap-2">
                            <div>
                              <h4 className="text-lg font-semibold">{player.name}</h4>
                              <p className="text-sm text-stone-500">
                                Total actions: {totalCounts(player.counts)}
                              </p>
                            </div>
                            <span className="rounded-full bg-stone-100 px-3 py-1 text-sm text-stone-600">
                              {playerPoints(player.counts)} pts
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            {STAT_TYPES.map((statType) => (
                              <button
                                key={statType}
                                type="button"
                                onClick={() => addStat(player.name, team.key, statType)}
                                className="rounded-2xl bg-stone-900 px-3 py-4 text-left text-white"
                              >
                                <span className="block text-sm text-stone-300">{statType}</span>
                                <span className="mt-1 block text-2xl font-semibold">
                                  {player.counts[statType]}
                                </span>
                              </button>
                            ))}
                          </div>
                        </article>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {screen === "summary" && (
              <div className="space-y-5">
                <div>
                  <p className="text-sm font-medium text-stone-500">Step 3</p>
                  <h2 className="text-2xl font-semibold">Game summary</h2>
                  <p className="mt-1 text-sm text-stone-600">
                    Review the result, save the end time, and record the best player percentage.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl bg-stone-50 p-4">
                    <p className="text-sm text-stone-500">Date</p>
                    <p className="mt-1 text-lg font-semibold">{date}</p>
                  </div>
                  <div className="rounded-2xl bg-stone-50 p-4">
                    <p className="text-sm text-stone-500">Game length</p>
                    <p className="mt-1 text-lg font-semibold">{formatTime(timerSeconds)}</p>
                  </div>
                  <div className="rounded-2xl bg-stone-50 p-4">
                    <p className="text-sm text-stone-500">Best player today</p>
                    <p className="mt-1 text-lg font-semibold">
                      {bestPlayerToday.name} ({bestPlayerToday.percentage}%)
                    </p>
                  </div>
                </div>

                <div className="overflow-hidden rounded-2xl border border-stone-200">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-stone-50 text-stone-600">
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
                        <tr key={`${player.team}-${player.name}`} className="border-t border-stone-200">
                          <td className="px-4 py-3 font-medium">{player.name}</td>
                          <td className="px-4 py-3">{player.team === "team1" ? "Team 1" : "Team 2"}</td>
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
                      setTimerRunning(true);
                      setScreen("live");
                    }}
                    className="rounded-xl bg-stone-200 px-4 py-3 font-medium text-stone-900"
                  >
                    Back to live
                  </button>
                  <button
                    type="button"
                    onClick={saveGame}
                    className="rounded-xl bg-stone-900 px-4 py-3 font-medium text-white"
                  >
                    Save to dashboard
                  </button>
                </div>
              </div>
            )}

            {screen === "dashboard" && (
              <div className="space-y-5">
                <div>
                  <p className="text-sm font-medium text-stone-500">Home screen</p>
                  <h2 className="text-2xl font-semibold">Dashboard</h2>
                  <p className="mt-1 text-sm text-stone-600">
                    Every finished game stays recorded here with the date, end time, and best
                    player percentage.
                  </p>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  {dashboardPlayers.map((player) => (
                    <button
                      key={player.name}
                      type="button"
                      onClick={() => {
                        setSelectedProfileName(player.name);
                        setScreen("profile");
                      }}
                      className="rounded-2xl border border-stone-200 p-4 text-left"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-semibold">{player.name}</h3>
                          <p className="text-sm text-stone-500">
                            {player.team === "team1" ? "Team 1" : "Team 2"} player
                          </p>
                        </div>
                        <span className="rounded-full bg-stone-900 px-3 py-1 text-xs font-medium text-white">
                          {player.points} pts
                        </span>
                      </div>
                      <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                        <div className="rounded-xl bg-stone-50 p-3">
                          <p className="text-stone-500">Games</p>
                          <p className="mt-1 font-semibold">{player.games}</p>
                        </div>
                        <div className="rounded-xl bg-stone-50 p-3">
                          <p className="text-stone-500">Best player</p>
                          <p className="mt-1 font-semibold">{player.mvpWins}x</p>
                        </div>
                        <div className="rounded-xl bg-stone-50 p-3">
                          <p className="text-stone-500">Top %</p>
                          <p className="mt-1 font-semibold">{player.lastPercentage}%</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="rounded-2xl border border-stone-200">
                  <div className="border-b border-stone-200 px-4 py-3">
                    <h3 className="font-semibold">Saved game records</h3>
                  </div>
                  <div className="divide-y divide-stone-200">
                    {completedGames.map((game) => (
                      <div key={game.id} className="grid gap-3 px-4 py-4 md:grid-cols-4">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-stone-500">Date</p>
                          <p className="font-medium">{game.date}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wide text-stone-500">Ended</p>
                          <p className="font-medium">{game.endedAt}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wide text-stone-500">Length</p>
                          <p className="font-medium">{formatTime(game.timerSeconds)}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wide text-stone-500">Best player</p>
                          <p className="font-medium">
                            {game.bestPlayer.name} ({game.bestPlayer.percentage}%)
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {screen === "profile" && (
              <div className="space-y-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-stone-500">Player profile</p>
                    <h2 className="text-2xl font-semibold">{selectedProfileName}</h2>
                    <p className="mt-1 text-sm text-stone-600">
                      Game-by-game record based on saved dashboard entries.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setScreen("dashboard")}
                    className="rounded-xl bg-stone-200 px-4 py-3 font-medium text-stone-900"
                  >
                    Back to dashboard
                  </button>
                </div>

                <div className="grid gap-3 sm:grid-cols-4">
                  {STAT_TYPES.map((statType) => (
                    <div key={statType} className="rounded-2xl bg-stone-50 p-4">
                      <p className="text-sm text-stone-500">{statType}</p>
                      <p className="mt-1 text-2xl font-semibold">
                        {selectedProfileTotals[statType]}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl border border-stone-200">
                  <div className="border-b border-stone-200 px-4 py-3">
                    <h3 className="font-semibold">Recorded games</h3>
                  </div>
                  <div className="divide-y divide-stone-200">
                    {selectedProfileGames.map((game) => {
                      const player = flattenPlayers(game.team1Players, game.team2Players).find(
                        (entry) => entry.name === selectedProfileName,
                      );

                      if (!player) {
                        return null;
                      }

                      return (
                        <div key={game.id} className="grid gap-3 px-4 py-4 md:grid-cols-7">
                          <div>
                            <p className="text-xs uppercase tracking-wide text-stone-500">Date</p>
                            <p className="font-medium">{game.date}</p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-wide text-stone-500">End</p>
                            <p className="font-medium">{game.endedAt}</p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-wide text-stone-500">Block</p>
                            <p className="font-medium">{player.counts.Block}</p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-wide text-stone-500">Assist</p>
                            <p className="font-medium">{player.counts.Assist}</p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-wide text-stone-500">Score</p>
                            <p className="font-medium">{player.counts.Score}</p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-wide text-stone-500">Callahan</p>
                            <p className="font-medium">{player.counts.Callahan}</p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-wide text-stone-500">Best %</p>
                            <p className="font-medium">
                              {game.bestPlayer.name === selectedProfileName
                                ? `${game.bestPlayer.percentage}%`
                                : "-"}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </section>

          <aside className="space-y-4">
            <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold">Recent activity</h2>
              <div className="mt-3 space-y-2">
                {logEntries.length === 0 ? (
                  <div className="rounded-2xl bg-stone-50 p-4 text-sm text-stone-600">
                    No actions logged yet. Start the game and tap a stat button.
                  </div>
                ) : (
                  logEntries.slice(0, 7).map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between rounded-2xl bg-stone-50 p-3"
                    >
                      <div>
                        <p className="font-medium">{entry.playerName}</p>
                        <p className="text-sm text-stone-500">
                          {entry.team === "team1" ? "Team 1" : "Team 2"} · {entry.statType}
                        </p>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-sm text-stone-600">
                        {entry.timestampLabel}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold">Today&apos;s leader</h2>
              <div className="mt-3 rounded-2xl bg-stone-50 p-4">
                <p className="text-sm text-stone-500">Best player percentage</p>
                <p className="mt-1 text-2xl font-semibold">
                  {bestPlayerToday.name} · {bestPlayerToday.percentage}%
                </p>
                <p className="mt-2 text-sm text-stone-600">
                  Based on this game&apos;s weighted contributions. Callahan counts as double.
                </p>
              </div>
            </section>

            <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold">Simple style notes</h2>
              <ul className="mt-3 space-y-2 text-sm text-stone-600">
                <li>Color palette changed to light neutral tones.</li>
                <li>Setup now uses Team 1 and Team 2 instead of opponent/location.</li>
                <li>Dashboard stores date, end time, and best-player percentage.</li>
              </ul>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
