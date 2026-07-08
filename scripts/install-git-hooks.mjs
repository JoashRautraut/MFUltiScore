import { chmodSync, existsSync } from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const hookPath = path.join(root, ".githooks", "pre-commit");

if (!existsSync(hookPath)) {
  console.error("Missing .githooks/pre-commit");
  process.exit(1);
}

try {
  chmodSync(hookPath, 0o755);
} catch {
  // Windows may ignore chmod; Git Bash still runs the hook.
}

execSync("git config core.hooksPath .githooks", {
  cwd: root,
  stdio: "inherit",
});

console.log("Git hooks installed for this repo (.githooks/pre-commit).");
