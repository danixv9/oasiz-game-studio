import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function getPublishedGameDirs(repoRoot) {
  return fs
    .readdirSync(repoRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => {
      if (name === "mobile" || name === "template" || name.startsWith(".")) return false;
      return fs.existsSync(path.join(repoRoot, name, "publish.json"));
    })
    .sort((a, b) => a.localeCompare(b));
}

function rmrf(p) {
  if (!fs.existsSync(p)) return;
  fs.rmSync(p, { recursive: true, force: true });
}

function emptyDirPreserve(p, preserveNames) {
  if (!fs.existsSync(p)) return;
  for (const entry of fs.readdirSync(p)) {
    if (preserveNames.has(entry)) continue;
    rmrf(path.join(p, entry));
  }
}

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function main() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const repoRoot = path.resolve(__dirname, "..");

  const outDir = path.join(repoRoot, "cdn");
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  } else {
    emptyDirPreserve(outDir, new Set([".vercel"]));
  }

  const gameDirs = getPublishedGameDirs(repoRoot);
  if (gameDirs.length === 0) {
    console.log("[build-cdn] No published games found.");
    return;
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    games: [],
  };

  for (const gameDir of gameDirs) {
    const distIndex = path.join(repoRoot, gameDir, "dist", "index.html");
    if (!fs.existsSync(distIndex)) {
      throw new Error("Missing dist/index.html for " + gameDir + " (build games first)");
    }

    const publish = readJson(path.join(repoRoot, gameDir, "publish.json"));
    const outGameDir = path.join(outDir, gameDir);
    fs.mkdirSync(outGameDir, { recursive: true });
    fs.copyFileSync(distIndex, path.join(outGameDir, "index.html"));

    manifest.games.push({
      id: gameDir,
      title: publish.title ?? gameDir,
      description: publish.description ?? "",
      category: publish.category ?? "",
      version: publish.version ?? "",
    });
  }

  fs.writeFileSync(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");

  const listItems = manifest.games
    .map((g) => `<li><a href="/${g.id}/">${escapeHtml(g.title)}</a><div class="meta">${escapeHtml(g.description)}</div></li>`)
    .join("\n");

  const indexHtml = [
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    '  <meta charset="utf-8" />',
    '  <meta name="viewport" content="width=device-width, initial-scale=1" />',
    "  <title>Oasiz Games CDN</title>",
    "  <style>",
    "    :root { color-scheme: dark; }",
    "    body { margin: 0; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; background: #05060a; color: #e9ecf5; }",
    "    .wrap { max-width: 920px; margin: 0 auto; padding: 40px 20px; }",
    "    h1 { margin: 0 0 10px; font-size: 22px; font-weight: 800; letter-spacing: 0.2px; }",
    "    p { margin: 0 0 22px; color: #aeb7d6; }",
    "    ul { list-style: none; padding: 0; margin: 0; display: grid; gap: 10px; }",
    "    li { border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.03); border-radius: 14px; padding: 14px 14px; }",
    "    a { color: #c9b6ff; text-decoration: none; font-weight: 700; }",
    "    a:hover { text-decoration: underline; }",
    "    .meta { margin-top: 6px; color: #aeb7d6; font-size: 13px; line-height: 1.35; }",
    "    .foot { margin-top: 22px; font-size: 12px; color: #7f89ab; }",
    "    code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }",
    "  </style>",
    "</head>",
    "<body>",
    '  <div class="wrap">',
    "    <h1>Oasiz Games CDN</h1>",
    "    <p>Static game builds served for the Oasiz mobile app. Manifest: <code>/manifest.json</code></p>",
    "    <ul>",
    listItems,
    "    </ul>",
    '    <div class="foot">Generated ' + escapeHtml(manifest.generatedAt) + "</div>",
    "  </div>",
    "</body>",
    "</html>",
    "",
  ].join("\n");

  fs.writeFileSync(path.join(outDir, "index.html"), indexHtml);
  console.log("[build-cdn] Wrote:", outDir);
  console.log("[build-cdn] Games:", manifest.games.length);
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

main();
