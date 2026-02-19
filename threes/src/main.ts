/**
 * THREES! - A charming puzzle game
 *
 * Features:
 * - 4x4 grid with swipe controls
 * - 1+2=3 and matching multiples combine
 * - Personality faces on each tile
 * - Smooth slide and merge animations
 * - Mobile and desktop support
 */

// ============= CONFIGURATION =============
const CONFIG = {
  GRID_SIZE: 4,
  SWIPE_THRESHOLD: 30,
  ANIMATION_DURATION: 150,
  MERGE_ANIMATION_DURATION: 200,
  SPAWN_ANIMATION_DURATION: 250,
};

// Tile colors - Clean, vibrant palette
const TILE_COLORS: Record<
  number,
  { bg: string; bgLight: string; text: string; border: string }
> = {
  1: {
    bg: "#7EC8E3", // Soft Sky Blue
    bgLight: "#7EC8E3",
    text: "#ffffff",
    border: "#6AB8D3",
  },
  2: {
    bg: "#C5B8E8", // Soft Lavender
    bgLight: "#C5B8E8",
    text: "#ffffff",
    border: "#B1A4D4",
  },
  3: {
    bg: "#FFFFFF", // Clean White
    bgLight: "#FFFFFF",
    text: "#5A5A5A",
    border: "#EBE5DB",
  },
  6: {
    bg: "#A8D8B9", // Soft Mint
    bgLight: "#A8D8B9",
    text: "#4A6A55",
    border: "#8EC2A1",
  },
  12: {
    bg: "#E8D1A5", // Soft Sand
    bgLight: "#E8D1A5",
    text: "#6A5A3A",
    border: "#D2BB8F",
  },
  24: {
    bg: "#F5A962", // Warm Peach
    bgLight: "#F5A962",
    text: "#6B4520",
    border: "#E08B3D",
  },
  48: {
    bg: "#E8736C", // Soft Salmon
    bgLight: "#E8736C",
    text: "#6B2520",
    border: "#D05550",
  },
  96: {
    bg: "#6BC5D2", // Soft Teal
    bgLight: "#6BC5D2",
    text: "#1D4A52",
    border: "#4AABB8",
  },
  192: {
    bg: "#E57BA6", // Soft Rose
    bgLight: "#E57BA6",
    text: "#5A2040",
    border: "#CC5A87",
  },
  384: {
    bg: "#B08BD4", // Soft Purple
    bgLight: "#B08BD4",
    text: "#3A2050",
    border: "#9066BB",
  },
  768: {
    bg: "#7DCE82", // Soft Green
    bgLight: "#7DCE82",
    text: "#2D5A30",
    border: "#5CB863",
  },
  1536: {
    bg: "#F0D264", // Gold
    bgLight: "#F0D264",
    text: "#5A4A10",
    border: "#D4B545",
  },
  3072: {
    bg: "#D986C0", // Orchid
    bgLight: "#D986C0",
    text: "#4A1A3A",
    border: "#C066A5",
  },
  6144: {
    bg: "#7EB3E0", // Sky Blue
    bgLight: "#7EB3E0",
    text: "#1A3A5A",
    border: "#5A95C8",
  },
};

function getTileColor(value: number): {
  bg: string;
  bgLight: string;
  text: string;
  border: string;
} {
  if (TILE_COLORS[value]) {
    return TILE_COLORS[value];
  }
  // Fallback for very high values
  return {
    bg: "#ffffff",
    bgLight: "#ffffff",
    text: "#333333",
    border: "#cccccc",
  };
}

// ============= UTILITY FUNCTIONS =============
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

// ============= TILE INTERFACE =============
interface Tile {
  value: number;
  x: number;
  y: number;
  // Animation state
  animX: number;
  animY: number;
  scale: number;
  targetScale: number;
  merging: boolean;
  spawning: boolean;
  spawnProgress: number;
}

// ============= ANIMATION TRACKING =============
interface SlideAnimation {
  tile: Tile;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  progress: number;
  merged: boolean;
}

// ============= AUDIO MANAGER =============
class AudioManager {
  private ctx: AudioContext | null = null;
  private musicBuffer: AudioBuffer | null = null;
  private musicSource: AudioBufferSourceNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicEnabled: boolean = true;
  private sfxEnabled: boolean = true;
  private buffersLoaded: boolean = false;

  constructor() {
    console.log("[AudioManager] Created");
    this.loadState();
  }

  private init(): void {
    if (this.ctx) return;

    try {
      this.ctx = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      this.musicGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();

      this.musicGain.connect(this.ctx.destination);
      this.sfxGain.connect(this.ctx.destination);

      this.updateVolumes();
      console.log("[AudioManager.init] Audio context initialized");

      this.loadMusic();
    } catch (e) {
      console.warn("[AudioManager.init] Failed to initialize audio:", e);
    }
  }

  private loadState(): void {
    const music = localStorage.getItem("threes_music_enabled");
    const sfx = localStorage.getItem("threes_sfx_enabled");
    this.musicEnabled = music !== "false";
    this.sfxEnabled = sfx !== "false";
  }

  private saveState(): void {
    localStorage.setItem("threes_music_enabled", this.musicEnabled.toString());
    localStorage.setItem("threes_sfx_enabled", this.sfxEnabled.toString());
  }

  private updateVolumes(): void {
    if (this.musicGain) this.musicGain.gain.value = this.musicEnabled ? 0.4 : 0;
    if (this.sfxGain) this.sfxGain.gain.value = this.sfxEnabled ? 0.6 : 0;
  }

  async loadMusic(): Promise<void> {
    if (!this.ctx) return;

    try {
      console.log("[AudioManager.loadMusic] Loading music...");
      const response = await fetch("https://oasiz-assets.vercel.app/audio/threes.mp3");
      const arrayBuffer = await response.arrayBuffer();
      this.musicBuffer = await this.ctx.decodeAudioData(arrayBuffer);
      this.buffersLoaded = true;
      console.log("[AudioManager.loadMusic] Music loaded successfully");

      if (this.musicEnabled) {
        this.playMusic();
      }
    } catch (e) {
      console.warn("[AudioManager.loadMusic] Failed to load music:", e);
    }
  }

  playMusic(): void {
    this.init();
    if (!this.ctx || !this.musicBuffer || !this.musicEnabled) return;

    this.stopMusic();

    this.musicSource = this.ctx.createBufferSource();
    this.musicSource.buffer = this.musicBuffer;
    this.musicSource.loop = true;
    this.musicSource.connect(this.musicGain!);
    this.musicSource.start(0);
  }

  stopMusic(): void {
    if (this.musicSource) {
      try {
        this.musicSource.stop();
      } catch (e) {}
      this.musicSource = null;
    }
  }

  toggleMusic(): boolean {
    this.musicEnabled = !this.musicEnabled;
    this.saveState();
    this.updateVolumes();

    if (this.musicEnabled) {
      this.playMusic();
    } else {
      this.stopMusic();
    }

    return this.musicEnabled;
  }

  toggleSFX(): boolean {
    this.sfxEnabled = !this.sfxEnabled;
    this.saveState();
    this.updateVolumes();
    return this.sfxEnabled;
  }

  isMusicEnabled(): boolean {
    return this.musicEnabled;
  }
  isSFXEnabled(): boolean {
    return this.sfxEnabled;
  }

  // synthesized sound effects
  playMoveSFX(): void {
    this.init();
    if (!this.ctx || !this.sfxEnabled) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "square";
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.1);

    osc.connect(gain);
    gain.connect(this.sfxGain!);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  playMergeSFX(): void {
    this.init();
    if (!this.ctx || !this.sfxEnabled) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(440, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(
      880,
      this.ctx.currentTime + 0.15,
    );

    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);

    osc.connect(gain);
    gain.connect(this.sfxGain!);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.2);
  }

  playSpawnSFX(): void {
    this.init();
    if (!this.ctx || !this.sfxEnabled) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(200, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(
      600,
      this.ctx.currentTime + 0.1,
    );

    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.1);

    osc.connect(gain);
    gain.connect(this.sfxGain!);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  playClickSFX(): void {
    this.init();
    if (!this.ctx || !this.sfxEnabled) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);

    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(this.sfxGain!);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.05);
  }
}

// ============= TILE DECK =============
class TileDeck {
  private deck: number[] = [];
  private lastDrawn: number = 0;

  constructor() {
    this.refillDeck();
  }

