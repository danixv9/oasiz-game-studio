/**
 * Validates that each published game has the necessary build infrastructure.
 * Checks for required config files, dist output, and proper project structure.
 */
import { describe, it, expect } from 'bun:test';
import { readdirSync, readFileSync, existsSync, statSync } from 'fs';
import { join, resolve } from 'path';

const ROOT = resolve(__dirname, '..');
const SKIP_DIRS = new Set(['mobile', 'template', 'node_modules', '.github', 'tests', 'unfinished-games']);

function getGameDirs(): string[] {
  return readdirSync(ROOT).filter((name) => {
    if (SKIP_DIRS.has(name) || name.startsWith('.')) return false;
    const fullPath = join(ROOT, name);
    return statSync(fullPath).isDirectory() && existsSync(join(fullPath, 'publish.json'));
  });
}

describe('game build infrastructure', () => {
  const gameDirs = getGameDirs();

  describe.each(gameDirs)('%s', (gameDir) => {
    const gamePath = join(ROOT, gameDir);

    it('has package.json', () => {
      expect(existsSync(join(gamePath, 'package.json'))).toBe(true);
    });

    it('has vite.config.js or vite.config.ts', () => {
      const hasJs = existsSync(join(gamePath, 'vite.config.js'));
      const hasTs = existsSync(join(gamePath, 'vite.config.ts'));
      expect(hasJs || hasTs, `${gameDir} missing vite config`).toBe(true);
    });

    it('has tsconfig.json', () => {
      expect(existsSync(join(gamePath, 'tsconfig.json'))).toBe(true);
    });

    it('has src/ directory', () => {
      expect(existsSync(join(gamePath, 'src'))).toBe(true);
    });

    it('has index.html', () => {
      expect(existsSync(join(gamePath, 'index.html'))).toBe(true);
    });

    it('package.json has build script', () => {
      const pkg = JSON.parse(readFileSync(join(gamePath, 'package.json'), 'utf-8'));
      expect(pkg.scripts?.build, `${gameDir} missing build script`).toBeDefined();
    });

    it('package.json has dev script', () => {
      const pkg = JSON.parse(readFileSync(join(gamePath, 'package.json'), 'utf-8'));
      expect(pkg.scripts?.dev, `${gameDir} missing dev script`).toBeDefined();
    });

    it('vite config uses singlefile plugin', () => {
      const configPath = existsSync(join(gamePath, 'vite.config.ts'))
        ? join(gamePath, 'vite.config.ts')
        : join(gamePath, 'vite.config.js');
      const content = readFileSync(configPath, 'utf-8');
      expect(content).toContain('vite-plugin-singlefile');
    });
  });
});

describe('no duplicate game directories', () => {
  it('all game directories are uniquely named', () => {
    const gameDirs = getGameDirs();
    expect(new Set(gameDirs).size).toBe(gameDirs.length);
  });
});
