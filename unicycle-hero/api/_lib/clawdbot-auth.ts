/**
 * Clawdbot Authentication Utilities
 * Service-to-service token validation
 */

import type { VercelRequest } from "@vercel/node";

export interface AuthResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates the Clawdbot integration token from request headers
 * Accepts multiple header formats for compatibility
 */
export function validateClawdbotToken(req: VercelRequest): AuthResult {
  const expectedToken = process.env.CLAWDBOT_INTEGRATION_TOKEN?.trim();

  if (!expectedToken) {
    console.error("[Clawdbot Auth] CLAWDBOT_INTEGRATION_TOKEN not configured");
    return { valid: false, error: "Server configuration error" };
  }

  // Check multiple header formats
  const token =
    (req.headers["x-clawdbot-integration-token"] as string) ||
    (req.headers["x-games-clawdbot-token"] as string) || // Legacy app-specific
    (req.headers["x-clawdbot-token"] as string) || // Simplified
    (req.headers["authorization"] as string)?.replace(/^Bearer\s+/i, "");

  if (!token) {
    return { valid: false, error: "Unauthorized" };
  }

  // Constant-time comparison to prevent timing attacks
  if (!secureCompare(token, expectedToken)) {
    return { valid: false, error: "Unauthorized" };
  }

  return { valid: true };
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Check if Clawdbot integration is enabled
 */
export function isClawdbotEnabled(): boolean {
  const enabled = process.env.CLAWDBOT_ENABLED;
  // Default to true if not set, false only if explicitly "false"
  return enabled !== "false";
}

/**
 * Get the Clawdbot agent ID for this app
 */
export function getAgentId(): string {
  return process.env.CLAWDBOT_AGENT_ID?.trim() || "games";
}
