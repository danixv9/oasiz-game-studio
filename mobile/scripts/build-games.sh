#!/usr/bin/env bash
#
# Build all completed games and deploy their dist/ to the CDN.
# Usage: ./build-games.sh [--game <game-name>] [--upload]
#
# Options:
#   --game <name>   Build only the specified game
#   --upload        Upload built games to CDN after building
#
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
BUILT=0
FAILED=0
FAILED_GAMES=""

# Parse args
SINGLE_GAME=""
UPLOAD=false
while [[ $# -gt 0 ]]; do
  case $1 in
    --game) SINGLE_GAME="$2"; shift 2 ;;
    --upload) UPLOAD=true; shift ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

build_game() {
  local game_dir="$1"
  local game_name
  game_name=$(basename "$game_dir")

  # Skip if no publish.json
  if [ ! -f "$game_dir/publish.json" ]; then
    echo "  SKIP $game_name (no publish.json)"
    return 0
  fi

  local title
  title=$(python3 -c "import json; print(json.load(open('$game_dir/publish.json'))['title'])" 2>/dev/null || echo "$game_name")

  echo "  BUILD $title ($game_name)"

  # Install dependencies
  if ! (cd "$game_dir" && bun install --frozen-lockfile 2>/dev/null || bun install); then
    echo "  FAIL  $game_name: bun install failed"
    return 1
  fi

  # Type check
  if ! (cd "$game_dir" && bun run typecheck 2>/dev/null); then
    echo "  WARN  $game_name: typecheck failed (continuing anyway)"
  fi

  # Build
  if ! (cd "$game_dir" && bun run build); then
    echo "  FAIL  $game_name: build failed"
    return 1
  fi

  # Verify output
  if [ ! -f "$game_dir/dist/index.html" ]; then
    echo "  FAIL  $game_name: dist/index.html not found after build"
    return 1
  fi

  local size
  size=$(wc -c < "$game_dir/dist/index.html" | tr -d ' ')
  echo "  OK    $game_name ($(echo "scale=1; $size / 1024" | bc) KB)"
  return 0
}

echo "========================================="
echo "  Oasiz Game Builder"
echo "========================================="
echo ""

if [ -n "$SINGLE_GAME" ]; then
  # Build single game
  game_dir="$REPO_ROOT/$SINGLE_GAME"
  if [ ! -d "$game_dir" ]; then
    echo "ERROR: Game directory not found: $game_dir"
    exit 1
  fi
  if build_game "$game_dir"; then
    BUILT=$((BUILT + 1))
  else
    FAILED=$((FAILED + 1))
    FAILED_GAMES="$SINGLE_GAME"
  fi
else
  # Build all games with publish.json
  for game_dir in "$REPO_ROOT"/*/; do
    game_name=$(basename "$game_dir")

    # Skip non-game directories
    case "$game_name" in
      mobile|template|node_modules|.git|.github) continue ;;
    esac

    # Skip if no publish.json
    [ ! -f "$game_dir/publish.json" ] && continue

    if build_game "$game_dir"; then
      BUILT=$((BUILT + 1))
    else
      FAILED=$((FAILED + 1))
      FAILED_GAMES="$FAILED_GAMES $game_name"
    fi
  done
fi

echo ""
echo "========================================="
echo "  Results: $BUILT built, $FAILED failed"
if [ $FAILED -gt 0 ]; then
  echo "  Failed:$FAILED_GAMES"
fi
echo "========================================="

# Upload to CDN if requested
if [ "$UPLOAD" = true ] && [ $BUILT -gt 0 ]; then
  echo ""
  echo "Deploying CDN..."

  if [ -z "${VERCEL_TOKEN:-}" ]; then
    if [ -f "$REPO_ROOT/.env" ]; then
      export VERCEL_TOKEN
      VERCEL_TOKEN="$(grep -E '^VERCEL_TOKEN=' "$REPO_ROOT/.env" | head -n 1 | cut -d= -f2-)"
    fi
  fi

  if [ -z "${VERCEL_TOKEN:-}" ]; then
    echo "ERROR: VERCEL_TOKEN not set (export VERCEL_TOKEN=... or add it to $REPO_ROOT/.env)"
    exit 1
  fi

  node "$REPO_ROOT/scripts/build-cdn.mjs"
  node "$REPO_ROOT/scripts/sync-legacy-assets.mjs"

  CDN_ORG_ID="${VERCEL_ORG_ID:-team_q1yTUxlbDoLbBdk8L9raGZQg}"
  CDN_PROJECT_ID="${VERCEL_PROJECT_ID:-prj_w5BIiwubESAhAG0wGGp9n2YUyPQG}"
  CDN_URL="${VERCEL_CDN_URL:-https://oasiz-assets.vercel.app}"

  mkdir -p "$REPO_ROOT/cdn/.vercel"
  printf '{"projectId":"%s","orgId":"%s"}\n' "$CDN_PROJECT_ID" "$CDN_ORG_ID" > "$REPO_ROOT/cdn/.vercel/project.json"

  (cd "$REPO_ROOT/cdn" && bun x vercel deploy --prod --yes --token "$VERCEL_TOKEN")
  echo "CDN deployed: $CDN_URL"
fi

exit $FAILED
