/**
 * POST /api/integrations/clawdbot/context
 * Returns sanitized user/app context for chat UX
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { validateClawdbotToken } from "../../_lib/clawdbot-auth";
import { checkRateLimit, getRateLimitHeaders } from "../../_lib/clawdbot-rate-limit";
import { getBotUserMapping, getGameDataByBotUser } from "../../_lib/clawdbot-storage";
import { sanitize, createSanitizedSummary } from "../../_lib/clawdbot-sanitizer";

interface ContextRequest {
  botUserId: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // No CORS for server-to-server endpoints
  res.setHeader("Content-Type", "application/json");

  // Only allow POST
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  // Rate limiting
  const rateLimit = checkRateLimit(req);
  const rateLimitHeaders = getRateLimitHeaders(rateLimit);
  Object.entries(rateLimitHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  if (!rateLimit.allowed) {
    return res.status(429).json({ success: false, error: "Too many requests" });
  }

  // Authenticate
  const auth = validateClawdbotToken(req);
  if (!auth.valid) {
    return res.status(401).json({ success: false, error: auth.error || "Unauthorized" });
  }

  // Validate request body
  const body = req.body as ContextRequest;

  if (!body || typeof body !== "object") {
    return res.status(400).json({ success: false, error: "Invalid request body" });
  }

  if (typeof body.botUserId !== "string" || !body.botUserId) {
    return res.status(400).json({ success: false, error: "botUserId is required" });
  }

  // Validate botUserId format
  if (!body.botUserId.startsWith("bot_")) {
    return res.status(400).json({ success: false, error: "Invalid botUserId format" });
  }

  // Get bot user mapping
  const mapping = getBotUserMapping(body.botUserId);

  if (!mapping) {
    return res.status(403).json({ success: false, error: "Not linked" });
  }

  // Get game data for this user
  const gameData = getGameDataByBotUser(body.botUserId);

  // Build sanitized context
  const summary = createSanitizedSummary({
    totalGames: gameData?.totalGames ?? 0,
    highScore: gameData?.highScore ?? 0,
    lastPlayedAt: gameData?.lastPlayedAt ? new Date(gameData.lastPlayedAt) : null,
    achievements: gameData?.achievements ?? [],
  });

  // Include sample of recent scores (sanitized)
  const sample = sanitize(
    gameData?.recentScores?.slice(0, 5).map((score) => ({
      score,
      type: "game_result",
    })) ?? []
  );

  return res.status(200).json({
    success: true,
    botUserId: body.botUserId,
    context: {
      summary,
      sample,
      // Metadata about the link (sanitized)
      linkedAt: new Date(mapping.linkedAt).toISOString(),
      channel: mapping.channel ?? "unknown",
      scopes: mapping.scopes,
    },
  });
}
