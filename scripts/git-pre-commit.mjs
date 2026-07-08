import { execSync } from "node:child_process";

const BLOCKED_PATTERNS = [
  /^node_modules\//,
  /\/node_modules\//,
  /^\.next\//,
  /\/\.next\//,
  /^\.env\.local$/,
  /^out\//,
  /\/out\//,
];

const LARGE_FILE_BYTES = 100 * 1024 * 1024;

function getStagedFiles() {
  const output = execSync("git diff --cached --name-only --diff-filter=ACMR", {
    encoding: "utf8",
  });

  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function getStagedBlobSize(path) {
  try {
    const size = execSync(`git cat-file -s ":${path}"`, { encoding: "utf8" }).trim();
    return Number(size);
  } catch {
    return 0;
  }
}

const stagedFiles = getStagedFiles();
const blockedFiles = stagedFiles.filter((file) =>
  BLOCKED_PATTERNS.some((pattern) => pattern.test(file)),
);

if (blockedFiles.length > 0) {
  console.error("Pre-commit blocked: do not commit generated or secret files.");
  console.error("");
  for (const file of blockedFiles.slice(0, 20)) {
    console.error(`  - ${file}`);
  }
  if (blockedFiles.length > 20) {
    console.error(`  ... and ${blockedFiles.length - 20} more`);
  }
  console.error("");
  console.error("Fix with:");
  console.error("  git reset HEAD -- <path>");
  console.error("  git rm -r --cached node_modules mfultiscore-app/node_modules");
  process.exit(1);
}

const largeFiles = stagedFiles.filter((file) => getStagedBlobSize(file) > LARGE_FILE_BYTES);

if (largeFiles.length > 0) {
  console.error("Pre-commit blocked: files over 100 MB cannot be pushed to GitHub.");
  for (const file of largeFiles) {
    console.error(`  - ${file}`);
  }
  process.exit(1);
}

console.log("Pre-commit check passed.");
