# MFUltiScore

Ultimate Frisbee stat tracking app.

**Live app:** https://joashrautraut.github.io/MFUltiScore/

---

## Deploy to GitHub Pages (MFUS-1.0 branch)

### Step 1 — One-time GitHub settings

1. Open **Settings → Actions → General**
2. Under **Workflow permissions**, choose **Read and write permissions**
3. Click **Save**

4. Open **Settings → Pages**
5. Under **Build and deployment**, set **Source** to **GitHub Actions**
   (Do **not** use "Deploy from a branch → main")

### Step 2 — Push your code

```bash
git add .
git commit -m "Fix GitHub Pages deployment"
git push origin MFUS-1.0
```

### Step 3 — Check the workflow

1. Open the **Actions** tab
2. Open **Deploy to GitHub Pages** (not only "pages build and deployment")
3. Wait for a green checkmark on both **build** and **deploy**

### Step 4 — Open the site

https://joashrautraut.github.io/MFUltiScore/

Hard refresh: `Ctrl + F5`

---

## If deployment fails

Click the failed run → open the red step → read the error message.

Common fixes:
- Enable **Read and write** workflow permissions (Step 1 above)
- Make sure **Pages source** is **GitHub Actions**
- Push from `MFUS-1.0` (this branch is supported)

---

## Local development

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Local build test

```bash
npm run build:github
```

Built files are in `out/`.

---

## App overview

This project is a Next.js + TypeScript app for tracking per-game player actions and building trends over time.

### Required Google Sheet tabs

Use one spreadsheet with these exact tab names and columns:

- `Players`: `PlayerID`, `Name`, `DateAdded`
- `Games`: `GameID`, `Date`, `Opponent`, `Location`
- `Stats`: `StatID`, `GameID`, `PlayerName`, `StatType`, `Timestamp`

Allowed `StatType` values:
- `Block`
- `Assist`
- `Score`
- `Callahan`

### Environment setup

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
