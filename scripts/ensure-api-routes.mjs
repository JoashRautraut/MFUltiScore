import { cpSync, existsSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const apiDir = path.join(appRoot, "src", "app", "api");
const legacyBackup = path.join(appRoot, "src", "app", "_api_backup");
const rootBackup = path.join(appRoot, ".api-backup");

function restore(fromDir) {
  if (existsSync(apiDir)) {
    rmSync(apiDir, { recursive: true, force: true });
  }

  cpSync(fromDir, apiDir, { recursive: true });
  rmSync(fromDir, { recursive: true, force: true });
  console.log("Restored API routes from backup.");
}

if (existsSync(legacyBackup)) {
  restore(legacyBackup);
} else if (existsSync(rootBackup)) {
  restore(rootBackup);
}