  private refillDeck(): void {
    // Deck composition: more 1s, balanced 2s and 3s
    // 1s can repeat, 2s and 3s are spread out
    this.deck = [
      1,
      1,
      1,
      1, // Four 1s
      2,
      2,
      2, // Three 2s
      3,
      3,
      3, // Three 3s
    ];
    this.shuffle();
    console.log("[TileDeck.refillDeck] New deck:", this.deck.join(", "));
  }

  private shuffle(): void {
    // Fisher-Yates shuffle
    for (let i = this.deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
    }
  }

  draw(): number {
    if (this.deck.length === 0) {
      this.refillDeck();
    }

    let drawn = this.deck.pop()!;

    // Prevent 2s and 3s from repeating consecutively
    // Only 1s can repeat
    if (drawn !== 1 && drawn === this.lastDrawn && this.deck.length > 0) {
      // Put it back and try again
      this.deck.unshift(drawn);
      this.shuffle();
      drawn = this.deck.pop()!;
    }

    this.lastDrawn = drawn;
    console.log("[TileDeck.draw] Drew:", drawn, "Remaining:", this.deck.length);
    return drawn;
  }

  peek(): number {
    if (this.deck.length === 0) {
      this.refillDeck();
    }
    return this.deck[this.deck.length - 1];
  }
}

// ============= GAME STATE =============
interface GameState {
  grid: (Tile | null)[][];
  nextTileValue: number;
  score: number;
  highScore: number;
  movesMade: number;
  mergesMade: number;
  highestTile: number;
  gameOver: boolean;
  started: boolean;
  animating: boolean;
}

// ============= MAIN GAME CLASS =============
class ThreesGame {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  // Game state
  state: GameState;

  // Layout
  cellSize: number = 0;
  gridOffsetX: number = 0;
  gridOffsetY: number = 0;
  gridPadding: number = 8;
  cellGap: number = 8;

  // Audio
  audio: AudioManager;

  // Input state
  touchStartX: number = 0;
  touchStartY: number = 0;
  touchEndX: number = 0;
  touchEndY: number = 0;
  isTouching: boolean = false;

  // Animations
  slideAnimations: SlideAnimation[] = [];
  lastMovedLines: Set<number> = new Set();
  lastMoveDirection: "up" | "down" | "left" | "right" | null = null;

  // Timing
  lastTime: number = 0;

  // Mobile detection
  isMobile: boolean;

  // Tile deck for fair randomization
  tileDeck: TileDeck;

  constructor() {
    console.log("[ThreesGame] Initializing game");

    this.canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
    this.ctx = this.canvas.getContext("2d")!;

    this.isMobile = window.matchMedia("(pointer: coarse)").matches;
    this.tileDeck = new TileDeck();
    this.audio = new AudioManager();

    this.state = this.createInitialState();

    this.setupEventListeners();
    this.resizeCanvas();

    window.addEventListener("resize", () => this.resizeCanvas());

    // Start the game loop
    requestAnimationFrame((t) => this.gameLoop(t));
  }

  createInitialState(): GameState {
    console.log("[ThreesGame.createInitialState]");
    const grid: (Tile | null)[][] = [];
    for (let y = 0; y < CONFIG.GRID_SIZE; y++) {
      grid[y] = [];
      for (let x = 0; x < CONFIG.GRID_SIZE; x++) {
        grid[y][x] = null;
      }
    }

    return {
      grid,
      nextTileValue: this.generateNextTileValue(),
      score: 0,
      highScore: this.loadHighScore(),
      movesMade: 0,
      mergesMade: 0,
      highestTile: 0,
      gameOver: false,
      started: false,
      animating: false,
    };
  }

  loadHighScore(): number {
    try {
      return parseInt(localStorage.getItem("threes_highscore") || "0", 10);
    } catch {
      return 0;
    }
  }

  saveHighScore(score: number): void {
    try {
      localStorage.setItem("threes_highscore", score.toString());
    } catch {
      // Ignore storage errors
    }
  }

  generateNextTileValue(): number {
    // Use the deck for fair, non-repeating distribution
    return this.tileDeck.draw();
  }

  resizeCanvas(): void {
    console.log("[ThreesGame.resizeCanvas]");
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.calculateLayout();
  }

  calculateLayout(): void {
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Top safe area for mobile
    const topSafeArea = this.isMobile ? 100 : 80;
    const bottomPadding = this.isMobile ? 40 : 60;

    // Calculate grid size to fit nicely
    const availableWidth = w - 40;
    const availableHeight = h - topSafeArea - bottomPadding;

    const maxGridSize = Math.min(availableWidth, availableHeight, 500);

    // Cell size accounts for gaps
    const totalGaps =
      (CONFIG.GRID_SIZE - 1) * this.cellGap + this.gridPadding * 2;
    this.cellSize = (maxGridSize - totalGaps) / CONFIG.GRID_SIZE;

    const gridWidth =
      CONFIG.GRID_SIZE * this.cellSize +
      (CONFIG.GRID_SIZE - 1) * this.cellGap +
      this.gridPadding * 2;
    const gridHeight = gridWidth;

    this.gridOffsetX = (w - gridWidth) / 2;
    this.gridOffsetY = topSafeArea + (availableHeight - gridHeight) / 2;

    console.log("[ThreesGame.calculateLayout] cellSize:", this.cellSize);
  }

  setupEventListeners(): void {
    console.log("[ThreesGame.setupEventListeners]");

    // Start buttons
    document.getElementById("startButton")?.addEventListener("click", () => {
      this.audio.playClickSFX();
      this.startGame();
    });
    document.getElementById("restartButton")?.addEventListener("click", () => {
      this.audio.playClickSFX();
      this.startGame();
    });
    document.getElementById("galleryButton")?.addEventListener("click", () => {
      this.audio.playClickSFX();
      this.showGallery();
    });
    document
      .getElementById("gameOverGalleryButton")
      ?.addEventListener("click", () => {
        this.audio.playClickSFX();
        this.showGalleryFromGameOver();
      });
    document
      .getElementById("galleryBackButton")
      ?.addEventListener("click", () => {
        this.audio.playClickSFX();
        this.hideGallery();
      });

    // Audio Toggles
    document.getElementById("musicToggle")?.addEventListener("click", () => {
      this.audio.toggleMusic();
      this.updateAudioButtons();
      this.audio.playClickSFX();
    });

    document.getElementById("sfxToggle")?.addEventListener("click", () => {
      this.audio.toggleSFX();
      this.updateAudioButtons();
      this.audio.playClickSFX();
    });

    this.updateAudioButtons();

    // Mouse events
    this.canvas.addEventListener("mousedown", (e) =>
      this.onPointerDown(e.clientX, e.clientY),
    );
    this.canvas.addEventListener("mousemove", (e) =>
      this.onPointerMove(e.clientX, e.clientY),
    );
    this.canvas.addEventListener("mouseup", () => this.onPointerUp());

    // Touch events
    this.canvas.addEventListener(
      "touchstart",
      (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        this.onPointerDown(touch.clientX, touch.clientY);
      },
      { passive: false },
    );

    this.canvas.addEventListener(
      "touchmove",
      (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        this.onPointerMove(touch.clientX, touch.clientY);
      },
      { passive: false },
    );

    this.canvas.addEventListener(
      "touchend",
      (e) => {
        e.preventDefault();
        this.onPointerUp();
      },
      { passive: false },
    );

    // Keyboard events
    window.addEventListener("keydown", (e) => this.onKeyDown(e));
  }

  updateAudioButtons(): void {
    const musicBtn = document.getElementById("musicToggle");
    const sfxBtn = document.getElementById("sfxToggle");
    
    if (musicBtn) {
      const on = this.audio.isMusicEnabled();
      musicBtn.classList.toggle("muted", !on);
      document.getElementById("musicOnIcon")!.style.display = on ? "block" : "none";
      document.getElementById("musicOffIcon")!.style.display = on ? "none" : "block";
    }
    
    if (sfxBtn) {
      const on = this.audio.isSFXEnabled();
      sfxBtn.classList.toggle("muted", !on);
      document.getElementById("sfxOnIcon")!.style.display = on ? "block" : "none";
      document.getElementById("sfxOffIcon")!.style.display = on ? "none" : "block";
    }
  }

