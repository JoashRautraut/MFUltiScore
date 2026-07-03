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
cd mfultiscore-app
npm install
npm run dev
```

Open http://localhost:3000

## Local build test

```bash
cd mfultiscore-app
npm install
npm run build:github
```

Built files are in `mfultiscore-app/out`.
