/**
 * Validates publish.json schema across all game directories.
 * Ensures every published game has required fields with correct types/formats.
 */
import { describe, it, expect } from 'bun:test';
import { readdirSync, readFileSync, existsSync, statSync } from 'fs';
import { join, resolve } from 'path';

const ROOT = resolve(__dirname, '..');
const SKIP_DIRS = new Set(['mobile', 'template', 'node_modules', '.github', 'tests', 'unfinished-games']);

const VALID_CATEGORIES = ['arcade', 'puzzle', 'action', 'casual', 'party', 'physics'];
const VALID_AGE_RATINGS = ['4+', '9+', '12+', '17+'];

interface PublishJson {
  title: string;
  description: string;
  category: string;
  gameId: string;
  bundleId?: string;
  version?: string;
  ageRating?: string;
  standalone?: boolean;
}

function getGameDirs(): string[] {
  return readdirSync(ROOT)
    .filter((name) => {
      if (SKIP_DIRS.has(name) || name.startsWith('.')) return false;
      const fullPath = join(ROOT, name);
      return statSync(fullPath).isDirectory() && existsSync(join(fullPath, 'publish.json'));
    });
}

function readPublishJson(gameDir: string): PublishJson {
  const content = readFileSync(join(ROOT, gameDir, 'publish.json'), 'utf-8');
  return JSON.parse(content);
}

describe('publish.json validation', () => {
  const gameDirs = getGameDirs();

  it('at least one game has publish.json', () => {
    expect(gameDirs.length).toBeGreaterThan(0);
  });

  describe.each(gameDirs)('%s/publish.json', (gameDir) => {
    const publish = readPublishJson(gameDir);

    it('has a non-empty title', () => {
      expect(publish.title).toBeDefined();
      expect(typeof publish.title).toBe('string');
      expect(publish.title.trim().length).toBeGreaterThan(0);
    });

    it('has a non-empty description', () => {
      expect(publish.description).toBeDefined();
      expect(typeof publish.description).toBe('string');
      expect(publish.description.trim().length).toBeGreaterThan(0);
    });

    it('has a valid category', () => {
      expect(publish.category).toBeDefined();
      expect(VALID_CATEGORIES).toContain(publish.category);
    });

    it('has a non-empty gameId', () => {
      expect(publish.gameId).toBeDefined();
      expect(typeof publish.gameId).toBe('string');
      expect(publish.gameId.trim().length).toBeGreaterThan(0);
    });

    it('has valid JSON (no trailing commas, proper format)', () => {
      const content = readFileSync(join(ROOT, gameDir, 'publish.json'), 'utf-8');
      expect(() => JSON.parse(content)).not.toThrow();
    });

    it('has valid bundleId format if present', () => {
      if (publish.bundleId) {
        // bundleId should match reverse-domain format: ai.oasiz.gamename
        expect(publish.bundleId).toMatch(/^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)+$/);
      }
    });

    it('has valid version format if present', () => {
      if (publish.version) {
        expect(publish.version).toMatch(/^\d+\.\d+\.\d+$/);
      }
    });

    it('has valid ageRating if present', () => {
      if (publish.ageRating) {
        expect(VALID_AGE_RATINGS).toContain(publish.ageRating);
      }
    });
  });

  it('all gameIds are unique', () => {
    const ids = gameDirs.map((d) => readPublishJson(d).gameId);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('all bundleIds are unique (where present)', () => {
    const bundleIds = gameDirs
      .map((d) => readPublishJson(d).bundleId)
      .filter(Boolean) as string[];
    const uniqueIds = new Set(bundleIds);
    expect(uniqueIds.size).toBe(bundleIds.length);
  });
});