  startGame(): void {
    console.log("[ThreesGame.startGame]");

    // Try to play music on start
    this.audio.playMusic();

    // Reset the tile deck for a fresh game
    this.tileDeck = new TileDeck();

    this.state = this.createInitialState();
    this.state.started = true;
    this.state.highScore = this.loadHighScore();

    // Spawn initial tiles (9 tiles to start like original Threes)
    this.spawnInitialTiles();

    // Hide screens, show HUD
    document.getElementById("startScreen")?.classList.add("hidden");
    document.getElementById("gameOverScreen")?.classList.add("hidden");
    document.getElementById("hud")!.style.display = "flex";

    this.updateHUD();
    this.updateNextTilePreview();
  }

  spawnInitialTiles(): void {
    console.log("[ThreesGame.spawnInitialTiles]");

    // Spawn 2 tiles in random positions
    const positions: [number, number][] = [];
    for (let y = 0; y < CONFIG.GRID_SIZE; y++) {
      for (let x = 0; x < CONFIG.GRID_SIZE; x++) {
        positions.push([x, y]);
      }
    }

    // Shuffle positions
    for (let i = positions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [positions[i], positions[j]] = [positions[j], positions[i]];
    }

    // Spawn exactly one 1 and one 2
    const values = [1, 2];
    for (let i = 0; i < values.length; i++) {
      const [x, y] = positions[i];
      const value = values[i];
      this.state.grid[y][x] = this.createTile(value, x, y);
      this.state.highestTile = Math.max(this.state.highestTile, value);
    }
  }

  createTile(
    value: number,
    x: number,
    y: number,
    spawning: boolean = false,
  ): Tile {
    return {
      value,
      x,
      y,
      animX: x,
      animY: y,
      scale: spawning ? 0 : 1,
      targetScale: 1,
      merging: false,
      spawning,
      spawnProgress: spawning ? 0 : 1,
    };
  }

  onPointerDown(x: number, y: number): void {
    if (!this.state.started || this.state.gameOver || this.state.animating)
      return;

    this.touchStartX = x;
    this.touchStartY = y;
    this.touchEndX = x;
    this.touchEndY = y;
    this.isTouching = true;
  }

  onPointerMove(x: number, y: number): void {
    if (!this.isTouching) return;
    this.touchEndX = x;
    this.touchEndY = y;
  }

  onPointerUp(): void {
    if (
      !this.isTouching ||
      !this.state.started ||
      this.state.gameOver ||
      this.state.animating
    ) {
      this.isTouching = false;
      return;
    }

    // Detect swipe direction
    const direction = this.detectSwipe(this.touchEndX, this.touchEndY);
    this.isTouching = false;

    if (direction) {
      this.performMove(direction);
    }
  }

  onKeyDown(e: KeyboardEvent): void {
    if (!this.state.started || this.state.gameOver || this.state.animating)
      return;

    let direction: "up" | "down" | "left" | "right" | null = null;

    switch (e.key) {
      case "ArrowUp":
      case "w":
      case "W":
        direction = "up";
        break;
      case "ArrowDown":
      case "s":
      case "S":
        direction = "down";
        break;
      case "ArrowLeft":
      case "a":
      case "A":
        direction = "left";
        break;
      case "ArrowRight":
      case "d":
      case "D":
        direction = "right";
        break;
    }

    if (direction) {
      e.preventDefault();
      this.performMove(direction);
    }
  }

  // Handle swipe detection
  detectSwipe(
    endX: number,
    endY: number,
  ): "up" | "down" | "left" | "right" | null {
    const dx = endX - this.touchStartX;
    const dy = endY - this.touchStartY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (Math.max(absDx, absDy) < CONFIG.SWIPE_THRESHOLD) {
      return null;
    }

    if (absDx > absDy) {
      return dx > 0 ? "right" : "left";
    } else {
      return dy > 0 ? "down" : "up";
    }
  }

  performMove(direction: "up" | "down" | "left" | "right"): void {
    console.log("[ThreesGame.performMove]", direction);

    const moved = this.slideTiles(direction);

    if (moved) {
      this.state.movesMade++;
      this.state.animating = true;
      this.audio.playMoveSFX();

      // After animation, spawn new tile
      setTimeout(() => {
        this.spawnNewTile(direction);
        this.state.animating = false;
        this.calculateScore();
        this.updateHUD();

        // Generate next tile value for preview
        this.state.nextTileValue = this.generateNextTileValue();
        this.updateNextTilePreview();

        // Check game over
        if (this.checkGameOver()) {
          this.endGame();
        }
      }, CONFIG.ANIMATION_DURATION + 50);
    }
  }

  slideTiles(direction: "up" | "down" | "left" | "right"): boolean {
    let moved = false;
    this.slideAnimations = [];
    this.lastMovedLines = new Set();
    this.lastMoveDirection = direction;

    const dx = direction === "left" ? -1 : direction === "right" ? 1 : 0;
    const dy = direction === "up" ? -1 : direction === "down" ? 1 : 0;

    // Track which tiles have merged this move
    const mergedThisMove = new Set<Tile>();

    // Process tiles in correct order based on direction
    const coords: [number, number][] = [];
    for (let y = 0; y < CONFIG.GRID_SIZE; y++) {
      for (let x = 0; x < CONFIG.GRID_SIZE; x++) {
        coords.push([x, y]);
      }
    }

    // Sort to process leading tiles first
    if (direction === "right") coords.sort((a, b) => b[0] - a[0]);
    else if (direction === "left") coords.sort((a, b) => a[0] - b[0]);
    else if (direction === "down") coords.sort((a, b) => b[1] - a[1]);
    else if (direction === "up") coords.sort((a, b) => a[1] - b[1]);

    for (const [x, y] of coords) {
      const tile = this.state.grid[y][x];
      if (!tile) continue;

      const newX = x + dx;
      const newY = y + dy;

      // Check bounds
      if (
        newX < 0 ||
        newX >= CONFIG.GRID_SIZE ||
        newY < 0 ||
        newY >= CONFIG.GRID_SIZE
      ) {
        continue;
      }

      const targetTile = this.state.grid[newY][newX];

      if (targetTile === null) {
        // Move into empty space
        this.state.grid[newY][newX] = tile;
        this.state.grid[y][x] = null;
        tile.x = newX;
        tile.y = newY;

        // Track which line moved for spawning
        if (direction === "left" || direction === "right") {
          this.lastMovedLines.add(y);
        } else {
          this.lastMovedLines.add(x);
        }

        this.slideAnimations.push({
          tile,
          fromX: x,
          fromY: y,
          toX: newX,
          toY: newY,
          progress: 0,
          merged: false,
        });

        moved = true;
      } else if (
        this.canMerge(tile, targetTile) &&
        !mergedThisMove.has(targetTile)
      ) {
        // Merge tiles
        const newValue = tile.value + targetTile.value;

        // Remove source tile
        this.state.grid[y][x] = null;

        // Update target tile
        targetTile.value = newValue;
        targetTile.merging = true;
        targetTile.scale = 1;
        targetTile.targetScale = 1.2;
        mergedThisMove.add(targetTile);

        this.state.mergesMade++;
        this.state.highestTile = Math.max(this.state.highestTile, newValue);
        this.audio.playMergeSFX();

        // Track which line moved for spawning
        if (direction === "left" || direction === "right") {
          this.lastMovedLines.add(y);
        } else {
          this.lastMovedLines.add(x);
        }

        this.slideAnimations.push({
          tile,
          fromX: x,
          fromY: y,
          toX: newX,
          toY: newY,
          progress: 0,
          merged: true,
        });

        // Reset merge animation after delay
        setTimeout(() => {
          targetTile.targetScale = 1;
          targetTile.merging = false;
        }, CONFIG.MERGE_ANIMATION_DURATION);

        moved = true;
      }
    }

    return moved;
  }

  canMerge(tile1: Tile, tile2: Tile): boolean {
    // 1 and 2 can merge to make 3
    if (
      (tile1.value === 1 && tile2.value === 2) ||
      (tile1.value === 2 && tile2.value === 1)
    ) {
      return true;
    }

    // Same values >= 3 can merge
    if (tile1.value >= 3 && tile1.value === tile2.value) {
      return true;
    }

    return false;
  }

