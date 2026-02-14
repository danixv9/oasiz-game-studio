# Mobile Publishing Plan - Progress Report

**Branch:** `claude/mobile-publishing-plan-7wH7r`
**Date:** 2026-02-08
**Total Commits on Branch:** 31 (from `3eb80ea` to `18f052f`)

---

## What Was Done

### 1. Mobile Publishing Plan (`MOBILE_PUBLISHING_PLAN.md`)

**Commit:** `3eb80ea` - Add comprehensive mobile auto-publishing plan for Android & iOS

Created a full architectural plan covering:
- Expo SDK 52 mobile app with expo-router file-based routing
- WebView-based game loading from CDN (`https://assets.oasiz.ai/<game-id>/`)
- Native bridge design: `window.submitScore`, `window.triggerHaptic`, `window.shareRoomCode`
- CI/CD pipeline: build games → deploy to CDN → EAS Build → EAS Submit
- Store submission instructions (Apple App Store + Google Play)
- Adding new games workflow (no app rebuild needed - CDN hot-swap)

---

### 2. Expo Mobile App (`mobile/`)

**Commit:** `30e549b` - Add Expo mobile app shell with stunning arcade catalog UI

Built a complete Expo mobile app from scratch:

#### App Structure
| File | Purpose |
|------|---------|
| `app/_layout.tsx` | Root layout with Stack navigator, splash screen, dark theme |
| `app/(tabs)/_layout.tsx` | Tab navigator: Arcade (home) + Settings |
| `app/(tabs)/index.tsx` | Home screen: featured carousel, category filter, 2-column game grid |
| `app/(tabs)/settings.tsx` | Preferences (haptics/sound/music), stats, about section |
| `app/game/[id].tsx` | Full-screen WebView game player with bridge injection |

#### Libraries
| File | Purpose |
|------|---------|
| `lib/games.ts` | Game manifest - 14 games with metadata, categories, helper functions |
| `lib/bridge.ts` | WebView bridge script - 5 platform functions + lifecycle messages |
| `lib/storage.ts` | AsyncStorage wrapper for scores, favorites, play counts, settings |

#### Components
| File | Purpose |
|------|---------|
| `components/GameCard.tsx` | Game card with gradient, badges (NEW/MULTI), high score, spring animations |
| `components/FeaturedGame.tsx` | Featured carousel card with shimmer effect, floating icon, play button |
| `components/CategoryFilter.tsx` | Horizontal scrollable category pills |

#### Configuration
| File | Purpose |
|------|---------|
| `app.json` | Expo config: "Oasiz Arcade", bundle ID `ai.oasiz.arcade`, dark theme, portrait |
| `eas.json` | EAS Build profiles (dev/preview/production) + Submit config |
| `constants/colors.ts` | Dark theme palette: bg #0B0B1E, purple #8B5CF6, pink #EC4899, cyan #06B6D4 |

#### Key Dependencies
- `expo@~52.0.0`, `expo-router@~4.0.0`, `react-native@0.76.3`
- `react-native-webview@13.12.5` - game container
- `expo-haptics@~14.0.0` - native haptic feedback
- `react-native-reanimated@~3.16.0` - GPU-accelerated animations
- `@react-native-async-storage/async-storage@2.1.0` - local persistence

---

### 3. Game Build Infrastructure (`publish.json` + scripts)

**Commit:** `efb003d` - Add publish.json for all games, build scripts, CI/CD pipeline, EAS config

- Added `publish.json` to all 14 completed games with metadata:
  - title, description, category, gameId (UUID), bundleId (`ai.oasiz.<name>`), version, ageRating
- All games successfully built to `dist/index.html` via `vite-plugin-singlefile`
- Build sizes range from 11KB (wordfall) to 116KB (car-balance)

**Commit:** `6532303` - Remove perfect-drop (incomplete), build remaining games

- Cleaned up incomplete game from published set
- Ensured all 14 published games have valid builds

---

### 4. CI/CD Pipeline (`.github/workflows/publish-mobile.yml`)

**Commit:** `efb003d`

