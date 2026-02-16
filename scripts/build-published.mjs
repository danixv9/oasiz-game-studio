import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

function parseArgs(argv) {
  const args = new Set(argv.slice(2));
  return {
    help: args.has("--help") || args.has("-h"),
    install: args.has("--install"),
    frozenLockfile: args.has("--frozen-lockfile") && !args.has("--no-frozen-lockfile"),
  };
}

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

function run(cmd, cmdArgs, opts) {
  console.log("[build-published] Running:", cmd, cmdArgs.join(" "));
  const res = spawnSync(cmd, cmdArgs, { ...opts, stdio: "inherit" });
  if (res.error) throw res.error;
  if (typeof res.status === "number" && res.status !== 0) {
    const joined = [cmd, ...cmdArgs].join(" ");
    throw new Error("Command failed (" + res.status + "): " + joined);
  }
}

function ensureBuilt(repoRoot, gameDir, { install, frozenLockfile }) {
  const gamePath = path.join(repoRoot, gameDir);
  const pkgPath = path.join(gamePath, "package.json");
  if (!fs.existsSync(pkgPath)) throw new Error("Missing package.json in " + gameDir);

  const nodeModulesPath = path.join(gamePath, "node_modules");
  const hasNodeModules = fs.existsSync(nodeModulesPath);
  if (!hasNodeModules && !install) {
    throw new Error("Missing node_modules in " + gameDir + " (rerun with --install)");
  }

  if (install) {
    const installArgs = ["install"];
    if (frozenLockfile) installArgs.push("--frozen-lockfile");
    run("bun", installArgs, { cwd: gamePath });
  } else {
    console.log("[build-published] Skipping install:", gameDir);
  }

  run("bun", ["run", "build"], { cwd: gamePath });

  const distIndex = path.join(gamePath, "dist", "index.html");
  if (!fs.existsSync(distIndex)) throw new Error("Missing dist/index.html after build in " + gameDir);
}

function main() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const repoRoot = path.resolve(__dirname, "..");

  const args = parseArgs(process.argv);
  if (args.help) {
    console.log(
      [
        "Build all published games (dirs with publish.json).",
        "",
        "Usage:",
        "  node scripts/build-published.mjs [--install] [--frozen-lockfile] [--no-frozen-lockfile]",
        "",
        "Options:",
        "  --install              Run bun install per game dir (required if node_modules missing)",
        "  --frozen-lockfile      Pass --frozen-lockfile to bun install",
        "  --no-frozen-lockfile   Disable --frozen-lockfile even when provided",
      ].join("\n"),
    );
    return;
  }

  const gameDirs = getPublishedGameDirs(repoRoot);
  if (gameDirs.length === 0) {
    console.log("[build-published] No published games found.");
    return;
  }

  console.log("[build-published] Published games:", gameDirs.join(", "));

  const failures = [];
  for (const gameDir of gameDirs) {
    console.log("[build-published] ---");
    console.log("[build-published] Building:", gameDir);
    try {
      ensureBuilt(repoRoot, gameDir, args);
      console.log("[build-published] OK:", gameDir);
    } catch (err) {
      const msg = String(err?.message ?? err);
      console.log("[build-published] FAIL:", gameDir, msg);
      failures.push({ gameDir, msg });
    }
  }

  if (failures.length > 0) {
    console.log("[build-published] ---");
    console.log("[build-published] Failed builds:");
    for (const f of failures) console.log("[build-published] -", f.gameDir + ":", f.msg);
    process.exitCode = 1;
    return;
  }

  console.log("[build-published] ---");
  console.log("[build-published] All published games built successfully.");
}

main();
