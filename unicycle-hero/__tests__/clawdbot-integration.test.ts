/**
 * Clawdbot Integration Tests
 * Tests for authentication, endpoints, and data sanitization
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock environment variables
vi.stubEnv("CLAWDBOT_INTEGRATION_TOKEN", "test-secret-token-12345");
vi.stubEnv("CLAWDBOT_AGENT_ID", "games");
vi.stubEnv("CLAWDBOT_ENABLED", "true");
vi.stubEnv("CLAWDBOT_ADMIN_BOTUSERIDS", "bot_admin-uuid-1,bot_admin-uuid-2");

// Import modules after env setup
import { validateClawdbotToken, isClawdbotEnabled, getAgentId } from "../api/_lib/clawdbot-auth";
import { sanitize, isForbiddenKey, assertNoForbiddenKeys } from "../api/_lib/clawdbot-sanitizer";
import { checkRateLimit } from "../api/_lib/clawdbot-rate-limit";
import {
  createLinkCode,
  redeemLinkCode,
  getBotUserMapping,
  storeGameData,
  getGameDataByBotUser,
  isAdminBotUser,
} from "../api/_lib/clawdbot-storage";
import type { VercelRequest } from "@vercel/node";

// Mock request factory
function createMockRequest(options: {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
}): VercelRequest {
  return {
    method: options.method || "GET",
    headers: options.headers || {},
    body: options.body,
  } as VercelRequest;
}

describe("Clawdbot Authentication", () => {
  it("returns valid:true with correct token in x-clawdbot-integration-token header", () => {
    const req = createMockRequest({
      headers: { "x-clawdbot-integration-token": "test-secret-token-12345" },
    });
    const result = validateClawdbotToken(req);
    expect(result.valid).toBe(true);
  });

  it("returns valid:true with correct token in Authorization Bearer header", () => {
    const req = createMockRequest({
      headers: { authorization: "Bearer test-secret-token-12345" },
    });
    const result = validateClawdbotToken(req);
    expect(result.valid).toBe(true);
  });

  it("returns valid:true with correct token in x-clawdbot-token header", () => {
    const req = createMockRequest({
      headers: { "x-clawdbot-token": "test-secret-token-12345" },
    });
    const result = validateClawdbotToken(req);
    expect(result.valid).toBe(true);
  });

  it("returns valid:false when token is missing", () => {
    const req = createMockRequest({ headers: {} });
    const result = validateClawdbotToken(req);
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Unauthorized");
  });

  it("returns valid:false when token is wrong", () => {
    const req = createMockRequest({
      headers: { "x-clawdbot-integration-token": "wrong-token" },
    });
    const result = validateClawdbotToken(req);
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Unauthorized");
  });

  it("isClawdbotEnabled returns true when CLAWDBOT_ENABLED is true", () => {
    expect(isClawdbotEnabled()).toBe(true);
  });

  it("getAgentId returns configured agent ID", () => {
    expect(getAgentId()).toBe("games");
  });
});

describe("Clawdbot Sanitizer", () => {
  it("removes forbidden keys from objects", () => {
    const input = {
      name: "John",
      password: "secret123",
      email: "john@example.com",
      score: 100,
    };
    const result = sanitize(input);
    expect(result).toEqual({ name: "John", score: 100 });
    expect(result).not.toHaveProperty("password");
    expect(result).not.toHaveProperty("email");
  });

  it("removes userId and internal identifiers", () => {
    const input = {
      botUserId: "bot_123",
      userId: "internal_456",
      adminUserId: "admin_789",
      score: 50,
    };
    const result = sanitize(input);
    expect(result).toEqual({ botUserId: "bot_123", score: 50 });
    expect(result).not.toHaveProperty("userId");
    expect(result).not.toHaveProperty("adminUserId");
  });

  it("removes payment-related keys", () => {
    const input = {
      stripeCustomerId: "cus_123",
      cardNumber: "4242424242424242",
      paymentMethod: "pm_123",
      amount: 100,
    };
    const result = sanitize(input);
    expect(result).toEqual({ amount: 100 });
  });

  it("truncates long strings", () => {
    const longString = "a".repeat(1000);
    const result = sanitize(longString);
    expect(result.length).toBeLessThan(600);
    expect(result).toContain("[truncated]");
  });

  it("truncates long arrays", () => {
    const longArray = Array.from({ length: 100 }, (_, i) => i);
    const result = sanitize(longArray) as unknown[];
    expect(result.length).toBe(51); // 50 items + truncation message
  });

  it("handles nested objects", () => {
    const input = {
      user: {
        name: "Alice",
        password: "secret",
        preferences: {
          theme: "dark",
          email: "alice@example.com",
        },
      },
    };
    const result = sanitize(input) as { user: { name: string; preferences: { theme: string } } };
    expect(result.user.name).toBe("Alice");
    expect(result.user.preferences.theme).toBe("dark");
    expect(result.user).not.toHaveProperty("password");
    expect(result.user.preferences).not.toHaveProperty("email");
  });

  it("isForbiddenKey correctly identifies forbidden keys", () => {
    expect(isForbiddenKey("password")).toBe(true);
    expect(isForbiddenKey("PASSWORD")).toBe(true);
    expect(isForbiddenKey("email")).toBe(true);
    expect(isForbiddenKey("stripeCustomerId")).toBe(true);
    expect(isForbiddenKey("userId")).toBe(true);
    expect(isForbiddenKey("name")).toBe(false);
    expect(isForbiddenKey("score")).toBe(false);
    expect(isForbiddenKey("botUserId")).toBe(false);
  });

  it("assertNoForbiddenKeys throws on forbidden keys", () => {
    const badObject = { name: "test", password: "secret" };
    expect(() => assertNoForbiddenKeys(badObject)).toThrow("Forbidden key found: password");
  });

  it("assertNoForbiddenKeys passes on clean objects", () => {
    const cleanObject = { name: "test", score: 100, botUserId: "bot_123" };
    expect(() => assertNoForbiddenKeys(cleanObject)).not.toThrow();
  });
});

describe("Clawdbot Rate Limiter", () => {
  it("allows requests under the limit", () => {
    const req = createMockRequest({
      headers: { "x-clawdbot-token": "unique-token-for-rate-test" },
    });
    const result = checkRateLimit(req);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBeGreaterThan(0);
  });
});

describe("Clawdbot Storage - Link Codes", () => {
  it("creates a valid link code", () => {
    const linkCode = createLinkCode("internal-ref-123", ["read"]);
    expect(linkCode.code).toMatch(/^[A-Z2-9]{6}$/);
    expect(linkCode.internalRef).toBe("internal-ref-123");
    expect(linkCode.scopes).toEqual(["read"]);
    expect(linkCode.used).toBe(false);
  });

  it("redeems a link code and creates botUserId", () => {
    const linkCode = createLinkCode("game-session-456", ["read", "write"]);
    const result = redeemLinkCode(linkCode.code, "telegram", "sender123");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.botUserId).toMatch(/^bot_/);
      expect(result.scopes).toEqual(["read", "write"]);
    }
  });

  it("prevents reuse of link codes", () => {
    const linkCode = createLinkCode("session-789", ["read"]);

    // First redemption
    const first = redeemLinkCode(linkCode.code);
    expect(first.success).toBe(true);

    // Second redemption should fail
    const second = redeemLinkCode(linkCode.code);
    expect(second.success).toBe(false);
  });

  it("rejects invalid link codes", () => {
    const result = redeemLinkCode("INVALID");
    expect(result.success).toBe(false);
  });
});

describe("Clawdbot Storage - Bot User Mappings", () => {
  it("retrieves bot user mapping after link", () => {
    const linkCode = createLinkCode("session-abc", ["read"]);
    const redeemResult = redeemLinkCode(linkCode.code, "whatsapp");

    if (!redeemResult.success) {
      throw new Error("Failed to redeem link code");
    }

    const mapping = getBotUserMapping(redeemResult.botUserId);
    expect(mapping).not.toBeNull();
    expect(mapping?.botUserId).toBe(redeemResult.botUserId);
    expect(mapping?.channel).toBe("whatsapp");
  });

  it("returns null for unknown botUserId", () => {
    const mapping = getBotUserMapping("bot_nonexistent");
    expect(mapping).toBeNull();
  });
});

describe("Clawdbot Storage - Game Data", () => {
  it("stores and retrieves game data by botUserId", () => {
    // Create a linked user
    const linkCode = createLinkCode("game-player-1", ["read"]);
    const redeemResult = redeemLinkCode(linkCode.code);

    if (!redeemResult.success) {
      throw new Error("Failed to redeem link code");
    }

    // Store game data
    storeGameData("game-player-1", {
      highScore: 1500,
      totalGames: 10,
      achievements: ["first_game", "high_score_1000"],
      recentScores: [1500, 1200, 800],
    });

    // Retrieve via botUserId
    const gameData = getGameDataByBotUser(redeemResult.botUserId);
    expect(gameData).not.toBeNull();
    expect(gameData?.highScore).toBe(1500);
    expect(gameData?.achievements).toContain("first_game");
  });
});

describe("Clawdbot Admin Detection", () => {
  it("identifies admin bot users from env var", () => {
    expect(isAdminBotUser("bot_admin-uuid-1")).toBe(true);
    expect(isAdminBotUser("bot_admin-uuid-2")).toBe(true);
  });

  it("returns false for non-admin users", () => {
    expect(isAdminBotUser("bot_regular-user")).toBe(false);
    expect(isAdminBotUser("bot_unknown")).toBe(false);
  });
});

describe("Sanitizer - Complete Data Flow", () => {
  it("sanitizes complex game context without exposing PII", () => {
    const rawContext = {
      botUserId: "bot_abc123",
      internalUserId: "user_internal_456", // Should be removed
      email: "player@example.com", // Should be removed
      gameData: {
        highScore: 5000,
        password: "shouldnotexist", // Should be removed
        achievements: ["master", "speedrun"],
        sessionToken: "abc123", // Should be removed
      },
    };

    const sanitized = sanitize(rawContext);

    // Assert no forbidden keys
    assertNoForbiddenKeys(sanitized);

    // Verify safe data is preserved
    expect(sanitized).toHaveProperty("botUserId", "bot_abc123");
    expect(sanitized).toHaveProperty("gameData");

    const gameData = sanitized.gameData as Record<string, unknown>;
    expect(gameData.highScore).toBe(5000);
    expect(gameData.achievements).toEqual(["master", "speedrun"]);
  });
});

// ============================================================================
// ADMIN ENDPOINT TESTS
// ============================================================================

import {
  redactForClawdbotAdmin,
  isAdminAuthorized,
  writeAuditRecord,
  getAuditRecords,
  prepareAdminAction,
  confirmAdminAction,
  ALLOWED_ADMIN_ACTIONS,
} from "../api/_lib/clawdbot-admin";

describe("Admin Authorization", () => {
  it("allows authorized admin botUserIds", () => {
    // From vi.stubEnv: CLAWDBOT_ADMIN_BOTUSERIDS = "bot_admin-uuid-1,bot_admin-uuid-2"
    expect(isAdminAuthorized("bot_admin-uuid-1")).toBe(true);
    expect(isAdminAuthorized("bot_admin-uuid-2")).toBe(true);
  });

  it("denies unauthorized botUserIds", () => {
    expect(isAdminAuthorized("bot_regular-user")).toBe(false);
    expect(isAdminAuthorized("bot_unknown")).toBe(false);
    expect(isAdminAuthorized("")).toBe(false);
  });
});

describe("Admin Redaction", () => {
  it("redacts sensitive keys in objects", () => {
    const input = {
      name: "Test App",
      token: "secret-token-123",
      password: "hunter2",
      apiKey: "sk_live_abc123",
      email: "admin@example.com",
      score: 100,
    };

    const redacted = redactForClawdbotAdmin(input) as Record<string, unknown>;

    // Safe keys preserved
    expect(redacted.name).toBe("Test App");
    expect(redacted.score).toBe(100);

    // Sensitive keys redacted
    expect(redacted.token).toBe("***REDACTED***");
    expect(redacted.password).toBe("***REDACTED***");
    expect(redacted.apiKey).toBe("***REDACTED***");
    expect(redacted.email).toBe("***REDACTED***");
  });

  it("redacts nested sensitive data", () => {
    const input = {
      user: {
        displayName: "Alice",
        userId: "internal_123",
        settings: {
          theme: "dark",
          sessionId: "sess_abc",
        },
      },
    };

    const redacted = redactForClawdbotAdmin(input) as Record<string, unknown>;
    const user = redacted.user as Record<string, unknown>;
    const settings = user.settings as Record<string, unknown>;

    expect(user.displayName).toBe("Alice");
    expect(user.userId).toBe("***REDACTED***");
    expect(settings.theme).toBe("dark");
    expect(settings.sessionId).toBe("***REDACTED***");
  });

  it("truncates long strings", () => {
    const longString = "a".repeat(500);
    const redacted = redactForClawdbotAdmin(longString) as string;

    expect(redacted.length).toBeLessThan(500);
    expect(redacted).toContain("[redacted]");
  });

  it("truncates long arrays", () => {
    const longArray = Array.from({ length: 50 }, (_, i) => i);
    const redacted = redactForClawdbotAdmin(longArray) as unknown[];

    expect(redacted.length).toBeLessThanOrEqual(21); // 20 items + truncation message
  });

  it("handles maximum depth", () => {
    const deeplyNested = {
      level1: {
        level2: {
          level3: {
            level4: {
              level5: {
                tooDeep: "value",
              },
            },
          },
        },
      },
    };

    const redacted = redactForClawdbotAdmin(deeplyNested) as Record<string, unknown>;
    // Should not throw and should handle deep nesting
    expect(redacted).toBeDefined();
  });

  it("redacts JWT-like tokens in strings", () => {
    const jwtToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.signature";
    const redacted = redactForClawdbotAdmin(jwtToken);
    expect(redacted).toBe("***REDACTED***");
  });

  it("redacts Stripe-like keys in strings", () => {
    const stripeKey = "sk_live_abc123xyz";
    const redacted = redactForClawdbotAdmin(stripeKey);
    expect(redacted).toBe("***REDACTED***");
  });
});

describe("Admin Audit Logging", () => {
  it("writes audit records with timestamps", () => {
    const beforeCount = getAuditRecords().length;

    writeAuditRecord({
      endpoint: "/test/audit",
      action: "test_action",
      botUserId: "bot_test-user",
      result: "success",
      redactionApplied: true,
    });

    const records = getAuditRecords();
    expect(records.length).toBeGreaterThan(beforeCount);

    const latestRecord = records[0];
    expect(latestRecord.endpoint).toBe("/test/audit");
    expect(latestRecord.action).toBe("test_action");
    expect(latestRecord.botUserId).toBe("bot_test-user");
    expect(latestRecord.result).toBe("success");
    expect(latestRecord.timestamp).toBeDefined();
  });

  it("retrieves audit records with limit", () => {
    // Add multiple records
    for (let i = 0; i < 10; i++) {
      writeAuditRecord({
        endpoint: `/test/audit/${i}`,
        botUserId: "bot_test-user",
        result: "success",
        redactionApplied: true,
      });
    }

    const limited = getAuditRecords(5);
    expect(limited.length).toBeLessThanOrEqual(5);
  });
});

describe("Admin Actions - Two-Man Rule", () => {
  it("allows only whitelisted actions", () => {
    expect(ALLOWED_ADMIN_ACTIONS).toContain("clear_cache");
    expect(ALLOWED_ADMIN_ACTIONS).toContain("reset_rate_limits");
    expect(ALLOWED_ADMIN_ACTIONS).toContain("refresh_config");
    expect(ALLOWED_ADMIN_ACTIONS).not.toContain("delete_all_data");
    expect(ALLOWED_ADMIN_ACTIONS).not.toContain("shutdown");
  });

  it("rejects non-whitelisted actions in prepare step", () => {
    const result = prepareAdminAction("delete_all_data", "bot_admin-uuid-1");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("not allowed");
    }
  });

  it("successfully prepares allowed actions", () => {
    const result = prepareAdminAction("clear_cache", "bot_admin-uuid-1");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.nonce).toBeDefined();
      expect(result.nonce.length).toBe(32);
      expect(result.expiresAt).toBeGreaterThan(Date.now());
    }
  });

  it("confirms action with valid nonce", () => {
    // Step 1: Prepare
    const prepareResult = prepareAdminAction("reset_rate_limits", "bot_admin-uuid-1");
    expect(prepareResult.success).toBe(true);
    if (!prepareResult.success) return;

    // Step 2: Confirm
    const confirmResult = confirmAdminAction(
      prepareResult.nonce,
      "reset_rate_limits",
      "bot_admin-uuid-1"
    );
    expect(confirmResult.success).toBe(true);
    if (confirmResult.success) {
      expect(confirmResult.result).toContain("successfully");
    }
  });

  it("rejects confirm with invalid nonce", () => {
    const result = confirmAdminAction(
      "invalid-nonce-12345678901234567890",
      "clear_cache",
      "bot_admin-uuid-1"
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Invalid");
    }
  });

  it("rejects confirm with mismatched action", () => {
    // Prepare for clear_cache
    const prepareResult = prepareAdminAction("clear_cache", "bot_admin-uuid-1");
    expect(prepareResult.success).toBe(true);
    if (!prepareResult.success) return;

    // Try to confirm with different action
    const confirmResult = confirmAdminAction(
      prepareResult.nonce,
      "reset_rate_limits", // Different action!
      "bot_admin-uuid-1"
    );
    expect(confirmResult.success).toBe(false);
    if (!confirmResult.success) {
      expect(confirmResult.error).toContain("mismatch");
    }
  });

  it("rejects confirm with mismatched botUserId", () => {
    // Prepare with one botUserId
    const prepareResult = prepareAdminAction("refresh_config", "bot_admin-uuid-1");
    expect(prepareResult.success).toBe(true);
    if (!prepareResult.success) return;

    // Try to confirm with different botUserId
    const confirmResult = confirmAdminAction(
      prepareResult.nonce,
      "refresh_config",
      "bot_admin-uuid-2" // Different user!
    );
    expect(confirmResult.success).toBe(false);
    if (!confirmResult.success) {
      expect(confirmResult.error).toContain("mismatch");
    }
  });

  it("prevents nonce reuse", () => {
    // Prepare
    const prepareResult = prepareAdminAction("clear_cache", "bot_admin-uuid-1");
    expect(prepareResult.success).toBe(true);
    if (!prepareResult.success) return;

    // First confirm succeeds
    const firstConfirm = confirmAdminAction(
      prepareResult.nonce,
      "clear_cache",
      "bot_admin-uuid-1"
    );
    expect(firstConfirm.success).toBe(true);

    // Second confirm with same nonce fails
    const secondConfirm = confirmAdminAction(
      prepareResult.nonce,
      "clear_cache",
      "bot_admin-uuid-1"
    );
    expect(secondConfirm.success).toBe(false);
    if (!secondConfirm.success) {
      expect(secondConfirm.error).toMatch(/Invalid|used/i);
    }
  });
});

describe("Admin Response Redaction - No Forbidden Keys", () => {
  it("responses contain no token keys", () => {
    const response = redactForClawdbotAdmin({
      status: "ok",
      integrationToken: "secret",
      token: "also-secret",
      authToken: "more-secret",
    }) as Record<string, unknown>;

    expect(response.status).toBe("ok");
    expect(response.integrationToken).toBe("***REDACTED***");
    expect(response.token).toBe("***REDACTED***");
    expect(response.authToken).toBe("***REDACTED***");
  });

  it("responses contain no secret keys", () => {
    const response = redactForClawdbotAdmin({
      data: "public",
      clientSecret: "abc",
      apiSecret: "def",
      secretKey: "ghi",
    }) as Record<string, unknown>;

    expect(response.data).toBe("public");
    expect(response.clientSecret).toBe("***REDACTED***");
    expect(response.apiSecret).toBe("***REDACTED***");
    expect(response.secretKey).toBe("***REDACTED***");
  });

  it("responses contain no PII", () => {
    const response = redactForClawdbotAdmin({
      gameName: "Unicycle Hero",
      playerEmail: "player@game.com",
      phone: "555-1234",
      address: "123 Main St",
    }) as Record<string, unknown>;

    expect(response.gameName).toBe("Unicycle Hero");
    expect(response.playerEmail).toBe("***REDACTED***");
    expect(response.phone).toBe("***REDACTED***");
    expect(response.address).toBe("***REDACTED***");
  });

  it("responses contain no internal user IDs", () => {
    const response = redactForClawdbotAdmin({
      botUserId: "bot_123", // Allowed - this is the opaque ID
      userId: "internal_456",
      adminUserId: "admin_789",
      actorId: "actor_012",
      internalId: "internal_345",
    }) as Record<string, unknown>;

    // botUserId is allowed (it's the opaque identifier)
    expect(response.botUserId).toBe("bot_123");
    // Internal IDs are redacted
    expect(response.userId).toBe("***REDACTED***");
    expect(response.adminUserId).toBe("***REDACTED***");
    expect(response.actorId).toBe("***REDACTED***");
    expect(response.internalId).toBe("***REDACTED***");
  });
});
