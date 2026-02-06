import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  favorites: 'oasiz:favorites',
  scores: 'oasiz:scores',
  settings: 'oasiz:settings',
  playCount: 'oasiz:playcount',
};

export interface AppSettings {
  hapticsEnabled: boolean;
  soundEnabled: boolean;
  musicEnabled: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  hapticsEnabled: true,
  soundEnabled: true,
  musicEnabled: true,
};

// --- Favorites ---

export async function getFavorites(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(KEYS.favorites);
  return raw ? JSON.parse(raw) : [];
}

export async function toggleFavorite(gameId: string): Promise<boolean> {
  const favs = await getFavorites();
  const idx = favs.indexOf(gameId);
  if (idx >= 0) {
    favs.splice(idx, 1);
  } else {
    favs.push(gameId);
  }
  await AsyncStorage.setItem(KEYS.favorites, JSON.stringify(favs));
  return idx < 0; // returns true if added, false if removed
}

export async function isFavorite(gameId: string): Promise<boolean> {
  const favs = await getFavorites();
  return favs.includes(gameId);
}

// --- High Scores ---

export async function getHighScore(gameId: string): Promise<number> {
  const raw = await AsyncStorage.getItem(KEYS.scores);
  const scores: Record<string, number> = raw ? JSON.parse(raw) : {};
  return scores[gameId] || 0;
}

export async function saveHighScore(
  gameId: string,
  score: number
): Promise<boolean> {
  const raw = await AsyncStorage.getItem(KEYS.scores);
  const scores: Record<string, number> = raw ? JSON.parse(raw) : {};
  const isNewHigh = score > (scores[gameId] || 0);
  if (isNewHigh) {
    scores[gameId] = score;
    await AsyncStorage.setItem(KEYS.scores, JSON.stringify(scores));
  }
  return isNewHigh;
}

export async function getAllHighScores(): Promise<Record<string, number>> {
  const raw = await AsyncStorage.getItem(KEYS.scores);
  return raw ? JSON.parse(raw) : {};
}

// --- Play Count ---

export async function incrementPlayCount(gameId: string): Promise<number> {
  const raw = await AsyncStorage.getItem(KEYS.playCount);
  const counts: Record<string, number> = raw ? JSON.parse(raw) : {};
  counts[gameId] = (counts[gameId] || 0) + 1;
  await AsyncStorage.setItem(KEYS.playCount, JSON.stringify(counts));
  return counts[gameId];
}

export async function getPlayCounts(): Promise<Record<string, number>> {
  const raw = await AsyncStorage.getItem(KEYS.playCount);
  return raw ? JSON.parse(raw) : {};
}

// --- Settings ---

export async function getSettings(): Promise<AppSettings> {
  const raw = await AsyncStorage.getItem(KEYS.settings);
  return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await AsyncStorage.setItem(KEYS.settings, JSON.stringify(settings));
}
