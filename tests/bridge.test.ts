/**
 * Tests for mobile/lib/bridge.ts — bridge message parsing and types.
 */
import { describe, it, expect } from 'bun:test';
import {
  parseBridgeMessage,
  BRIDGE_SCRIPT,
  type BridgeMessageType,
  type BridgeMessage,
} from '../mobile/lib/bridge';

describe('parseBridgeMessage', () => {
  it('parses a valid SUBMIT_SCORE message', () => {
    const msg = parseBridgeMessage(JSON.stringify({ type: 'SUBMIT_SCORE', payload: { score: 100 } }));
    expect(msg).not.toBeNull();
    expect(msg!.type).toBe('SUBMIT_SCORE');
    expect(msg!.payload).toEqual({ score: 100 });
  });

  it('parses a valid HAPTIC message', () => {
    const msg = parseBridgeMessage(JSON.stringify({ type: 'HAPTIC', payload: { type: 'medium' } }));
    expect(msg).not.toBeNull();
    expect(msg!.type).toBe('HAPTIC');
  });

  it('parses a valid BRIDGE_LOADED message', () => {
    const msg = parseBridgeMessage(JSON.stringify({ type: 'BRIDGE_LOADED', payload: { version: 1 } }));
    expect(msg).not.toBeNull();
    expect(msg!.type).toBe('BRIDGE_LOADED');
  });

  it('parses a valid SHARE_ROOM message', () => {
    const msg = parseBridgeMessage(JSON.stringify({ type: 'SHARE_ROOM', payload: { code: 'ABC123' } }));
    expect(msg).not.toBeNull();
    expect(msg!.type).toBe('SHARE_ROOM');
    expect(msg!.payload).toEqual({ code: 'ABC123' });
  });

  it('parses a valid GAME_READY message', () => {
    const msg = parseBridgeMessage(JSON.stringify({ type: 'GAME_READY', payload: {} }));
    expect(msg).not.toBeNull();
    expect(msg!.type).toBe('GAME_READY');
  });

  it('parses a valid GAME_OVER message', () => {
    const msg = parseBridgeMessage(
      JSON.stringify({ type: 'GAME_OVER', payload: { score: 500, level: 3 } }),
    );
    expect(msg).not.toBeNull();
    expect(msg!.type).toBe('GAME_OVER');
    expect(msg!.payload).toEqual({ score: 500, level: 3 });
  });

  it('returns null for invalid JSON', () => {
    expect(parseBridgeMessage('not json')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseBridgeMessage('')).toBeNull();
  });

  it('returns null for JSON without type field', () => {
    expect(parseBridgeMessage(JSON.stringify({ payload: {} }))).toBeNull();
  });

  it('returns null for JSON with non-string type', () => {
    expect(parseBridgeMessage(JSON.stringify({ type: 123, payload: {} }))).toBeNull();
  });

  it('returns null for null-like values', () => {
    expect(parseBridgeMessage('null')).toBeNull();
    expect(parseBridgeMessage('undefined')).toBeNull();
  });
});

describe('BRIDGE_SCRIPT', () => {
  it('is a non-empty string', () => {
    expect(typeof BRIDGE_SCRIPT).toBe('string');
    expect(BRIDGE_SCRIPT.length).toBeGreaterThan(100);
  });

  it('defines window.submitScore', () => {
    expect(BRIDGE_SCRIPT).toContain('window.submitScore');
  });

  it('defines window.triggerHaptic', () => {
    expect(BRIDGE_SCRIPT).toContain('window.triggerHaptic');
  });

  it('defines window.shareRoomCode', () => {
    expect(BRIDGE_SCRIPT).toContain('window.shareRoomCode');
  });

  it('defines window.notifyGameReady', () => {
    expect(BRIDGE_SCRIPT).toContain('window.notifyGameReady');
  });

  it('defines window.notifyGameOver', () => {
    expect(BRIDGE_SCRIPT).toContain('window.notifyGameOver');
  });

  it('includes double-injection guard', () => {
    expect(BRIDGE_SCRIPT).toContain('__OASIZ_BRIDGE_READY__');
  });

  it('sends BRIDGE_LOADED on init', () => {
    expect(BRIDGE_SCRIPT).toContain("'BRIDGE_LOADED'");
  });

  it('uses ReactNativeWebView.postMessage', () => {
    expect(BRIDGE_SCRIPT).toContain('ReactNativeWebView.postMessage');
  });
});
