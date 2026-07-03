# MFULTISCORE (Ultimate Frisbee Stats)

Next.js + TypeScript app for tracking per-game player actions and building trends over time.

## Step 1-2 Status

Completed:
- Next.js App Router scaffold
- Google Sheets API service-account integration
- Server-side helper functions:
  - `appendStat()`
  - `getPlayers()`
  - `addPlayer()`
  - `createGame()`
  - `getGameStats(gameId)`
  - `getAllStats()`
- API routes that call those helpers (client never talks to Sheets directly)

## Required Google Sheet tabs

Use one spreadsheet with these exact tab names and columns:

- `Players`: `PlayerID`, `Name`, `DateAdded`
- `Games`: `GameID`, `Date`, `Opponent`, `Location`
- `Stats`: `StatID`, `GameID`, `PlayerName`, `StatType`, `Timestamp`

Allowed `StatType` values:
- `Block`
- `Assist`
- `Score`
- `Callahan`

## Environment setup

1. Copy `.env.example` to `.env.local`
2. Set these values:
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `GOOGLE_PRIVATE_KEY`
   - `GOOGLE_SPREADSHEET_ID`
3. Share your spreadsheet with the service-account email as Editor

## Run locally

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## API routes

- `GET /api/players`
- `POST /api/players` with `{ "name": "Player Name" }`
- `GET /api/games`
- `POST /api/games` with `{ "date": "2026-07-02", "opponent": "Team", "location": "Field 1" }`
- `GET /api/stats` (or `GET /api/stats?gameId=...`)
- `POST /api/stats` with `{ "gameId": "...", "playerName": "...", "statType": "Score" }`
