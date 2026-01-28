import type { VercelRequest, VercelResponse } from "@vercel/node";

// Clawdbot Webhook Receiver - receives commands FROM Clawdbot (Fly.io)
// Flow: Telegram -> Clawdbot (Fly.io) -> This API (Vercel)
//
// Clawdbot uses GAMES_BASE_URL + GAMES_CLAWDBOT_INTEGRATION_TOKEN to call us

interface ClawdbotWebhook {
  action: string;
  chatId?: string;
  userId?: string;
  username?: string;
  message?: string;
  data?: Record<string, unknown>;
  timestamp?: number;
}

// In-memory game state (for demo - use database in production)
const gameState: Record<string, { score: number; lastPlayed: number }> = {};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Clawdbot-Token",
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // GET request - health check / game info
  if (req.method === "GET") {
    return res.status(200).json({
      game: "unicycle-hero",
      version: "1.0.0",
      status: "online",
      endpoints: {
        webhook: "POST /api/clawdbot",
        health: "GET /api/clawdbot",
      },
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Validate integration token from Clawdbot
  const integrationToken = process.env.CLAWDBOT_INTEGRATION_TOKEN?.trim();
  const incomingToken =
    req.headers["x-clawdbot-token"] ||
    req.headers["authorization"]?.replace("Bearer ", "");

  // Allow requests from game client (no token) or from Clawdbot (with token)
  const isFromClawdbot = incomingToken && incomingToken === integrationToken;
  const isFromGameClient = !incomingToken;

  try {
    const body = req.body as ClawdbotWebhook;

    // Handle game client events (score updates, etc.)
    if (isFromGameClient && body.action) {
      return handleGameEvent(body, res);
    }

    // Handle Clawdbot/Telegram commands
    if (isFromClawdbot) {
      return handleClawdbotCommand(body, res);
    }

    // Invalid token
    if (incomingToken && !isFromClawdbot) {
      return res.status(401).json({ error: "Invalid integration token" });
    }

    return res.status(400).json({ error: "Invalid request" });
  } catch (error) {
    console.error("Webhook error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// Handle events from the game client
function handleGameEvent(body: ClawdbotWebhook, res: VercelResponse) {
  const { action, data } = body;

  switch (action) {
    case "gameStart":
      return res.status(200).json({ success: true, message: "Game started" });

    case "gameOver":
      const score = (data?.score as number) || 0;
      const sessionId = (data?.sessionId as string) || "anonymous";
      gameState[sessionId] = { score, lastPlayed: Date.now() };
      return res.status(200).json({
        success: true,
        message: "Score recorded",
        score,
      });

    case "scoreUpdate":
      return res.status(200).json({ success: true });

    default:
      return res.status(200).json({ success: true, action });
  }
}

// Handle commands from Clawdbot (Telegram)
function handleClawdbotCommand(body: ClawdbotWebhook, res: VercelResponse) {
  const { action, chatId, username } = body;

  switch (action) {
    case "getGameInfo":
      return res.status(200).json({
        success: true,
        response: {
          type: "text",
          message:
            "🎮 **Unicycle Hero**\n\n" +
            "Balance on a unicycle and ride as far as you can!\n\n" +
            "🎯 Controls:\n" +
            "• Mobile: Tap left/right to balance\n" +
            "• Desktop: A/D or arrow keys\n\n" +
            "🔗 Play now: https://unicycle-hero-self.vercel.app",
        },
      });

    case "getLeaderboard":
      const scores = Object.entries(gameState)
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);

      const leaderboardText =
        scores.length > 0
          ? scores.map((s, i) => `${i + 1}. ${s.id}: ${s.score}`).join("\n")
          : "No scores yet! Be the first to play.";

      return res.status(200).json({
        success: true,
        response: {
          type: "text",
          message: `🏆 **Unicycle Hero Leaderboard**\n\n${leaderboardText}`,
        },
      });

    case "getScore":
      const userId = username || chatId || "unknown";
      const userScore = gameState[userId]?.score || 0;
      return res.status(200).json({
        success: true,
        response: {
          type: "text",
          message: `🎮 Your best score: ${userScore} points`,
        },
      });

    case "startGame":
      return res.status(200).json({
        success: true,
        response: {
          type: "text",
          message:
            "🚀 Ready to play?\n\n" +
            "👉 https://unicycle-hero-self.vercel.app\n\n" +
            "Good luck! 🎮",
        },
      });

    case "ping":
      return res.status(200).json({
        success: true,
        response: {
          type: "text",
          message: "🏓 Pong! Unicycle Hero is online.",
        },
      });

    default:
      return res.status(200).json({
        success: true,
        response: {
          type: "text",
          message:
            "🎮 Unicycle Hero Commands:\n" +
            "• /game - Game info\n" +
            "• /play - Start playing\n" +
            "• /score - Your score\n" +
            "• /leaderboard - Top scores",
        },
      });
  }
}
