"use client";

import { useMemo, useState } from "react";
import { STAT_TYPES, StatType } from "@/types/stats";

type Screen = "setup" | "live" | "summary" | "dashboard" | "profile";

type ActivePlayer = {
  name: string;
  counts: Record<StatType, number>;
};

type LogEntry = {
  id: number;
  playerName: string;
  statType: StatType;
  timestampLabel: string;
};

const mockPlayers = [
  "Ava",
  "Mia",
  "Noah",
  "Kai",
  "Liam",
  "Zoe",
  "Eli",
  "Jade",
];

const mockCareerTotals = [
  { name: "Ava", total: 31, trend: "up", avg: "3.7/game" },
  { name: "Mia", total: 24, trend: "flat", avg: "2.8/game" },
  { name: "Noah", total: 28, trend: "up", avg: "3.2/game" },
  { name: "Kai", total: 18, trend: "down", avg: "2.0/game" },
];

const mockHistory = [
  { game: "vs Hawks", date: "2026-06-07", score: 2, assist: 1, block: 1, callahan: 0 },
  { game: "vs Comets", date: "2026-06-14", score: 1, assist: 2, block: 0, callahan: 0 },
  { game: "vs Drift", date: "2026-06-21", score: 3, assist: 1, block: 1, callahan: 0 },
  { game: "vs Orbit", date: "2026-06-28", score: 2, assist: 2, block: 0, callahan: 1 },
];

function emptyCounts(): Record<StatType, number> {
  return {
    Block: 0,
    Assist: 0,
    Score: 0,
    Callahan: 0,
  };
}

function totalCounts(counts: Record<StatType, number>) {
  return STAT_TYPES.reduce((sum, statType) => sum + counts[statType], 0);
}

function formatTime(index: number) {
  const minute = 12 + Math.floor(index / 4);
  const second = (index * 11) % 60;
  return `${String(minute).padStart(2, "0")}:${String(second).padStart(2, "0")}`;
}