  spawnNewTile(direction: "up" | "down" | "left" | "right"): void {
    console.log("[ThreesGame.spawnNewTile]", direction);

    // Use stored moved lines (saved before animations cleared them)
    if (this.lastMovedLines.size === 0) {
      console.log("[ThreesGame.spawnNewTile] No moved lines, skipping spawn");
      return;
    }

    // Get spawn positions on opposite edge
    const spawnPositions: [number, number][] = [];

    for (const line of this.lastMovedLines) {
      let x: number, y: number;

      switch (direction) {
        case "left":
          x = CONFIG.GRID_SIZE - 1;
          y = line;
          break;
        case "right":
          x = 0;
          y = line;
          break;
        case "up":
          x = line;
          y = CONFIG.GRID_SIZE - 1;
          break;
        case "down":
          x = line;
          y = 0;
          break;
      }

      if (this.state.grid[y][x] === null) {
        spawnPositions.push([x, y]);
      }
    }

    if (spawnPositions.length === 0) {
      console.log("[ThreesGame.spawnNewTile] No valid spawn positions");
      return;
    }

    // Pick random spawn position
    const [spawnX, spawnY] =
      spawnPositions[Math.floor(Math.random() * spawnPositions.length)];

    // Create new tile with spawn animation
    const newTile = this.createTile(
      this.state.nextTileValue,
      spawnX,
      spawnY,
      true,
    );
    this.state.grid[spawnY][spawnX] = newTile;
    this.state.highestTile = Math.max(
      this.state.highestTile,
      this.state.nextTileValue,
    );

    this.audio.playSpawnSFX();

    console.log(
      "[ThreesGame.spawnNewTile] Spawned",
      this.state.nextTileValue,
      "at",
      spawnX,
      spawnY,
    );
  }

  checkGameOver(): boolean {
    // Check if any moves are possible

    // First, check for empty cells
    for (let y = 0; y < CONFIG.GRID_SIZE; y++) {
      for (let x = 0; x < CONFIG.GRID_SIZE; x++) {
        if (this.state.grid[y][x] === null) {
          return false;
        }
      }
    }

    // Check for possible merges
    for (let y = 0; y < CONFIG.GRID_SIZE; y++) {
      for (let x = 0; x < CONFIG.GRID_SIZE; x++) {
        const tile = this.state.grid[y][x];
        if (!tile) continue;

        // Check right neighbor
        if (x < CONFIG.GRID_SIZE - 1) {
          const right = this.state.grid[y][x + 1];
          if (right && this.canMerge(tile, right)) {
            return false;
          }
        }

        // Check bottom neighbor
        if (y < CONFIG.GRID_SIZE - 1) {
          const bottom = this.state.grid[y + 1][x];
          if (bottom && this.canMerge(tile, bottom)) {
            return false;
          }
        }
      }
    }

    console.log("[ThreesGame.checkGameOver] No valid moves!");
    return true;
  }

  calculateScore(): void {
    let score = 0;

    for (let y = 0; y < CONFIG.GRID_SIZE; y++) {
      for (let x = 0; x < CONFIG.GRID_SIZE; x++) {
        const tile = this.state.grid[y][x];
        if (tile && tile.value >= 3) {
          // Score = 3^rank where rank = log3(value/3) + 1
          const rank = Math.log(tile.value / 3) / Math.log(2) + 1;
          score += Math.pow(3, rank);
        }
      }
    }

    this.state.score = Math.round(score);
  }

  endGame(): void {
    console.log("[ThreesGame.endGame] Final score:", this.state.score);

    this.state.gameOver = true;

    // 1. Submit the final score to the leaderboard
    if (typeof (window as any).submitScore === "function") {
      (window as any).submitScore(this.state.score);
      console.log("[ThreesGame.endGame] Score submitted:", this.state.score);
    }

    // 2. Check for new high score
    const isNewHighScore = this.state.score > this.state.highScore;
    if (isNewHighScore) {
      this.state.highScore = this.state.score;
      this.saveHighScore(this.state.score);
    }

    // 3. Update game over screen
    document.getElementById("finalScore")!.textContent =
      this.state.score.toString();
    document.getElementById("movesMade")!.textContent =
      this.state.movesMade.toString();
    document.getElementById("mergesMade")!.textContent =
      this.state.mergesMade.toString();
    document.getElementById("highestTile")!.textContent =
      "highest: " + this.state.highestTile;

    // 4. Show game over screen
    setTimeout(() => {
      document.getElementById("gameOverScreen")?.classList.remove("hidden");
    }, 500);
  }

  updateHUD(): void {
    const scoreEl = document.getElementById("score")!;
    const oldScore = parseInt(scoreEl.textContent || "0", 10);
    const newScore = this.state.score;

    scoreEl.textContent = newScore.toString();
    document.getElementById("highScore")!.textContent =
      this.state.highScore.toString();

    if (newScore > oldScore) {
      scoreEl.classList.remove("bump");
      void scoreEl.offsetWidth;
      scoreEl.classList.add("bump");
    }
  }

  updateNextTilePreview(): void {
    const preview = document.getElementById("nextTilePreview")!;
    const color = getTileColor(this.state.nextTileValue);
    preview.style.background =
      "linear-gradient(145deg, " + color.bg + ", " + color.bgLight + ")";
    preview.style.border = "2px solid " + color.border;
    preview.innerHTML =
      '<span style="color: ' +
      color.text +
      '; font-family: Quicksand; font-weight: 700; font-size: 1.4rem;">' +
      this.state.nextTileValue +
      "</span>";

    preview.classList.remove("bounce");
    void preview.offsetWidth;
    preview.classList.add("bounce");
  }

  // ============= GAME LOOP =============
  gameLoop(timestamp: number): void {
    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1);
    this.lastTime = timestamp;

    this.update(dt);
    this.render();

