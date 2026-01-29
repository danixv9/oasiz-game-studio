/**
 * POST /api/integrations/clawdbot/capabilities
 * Returns what actions Clawdbot may perform for a given botUserId
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { validateClawdbotToken } from "../../_lib/clawdbot-auth";
import { checkRateLimit, getRateLimitHeaders } from "../../_lib/clawdbot-rate-limit";
import { isAdminBotUser } from "../../_lib/clawdbot-storage";

interface CapabilitiesRequest {
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
  const body = req.body as CapabilitiesRequest;

  if (!body || typeof body !== "object") {
    return res.status(400).json({ success: false, error: "Invalid request body" });
  }

  if (typeof body.botUserId !== "string" || !body.botUserId) {
    return res.status(400).json({ success: false, error: "botUserId is required" });
  }

  // Determine capabilities
  // Debug is only enabled for admin bot users (configured via env var)
  const debug = isAdminBotUser(body.botUserId);

  return res.status(200).json({
    success: true,
    capabilities: {
      debug,
      // Future capabilities can be added here:
      // notifications: true,
      // leaderboard: true,
      // achievements: true,
    },
  });
}
