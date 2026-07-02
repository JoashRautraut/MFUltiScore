# MFUltiScore

Ultimate Frisbee stat tracking app built with Next.js.

The live app is in the `mfultiscore-app` folder.

## GitHub Pages

Site URL: https://joashrautraut.github.io/MFUltiScore/

### One-time GitHub setup

1. Open your repo on GitHub: **Settings → Pages**
2. Under **Build and deployment**, set **Source** to **GitHub Actions**
3. Push the latest code to the `main` branch

The workflow in `.github/workflows/deploy-github-pages.yml` will build the Next.js app and deploy it automatically.

### Local test before deploy

```bash
cd mfultiscore-app
npm install
npm run build:github
```

The static site is generated in `mfultiscore-app/out`.

### Important notes

- GitHub Pages only hosts the **frontend** (static files).
- Login, register, and stats currently use **browser storage** on the deployed site.
- Google Sheets API routes are **not** included in the GitHub Pages build. They still work locally with `npm run dev` when your friend sets up the database.

### Development

```bash
cd mfultiscore-app
npm install
npm run dev
```

Open http://localhost:3000
