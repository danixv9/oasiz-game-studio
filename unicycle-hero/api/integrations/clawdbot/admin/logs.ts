/**
 * GET /api/integrations/clawdbot/admin/logs
 * Redacted logs for admin viewing
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

// Redaction patterns
const REDACT_PATTERNS = [
  /token[=:]["']?[\w-]+/gi,
  /secret[=:]["']?[\w-]+/gi,
  /password[=:]["']?[\w-]+/gi,
  /authorization[=:]\s*["']?[\w\s-]+/gi,
  /cookie[=:]["']?[\w-]+/gi,
  /email[=:]["']?[\w@.-]+/gi,
  /\b[\w.-]+@[\w.-]+\.\w+\b/gi, // Email addresses
  /userId[=:]["']?[\w-]+/gi,
  /sessionId[=:]["']?[\w-]+/gi,
  /Bearer\s+[\w.-]+/gi,
  /sk_[\w]+/gi, // Stripe-like keys
  /pk_[\w]+/gi,
];

function redactLogEntry(entry: string): string {
  let redacted = entry;
  for (const pattern of REDACT_PATTERNS) {
    redacted = redacted.replace(pattern, "***REDACTED***");
  }
  return redacted;
}

// In-memory log buffer (in production, use proper logging service)
interface LogEntry {
  timestamp: string;
  level: "info" | "warn" | "error";
  message: string;
  metadata?: Record<string, unknown>;
}

const logBuffer: LogEntry[] = [];
const MAX_LOG_ENTRIES = 500;

// Capture logs (would integrate with real logging in production)
export function addLogEntry(level: LogEntry["level"], message: string, metadata?: Record<string, unknown>): void {
  logBuffer.unshift({
    timestamp: new Date().toISOString(),
    level,
    message,
    metadata,
  });
  if (logBuffer.length > MAX_LOG_ENTRIES) {
    logBuffer.pop();
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
    writeAudit("/admin/logs", botUserId, "denied");
    return res.status(403).json({ success: false, error: "Admin access denied" });
  }

  writeAudit("/admin/logs", botUserId, "success");

  // Parse query params
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
  const level = req.query.level as string;
  const search = req.query.search as string;

  // Filter and redact logs
  let logs = logBuffer.slice(0, limit);

  if (level) {
    logs = logs.filter((log) => log.level === level);
  }

  if (search) {
    const searchLower = search.toLowerCase();
    logs = logs.filter((log) => log.message.toLowerCase().includes(searchLower));
  }

  // Redact sensitive data
  const redactedLogs = logs.map((log) => ({
    ...log,
    message: redactLogEntry(log.message),
    metadata: log.metadata ? redactObject(log.metadata) : undefined,
  }));

  return res.status(200).json({
    success: true,
    logs: redactedLogs,
    meta: {
      total: logBuffer.length,
      returned: redactedLogs.length,
      limit,
      filters: { level, search },
      redactionApplied: true,
    },
  });
}

function redactObject(obj: Record<string, unknown>): Record<string, unknown> {
  const redacted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (REDACT_PATTERNS.some((p) => p.test(key))) {
      redacted[key] = "***REDACTED***";
    } else if (typeof value === "string") {
      redacted[key] = redactLogEntry(value);
    } else if (typeof value === "object" && value !== null) {
      redacted[key] = redactObject(value as Record<string, unknown>);
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
}
