import { spawnSync } from "node:child_process";
import { cpSync, existsSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, "..");
const apiDir = path.join(appRoot, "src", "app", "api");
const apiBackupDir = path.join(appRoot, "src", "app", "_api_backup");

function run(command, args, env = {}) {
  const result = spawnSync(command, args, {
    cwd: appRoot,
    stdio: "inherit",
    shell: true,
    env: {
      ...process.env,
      ...env,
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

try {
  apiHidden = hideApiRoutes();
  run("npm", ["run", "build"], { GITHUB_PAGES: "true" });
} finally {
  if (apiHidden) {
    restoreApiRoutes();
  }
}
