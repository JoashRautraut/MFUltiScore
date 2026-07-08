import "server-only";

import { STAT_TYPES, StatType } from "@/types/stats";
import {
  SaveCompletedGameInput,
  SerializedCompletedGame,
  StoredGameMetadata,
} from "@/types/completed-game";
import {
  appendStatsBatch,
  createGame,
  getAllStats,
  getGames,
} from "@/lib/sheets";

function emptyCounts(): Record<StatType, number> {
  return { Block: 0, Assist: 0, Score: 0, Callahan: 0 };
}

function createEmptyTeamPlayers(): Record<string, SerializedCompletedGame["teamPlayers"][string]> {
  return Object.fromEntries(
    Array.from({ length: 15 }, (_, index) => [`team${index + 1}`, []]),
  );
}

function parseStoredMetadata(location: string): StoredGameMetadata | null {
  if (!location.trim()) {
    return null;
  }

  try {
    return JSON.parse(location) as StoredGameMetadata;
  } catch {
    return null;
  }
}

function rebuildTeamPlayersFromStats(
  gameId: string,
  stats: Awaited<ReturnType<typeof getAllStats>>,
): Record<string, SerializedCompletedGame["teamPlayers"][string]> {
  const teamPlayers = createEmptyTeamPlayers();
  const countsByPlayer = new Map<string, Record<StatType, number>>();

  for (const entry of stats) {
    if (entry.gameId !== gameId) {
      continue;
    }

    const current = countsByPlayer.get(entry.playerName) ?? emptyCounts();
    current[entry.statType] += 1;
    countsByPlayer.set(entry.playerName, current);
  }

  for (const [name, counts] of countsByPlayer) {
    teamPlayers.team1.push({
      name,
      team: "team1",
      counts,
    });
  }

  return teamPlayers;
}

function playerPoints(counts: Record<StatType, number>) {
  return counts.Block + counts.Assist + counts.Score + counts.Callahan * 2;
}

function computeBestPlayer(
  teamPlayers: Record<string, SerializedCompletedGame["teamPlayers"][string]>,
): SerializedCompletedGame["bestPlayer"] {
  const players = Object.values(teamPlayers).flat();
  const totalPoints = players.reduce((sum, player) => sum + playerPoints(player.counts), 0);
  const winner =
    [...players].sort((a, b) => playerPoints(b.counts) - playerPoints(a.counts))[0] ??
    ({
      name: "No player",
      team: "team1",
      counts: emptyCounts(),
    } as SerializedCompletedGame["teamPlayers"][string][number]);
  const winnerPoints = playerPoints(winner.counts);

  return {
    name: winner.name,
    team: winner.team,
    percentage: totalPoints === 0 ? 0 : Math.round((winnerPoints / totalPoints) * 100),
    points: winnerPoints,
  };
}

function flattenPlayers(
  teamPlayers: Record<string, SerializedCompletedGame["teamPlayers"][string]>,
) {
  return Object.values(teamPlayers).flat();
}

export async function getCompletedGamesFromSheet(): Promise<SerializedCompletedGame[]> {
  const [games, stats] = await Promise.all([getGames(), getAllStats()]);

  return games.map((game) => {
    const metadata = parseStoredMetadata(game.location);
    const teamPlayers =
      metadata?.teamPlayers ?? rebuildTeamPlayersFromStats(game.gameId, stats);
    const bestPlayer = metadata?.bestPlayer ?? computeBestPlayer(teamPlayers);

    return {
      id: game.gameId,
      date: metadata?.date ?? game.date,
      endedAt: metadata?.endedAt ?? "",
      timerSeconds: metadata?.timerSeconds ?? 0,
      matchup: metadata?.matchup ?? { home: "team1", away: "team2" },
      teamPlayers,
      bestPlayer,
    };
  });
}

export async function saveCompletedGameToSheet(
  input: SaveCompletedGameInput,
): Promise<SerializedCompletedGame> {
  const metadata: StoredGameMetadata = {
    date: input.date,
    endedAt: input.endedAt,
    timerSeconds: input.timerSeconds,
    matchup: input.matchup,
    teamPlayers: input.teamPlayers,
    bestPlayer: input.bestPlayer,
  };

  const game = await createGame({
    date: input.date,
    opponent: input.matchupLabel,
    location: JSON.stringify(metadata),
  });

  const statEntries: Array<{
    gameId: string;
    playerName: string;
    statType: StatType;
  }> = [];

  for (const player of flattenPlayers(input.teamPlayers)) {
    for (const statType of STAT_TYPES) {
      const count = player.counts[statType];
      for (let index = 0; index < count; index += 1) {
        statEntries.push({
          gameId: game.gameId,
          playerName: player.name,
          statType,
        });
      }
    }
  }

  await appendStatsBatch(statEntries);

  return {
    id: game.gameId,
    ...metadata,
  };
}