GitHub Actions workflow with 5 stages:
1. **Test** - `bun test tests/`
2. **Build Games** - Loop through game dirs, `bun install && bun run build`
3. **Deploy CDN** - Upload `dist/index.html` per game (**placeholder - needs AWS S3 setup**)
4. **Build Mobile** - `eas build --platform <platform> --profile <profile>`
5. **Submit Stores** - `eas submit --platform <platform> --latest`

Triggers: push to main (auto) or manual `workflow_dispatch` with platform/profile/auto_submit inputs.

---

### 5. Test Suite (`tests/`)

**Commit:** `bab9913` - Add test suite and CI workflow for quality gates

4 test files, 270 total tests (269 pass, 1 fail):

| Test File | Tests | What It Validates |
|-----------|-------|-------------------|
| `bridge.test.ts` | 11 | Bridge message parsing, WebView injection, double-injection guard |
| `game-builds.test.ts` | ~14 | Each game has package.json, vite.config, tsconfig, src/, index.html |
| `game-manifest.test.ts` | 17 | Manifest consistency, unique IDs, valid categories, helper functions, disk↔manifest sync |
| `publish-json.test.ts` | 13 | Schema validation: required fields, category enum, bundleId format, semver, unique IDs |

---

### 6. Block Blast Polish (180+ iterations)

**Commits:** `c5dae66` through `c39b3ee` (8 commits)

Extensive polish of the Block Blast game:
- **Iterations 1-100:** Premium visual overhaul
- **Iterations 101-120:** Device pixel ratio fixes, performance, visual polish
- **Iterations 121-140:** Visual polish, audio system, performance
- **Iterations 141-150:** Grid effects, audio improvements, UX polish
- **Iterations 151-160:** UX, audio, layout, effects
- **Iterations 161-168:** Combo scaling, responsive sizing, adaptive quality, slow-mo, dynamic audio
- **Iterations 169-180:** Landscape layout, keyboard controls, audio cleanup, bug fixes
- **Final polish:** Particle effects, audio cleanup, keyboard UX polish

---

## 2026-02-14 - Agent Work Summary

### Repo maintenance

- Pushed local `main` to `origin/main` after switching the `origin` push URL to SSH (HTTPS push required interactive credentials).
- Created branch + local worktree for ongoing work:
  - Branch: `chore/ci-full-cycle`
  - Worktree: `C:\\Users\\Charles\\Desktop\\oasiz-game-studio-wt-ci-full-cycle`

### CI hardening (unit → build → e2e)

- Added Playwright-based E2E smoke coverage and made CI deterministic with `bun install --frozen-lockfile`.
- E2E smoke test locally validated across all published games (15/15 passing) via `bun run e2e`.

Key additions/changes:
- `.github/workflows/ci.yml` now includes an `e2e-games` job that:
  - builds all published games,
  - uploads `*/dist/index.html` as an artifact,
  - downloads artifacts and runs Playwright smoke tests.
- `playwright.config.ts` starts a static server (`scripts/ci/serve-root.mjs`) and runs Chromium-only.
- `e2e/game-load.spec.ts` loads each published game `dist/index.html` and fails on uncaught runtime errors / non-ignored console errors.
- `prompts.md` created to track user requests verbatim going forward.

---

## Current State

### Published Games (14)

| Game | Category | Size | Special Features |
|------|----------|------|------------------|
| block-blast | puzzle | 88KB | Keyboard controls, landscape, audio, particles |
| cannon-blaster | arcade | 76KB | Standard arcade |
| car-balance | physics | 116KB | matter-js physics |
| draw-the-thing | party | 55KB | Multiplayer (playroomkit), audio (tone.js) |
| dual-block-dodge | action | 19KB | Split-attention |
| hoops-jump | arcade | 42KB | Timing-based |
| pacman | arcade | 17KB | Classic maze |
| paddle-bounce | arcade | 17KB | Brick breaker, audio (tone.js) |
| paper-plane | casual | 53KB | Flight mechanics |
| police-chase | action | 29KB | Endless runner, audio (tone.js) |
| saw-dodge | action | 30KB | Survival |
| threes | puzzle | 23KB | Tile matching |
| unicycle-hero | physics | 13KB | Vercel API + Clawdbot AI |
| wordfall | puzzle | 11KB | Word game, matter-js |