    requestAnimationFrame((t) => this.gameLoop(t));
  }

  update(dt: number): void {
    // Update slide animations
    for (let i = this.slideAnimations.length - 1; i >= 0; i--) {
      const anim = this.slideAnimations[i];
      anim.progress += dt / (CONFIG.ANIMATION_DURATION / 1000);

      if (anim.progress >= 1) {
        anim.progress = 1;
        anim.tile.animX = anim.toX;
        anim.tile.animY = anim.toY;
        this.slideAnimations.splice(i, 1);
      } else {
        const t = easeOutCubic(anim.progress);
        anim.tile.animX = lerp(anim.fromX, anim.toX, t);
        anim.tile.animY = lerp(anim.fromY, anim.toY, t);
      }
    }

    // Update tile animations
    for (let y = 0; y < CONFIG.GRID_SIZE; y++) {
      for (let x = 0; x < CONFIG.GRID_SIZE; x++) {
        const tile = this.state.grid[y][x];
        if (!tile) continue;

        // Sync position if not animating
        if (this.slideAnimations.length === 0) {
          tile.animX = tile.x;
          tile.animY = tile.y;
        }

        // Spawn animation
        if (tile.spawning) {
          tile.spawnProgress += dt / (CONFIG.SPAWN_ANIMATION_DURATION / 1000);
          if (tile.spawnProgress >= 1) {
            tile.spawnProgress = 1;
            tile.spawning = false;
            tile.scale = 1;
          } else {
            tile.scale = easeOutBack(tile.spawnProgress);
          }
        }

        // Merge scale animation
        if (tile.merging) {
          tile.scale = lerp(tile.scale, tile.targetScale, 0.3);
        } else {
          tile.scale = lerp(tile.scale, 1, 0.2);
        }
      }
    }

    // Handle swipe on canvas (check touch movement)
    if (this.isTouching) {
      // We already have touchStart position, will check on pointer up
    }
  }

  render(): void {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Softer cream background
    ctx.fillStyle = "#f5f0e8";
    ctx.fillRect(0, 0, w, h);

    if (this.state.started) {
      this.renderGrid(ctx);
    }
  }

  renderGrid(ctx: CanvasRenderingContext2D): void {
    const gridWidth =
      CONFIG.GRID_SIZE * this.cellSize +
      (CONFIG.GRID_SIZE - 1) * this.cellGap +
      this.gridPadding * 2;
    const gridHeight = gridWidth;

    // Draw grid background (Softer Brown/Cream)
    ctx.fillStyle = "#DED6C8";
    this.roundRect(
      ctx,
      this.gridOffsetX,
      this.gridOffsetY,
      gridWidth,
      gridHeight,
      16,
    );
    ctx.fill();

    // Subtle inner shadow for grid
    ctx.strokeStyle = "rgba(0,0,0,0.05)";
    ctx.lineWidth = 4;
    this.roundRect(
      ctx,
      this.gridOffsetX,
      this.gridOffsetY,
      gridWidth,
      gridHeight,
      16,
    );
    ctx.stroke();

    // Draw empty cell backgrounds (Lighter Cream)
    for (let y = 0; y < CONFIG.GRID_SIZE; y++) {
      for (let x = 0; x < CONFIG.GRID_SIZE; x++) {
        const cellX =
          this.gridOffsetX +
          this.gridPadding +
          x * (this.cellSize + this.cellGap);
        const cellY =
          this.gridOffsetY +
          this.gridPadding +
          y * (this.cellSize + this.cellGap);

        ctx.fillStyle = "#EDE6D9";
        this.roundRect(ctx, cellX, cellY, this.cellSize, this.cellSize, 10);
        ctx.fill();
      }
    }

    // Draw tiles
    for (let y = 0; y < CONFIG.GRID_SIZE; y++) {
      for (let x = 0; x < CONFIG.GRID_SIZE; x++) {
        const tile = this.state.grid[y][x];
        if (tile) {
          this.renderTile(ctx, tile);
        }
      }
    }
  }

  renderTile(ctx: CanvasRenderingContext2D, tile: Tile): void {
    const cellX =
      this.gridOffsetX +
      this.gridPadding +
      tile.animX * (this.cellSize + this.cellGap);
    const cellY =
      this.gridOffsetY +
      this.gridPadding +
      tile.animY * (this.cellSize + this.cellGap);

    const centerX = cellX + this.cellSize / 2;
    const centerY = cellY + this.cellSize / 2;
    const radius = 12;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.scale(tile.scale, tile.scale);
    ctx.translate(-centerX, -centerY);

    const color = getTileColor(tile.value);

    // Clean, minimal drop shadow
    ctx.shadowColor = "rgba(0,0,0,0.25)";
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 3;

    // Draw main tile background - clean solid color
    ctx.fillStyle = color.bg;
    this.roundRect(ctx, cellX, cellY, this.cellSize, this.cellSize, radius);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // Tiny bottom accent strip (only 8% of tile height)
    const accentHeight = this.cellSize * 0.08;
    ctx.fillStyle = color.border;
    ctx.beginPath();
    ctx.moveTo(cellX + radius, cellY + this.cellSize);
    ctx.lineTo(cellX + this.cellSize - radius, cellY + this.cellSize);
    ctx.quadraticCurveTo(
      cellX + this.cellSize,
      cellY + this.cellSize,
      cellX + this.cellSize,
      cellY + this.cellSize - radius,
    );
    ctx.lineTo(cellX + this.cellSize, cellY + this.cellSize - accentHeight);
    ctx.lineTo(cellX, cellY + this.cellSize - accentHeight);
    ctx.lineTo(cellX, cellY + this.cellSize - radius);
    ctx.quadraticCurveTo(
      cellX,
      cellY + this.cellSize,
      cellX + radius,
      cellY + this.cellSize,
    );
    ctx.closePath();
    ctx.fill();

    // Draw face and number
    this.renderTileFace(ctx, tile, cellX, cellY);

    ctx.restore();
  }

  renderTileFace(
    ctx: CanvasRenderingContext2D,
    tile: Tile,
    cellX: number,
    cellY: number,
  ): void {
    const color = getTileColor(tile.value);
    const cx = cellX + this.cellSize / 2;
    const cy = cellY + this.cellSize / 2;
    const size = this.cellSize;

    // For 1, 2, 3 - clean centered number, no personality
    if (tile.value <= 3) {
      const fontSize = size * 0.5;
      ctx.font = "700 " + fontSize + "px Quicksand, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = color.text;
      ctx.fillText(tile.value.toString(), cx, cy);
      return;
    }

    // Track discovery
    this.markDiscovered(tile.value);

    // For 6, 12 - simple cute faces
    if (tile.value === 6) {
      this.draw6Face(ctx, cx, cy, size, color.text);
      this.drawNumber(ctx, cx, cellY, size, tile.value, color.text);
      return;
    }
    if (tile.value === 12) {
      this.draw12Face(ctx, cx, cy, size, color.text);
      this.drawNumber(ctx, cx, cellY, size, tile.value, color.text);
      return;
    }

    // For 24+ - unique character personalities!
    const faceY = cy - size * 0.08;

    if (tile.value === 24) {
      // CHEF - with chef hat
      this.drawChefCharacter(ctx, cx, faceY, size, color.text);
    } else if (tile.value === 48) {
      // COOL - sunglasses
      this.drawCoolCharacter(ctx, cx, faceY, size, color.text);
    } else if (tile.value === 96) {
      // PIRATE - eye patch and bandana
      this.drawPirateCharacter(ctx, cx, faceY, size, color.text);
    } else if (tile.value === 192) {
      // ALIEN - antennae and big eyes
      this.drawAlienCharacter(ctx, cx, faceY, size, color.text);
    } else if (tile.value === 384) {
      // ROBOT - antenna and square eyes
      this.drawRobotCharacter(ctx, cx, faceY, size, color.text);
    } else if (tile.value === 768) {
      // WIZARD - pointed hat and beard
      this.drawWizardCharacter(ctx, cx, faceY, size, color.text);
    } else if (tile.value === 1536) {
      // KING - crown and regal expression
      this.drawKingCharacter(ctx, cx, faceY, size, color.text);
    } else if (tile.value === 3072) {
      // NINJA - mask with only eyes visible
      this.drawNinjaCharacter(ctx, cx, faceY, size, color.text);
    } else if (tile.value === 6144) {
      // ASTRONAUT - helmet with visor
      this.drawAstronautCharacter(ctx, cx, faceY, size, color.text);
    } else {
      // LEGEND - star eyes, glowing aura
      this.drawLegendCharacter(ctx, cx, faceY, size, color.text);
    }

    this.drawNumber(ctx, cx, cellY, size, tile.value, color.text);
  }

  // ============= SIMPLE FACES (6, 12) =============

  draw6Face(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    size: number,
    color: string,
  ): void {
    const faceY = cy - size * 0.1;
    const eyeSpacing = size * 0.15;
    const eyeSize = size * 0.05;

    // Simple cute dot eyes
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx - eyeSpacing, faceY, eyeSize, 0, Math.PI * 2);
    ctx.arc(cx + eyeSpacing, faceY, eyeSize, 0, Math.PI * 2);
    ctx.fill();

    // Tiny cute smile
    ctx.strokeStyle = color;
    ctx.lineWidth = size * 0.03;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(
      cx,
      faceY + size * 0.02,
      size * 0.08,
      0.15 * Math.PI,
      0.85 * Math.PI,
    );
    ctx.stroke();
  }

  draw12Face(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    size: number,
    color: string,
  ): void {
    const faceY = cy - size * 0.1;
    const eyeSpacing = size * 0.15;
    const eyeSize = size * 0.06;

    // "Happy" eyes (arcs)
    ctx.strokeStyle = color;
    ctx.lineWidth = size * 0.04;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(
      cx - eyeSpacing,
      faceY + size * 0.02,
      eyeSize,
      1.1 * Math.PI,
      1.9 * Math.PI,
    );
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(
      cx + eyeSpacing,
      faceY + size * 0.02,
      eyeSize,
      1.1 * Math.PI,
      1.9 * Math.PI,
    );
    ctx.stroke();

    // Cute tiny cat mouth
    ctx.beginPath();
    ctx.arc(cx - size * 0.025, faceY + size * 0.08, size * 0.035, 0, Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx + size * 0.025, faceY + size * 0.08, size * 0.035, 0, Math.PI);
    ctx.stroke();
  }

  drawNumber(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cellY: number,
    size: number,
    value: number,
    color: string,
  ): void {
    const fontSize = size * (value >= 1000 ? 0.22 : value >= 100 ? 0.26 : 0.3);
    ctx.font = "700 " + fontSize + "px Quicksand, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillStyle = color;
    ctx.fillText(value.toString(), cx, cellY + size - size * 0.06);
  }

  // ============= CHARACTER DESIGNS (SUPER CUTE!) =============

  drawBlush(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    size: number,
  ): void {
    // No longer drawing blush
  }

  drawKawaiiEyes(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    size: number,
    color: string,
    expression: "happy" | "sparkle" | "wink" | "normal" = "normal",
  ): void {
    const eyeSpacing = size * 0.18;
    const eyeSize = size * 0.07;

    ctx.fillStyle = color;

    if (expression === "sparkle") {
      this.drawStar(ctx, cx - eyeSpacing, cy, eyeSize, 4);
      this.drawStar(ctx, cx + eyeSpacing, cy, eyeSize, 4);
    } else if (expression === "happy") {
      ctx.strokeStyle = color;
      ctx.lineWidth = size * 0.04;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.arc(
        cx - eyeSpacing,
        cy + size * 0.02,
        eyeSize,
        1.1 * Math.PI,
        1.9 * Math.PI,
      );
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(
        cx + eyeSpacing,
        cy + size * 0.02,
        eyeSize,
        1.1 * Math.PI,
        1.9 * Math.PI,
      );
      ctx.stroke();
    } else {
      // Normal cute eyes with highlights
      ctx.beginPath();
      ctx.arc(cx - eyeSpacing, cy, eyeSize, 0, Math.PI * 2);
      ctx.arc(cx + eyeSpacing, cy, eyeSize, 0, Math.PI * 2);
      ctx.fill();

      // White highlights
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(
        cx - eyeSpacing - eyeSize * 0.3,
        cy - eyeSize * 0.3,
        eyeSize * 0.3,
        0,
        Math.PI * 2,
      );
      ctx.arc(
        cx + eyeSpacing - eyeSize * 0.3,
        cy - eyeSize * 0.3,
        eyeSize * 0.3,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  }

  drawChefCharacter(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    size: number,
    color: string,
  ): void {
    // Puffy Chef hat
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx - size * 0.1, cy - size * 0.28, size * 0.1, 0, Math.PI * 2);
    ctx.arc(cx + size * 0.1, cy - size * 0.28, size * 0.1, 0, Math.PI * 2);
    ctx.arc(cx, cy - size * 0.35, size * 0.12, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillRect(cx - size * 0.15, cy - size * 0.22, size * 0.3, size * 0.12);

    this.drawBlush(ctx, cx, cy, size);
    this.drawKawaiiEyes(ctx, cx, cy, size, color, "happy");

    // Tiny cat mouth
    ctx.strokeStyle = color;
    ctx.lineWidth = size * 0.03;
    ctx.beginPath();
    ctx.arc(cx - size * 0.03, cy + size * 0.08, size * 0.04, 0, Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx + size * 0.03, cy + size * 0.08, size * 0.04, 0, Math.PI);
    ctx.stroke();
  }

  drawCoolCharacter(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    size: number,
    color: string,
  ): void {
    // Heart-shaped Sunglasses
    ctx.fillStyle = color;
    const glassY = cy - size * 0.02;
    const glassSize = size * 0.12;

    // Left heart
    this.drawStar(ctx, cx - size * 0.18, glassY, glassSize, 4); // Actually star-shaped glasses for more "kawaii" cool
    this.drawStar(ctx, cx + size * 0.18, glassY, glassSize, 4);

    // Bridge
    ctx.fillRect(
      cx - size * 0.08,
      glassY - size * 0.01,
      size * 0.16,
      size * 0.02,
    );

    this.drawBlush(ctx, cx, cy, size);

    // Cute cat mouth
    ctx.strokeStyle = color;
    ctx.lineWidth = size * 0.03;
    ctx.beginPath();
    ctx.arc(cx - size * 0.03, cy + size * 0.1, size * 0.04, 0, Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx + size * 0.03, cy + size * 0.1, size * 0.04, 0, Math.PI);
    ctx.stroke();
  }

  drawPirateCharacter(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    size: number,
    color: string,
  ): void {
    // Heart-shaped bandana
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(
      cx,
      cy - size * 0.2,
      size * 0.25,
      size * 0.1,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();

    // Cute bandana ears/knots
    ctx.beginPath();
    ctx.arc(cx + size * 0.2, cy - size * 0.22, size * 0.06, 0, Math.PI * 2);
    ctx.fill();

    // Heart eye patch
    ctx.fillStyle = color;
    this.drawStar(ctx, cx - size * 0.15, cy, size * 0.08, 4);

    // Strap
    ctx.strokeStyle = color;
    ctx.lineWidth = size * 0.02;
    ctx.beginPath();
    ctx.moveTo(cx - size * 0.22, cy - size * 0.05);
    ctx.lineTo(cx - size * 0.1, cy - size * 0.25);
    ctx.stroke();

    this.drawBlush(ctx, cx, cy, size);

    // One big cute eye
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx + size * 0.12, cy, size * 0.07, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(cx + size * 0.1, cy - size * 0.02, size * 0.02, 0, Math.PI * 2);
    ctx.fill();

    // Grin
    ctx.strokeStyle = color;
    ctx.lineWidth = size * 0.03;
    ctx.beginPath();
    ctx.arc(cx, cy + size * 0.08, size * 0.08, 0, Math.PI);
    ctx.stroke();
  }

  drawAlienCharacter(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    size: number,
    color: string,
  ): void {
    // Heart antennae
    ctx.strokeStyle = color;
    ctx.lineWidth = size * 0.03;
    ctx.beginPath();
    ctx.moveTo(cx - size * 0.1, cy - size * 0.1);
    ctx.lineTo(cx - size * 0.18, cy - size * 0.3);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + size * 0.1, cy - size * 0.1);
    ctx.lineTo(cx + size * 0.18, cy - size * 0.3);
    ctx.stroke();

    ctx.fillStyle = color;
    this.drawStar(ctx, cx - size * 0.18, cy - size * 0.3, size * 0.05, 4);
    this.drawStar(ctx, cx + size * 0.18, cy - size * 0.3, size * 0.05, 4);

    this.drawBlush(ctx, cx, cy, size);
    this.drawKawaiiEyes(ctx, cx, cy, size, color, "normal");

    // "o" mouth
    ctx.beginPath();
    ctx.arc(cx, cy + size * 0.12, size * 0.04, 0, Math.PI * 2);
    ctx.fill();
  }

  drawRobotCharacter(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    size: number,
    color: string,
  ): void {
    // Heart antenna
    ctx.strokeStyle = color;
    ctx.lineWidth = size * 0.03;
    ctx.beginPath();
    ctx.moveTo(cx, cy - size * 0.1);
    ctx.lineTo(cx, cy - size * 0.3);
    ctx.stroke();

    ctx.fillStyle = color;
    this.drawStar(ctx, cx, cy - size * 0.3, size * 0.06, 4);

    this.drawBlush(ctx, cx, cy, size);

    // Pixel/Square kawaii eyes
    const eyeSpacing = size * 0.18;
    const eyeSize = size * 0.12;
    ctx.fillRect(
      cx - eyeSpacing - eyeSize / 2,
      cy - eyeSize / 2,
      eyeSize,
      eyeSize,
    );
    ctx.fillRect(
      cx + eyeSpacing - eyeSize / 2,
      cy - eyeSize / 2,
      eyeSize,
      eyeSize,
    );

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(
      cx - eyeSpacing - eyeSize * 0.3,
      cy - eyeSize * 0.3,
      eyeSize * 0.3,
      eyeSize * 0.3,
    );
    ctx.fillRect(
      cx + eyeSpacing - eyeSize * 0.3,
      cy - eyeSize * 0.3,
      eyeSize * 0.3,
      eyeSize * 0.3,
    );

    // Digital smile
    ctx.fillStyle = color;
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(
        cx - size * 0.06 + i * size * 0.06,
        cy + size * 0.12,
        size * 0.03,
        size * 0.03,
      );
    }
  }

  drawWizardCharacter(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    size: number,
    color: string,
  ): void {
    // Starry wizard hat
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(cx, cy - size * 0.4);
    ctx.quadraticCurveTo(
      cx + size * 0.1,
      cy - size * 0.3,
      cx + size * 0.2,
      cy - size * 0.1,
    );
    ctx.lineTo(cx - size * 0.2, cy - size * 0.1);
    ctx.quadraticCurveTo(cx - size * 0.1, cy - size * 0.3, cx, cy - size * 0.4);
    ctx.fill();

    this.drawBlush(ctx, cx, cy, size);
    this.drawKawaiiEyes(ctx, cx, cy, size, color, "sparkle");

    // Tiny cat mouth
    ctx.strokeStyle = color;
    ctx.lineWidth = size * 0.03;
    ctx.beginPath();
    ctx.arc(cx - size * 0.03, cy + size * 0.08, size * 0.04, 0, Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx + size * 0.03, cy + size * 0.08, size * 0.04, 0, Math.PI);
    ctx.stroke();

    // Small cloud beard
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy + size * 0.15, size * 0.06, 0, Math.PI * 2);
    ctx.fill();
  }

  drawKingCharacter(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    size: number,
    color: string,
  ): void {
    // Chibi crown
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(cx - size * 0.2, cy - size * 0.1);
    ctx.lineTo(cx - size * 0.2, cy - size * 0.25);
    ctx.lineTo(cx - size * 0.08, cy - size * 0.15);
    ctx.lineTo(cx, cy - size * 0.3);
    ctx.lineTo(cx + size * 0.08, cy - size * 0.15);
    ctx.lineTo(cx + size * 0.2, cy - size * 0.25);
    ctx.lineTo(cx + size * 0.2, cy - size * 0.1);
    ctx.closePath();
    ctx.fill();

    this.drawBlush(ctx, cx, cy, size);
    this.drawKawaiiEyes(ctx, cx, cy, size, color, "normal");

    // Proud smile
    ctx.strokeStyle = color;
    ctx.lineWidth = size * 0.03;
    ctx.beginPath();
    ctx.arc(cx, cy + size * 0.06, size * 0.1, 0, Math.PI);
    ctx.stroke();
  }

  drawNinjaCharacter(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    size: number,
    color: string,
  ): void {
    // Headband with heart knot
    ctx.fillStyle = color;
    ctx.fillRect(cx - size * 0.25, cy - size * 0.12, size * 0.5, size * 0.15);

    ctx.beginPath();
    ctx.arc(cx + size * 0.22, cy - size * 0.1, size * 0.05, 0, Math.PI * 2);
    ctx.fill();

    // Eyes peering through mask
    this.drawKawaiiEyes(ctx, cx, cy, size, color, "normal");

    // Blush on mask
    this.drawBlush(ctx, cx, cy, size);
  }

  drawAstronautCharacter(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    size: number,
    color: string,
  ): void {
    // Round helmet
    ctx.strokeStyle = color;
    ctx.lineWidth = size * 0.05;
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.25, 0, Math.PI * 2);
    ctx.stroke();

    this.drawBlush(ctx, cx, cy, size);
    this.drawKawaiiEyes(ctx, cx, cy, size, color, "normal");

    // Heart antenna
    ctx.beginPath();
    ctx.moveTo(cx + size * 0.2, cy - size * 0.15);
    ctx.lineTo(cx + size * 0.3, cy - size * 0.35);
    ctx.stroke();
    ctx.fillStyle = color;
    this.drawStar(ctx, cx + size * 0.3, cy - size * 0.35, size * 0.06, 4);

    // Reflection star on visor
    ctx.fillStyle = "#ffffff";
    this.drawStar(ctx, cx - size * 0.15, cy - size * 0.15, size * 0.03, 4);
  }

  drawLegendCharacter(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    size: number,
    color: string,
  ): void {
    // Ultimate Cuteness!
    this.drawBlush(ctx, cx, cy, size);
    this.drawKawaiiEyes(ctx, cx, cy, size, color, "sparkle");

    // Cat mouth
    ctx.strokeStyle = color;
    ctx.lineWidth = size * 0.04;
    ctx.beginPath();
    ctx.arc(cx - size * 0.04, cy + size * 0.08, size * 0.05, 0, Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx + size * 0.04, cy + size * 0.08, size * 0.05, 0, Math.PI);
    ctx.stroke();

    // Lots of hearts/sparkles
    for (let i = 0; i < 5; i++) {
      const angle = (i * Math.PI * 2) / 5;
      const x = cx + Math.cos(angle) * size * 0.3;
      const y = cy + Math.sin(angle) * size * 0.3;
      this.drawStar(ctx, x, y, size * 0.04, 4);
    }
  }

  drawStar(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    radius: number,
    points: number,
  ): void {
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? radius : radius * 0.4;
      const angle = (i * Math.PI) / points - Math.PI / 2;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  }

  // ============= DISCOVERY TRACKING =============

  markDiscovered(value: number): void {
    if (value < 6) return;
    try {
      const discovered = JSON.parse(
        localStorage.getItem("threes_discovered") || "[]",
      );
      if (!discovered.includes(value)) {
        discovered.push(value);
        localStorage.setItem("threes_discovered", JSON.stringify(discovered));
        console.log("[ThreesGame.markDiscovered] New discovery:", value);
      }
    } catch {
      // Ignore storage errors
    }
  }

  static getDiscovered(): number[] {
    try {
      return JSON.parse(localStorage.getItem("threes_discovered") || "[]");
    } catch {
      return [];
    }
  }

  // ============= GALLERY =============

  static readonly GALLERY_CHARACTERS: { value: number; name: string }[] = [
    { value: 6, name: "Happy" },
    { value: 12, name: "Joy" },
    { value: 24, name: "Chef" },
    { value: 48, name: "Cool" },
    { value: 96, name: "Pirate" },
    { value: 192, name: "Alien" },
    { value: 384, name: "Robot" },
    { value: 768, name: "Wizard" },
    { value: 1536, name: "King" },
    { value: 3072, name: "Ninja" },
    { value: 6144, name: "Astronaut" },
    { value: 12288, name: "Legend" },
  ];

  private galleryReturnTo: "start" | "gameover" = "start";

  showGallery(): void {
    console.log("[ThreesGame.showGallery] Opening gallery from start");
    this.galleryReturnTo = "start";
    const galleryScreen = document.getElementById("galleryScreen");
    const startScreen = document.getElementById("startScreen");
    if (!galleryScreen || !startScreen) return;

    startScreen.classList.add("hidden");
    galleryScreen.classList.remove("hidden");
    this.renderGallery();
  }

  showGalleryFromGameOver(): void {
    console.log(
      "[ThreesGame.showGalleryFromGameOver] Opening gallery from game over",
    );
    this.galleryReturnTo = "gameover";
    const galleryScreen = document.getElementById("galleryScreen");
    const gameOverScreen = document.getElementById("gameOverScreen");
    const hud = document.getElementById("hud");
    if (!galleryScreen || !gameOverScreen) return;

    // Hide game elements so they don't flicker behind
    gameOverScreen.classList.add("hidden");
    if (hud) hud.style.display = "none";
    this.canvas.style.visibility = "hidden";

    galleryScreen.classList.remove("hidden");
    this.renderGallery();
  }

  hideGallery(): void {
    console.log(
      "[ThreesGame.hideGallery] Closing gallery, returning to:",
      this.galleryReturnTo,
    );
    const galleryScreen = document.getElementById("galleryScreen");
    const startScreen = document.getElementById("startScreen");
    const gameOverScreen = document.getElementById("gameOverScreen");
    const hud = document.getElementById("hud");
    if (!galleryScreen) return;

    galleryScreen.classList.add("hidden");

    if (this.galleryReturnTo === "gameover" && gameOverScreen) {
      // Restore game elements when returning to game over
      this.canvas.style.visibility = "visible";
      if (hud) hud.style.display = "flex";
      gameOverScreen.classList.remove("hidden");
    } else if (startScreen) {
      startScreen.classList.remove("hidden");
    }
  }

  renderGallery(): void {
    const grid = document.getElementById("galleryGrid");
    const countEl = document.getElementById("discoveryCount");
    const totalEl = document.getElementById("discoveryTotal");
    if (!grid) return;

    const discovered = ThreesGame.getDiscovered();
    const characters = ThreesGame.GALLERY_CHARACTERS;

    grid.innerHTML = "";

    let discoveredCount = 0;
    characters.forEach((char) => {
      const isDiscovered = discovered.includes(char.value);
      if (isDiscovered) discoveredCount++;

      const item = document.createElement("div");
      item.className =
        "gallery-item " + (isDiscovered ? "discovered" : "locked");

      if (isDiscovered) {
        // Create mini canvas to render the character
        const canvas = document.createElement("canvas");
        const canvasSize = 80;
        canvas.width = canvasSize;
        canvas.height = canvasSize;
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        const ctx = canvas.getContext("2d");
        if (ctx) {
          this.renderGalleryTile(
            ctx,
            char.value,
            canvasSize / 2,
            canvasSize / 2,
            canvasSize - 4,
          );
        }
        item.appendChild(canvas);

        const nameEl = document.createElement("div");
        nameEl.className = "gallery-character-name";
        nameEl.textContent = char.name;
        item.appendChild(nameEl);
      }

      grid.appendChild(item);
    });

    if (countEl) countEl.textContent = discoveredCount.toString();
    if (totalEl) totalEl.textContent = characters.length.toString();
  }

  renderGalleryTile(
    ctx: CanvasRenderingContext2D,
    value: number,
    cx: number,
    cy: number,
    size: number,
  ): void {
    const color = getTileColor(value);
    const radius = 12;

    // Draw tile background
    ctx.fillStyle = color.bg;
    this.roundRect(ctx, cx - size / 2, cy - size / 2, size, size, radius);
    ctx.fill();

    // Bottom accent
    const accentHeight = size * 0.08;
    ctx.fillStyle = color.border;
    ctx.beginPath();
    ctx.moveTo(cx - size / 2 + radius, cy + size / 2);
    ctx.lineTo(cx + size / 2 - radius, cy + size / 2);
    ctx.quadraticCurveTo(
      cx + size / 2,
      cy + size / 2,
      cx + size / 2,
      cy + size / 2 - radius,
    );
    ctx.lineTo(cx + size / 2, cy + size / 2 - accentHeight);
    ctx.lineTo(cx - size / 2, cy + size / 2 - accentHeight);
    ctx.lineTo(cx - size / 2, cy + size / 2 - radius);
    ctx.quadraticCurveTo(
      cx - size / 2,
      cy + size / 2,
      cx - size / 2 + radius,
      cy + size / 2,
    );
    ctx.closePath();
    ctx.fill();

    // Draw the character using existing methods
    // Simulate tile for face rendering
    const faceY = cy - size * 0.08;

    if (value === 6) {
      this.draw6Face(ctx, cx, cy, size, color.text);
    } else if (value === 12) {
      this.draw12Face(ctx, cx, cy, size, color.text);
    } else if (value === 24) {
      this.drawChefCharacter(ctx, cx, faceY, size, color.text);
    } else if (value === 48) {
      this.drawCoolCharacter(ctx, cx, faceY, size, color.text);
    } else if (value === 96) {
      this.drawPirateCharacter(ctx, cx, faceY, size, color.text);
    } else if (value === 192) {
      this.drawAlienCharacter(ctx, cx, faceY, size, color.text);
    } else if (value === 384) {
      this.drawRobotCharacter(ctx, cx, faceY, size, color.text);
    } else if (value === 768) {
      this.drawWizardCharacter(ctx, cx, faceY, size, color.text);
    } else if (value === 1536) {
      this.drawKingCharacter(ctx, cx, faceY, size, color.text);
    } else if (value === 3072) {
      this.drawNinjaCharacter(ctx, cx, faceY, size, color.text);
    } else if (value === 6144) {
      this.drawAstronautCharacter(ctx, cx, faceY, size, color.text);
    } else {
      this.drawLegendCharacter(ctx, cx, faceY, size, color.text);
    }

    // Draw number at bottom
    const fontSize =
      value >= 1000 ? size * 0.22 : value >= 100 ? 0.26 : size * 0.3;
    ctx.font = "700 " + fontSize + "px Quicksand, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillStyle = color.text;
    ctx.fillText(value.toString(), cx, cy + size / 2 - size * 0.06);
  }

  // ============= FACE DRAWING HELPERS =============

  drawClosedEyes(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    spacing: number,
    size: number,
    color: string,
  ): void {
    ctx.strokeStyle = color;
    ctx.lineWidth = size * 0.4;
    ctx.lineCap = "round";

    // Left eye - curved line
    ctx.beginPath();
    ctx.arc(cx - spacing, cy, size, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.stroke();

    // Right eye
    ctx.beginPath();
    ctx.arc(cx + spacing, cy, size, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.stroke();
  }

  drawOpenEyes(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    spacing: number,
    size: number,
    color: string,
    sparkle: boolean,
  ): void {
    ctx.fillStyle = color;

    // Left eye
    ctx.beginPath();
    ctx.arc(cx - spacing, cy, size, 0, Math.PI * 2);
    ctx.fill();

    // Right eye
    ctx.beginPath();
    ctx.arc(cx + spacing, cy, size, 0, Math.PI * 2);
    ctx.fill();

    if (sparkle) {
      // Add sparkle/highlight
      ctx.fillStyle = "#ffffff";
      const highlightSize = size * 0.4;
      ctx.beginPath();
      ctx.arc(
        cx - spacing - size * 0.3,
        cy - size * 0.3,
        highlightSize,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      ctx.beginPath();
      ctx.arc(
        cx + spacing - size * 0.3,
        cy - size * 0.3,
        highlightSize,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  }

  drawHappyEyes(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    spacing: number,
    size: number,
    color: string,
  ): void {
    ctx.strokeStyle = color;
    ctx.lineWidth = size * 0.5;
    ctx.lineCap = "round";

    // Happy curved eyes (upside-down curves)
    ctx.beginPath();
    ctx.arc(cx - spacing, cy + size * 0.5, size, 1.2 * Math.PI, 1.8 * Math.PI);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx + spacing, cy + size * 0.5, size, 1.2 * Math.PI, 1.8 * Math.PI);
    ctx.stroke();
  }

  drawDeterminedEyes(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    spacing: number,
    size: number,
    color: string,
  ): void {
    ctx.fillStyle = color;

    // Slightly narrowed eyes
    ctx.save();

    // Left eye
    ctx.beginPath();
    ctx.ellipse(cx - spacing, cy, size, size * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Right eye
    ctx.beginPath();
    ctx.ellipse(cx + spacing, cy, size, size * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  drawHalfClosedEyes(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    spacing: number,
    size: number,
    color: string,
  ): void {
    ctx.fillStyle = color;

    // Half-closed relaxed eyes
    ctx.save();

    ctx.beginPath();
    ctx.ellipse(cx - spacing, cy, size, size * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(cx + spacing, cy, size, size * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  drawSparkleEyes(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    spacing: number,
    size: number,
    color: string,
  ): void {
    ctx.fillStyle = color;

    // Sparkle/star-like eyes
    const points = 4;
    const innerRadius = size * 0.4;
    const outerRadius = size;

    for (const offsetX of [-spacing, spacing]) {
      ctx.beginPath();
      for (let i = 0; i < points * 2; i++) {
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const angle = (i * Math.PI) / points - Math.PI / 2;
        const px = cx + offsetX + Math.cos(angle) * radius;
        const py = cy + Math.sin(angle) * radius;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
    }
  }

  drawStarEyes(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    spacing: number,
    size: number,
    color: string,
  ): void {
    ctx.fillStyle = color;

    // 5-pointed star eyes for high values
    const points = 5;
    const innerRadius = size * 0.45;
    const outerRadius = size;

    for (const offsetX of [-spacing, spacing]) {
      ctx.beginPath();
      for (let i = 0; i < points * 2; i++) {
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const angle = (i * Math.PI) / points - Math.PI / 2;
        const px = cx + offsetX + Math.cos(angle) * radius;
        const py = cy + Math.sin(angle) * radius;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
    }
  }

  drawSmallSmile(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    width: number,
    color: string,
  ): void {
    ctx.strokeStyle = color;
    ctx.lineWidth = width * 0.25;
    ctx.lineCap = "round";

    ctx.beginPath();
    ctx.arc(cx, cy - width * 0.3, width, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  }

  drawSmile(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    width: number,
    color: string,
  ): void {
    ctx.strokeStyle = color;
    ctx.lineWidth = width * 0.22;
    ctx.lineCap = "round";

    ctx.beginPath();
    ctx.arc(cx, cy - width * 0.5, width, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  }

  drawBigSmile(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    width: number,
    color: string,
  ): void {
    ctx.fillStyle = color;

    ctx.beginPath();
    ctx.arc(cx, cy - width * 0.3, width, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.closePath();
    ctx.fill();
  }

  drawSmirk(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    width: number,
    color: string,
  ): void {
    ctx.strokeStyle = color;
    ctx.lineWidth = width * 0.25;
    ctx.lineCap = "round";

    // Asymmetric smirk
    ctx.beginPath();
    ctx.moveTo(cx - width * 0.8, cy);
    ctx.quadraticCurveTo(
      cx,
      cy + width * 0.4,
      cx + width * 0.9,
      cy - width * 0.2,
    );
    ctx.stroke();
  }

  drawGrin(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    width: number,
    color: string,
  ): void {
    ctx.fillStyle = color;

    ctx.beginPath();
    ctx.arc(cx, cy - width * 0.2, width, 0.05 * Math.PI, 0.95 * Math.PI);
    ctx.closePath();
    ctx.fill();

    // Add teeth hint
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = width * 0.1;
    ctx.beginPath();
    ctx.moveTo(cx - width * 0.5, cy + width * 0.2);
    ctx.lineTo(cx + width * 0.5, cy + width * 0.2);
    ctx.stroke();
  }

  // ============= UTILITY =============

  roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
}

// ============= INITIALIZE =============
window.addEventListener("DOMContentLoaded", () => {
  console.log("[main] Initializing Threes!");
  new ThreesGame();
});
