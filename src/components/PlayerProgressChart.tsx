import { STAT_TYPES, StatType } from "@/types/stats";

type GameChartEntry = {
  gameId: string;
  date: string;
  points: number;
  counts: Record<StatType, number>;
  wasMvp: boolean;
};

type PlayerProgressChartProps = {
  games: GameChartEntry[];
};

const CHART_HEIGHT = 180;
const BAR_WIDTH = 40;
const BAR_GAP = 20;
const CHART_PADDING_LEFT = 36;
const CHART_PADDING_BOTTOM = 52;

const STAT_FILL: Record<StatType, string> = {
  Block: "#3b82f6",
  Assist: "#10b981",
  Score: "#f59e0b",
  Callahan: "#8b5cf6",
};

function statPoints(statType: StatType, count: number) {
  return statType === "Callahan" ? count * 2 : count;
}

function formatShortDate(date: string) {
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return date;
  }
  return parsed.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function PlayerProgressChart({ games }: PlayerProgressChartProps) {
  const chronologicalGames = [...games].sort((a, b) => a.date.localeCompare(b.date));
  const maxPoints = Math.max(1, ...chronologicalGames.map((game) => game.points));
  const axisTicks = [maxPoints, Math.round(maxPoints / 2), 0];
  const chartWidth =
    chronologicalGames.length > 0
      ? CHART_PADDING_LEFT +
        chronologicalGames.length * BAR_WIDTH +
        (chronologicalGames.length - 1) * BAR_GAP +
        16
      : 320;

  return (
    <div className="rounded-[2rem] border border-slate-800 bg-slate-900/90 p-5 shadow-xl">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Game-by-game progress</h3>
          <p className="mt-1 text-sm text-slate-400">
            Points scored in each saved game, oldest to newest.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-slate-300">
          {STAT_TYPES.map((statType) => (
            <span key={statType} className="inline-flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-sm"
                style={{ backgroundColor: STAT_FILL[statType] }}
              />
              {statType}
              {statType === "Callahan" ? " (×2 pts)" : ""}
            </span>
          ))}
        </div>
      </div>

      {chronologicalGames.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-700 bg-slate-950 px-5 py-10 text-center text-sm text-slate-400">
          No saved games yet. Play in a game and save it to see your progress chart here.
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <svg
            viewBox={`0 0 ${chartWidth} ${CHART_HEIGHT + CHART_PADDING_BOTTOM}`}
            width={chartWidth}
            height={CHART_HEIGHT + CHART_PADDING_BOTTOM}
            className="min-w-full"
            role="img"
            aria-label="Bar chart of player points per game"
          >
            {axisTicks.map((tick) => {
              const y = CHART_HEIGHT - (tick / maxPoints) * CHART_HEIGHT;
              return (
                <g key={tick}>
                  <line
                    x1={CHART_PADDING_LEFT}
                    y1={y}
                    x2={chartWidth - 8}
                    y2={y}
                    stroke="#334155"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={CHART_PADDING_LEFT - 8}
                    y={y + 4}
                    textAnchor="end"
                    className="fill-slate-500 text-[11px]"
                  >
                    {tick}
                  </text>
                </g>
              );
            })}

            {chronologicalGames.map((game, index) => {
              const barHeight = (game.points / maxPoints) * CHART_HEIGHT;
              const x = CHART_PADDING_LEFT + index * (BAR_WIDTH + BAR_GAP);
              const barTop = CHART_HEIGHT - barHeight;

              const segments = STAT_TYPES.map((statType) => ({
                statType,
                points: statPoints(statType, game.counts[statType]),
              })).filter((segment) => segment.points > 0);

              let segmentTop = barTop;
              return (
                <g key={game.gameId}>
                  {game.wasMvp && (
                    <rect
                      x={x - 3}
                      y={barTop - 3}
                      width={BAR_WIDTH + 6}
                      height={barHeight + 3}
                      rx={8}
                      fill="none"
                      stroke="#fbbf24"
                      strokeWidth={2}
                    />
                  )}

                  {segments.map((segment) => {
                    const segmentHeight =
                      game.points > 0 ? (segment.points / game.points) * barHeight : 0;
                    const rect = (
                      <rect
                        key={segment.statType}
                        x={x}
                        y={segmentTop}
                        width={BAR_WIDTH}
                        height={segmentHeight}
                        fill={STAT_FILL[segment.statType]}
                      >
                        <title>
                          {formatShortDate(game.date)} · {segment.statType}: {segment.points} pts
                        </title>
                      </rect>
                    );
                    segmentTop += segmentHeight;
                    return rect;
                  })}

                  {barHeight > 0 && (
                    <rect
                      x={x}
                      y={barTop}
                      width={BAR_WIDTH}
                      height={barHeight}
                      rx={6}
                      fill="transparent"
                      stroke="#475569"
                      strokeWidth={1}
                    />
                  )}

                  <text
                    x={x + BAR_WIDTH / 2}
                    y={barTop - 6}
                    textAnchor="middle"
                    className="fill-slate-200 text-[11px] font-semibold"
                  >
                    {game.points}
                  </text>

                  <text
                    x={x + BAR_WIDTH / 2}
                    y={CHART_HEIGHT + 18}
                    textAnchor="middle"
                    className="fill-slate-400 text-[11px]"
                  >
                    {formatShortDate(game.date)}
                  </text>

                  {game.wasMvp && (
                    <text
                      x={x + BAR_WIDTH / 2}
                      y={CHART_HEIGHT + 34}
                      textAnchor="middle"
                      className="fill-amber-600 text-[10px] font-semibold"
                    >
                      MPV
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      )}
    </div>
  );
}