export default function Home() {
  const [screen, setScreen] = useState<Screen>("setup");
  const [opponent, setOpponent] = useState("Skyline");
  const [date, setDate] = useState("2026-07-02");
  const [location, setLocation] = useState("Field 2");
  const [quickAddName, setQuickAddName] = useState("");
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([
    "Ava",
    "Mia",
    "Noah",
    "Kai",
    "Zoe",
  ]);
  const [activePlayers, setActivePlayers] = useState<ActivePlayer[]>([
    { name: "Ava", counts: { Block: 1, Assist: 1, Score: 2, Callahan: 0 } },
    { name: "Mia", counts: { Block: 0, Assist: 2, Score: 1, Callahan: 0 } },
    { name: "Noah", counts: { Block: 2, Assist: 0, Score: 1, Callahan: 0 } },
    { name: "Kai", counts: { Block: 0, Assist: 1, Score: 0, Callahan: 0 } },
    { name: "Zoe", counts: { Block: 1, Assist: 0, Score: 1, Callahan: 1 } },
  ]);
  const [logEntries, setLogEntries] = useState<LogEntry[]>([
    { id: 1, playerName: "Ava", statType: "Score", timestampLabel: "12:44" },
    { id: 2, playerName: "Noah", statType: "Block", timestampLabel: "13:06" },
    { id: 3, playerName: "Zoe", statType: "Callahan", timestampLabel: "13:17" },
  ]);

  const totalActions = useMemo(
    () => activePlayers.reduce((sum, player) => sum + totalCounts(player.counts), 0),
    [activePlayers],
  );

  function togglePlayer(name: string) {
    setSelectedPlayers((current) =>
      current.includes(name)
        ? current.filter((player) => player !== name)
        : [...current, name],
    );
  }

  function quickAddPlayer() {
    const normalized = quickAddName.trim();
    if (!normalized) {
      return;
    }

    if (!selectedPlayers.includes(normalized)) {
      setSelectedPlayers((current) => [...current, normalized]);
    }

    setQuickAddName("");
  }

  function startMockGame() {
    setActivePlayers(selectedPlayers.map((name) => ({ name, counts: emptyCounts() })));
    setLogEntries([]);
    setScreen("live");
  }

  function addStat(playerName: string, statType: StatType) {
    setActivePlayers((current) =>
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
        statType,
        timestampLabel: formatTime(current.length + 1),
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

      setActivePlayers((players) =>
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

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#1d4ed8,_#0f172a_45%)] px-3 py-4 text-white sm:px-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
        <header className="rounded-[28px] border border-white/15 bg-white/10 p-4 shadow-2xl backdrop-blur">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-cyan-200">Ultimate Frisbee Tracker</p>
              <h1 className="text-3xl font-bold tracking-tight">MFULTISCORE UI Preview</h1>
              <p className="mt-1 text-sm text-slate-200">
                Mocked frontend flow so you can see the system before Sheets is connected.
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
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    screen === value
                      ? "bg-cyan-300 text-slate-950"
                      : "bg-white/10 text-white hover:bg-white/20"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </header>

        <div className="grid gap-4 lg:grid-cols-[1.6fr_0.8fr]">
          <section className="rounded-[28px] border border-white/15 bg-slate-950/70 p-4 shadow-2xl">
            {screen === "setup" && (
              <div className="space-y-5">
                <div>
                  <p className="text-sm font-medium text-cyan-200">Step 1</p>
                  <h2 className="text-2xl font-semibold">Set up a new game</h2>
                  <p className="mt-1 text-sm text-slate-300">
                    Choose the matchup, mark active players, and quick-add a new name if
                    someone joins late.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="space-y-2 rounded-2xl bg-white/5 p-3">
                    <span className="text-sm text-slate-300">Date</span>
                    <input
                      type="date"
                      value={date}
                      onChange={(event) => setDate(event.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-3 text-white outline-none"
                    />
                  </label>
                  <label className="space-y-2 rounded-2xl bg-white/5 p-3">
                    <span className="text-sm text-slate-300">Opponent</span>
                    <input
                      value={opponent}
                      onChange={(event) => setOpponent(event.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-3 text-white outline-none"
                    />
                  </label>
                  <label className="space-y-2 rounded-2xl bg-white/5 p-3">
                    <span className="text-sm text-slate-300">Location</span>
                    <input
                      value={location}
                      onChange={(event) => setLocation(event.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-3 text-white outline-none"
                    />
                  </label>
                </div>

                <div className="rounded-3xl bg-white/5 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">Who&apos;s playing?</h3>
                      <p className="text-sm text-slate-300">
                        Tap players to include them in today&apos;s game.
                      </p>
                    </div>
                    <span className="rounded-full bg-cyan-300/20 px-3 py-1 text-sm text-cyan-200">
                      {selectedPlayers.length} active
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {mockPlayers.map((player) => {
                      const selected = selectedPlayers.includes(player);
                      return (
                        <button
                          key={player}
                          type="button"
                          onClick={() => togglePlayer(player)}
                          className={`rounded-2xl border px-4 py-4 text-left text-base font-semibold transition ${
                            selected
                              ? "border-cyan-300 bg-cyan-300 text-slate-950"
                              : "border-white/10 bg-slate-900 text-white hover:bg-slate-800"
                          }`}
                        >
                          {player}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <input
                      value={quickAddName}
                      onChange={(event) => setQuickAddName(event.target.value)}
                      placeholder="Quick-add new player"
                      className="flex-1 rounded-2xl border border-white/10 bg-slate-900 px-4 py-4 text-white outline-none placeholder:text-slate-400"
                    />
                    <button
                      type="button"
                      onClick={quickAddPlayer}
                      className="rounded-2xl bg-emerald-400 px-5 py-4 font-semibold text-slate-950"
                    >
                      Add Player
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={startMockGame}
                  className="w-full rounded-2xl bg-cyan-300 px-5 py-4 text-lg font-bold text-slate-950"
                >
                  Start Live Scoring
                </button>
              </div>
            )}

            {screen === "live" && (
              <div className="space-y-4">
                <div className="flex flex-col gap-3 rounded-3xl bg-white/5 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-cyan-200">
                      {date} vs {opponent}
                    </p>
                    <h2 className="text-2xl font-semibold">Live scoring</h2>
                    <p className="text-sm text-slate-300">{location || "Location not set"}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={undoLastEntry}
                      className="rounded-2xl bg-amber-300 px-4 py-3 text-sm font-bold text-slate-950"
                    >
                      Undo last entry
                    </button>
                    <button
                      type="button"
                      onClick={() => setScreen("summary")}
                      className="rounded-2xl bg-cyan-300 px-4 py-3 text-sm font-bold text-slate-950"
                    >
                      End game
                    </button>
                  </div>
                </div>

                <div className="grid gap-3">
                  {activePlayers.map((player) => (
                    <article
                      key={player.name}
                      className="rounded-[24px] border border-white/10 bg-slate-900/80 p-4"
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <div>
                          <h3 className="text-xl font-semibold">{player.name}</h3>
                          <p className="text-sm text-slate-300">
                            Total actions: {totalCounts(player.counts)}
                          </p>
                        </div>
                        <div className="flex gap-2 text-xs text-slate-300">
                          {STAT_TYPES.map((statType) => (
                            <span
                              key={statType}
                              className="rounded-full bg-white/5 px-2 py-1"
                            >
                              {statType}: {player.counts[statType]}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {STAT_TYPES.map((statType) => (
                          <button
                            key={statType}
                            type="button"
                            onClick={() => addStat(player.name, statType)}
                            className="min-h-20 rounded-3xl bg-cyan-300 px-3 py-4 text-lg font-bold text-slate-950 shadow-lg transition hover:bg-cyan-200"
                          >
                            <span className="block text-base">{statType}</span>
                            <span className="mt-1 block text-2xl">
                              {player.counts[statType]}
                            </span>
                          </button>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}

            {screen === "summary" && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-cyan-200">Step 3</p>
                  <h2 className="text-2xl font-semibold">End game summary</h2>
                  <p className="text-sm text-slate-300">
                    Confirm this game&apos;s totals before saving to Google Sheets.
                  </p>
                </div>

                <div className="overflow-hidden rounded-[24px] border border-white/10">
                  <table className="min-w-full bg-slate-900/80 text-left text-sm">
                    <thead className="bg-white/5 text-slate-300">
                      <tr>
                        <th className="px-4 py-3">Player</th>
                        <th className="px-4 py-3">Block</th>
                        <th className="px-4 py-3">Assist</th>
                        <th className="px-4 py-3">Score</th>
                        <th className="px-4 py-3">Callahan</th>
                        <th className="px-4 py-3">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activePlayers.map((player) => (
                        <tr key={player.name} className="border-t border-white/10">
                          <td className="px-4 py-3 font-semibold">{player.name}</td>
                          <td className="px-4 py-3">{player.counts.Block}</td>
                          <td className="px-4 py-3">{player.counts.Assist}</td>
                          <td className="px-4 py-3">{player.counts.Score}</td>
                          <td className="px-4 py-3">{player.counts.Callahan}</td>
                          <td className="px-4 py-3">{totalCounts(player.counts)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => setScreen("live")}
                    className="rounded-2xl bg-white/10 px-5 py-4 font-semibold"
                  >
                    Back to live scoring
                  </button>
                  <button
                    type="button"
                    onClick={() => setScreen("dashboard")}
                    className="rounded-2xl bg-cyan-300 px-5 py-4 font-bold text-slate-950"
                  >
                    Confirm and save
                  </button>
                </div>
              </div>
            )}

            {screen === "dashboard" && (
              <div className="space-y-5">
                <div>
                  <p className="text-sm font-medium text-cyan-200">Home screen</p>
                  <h2 className="text-2xl font-semibold">Player dashboard</h2>
                  <p className="text-sm text-slate-300">
                    Career totals, recent trends, and quick signals for who is improving.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {mockCareerTotals.map((player) => (
                    <button
                      key={player.name}
                      type="button"
                      onClick={() => setScreen("profile")}
                      className="rounded-[24px] border border-white/10 bg-slate-900/80 p-4 text-left"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-lg font-semibold">{player.name}</h3>
                          <p className="text-sm text-slate-300">Career total: {player.total}</p>
                        </div>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            player.trend === "up"
                              ? "bg-emerald-400 text-slate-950"
                              : player.trend === "down"
                                ? "bg-rose-400 text-slate-950"
                                : "bg-slate-600 text-white"
                          }`}
                        >
                          {player.trend}
                        </span>
                      </div>
                      <div className="mt-4">
                        <div className="mb-2 flex items-end justify-between text-xs text-slate-400">
                          <span>Last 6 games trend</span>
                          <span>{player.avg}</span>
                        </div>
                        <div className="flex h-20 items-end gap-2 rounded-2xl bg-white/5 p-3">
                          {[3, 4, 5, 4, 6, 7].map((height, index) => (
                            <div
                              key={`${player.name}-${index}`}
                              className="flex-1 rounded-t-xl bg-cyan-300"
                              style={{ height: `${height * 10}px` }}
                            />
                          ))}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {screen === "profile" && (
              <div className="space-y-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-cyan-200">Player profile</p>
                    <h2 className="text-2xl font-semibold">Ava</h2>
                    <p className="text-sm text-slate-300">
                      Full game-by-game history with recent performance trend.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setScreen("dashboard")}
                    className="rounded-2xl bg-white/10 px-4 py-3 text-sm font-semibold"
                  >
                    Back to dashboard
                  </button>
                </div>

                <div className="rounded-[24px] border border-white/10 bg-slate-900/80 p-4">
                  <div className="mb-3 flex items-center justify-between text-sm">
                    <span className="text-slate-300">Scoring trend</span>
                    <span className="rounded-full bg-emerald-400 px-3 py-1 font-bold text-slate-950">
                      Improving
                    </span>
                  </div>
                  <div className="flex h-28 items-end gap-3 rounded-2xl bg-white/5 p-4">
                    {[2, 3, 3, 5].map((height, index) => (
                      <div key={index} className="flex flex-1 flex-col items-center gap-2">
                        <div
                          className="w-full rounded-t-2xl bg-cyan-300"
                          style={{ height: `${height * 18}px` }}
                        />
                        <span className="text-xs text-slate-400">G{index + 1}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="overflow-hidden rounded-[24px] border border-white/10">
                  <table className="min-w-full bg-slate-900/80 text-left text-sm">
                    <thead className="bg-white/5 text-slate-300">
                      <tr>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Game</th>
                        <th className="px-4 py-3">Score</th>
                        <th className="px-4 py-3">Assist</th>
                        <th className="px-4 py-3">Block</th>
                        <th className="px-4 py-3">Callahan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mockHistory.map((row) => (
                        <tr key={`${row.date}-${row.game}`} className="border-t border-white/10">
                          <td className="px-4 py-3">{row.date}</td>
                          <td className="px-4 py-3 font-semibold">{row.game}</td>
                          <td className="px-4 py-3">{row.score}</td>
                          <td className="px-4 py-3">{row.assist}</td>
                          <td className="px-4 py-3">{row.block}</td>
                          <td className="px-4 py-3">{row.callahan}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>

          <aside className="space-y-4">
            <section className="rounded-[28px] border border-white/15 bg-slate-950/70 p-4 shadow-2xl">
              <h2 className="text-lg font-semibold">Game snapshot</h2>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-2xl bg-white/5 p-3">
                  <p className="text-slate-400">Opponent</p>
                  <p className="mt-1 text-lg font-semibold">{opponent}</p>
                </div>
                <div className="rounded-2xl bg-white/5 p-3">
                  <p className="text-slate-400">Active players</p>
                  <p className="mt-1 text-lg font-semibold">{selectedPlayers.length}</p>
                </div>
                <div className="rounded-2xl bg-white/5 p-3">
                  <p className="text-slate-400">Logged actions</p>
                  <p className="mt-1 text-lg font-semibold">{totalActions}</p>
                </div>
                <div className="rounded-2xl bg-white/5 p-3">
                  <p className="text-slate-400">Venue</p>
                  <p className="mt-1 text-lg font-semibold">{location}</p>
                </div>
              </div>
            </section>

            <section className="rounded-[28px] border border-white/15 bg-slate-950/70 p-4 shadow-2xl">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Recent activity</h2>
                <span className="text-xs text-slate-400">Tap log preview</span>
              </div>
              <div className="mt-3 space-y-2">
                {logEntries.length === 0 ? (
                  <div className="rounded-2xl bg-white/5 p-4 text-sm text-slate-300">
                    No actions yet. Start tapping a player stat button.
                  </div>
                ) : (
                  logEntries.slice(0, 6).map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between rounded-2xl bg-white/5 p-3 text-sm"
                    >
                      <div>
                        <p className="font-semibold">{entry.playerName}</p>
                        <p className="text-slate-400">{entry.statType}</p>
                      </div>
                      <span className="rounded-full bg-cyan-300/20 px-3 py-1 text-cyan-200">
                        {entry.timestampLabel}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-[28px] border border-white/15 bg-slate-950/70 p-4 shadow-2xl">
              <h2 className="text-lg font-semibold">Build notes</h2>
              <ul className="mt-3 space-y-2 text-sm text-slate-300">
                <li>This is a mock UI preview using local state only.</li>
                <li>The final version will swap these interactions to your Sheets-backed API.</li>
                <li>Buttons are oversized for one-handed mobile scorekeeping.</li>
              </ul>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
