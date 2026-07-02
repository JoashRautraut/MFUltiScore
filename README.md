# MFUltiScore

Ultimate Frisbee stat tracking app.

**Live app:** https://joashrautraut.github.io/MFUltiScore/

---

## Fix GitHub Pages (if you only see this README)

GitHub is showing this file because Pages is pointed at the **main** branch.  
The real app must be deployed from the **gh-pages** branch.

### Step 1 — Push your latest code

```bash
git add .
git commit -m "Fix GitHub Pages deployment"
git push origin MFUS-1.0
```

Also merge to `main` when ready:

```bash
git checkout main
git merge MFUS-1.0
git push origin main
```

### Step 2 — Wait for GitHub Actions

1. Open your repo on GitHub
2. Click the **Actions** tab
3. Open **Deploy to GitHub Pages**
4. Wait until it shows a green checkmark

This workflow builds `mfultiscore-app` and publishes the `out` folder to the **gh-pages** branch.

### Step 3 — Change Pages settings (important)

1. Go to **Settings → Pages**
2. Under **Build and deployment**
3. Set **Source** to **Deploy from a branch**
4. Set **Branch** to **gh-pages** (not `main`)
5. Set folder to **/ (root)**
6. Click **Save**

### Step 4 — Open the app

Visit: https://joashrautraut.github.io/MFUltiScore/

Hard refresh if needed: `Ctrl + F5`

---

## Local development

```bash
cd mfultiscore-app
npm install
npm run dev
```

Open http://localhost:3000

## Local build test (same as GitHub deploy)

```bash
cd mfultiscore-app
npm install
npm run build:github
```

Built files are in `mfultiscore-app/out`.
