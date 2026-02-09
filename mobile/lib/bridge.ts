/**
 * JavaScript code injected into the game WebView before the game loads.
 *
 * Bridges the platform API functions (window.submitScore, window.triggerHaptic, etc.)
 * to React Native via postMessage. The WebView's onMessage handler picks these up
 * and calls native Expo modules (expo-haptics, AsyncStorage, etc.).
 */
export const BRIDGE_SCRIPT = `
(function() {
  // Prevent double-injection
  if (window.__OASIZ_BRIDGE_READY__) return;
  window.__OASIZ_BRIDGE_READY__ = true;

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
