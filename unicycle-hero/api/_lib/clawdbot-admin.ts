/**
 * Admin Utilities for Clawdbot Remote Ops
 * Redaction, audit logging, and admin authorization
 */

// ============================================================================
// REDACTION
// ============================================================================

const REDACTION_PATTERNS = [
  // Secrets & Auth
  /token/i,
  /secret/i,
  /key/i,
  /cookie/i,
  /authorization/i,
  /jwt/i,
  /password/i,
  /apikey/i,
  /api_key/i,

  // PII
  /email/i,
  /phone/i,
  /address/i,
  /ssn/i,

  // Internal IDs
  /^userId$/i,
  /^user_id$/i,
  /adminUserId/i,
  /actorId/i,
  /sessionId/i,
  /session_id/i,
  /internalId/i,
];

const MAX_STRING_LENGTH = 200;
const MAX_ARRAY_LENGTH = 20;
const MAX_DEPTH = 4;

/**
 * Redact sensitive data for admin responses
 */
export function redactForClawdbotAdmin(data: unknown, depth = 0): unknown {
  if (depth > MAX_DEPTH) return "[MAX_DEPTH]";
  if (data === null || data === undefined) return data;

  if (typeof data === "string") {
    if (data.length > MAX_STRING_LENGTH) {
      return data.slice(0, MAX_STRING_LENGTH) + "...[redacted]";
    }
    // Redact strings that look like tokens/secrets
    if (/^(eyJ|sk_|pk_|Bearer\s)/i.test(data)) {
      return "***REDACTED***";
    }
    return data;
  }

  if (typeof data === "number" || typeof data === "boolean") {
    return data;
  }

  if (Array.isArray(data)) {
    const redacted = data.slice(0, MAX_ARRAY_LENGTH).map((item) => redactForClawdbotAdmin(item, depth + 1));
    if (data.length > MAX_ARRAY_LENGTH) {
      redacted.push(`[...${data.length - MAX_ARRAY_LENGTH} more]`);
    }
    return redacted;
  }

  if (typeof data === "object") {
    const redacted: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      if (shouldRedactKey(key)) {
        redacted[key] = "***REDACTED***";
      } else {
        redacted[key] = redactForClawdbotAdmin(value, depth + 1);
      }
    }
    return redacted;
  }

  return "[UNKNOWN_TYPE]";
}

function shouldRedactKey(key: string): boolean {
  return REDACTION_PATTERNS.some((pattern) => pattern.test(key));
}

// ============================================================================
// AUDIT LOGGING
// ============================================================================

interface AuditRecord {
  timestamp: string;
  endpoint: string;
  action?: string;
  botUserId: string;
  result: "success" | "fail" | "denied";
  redactionApplied: boolean;
  metadata?: Record<string, unknown>;
}

// In-memory audit log (use database in production)
const auditLog: AuditRecord[] = [];
const MAX_AUDIT_RECORDS = 1000;

/**
 * Write an audit record
 */
export function writeAuditRecord(record: Omit<AuditRecord, "timestamp">): void {
  const fullRecord: AuditRecord = {
    ...record,
    timestamp: new Date().toISOString(),
  };

  auditLog.unshift(fullRecord);

  // Keep only recent records
  if (auditLog.length > MAX_AUDIT_RECORDS) {
    auditLog.pop();
  }

  // Also log to console for Vercel logs
  console.log("[AUDIT]", JSON.stringify(fullRecord));
}

/**
 * Get recent audit records (for admin viewing)
 */
export function getAuditRecords(limit = 50): AuditRecord[] {
  return auditLog.slice(0, limit);
}

// ============================================================================
// ADMIN AUTHORIZATION
// ============================================================================

/**
 * Check if a botUserId is authorized for admin operations
 */
export function isAdminAuthorized(botUserId: string): boolean {
  const allowlist = process.env.CLAWDBOT_ADMIN_BOTUSERIDS?.split(",").map((id) => id.trim()) || [];
  return allowlist.includes(botUserId);
}

/**
 * Get admin capabilities for a botUserId
 */
export function getAdminCapabilities(botUserId: string): { debug: boolean; ops: boolean } {
  const isAdmin = isAdminAuthorized(botUserId);
  return {
    debug: isAdmin,
    ops: isAdmin,
  };
}

// ============================================================================
// ACTION NONCES (Two-Man Rule)
// ============================================================================

interface ActionNonce {
  nonce: string;
  action: string;
  botUserId: string;
  createdAt: number;
  expiresAt: number;
  used: boolean;
}

