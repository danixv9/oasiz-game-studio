import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

async function blockThirdPartyAssetsForSmoke(page: import("@playwright/test").Page): Promise<void> {
  await page.route("https://fonts.googleapis.com/**", (route) => route.abort());
  await page.route("https://fonts.gstatic.com/**", (route) => route.abort());
  await page.route("https://assets.oasiz.ai/audio/**", (route) => route.abort());
}

function shouldIgnoreConsoleError(text: string): boolean {
  const lower = text.toLowerCase();
  if (lower.includes("failed to load resource")) return true;
  if (lower.includes("net::err_")) return true;
  if (lower.includes("favicon.ico")) return true;
  return false;
}

function getPublishedGameDirs(repoRoot: string): string[] {
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const gameDirs = getPublishedGameDirs(repoRoot);

test.describe("Published game smoke", () => {
  test("has at least one published game", async () => {
    expect(gameDirs.length).toBeGreaterThan(0);
  });

  for (const gameDir of gameDirs) {
    test(`${gameDir} loads without uncaught errors`, async ({ page, baseURL }) => {
      const errors: string[] = [];

      await blockThirdPartyAssetsForSmoke(page);

      page.on("pageerror", (err) => {
        errors.push(String(err?.message ?? err));
      });

      page.on("console", (msg) => {
        if (msg.type() !== "error") return;
        const text = msg.text();
        if (shouldIgnoreConsoleError(text)) return;
        errors.push(text);
      });

      await page.goto(`${baseURL}/${gameDir}/dist/index.html?ci=1`, {
        waitUntil: "domcontentloaded",
      });

      await expect(page).toHaveTitle(/.+/);

      const canvasCount = await page.locator("canvas").count();
      if (canvasCount > 0) {
        await expect(page.locator("canvas").first()).toBeAttached();
      }
      await page.waitForTimeout(1_000);

      expect(errors, `Console/page errors in ${gameDir}:\n${errors.join("\n")}`).toEqual([]);
    });
  }
});
