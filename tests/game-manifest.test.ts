/**
 * Tests for mobile/lib/games.ts — game manifest, helper functions,
 * and consistency with the actual game directories on disk.
 */
import { describe, it, expect } from 'bun:test';
import { readdirSync, existsSync, statSync } from 'fs';
import { join, resolve } from 'path';

// We import the actual source file
import {
  GAMES,
  CATEGORIES,
  getGameUrl,
  getGameById,
  getGamesByCategory,
  getFeaturedGames,
  type Game,
  type GameCategory,
} from '../mobile/lib/games';

const ROOT = resolve(__dirname, '..');
const SKIP_DIRS = new Set(['mobile', 'template', 'node_modules', '.github', 'tests', 'unfinished-games']);

describe('GAMES manifest', () => {
  it('contains at least 10 games', () => {
    expect(GAMES.length).toBeGreaterThanOrEqual(10);
  });

  it('every game has required fields', () => {
    for (const game of GAMES) {
      expect(game.id, `${game.id} missing id`).toBeTruthy();
      expect(game.title, `${game.id} missing title`).toBeTruthy();
      expect(game.description, `${game.id} missing description`).toBeTruthy();
      expect(game.category, `${game.id} missing category`).toBeTruthy();
      expect(game.icon, `${game.id} missing icon`).toBeTruthy();
      expect(game.gradient, `${game.id} missing gradient`).toBeDefined();
      expect(game.gradient.length, `${game.id} gradient should have 2 colors`).toBe(2);
    }
  });

  it('all game IDs are unique', () => {
    const ids = GAMES.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all game titles are unique', () => {
    const titles = GAMES.map((g) => g.title);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it('gradient colors are valid hex', () => {
    const hexPattern = /^#[0-9A-Fa-f]{6}$/;
    for (const game of GAMES) {
      expect(game.gradient[0], `${game.id} gradient[0]`).toMatch(hexPattern);
      expect(game.gradient[1], `${game.id} gradient[1]`).toMatch(hexPattern);
    }
  });

  it('categories are from the allowed set', () => {
    const validCategories = CATEGORIES.map((c) => c.key).filter((k) => k !== 'all');
    for (const game of GAMES) {
      expect(validCategories, `${game.id} has invalid category "${game.category}"`).toContain(
        game.category,
      );
    }
  });
});

describe('CATEGORIES', () => {
  it('includes "all" as first entry', () => {
    expect(CATEGORIES[0].key).toBe('all');
  });

  it('has unique keys', () => {
    const keys = CATEGORIES.map((c) => c.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('every category used by a game exists in CATEGORIES', () => {
    const categoryKeys = new Set(CATEGORIES.map((c) => c.key));
    for (const game of GAMES) {
      expect(categoryKeys, `category "${game.category}" not in CATEGORIES`).toContain(game.category);
    }
  });
});

describe('getGameUrl', () => {
  it('returns the correct CDN URL', () => {
    const game = GAMES[0];
    const url = getGameUrl(game);
    expect(url).toBe(`https://assets.oasiz.ai/${game.id}/`);
  });

  it('includes trailing slash', () => {
    const url = getGameUrl(GAMES[0]);
    expect(url.endsWith('/')).toBe(true);
  });
});

describe('getGameById', () => {
  it('finds an existing game by ID', () => {
    const game = getGameById('block-blast');
    expect(game).toBeDefined();
    expect(game!.title).toBe('Block Blast');
  });

  it('returns undefined for non-existent ID', () => {
    expect(getGameById('does-not-exist')).toBeUndefined();
  });

  it('returns correct game for every ID in manifest', () => {
    for (const game of GAMES) {
      const found = getGameById(game.id);
      expect(found).toBeDefined();
      expect(found!.id).toBe(game.id);
    }
  });
});

describe('getGamesByCategory', () => {
  it('"all" returns all games', () => {
    const result = getGamesByCategory('all');
    expect(result.length).toBe(GAMES.length);
  });

  it('filters by category correctly', () => {
    const puzzleGames = getGamesByCategory('puzzle');
    expect(puzzleGames.length).toBeGreaterThan(0);
    for (const game of puzzleGames) {
      expect(game.category).toBe('puzzle');
    }
  });

  it('returns empty for category with no games', () => {
    // All valid categories should have at least one game, but the function should handle gracefully
    const result = getGamesByCategory('nonexistent' as GameCategory);
    expect(result).toEqual([]);
  });
});

describe('getFeaturedGames', () => {
  it('returns only games with isFeatured=true', () => {
    const featured = getFeaturedGames();
    expect(featured.length).toBeGreaterThan(0);
    for (const game of featured) {
      expect(game.isFeatured).toBe(true);
    }
  });

  it('returns a subset of all games', () => {
    const featured = getFeaturedGames();
    expect(featured.length).toBeLessThan(GAMES.length);
  });
});

describe('game manifest ↔ disk consistency', () => {
  const publishedDirs = readdirSync(ROOT).filter((name) => {
    if (SKIP_DIRS.has(name) || name.startsWith('.')) return false;
    const fullPath = join(ROOT, name);
    return statSync(fullPath).isDirectory() && existsSync(join(fullPath, 'publish.json'));
  });

  it('every game in manifest has a directory with publish.json', () => {
    for (const game of GAMES) {
      const dirExists = existsSync(join(ROOT, game.id));
      const publishExists = existsSync(join(ROOT, game.id, 'publish.json'));
      expect(dirExists, `directory missing for game "${game.id}"`).toBe(true);
      expect(publishExists, `publish.json missing for game "${game.id}"`).toBe(true);
    }
  });

  it('every published game directory is in the manifest', () => {
    const manifestIds = new Set(GAMES.map((g) => g.id));
    for (const dir of publishedDirs) {
      expect(manifestIds, `game "${dir}" has publish.json but is not in mobile manifest`).toContain(dir);
    }
  });
});
