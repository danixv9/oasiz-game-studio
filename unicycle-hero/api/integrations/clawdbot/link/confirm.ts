/**
 * POST /api/integrations/clawdbot/link/confirm
 * Redeems a link code and creates an opaque botUserId mapping
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { validateClawdbotToken } from "../../../_lib/clawdbot-auth";
import { checkRateLimit, getRateLimitHeaders } from "../../../_lib/clawdbot-rate-limit";
import { redeemLinkCode } from "../../../_lib/clawdbot-storage";

interface LinkConfirmRequest {
  linkCode: string;
  channel?: string;
  senderId?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // No CORS for server-to-server endpoints
  res.setHeader("Content-Type", "application/json");

  // Only allow POST
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  // Rate limiting (stricter for link confirmation to prevent brute force)
  const rateLimit = checkRateLimit(req);
  const rateLimitHeaders = getRateLimitHeaders(rateLimit);
  Object.entries(rateLimitHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  if (!rateLimit.allowed) {
    return res.status(429).json({ success: false, error: "Too many requests" });
  }

  // Authenticate
  const auth = validateClawdbotToken(req);
  if (!auth.valid) {
    return res.status(401).json({ success: false, error: auth.error || "Unauthorized" });
  }

  // Validate request body
  const body = req.body as LinkConfirmRequest;

  if (!body || typeof body !== "object") {
    return res.status(400).json({ success: false, error: "Invalid request body" });
  }

  if (typeof body.linkCode !== "string" || !body.linkCode) {
    return res.status(400).json({ success: false, error: "linkCode is required" });
  }

  // Validate linkCode format (6 alphanumeric chars)
  const linkCodePattern = /^[A-Z2-9]{6}$/;
  if (!linkCodePattern.test(body.linkCode.toUpperCase())) {
    return res.status(400).json({ success: false, error: "Invalid link code format" });
  }

  // Validate optional fields
  if (body.channel !== undefined && typeof body.channel !== "string") {
    return res.status(400).json({ success: false, error: "Invalid channel format" });
  }

  if (body.senderId !== undefined && typeof body.senderId !== "string") {
    return res.status(400).json({ success: false, error: "Invalid senderId format" });
  }

  // Attempt to redeem the link code
  const result = redeemLinkCode(
    body.linkCode.toUpperCase(),
    body.channel,
    body.senderId
  );

  if (!result.success) {
    // Return 400 for invalid/expired codes (not 404 to prevent enumeration)
    return res.status(400).json({ success: false, error: result.error });
  }

  // Return the new botUserId (opaque, no internal IDs exposed)
  return res.status(200).json({
    success: true,
    botUserId: result.botUserId,
    scopes: result.scopes,
  });
}
