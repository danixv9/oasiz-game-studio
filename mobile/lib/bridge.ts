/**
 * JavaScript code injected into the game WebView before the game loads.
 *
 * Bridges the platform API functions (window.submitScore, window.triggerHaptic, etc.)
 * to React Native via postMessage. The WebView's onMessage handler picks these up
 * and calls native Expo modules (expo-haptics, AsyncStorage, etc.).
 */
/**
 * Creates the bridge script with user settings injected.
 * Settings are read from AsyncStorage before WebView loads.
 */
export function createBridgeScript(settings?: { sound?: boolean; music?: boolean; haptics?: boolean }): string {
  const s = settings || { sound: true, music: true, haptics: true };
  return `
(function() {
  // Prevent double-injection
  if (window.__OASIZ_BRIDGE_READY__) return;
  window.__OASIZ_BRIDGE_READY__ = true;

  // User preferences injected from native settings
  window.__OASIZ_SETTINGS__ = {
    sound: ${s.sound !== false},
    music: ${s.music !== false},
    haptics: ${s.haptics !== false}
  };

  function postToNative(type, payload) {
    try {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: type, payload: payload }));
    } catch (e) {
      // Fallback: running outside native shell (e.g. browser dev)
      console.log('[OasizBridge]', type, payload);
    }
  }

  // --- Score Submission ---
  window.submitScore = function(score) {
    postToNative('SUBMIT_SCORE', { score: score });
  };

  // --- Haptic Feedback ---
  // Maps: "light" | "medium" | "heavy" | "success" | "error"
  window.triggerHaptic = function(type) {
    if (!window.__OASIZ_SETTINGS__.haptics) return;
    postToNative('HAPTIC', { type: type || 'medium' });
  };

  // --- Share Room Code (multiplayer) ---
  window.shareRoomCode = function(code) {
    postToNative('SHARE_ROOM', { code: code });
  };

  // --- Game Lifecycle ---
  window.notifyGameReady = function() {
    postToNative('GAME_READY', {});
  };

  window.notifyGameOver = function(data) {
    postToNative('GAME_OVER', data || {});
  };

  // --- Prevent default touch behaviors that break games ---
  document.addEventListener('gesturestart', function(e) { e.preventDefault(); }, { passive: false });

  // Notify native that bridge is loaded
  postToNative('BRIDGE_LOADED', { version: 1 });
})();
`;
}

/** Static bridge script with default settings (all enabled) for backward compatibility */
export const BRIDGE_SCRIPT = createBridgeScript();

/**
 * Message types that can arrive from the WebView.
 */
export type BridgeMessageType =
  | 'BRIDGE_LOADED'
  | 'SUBMIT_SCORE'
  | 'HAPTIC'
  | 'SHARE_ROOM'
  | 'GAME_READY'
  | 'GAME_OVER';

export interface BridgeMessage {
  type: BridgeMessageType;
  payload: Record<string, unknown>;
}

export function parseBridgeMessage(data: string): BridgeMessage | null {
  try {
    const msg = JSON.parse(data);
    if (msg && typeof msg.type === 'string') {
      return msg as BridgeMessage;
    }
  } catch {
    // Not a bridge message — ignore
  }
  return null;
}
