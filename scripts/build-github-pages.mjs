import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function ensureApiRoutes() {
  spawnSync("node", ["scripts/ensure-api-routes.mjs"], {
    cwd: appRoot,
    stdio: "inherit",
    shell: true,
  });
}

ensureApiRoutes();
const apiDir = path.join(appRoot, "src", "app", "api");
const apiBackupDir = path.join(appRoot, ".api-backup");
const nextDir = path.join(appRoot, ".next");

function runBuild() {
  const result = spawnSync("npm run build", {
    cwd: appRoot,
    stdio: "inherit",
    shell: true,
    env: {
      ...process.env,
      GITHUB_PAGES: "true",
    },
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function hideApiRoutes() {
  if (!existsSync(apiDir)) {
    return false;
  }

  if (existsSync(apiBackupDir)) {
    rmSync(apiBackupDir, { recursive: true, force: true });
  }

  cpSync(apiDir, apiBackupDir, { recursive: true });
  rmSync(apiDir, { recursive: true, force: true });
  return true;
}

function restoreApiRoutes() {
  if (!existsSync(apiBackupDir)) {
    return;
  }

  if (existsSync(apiDir)) {
    rmSync(apiDir, { recursive: true, force: true });
  }

  cpSync(apiBackupDir, apiDir, { recursive: true });
  rmSync(apiBackupDir, { recursive: true, force: true });
}

let apiHidden = false;

spawnSync("node", ["scripts/ensure-api-routes.mjs"], {
  cwd: appRoot,
  stdio: "inherit",
  shell: true,
});

try {
  if (existsSync(nextDir)) {
    rmSync(nextDir, { recursive: true, force: true });
  }

  apiHidden = hideApiRoutes();
  runBuild();
} finally {
  if (apiHidden) {
    restoreApiRoutes();
  }
}
