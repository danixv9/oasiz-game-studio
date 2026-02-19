import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pipeline } from "node:stream/promises";

const LEGACY_ORIGIN = "https://assets.oasiz.ai";

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

function walkFiles(rootDir, predicate) {
  const results = [];
  const stack = [rootDir];
  while (stack.length) {
    const cur = stack.pop();
    const entries = fs.readdirSync(cur, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(cur, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
        continue;
      }
      if (predicate(full)) results.push(full);
    }
  }
  return results;
}

function extractLegacyUrls(text) {
  const urls = new Set();
  const re = /https:\/\/assets\.oasiz\.ai\/[^\s"'`)<>\]]+/g;
  for (;;) {
    const m = re.exec(text);
    if (!m) break;
    urls.add(m[0]);
  }
  return [...urls];
}

async function downloadTo(url, destPath) {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) {
    throw new Error("Fetch failed: " + res.status + " " + res.statusText + " " + url);
  }
  fs.mkdirSync(path.dirname(destPath), { recursive: true });

  const tmp = destPath + ".tmp";
  const file = fs.createWriteStream(tmp);
  await pipeline(res.body, file);
  fs.renameSync(tmp, destPath);
}

async function main() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const repoRoot = path.resolve(__dirname, "..");
  const outDir = path.join(repoRoot, "cdn");

  if (!fs.existsSync(outDir)) {
    throw new Error("Missing cdn/ output directory. Run: bun run build:cdn");
  }

  const gameDirs = getPublishedGameDirs(repoRoot);
  const sourceFiles = [];
  for (const gameDir of gameDirs) {
    const srcDir = path.join(repoRoot, gameDir, "src");
    if (!fs.existsSync(srcDir)) continue;
    sourceFiles.push(
      ...walkFiles(srcDir, (p) => p.endsWith(".ts") || p.endsWith(".tsx")),
    );
  }

  const urls = new Set();
  for (const file of sourceFiles) {
    const text = fs.readFileSync(file, "utf8");
    for (const url of extractLegacyUrls(text)) urls.add(url);
  }

  const list = [...urls].sort((a, b) => a.localeCompare(b));
  if (list.length === 0) {
    console.log("[sync-legacy-assets] No legacy assets URLs found.");
    return;
  }

  const results = [];
  console.log("[sync-legacy-assets] Found legacy assets:", list.length);
  for (const url of list) {
    const u = new URL(url);
    if (u.origin !== LEGACY_ORIGIN) continue;
    if (u.pathname.endsWith("/")) {
      results.push({ url, path: u.pathname, status: "skipped-directory" });
      continue;
    }

    const rel = u.pathname.replace(/^\/+/, "");
    const dest = path.join(outDir, rel);
    const exists = fs.existsSync(dest) && fs.statSync(dest).size > 0;
    if (exists) {
      results.push({ url, path: rel, status: "skipped" });
      continue;
    }

    console.log("[sync-legacy-assets] Download:", url);
    await downloadTo(url, dest);
    const size = fs.statSync(dest).size;
    results.push({ url, path: rel, bytes: size, status: "downloaded" });
  }

  fs.writeFileSync(
    path.join(outDir, "legacy-assets.json"),
    JSON.stringify({ origin: LEGACY_ORIGIN, generatedAt: new Date().toISOString(), assets: results }, null, 2) + "\n",
  );

  const downloaded = results.filter((r) => r.status === "downloaded").length;
  console.log("[sync-legacy-assets] Done. downloaded=" + downloaded + " total=" + results.length);
}

main().catch((err) => {
  console.error("[sync-legacy-assets] ERROR:", err?.message ?? err);
  process.exit(1);
});
