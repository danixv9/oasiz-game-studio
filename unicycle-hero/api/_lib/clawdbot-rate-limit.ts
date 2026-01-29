/**
 * Clawdbot Rate Limiter
 * Simple in-memory rate limiting for serverless functions
 */

import type { VercelRequest } from "@vercel/node";

// Rate limit configuration
const WINDOW_MS = 60 * 1000; // 1 minute window
const MAX_REQUESTS_PER_WINDOW = 100; // 100 requests per minute per identifier

// In-memory store (resets on cold start - acceptable for basic protection)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Check and update rate limit for a request
 */
export function checkRateLimit(req: VercelRequest): RateLimitResult {
  const identifier = getIdentifier(req);
  const now = Date.now();

  // Get or create rate limit entry
  let entry = rateLimitStore.get(identifier);

  // Reset if window expired
  if (!entry || now >= entry.resetAt) {
    entry = {
      count: 0,
      resetAt: now + WINDOW_MS,
    };
  }

  // Increment count
  entry.count++;
  rateLimitStore.set(identifier, entry);

  // Clean up old entries periodically (every 100 checks)
  if (Math.random() < 0.01) {
    cleanupExpiredEntries();
  }

  const remaining = Math.max(0, MAX_REQUESTS_PER_WINDOW - entry.count);
  const allowed = entry.count <= MAX_REQUESTS_PER_WINDOW;

  return {
    allowed,
    remaining,
    resetAt: entry.resetAt,
  };
}

/**
 * Get rate limit identifier from request
 * Uses token hash or IP as fallback
 */
function getIdentifier(req: VercelRequest): string {
  // Prefer token-based limiting (more accurate for service-to-service)
  const token =
    (req.headers["x-clawdbot-integration-token"] as string) ||
    (req.headers["x-clawdbot-token"] as string) ||
    (req.headers["authorization"] as string);

  if (token) {
    // Hash the token for privacy
    return `token:${simpleHash(token)}`;
  }

  // Fallback to IP
  const ip =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    (req.headers["x-real-ip"] as string) ||
    "unknown";

  return `ip:${ip}`;
}

/**
 * Simple hash function for identifier creation
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Remove expired entries from the store
 */
function cleanupExpiredEntries(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now >= entry.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Get rate limit headers for response
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(MAX_REQUESTS_PER_WINDOW),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
  };
}
