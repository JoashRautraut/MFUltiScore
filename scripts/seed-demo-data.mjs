const baseUrl = process.env.DEMO_BASE_URL ?? "http://localhost:3000";

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error ?? `${response.status} ${response.statusText}`);
  }

  return body;
}

async function main() {
  console.log(`Seeding demo data via ${baseUrl}\n`);

  const players = ["Ava", "Mia", "Noah", "Kai"];
  for (const name of players) {
    const { player } = await request("/api/players", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
    console.log(`Player added: ${player.name} (${player.playerId})`);
  }

  const { games: existingGames } = await request("/api/games");
  let game = existingGames[0];

  if (!game) {
    const created = await request("/api/games", {
      method: "POST",
      body: JSON.stringify({
        date: "2026-06-28",
        opponent: "Team 2",
        location: "Main Field",
      }),
    });
    game = created.game;
    console.log(`Game created: ${game.gameId}`);
  } else {
    console.log(`Using existing game: ${game.gameId}`);
  }

  const demoStats = [
    { playerName: "Ava", statType: "Block" },
    { playerName: "Ava", statType: "Assist" },
    { playerName: "Ava", statType: "Assist" },
    { playerName: "Ava", statType: "Score" },
    { playerName: "Ava", statType: "Score" },
    { playerName: "Mia", statType: "Assist" },
    { playerName: "Mia", statType: "Score" },
    { playerName: "Noah", statType: "Block" },
    { playerName: "Noah", statType: "Block" },
    { playerName: "Noah", statType: "Score" },
    { playerName: "Kai", statType: "Assist" },
  ];

  for (const stat of demoStats) {
    await request("/api/stats", {
      method: "POST",
      body: JSON.stringify({
        gameId: game.gameId,
        playerName: stat.playerName,
        statType: stat.statType,
      }),
    });
    console.log(`Stat added: ${stat.playerName} · ${stat.statType}`);
  }

  const { players: allPlayers } = await request("/api/players");
  const { games } = await request("/api/games");
  const { stats } = await request("/api/stats");
  const { stats: gameStats } = await request(`/api/stats?gameId=${encodeURIComponent(game.gameId)}`);

  console.log("\nDone. Current sheet-backed data:");
  console.log(`- Players: ${allPlayers.length}`);
  console.log(`- Games: ${games.length}`);
  console.log(`- Stats (all): ${stats.length}`);
  console.log(`- Stats (game ${game.gameId}): ${gameStats.length}`);
  console.log("\nOpen your Google Sheet to verify the rows were added.");
}

main().catch((error) => {
  console.error("\nSeed failed:", error.message);
  console.error("Make sure npm run dev is running and .env.local is configured.");
  process.exit(1);
});
