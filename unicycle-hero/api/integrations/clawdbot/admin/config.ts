/**
 * GET /api/integrations/clawdbot/admin/config
 * Configuration presence check (booleans only, no values)
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";

// ============================================================================
// INLINE UTILITIES
// ============================================================================

function validateToken(req: VercelRequest): boolean {
  const expectedToken = process.env.CLAWDBOT_INTEGRATION_TOKEN?.trim();
  if (!expectedToken) return false;
  const token =
    (req.headers["x-clawdbot-integration-token"] as string) ||
    (req.headers["x-clawdbot-token"] as string) ||
    (req.headers["authorization"] as string)?.replace(/^Bearer\s+/i, "");
  return token === expectedToken;
}

function isAdminAuthorized(botUserId: string): boolean {
  const allowlist = process.env.CLAWDBOT_ADMIN_BOTUSERIDS?.split(",").map((id) => id.trim()) || [];
  return allowlist.includes(botUserId);
}

function writeAudit(endpoint: string, botUserId: string, result: string): void {
  console.log("[AUDIT]", JSON.stringify({
    timestamp: new Date().toISOString(),
    endpoint,
    botUserId,
    result,
    redactionApplied: true,
  }));
}

// ============================================================================
// HANDLER
// ============================================================================

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Content-Type", "application/json");

  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  if (!validateToken(req)) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  const botUserId = (req.query.botUserId as string) || (req.headers["x-bot-user-id"] as string);
  if (!botUserId) {
    return res.status(400).json({ success: false, error: "botUserId required" });
  }

  if (!isAdminAuthorized(botUserId)) {
    writeAudit("/admin/config", botUserId, "denied");
    return res.status(403).json({ success: false, error: "Admin access denied" });
  }

  writeAudit("/admin/config", botUserId, "success");

  // Return ONLY presence booleans - NEVER actual values
  return res.status(200).json({
    success: true,
    config: {
      // Clawdbot integration
      clawdbotIntegrationTokenConfigured: !!process.env.CLAWDBOT_INTEGRATION_TOKEN,
      clawdbotAgentIdConfigured: !!process.env.CLAWDBOT_AGENT_ID,
      clawdbotEnabledConfigured: process.env.CLAWDBOT_ENABLED !== undefined,
      clawdbotAdminBotUserIdsConfigured: !!process.env.CLAWDBOT_ADMIN_BOTUSERIDS,

      // Vercel environment
      vercelEnvConfigured: !!process.env.VERCEL_ENV,
      vercelRegionConfigured: !!process.env.VERCEL_REGION,
      vercelGitCommitConfigured: !!process.env.VERCEL_GIT_COMMIT_SHA,

      // Feature flags (if any)
      features: {
        clawdbotEnabled: process.env.CLAWDBOT_ENABLED !== "false",
      },
    },
  });
}
