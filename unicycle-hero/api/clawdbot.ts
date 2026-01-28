import type { VercelRequest, VercelResponse } from "@vercel/node";

// Clawdbot API proxy - securely forwards game events to Clawdbot server on Fly.io
// This keeps tokens server-side and enables Vercel <-> Fly.io <-> Telegram communication

interface ClawdbotPayload {
  type: "gameStart" | "gameOver" | "scoreUpdate" | "achievement" | "telegram";
  payload: Record<string, unknown>;
  sessionId?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers for browser requests
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const baseUrl = process.env.CLAWDBOT_BASE_URL?.trim();
  const hooksToken = process.env.CLAWDBOT_HOOKS_TOKEN?.trim();
  const agentId = process.env.CLAWDBOT_AGENT_ID?.trim();

  if (!baseUrl || !hooksToken) {
    console.error("Missing Clawdbot configuration");
    return res.status(500).json({ error: "Server configuration error" });
  }

  try {
    const body = req.body as ClawdbotPayload;

    // Forward to Clawdbot server on Fly.io
    const clawdbotResponse = await fetch(`${baseUrl}/api/hooks/game`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${hooksToken}`,
        "X-Agent-Id": agentId || "games",
      },
      body: JSON.stringify({
        source: "unicycle-hero",
        event: body.type,
        data: body.payload,
        sessionId: body.sessionId,
        timestamp: Date.now(),
      }),
    });

    if (!clawdbotResponse.ok) {
      const errorText = await clawdbotResponse.text();
      console.error("Clawdbot error:", clawdbotResponse.status, errorText);
      return res.status(clawdbotResponse.status).json({
        error: "Clawdbot request failed",
        status: clawdbotResponse.status,
      });
    }

    const result = await clawdbotResponse.json().catch(() => ({}));
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    console.error("Clawdbot proxy error:", error);
    return res.status(500).json({ error: "Failed to connect to Clawdbot" });
  }
}
