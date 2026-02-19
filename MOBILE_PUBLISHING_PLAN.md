# Mobile Auto-Publishing: Android & iOS

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Oasiz Arcade (Expo)                       │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Home Screen: Game Catalog                          │    │
│  │  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐    │    │
│  │  │ Block  │  │ Pac-   │  │ Police │  │ Paper  │    │    │
│  │  │ Blast  │  │ Man    │  │ Chase  │  │ Plane  │... │    │
│  │  └────────┘  └────────┘  └────────┘  └────────┘    │    │
│  └─────────────────────────────────────────────────────┘    │
│                           │                                 │
│                     tap to play                             │
│                           ▼                                 │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Full-Screen WebView                                │    │
│  │  ┌───────────────────────────────────────────────┐  │    │
│  │  │  Game HTML (loaded from CDN)                  │  │    │
│  │  │  https://oasiz-assets.vercel.app/<game>/      │  │    │
│  │  │                                               │  │    │
│  │  │  Bridge JS injected before load:              │  │    │
│  │  │  - window.submitScore → postMessage → native  │  │    │
│  │  │  - window.triggerHaptic → expo-haptics        │  │    │
│  │  │  - window.shareRoomCode → Share API           │  │    │
│  │  └───────────────────────────────────────────────┘  │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  Native Layer: expo-haptics, AsyncStorage, StatusBar        │
└─────────────────────────────────────────────────────────────┘
```

## What's Built

### Mobile App (`mobile/`)

| File | Purpose |
|------|---------|
| `app/_layout.tsx` | Root layout, splash screen, dark theme |
| `app/(tabs)/_layout.tsx` | Tab navigator (Arcade + Settings) |
| `app/(tabs)/index.tsx` | Game catalog: featured banner, category filters, 2-column grid |
| `app/(tabs)/settings.tsx` | Preferences (haptics, sound, music), stats, app info |
| `app/game/[id].tsx` | Full-screen WebView game player with native bridge |
| `components/GameCard.tsx` | Animated game cards with gradients, press effects, glow |
| `components/FeaturedGame.tsx` | Hero banner with floating icon, shimmer, play button |
| `components/CategoryFilter.tsx` | Horizontal category pills with haptic selection |
| `lib/games.ts` | Game manifest (15 games), categories, metadata |
| `lib/bridge.ts` | WebView bridge JS (submitScore, triggerHaptic, shareRoom) |
| `lib/storage.ts` | AsyncStorage for favorites, high scores, play counts, settings |
| `constants/colors.ts` | Dark theme palette (neon purple/cyan/pink) |
| `eas.json` | EAS Build profiles (dev/preview/production) + store submit config |
| `app.json` | Expo config (bundle ID, splash, icons, plugins) |

### Per-Game Publishing (`*/publish.json`)

Every completed game now has a `publish.json` with:
- `title`, `description`, `category`
- `bundleId` (e.g., `ai.oasiz.blockblast`)
- `version`, `ageRating`, `standalone` flag

### CI/CD (`.github/workflows/publish-mobile.yml`)

Automated pipeline:
1. **Build all web games** (bun install + bun run build)
2. **Deploy to CDN** (upload dist/index.html per game)
3. **EAS Build** (cloud build for iOS + Android)
4. **EAS Submit** (push to App Store Connect + Google Play)

Triggers: push to `main` (auto) or manual workflow dispatch.

---

## How to Ship

### First-Time Setup

```bash
# 1. Install dependencies
cd mobile
bun install

# 2. Create Expo account & link project
npx eas login
npx eas init

# 3. Configure credentials
#    iOS: Apple Developer account + App Store Connect API key
#    Android: Google Play service account JSON
npx eas credentials

# 4. Update eas.json submit section with your Apple/Google IDs

# 5. Add EXPO_TOKEN to GitHub repo secrets
```

### Build & Test Locally

```bash
cd mobile
bun start                  # Start Expo dev server
bun run ios                # Run on iOS simulator
bun run android            # Run on Android emulator
```

### Build for Stores

```bash
# Preview build (APK for Android, TestFlight-ready for iOS)
npx eas build --platform all --profile preview

# Production build (AAB for Play Store, IPA for App Store)
npx eas build --platform all --profile production

# Submit to stores
npx eas submit --platform all --latest

# Or do it all at once
npx eas build --platform all --profile production --auto-submit
```

### Automated via GitHub Actions

Push to `main` or manually trigger the `Build & Publish Mobile App` workflow.

Set these GitHub secrets:
| Secret | Value |
|--------|-------|
| `EXPO_TOKEN` | From `npx eas whoami` |
| Apple credentials | Configured via `eas credentials` (stored in EAS) |
| `google-play-service-account.json` | Google Play API key (place in `mobile/`) |

---

## Adding a New Game

1. Create the game in its own directory with `publish.json`
2. Add its entry to `mobile/lib/games.ts` (id, title, gradient, category)
3. Build and deploy the game to CDN: `./mobile/scripts/build-games.sh --game <name> --upload`
4. The app automatically picks it up — no app store update needed (games load from CDN)
5. To update the catalog UI, push to main and EAS will rebuild
