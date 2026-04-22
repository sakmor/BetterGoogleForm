import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const outputDir = path.join(rootDir, "dist", "BetterGoogleForm-extension");

const filesToCopy = [
  "background.js",
  "content.css",
  "content.js",
  "options.html",
  "options.js",
  "popup.html",
  "popup.js",
  "ui.css",
  "utils.js",
  "README.md",
  "PRIVACY.md"
];

const injectedClientId = process.env.GOOGLE_OAUTH_CLIENT_ID?.trim();
const manifestPath = path.join(rootDir, "manifest.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

if (injectedClientId) {
  manifest.oauth2 = {
    ...(manifest.oauth2 || {}),
    client_id: injectedClientId
  };
}

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });

for (const relativePath of filesToCopy) {
  await cp(path.join(rootDir, relativePath), path.join(outputDir, relativePath));
}

await writeFile(
  path.join(outputDir, "manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
  "utf8"
);

console.log(`Built extension to ${outputDir}`);
if (!injectedClientId) {
  console.log("OAuth client id not injected. The dist manifest still contains the placeholder value.");
}
