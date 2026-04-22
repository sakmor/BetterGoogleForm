import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const filesToCheck = [
  "background.js",
  "content.js",
  "options.js",
  "popup.js",
  "utils.js"
];

for (const relativePath of filesToCheck) {
  const target = path.join(rootDir, relativePath);
  const result = spawnSync(process.execPath, ["--check", target], {
    stdio: "inherit"
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

const manifestPath = path.join(rootDir, "manifest.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

if (!manifest.name || !manifest.version) {
  console.error("manifest.json 缺少必要欄位。");
  process.exit(1);
}

console.log("Check passed.");