### Unfinished Games (13, in `unfinished-games/`)
astro-party, bar-bounce, basketball-shoot, bowmasters, elevator-action, finger-flow, helix-jump, lunar-lander, paper-plane-complex, paper-planet, perfect-drop, slingshot-golf, time-pilot

### Mobile App Manifest (14 games in `lib/games.ts`)
- **Featured:** block-blast, pacman, police-chase
- **New:** cannon-blaster, paper-plane, wordfall
- **Multiplayer:** draw-the-thing
- **Categories:** arcade (4), puzzle (3), action (3), casual (1), party (1), physics (2)

---

## Known Issues

### Critical (Must Fix Before Publishing)

1. **CDN deployment not implemented**
   - File: `.github/workflows/publish-mobile.yml` lines ~112-120
   - The "Deploy CDN" step is a placeholder - the AWS S3 sync command is commented out
   - Need to set up actual CDN hosting at `https://assets.oasiz.ai/`
   - Could use AWS S3 + CloudFront, Cloudflare R2, or any static hosting

2. **EAS credentials are placeholders**
   - File: `mobile/eas.json`
   - `YOUR_APPLE_ID`, `YOUR_ASC_APP_ID`, `YOUR_TEAM_ID` need real values
   - `google-play-service-account.json` needs to be created
   - `EXPO_TOKEN` GitHub secret needs to be set

### Medium Priority

3. **Test failure in unicycle-hero**
   - File: `unicycle-hero/__tests__/clawdbot-integration.test.ts`
   - Error: `vi.stubEnv is not a function` - test uses vitest API but runs under `bun test`
   - Fix: Either install/configure vitest at root, or rewrite test to use bun:test compatible API

4. **draw-the-thing publish.json incomplete**
   - File: `draw-the-thing/publish.json`
   - Missing: `bundleId`, `version`, `ageRating` fields
   - Fix: Add `"bundleId": "ai.oasiz.drawthething"`, `"version": "1.0.0"`, `"ageRating": "4+"`

5. **Sound/Music settings not bridged to games**
   - Settings toggles exist in `mobile/app/(tabs)/settings.tsx` for sound and music
   - But the bridge (`lib/bridge.ts`) doesn't pass these preferences to games
   - Games can't currently check if user has disabled audio

### Low Priority

6. **GAME_OVER not handled**
   - File: `mobile/app/game/[id].tsx` around line 101
   - The `GAME_OVER` bridge message is received but does nothing
   - Could show interstitial, prompt replay, save session stats, etc.

7. **Favorites not surfaced in UI**
   - `lib/storage.ts` has `toggleFavorite()` / `isFavorite()` functions
   - No UI to favorite games or filter by favorites

8. **App store assets not created**
   - `mobile/assets/images/` needs: icon.png, splash.png, adaptive-icon.png
   - App Store screenshots needed for submission
   - Privacy policy URL needed for both stores

---

## What's Next (Prioritized)

### Phase 1: Pre-Publishing Fixes

1. **Fix the test failure**
   - Either add vitest config to root, exclude unicycle-hero tests from `bun test`, or rewrite the test
   - Run `bun test tests/` and confirm all 270 tests pass

2. **Complete draw-the-thing publish.json**
   - Add missing fields to match schema

3. **Bridge audio preferences to games**
   - Read settings from AsyncStorage in bridge.ts
   - Inject `window.__OASIZ_SETTINGS__ = { sound: true, music: true, haptics: true }` into games
   - Games can check this before playing audio

### Phase 2: Infrastructure Setup

4. **Set up CDN hosting**
   - Choose provider (AWS S3 + CloudFront, Cloudflare R2 + Workers, Vercel, etc.)
   - Create bucket/zone for `assets.oasiz.ai`
   - Upload all 14 game `dist/index.html` files
   - Update CI/CD workflow with actual deploy commands

