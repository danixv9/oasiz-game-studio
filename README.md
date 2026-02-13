# Oasiz Game Studio

A monorepo of **14 published HTML5 Canvas games** and an **Expo mobile app** that serves them through a native arcade experience. Games are built with TypeScript + Vite, compiled to single-file HTML, and loaded via WebView from a CDN. A CI/CD pipeline automates building, deploying, and submitting to the App Store and Google Play.

> See [documentation.md](./documentation.md) for full technical reference, architecture diagrams, and API details.

---

## Published Games (14)

| Game | Category | Size | Highlights |
|------|----------|------|------------|
| **block-blast** | Puzzle | 88KB | Keyboard + touch, landscape mode, dynamic audio, particle effects |
| **cannon-blaster** | Arcade | 76KB | Castle defense, demo preview mode, object pooling |
| **car-balance** | Physics | 116KB | matter-js physics, multiple car styles |
| **draw-the-thing** | Party | 55KB | Real-time multiplayer (Playroom Kit), synthesized audio (tone.js) |
| **dual-block-dodge** | Action | 19KB | Split-attention, two simultaneous controls |
| **hoops-jump** | Arcade | 42KB | Themed backgrounds (city/mountain/beach), timing-based |
| **pacman** | Arcade | 17KB | Classic maze, mobile D-pad, ghost AI |
| **paddle-bounce** | Arcade | 17KB | Brick breaker, synthesized audio (tone.js), coin collection |
| **paper-plane** | Casual | 53KB | Flight mechanics, obstacle avoidance, particle effects |
| **police-chase** | Action | 29KB | Infinite procedural world, 6 biomes, synthesized audio (tone.js) |
| **saw-dodge** | Action | 30KB | Survival mechanics, double-jump, trail rendering |
| **threes** | Puzzle | 23KB | Tile matching, swipe controls, animated merges |
| **unicycle-hero** | Physics | 13KB | Dual-canvas renderer, post-processing bloom |
| **wordfall** | Puzzle | 11KB | Physics word game (matter-js), bucket catching |

**13 more games** are in development under `unfinished-games/`.

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Games | TypeScript, HTML5 Canvas, Vite 7.3 |
| Build | vite-plugin-singlefile (single `dist/index.html` per game) |
| Package Manager | **Bun** |
| Mobile App | Expo SDK 52, expo-router 4.0, React Native 0.76 |
| Game Container | react-native-webview 13.12.5 |
| Haptics | expo-haptics 14.0 |
| Animations | react-native-reanimated 3.16 |
| Persistence | @react-native-async-storage 2.1 |
| Multiplayer | playroomkit 0.0.95 |
| Physics | matter-js 0.20 |
| Audio | tone.js 14-15 |
| CI/CD | GitHub Actions + EAS Build + EAS Submit |

---

## Quick Start

### Prerequisites

