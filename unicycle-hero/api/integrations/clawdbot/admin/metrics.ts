/**
 * GET /api/integrations/clawdbot/admin/metrics
 * Operational metrics with ZERO fake data
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
// METRICS STORAGE (In-memory for serverless)
// ============================================================================

interface MetricsData {
  requests: {
    total: number;
    byEndpoint: Record<string, number>;
  };
  errors: {
    total: number;
    byType: Record<string, number>;
  };
  game: {
    starts: number;
    completions: number;
    totalScore: number;
    highScore: number;
  };
  clawdbot: {
    webhooksReceived: number;
    adminRequests: number;
    authFailures: number;
  };
  startTime: number;
}

// Shared metrics state (resets on cold start - use Redis in production)
const metrics: MetricsData = {
  requests: { total: 0, byEndpoint: {} },
  errors: { total: 0, byType: {} },
  game: { starts: 0, completions: 0, totalScore: 0, highScore: 0 },
  clawdbot: { webhooksReceived: 0, adminRequests: 0, authFailures: 0 },
  startTime: Date.now(),
};

// Export for use in other endpoints
export function incrementMetric(category: keyof MetricsData, key?: string): void {
  if (category === "requests") {
    metrics.requests.total++;
    if (key) {
      metrics.requests.byEndpoint[key] = (metrics.requests.byEndpoint[key] || 0) + 1;
    }
  } else if (category === "errors") {
    metrics.errors.total++;
    if (key) {
      metrics.errors.byType[key] = (metrics.errors.byType[key] || 0) + 1;
    }
  }
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
    writeAudit("/admin/metrics", botUserId, "denied");
    return res.status(403).json({ success: false, error: "Admin access denied" });
  }

  // Track this request
  metrics.clawdbot.adminRequests++;
  writeAudit("/admin/metrics", botUserId, "success");

  const now = Date.now();
  const uptimeMs = now - metrics.startTime;

  return res.status(200).json({
    success: true,
    metrics: {
      // Request metrics
      requests: {
        total: metrics.requests.total,
        byEndpoint: metrics.requests.byEndpoint,
        rate: metrics.requests.total / (uptimeMs / 1000 / 60), // per minute
      },

      // Error metrics
      errors: {
        total: metrics.errors.total,
        byType: metrics.errors.byType,
        rate: metrics.errors.total / (uptimeMs / 1000 / 60),
      },

      // Game metrics (real data only)
      game: {
        starts: metrics.game.starts,
        completions: metrics.game.completions,
        averageScore: metrics.game.completions > 0
          ? Math.round(metrics.game.totalScore / metrics.game.completions)
          : 0,
        highScore: metrics.game.highScore,
        completionRate: metrics.game.starts > 0
          ? Math.round((metrics.game.completions / metrics.game.starts) * 100)
          : 0,
      },

      // Clawdbot integration metrics
      clawdbot: {
        webhooksReceived: metrics.clawdbot.webhooksReceived,
        adminRequests: metrics.clawdbot.adminRequests,
        authFailures: metrics.clawdbot.authFailures,
      },

      // Time context
      period: {
        startTime: new Date(metrics.startTime).toISOString(),
        currentTime: new Date(now).toISOString(),
        uptimeMs,
        uptimeHuman: formatDuration(uptimeMs),
      },

      // Note about serverless
      note: "Metrics reset on cold start. Use persistent storage for production.",
    },
  });
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}