5. **Configure EAS credentials**
   - Create Apple Developer account, get App Store Connect credentials
   - Create Google Play Console account, generate service account key
   - Set up `EXPO_TOKEN` in GitHub Secrets
   - Replace placeholder values in `eas.json`

6. **Create app store assets**
   - Design app icon (1024x1024), splash screen, adaptive icon
   - Take screenshots for App Store / Google Play listings
   - Write store description and keywords
   - Create privacy policy page

### Phase 3: First Store Submission

7. **Build and test on device**
   - Run `eas build --platform all --profile preview` for internal testing
   - Test all 14 games load correctly from CDN in WebView
   - Verify bridge functions work (haptics, score submission)
   - Test on both iOS and Android

8. **Submit to stores**
   - Run `eas build --platform all --profile production`
   - Run `eas submit --platform all --latest`
   - Respond to store review feedback

### Phase 4: Post-Launch Improvements

9. **Implement GAME_OVER handling** - Show replay prompt, save session
10. **Add favorites UI** - Heart icon on cards, favorites filter in catalog
11. **Polish unfinished games** - Pick from `unfinished-games/` to expand catalog
12. **Add analytics** - Track which games are popular, session length, etc.
13. **Add push notifications** - New game announcements
14. **Implement in-app updates** - OTA updates via EAS Update

---

## File Reference (Key Files)

```
oasiz-game-studio/
├── MOBILE_PUBLISHING_PLAN.md      # Full architectural plan
├── BACKLOG.md                     # Game ideas backlog
├── Agents.md                      # AI agent build instructions
├── README.md                      # Project setup guide
├── package.json                   # Root: test script only
├── bun.lock                       # Bun lockfile
├── tests/
│   ├── bridge.test.ts             # WebView bridge tests (11 tests)
│   ├── game-builds.test.ts        # Build infrastructure tests (~14 tests)
│   ├── game-manifest.test.ts      # Manifest consistency tests (17 tests)
│   └── publish-json.test.ts       # Schema validation tests (13 tests)
├── mobile/
│   ├── app.json                   # Expo config (Oasiz Arcade, ai.oasiz.arcade)
│   ├── eas.json                   # EAS Build/Submit profiles (NEEDS REAL CREDS)
│   ├── package.json               # Expo dependencies
│   ├── app/
│   │   ├── _layout.tsx            # Root Stack navigator
│   │   ├── (tabs)/
│   │   │   ├── _layout.tsx        # Tab navigator (Arcade + Settings)
│   │   │   ├── index.tsx          # Home: featured carousel + game grid
│   │   │   └── settings.tsx       # Preferences + stats
│   │   └── game/
│   │       └── [id].tsx           # WebView game player
│   ├── components/
│   │   ├── GameCard.tsx           # Game card with badges + animations
│   │   ├── FeaturedGame.tsx       # Featured carousel card
│   │   └── CategoryFilter.tsx     # Category filter pills
│   ├── lib/
│   │   ├── games.ts              # Game manifest (14 games)
│   │   ├── bridge.ts             # WebView bridge injection
│   │   └── storage.ts            # AsyncStorage wrapper
│   └── constants/
│       └── colors.ts             # Theme colors
├── .github/workflows/
│   └── publish-mobile.yml         # CI/CD pipeline (CDN DEPLOY IS PLACEHOLDER)
├── <game-name>/                   # 14 published games
│   ├── publish.json               # Game metadata
│   ├── package.json               # Build scripts
│   ├── vite.config.js             # Vite + singlefile plugin
│   ├── src/                       # Game source
│   └── dist/index.html            # Built single-file output
└── unfinished-games/              # 13 games in progress
```

---

## Quick Start for Continuing Agent

```bash
# Navigate to repo
cd /home/user/oasiz-game-studio

# Switch to this branch
git checkout claude/mobile-publishing-plan-7wH7r

# Run tests (should see 269 pass, 1 fail)
bun test tests/

# View mobile app structure
ls mobile/app/ mobile/lib/ mobile/components/

# View a specific game's config
cat block-blast/publish.json

# Build a game
cd block-blast && bun install && bun run build

# The mobile app (requires Expo CLI + device/emulator)
cd mobile && bun install && bun start
```
