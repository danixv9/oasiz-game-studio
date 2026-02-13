# Oasiz Game Studio - Technical Documentation

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Repository Structure](#repository-structure)
3. [Published Games](#published-games)
4. [Game Development](#game-development)
5. [Mobile App (Expo)](#mobile-app-expo)
6. [Platform Bridge API](#platform-bridge-api)
7. [Build System](#build-system)
8. [Test Suite](#test-suite)
9. [CI/CD Pipeline](#cicd-pipeline)
10. [Graphics & Performance](#graphics--performance)
11. [Multiplayer (Playroom Kit)](#multiplayer-playroom-kit)
12. [External Tools & Asset Pipeline](#external-tools--asset-pipeline)
13. [Store Publishing](#store-publishing)
14. [Configuration Reference](#configuration-reference)
15. [Task List](#task-list)

---

## Architecture Overview

Oasiz Game Studio is a monorepo containing:

- **14 published HTML5 Canvas games** built with TypeScript + Vite, each compiling to a single `dist/index.html`
- **13 in-development games** in `unfinished-games/`
- **An Expo mobile app** (`mobile/`) that loads games via WebView from a CDN
- **A native bridge** connecting game JS to native device features (haptics, score persistence, sharing)
- **A CI/CD pipeline** that builds games, deploys to CDN, builds the mobile app, and submits to app stores

```
                              +------------------+
                              |  GitHub Actions   |
                              |  CI/CD Pipeline   |
                              +--------+---------+
                                       |
                    +------------------+------------------+
                    |                  |                  |
              Build Games        Deploy CDN         EAS Build
              (bun + vite)     (assets.oasiz.ai)   (iOS + Android)
                    |                  |                  |
                    v                  v                  v
             dist/index.html    CDN Hosting        App Store /
             (per game)        (static HTML)       Google Play
                                       |
                                       v
                              +------------------+
                              |  Mobile App      |
                              |  (Expo WebView)  |
                              +--------+---------+
                                       |
                              +--------+---------+
                              |  Native Bridge   |
                              |  submitScore     |
                              |  triggerHaptic   |
                              |  shareRoomCode   |
                              +------------------+
```

### Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Games | TypeScript, HTML5 Canvas | TS 5.9, Vite 7.3 |
| Build | Vite + vite-plugin-singlefile | 2.0.3 |
| Package Manager | Bun | 1.3.8 |
| Mobile App | Expo (React Native) | SDK 52 |
| Navigation | expo-router | 4.0 |
| Game Container | react-native-webview | 13.12.5 |
| Haptics | expo-haptics | 14.0 |
| Animations | react-native-reanimated | 3.16 |
| Storage | @react-native-async-storage | 2.1 |
| Multiplayer | playroomkit | 0.0.95 |
| Physics | matter-js | 0.20 |
| Audio | tone.js | 14-15 |
| CI/CD | GitHub Actions + EAS Build | - |
| Store Submit | EAS Submit | - |

---

## Repository Structure

```
oasiz-game-studio/
├── README.md                          # Game development guide for contributors
├── Agents.md                          # AI agent build instructions & platform rules
├── BACKLOG.md                         # Game ideas backlog
├── MOBILE_PUBLISHING_PLAN.md          # Mobile app architecture plan
├── documentation.md                   # This file
├── progress.md                        # Branch progress report for agent handoff
├── playroom_js.md                     # Playroom Kit multiplayer reference
├── package.json                       # Root: test script only
├── bun.lock                           # Root lockfile
│
├── template/                          # Starter template for new games
│   ├── package.json                   #   Vite + TypeScript + singlefile deps
│   ├── tsconfig.json                  #   TS config (ESNext, strict)
│   └── vite.config.js                 #   Vite + viteSingleFile plugin
│
├── tests/                             # Root test suite (275 tests)
│   ├── bridge.test.ts                 #   WebView bridge tests (17 tests)
│   ├── game-builds.test.ts            #   Build infrastructure tests (~14)
│   ├── game-manifest.test.ts          #   Manifest consistency tests (17)
│   └── publish-json.test.ts           #   Schema validation tests (13)
│
├── mobile/                            # Expo mobile app
│   ├── app.json                       #   Expo config (Oasiz Arcade, ai.oasiz.arcade)
│   ├── eas.json                       #   EAS Build/Submit profiles
│   ├── package.json                   #   Expo dependencies
│   ├── app/
│   │   ├── _layout.tsx                #   Root Stack navigator + splash
│   │   ├── (tabs)/
│   │   │   ├── _layout.tsx            #   Tab navigator (Arcade + Settings)
│   │   │   ├── index.tsx              #   Home: featured carousel + game grid
│   │   │   └── settings.tsx           #   Preferences + stats + about
│   │   └── game/
│   │       └── [id].tsx               #   WebView game player + bridge
│   ├── components/
│   │   ├── GameCard.tsx               #   Game card with gradient + badges
│   │   ├── FeaturedGame.tsx           #   Featured carousel card
│   │   └── CategoryFilter.tsx         #   Category filter pills
│   ├── lib/
│   │   ├── games.ts                   #   Game manifest (14 games)
│   │   ├── bridge.ts                  #   WebView bridge injection + settings
│   │   └── storage.ts                 #   AsyncStorage wrapper
│   └── constants/
│       └── colors.ts                  #   Theme: #0B0B1E bg, #8B5CF6 purple
│
├── .github/workflows/
│   └── publish-mobile.yml             #   CI/CD: test → build → CDN → EAS
│
├── <game-name>/                       # 14 published games (see below)
│   ├── publish.json                   #   Game metadata for store/manifest
│   ├── package.json                   #   Game-specific deps + scripts
│   ├── vite.config.js                 #   Vite + singlefile plugin
│   ├── tsconfig.json                  #   TypeScript config
│   ├── index.html                     #   Entry HTML + CSS styles
│   ├── src/
│   │   └── main.ts                    #   All game logic
│   └── dist/
│       └── index.html                 #   Built single-file output
│
└── unfinished-games/                  # 13 games in progress
    ├── astro-party/
    ├── bar-bounce/
    ├── basketball-shoot/
    ├── bowmasters/
    ├── elevator-action/
    ├── finger-flow/
    ├── helix-jump/
    ├── lunar-lander/
    ├── paper-plane-complex/
    ├── paper-planet/
    ├── perfect-drop/
    ├── slingshot-golf/
    └── time-pilot/
```

---

## Published Games

### Game Catalog (14 games)

| Game | Category | Bundle Size | Dependencies | Key Features |
|------|----------|------------|--------------|--------------|
| **block-blast** | puzzle | 88KB | - | Keyboard + touch, landscape mode, dynamic audio, particles, DPR scaling, gradient caching |
| **cannon-blaster** | arcade | 76KB | - | Object pooling, demo preview mode, castle defense mechanics |
| **car-balance** | physics | 116KB | matter-js | Physics engine, multiple car styles, DPR scaling |
| **draw-the-thing** | party | 55KB | playroomkit, tone.js | Real-time multiplayer drawing/guessing, audio |
| **dual-block-dodge** | action | 19KB | - | Split-attention gameplay, two simultaneous controls |
| **hoops-jump** | arcade | 42KB | - | Multiple themed backgrounds (city/mountain/beach), timing-based |
| **pacman** | arcade | 17KB | - | Classic maze, mobile D-pad, ghost AI |
| **paddle-bounce** | arcade | 17KB | tone.js | Brick breaker, synthesized audio, coin collection |
| **paper-plane** | casual | 53KB | - | Flight mechanics, obstacle avoidance, particle effects |
| **police-chase** | action | 29KB | tone.js | Infinite procedural world, 6 biomes, vehicle gradient caching |
| **saw-dodge** | action | 30KB | - | Survival mechanics, double-jump, trail rendering |
| **threes** | puzzle | 23KB | - | Tile matching, swipe controls, animated merges |
| **unicycle-hero** | physics | 13KB | - | Dual-canvas renderer, post-processing bloom, Clawdbot/Telegram integration |
| **wordfall** | puzzle | 11KB | matter-js | Physics word game, bucket catching, keyboard input |

### publish.json Schema

Every published game has a `publish.json` with this schema:

```json
{
  "title": "Game Title",
  "description": "One-line description of the game",
  "category": "puzzle",
  "gameId": "uuid-v4-unique-id",
  "bundleId": "ai.oasiz.gamename",
  "version": "1.0.0",
  "ageRating": "4+",
  "standalone": true
}
```

| Field | Required | Format | Values |
|-------|----------|--------|--------|
| `title` | Yes | String | Display name |
| `description` | Yes | String | Short description |
| `category` | Yes | Enum | `arcade`, `puzzle`, `action`, `casual`, `party`, `physics` |
| `gameId` | Yes | UUID v4 | Unique across all games |
| `bundleId` | Optional | Reverse-domain | `ai.oasiz.<name>` |
| `version` | Optional | Semver | `X.Y.Z` |
| `ageRating` | Optional | Enum | `4+`, `9+`, `12+`, `17+` |
| `standalone` | Optional | Boolean | `true` (single-player) or `false` (multiplayer) |

---

## Game Development

### Creating a New Game

```bash
# 1. Copy the template
cp -r template/ my-game-name/
cd my-game-name/

# 2. Install dependencies
bun install

# 3. Create game files
#    - src/main.ts  → All game logic (TypeScript)
#    - index.html   → Entry point + CSS in <style> tags
#    - No JavaScript in index.html

# 4. Develop with hot reload
bun run dev

# 5. Build (outputs single dist/index.html)
bun run build
```

### Game File Structure

```
my-game-name/
├── src/
│   └── main.ts          # ALL game logic (TypeScript only)
├── index.html           # Entry HTML + CSS in <style> tags
├── package.json         # Dependencies (vite, typescript, vite-plugin-singlefile)
├── tsconfig.json        # TypeScript config
├── vite.config.js       # Vite build config
├── publish.json         # Game metadata (add when ready to publish)
└── dist/
    └── index.html       # Built output (single file, all assets inlined)
```

### Standard package.json Scripts

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit",
    "format": "prettier --write 'src/**/*.{ts,tsx,css,html}'"
  }
}
```

### Vite Configuration

All games use the same Vite config that produces a single HTML file:

```javascript
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
  plugins: [viteSingleFile()],
  build: {
    target: "esnext",
    minify: true,
    assetsInlineLimit: 100000000,  // 100MB - inline everything
    cssCodeSplit: false,
    rollupOptions: {
      output: { inlineDynamicImports: true },
    },
  },
  logLevel: "warn",
});
```

### Platform Requirements

#### Responsive Full-Screen Canvas

```typescript
// CSS foundation (in index.html <style>)
// html, body { margin: 0; padding: 0; overflow: hidden; width: 100%; height: 100%; touch-action: none; }
// canvas { display: block; }

// Mobile detection
const isMobile = window.matchMedia('(pointer: coarse)').matches;

// Canvas sizing with DPR
function resizeCanvas(): void {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, 2); // Cap at 2x
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = w + "px";
  canvas.style.height = h + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener("resize", resizeCanvas);
```

#### Safe Areas

Interactive buttons near the top of the screen must respect platform overlays:

| Platform | Minimum top offset |
|----------|--------------------|
| Desktop | `45px` |
| Mobile | `120px` |

Bottom safe area for mobile controls: `padding-bottom: 120px` minimum.

#### Settings Modal (MANDATORY)

Every game MUST have a settings button (gear icon, top-right) with three toggles:

1. **Music** - Background music on/off
2. **FX / Sound Effects** - Sound effects on/off
3. **Haptics** - Vibration feedback on/off

Settings persist via `localStorage`:
```typescript
const settings = JSON.parse(localStorage.getItem("settings") || '{"music":true,"fx":true,"haptics":true}');
```

#### Score Submission

```typescript
// Call on game over with final score (non-negative integer)
if (typeof (window as any).submitScore === "function") {
  (window as any).submitScore(this.score);
}
// NEVER track high scores locally - the platform handles leaderboards
```

#### Haptic Feedback

```typescript
// Available types: "light", "medium", "heavy", "success", "error"
if (typeof (window as any).triggerHaptic === "function") {
  (window as any).triggerHaptic("medium");
}
```

| Type | Use Case |
|------|----------|
| `light` | UI taps, button presses |
| `medium` | Collecting items, standard impacts |
| `heavy` | Explosions, major collisions, screen shake |
| `success` | Level complete, achievements, high score |
| `error` | Damage taken, game over, invalid action |

### Code Quality Rules

- **No `Math.random()` in render loops** - causes flickering. Pre-calculate during object creation.
- **No emojis in game UI** - inconsistent across platforms. Use icon libraries.
- **No JavaScript in index.html** - all logic in `src/main.ts`.
- **All CSS in `<style>` tags** in `index.html`.
- **Handle window resize events** - games run in various viewport sizes.
- **Test at**: 375x667 (mobile portrait), 667x375 (landscape), 768x1024 (tablet), 1920x1080 (desktop).

---

## Mobile App (Expo)

### Overview

The mobile app is a React Native app built with Expo SDK 52 and expo-router for file-based routing. It presents a game catalog and loads each game in a full-screen WebView from the CDN.

**App identity:**
- Name: Oasiz Arcade
- Bundle ID: `ai.oasiz.arcade` (iOS + Android)
- Theme: Dark (#0B0B1E background)

### Navigation Structure

```
Root Layout (GestureHandlerRootView + Stack)
├── (tabs) - Tab Navigator
│   ├── index.tsx - Arcade Home
│   │   ├── Header ("OASIZ Arcade")
│   │   ├── Featured Game Carousel (auto-rotates every 8s)
│   │   ├── Category Filter (horizontal scrollable pills)
│   │   └── Game Grid (2-column, pull-to-refresh)
│   │
│   └── settings.tsx - Settings
│       ├── Stats Card (games played, total score)
│       ├── Preferences (haptics, sound, music toggles)
│       └── About (version, links)
│
└── game/[id].tsx - Game Screen
    ├── WebView (loads from CDN)
    ├── Bridge Script Injection (settings-aware)
    ├── Loading Overlay (gradient + spinner)
    └── Back Button (auto-hides after 4s)
```

### Game Manifest (`lib/games.ts`)

The manifest defines all 14 games with metadata:

```typescript
interface Game {
  id: string;        // Matches directory name
  title: string;
  description: string;
  category: Category;
  icon: string;      // Emoji for display
  gradient: [string, string]; // Hex color pair for card
  isNew?: boolean;
  isFeatured?: boolean;
  isMultiplayer?: boolean;
}
```

Helper functions: `getGameUrl(game)`, `getGameById(id)`, `getGamesByCategory(cat)`, `getFeaturedGames()`.

Games are loaded from: `${EXPO_PUBLIC_GAMES_BASE_URL}/${gameId}/`

| Environment | Base URL |
|-------------|----------|
| Development | `http://localhost:5173` |
| Preview | `https://assets.oasiz.ai` |
| Production | `https://assets.oasiz.ai` |

### Storage (`lib/storage.ts`)

All data persisted via `@react-native-async-storage/async-storage`:

| Key | Data | Purpose |
|-----|------|---------|
| `oasiz:favorites` | `string[]` | Favorited game IDs |
| `oasiz:scores` | `Record<string, number>` | High score per game |
| `oasiz:settings` | `AppSettings` | Haptics/sound/music toggles |
| `oasiz:playcount` | `Record<string, number>` | Play count per game |

### Theme (`constants/colors.ts`)

```typescript
background: "#0B0B1E"
surface: "#151530"
purple: "#8B5CF6"
pink: "#EC4899"
cyan: "#06B6D4"
textPrimary: "#FFFFFF"
textSecondary: "rgba(255, 255, 255, 0.6)"
```

---

## Platform Bridge API

### Overview

The bridge is a JavaScript snippet injected into each game's WebView before the game HTML loads. It defines global functions that games can call to communicate with the native app.

### Bridge Script Generation (`lib/bridge.ts`)

```typescript
// Create bridge with user's settings injected
createBridgeScript({ sound: true, music: true, haptics: true }): string

// Static default bridge (backward-compatible export)
BRIDGE_SCRIPT: string
```

The bridge injects `window.__OASIZ_SETTINGS__` so games can read user preferences:

```javascript
window.__OASIZ_SETTINGS__ = {
  sound: true,   // User's sound preference
  music: true,   // User's music preference
  haptics: true  // User's haptics preference
};
```

### Functions Available to Games

| Function | Message Type | Payload | Native Handler |
|----------|-------------|---------|----------------|
| `window.submitScore(score)` | `SUBMIT_SCORE` | `{ score: number }` | Saves to AsyncStorage, haptic on new high |
| `window.triggerHaptic(type)` | `HAPTIC` | `{ type: string }` | expo-haptics (gated by settings) |
| `window.shareRoomCode(code)` | `SHARE_ROOM` | `{ code: string }` | Native Share dialog |
| `window.notifyGameReady()` | `GAME_READY` | `{}` | Hides loading overlay |
| `window.notifyGameOver(data)` | `GAME_OVER` | `data` | Not yet handled |

### Message Flow

```
Game (WebView JS)
  → window.submitScore(100)
  → postMessage(JSON.stringify({ type: "SUBMIT_SCORE", payload: { score: 100 } }))
  → WebView.onMessage
  → parseBridgeMessage(data)
  → saveHighScore(gameId, 100)
  → Haptics.notificationAsync(Success)  // if new high & haptics enabled
```

### Double-Injection Guard

The bridge script checks `window.__OASIZ_BRIDGE_READY__` to prevent re-injection. It posts `BRIDGE_LOADED` with `{ version: 1 }` on successful injection.

---

## Build System

### Per-Game Build

Each game uses Vite with the `vite-plugin-singlefile` plugin to produce a single `dist/index.html` file with all JS, CSS, and assets inlined.

```bash
cd <game-name>
bun install        # Install dependencies
bun run build      # Build to dist/index.html
bun run dev        # Development server with hot reload
bun run preview    # Preview built output
bun run typecheck  # TypeScript type checking
```

### Root Scripts

```bash
bun test tests/    # Run all 275 tests
```

### Mobile App

```bash
cd mobile
bun install
bun start          # Expo development server
bun run ios        # Start on iOS simulator
bun run android    # Start on Android emulator
```

---

## Test Suite

### Overview

275 tests across 4 test files, all run with `bun test tests/` from the root directory.

### Test Files

#### `tests/bridge.test.ts` (17 tests)

Tests for `mobile/lib/bridge.ts`:
- `parseBridgeMessage()` - Parsing valid/invalid JSON, all message types
- `BRIDGE_SCRIPT` - Contains all bridge functions, double-injection guard, postMessage
- `createBridgeScript()` - Settings injection, defaults, custom settings, haptics gating, backward compatibility

#### `tests/game-builds.test.ts` (~14 tests)

Infrastructure validation for each published game:
- Has `package.json` with `build` and `dev` scripts
- Has `vite.config.js` (or `.ts`)
- Has `tsconfig.json`
- Has `src/` directory and `index.html`
- Uses `vite-plugin-singlefile` in config
- No duplicate game directories

#### `tests/game-manifest.test.ts` (17 tests)

Consistency checks between `mobile/lib/games.ts` manifest and disk:
- `GAMES` array has 10+ entries with required fields
- Unique IDs and titles
- Valid hex gradient colors
- Valid categories matching `CATEGORIES` array
- Helper functions work correctly
- Every manifest game has a `publish.json` on disk
- Every game with `publish.json` is in the manifest

#### `tests/publish-json.test.ts` (13 tests)

Schema validation for all `publish.json` files:
- Required fields: `title`, `description`, `category`, `gameId`
- Valid categories from enum
- `bundleId` matches `ai.oasiz.*` format
- `version` is valid semver
- `ageRating` in allowed set
- Valid JSON (no trailing commas)
- Unique `gameId` and `bundleId` across all games

### Running Tests

```bash
cd /home/user/oasiz-game-studio
bun test tests/          # All tests
bun test tests/bridge    # Just bridge tests
```

---

## CI/CD Pipeline

### Workflow: `.github/workflows/publish-mobile.yml`

**Triggers:**
- Push to `main` branch (when `mobile/` or game files change)
- Manual `workflow_dispatch` with inputs: `platform` (all/ios/android), `profile` (preview/production), `auto_submit` (boolean)

### Pipeline Stages

```
test → build-games → deploy-cdn → build-mobile → submit-stores
```

#### Stage 1: Test
- Runner: Ubuntu latest
- Steps: Checkout, setup Bun, run `bun test tests/`

#### Stage 2: Build Games
- Depends on: test
- Loops through all directories with `publish.json`
- Skips: `mobile/`, `template/`
- For each game: `bun install && bun run build`
- Uploads `*/dist/index.html` as artifact

#### Stage 3: Deploy CDN
- Depends on: build-games
- **STATUS: PLACEHOLDER** - AWS S3 sync is commented out
- Needs: CDN hosting setup at `assets.oasiz.ai`

#### Stage 4: Build Mobile
- Depends on: deploy-cdn
- Setup: Node.js 20, Bun, EAS CLI
- Command: `eas build --platform $PLATFORM --profile $PROFILE --non-interactive --no-wait`

#### Stage 5: Submit to Stores
- Depends on: build-mobile
- Conditional: Only if `auto_submit == true`
- Matrix: `[ios, android]`
- Command: `eas submit --platform $PLATFORM --latest --non-interactive`

### Required Secrets

| Secret | Purpose |
|--------|---------|
| `EXPO_TOKEN` | EAS authentication |
| Apple credentials | App Store Connect (configured in `eas.json`) |
| `google-play-service-account.json` | Google Play submission |

---

## Graphics & Performance

### DPR (Device Pixel Ratio) Handling

All 12 canvas-based published games implement DPR scaling (capped at 2x):

```typescript
const dpr = Math.min(window.devicePixelRatio || 1, 2);
canvas.width = w * dpr;
canvas.height = h * dpr;
canvas.style.width = w + "px";
canvas.style.height = h + "px";
ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
```

**Excluded:** unicycle-hero (dual-canvas architecture), draw-the-thing (DOM-based).

### Implemented Optimizations

| Optimization | Games | Impact |
|---|---|---|
| DPR scaling (2x cap) | 12 games | Sharp text on Retina/mobile |
| Eliminate duplicate clear | block-blast | ~2-3% FPS |
| Ember particle simplification | block-blast | Fewer gradient allocations |
| Vehicle gradient caching | police-chase | Avoid per-vehicle-per-frame creation |
| In-place array removal | police-chase | Reduced GC on 3000+ element arrays |

### Known Remaining Optimization Targets

**Gradients created every frame:**
- cannon-blaster: ~8 gradients/frame (background, nodes, vignette, barrel, etc.)
- hoops-jump: ~25 gradients/frame (sky, sun, clouds, ball, fire)
- paddle-bounce: ~3 gradients/frame (background, ball, coins)
- wordfall: ~3 gradients/frame (background, bucket, danger line)

**Shadow/blur operations:**
- police-chase: 28 shadowBlur operations remain (up to 80px blur)
- wordfall: shadowBlur=12 on every word every frame

**Other:**
- `Math.PI * 2` not cached (~355 uses across all games)
- `Date.now()` called in render loops instead of passing game time
- String template literals creating rgba() strings every frame (police-chase)
- `measureText` called every frame for unchanged text (wordfall)

### Performance Best Practices

1. **Never** use `Math.random()` in draw/render functions (causes flickering)
2. **Cache** gradients and only recreate on dimension/state change
3. **Pre-compute** random values during object creation
4. **Pool** objects instead of creating/destroying each frame
5. **Use** `swap-and-pop` or in-place removal instead of `Array.filter()` for large arrays
6. **Cap** DPR at 2x to avoid 3x rendering overhead
7. **Avoid** `shadowBlur` > 20px on per-frame elements
8. **Cache** `Math.PI * 2` as a constant: `const TAU = Math.PI * 2`

---

## Multiplayer (Playroom Kit)

### Overview

Multiplayer games use [Playroom Kit](https://docs.joinplayroom.com/) for real-time networking. Reference implementation: `draw-the-thing/`.

```bash
bun add playroomkit
```

### Connection Flow

```typescript
import { insertCoin, getRoomCode, myPlayer, onPlayerJoin, isHost } from "playroomkit";

// Connect to room
await insertCoin({ skipLobby: true, maxPlayersPerRoom: 8 });

// Share room code with platform
if (typeof (window as any).shareRoomCode === "function") {
  (window as any).shareRoomCode(getRoomCode());
}
```

### Platform-Injected Variables

| Variable | Type | Purpose |
|----------|------|---------|
| `window.__ROOM_CODE__` | string | Auto-join a specific room |
| `window.__PLAYER_NAME__` | string | Player's display name |
| `window.__PLAYER_AVATAR__` | string | Player's avatar URL |

### State Synchronization

```typescript
// Room-level state (visible to all)
setState("round", 1, true);           // reliable
const round = getState("round");

// Player-level state
myPlayer().setState("score", 100, true);
const score = player.getState("score");
```

### Lifecycle

```typescript
onPlayerJoin((player) => {
  // Player joined
  player.onQuit(() => {
    // Player left
    if (typeof (window as any).shareRoomCode === "function") {
      (window as any).shareRoomCode(null); // Clear room code on leave
    }
  });
});
```

---

## External Tools & Asset Pipeline

### Image Generation (Replicate)

Tool: `tools/imageGenerator.ts` via `openai/gpt-image-1.5`

Use for game textures, backgrounds, buttons, sprites. Request solid borders with white background for sprite extraction.

### Background Removal (Replicate)

Tool: `tools/backgroundRemover.ts`

```typescript
await removeBackground('input.png', 'output.png'); // Returns Buffer with transparency
```

### Music Generation (Replicate - Google Lyria 2)

Tool: `tools/musicGenerator.ts`

```typescript
await generateMusic('upbeat chiptune arcade loop', 'bgm.wav', { negativePrompt: 'vocals' });
```

Audio hosted at: `https://assets.oasiz.ai/audio/`

### File Hosting (UploadThing)

Requires `UPLOADTHING_TOKEN` environment variable. Upload assets and get permanent URLs.

---

## Store Publishing

### EAS Build Profiles

| Profile | Distribution | Platform | Base URL |
|---------|-------------|----------|----------|
| `development` | Internal (simulator) | iOS sim / Android | `http://localhost:5173` |
| `preview` | Internal (APK/IPA) | iOS + Android | `https://assets.oasiz.ai` |
| `production` | Store (auto-increment) | iOS + Android | `https://assets.oasiz.ai` |

### Store Submission

```bash
# Build for stores
cd mobile
npx eas build --platform all --profile production

# Submit to stores
npx eas submit --platform all --latest
```

### Required Credentials

**iOS (App Store Connect):**
- Apple ID
- App Store Connect App ID
- Apple Team ID
- App Store Connect API Key

**Android (Google Play):**
- `google-play-service-account.json` (service account key file)
- Track: `internal` (for testing) → `production`

**Current status:** Placeholder values in `eas.json` - need real credentials.

---

## Configuration Reference

### Root package.json

```json
{
  "name": "oasiz-game-studio",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": { "test": "bun test tests/" },
  "devDependencies": { "typescript": "^5.9.3" }
}
```

### Mobile app.json

```json
{
  "expo": {
    "name": "Oasiz Arcade",
    "slug": "oasiz-arcade",
    "version": "1.0.0",
    "orientation": "portrait",
    "scheme": "oasiz",
    "userInterfaceStyle": "dark",
    "backgroundColor": "#0B0B1E",
    "ios": {
      "bundleIdentifier": "ai.oasiz.arcade",
      "config": { "usesNonExemptEncryption": false }
    },
    "android": {
      "package": "ai.oasiz.arcade"
    },
    "plugins": ["expo-router", "expo-font", "expo-haptics", "expo-splash-screen"]
  }
}
```

### .gitignore

```
node_modules/
dist/
*.log
.DS_Store
.env
.env.local
.env.*.local
.idea/
```

---

## Task List

### Completed

- [x] Mobile publishing plan document
- [x] Expo mobile app shell (catalog, game player, settings)
- [x] publish.json for all 14 games
- [x] CI/CD pipeline (GitHub Actions)
- [x] Test suite (275 tests, 4 files)
- [x] Block Blast 180+ iteration polish
- [x] Settings bridge (sound/music/haptics → WebView)
- [x] draw-the-thing publish.json completion
- [x] DPR scaling for 12 games
- [x] Block-blast: duplicate clear removal, ember gradient optimization
- [x] Police-chase: vehicle gradient caching, in-place array removal

### Phase 2: Infrastructure Setup (NEXT)

- [ ] **Set up CDN hosting** at `assets.oasiz.ai`
  - Choose provider (AWS S3 + CloudFront, Cloudflare R2, Vercel)
  - Create bucket/zone, configure DNS
  - Upload all 14 game `dist/index.html` files
  - Update `.github/workflows/publish-mobile.yml` deploy-cdn job with real upload command

- [ ] **Configure EAS credentials**
  - Create Apple Developer account, get App Store Connect API key
  - Create Google Play Console developer account
  - Generate `google-play-service-account.json`
  - Replace placeholders in `mobile/eas.json` (`YOUR_APPLE_ID`, `YOUR_ASC_APP_ID`, `YOUR_TEAM_ID`)
  - Add `EXPO_TOKEN` to GitHub Secrets

- [ ] **Create app store assets**
  - Design app icon (1024x1024 PNG)
  - Design splash screen image
  - Design Android adaptive icon
  - Take screenshots at required sizes (iPhone 6.5", 5.5"; iPad; Android phone/tablet)
  - Write store listing description and keywords
  - Create privacy policy page (required by both stores)

### Phase 3: First Store Submission

- [ ] **Device testing**
  - Run `eas build --platform all --profile preview`
  - Test all 14 games load from CDN in WebView
  - Verify bridge functions (haptics, score submission, sharing)
  - Test on both iOS and Android devices
  - Test category filtering, featured carousel, settings persistence

- [ ] **Store submission**
  - Run `eas build --platform all --profile production`
  - Run `eas submit --platform all --latest`
  - Respond to App Store / Google Play review feedback
  - Fix any rejection issues

### Phase 4: Graphics Optimizations (Remaining)

- [ ] **Cache gradients in render loops**
  - cannon-blaster: ~8 gradients/frame
  - hoops-jump: ~25 gradients/frame
  - paddle-bounce: ~3 gradients/frame
  - wordfall: ~3 gradients/frame

- [ ] **Reduce shadow/blur operations**
  - police-chase: 28 remaining shadowBlur ops (some at 80px)
  - wordfall: shadowBlur=12 per word per frame
  - Consider replacing with pre-rendered glow sprites

- [ ] **Micro-optimizations**
  - Cache `Math.PI * 2` as `TAU` constant across all games
  - Replace `Date.now()` in render loops with passed game time
  - Pre-compute rgba color strings in police-chase
  - Cache `measureText` results in wordfall
  - Pre-render static backgrounds to off-screen canvas (hoops-jump buildings/clouds)

### Phase 5: Post-Launch Features

- [ ] **GAME_OVER handling** - Show replay prompt, save session stats, interstitial
- [ ] **Favorites UI** - Heart icon on game cards, favorites filter tab
- [ ] **Analytics** - Track popular games, session length, retention
- [ ] **Push notifications** - New game announcements
- [ ] **OTA updates** - EAS Update for instant content updates without store review
- [ ] **Polish unfinished games** - Pick from 13 prototypes in `unfinished-games/`
- [ ] **Leaderboards** - Global/friends leaderboards per game
- [ ] **Onboarding** - First-launch tutorial or walkthrough
