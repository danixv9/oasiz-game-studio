/**
 * Clawdbot Data Sanitizer
 * Ensures no PII or sensitive data is exposed to external services
 */

// Keys that must NEVER be exposed (case-insensitive matching)
const FORBIDDEN_KEY_PATTERNS = [
  // Authentication & Sessions
  /password/i,
  /token/i,
  /secret/i,
  /cookie/i,
  /authorization/i,
  /session/i,
  /jwt/i,
  /apikey/i,
  /api_key/i,

  // PII
  /email/i,
  /phone/i,
  /address/i,
  /ssn/i,
  /social.*security/i,
  /birth.*date/i,
  /dob/i,

  // Payment & Financial
  /stripe/i,
  /customer/i,
  /payment/i,
  /card/i,
  /credit/i,
  /debit/i,
  /bank/i,
  /account.*number/i,

  // Internal Identifiers (must use botUserId instead)
  /^userId$/i,
  /^user_id$/i,
  /adminUserId/i,
  /actorId/i,
  /responderId/i,
  /internalId/i,
  /internal_id/i,
  /privateId/i,

  // Network & Technical
  /^ip$/i,
  /ip.*address/i,
  /remote.*addr/i,
];

// Maximum lengths for sanitized output
const MAX_STRING_LENGTH = 500;
const MAX_ARRAY_LENGTH = 50;
const MAX_OBJECT_DEPTH = 5;

/**
 * Sanitize any data structure for safe external exposure
 */
export function sanitize<T>(data: T, depth = 0): T {
  if (depth > MAX_OBJECT_DEPTH) {
    return "[MAX_DEPTH_EXCEEDED]" as unknown as T;
  }

  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === "string") {
    return truncateString(data) as unknown as T;
  }

  if (typeof data === "number" || typeof data === "boolean") {
    return data;
  }

  if (Array.isArray(data)) {
    const sanitizedArray = data.slice(0, MAX_ARRAY_LENGTH).map((item) => sanitize(item, depth + 1));
    if (data.length > MAX_ARRAY_LENGTH) {
      sanitizedArray.push(`[...${data.length - MAX_ARRAY_LENGTH} more items]` as unknown);
    }
    return sanitizedArray as unknown as T;
  }

  if (typeof data === "object") {
    const sanitizedObj: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      // Skip forbidden keys
      if (isForbiddenKey(key)) {
        continue;
      }

      sanitizedObj[key] = sanitize(value, depth + 1);
    }

    return sanitizedObj as unknown as T;
  }

  // For functions, symbols, etc. - don't expose
  return "[REDACTED]" as unknown as T;
}

/**
 * Check if a key matches any forbidden pattern
 */
export function isForbiddenKey(key: string): boolean {
  return FORBIDDEN_KEY_PATTERNS.some((pattern) => pattern.test(key));
}

/**
 * Truncate strings to maximum length
 */
function truncateString(str: string): string {
  if (str.length <= MAX_STRING_LENGTH) {
    return str;
  }
  return str.slice(0, MAX_STRING_LENGTH) + "...[truncated]";
}

/**
 * Create a sanitized summary object with safe defaults
 */
export function createSanitizedSummary(data: {
  totalGames?: number;
  highScore?: number;
  lastPlayedAt?: Date | string | null;
  achievements?: string[];
}): Record<string, unknown> {
  return sanitize({
    totalGames: data.totalGames ?? 0,
    highScore: data.highScore ?? 0,
    lastPlayedAt: data.lastPlayedAt ? new Date(data.lastPlayedAt).toISOString() : null,
    achievements: data.achievements ?? [],
  });
}

/**
 * Validate that an object contains no forbidden keys (for testing)
 */
export function assertNoForbiddenKeys(obj: unknown, path = ""): void {
  if (obj === null || obj === undefined || typeof obj !== "object") {
    return;
  }

  if (Array.isArray(obj)) {
    obj.forEach((item, index) => assertNoForbiddenKeys(item, `${path}[${index}]`));
    return;
  }

  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const currentPath = path ? `${path}.${key}` : key;

    if (isForbiddenKey(key)) {
      throw new Error(`Forbidden key found: ${currentPath}`);
    }

    assertNoForbiddenKeys(value, currentPath);
  }
}