- [Bun](https://bun.sh/) (package manager and test runner)
- [Node.js 20+](https://nodejs.org/) (for Expo CLI / EAS)
- Optional: Expo Go app or iOS/Android simulator for mobile app

### Clone and Run a Game

```bash
git clone https://github.com/oasiz-ai/oasiz-game-studio.git
cd oasiz-game-studio

# Pick any game and run it locally
cd block-blast
bun install
bun run dev     # Opens at http://localhost:5173
```

### Run All Tests

```bash
# From the repo root
bun test tests/     # 275 tests across 4 files
```

### Run the Mobile App

```bash
cd mobile
bun install
bun start           # Expo dev server
# Press 'i' for iOS simulator or 'a' for Android emulator
```

---

## Repository Structure

```
oasiz-game-studio/
├── README.md                          # This file
├── documentation.md                   # Full technical documentation
├── Agents.md                          # AI agent instructions & platform rules
├── BACKLOG.md                         # Game ideas backlog
├── MOBILE_PUBLISHING_PLAN.md          # Mobile app architecture plan
├── progress.md                        # Branch progress report
├── playroom_js.md                     # Playroom Kit multiplayer reference
├── package.json                       # Root: test script only
│
├── template/                          # Starter template for new games
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.js
│
├── tests/                             # Root test suite (275 tests)
│   ├── bridge.test.ts                 #   WebView bridge tests (17)
│   ├── game-builds.test.ts            #   Build infrastructure tests (~14)
│   ├── game-manifest.test.ts          #   Manifest consistency tests (17)
│   └── publish-json.test.ts           #   Schema validation tests (13)
│
├── mobile/                            # Expo mobile app (Oasiz Arcade)
│   ├── app.json                       #   Expo config
│   ├── eas.json                       #   EAS Build/Submit profiles
│   ├── app/
│   │   ├── _layout.tsx                #   Root Stack navigator
│   │   ├── (tabs)/
│   │   │   ├── _layout.tsx            #   Tab nav (Arcade + Settings)
│   │   │   ├── index.tsx              #   Home: featured carousel + game grid
│   │   │   └── settings.tsx           #   Preferences + stats
│   │   └── game/
│   │       └── [id].tsx               #   WebView game player
│   ├── components/
│   │   ├── GameCard.tsx               #   Game card with gradient + badges
│   │   ├── FeaturedGame.tsx           #   Featured carousel card
│   │   └── CategoryFilter.tsx         #   Category filter pills
│   ├── lib/
│   │   ├── games.ts                   #   Game manifest (14 games)
│   │   ├── bridge.ts                  #   WebView bridge injection
│   │   └── storage.ts                 #   AsyncStorage wrapper
│   └── constants/
│       └── colors.ts                  #   Theme colors
│
├── .github/workflows/
│   └── publish-mobile.yml             #   CI/CD pipeline
│
├── <game-name>/                       # 14 published games
│   ├── publish.json                   #   Game metadata
│   ├── package.json                   #   Dependencies + scripts
│   ├── vite.config.js                 #   Vite + singlefile plugin
│   ├── tsconfig.json
│   ├── index.html                     #   Entry HTML + CSS
│   ├── src/main.ts                    #   All game logic
│   └── dist/index.html                #   Built single-file output
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

## Game Development Guide

### Quality Bar

**The bar for quality is a game you'd see on the App Store.** If you wouldn't download it, it shouldn't be on our platform.

- Games must be **fun** and **polished**
- If games are **challenging**, they should increase in difficulty
- All games need professional-grade visuals, animations, and game feel (canvas, sprites, or assets)
- Games should have **depth** (many levels), **high replay value** (increasing difficulty), or ideally both
- Every interaction should feel satisfying ("juice") -- start screen, pause menus, HUD, game over
- Highly recommend generating music using [Suno](https://suno.ai) and sound effects using models like Google Lyria

### Game Categories

| Category | Description |
|----------|-------------|
| **Action** | Fast-paced games requiring quick reflexes |
| **Casual** | Easy to pick up, relaxing gameplay |
| **Puzzle** | Brain teasers and logic challenges |
| **Arcade** | Classic arcade-style mechanics |
| **Party** | Social, multiplayer-friendly games |
| **Physics** | Physics-driven mechanics |

### Creating a New Game

#### Option A: Start from Template

```bash
cp -r template/ my-game-name/
cd my-game-name/
bun install
bun run dev       # http://localhost:5173
```

#### Option B: Fork an Existing Game

```bash
cp -r car-balance/ my-game-name/     # or police-chase, threes, paddle-bounce
cd my-game-name/
bun install
bun run dev
```

### Game File Structure

```
my-game-name/
├── src/main.ts          # ALL game logic (TypeScript only)
├── index.html           # Entry HTML + CSS in <style> tags (no JS here)
├── package.json         # vite, typescript, vite-plugin-singlefile
├── tsconfig.json
├── vite.config.js
├── publish.json         # Add when ready to publish
└── dist/index.html      # Built output (single file)
```

### Build a Game

```bash
cd my-game-name
bun install
bun run build     # Outputs dist/index.html
bun run dev       # Dev server with hot reload
bun run typecheck # TypeScript checking
```

### Platform Requirements

#### Responsive Canvas with DPR Scaling

```typescript
const isMobile = window.matchMedia('(pointer: coarse)').matches;

function resizeCanvas(): void {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = w + "px";
  canvas.style.height = h + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener("resize", resizeCanvas);
```

#### Safe Areas

| Platform | Min top offset | Bottom padding |
|----------|---------------|----------------|
| Desktop | 45px | - |
| Mobile | 120px | 120px |

#### Settings Modal (MANDATORY)

Every game MUST have a settings button (gear icon, top-right) with toggles for:
1. **Music** - Background music on/off
2. **FX** - Sound effects on/off
3. **Haptics** - Vibration on/off

Settings persist via `localStorage`.

#### Score Submission

```typescript
if (typeof (window as any).submitScore === "function") {
  (window as any).submitScore(this.score);
}
// NEVER track high scores locally - the platform handles leaderboards
```

#### Haptic Feedback

```typescript
// Types: "light", "medium", "heavy", "success", "error"
if (typeof (window as any).triggerHaptic === "function") {
  (window as any).triggerHaptic("medium");
}
```

| Type | Use Case |
|------|----------|
| `light` | UI taps, button presses |
| `medium` | Collecting items, standard impacts |
| `heavy` | Explosions, major collisions |
| `success` | Level complete, achievements |
| `error` | Damage, game over |

### Multiplayer Games

Use [Playroom Kit](https://docs.joinplayroom.com/) for real-time networking. See `draw-the-thing/` for a complete working example.

```bash
bun add playroomkit
```

Key requirements:
1. Call `window.shareRoomCode(roomCode)` after connecting
2. Handle injected `window.__ROOM_CODE__` for auto-join
3. Clear room code on leave: `window.shareRoomCode(null)`

See [playroom_js.md](./playroom_js.md) for in-depth Playroom Kit patterns.

### Working with AI (Cursor)

Reference `@AGENTS.md` in your prompts -- it contains all rules for haptics, scoring, responsiveness, settings, safe areas, and performance.

```
@AGENTS.md Create a simple endless runner game with a jumping character
```

### Common Pitfalls

- **Don't** use `Math.random()` in render loops (causes flickering)
- **Don't** use emojis in game UI (inconsistent across platforms)
- **Don't** track high scores locally
- **Don't** put JavaScript in `index.html`
- **Don't** forget to handle window resize
- **Do** pre-calculate random values during object creation
- **Do** use icon libraries instead of emojis
- **Do** call `window.submitScore()` on game over
- **Do** use TypeScript for all game logic
- **Do** test on both mobile and desktop

### Testing Checklist

- [ ] Works on mobile (touch controls)
- [ ] Works on desktop (keyboard/mouse)
- [ ] Settings modal with Music/FX/Haptics toggles
- [ ] Score submits on game over
- [ ] No visual glitches or flickering
- [ ] Responsive at all viewport sizes (375x667, 667x375, 768x1024, 1920x1080)
- [ ] Start screen is polished and engaging
- [ ] Game is actually fun!

---

## Mobile App (Oasiz Arcade)

The mobile app is built with **Expo SDK 52** and **expo-router** for file-based routing. It presents a dark-themed game catalog and loads each game in a full-screen WebView from the CDN.

- **App Name:** Oasiz Arcade
- **Bundle ID:** `ai.oasiz.arcade`
- **Theme:** Dark (#0B0B1E background, #8B5CF6 purple, #EC4899 pink, #06B6D4 cyan)

### Screens

| Screen | Path | Features |
|--------|------|----------|
| Arcade Home | `(tabs)/index.tsx` | Featured carousel (auto-rotates 8s), category filter pills, 2-column game grid |
| Settings | `(tabs)/settings.tsx` | Stats (games played, total score), preferences (haptics/sound/music), about |
| Game Player | `game/[id].tsx` | Full-screen WebView, bridge injection, loading overlay, auto-hiding back button |

### WebView Bridge

Games communicate with the native app through a JavaScript bridge injected before page load:

| Function | Purpose |
|----------|---------|
| `window.submitScore(score)` | Submit score to native storage |
| `window.triggerHaptic(type)` | Trigger native haptic feedback |
| `window.shareRoomCode(code)` | Open native share dialog |
| `window.notifyGameReady()` | Hide loading overlay |
| `window.notifyGameOver(data)` | Signal game end |

User settings (sound/music/haptics) are injected as `window.__OASIZ_SETTINGS__` so games can respect preferences.

### Adding a New Game to the App

1. Build the game: `cd my-game && bun run build`
2. Add a `publish.json` with required fields (see [documentation.md](./documentation.md#publishjson-schema))
3. Add the game to `mobile/lib/games.ts` manifest
4. Upload `dist/index.html` to CDN at `https://assets.oasiz.ai/<game-id>/`
5. The app loads games from CDN -- no app rebuild needed

---

## CI/CD Pipeline

**File:** `.github/workflows/publish-mobile.yml`

```
test → build-games → deploy-cdn → build-mobile → submit-stores
```

| Stage | What It Does | Status |
|-------|-------------|--------|
| Test | `bun test tests/` (275 tests) | Working |
| Build Games | Loop through games, `bun install && bun run build` | Working |
| Deploy CDN | Upload to `assets.oasiz.ai` | **Placeholder** |
| Build Mobile | `eas build --platform all --profile production` | Needs credentials |
| Submit Stores | `eas submit --platform all --latest` | Needs credentials |

**Triggers:** Push to `main` (auto), or manual with platform/profile/auto_submit inputs.

---

## Test Suite

275 tests across 4 files, run with `bun test tests/` from the root.

| Test File | Tests | What It Validates |
|-----------|-------|-------------------|
| `bridge.test.ts` | 17 | Bridge message parsing, WebView injection, settings, double-injection guard |
| `game-builds.test.ts` | ~14 | Each game has package.json, vite.config, tsconfig, src/, index.html |
| `game-manifest.test.ts` | 17 | Manifest consistency, unique IDs, valid categories, disk sync |
| `publish-json.test.ts` | 13 | Schema validation, category enum, bundleId format, semver, unique IDs |

---

## Submitting a Pull Request

1. Fork and clone the repository
2. Create your game (see [Game Development Guide](#game-development-guide) above)
3. Add `publish.json` with game metadata
4. Run `bun test tests/` from root and ensure all tests pass
5. Commit and push to your fork
6. Open a PR with a description of your game

---

## Comprehensive Task List

### Completed

- [x] Mobile publishing plan document
- [x] Expo mobile app shell (catalog UI, game player, settings)
- [x] `publish.json` for all 14 games
- [x] CI/CD pipeline (GitHub Actions, 5 stages)
- [x] Test suite (275 tests, 4 files)
- [x] Block Blast 180+ iteration polish
- [x] Settings bridge (sound/music/haptics injected into WebView)
- [x] DPR scaling for 12 canvas-based games
- [x] Block-blast: duplicate clear removal, ember gradient optimization
- [x] Police-chase: vehicle gradient caching, in-place array removal

### Phase 2: Infrastructure Setup (Next)

- [ ] **Set up CDN hosting** at `assets.oasiz.ai`
  - Choose provider (AWS S3 + CloudFront, Cloudflare R2, or Vercel)
  - Create bucket/zone, configure DNS
  - Upload all 14 game `dist/index.html` files
  - Update `.github/workflows/publish-mobile.yml` deploy-cdn job

- [ ] **Configure EAS credentials**
  - Create Apple Developer account, get App Store Connect API key
  - Create Google Play Console developer account
  - Generate `google-play-service-account.json`
  - Replace placeholders in `mobile/eas.json` (YOUR_APPLE_ID, YOUR_ASC_APP_ID, YOUR_TEAM_ID)
  - Add `EXPO_TOKEN` to GitHub Secrets

- [ ] **Create app store assets**
  - App icon (1024x1024 PNG), splash screen, Android adaptive icon
  - Screenshots at required sizes (iPhone 6.5", 5.5"; iPad; Android)
  - Store listing description and keywords
  - Privacy policy page

### Phase 3: First Store Submission

- [ ] **Device testing** - Build with `eas build --profile preview`, test all 14 games on real devices
- [ ] **Store submission** - Build with `eas build --profile production`, submit with `eas submit`

### Phase 4: Graphics Optimizations (Remaining)

- [ ] Cache gradients in render loops (cannon-blaster ~8/frame, hoops-jump ~25/frame, paddle-bounce ~3/frame, wordfall ~3/frame)
- [ ] Reduce shadow/blur operations (police-chase 28 ops, wordfall per-word)
- [ ] Micro-optimizations: cache `Math.PI * 2`, replace `Date.now()` in render loops, pre-compute rgba strings, cache `measureText` results, off-screen canvas for static backgrounds

### Phase 5: Post-Launch Features

- [ ] GAME_OVER handling (replay prompt, session stats)
- [ ] Favorites UI (heart icon on cards, favorites filter)
- [ ] Analytics (popular games, session length, retention)
- [ ] Push notifications (new game announcements)
- [ ] OTA updates via EAS Update
- [ ] Polish unfinished games (13 prototypes in `unfinished-games/`)
- [ ] Global/friends leaderboards per game
- [ ] Onboarding / first-launch tutorial

---

## Need Help?

1. Check [Agents.md](./Agents.md) for detailed technical requirements
2. Check [documentation.md](./documentation.md) for full architecture reference
3. Look at existing games for implementation patterns
4. Download the Oasiz app to understand the quality bar

**Remember: If it wouldn't be on the App Store, it shouldn't be on Oasiz.**
