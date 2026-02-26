type InsertCoinOptions = {
  skipLobby?: boolean;
  maxPlayersPerRoom?: number;
  roomCode?: string;
  defaultPlayerStates?: Record<string, unknown>;
  [key: string]: unknown;
};

type PlayerProfile = {
  name?: string;
  color?: string;
  photo?: string;
};

export type PlayerState = {
  id: string;
  getState: (key: string) => unknown;
  setState: (key: string, value: unknown, reliable?: boolean) => void;
  onQuit: (callback: () => void) => void;
  getProfile: () => PlayerProfile | null;
};

type PlayroomGlobal = {
  insertCoin: (options: InsertCoinOptions) => Promise<void>;
  getRoomCode: () => string | null;
  myPlayer: () => PlayerState | null;
  onPlayerJoin: (callback: (player: PlayerState) => void) => void;
  isHost: () => boolean;
  getState: (key: string) => unknown;
  setState: (key: string, value: unknown, reliable?: boolean) => void;
};

declare global {
  interface Window {
    Playroom?: PlayroomGlobal;
  }
}

function getPlayroom(): PlayroomGlobal {
  if (!window.Playroom) {
    throw new Error("[Playroom] UMD runtime is not loaded");
  }
  return window.Playroom;
}

export function insertCoin(options: InsertCoinOptions): Promise<void> {
  return getPlayroom().insertCoin(options);
}

export function getRoomCode(): string | null {
  return getPlayroom().getRoomCode();
}

export function myPlayer(): PlayerState | null {
  return getPlayroom().myPlayer();
}

export function onPlayerJoin(callback: (player: PlayerState) => void): void {
  getPlayroom().onPlayerJoin(callback);
}

export function isHost(): boolean {
  return getPlayroom().isHost();
}

export function getState(key: string): unknown {
  return getPlayroom().getState(key);
}

export function setState(key: string, value: unknown, reliable?: boolean): void {
  getPlayroom().setState(key, value, reliable);
}
