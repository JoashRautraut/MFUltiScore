"use client";

import { useEffect, useMemo, useState } from "react";
import { STAT_TYPES, StatType } from "@/types/stats";

type Screen = "setup" | "live" | "summary" | "dashboard";
type TeamKey = string; // Dynanmic Team IDs

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

type Team = {
  teamId: string;
  name: string;
  dateCreated: string;
};

type CompletedGame = {
  id: string | number;
  date: string;
  endedAt: string;
  timerSeconds: number;
  teamPlayers: Record<string, ActivePlayer[]>;
  bestPlayer: {
    name: string;
    team: TeamKey;
    percentage: number;
    points: number;
  };
};

function emptyCounts(): Record<StatType, number> {
  return { Block: 0, Assist: 0, Score: 0, Callahan: 0 };
}

function createPlayer(name: string, team: TeamKey): ActivePlayer {
  return { name, team, counts: emptyCounts() };
}

function createEmptyTeamPlayersMap(teams: Team[]): Record<string, ActivePlayer[]> {
  const map: Record<string, ActivePlayer[]> = {};
  teams.forEach((t) => {
    map[t.teamId] = [];
  });
  return map;
}

function flattenPlayers(teamPlayers: Record<string, ActivePlayer[]>) {
  return Object.values(teamPlayers).flat();
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

function getBestPlayer(teamPlayers: Record<string, ActivePlayer[]>) {
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

function parseSpreadsheetId(urlOrId: string): string {
  const trimmed = urlOrId.trim();
  if (!trimmed) return "";
  const match = trimmed.match(/\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : trimmed;
}

export default function Home() {
  const [screen, setScreen] = useState<Screen>("setup");
  const [date, setDate] = useState("");
  const [quickAddName, setQuickAddName] = useState("");
  const [playerSearch, setPlayerSearch] = useState("");
  const [matchup, setMatchup] = useState<{ home: string; away: string }>({
    home: "team1",
    away: "team2",
  });

  const [players, setPlayers] = useState<any[]>([]);
  const [playerAssignments, setPlayerAssignments] = useState<Record<string, string | null>>({});
  const [teamPlayers, setTeamPlayers] = useState<Record<string, ActivePlayer[]>>({});
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [completedGames, setCompletedGames] = useState<CompletedGame[]>([]);

  // Dynamic Teams CRUD States
  const [teamsList, setTeamsList] = useState<Team[]>([]);
  const [newTeamName, setNewTeamName] = useState("");
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [editingTeamName, setEditingTeamName] = useState("");

  // Server sheets config
  const [config, setConfig] = useState<{ isGoogleSheetsSupported: boolean; serviceAccountEmail: string | null }>({
    isGoogleSheetsSupported: false,
    serviceAccountEmail: null,
  });

  const [spreadsheetUrl, setSpreadsheetUrlState] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");

  // Live Sync & Dashboard Polling states
  const [activeGame, setActiveGame] = useState<any | null>(null);
  const [dashboardSortCategory, setDashboardSortCategory] = useState<"points" | StatType>("points");
  const [pendingChanges, setPendingChanges] = useState<Record<string, Record<StatType, number>>>({});

  // Dynamic label helpers
  const teamMap = useMemo(() => {
    return new Map(teamsList.map((t) => [t.teamId, t.name]));
  }, [teamsList]);

  function getTeamLabel(teamId: string) {
    return teamMap.get(teamId) || teamId;
  }

  function setSpreadsheetUrl(url: string) {
    setSpreadsheetUrlState(url);
    localStorage.setItem("mfultiscore_spreadsheet_url", url);
  }

  // Fetch players from API
  async function fetchPlayers() {
    try {
      const res = await fetch("/api/players");
      const data = await res.json();
      if (data.players) {
        setPlayers(data.players);
        setPlayerAssignments((current) => {
          const updated = { ...current };
          data.players.forEach((p: any) => {
            if (updated[p.name] === undefined) {
              updated[p.name] = null;
            }
          });
          return updated;
        });
      }
    } catch (e) {
      console.error("Failed to fetch players:", e);
    }
  }

  // Fetch games from API and reconstruct CompletedGame objects
  async function fetchGames() {
    try {
      const res = await fetch("/api/games");
      const data = await res.json();
      if (data.games) {
        const mapped = data.games.map((game: any) => {
          try {
            const details = JSON.parse(game.location);
            return {
              id: game.gameId,
              date: game.date,
              endedAt: details.endedAt || "",
              timerSeconds: details.timerSeconds || 0,
              teamPlayers: details.teamPlayers || {},
              bestPlayer: getBestPlayer(details.teamPlayers || {}),
            };
          } catch (e) {
            return {
              id: game.gameId,
              date: game.date,
              endedAt: "N/A",
              timerSeconds: 0,
              teamPlayers: {},
              bestPlayer: { name: "N/A", team: "team1", percentage: 0, points: 0 },
            };
          }
        });

        mapped.sort((a: any, b: any) => String(b.date).localeCompare(String(a.date)));
        setCompletedGames(mapped);
      }
    } catch (e) {
      console.error("Failed to fetch games:", e);
    }
  }

  // Fetch teams from backend
  async function fetchTeams() {
    try {
      const res = await fetch("/api/teams");
      const data = await res.json();
      if (data.teams) {
        setTeamsList(data.teams);
      }
    } catch (e) {
      console.error("Failed to fetch teams:", e);
    }
  }

  // Fetch server config (Google Sheets service account status)
  async function fetchConfig() {
    try {
      const res = await fetch("/api/config");
      const data = await res.json();
      setConfig({
        isGoogleSheetsSupported: data.isGoogleSheetsSupported,
        serviceAccountEmail: data.serviceAccountEmail,
      });
    } catch (e) {
      console.error("Failed to fetch config:", e);
    }
  }

  // Fetch current active game (if any) to allow resuming sessions
  async function fetchActiveGame() {
    try {
      const res = await fetch("/api/active-game");
      const data = await res.json();
      if (data.activeGame) {
        setActiveGame(data.activeGame);
      }
    } catch (e) {
      console.error("Failed to fetch active game:", e);
    }
  }

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    setDate(today);

    fetchPlayers();
    fetchGames();
    fetchTeams();
    fetchConfig();
    fetchActiveGame();

    const savedUrl = localStorage.getItem("mfultiscore_spreadsheet_url");
    if (savedUrl) {
      setSpreadsheetUrlState(savedUrl);
    }
  }, []);

  // Sync matchup selections to valid loaded dynamic teams
  useEffect(() => {
    if (teamsList.length >= 2) {
      setMatchup((current) => {
        const homeExists = teamsList.some((t) => t.teamId === current.home);
        const awayExists = teamsList.some((t) => t.teamId === current.away);
        return {
          home: homeExists ? current.home : teamsList[0].teamId,
          away: awayExists ? current.away : teamsList[1].teamId,
        };
      });
    }
  }, [teamsList]);

  // Timer runner
  useEffect(() => {
    if (!timerRunning) {
      return;
    }

    const interval = window.setInterval(() => {
      setTimerSeconds((current) => {
        const nextSecs = current + 1;
        if (nextSecs % 10 === 0) {
          syncActiveGame(matchup, date, nextSecs, true, teamPlayers, logEntries);
        }
        return nextSecs;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [timerRunning, matchup, date, teamPlayers, logEntries]);

  // Spectator Polling Interval
  useEffect(() => {
    let interval: number;

    if (screen === "dashboard" || screen === "setup") {
      interval = window.setInterval(async () => {
        await fetchGames();
        await fetchTeams();
        try {
          const res = await fetch("/api/active-game");
          const data = await res.json();
          setActiveGame(data.activeGame);
        } catch (e) {
          console.error("Failed to poll active game:", e);
        }
      }, 5000);
    }

    return () => {
      if (interval) window.clearInterval(interval);
    };
  }, [screen]);

  // Dynamic team CRUD actions
  async function handleCreateTeam() {
    const name = newTeamName.trim();
    if (!name) return;

    try {
      const parsedSpreadsheetId = parseSpreadsheetId(spreadsheetUrl);
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          spreadsheetId: parsedSpreadsheetId || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to create team.");
        return;
      }

      setNewTeamName("");
      await fetchTeams();
    } catch (e) {
      console.error(e);
      alert("Error creating team.");
    }
  }

  async function handleRenameTeam(teamId: string) {
    const name = editingTeamName.trim();
    if (!name) return;

    try {
      const parsedSpreadsheetId = parseSpreadsheetId(spreadsheetUrl);
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId,
          name,
          spreadsheetId: parsedSpreadsheetId || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to rename team.");
        return;
      }

      setEditingTeamId(null);
      setEditingTeamName("");
      await fetchTeams();
    } catch (e) {
      console.error(e);
      alert("Error renaming team.");
    }
  }

  async function handleDeleteTeam(teamId: string) {
    if (!window.confirm("Are you sure you want to delete this team? All assigned players will lose their team labels.")) {
      return;
    }

    try {
      const parsedSpreadsheetId = parseSpreadsheetId(spreadsheetUrl);
      const url = `/api/teams?teamId=${teamId}${parsedSpreadsheetId ? `&spreadsheetId=${parsedSpreadsheetId}` : ""}`;
      const res = await fetch(url, { method: "DELETE" });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to delete team.");
        return;
      }

      setPlayerAssignments((current) => {
        const updated = { ...current };
        Object.keys(updated).forEach((p) => {
          if (updated[p] === teamId) {
            updated[p] = null;
          }
        });
        return updated;
      });

      await fetchTeams();
    } catch (e) {
      console.error(e);
      alert("Error deleting team.");
    }
  }

  const allSetupPlayers = useMemo(
    () => Object.keys(playerAssignments).sort((a, b) => a.localeCompare(b)),
    [playerAssignments],
  );

  const teamSelections = useMemo(() => {
    const map: Record<string, string[]> = {};
    teamsList.forEach((t) => {
      map[t.teamId] = [];
    });
    allSetupPlayers.forEach((player) => {
      const assignedTeam = playerAssignments[player];
      if (assignedTeam && map[assignedTeam] !== undefined) {
        map[assignedTeam].push(player);
      }
    });
    return map;
  }, [allSetupPlayers, playerAssignments, teamsList]);

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
      home: teamPlayers[matchup.home] || [],
      away: teamPlayers[matchup.away] || [],
    }),
    [matchup, teamPlayers],
  );

  const bestPlayerToday = useMemo(() => {
    const activeTeamsMap: Record<string, ActivePlayer[]> = {};
    teamsList.forEach((t) => {
      activeTeamsMap[t.teamId] = matchup.home === t.teamId || matchup.away === t.teamId ? teamPlayers[t.teamId] || [] : [];
    });
    return getBestPlayer(activeTeamsMap);
  }, [matchup, teamPlayers, teamsList]);

  const dashboardPlayers = useMemo(() => {
    const totals = new Map<
      string,
      { name: string; team: string; points: number; games: number; bestPlayerWins: number; topPercentage: number; counts: Record<StatType, number> }
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
          counts: emptyCounts(),
        };

        current.points += playerPoints(player.counts);
        current.games += 1;

        STAT_TYPES.forEach((type) => {
          current.counts[type] += player.counts[type];
        });

        if (game.bestPlayer.name === player.name) {
          current.bestPlayerWins += 1;
          current.topPercentage = Math.max(current.topPercentage, game.bestPlayer.percentage);
        }

        totals.set(player.name, current);
      }
    }

    return [...totals.values()].sort((a, b) => {
      if (dashboardSortCategory === "points") {
        return b.points - a.points;
      }
      return b.counts[dashboardSortCategory] - a.counts[dashboardSortCategory];
    });
  }, [completedGames, dashboardSortCategory]);

  function assignPlayer(name: string, team: string | null) {
    setPlayerAssignments((current) => ({
      ...current,
      [name]: team,
    }));
  }

  // Add a player using POST /api/players
  async function quickAddPlayer() {
    const normalized = quickAddName.trim();
    if (!normalized) {
      return;
    }

    try {
      const parsedSpreadsheetId = parseSpreadsheetId(spreadsheetUrl);
      const res = await fetch("/api/players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: normalized,
          spreadsheetId: parsedSpreadsheetId || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to add player.");
        return;
      }

      await fetchPlayers();
      setQuickAddName("");
    } catch (e) {
      console.error(e);
      alert("Error adding player.");
    }
  }

  // Trigger manual sheets sync
  async function handleImportSync() {
    const parsedSpreadsheetId = parseSpreadsheetId(spreadsheetUrl);
    if (!parsedSpreadsheetId) {
      alert("Please enter a Google Spreadsheet URL or ID first.");
      return;
    }

    setIsSyncing(true);
    setSyncMessage("");

    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spreadsheetId: parsedSpreadsheetId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to sync spreadsheet.");
      }

      setSyncMessage(data.message || "Spreadsheet synced successfully!");
      await fetchPlayers();
      await fetchTeams();
      await fetchGames();
    } catch (error: any) {
      alert(error?.message || "Failed to sync spreadsheet.");
    } finally {
      setIsSyncing(false);
    }
  }

  // Active game sync
  async function syncActiveGame(
    activeMatchup: { home: string; away: string },
    activeDate: string,
    activeTimer: number,
    activeRunning: boolean,
    activeTeams: Record<string, ActivePlayer[]>,
    activeLogs: LogEntry[],
  ) {
    const payload = {
      matchup: activeMatchup,
      date: activeDate,
      timerSeconds: activeTimer,
      timerRunning: activeRunning,
      teamPlayers: activeTeams,
      logEntries: activeLogs,
      lastUpdated: new Date().toISOString(),
    };

    setActiveGame(payload);

    try {
      await fetch("/api/active-game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (e) {
      console.error("Failed to sync active game state:", e);
    }
  }

  function startMockGame() {
    const nextTeamPlayers = createEmptyTeamPlayersMap(teamsList);
    for (const key of matchupTeams) {
      nextTeamPlayers[key] = (teamSelections[key] || []).map((name) => createPlayer(name, key));
    }
    setTeamPlayers(nextTeamPlayers);
    setLogEntries([]);
    setTimerSeconds(0);
    setTimerRunning(true);
    setScreen("live");

    syncActiveGame(matchup, date, 0, true, nextTeamPlayers, []);
  }

  function adjustPending(playerName: string, statType: StatType, delta: number, currentVal: number) {
    setPendingChanges((current) => {
      const playerPending = { ...(current[playerName] || {}) };
      const currentPending = playerPending[statType] || 0;
      const nextPending = currentPending + delta;

      if (currentVal + nextPending < 0) {
        return current;
      }

      playerPending[statType] = nextPending;

      return {
        ...current,
        [playerName]: playerPending,
      };
    });
  }

  function cancelPending(playerName: string) {
    setPendingChanges((current) => {
      const updated = { ...current };
      delete updated[playerName];
      return updated;
    });
  }

  function commitPending(playerName: string, team: string) {
    const playerPending = pendingChanges[playerName];
    if (!playerPending) return;

    const nextTeamPlayers = {
      ...teamPlayers,
      [team]: teamPlayers[team].map((player) => {
        if (player.name !== playerName) return player;

        const nextCounts = { ...player.counts };
        STAT_TYPES.forEach((type) => {
          const delta = playerPending[type] || 0;
          nextCounts[type] = Math.max(nextCounts[type] + delta, 0);
        });

        return { ...player, counts: nextCounts };
      }),
    };

    let nextLogs = [...logEntries];
    STAT_TYPES.forEach((statType) => {
      const delta = playerPending[statType] || 0;
      if (delta > 0) {
        for (let i = 0; i < delta; i++) {
          nextLogs.unshift({
            id: Date.now() + i,
            playerName,
            team,
            statType,
            timestampLabel: formatTime(timerSeconds),
          });
        }
      } else if (delta < 0) {
        const removeCount = Math.abs(delta);
        let removed = 0;
        nextLogs = nextLogs.filter((entry) => {
          if (entry.playerName === playerName && entry.statType === statType && removed < removeCount) {
            removed++;
            return false;
          }
          return true;
        });
      }
    });

    setTeamPlayers(nextTeamPlayers);
    setLogEntries(nextLogs);

    syncActiveGame(matchup, date, timerSeconds, timerRunning, nextTeamPlayers, nextLogs);
    cancelPending(playerName);
  }

  function undoLastEntry() {
    setLogEntries((current) => {
      const [lastEntry, ...remaining] = current;
      if (!lastEntry) {
        return current;
      }

      const nextTeamPlayers = {
        ...teamPlayers,
        [lastEntry.team]: teamPlayers[lastEntry.team].map((player) =>
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
      };

      setTeamPlayers(nextTeamPlayers);
      syncActiveGame(matchup, date, timerSeconds, timerRunning, nextTeamPlayers, remaining);
      return remaining;
    });
  }

  function removeLogEntry(id: number) {
    const targetEntry = logEntries.find((entry) => entry.id === id);
    if (!targetEntry) {
      return;
    }

    const nextTeamPlayers = {
      ...teamPlayers,
      [targetEntry.team]: teamPlayers[targetEntry.team].map((player) =>
        player.name === targetEntry.playerName
          ? {
              ...player,
              counts: {
                ...player.counts,
                [targetEntry.statType]: Math.max(player.counts[targetEntry.statType] - 1, 0),
              },
            }
          : player,
      ),
    };

    const nextLogs = logEntries.filter((entry) => entry.id !== id);

    setTeamPlayers(nextTeamPlayers);
    setLogEntries(nextLogs);

    syncActiveGame(matchup, date, timerSeconds, timerRunning, nextTeamPlayers, nextLogs);
  }

  function endGame() {
    setTimerRunning(false);
    setScreen("summary");
    syncActiveGame(matchup, date, timerSeconds, false, teamPlayers, logEntries);
  }

  // Save the game and stats to the backend database & Google Sheet sync
  async function saveGame() {
    setIsSaving(true);
    setSaveError("");

    const parsedSpreadsheetId = parseSpreadsheetId(spreadsheetUrl);

    try {
      // 1. Create game record
      const gameRes = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          opponent: `${getTeamLabel(matchup.home)} vs ${getTeamLabel(matchup.away)}`,
          location: JSON.stringify({
            timerSeconds,
            endedAt: formatClockTime(new Date()),
            teamPlayers,
          }),
          spreadsheetId: parsedSpreadsheetId || undefined,
        }),
      });

      const gameData = await gameRes.json();
      if (!gameRes.ok) {
        throw new Error(gameData.error || "Failed to save game record.");
      }

      const gameId = gameData.game.gameId;

      // 2. Upload stats log in bulk
      const statsToUpload = logEntries.map((entry) => ({
        gameId,
        playerName: entry.playerName,
        statType: entry.statType,
        timestamp: new Date(entry.id).toISOString(),
      }));

      if (statsToUpload.length > 0) {
        const statsRes = await fetch("/api/stats", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stats: statsToUpload,
            spreadsheetId: parsedSpreadsheetId || undefined,
          }),
        });

        if (!statsRes.ok) {
          const statsData = await statsRes.json();
          throw new Error(statsData.error || "Failed to upload stats logs.");
        }
      }

      // 3. Sync player teams dynamically to sheets in background
      if (parsedSpreadsheetId && config.isGoogleSheetsSupported) {
        const activePlayers = flattenPlayers(teamPlayers);
        for (const player of activePlayers) {
          await fetch("/api/players", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: player.name,
              spreadsheetId: parsedSpreadsheetId,
            }),
          });
        }
      }

      await fetch("/api/active-game", { method: "DELETE" });
      setActiveGame(null);

      setTeamPlayers({});
      setLogEntries([]);
      setTimerSeconds(0);

      await fetchPlayers();
      await fetchGames();
      setScreen("dashboard");
    } catch (err: any) {
      console.error(err);
      setSaveError(err?.message || "Failed to save game.");
    } finally {
      setIsSaving(false);
    }
  }

  function renderPlayerCards(players: ActivePlayer[], team: string, label: string) {
    return (
      <section className="space-y-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{label}</h3>
            <p className="text-sm text-slate-500">{players.length} active players</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600 truncate max-w-[150px]" title={label}>
            {label}
          </span>
        </div>

        {players.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
            No players assigned.
          </div>
        ) : (
          players.map((player) => {
            const playerPending = pendingChanges[player.name] || {};
            const hasPending = STAT_TYPES.some((type) => (playerPending[type] || 0) !== 0);

            return (
              <article key={player.name} className="rounded-2xl border border-slate-200 p-4 bg-slate-50/30">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h4 className="text-lg font-semibold text-slate-900">{player.name}</h4>
                    <p className="text-xs text-slate-500">Total actions: {totalCounts(player.counts)}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
                    {playerPoints(player.counts)} pts
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {STAT_TYPES.map((statType) => {
                    const delta = playerPending[statType] || 0;
                    return (
                      <div
                        key={statType}
                        className="flex items-center justify-between rounded-2xl bg-slate-900 p-3 text-white"
                      >
                        <div className="flex flex-col">
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider">{statType}</span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-xl font-bold">{player.counts[statType]}</span>
                            {delta !== 0 && (
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                  delta > 0 ? "text-emerald-400 bg-emerald-950" : "text-rose-400 bg-rose-950"
                                }`}
                              >
                                {delta > 0 ? `+${delta}` : delta}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => adjustPending(player.name, statType, -1, player.counts[statType])}
                            className="h-8 w-8 rounded-lg bg-slate-800 flex items-center justify-center font-bold text-base hover:bg-slate-700 transition cursor-pointer select-none"
                          >
                            -
                          </button>
                          <button
                            type="button"
                            onClick={() => adjustPending(player.name, statType, 1, player.counts[statType])}
                            className="h-8 w-8 rounded-lg bg-slate-800 flex items-center justify-center font-bold text-base hover:bg-slate-700 transition cursor-pointer select-none"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {hasPending && (
                  <div className="mt-3 flex gap-2 border-t border-slate-200/60 pt-3 animate-in fade-in slide-in-from-top-1 duration-150">
                    <button
                      type="button"
                      onClick={() => cancelPending(player.name)}
                      className="flex-1 rounded-xl bg-slate-100 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-200 transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => commitPending(player.name, team)}
                      className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 transition cursor-pointer shadow-sm"
                    >
                      Confirm
                    </button>
                  </div>
                )}
              </article>
            );
          })
        )}
      </section>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 sm:px-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="rounded-3xl bg-slate-900 px-6 py-6 text-white shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-300">
                Ultimate Frisbee Stat Tracker
              </p>
              <h1 className="mt-2 text-3xl font-semibold">MFULTISCORE</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-300">
                Clean scorekeeping flow: assign players to dynamic custom teams, track stats live, review the game,
                and keep saved results on the dashboard.
              </p>
            </div>

            <nav className="grid grid-cols-2 gap-2 sm:flex">
              {([
                ["setup", "Setup"],
                ["live", "Live Game"],
                ["summary", "Summary"],
                ["dashboard", "Dashboard"],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setScreen(value as Screen)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition cursor-pointer ${
                    screen === value
                      ? "bg-white text-slate-900"
                      : "bg-slate-800 text-slate-200 hover:bg-slate-700"
                  }`}
                >
                  {label}
                </button>
              ))}
            </nav>
          </div>
        </header>

        {screen === "setup" && (
          <section className="grid gap-4 xl:grid-cols-[1.1fr_1.6fr]">
            <div className="space-y-4">
              {/* Session Recovery Widget */}
              {activeGame && (
                <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between animate-pulse-subtle">
                  <div>
                    <h3 className="text-sm font-semibold text-amber-950 flex items-center gap-1.5">
                      <span>⚠️</span> Active Session In Progress
                    </h3>
                    <p className="mt-1 text-xs text-amber-800">
                      A live match scoring session is currently in progress:{" "}
                      <strong>
                        {getTeamLabel(activeGame.matchup.home)} vs {getTeamLabel(activeGame.matchup.away)}
                      </strong>.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setMatchup(activeGame.matchup);
                      setDate(activeGame.date);
                      setTimerSeconds(activeGame.timerSeconds);
                      setTimerRunning(activeGame.timerRunning);
                      setTeamPlayers(activeGame.teamPlayers);
                      setLogEntries(activeGame.logEntries);
                      setScreen("live");
                    }}
                    className="rounded-2xl bg-amber-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-amber-700 transition cursor-pointer self-start sm:self-center shadow-sm"
                  >
                    Resume Live Scoring
                  </button>
                </div>
              )}

              {/* Dynamic Teams CRUD card */}
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                    <span>🛡️</span> Manage Teams
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Create dynamic teams, rename them, or delete them.
                  </p>
                </div>

                <div className="flex gap-2">
                  <input
                    value={newTeamName}
                    onChange={(event) => setNewTeamName(event.target.value)}
                    placeholder="New Team Name"
                    className="flex-1 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-slate-400"
                  />
                  <button
                    type="button"
                    onClick={handleCreateTeam}
                    className="rounded-2xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white cursor-pointer transition hover:bg-slate-800"
                  >
                    Create Team
                  </button>
                </div>

                <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto pr-1">
                  {teamsList.map((team) => (
                    <div key={team.teamId} className="py-2.5 flex items-center justify-between gap-2 text-sm">
                      {editingTeamId === team.teamId ? (
                        <div className="flex-1 flex gap-2">
                          <input
                            value={editingTeamName}
                            onChange={(event) => setEditingTeamName(event.target.value)}
                            className="flex-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs outline-none focus:border-slate-400"
                          />
                          <button
                            type="button"
                            onClick={() => handleRenameTeam(team.teamId)}
                            className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white cursor-pointer"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingTeamId(null);
                              setEditingTeamName("");
                            }}
                            className="rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="font-medium text-slate-800">{team.name}</span>
                          <div className="flex gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingTeamId(team.teamId);
                                setEditingTeamName(team.name);
                              }}
                              className="rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 transition cursor-pointer"
                            >
                              Rename
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteTeam(team.teamId)}
                              className="rounded-xl bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-100 transition cursor-pointer"
                            >
                              Delete
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                  {teamsList.length === 0 && (
                    <p className="text-xs text-slate-400 py-2.5">No teams created yet.</p>
                  )}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-slate-500">Step 1</p>
                <h2 className="mt-1 text-2xl font-semibold text-slate-900">Prepare the game</h2>
                <p className="mt-2 text-sm text-slate-600">
                  Add players, then choose whether each player belongs to one of your custom teams, or no team yet.
                </p>
              </div>

              {/* Google Sheets Card */}
              {config.isGoogleSheetsSupported ? (
                <div className="rounded-3xl border border-blue-200 bg-blue-50/50 p-5 shadow-sm space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-blue-950 flex items-center gap-2">
                      <span>📊</span> Google Sheets Integration
                    </h3>
                    <p className="mt-1 text-xs text-slate-600">
                      Sync game records, players, and custom teams to Google Sheets. Share your sheet with this Service Account email:
                    </p>
                  </div>

                  <div className="flex items-center gap-2 rounded-2xl bg-white border border-blue-100 p-3 text-xs font-mono text-slate-800 break-all">
                    <span className="flex-1 select-all">{config.serviceAccountEmail}</span>
                    <button
                      type="button"
                      onClick={() => {
                        if (config.serviceAccountEmail) {
                          navigator.clipboard.writeText(config.serviceAccountEmail);
                          alert("Service Account Email copied!");
                        }
                      }}
                      className="rounded-lg bg-blue-100 px-2.5 py-1.5 font-sans font-medium text-blue-700 hover:bg-blue-200 transition cursor-pointer"
                    >
                      Copy
                    </button>
                  </div>

                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">Google Spreadsheet URL or ID</span>
                    <input
                      type="text"
                      value={spreadsheetUrl}
                      onChange={(event) => setSpreadsheetUrl(event.target.value)}
                      placeholder="https://docs.google.com/spreadsheets/d/.../edit"
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400"
                    />
                  </label>

                  {spreadsheetUrl && (
                    <div className="flex flex-wrap gap-2 pt-2">
                      <button
                        type="button"
                        onClick={handleImportSync}
                        disabled={isSyncing}
                        className="rounded-2xl border border-blue-200 bg-white px-4 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-50 disabled:opacity-50 cursor-pointer"
                      >
                        {isSyncing ? "Syncing..." : "🔄 Import/Sync from Sheet"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const id = parseSpreadsheetId(spreadsheetUrl);
                          if (id) {
                            alert(`Parsed Spreadsheet ID: ${id}`);
                          } else {
                            alert("Invalid Spreadsheet URL.");
                          }
                        }}
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 cursor-pointer"
                      >
                        🔍 Test Parse ID
                      </button>
                    </div>
                  )}

                  {syncMessage && (
                    <p className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl p-2">
                      {syncMessage}
                    </p>
                  )}
                </div>
              ) : (
                <div className="rounded-3xl border border-slate-200 bg-slate-100/50 p-5 shadow-sm">
                  <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                    <span>💡</span> Local-Only Storage
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Google Sheets sync is disabled (no credentials configured on server). Game records will be stored locally.
                  </p>
                </div>
              )}

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
                      className="rounded-2xl bg-slate-900 px-4 py-3 font-medium text-white cursor-pointer"
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
                        const nextHome = event.target.value;
                        setMatchup((current) => ({
                          home: nextHome,
                          away: current.away === nextHome ? (teamsList.find((t) => t.teamId !== nextHome)?.teamId || "") : current.away,
                        }));
                      }}
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-slate-400 text-sm font-medium text-slate-700"
                    >
                      {teamsList.map((t) => (
                        <option key={t.teamId} value={t.teamId}>
                          {t.name}
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
                        const nextAway = event.target.value;
                        setMatchup((current) => ({
                          home: current.home === nextAway ? (teamsList.find((t) => t.teamId !== nextAway)?.teamId || "") : current.home,
                          away: nextAway,
                        }));
                      }}
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-slate-400 text-sm font-medium text-slate-700"
                    >
                      {teamsList.map((t) => (
                        <option key={t.teamId} value={t.teamId}>
                          {t.name}
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

              {/* Dynamic indicators list of counts */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6">
                <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-sm text-slate-500">No team</p>
                  <p className="mt-2 text-2xl font-semibold">{unassignedPlayers.length}</p>
                </div>
                {teamsList.map((team) => (
                  <div
                    key={team.teamId}
                    className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <p className="text-sm text-slate-500 truncate" title={team.name}>
                      {team.name}
                    </p>
                    <p className="mt-2 text-2xl font-semibold">
                      {teamSelections[team.teamId]?.length || 0}
                    </p>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={startMockGame}
                disabled={matchup.home === matchup.away || teamsList.length < 2}
                className="w-full rounded-3xl bg-slate-900 px-5 py-4 text-lg font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:bg-slate-300 cursor-pointer"
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
                            : `Assigned to ${getTeamLabel(assignment)}`}
                        </p>
                      </div>

                      <label className="w-full md:w-48">
                        <span className="sr-only">Assign team for {player}</span>
                        <select
                          value={assignment ?? ""}
                          onChange={(event) => {
                            const value = event.target.value;
                            assignPlayer(
                              player,
                              value === "" ? null : value,
                            );
                          }}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-slate-400"
                        >
                          <option value="">No team</option>
                          {teamsList.map((t) => (
                            <option key={t.teamId} value={t.teamId}>
                              {t.name}
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
                </div>

                <div className="flex flex-wrap gap-2">
                  <div className="rounded-2xl border border-slate-200 px-4 py-3 text-center">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Timer</p>
                    <p className="text-2xl font-semibold text-slate-900">{formatTime(timerSeconds)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const nextRunning = !timerRunning;
                      setTimerRunning(nextRunning);
                      syncActiveGame(matchup, date, timerSeconds, nextRunning, teamPlayers, logEntries);
                    }}
                    className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white cursor-pointer"
                  >
                    {timerRunning ? "Pause" : "Resume"}
                  </button>
                  <button
                    type="button"
                    onClick={undoLastEntry}
                    className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-medium text-slate-900 cursor-pointer"
                  >
                    Undo last
                  </button>
                  <button
                    type="button"
                    onClick={endGame}
                    className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-medium text-white cursor-pointer"
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
                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col max-h-[500px]">
                  <h3 className="text-lg font-semibold text-slate-900">Recent activity</h3>
                  <div className="mt-3 space-y-2 overflow-y-auto pr-1 flex-1">
                    {logEntries.length === 0 ? (
                      <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                        No actions yet. Tap a stat button to start logging.
                      </div>
                    ) : (
                      logEntries.map((entry) => (
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
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-medium text-slate-400">{entry.timestampLabel}</span>
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`Revert ${entry.statType} for ${entry.playerName}?`)) {
                                  removeLogEntry(entry.id);
                                }
                              }}
                              className="rounded-lg bg-red-50 px-2 py-1 text-xs font-bold text-red-600 hover:bg-red-100 transition cursor-pointer"
                              title="Delete/Revert Stat"
                            >
                              Revert
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </section>

                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="text-lg font-semibold text-slate-900">Best player today</h3>
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
                <p className="mt-2 text-2xl font-semibold text-slate-900">{formatTime(timerSeconds)}</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-sm text-slate-500">Best player</p>
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

            {saveError && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {saveError}
              </div>
            )}

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                disabled={isSaving}
                onClick={() => {
                  setTimerRunning(true);
                  setScreen("live");
                }}
                className="rounded-2xl bg-slate-100 px-5 py-3 font-medium text-slate-900 cursor-pointer disabled:opacity-50"
              >
                Back to live game
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={saveGame}
                className="rounded-2xl bg-slate-900 px-5 py-3 font-medium text-white cursor-pointer disabled:bg-slate-400"
              >
                {isSaving ? "Saving..." : "Save to dashboard"}
              </button>
            </div>
          </section>
        )}

        {screen === "dashboard" && (
          <section className="space-y-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">Dashboard</p>
                  <h2 className="mt-1 text-2xl font-semibold text-slate-900">Saved game results</h2>
                  <p className="mt-2 text-sm text-slate-600">
                    View player totals and every saved game in one clean overview.
                  </p>
                </div>
              </div>
            </div>

            {/* Live Match Spectator Card */}
            {activeGame && (
              <div className="rounded-3xl border border-red-200 bg-red-50/40 p-5 shadow-sm space-y-4 animate-pulse-subtle">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-red-600 animate-ping"></span>
                    <span className="text-xs font-bold uppercase tracking-wider text-red-700">Live Match Tracker</span>
                  </span>
                  <span className="text-xs font-mono font-bold text-red-700 bg-white border border-red-100 rounded-full px-2.5 py-1">
                    LIVE · {formatTime(activeGame.timerSeconds)}
                  </span>
                </div>

                {/* Live Scoreboard */}
                <div className="flex items-center justify-around py-4 bg-slate-900 text-white rounded-2xl shadow-inner text-center">
                  <div className="flex-1">
                    <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold">{getTeamLabel(activeGame.matchup.home)}</p>
                    <p className="text-4xl font-extrabold mt-1">
                      {activeGame.teamPlayers[activeGame.matchup.home]?.reduce((sum: number, p: any) => sum + (p.counts.Score || 0) + (p.counts.Callahan || 0), 0) || 0}
                    </p>
                  </div>
                  <div className="text-2xl font-bold text-slate-500 px-4">VS</div>
                  <div className="flex-1">
                    <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold">{getTeamLabel(activeGame.matchup.away)}</p>
                    <p className="text-4xl font-extrabold mt-1">
                      {activeGame.teamPlayers[activeGame.matchup.away]?.reduce((sum: number, p: any) => sum + (p.counts.Score || 0) + (p.counts.Callahan || 0), 0) || 0}
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl bg-white border border-red-100 p-4 space-y-3 shadow-sm">
                    <h4 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center justify-between">
                      <span>{getTeamLabel(activeGame.matchup.home)}</span>
                    </h4>
                    <div className="space-y-1">
                      {flattenPlayers(activeGame.teamPlayers)
                        .filter((p) => p.team === activeGame.matchup.home)
                        .map((player) => (
                          <div key={player.name} className="flex justify-between text-xs text-slate-600">
                            <span>{player.name}</span>
                            <span className="font-semibold text-slate-800">{playerPoints(player.counts)} pts</span>
                          </div>
                        ))}
                      {flattenPlayers(activeGame.teamPlayers).filter((p) => p.team === activeGame.matchup.home).length === 0 && (
                        <p className="text-xs text-slate-400 italic">No players assigned</p>
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-white border border-red-100 p-4 space-y-3 shadow-sm">
                    <h4 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center justify-between">
                      <span>{getTeamLabel(activeGame.matchup.away)}</span>
                    </h4>
                    <div className="space-y-1">
                      {flattenPlayers(activeGame.teamPlayers)
                        .filter((p) => p.team === activeGame.matchup.away)
                        .map((player) => (
                          <div key={player.name} className="flex justify-between text-xs text-slate-600">
                            <span>{player.name}</span>
                            <span className="font-semibold text-slate-800">{playerPoints(player.counts)} pts</span>
                          </div>
                        ))}
                      {flattenPlayers(activeGame.teamPlayers).filter((p) => p.team === activeGame.matchup.away).length === 0 && (
                        <p className="text-xs text-slate-400 italic">No players assigned</p>
                      )}
                    </div>
                  </div>
                </div>

                {activeGame.logEntries && activeGame.logEntries.length > 0 && (
                  <div className="rounded-2xl bg-white/60 p-3 border border-red-100 text-xs">
                    <p className="font-bold text-red-950 mb-1">Recent Live Actions</p>
                    <div className="divide-y divide-red-100/30">
                      {activeGame.logEntries.slice(0, 3).map((log: any) => (
                        <div key={log.id} className="py-1.5 flex justify-between text-slate-700">
                          <span>
                            <strong>{log.playerName}</strong> ({getTeamLabel(log.team)}) logged a{" "}
                            <span className="font-semibold text-red-800">{log.statType}</span>
                          </span>
                          <span className="font-mono text-slate-400">{log.timestampLabel}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {completedGames.length === 0 ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">
                <span className="text-3xl">📭</span>
                <h3 className="mt-3 text-lg font-semibold text-slate-900">No saved games yet</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Go to Setup to configure team lists and start scoring a live game.
                </p>
              </div>
            ) : (
              <>
                {/* Leaderboard Sorting Category Options */}
                <div className="flex flex-wrap gap-2 mb-4 bg-slate-200/50 p-1.5 rounded-2xl w-fit">
                  {(["points", ...STAT_TYPES] as const).map((category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => setDashboardSortCategory(category)}
                      className={`rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wider transition cursor-pointer ${
                        dashboardSortCategory === category
                          ? "bg-slate-900 text-white shadow-sm"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                      }`}
                    >
                      {category === "points" ? "Points Leaders" : `${category}s`}
                    </button>
                  ))}
                </div>

                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {dashboardPlayers.map((player, index) => {
                    const isTop =
                      index === 0 &&
                      (dashboardSortCategory === "points"
                        ? player.points > 0
                        : player.counts[dashboardSortCategory] > 0);

                    return (
                      <div
                        key={player.name}
                        className={`rounded-3xl border p-5 shadow-sm relative transition hover:border-slate-350 hover:shadow-md ${
                          isTop
                            ? "bg-amber-50/40 border-amber-300 ring-1 ring-amber-200"
                            : "bg-white border-slate-200"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="text-lg font-bold text-slate-900">{player.name}</h3>
                            <p className="text-sm text-slate-500">{getTeamLabel(player.team)}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1.5 font-sans">
                            {isTop && (
                              <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700 bg-amber-100 border border-amber-200 rounded-full px-2.5 py-0.5 select-none">
                                🏆 Leader
                              </span>
                            )}
                            <span
                              className={`rounded-full px-3 py-1 text-sm font-bold ${
                                isTop ? "bg-amber-200 text-amber-900" : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {dashboardSortCategory === "points"
                                ? `${player.points} pts`
                                : `${player.counts[dashboardSortCategory]} ${dashboardSortCategory.toLowerCase()}s`}
                            </span>
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-4 gap-1 text-center text-[10px] sm:text-xs">
                          <div className="rounded-xl bg-slate-50 p-2 border border-slate-100/50">
                            <p className="text-slate-400 font-medium">Points</p>
                            <p className="mt-0.5 font-bold text-slate-800">{player.points}</p>
                          </div>
                          <div className="rounded-xl bg-slate-50 p-2 border border-slate-100/50">
                            <p className="text-slate-400 font-medium">Scores</p>
                            <p className="mt-0.5 font-semibold text-slate-700">{player.counts.Score}</p>
                          </div>
                          <div className="rounded-xl bg-slate-50 p-2 border border-slate-100/50">
                            <p className="text-slate-400 font-medium">Assists</p>
                            <p className="mt-0.5 font-semibold text-slate-700">{player.counts.Assist}</p>
                          </div>
                          <div className="rounded-xl bg-slate-50 p-2 border border-slate-100/50">
                            <p className="text-slate-400 font-medium">Blocks</p>
                            <p className="mt-0.5 font-semibold text-slate-700">{player.counts.Block}</p>
                          </div>
                        </div>

                        <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between text-[11px] text-slate-400">
                          <span>Matches: <strong>{player.games}</strong></span>
                          <span>M.V.P: <strong>{player.bestPlayerWins}x</strong></span>
                        </div>
                      </div>
                    );
                  })}
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
                          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Best player</p>
                          <p className="mt-1 font-medium text-slate-900 text-slate-950">
                            <strong>{game.bestPlayer.name}</strong> ({game.bestPlayer.percentage}%) · {getTeamLabel(game.bestPlayer.team)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