// In-memory nonce store
const actionNonces = new Map<string, ActionNonce>();
const NONCE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Allowed admin actions (explicit allowlist)
export const ALLOWED_ADMIN_ACTIONS = ["clear_cache", "reset_rate_limits", "refresh_config"] as const;
export type AdminAction = (typeof ALLOWED_ADMIN_ACTIONS)[number];

/**
 * Prepare an admin action (step 1 of two-man rule)
 */
export function prepareAdminAction(
  action: string,
  botUserId: string
): { success: true; nonce: string; expiresAt: number } | { success: false; error: string } {
  // Validate action is allowed
  if (!ALLOWED_ADMIN_ACTIONS.includes(action as AdminAction)) {
    return { success: false, error: `Action '${action}' is not allowed` };
  }

  // Generate nonce
  const nonce = generateNonce();
  const now = Date.now();

  const nonceRecord: ActionNonce = {
    nonce,
    action,
    botUserId,
    createdAt: now,
    expiresAt: now + NONCE_TTL_MS,
    used: false,
  };

  actionNonces.set(nonce, nonceRecord);

  // Cleanup expired nonces
  cleanupExpiredNonces();

  writeAuditRecord({
    endpoint: "/admin/actions/prepare",
    action,
    botUserId,
    result: "success",
    redactionApplied: false,
    metadata: { nonce: nonce.slice(0, 8) + "..." },
  });

  return {
    success: true,
    nonce,
    expiresAt: nonceRecord.expiresAt,
  };
}

/**
 * Confirm and execute an admin action (step 2 of two-man rule)
 */
export function confirmAdminAction(
  nonce: string,
  action: string,
  botUserId: string
): { success: true; result: string } | { success: false; error: string } {
  const nonceRecord = actionNonces.get(nonce);

  if (!nonceRecord) {
    writeAuditRecord({
      endpoint: "/admin/actions/confirm",
      action,
      botUserId,
      result: "fail",
      redactionApplied: false,
      metadata: { error: "Invalid nonce" },
    });
    return { success: false, error: "Invalid or expired nonce" };
  }

  if (nonceRecord.used) {
    return { success: false, error: "Nonce already used" };
  }

  if (Date.now() > nonceRecord.expiresAt) {
    actionNonces.delete(nonce);
    return { success: false, error: "Nonce expired" };
  }

  if (nonceRecord.action !== action) {
    return { success: false, error: "Action mismatch" };
  }

  if (nonceRecord.botUserId !== botUserId) {
    return { success: false, error: "BotUserId mismatch" };
  }

  // Mark as used
  nonceRecord.used = true;

  // Execute the action
  const result = executeAdminAction(action as AdminAction);

  writeAuditRecord({
    endpoint: "/admin/actions/confirm",
    action,
    botUserId,
    result: "success",
    redactionApplied: false,
    metadata: { actionResult: result },
  });

  // Cleanup
  actionNonces.delete(nonce);

  return { success: true, result };
}

/**
 * Execute an admin action (internal)
 */
function executeAdminAction(action: AdminAction): string {
  switch (action) {
    case "clear_cache":
      // In a real app, this would clear caches
      return "Cache cleared successfully";

    case "reset_rate_limits":
      // In a real app, this would reset rate limit counters
      return "Rate limits reset successfully";

    case "refresh_config":
      // In a real app, this would reload configuration
      return "Configuration refreshed successfully";

    default:
      return "Action completed";
  }
}

function generateNonce(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let nonce = "";
  for (let i = 0; i < 32; i++) {
    nonce += chars[Math.floor(Math.random() * chars.length)];
  }
  return nonce;
}

function cleanupExpiredNonces(): void {
  const now = Date.now();
  for (const [key, value] of actionNonces.entries()) {
    if (now > value.expiresAt) {
      actionNonces.delete(key);
    }
  }
}

// ============================================================================
// METRICS STORAGE
// ============================================================================

interface Metrics {
  requestCount: number;
  errorCount: number;
  gameStarts: number;
  gameOvers: number;
  avgScore: number;
  startTime: number;
}

// In-memory metrics
const metrics: Metrics = {
  requestCount: 0,
  errorCount: 0,
  gameStarts: 0,
  gameOvers: 0,
  avgScore: 0,
  startTime: Date.now(),
};

export function incrementMetric(key: keyof Omit<Metrics, "startTime" | "avgScore">): void {
  metrics[key]++;
}

export function getMetrics(): Metrics {
  return { ...metrics };
}

export function updateAvgScore(score: number): void {
  const total = metrics.avgScore * metrics.gameOvers + score;
  metrics.gameOvers++;
  metrics.avgScore = total / metrics.gameOvers;
}
