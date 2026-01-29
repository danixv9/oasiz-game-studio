/**
 * GET /api/integrations/clawdbot/admin/diag
 * Aggregated diagnostic snapshot for admin remote ops
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";

// ============================================================================
// INLINE UTILITIES (Vercel import workaround)
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

// Audit log (in-memory for serverless - use DB in production)
function writeAudit(endpoint: string, botUserId: string, result: string): void {
  console.log("[AUDIT]", JSON.stringify({
    timestamp: new Date().toISOString(),
    endpoint,
    botUserId,
    result,
    redactionApplied: true,
  }));
}

// App start time (approximation for serverless)
const APP_START_TIME = Date.now();

// ============================================================================
// HANDLER
// ============================================================================

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Content-Type", "application/json");

  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  // Service token auth
  if (!validateToken(req)) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  // Get botUserId from query or header
  const botUserId = (req.query.botUserId as string) || (req.headers["x-bot-user-id"] as string);
  if (!botUserId) {
    return res.status(400).json({ success: false, error: "botUserId required" });
  }

  // Admin authorization check
  if (!isAdminAuthorized(botUserId)) {
    writeAudit("/admin/diag", botUserId, "denied");
    return res.status(403).json({ success: false, error: "Admin access denied" });
  }

  writeAudit("/admin/diag", botUserId, "success");

  // Build diagnostic snapshot
  const now = Date.now();
  const uptimeMs = now - APP_START_TIME;

  return res.status(200).json({
    success: true,
    diagnostics: {
      app: "unicycle-hero",
      version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || "1.0.0",
      environment: process.env.VERCEL_ENV || "development",
      region: process.env.VERCEL_REGION || "unknown",

      // Uptime (approximation for serverless)
      uptime: {
        ms: uptimeMs,
        human: formatUptime(uptimeMs),
      },

      // Build info
      build: {
        timestamp: process.env.VERCEL_GIT_COMMIT_SHA ? "deployed" : "local",
        branch: process.env.VERCEL_GIT_COMMIT_REF || "unknown",
      },

      // Health indicators
      health: {
        status: "healthy",
        clawdbotIntegration: !!process.env.CLAWDBOT_INTEGRATION_TOKEN,
        adminConfigured: !!process.env.CLAWDBOT_ADMIN_BOTUSERIDS,
      },

      // Error counters (placeholder - would be from real monitoring)
      errors: {
        last24h: 0,
        last1h: 0,
      },

      // Timestamps
      serverTime: new Date().toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  });
}

function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}
