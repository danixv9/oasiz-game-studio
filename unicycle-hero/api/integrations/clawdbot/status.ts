/**
 * GET /api/integrations/clawdbot/status
 * Health check and configuration status endpoint
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { validateClawdbotToken, isClawdbotEnabled, getAgentId } from "../../_lib/clawdbot-auth";
import { checkRateLimit, getRateLimitHeaders } from "../../_lib/clawdbot-rate-limit";

// App version (could be injected at build time)
const APP_VERSION = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || "1.0.0";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // No CORS for server-to-server endpoints
  res.setHeader("Content-Type", "application/json");

  // Only allow GET
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "GET") {
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

  // Return status
  return res.status(200).json({
    success: true,
    app: "unicycle-hero",
    agentId: getAgentId(),
    enabled: isClawdbotEnabled(),
    time: new Date().toISOString(),
    version: APP_VERSION,
  });
}
