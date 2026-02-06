/**
 * GET /api/integrations/clawdbot/status
 * Health check and configuration status endpoint
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";

// Inline auth validation to avoid import issues
function validateToken(req: VercelRequest): boolean {
  const expectedToken = process.env.CLAWDBOT_INTEGRATION_TOKEN?.trim();
  if (!expectedToken) return false;

  const token =
    (req.headers["x-clawdbot-integration-token"] as string) ||
    (req.headers["x-games-clawdbot-token"] as string) ||
    (req.headers["x-clawdbot-token"] as string) ||
    (req.headers["authorization"] as string)?.replace(/^Bearer\s+/i, "");

  return token === expectedToken;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Content-Type", "application/json");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  if (!validateToken(req)) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  return res.status(200).json({
    success: true,
    app: "unicycle-hero",
    agentId: process.env.CLAWDBOT_AGENT_ID || "games",
    enabled: process.env.CLAWDBOT_ENABLED !== "false",
    time: new Date().toISOString(),
    version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || "1.0.0",
  });
}
