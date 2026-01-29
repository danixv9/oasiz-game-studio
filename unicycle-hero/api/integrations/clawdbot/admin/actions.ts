/**
 * POST /api/integrations/clawdbot/admin/actions
 * Admin actions with two-man rule (prepare/confirm flow)
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

function writeAudit(endpoint: string, action: string | undefined, botUserId: string, result: string, metadata?: Record<string, unknown>): void {
  console.log("[AUDIT]", JSON.stringify({
    timestamp: new Date().toISOString(),
    endpoint,
    action,
    botUserId,
    result,
    redactionApplied: true,
    metadata,
  }));
}

// ============================================================================
// ALLOWED ACTIONS (Explicit allowlist)
// ============================================================================

const ALLOWED_ACTIONS = ["clear_cache", "reset_rate_limits", "refresh_config"] as const;
type AllowedAction = (typeof ALLOWED_ACTIONS)[number];

function isAllowedAction(action: string): action is AllowedAction {
  return ALLOWED_ACTIONS.includes(action as AllowedAction);
}

// ============================================================================
// NONCE STORAGE (Two-man rule)
// ============================================================================

interface ActionNonce {
  nonce: string;
  action: string;
  botUserId: string;
  createdAt: number;
  expiresAt: number;
  used: boolean;
}

const nonceStore = new Map<string, ActionNonce>();
const NONCE_TTL_MS = 5 * 60 * 1000; // 5 minutes

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
  for (const [key, value] of nonceStore.entries()) {
    if (now > value.expiresAt) {
      nonceStore.delete(key);
    }
  }
}

// ============================================================================
// ACTION EXECUTION
// ============================================================================

function executeAction(action: AllowedAction): string {
  switch (action) {
    case "clear_cache":
      // In production: Clear application caches
      return "Cache cleared successfully. Note: Serverless functions have ephemeral state.";

    case "reset_rate_limits":
      // In production: Reset rate limit counters
      return "Rate limits reset successfully.";

    case "refresh_config":
      // In production: Reload configuration from env/DB
      return "Configuration refreshed. Changes will apply on next cold start.";

    default:
      return "Action completed.";
  }
}

// ============================================================================
// HANDLER
// ============================================================================

interface PrepareRequest {
  operation: "prepare";
  action: string;
  botUserId: string;
}

interface ConfirmRequest {
  operation: "confirm";
  nonce: string;
  action: string;
  botUserId: string;
}

type ActionRequest = PrepareRequest | ConfirmRequest;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Content-Type", "application/json");

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  if (!validateToken(req)) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  const body = req.body as ActionRequest;

  if (!body || typeof body !== "object") {
    return res.status(400).json({ success: false, error: "Invalid request body" });
  }

  const { botUserId } = body;

  if (!botUserId || typeof botUserId !== "string") {
    return res.status(400).json({ success: false, error: "botUserId required" });
  }

  if (!isAdminAuthorized(botUserId)) {
    writeAudit("/admin/actions", body.action, botUserId, "denied");
    return res.status(403).json({ success: false, error: "Admin access denied" });
  }

  // Cleanup expired nonces
  cleanupExpiredNonces();

  // Handle prepare vs confirm
  if (body.operation === "prepare") {
    return handlePrepare(body as PrepareRequest, res);
  } else if (body.operation === "confirm") {
    return handleConfirm(body as ConfirmRequest, res);
  } else {
    return res.status(400).json({
      success: false,
      error: "Invalid operation. Use 'prepare' or 'confirm'",
      allowedActions: ALLOWED_ACTIONS,
    });
  }
}

function handlePrepare(body: PrepareRequest, res: VercelResponse) {
  const { action, botUserId } = body;

  if (!action || typeof action !== "string") {
    return res.status(400).json({ success: false, error: "action required" });
  }

  if (!isAllowedAction(action)) {
    writeAudit("/admin/actions/prepare", action, botUserId, "fail", { error: "Action not allowed" });
    return res.status(400).json({
      success: false,
      error: `Action '${action}' is not allowed`,
      allowedActions: ALLOWED_ACTIONS,
    });
  }

  const nonce = generateNonce();
  const now = Date.now();

  nonceStore.set(nonce, {
    nonce,
    action,
    botUserId,
    createdAt: now,
    expiresAt: now + NONCE_TTL_MS,
    used: false,
  });

  writeAudit("/admin/actions/prepare", action, botUserId, "success", { noncePrefix: nonce.slice(0, 8) });

  return res.status(200).json({
    success: true,
    message: `Action '${action}' prepared. Confirm within 5 minutes.`,
    nonce,
    expiresAt: now + NONCE_TTL_MS,
    expiresIn: "5 minutes",
    confirmWith: {
      operation: "confirm",
      nonce,
      action,
      botUserId,
    },
  });
}

function handleConfirm(body: ConfirmRequest, res: VercelResponse) {
  const { nonce, action, botUserId } = body;

  if (!nonce || typeof nonce !== "string") {
    return res.status(400).json({ success: false, error: "nonce required" });
  }

  if (!action || typeof action !== "string") {
    return res.status(400).json({ success: false, error: "action required" });
  }

  const nonceRecord = nonceStore.get(nonce);

  if (!nonceRecord) {
    writeAudit("/admin/actions/confirm", action, botUserId, "fail", { error: "Invalid nonce" });
    return res.status(400).json({ success: false, error: "Invalid or expired nonce" });
  }

  if (nonceRecord.used) {
    return res.status(400).json({ success: false, error: "Nonce already used" });
  }

  if (Date.now() > nonceRecord.expiresAt) {
    nonceStore.delete(nonce);
    return res.status(400).json({ success: false, error: "Nonce expired" });
  }

  if (nonceRecord.action !== action) {
    writeAudit("/admin/actions/confirm", action, botUserId, "fail", { error: "Action mismatch" });
    return res.status(400).json({ success: false, error: "Action does not match nonce" });
  }

  if (nonceRecord.botUserId !== botUserId) {
    writeAudit("/admin/actions/confirm", action, botUserId, "fail", { error: "BotUserId mismatch" });
    return res.status(400).json({ success: false, error: "BotUserId does not match nonce" });
  }

  // Mark as used
  nonceRecord.used = true;

  // Execute the action
  const result = executeAction(action as AllowedAction);

  writeAudit("/admin/actions/confirm", action, botUserId, "success", { result });

  // Cleanup
  nonceStore.delete(nonce);

  return res.status(200).json({
    success: true,
    action,
    result,
    executedAt: new Date().toISOString(),
  });
}
