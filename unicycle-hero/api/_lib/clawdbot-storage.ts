/**
 * Clawdbot Storage
 * In-memory storage for link codes and bot user mappings
 * NOTE: In production, use a persistent database (Redis, PostgreSQL, etc.)
 */

import { randomUUID } from "crypto";

// Link code TTL: 10 minutes
const LINK_CODE_TTL_MS = 10 * 60 * 1000;

// Types
export interface LinkCode {
  code: string;
  internalRef: string; // Internal reference (e.g., game session ID)
  scopes: string[];
  createdAt: number;
  expiresAt: number;
  used: boolean;
}

export interface BotUserMapping {
  botUserId: string;
  internalRef: string;
  scopes: string[];
  channel?: string;
  linkedAt: number;
  lastAccessedAt: number;
  metadata?: Record<string, unknown>;
}

export interface GameData {
  highScore: number;
  totalGames: number;
  lastPlayedAt: number | null;
  achievements: string[];
  recentScores: number[];
}

// In-memory stores
const linkCodes = new Map<string, LinkCode>();
const botUserMappings = new Map<string, BotUserMapping>();
const gameDataStore = new Map<string, GameData>();

/**
 * Create a new link code
 */
export function createLinkCode(internalRef: string, scopes: string[] = ["read"]): LinkCode {
  // Generate a short, user-friendly code
  const code = generateShortCode();
  const now = Date.now();

  const linkCode: LinkCode = {
    code,
    internalRef,
    scopes,
    createdAt: now,
    expiresAt: now + LINK_CODE_TTL_MS,
    used: false,
  };

  linkCodes.set(code, linkCode);

  // Schedule cleanup
  setTimeout(() => {
    const stored = linkCodes.get(code);
    if (stored && !stored.used) {
      linkCodes.delete(code);
    }
  }, LINK_CODE_TTL_MS + 1000);

  return linkCode;
}

/**
 * Redeem a link code and create bot user mapping
 */
export function redeemLinkCode(
  code: string,
  channel?: string,
  senderId?: string
): { success: true; botUserId: string; scopes: string[] } | { success: false; error: string } {
  const linkCode = linkCodes.get(code);

  if (!linkCode) {
    return { success: false, error: "Invalid or expired link code" };
  }

  if (linkCode.used) {
    return { success: false, error: "Link code already used" };
  }

  if (Date.now() > linkCode.expiresAt) {
    linkCodes.delete(code);
    return { success: false, error: "Link code expired" };
  }

  // Mark as used
  linkCode.used = true;

  // Create bot user mapping
  const botUserId = `bot_${randomUUID()}`;
  const now = Date.now();

  const mapping: BotUserMapping = {
    botUserId,
    internalRef: linkCode.internalRef,
    scopes: linkCode.scopes,
    channel,
    linkedAt: now,
    lastAccessedAt: now,
    metadata: senderId ? { senderId } : undefined,
  };

  botUserMappings.set(botUserId, mapping);

  // Clean up the used link code
  linkCodes.delete(code);

  return {
    success: true,
    botUserId,
    scopes: linkCode.scopes,
  };
}

/**
 * Get bot user mapping
 */
export function getBotUserMapping(botUserId: string): BotUserMapping | null {
  const mapping = botUserMappings.get(botUserId);

  if (!mapping) {
    return null;
  }

  // Update last accessed time
  mapping.lastAccessedAt = Date.now();

  return mapping;
}

/**
 * Check if a botUserId is an admin
 */
export function isAdminBotUser(botUserId: string): boolean {
  const adminBotUserIds = process.env.CLAWDBOT_ADMIN_BOTUSERIDS?.split(",").map((id) => id.trim()) || [];
  return adminBotUserIds.includes(botUserId);
}

/**
 * Revoke a bot user mapping
 */
export function revokeBotUser(botUserId: string): boolean {
  return botUserMappings.delete(botUserId);
}

/**
 * Store game data for an internal reference
 */
export function storeGameData(internalRef: string, data: Partial<GameData>): void {
  const existing = gameDataStore.get(internalRef) || {
    highScore: 0,
    totalGames: 0,
    lastPlayedAt: null,
    achievements: [],
    recentScores: [],
  };

  const updated: GameData = {
    highScore: Math.max(existing.highScore, data.highScore ?? 0),
    totalGames: (data.totalGames ?? existing.totalGames) + (data.totalGames ? 0 : 1),
    lastPlayedAt: data.lastPlayedAt ?? Date.now(),
    achievements: [...new Set([...existing.achievements, ...(data.achievements ?? [])])],
    recentScores: [...(data.recentScores ?? []), ...existing.recentScores].slice(0, 10),
  };

  gameDataStore.set(internalRef, updated);
}

/**
 * Get game data for an internal reference
 */
export function getGameData(internalRef: string): GameData | null {
  return gameDataStore.get(internalRef) || null;
}

/**
 * Get game data by botUserId
 */
export function getGameDataByBotUser(botUserId: string): GameData | null {
  const mapping = getBotUserMapping(botUserId);
  if (!mapping) {
    return null;
  }
  return getGameData(mapping.internalRef);
}

/**
 * Generate a short, user-friendly link code
 */
function generateShortCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Exclude confusing chars (0,O,1,I)
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/**
 * Get statistics (for debugging/monitoring)
 */
export function getStorageStats(): {
  activeLinkCodes: number;
  activeBotUsers: number;
  gameDataEntries: number;
} {
  return {
    activeLinkCodes: linkCodes.size,
    activeBotUsers: botUserMappings.size,
    gameDataEntries: gameDataStore.size,
  };
}
