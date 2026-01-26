// ============================================================================
// UNICYCLE HERO - Ultra Modular Balance Challenge Game
// ============================================================================
// Architecture: System-based with dependency injection
// Each system is independent and testable
// ============================================================================

export {};

// ============================================================================
// SECTION 1: GLOBAL TYPE DECLARATIONS
// ============================================================================

declare global {
  interface Window {
    submitScore: (score: number) => void;
    triggerHaptic: (type: HapticType) => void;
  }
}

// ============================================================================
// SECTION 2: TYPE DEFINITIONS & INTERFACES
// ============================================================================

type GameState = "start" | "playing" | "paused" | "gameOver";
type HapticType = "light" | "medium" | "heavy" | "success" | "error";
type ParticleType = "dust" | "spark" | "star" | "crash";
type FeedbackType =
  | "coinCollect"
  | "obstaclePass"
  | "nearMiss"
  | "wobble"
  | "fall"
  | "start";

interface Settings {
  music: boolean;
  fx: boolean;
  haptics: boolean;
}

interface InputState {
  leanLeft: boolean;
  leanRight: boolean;
  action: boolean;
}

interface Player {
  x: number;
  y: number;
  angle: number;
  angularVelocity: number;
  wheelRotation: number;
  squashX: number;
  squashY: number;
  armSpread: number;
}

interface Obstacle {
  x: number;
  width: number;
  height: number;
  passed: boolean;
  // Pre-computed visual properties (NO random in render!)
  shadowOffset: number;
  colorVariant: number;
}

interface Coin {
  x: number;
  y: number;
  collected: boolean;
  // Pre-computed visual properties
  bobOffset: number;
  glowIntensity: number;
  rotationSpeed: number;
}

interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  type: ParticleType;
  rotation: number;
  rotationSpeed: number;
}

interface ScreenShake {
  intensity: number;
  duration: number;
  elapsed: number;
  offsetX: number;
  offsetY: number;
}

interface ScreenFlash {
  active: boolean;
  duration: number;
  elapsed: number;
  color: string;
}

interface Layout {
  width: number;
  height: number;
  groundY: number;
  playerX: number;
  safeAreaTop: number;
  isMobile: boolean;
}

// ============================================================================
// AAA FEATURES: New Type Definitions
// ============================================================================

// Verlet point for cloth/scarf physics
interface VerletPoint {
  x: number;
  y: number;
  oldX: number;
  oldY: number;
  pinned: boolean;
}

// IK chain for procedural animation
interface IKJoint {
  x: number;
  y: number;
  angle: number;
  length: number;
}

// Camera state for predictive following
interface CameraState {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  zoom: number;
  targetZoom: number;
  velocityX: number;
  velocityY: number;
}

// Time dilation state
interface TimeDilation {
  scale: number;
  targetScale: number;
  duration: number;
  elapsed: number;
}

// Trail point for motion blur
interface TrailPoint {
  x: number;
  y: number;
  angle: number;
  alpha: number;
}

// ============================================================================
// SECTION 3: CONFIGURATION (All game constants in one place)
// ============================================================================

const CONFIG = {
  // Physics - Tuned for forgiving but engaging gameplay
  PHYSICS: {
    GRAVITY_TORQUE: 0.0012,
    ANGULAR_ACCELERATION: 0.01,
    ANGULAR_FRICTION: 0.965,
    MAX_ANGULAR_VELOCITY: 0.16,
    FALL_ANGLE: Math.PI / 2.5, // ~72 degrees (forgiving)
    WOBBLE_DANGER_ZONE: 0.65,
    SQUASH_RECOVERY: 0.15,
    SQUASH_INTENSITY: 0.3,
  },

  // Movement & Difficulty
  MOVEMENT: {
    GROUND_SPEED_INITIAL: 2.5,
    GROUND_SPEED_MAX: 9,
    SPEED_INCREMENT: 0.0008,
    GROUND_HEIGHT: 100,
  },

  // Obstacles
  OBSTACLES: {
    MIN_GAP: 280,
    MAX_GAP: 550,
    MIN_HEIGHT: 25,
    MAX_HEIGHT: 70,
    WIDTH: 35,
  },

  // Coins
  COINS: {
    RADIUS: 18,
    VALUE: 15,
    SPAWN_CHANCE: 0.45,
    BOB_SPEED: 0.003,
    BOB_AMPLITUDE: 6,
  },

  // Player Dimensions
  PLAYER: {
    WHEEL_RADIUS: 28,
    BODY_HEIGHT: 55,
    HEAD_RADIUS: 16,
  },

  // Particles
  PARTICLES: {
    POOL_SIZE: 150,
    DUST_RATE: 0.3,
    SPARK_COUNT: 10,
    CRASH_COUNT: 20,
  },

  // Feedback
  FEEDBACK: {
    SHAKE_DECAY: 0.88,
    FREEZE_COIN: 25,
    FREEZE_PASS: 40,
    FREEZE_CRASH: 120,
    FLASH_DURATION: 80,
  },

  // Colors
  COLORS: {
    SKY_TOP: "#1a1a2e",
    SKY_BOTTOM: "#16213e",
    GROUND: "#4ecca3",
    GROUND_DARK: "#3da882",
    GROUND_PATTERN: "#2d9b7a",
    PLAYER_BODY: "#e94560",
    PLAYER_SKIN: "#ffd5c8",
    PLAYER_WHEEL: "#2d2d44",
    PLAYER_WHEEL_SPOKE: "#444466",
    OBSTACLE: "#ff6b6b",
    OBSTACLE_HIGHLIGHT: "#ff8585",
    OBSTACLE_SHADOW: "#ee5a5a",
    COIN: "#ffd700",
    COIN_DARK: "#ccac00",
    COIN_GLOW: "rgba(255, 215, 0, 0.3)",
    PARTICLE_DUST: "#8b7355",
    PARTICLE_SPARK: "#ffdd44",
    TEXT: "#ffffff",
  },

  // Layout
  LAYOUT: {
    SAFE_AREA_DESKTOP: 45,
    SAFE_AREA_MOBILE: 120,
  },

  // Timing
  TIMING: {
    FIXED_TIMESTEP: 1000 / 60,
    MAX_FRAME_TIME: 100,
  },

  // AAA: Verlet Scarf Physics
  SCARF: {
    POINTS: 8,
    SEGMENT_LENGTH: 12,
    GRAVITY: 0.4,
    FRICTION: 0.97,
    ITERATIONS: 3,
    COLOR_START: "#e94560",
    COLOR_END: "#ff6b9d",
  },

  // AAA: Camera System
  CAMERA: {
    LEAD_AMOUNT: 80,
    SMOOTHING: 0.08,
    ZOOM_SMOOTHING: 0.05,
    IMPACT_ZOOM: 1.15,
    NORMAL_ZOOM: 1.0,
  },

  // AAA: Time Dilation
  TIME: {
    NORMAL_SCALE: 1.0,
    SLOWMO_SCALE: 0.25,
    SLOWMO_DURATION: 800,
    TRANSITION_SPEED: 0.1,
  },

  // AAA: Lighting
  LIGHTING: {
    WHEEL_GLOW_RADIUS: 150,
    AMBIENT: 0.3,
    SHADOW_OPACITY: 0.4,
  },

  // AAA: Post Processing
  POST: {
    BLOOM_INTENSITY: 0.3,
    CHROMATIC_OFFSET: 3,
    VIGNETTE_INTENSITY: 0.4,
  },

  // AAA: Trail/Motion Blur
  TRAIL: {
    LENGTH: 5,
    OPACITY_DECAY: 0.7,
  },
};

// ============================================================================
// SECTION 4: UTILITY FUNCTIONS (Pure, testable)
// ============================================================================

const Utils = {
  lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  },

  clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  },

  randomRange(min: number, max: number): number {
    return min + Math.random() * (max - min);
  },

  randomInt(min: number, max: number): number {
    return Math.floor(min + Math.random() * (max - min + 1));
  },

  // Easing functions
  easeOutQuad(t: number): number {
    return 1 - (1 - t) * (1 - t);
  },

  easeOutBack(t: number): number {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },

  easeOutElastic(t: number): number {
    if (t === 0 || t === 1) return t;
    return (
      Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1
    );
  },

  // Distance between two points
  distance(x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  },
};

// ============================================================================
// SECTION 4B: VERLET PHYSICS SYSTEM (Scarf/Cape)
// ============================================================================

class VerletSystem {
  private points: VerletPoint[] = [];

  constructor() {
    this.reset();
  }

  reset(): void {
    this.points = [];
    for (let i = 0; i < CONFIG.SCARF.POINTS; i++) {
      this.points.push({
        x: 0,
        y: 0,
        oldX: 0,
        oldY: 0,
        pinned: i === 0,
      });
    }
  }

  update(
    anchorX: number,
    anchorY: number,
    anchorAngle: number,
    dt: number,
    windX: number,
  ): void {
    const dtNorm = dt / 16.67;

    // Pin first point to anchor (player's neck)
    this.points[0].x = anchorX;
    this.points[0].y = anchorY;

    // Apply verlet integration
    for (let i = 1; i < this.points.length; i++) {
      const p = this.points[i];
      if (p.pinned) continue;

      const vx = (p.x - p.oldX) * CONFIG.SCARF.FRICTION;
      const vy = (p.y - p.oldY) * CONFIG.SCARF.FRICTION;

      p.oldX = p.x;
      p.oldY = p.y;

      p.x += vx + windX * 0.5 * dtNorm;
      p.y += vy + CONFIG.SCARF.GRAVITY * dtNorm;
    }

    // Constraint iterations
    for (let iter = 0; iter < CONFIG.SCARF.ITERATIONS; iter++) {
      for (let i = 0; i < this.points.length - 1; i++) {
        const p1 = this.points[i];
        const p2 = this.points[i + 1];

        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const diff = CONFIG.SCARF.SEGMENT_LENGTH - dist;
        const percent = diff / dist / 2;

        const offsetX = dx * percent;
        const offsetY = dy * percent;

        if (!p1.pinned) {
          p1.x -= offsetX;
          p1.y -= offsetY;
        }
        if (!p2.pinned) {
          p2.x += offsetX;
          p2.y += offsetY;
        }
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (this.points.length < 2) return;

    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Draw scarf with gradient thickness
    for (let i = 0; i < this.points.length - 1; i++) {
      const p1 = this.points[i];
      const p2 = this.points[i + 1];
      const t = i / (this.points.length - 1);

      // Gradient color
      const r = Math.round(233 + (255 - 233) * t);
      const g = Math.round(69 + (107 - 69) * t);
      const b = Math.round(96 + (157 - 96) * t);

      ctx.strokeStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.lineWidth = 8 - t * 5; // Taper from 8 to 3

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }
  }

  getPoints(): VerletPoint[] {
    return this.points;
  }
}

// ============================================================================
// SECTION 4C: CAMERA SYSTEM (Predictive Following)
// ============================================================================

class CameraSystem {
  private state: CameraState;

  constructor(width: number, height: number) {
    this.state = {
      x: width / 2,
      y: height / 2,
      targetX: width / 2,
      targetY: height / 2,
      zoom: 1,
      targetZoom: 1,
      velocityX: 0,
      velocityY: 0,
    };
  }

  update(
    playerX: number,
    playerY: number,
    playerVelX: number,
    dt: number,
  ): void {
    // Predictive target (lead the player)
    this.state.targetX = playerX + playerVelX * CONFIG.CAMERA.LEAD_AMOUNT;
    this.state.targetY = playerY;

    // Smooth follow with spring physics
    const dx = this.state.targetX - this.state.x;
    const dy = this.state.targetY - this.state.y;

    this.state.velocityX += dx * CONFIG.CAMERA.SMOOTHING;
    this.state.velocityY += dy * CONFIG.CAMERA.SMOOTHING;
    this.state.velocityX *= 0.85;
    this.state.velocityY *= 0.85;

    this.state.x += this.state.velocityX * (dt / 16.67);
    this.state.y += this.state.velocityY * (dt / 16.67);

    // Zoom interpolation
    this.state.zoom = Utils.lerp(
      this.state.zoom,
      this.state.targetZoom,
      CONFIG.CAMERA.ZOOM_SMOOTHING,
    );
  }

  triggerImpactZoom(): void {
    this.state.targetZoom = CONFIG.CAMERA.IMPACT_ZOOM;
    setTimeout(() => {
      this.state.targetZoom = CONFIG.CAMERA.NORMAL_ZOOM;
    }, 200);
  }

  applyTransform(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
  ): void {
    const centerX = width / 2;
    const centerY = height / 2;
    const offsetX = centerX - this.state.x;

    ctx.translate(centerX, centerY);
    ctx.scale(this.state.zoom, this.state.zoom);
    ctx.translate(-centerX + offsetX * 0.3, -centerY);
  }

  reset(width: number, height: number): void {
    this.state.x = width / 2;
    this.state.y = height / 2;
    this.state.zoom = 1;
    this.state.targetZoom = 1;
    this.state.velocityX = 0;
    this.state.velocityY = 0;
  }
}

// ============================================================================
// SECTION 4D: TIME DILATION SYSTEM
// ============================================================================

class TimeDilationSystem {
  private dilation: TimeDilation = {
    scale: 1,
    targetScale: 1,
    duration: 0,
    elapsed: 0,
  };

  triggerSlowMo(duration: number = CONFIG.TIME.SLOWMO_DURATION): void {
    this.dilation.targetScale = CONFIG.TIME.SLOWMO_SCALE;
    this.dilation.duration = duration;
    this.dilation.elapsed = 0;
  }

  update(dt: number): number {
    // Handle slow-mo duration
    if (this.dilation.duration > 0) {
      this.dilation.elapsed += dt;
      if (this.dilation.elapsed >= this.dilation.duration) {
        this.dilation.targetScale = CONFIG.TIME.NORMAL_SCALE;
        this.dilation.duration = 0;
      }
    }

    // Smooth transition
    this.dilation.scale = Utils.lerp(
      this.dilation.scale,
      this.dilation.targetScale,
      CONFIG.TIME.TRANSITION_SPEED,
    );

    return this.dilation.scale;
  }

  getScale(): number {
    return this.dilation.scale;
  }

  isSlowMo(): boolean {
    return this.dilation.scale < 0.8;
  }

  reset(): void {
    this.dilation.scale = 1;
    this.dilation.targetScale = 1;
    this.dilation.duration = 0;
  }
}

// ============================================================================
// SECTION 4E: POST-PROCESSING SYSTEM (Bloom, Chromatic Aberration)
// ============================================================================

class PostProcessingSystem {
  private bloomCanvas: OffscreenCanvas;
  private bloomCtx: OffscreenCanvasRenderingContext2D;

  constructor(width: number, height: number) {
    this.bloomCanvas = new OffscreenCanvas(width / 4, height / 4);
    this.bloomCtx = this.bloomCanvas.getContext("2d")!;
  }

  resize(width: number, height: number): void {
    this.bloomCanvas = new OffscreenCanvas(width / 4, height / 4);
    this.bloomCtx = this.bloomCanvas.getContext("2d")!;
  }

  applyBloom(
    ctx: CanvasRenderingContext2D,
    sourceCanvas: HTMLCanvasElement,
  ): void {
    const w = this.bloomCanvas.width;
    const h = this.bloomCanvas.height;

    // Downscale
    this.bloomCtx.drawImage(sourceCanvas, 0, 0, w, h);

    // Blur (simple box blur via multiple draws)
    this.bloomCtx.filter = "blur(8px)";
    this.bloomCtx.globalAlpha = 0.5;
    this.bloomCtx.drawImage(this.bloomCanvas, 0, 0);
    this.bloomCtx.filter = "none";
    this.bloomCtx.globalAlpha = 1;

    // Composite back
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = CONFIG.POST.BLOOM_INTENSITY;
    ctx.drawImage(
      this.bloomCanvas,
      0,
      0,
      sourceCanvas.width,
      sourceCanvas.height,
    );
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }

  applyChromaticAberration(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    intensity: number,
  ): void {
    if (intensity < 0.1) return;

    const offset = CONFIG.POST.CHROMATIC_OFFSET * intensity;

    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.1 * intensity;

    // Red channel offset
    ctx.drawImage(canvas, -offset, 0);

    // Blue channel offset
    ctx.drawImage(canvas, offset, 0);

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }

  drawVignette(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    intensity: number,
  ): void {
    const gradient = ctx.createRadialGradient(
      width / 2,
      height / 2,
      height * 0.3,
      width / 2,
      height / 2,
      height * 0.8,
    );
    gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
    gradient.addColorStop(
      1,
      `rgba(0, 0, 0, ${CONFIG.POST.VIGNETTE_INTENSITY * intensity})`,
    );

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }
}

// ============================================================================
// SECTION 4F: TRAIL RENDERER (Motion Blur)
// ============================================================================

class TrailRenderer {
  private trails: TrailPoint[] = [];
  private maxLength = CONFIG.TRAIL.LENGTH;

  addPoint(x: number, y: number, angle: number): void {
    this.trails.unshift({ x, y, angle, alpha: 1 });
    if (this.trails.length > this.maxLength) {
      this.trails.pop();
    }
  }

  update(): void {
    for (let i = 0; i < this.trails.length; i++) {
      this.trails[i].alpha *= CONFIG.TRAIL.OPACITY_DECAY;
    }
    // Remove faded trails
    this.trails = this.trails.filter((t) => t.alpha > 0.05);
  }

  draw(
    ctx: CanvasRenderingContext2D,
    drawPlayer: (
      ctx: CanvasRenderingContext2D,
      x: number,
      y: number,
      angle: number,
      alpha: number,
    ) => void,
  ): void {
    for (let i = this.trails.length - 1; i >= 0; i--) {
      const t = this.trails[i];
      drawPlayer(ctx, t.x, t.y, t.angle, t.alpha * 0.3);
    }
  }

  clear(): void {
    this.trails = [];
  }
}

// ============================================================================
// SECTION 4G: DYNAMIC LIGHTING SYSTEM
// ============================================================================

class LightingSystem {
  drawWheelGlow(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    speed: number,
  ): void {
    const intensity = Math.min(speed / CONFIG.MOVEMENT.GROUND_SPEED_MAX, 1);
    const radius = CONFIG.LIGHTING.WHEEL_GLOW_RADIUS * (0.5 + intensity * 0.5);

    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, `rgba(78, 204, 163, ${0.4 * intensity})`);
    gradient.addColorStop(0.5, `rgba(78, 204, 163, ${0.15 * intensity})`);
    gradient.addColorStop(1, "rgba(78, 204, 163, 0)");

    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
  }

  drawGroundShadow(
    ctx: CanvasRenderingContext2D,
    playerX: number,
    groundY: number,
    angle: number,
  ): void {
    const shadowLength = 60 + Math.abs(angle) * 40;
    const shadowDirection = angle > 0 ? 1 : -1;

    ctx.fillStyle = `rgba(0, 0, 0, ${CONFIG.LIGHTING.SHADOW_OPACITY})`;
    ctx.beginPath();
    ctx.ellipse(
      playerX + shadowDirection * shadowLength * 0.3,
      groundY + 5,
      30 + Math.abs(angle) * 20,
      8,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }

  drawObstacleShadow(
    ctx: CanvasRenderingContext2D,
    obstacleX: number,
    obstacleWidth: number,
    groundY: number,
    height: number,
    lightX: number,
  ): void {
    const dx = obstacleX - lightX;
    const shadowStretch = Math.abs(dx) * 0.02;

    ctx.fillStyle = `rgba(0, 0, 0, ${CONFIG.LIGHTING.SHADOW_OPACITY * 0.5})`;
    ctx.beginPath();
    ctx.moveTo(obstacleX, groundY);
    ctx.lineTo(obstacleX + obstacleWidth, groundY);
    ctx.lineTo(obstacleX + obstacleWidth + shadowStretch * 30, groundY + 10);
    ctx.lineTo(obstacleX - shadowStretch * 10, groundY + 10);
    ctx.closePath();
    ctx.fill();
  }
}

// ============================================================================
// SECTION 5: SETTINGS SYSTEM
// ============================================================================

class SettingsSystem {
  private static STORAGE_KEY = "unicycleHero_settings";
  private settings: Settings;
  private elements: {
    musicToggle: HTMLElement | null;
    fxToggle: HTMLElement | null;
    hapticsToggle: HTMLElement | null;
    modal: HTMLElement | null;
    openBtn: HTMLElement | null;
    closeBtn: HTMLElement | null;
  };

  constructor() {
    this.settings = this.load();
    this.elements = {
      musicToggle: document.getElementById("toggle-music"),
      fxToggle: document.getElementById("toggle-fx"),
      hapticsToggle: document.getElementById("toggle-haptics"),
      modal: document.getElementById("settings-modal"),
      openBtn: document.getElementById("settings-btn"),
      closeBtn: document.getElementById("close-settings"),
    };
    this.setupListeners();
    this.updateUI();
  }

  private load(): Settings {
    try {
      const saved = localStorage.getItem(SettingsSystem.STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // Ignore parse errors
    }
    return { music: true, fx: true, haptics: true };
  }

  private save(): void {
    try {
      localStorage.setItem(
        SettingsSystem.STORAGE_KEY,
        JSON.stringify(this.settings),
      );
    } catch {
      // Ignore storage errors
    }
  }

  private updateUI(): void {
    this.elements.musicToggle?.classList.toggle("active", this.settings.music);
    this.elements.fxToggle?.classList.toggle("active", this.settings.fx);
    this.elements.hapticsToggle?.classList.toggle(
      "active",
      this.settings.haptics,
    );
  }

  private setupListeners(): void {
    this.elements.musicToggle?.addEventListener("click", () => {
      this.settings.music = !this.settings.music;
      this.save();
      this.updateUI();
    });

    this.elements.fxToggle?.addEventListener("click", () => {
      this.settings.fx = !this.settings.fx;
      this.save();
      this.updateUI();
    });

    this.elements.hapticsToggle?.addEventListener("click", () => {
      this.settings.haptics = !this.settings.haptics;
      this.save();
      this.updateUI();
    });

    this.elements.openBtn?.addEventListener("click", () => this.open());
    this.elements.closeBtn?.addEventListener("click", () => this.close());
    this.elements.modal?.addEventListener("click", (e) => {
      if (e.target === this.elements.modal) this.close();
    });
  }

  open(): void {
    this.elements.modal?.classList.add("active");
  }

  close(): void {
    this.elements.modal?.classList.remove("active");
  }

  isOpen(): boolean {
    return this.elements.modal?.classList.contains("active") ?? false;
  }

  get(): Settings {
    return { ...this.settings };
  }

  setButtonVisible(visible: boolean): void {
    this.elements.openBtn?.classList.toggle("hidden", !visible);
  }
}

// ============================================================================
// SECTION 6: INPUT SYSTEM
// ============================================================================

class InputSystem {
  private state: InputState = {
    leanLeft: false,
    leanRight: false,
    action: false,
  };
  private actionConsumed = false;
  private touchLeft: HTMLElement | null;
  private touchRight: HTMLElement | null;
  private activeTouches = new Map<number, "left" | "right">();

  constructor(private layout: Layout) {
    this.touchLeft = document.getElementById("touch-left");
    this.touchRight = document.getElementById("touch-right");
    this.setupListeners();
  }

  private setupListeners(): void {
    // Keyboard
    window.addEventListener("keydown", (e) => this.handleKeyDown(e));
    window.addEventListener("keyup", (e) => this.handleKeyUp(e));

    // Touch zones
    this.touchLeft?.addEventListener(
      "touchstart",
      (e) => this.handleTouchStart(e, "left"),
      { passive: false },
    );
    this.touchRight?.addEventListener(
      "touchstart",
      (e) => this.handleTouchStart(e, "right"),
      { passive: false },
    );
    this.touchLeft?.addEventListener(
      "touchend",
      (e) => this.handleTouchEnd(e, "left"),
      { passive: false },
    );
    this.touchRight?.addEventListener(
      "touchend",
      (e) => this.handleTouchEnd(e, "right"),
      { passive: false },
    );
    this.touchLeft?.addEventListener(
      "touchcancel",
      (e) => this.handleTouchEnd(e, "left"),
      { passive: false },
    );
    this.touchRight?.addEventListener(
      "touchcancel",
      (e) => this.handleTouchEnd(e, "right"),
      { passive: false },
    );

    // Mouse (desktop fallback)
    window.addEventListener("mousedown", (e) => this.handleMouseDown(e));
    window.addEventListener("mouseup", () => this.handleMouseUp());
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (e.code === "ArrowLeft" || e.code === "KeyA") {
      this.state.leanLeft = true;
    }
    if (e.code === "ArrowRight" || e.code === "KeyD") {
      this.state.leanRight = true;
    }
    if (e.code === "Space" || e.code === "Enter") {
      e.preventDefault();
      this.state.action = true;
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    if (e.code === "ArrowLeft" || e.code === "KeyA") {
      this.state.leanLeft = false;
    }
    if (e.code === "ArrowRight" || e.code === "KeyD") {
      this.state.leanRight = false;
    }
  }

  private handleTouchStart(e: TouchEvent, side: "left" | "right"): void {
    e.preventDefault();
    for (const touch of Array.from(e.changedTouches)) {
      this.activeTouches.set(touch.identifier, side);
    }
    this.updateTouchState();
    this.state.action = true;
  }

  private handleTouchEnd(e: TouchEvent, _side: "left" | "right"): void {
    e.preventDefault();
    for (const touch of Array.from(e.changedTouches)) {
      this.activeTouches.delete(touch.identifier);
    }
    this.updateTouchState();
  }

  private updateTouchState(): void {
    let hasLeft = false;
    let hasRight = false;
    for (const side of this.activeTouches.values()) {
      if (side === "left") hasLeft = true;
      if (side === "right") hasRight = true;
    }
    this.state.leanLeft = hasLeft;
    this.state.leanRight = hasRight;
  }

  private handleMouseDown(e: MouseEvent): void {
    // Ignore if clicking on UI elements
    if ((e.target as HTMLElement).closest("#settings-btn, #settings-modal"))
      return;

    if (e.clientX < this.layout.width / 2) {
      this.state.leanLeft = true;
    } else {
      this.state.leanRight = true;
    }
    this.state.action = true;
  }

  private handleMouseUp(): void {
    this.state.leanLeft = false;
    this.state.leanRight = false;
  }

  getState(): InputState {
    return { ...this.state };
  }

  consumeAction(): boolean {
    if (this.state.action && !this.actionConsumed) {
      this.actionConsumed = true;
      return true;
    }
    return false;
  }

  resetAction(): void {
    this.state.action = false;
    this.actionConsumed = false;
  }

  updateLayout(layout: Layout): void {
    this.layout = layout;
  }
}

// ============================================================================
// SECTION 7: AUDIO SYSTEM
// ============================================================================

class AudioSystem {
  private context: AudioContext | null = null;
  private settings: SettingsSystem;

  constructor(settings: SettingsSystem) {
    this.settings = settings;
  }

  private initContext(): void {
    if (!this.context) {
      this.context = new (
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext
      )();
    }
    if (this.context.state === "suspended") {
      this.context.resume();
    }
  }

  private canPlay(): boolean {
    return this.settings.get().fx;
  }

  playStart(): void {
    if (!this.canPlay()) return;
    this.initContext();
    if (!this.context) return;

    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    osc.connect(gain);
    gain.connect(this.context.destination);

    const now = this.context.currentTime;
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.1);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  playCoin(): void {
    if (!this.canPlay()) return;
    this.initContext();
    if (!this.context) return;

    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    osc.connect(gain);
    gain.connect(this.context.destination);

    const now = this.context.currentTime;
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(1320, now + 0.08);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  playPass(): void {
    if (!this.canPlay()) return;
    this.initContext();
    if (!this.context) return;

    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    osc.connect(gain);
    gain.connect(this.context.destination);

    const now = this.context.currentTime;
    osc.frequency.setValueAtTime(660, now);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  playWobble(): void {
    if (!this.canPlay()) return;
    this.initContext();
    if (!this.context) return;

    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    osc.type = "triangle";
    osc.connect(gain);
    gain.connect(this.context.destination);

    const now = this.context.currentTime;
    osc.frequency.setValueAtTime(150, now);
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  playFall(): void {
    if (!this.canPlay()) return;
    this.initContext();
    if (!this.context) return;

    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    osc.type = "sawtooth";
    osc.connect(gain);
    gain.connect(this.context.destination);

    const now = this.context.currentTime;
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.5);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
    osc.start(now);
    osc.stop(now + 0.5);
  }
}

// ============================================================================
// SECTION 8: HAPTIC SYSTEM
// ============================================================================

class HapticSystem {
  constructor(private settings: SettingsSystem) {}

  trigger(type: HapticType): void {
    if (!this.settings.get().haptics) return;
    if (typeof window.triggerHaptic === "function") {
      window.triggerHaptic(type);
    }
  }
}

// ============================================================================
// SECTION 9: PARTICLE SYSTEM (Object pooling)
// ============================================================================

class ParticleSystem {
  private pool: Particle[] = [];
  private activeCount = 0;

  constructor() {
    // Pre-allocate particle pool
    for (let i = 0; i < CONFIG.PARTICLES.POOL_SIZE; i++) {
      this.pool.push(this.createInactiveParticle());
    }
  }

  private createInactiveParticle(): Particle {
    return {
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      life: 0,
      maxLife: 0,
      size: 0,
      color: "",
      type: "dust",
      rotation: 0,
      rotationSpeed: 0,
    };
  }

  private acquire(): Particle | null {
    for (const p of this.pool) {
      if (!p.active) {
        p.active = true;
        this.activeCount++;
        return p;
      }
    }
    return null;
  }

  private release(p: Particle): void {
    p.active = false;
    this.activeCount--;
  }

  spawnDust(x: number, y: number): void {
    const p = this.acquire();
    if (!p) return;

    const angle = Utils.randomRange(-Math.PI * 0.8, -Math.PI * 0.2);
    const speed = Utils.randomRange(1, 3);

    p.x = x + Utils.randomRange(-5, 5);
    p.y = y;
    p.vx = Math.cos(angle) * speed;
    p.vy = Math.sin(angle) * speed;
    p.life = Utils.randomRange(300, 500);
    p.maxLife = p.life;
    p.size = Utils.randomRange(2, 5);
    p.color = CONFIG.COLORS.PARTICLE_DUST;
    p.type = "dust";
    p.rotation = Utils.randomRange(0, Math.PI * 2);
    p.rotationSpeed = Utils.randomRange(-0.1, 0.1);
  }

  spawnSparks(x: number, y: number, count: number): void {
    const colors = [
      CONFIG.COLORS.COIN,
      CONFIG.COLORS.PARTICLE_SPARK,
      "#ffffff",
    ];
    for (let i = 0; i < count; i++) {
      const p = this.acquire();
      if (!p) return;

      const angle = (Math.PI * 2 * i) / count + Utils.randomRange(-0.3, 0.3);
      const speed = Utils.randomRange(3, 6);

      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed - 2;
      p.life = Utils.randomRange(400, 700);
      p.maxLife = p.life;
      p.size = Utils.randomRange(3, 7);
      p.color = colors[i % colors.length];
      p.type = "spark";
      p.rotation = Utils.randomRange(0, Math.PI * 2);
      p.rotationSpeed = Utils.randomRange(-0.2, 0.2);
    }
  }

  spawnCrash(x: number, y: number): void {
    const colors = [
      CONFIG.COLORS.PLAYER_BODY,
      CONFIG.COLORS.PLAYER_SKIN,
      "#ffffff",
      "#ff6b6b",
    ];
    for (let i = 0; i < CONFIG.PARTICLES.CRASH_COUNT; i++) {
      const p = this.acquire();
      if (!p) return;

      const angle = Utils.randomRange(0, Math.PI * 2);
      const speed = Utils.randomRange(2, 8);

      p.x = x + Utils.randomRange(-20, 20);
      p.y = y + Utils.randomRange(-40, 0);
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed - Utils.randomRange(2, 5);
      p.life = Utils.randomRange(500, 1000);
      p.maxLife = p.life;
      p.size = Utils.randomRange(4, 10);
      p.color = colors[Utils.randomInt(0, colors.length - 1)];
      p.type = "crash";
      p.rotation = Utils.randomRange(0, Math.PI * 2);
      p.rotationSpeed = Utils.randomRange(-0.3, 0.3);
    }
  }

  spawnStars(x: number, y: number, count: number): void {
    for (let i = 0; i < count; i++) {
      const p = this.acquire();
      if (!p) return;

      const angle = (Math.PI * 2 * i) / count;
      const speed = Utils.randomRange(1, 3);

      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed - 1;
      p.life = Utils.randomRange(300, 600);
      p.maxLife = p.life;
      p.size = Utils.randomRange(6, 10);
      p.color = "#ffffff";
      p.type = "star";
      p.rotation = Utils.randomRange(0, Math.PI * 2);
      p.rotationSpeed = Utils.randomRange(-0.1, 0.1);
    }
  }

  update(dt: number): void {
    for (const p of this.pool) {
      if (!p.active) continue;

      p.x += p.vx * (dt / 16);
      p.y += p.vy * (dt / 16);
      p.vy += 0.15 * (dt / 16); // Gravity
      p.vx *= 0.98;
      p.rotation += p.rotationSpeed * (dt / 16);
      p.life -= dt;

      if (p.life <= 0) {
        this.release(p);
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const p of this.pool) {
      if (!p.active) continue;

      const alpha = Utils.clamp(p.life / p.maxLife, 0, 1);
      const size = p.size * alpha;

      ctx.save();
      ctx.translate(Math.round(p.x), Math.round(p.y));
      ctx.rotate(p.rotation);
      ctx.globalAlpha = alpha;

      if (p.type === "star") {
        // Draw star shape
        ctx.fillStyle = p.color;
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const angle = (i * Math.PI * 2) / 5 - Math.PI / 2;
          const r = i % 2 === 0 ? size : size * 0.4;
          if (i === 0) {
            ctx.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
          } else {
            ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
          }
        }
        ctx.closePath();
        ctx.fill();
      } else {
        // Draw circle
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(0, 0, size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  clear(): void {
    for (const p of this.pool) {
      if (p.active) {
        this.release(p);
      }
    }
  }
}

// ============================================================================
// SECTION 10: FEEDBACK SYSTEM (Screen shake, flash, freeze frames)
// ============================================================================

class FeedbackSystem {
  private shake: ScreenShake = {
    intensity: 0,
    duration: 0,
    elapsed: 0,
    offsetX: 0,
    offsetY: 0,
  };
  private flash: ScreenFlash = {
    active: false,
    duration: 0,
    elapsed: 0,
    color: "#ffffff",
  };
  private freezeTimer = 0;
  private dangerLevel = 0;

  private dangerOverlay: HTMLElement | null;
  private flashOverlay: HTMLElement | null;

  constructor(
    private audio: AudioSystem,
    private haptics: HapticSystem,
    private particles: ParticleSystem,
  ) {
    this.dangerOverlay = document.getElementById("danger-overlay");
    this.flashOverlay = document.getElementById("flash-overlay");
  }

  trigger(type: FeedbackType, x = 0, y = 0): void {
    switch (type) {
      case "coinCollect":
        this.audio.playCoin();
        this.haptics.trigger("medium");
        this.addShake(3, 100);
        this.addFreeze(CONFIG.FEEDBACK.FREEZE_COIN);
        this.particles.spawnSparks(x, y, CONFIG.PARTICLES.SPARK_COUNT);
        this.addFlash("#ffd700", 60);
        break;

      case "obstaclePass":
        this.audio.playPass();
        this.haptics.trigger("light");
        this.particles.spawnStars(x, y, 5);
        break;

      case "nearMiss":
        this.haptics.trigger("light");
        this.addShake(1.5, 50);
        break;

      case "wobble":
        this.audio.playWobble();
        this.haptics.trigger("light");
        break;

      case "fall":
        this.audio.playFall();
        this.haptics.trigger("error");
        this.addShake(12, 400);
        this.addFreeze(CONFIG.FEEDBACK.FREEZE_CRASH);
        this.particles.spawnCrash(x, y);
        this.addFlash("#ff4444", 100);
        break;

      case "start":
        this.audio.playStart();
        this.haptics.trigger("medium");
        break;
    }
  }

  addShake(intensity: number, duration: number): void {
    this.shake.intensity = Math.max(this.shake.intensity, intensity);
    this.shake.duration = Math.max(this.shake.duration, duration);
    this.shake.elapsed = 0;
  }

  addFreeze(duration: number): void {
    this.freezeTimer = Math.max(this.freezeTimer, duration);
  }

  addFlash(color: string, duration: number): void {
    this.flash.active = true;
    this.flash.color = color;
    this.flash.duration = duration;
    this.flash.elapsed = 0;
  }

  setDangerLevel(level: number): void {
    this.dangerLevel = Utils.clamp(level, 0, 1);
  }

  update(dt: number): void {
    // Update shake
    if (this.shake.intensity > 0.1) {
      this.shake.elapsed += dt;
      const decay = Math.pow(CONFIG.FEEDBACK.SHAKE_DECAY, dt / 16);
      this.shake.intensity *= decay;
      this.shake.offsetX = (Math.random() - 0.5) * this.shake.intensity * 2;
      this.shake.offsetY = (Math.random() - 0.5) * this.shake.intensity * 2;
    } else {
      this.shake.intensity = 0;
      this.shake.offsetX = 0;
      this.shake.offsetY = 0;
    }

    // Update flash
    if (this.flash.active) {
      this.flash.elapsed += dt;
      if (this.flash.elapsed >= this.flash.duration) {
        this.flash.active = false;
      }
    }

    // Update freeze
    if (this.freezeTimer > 0) {
      this.freezeTimer -= dt;
    }

    // Update danger overlay
    if (this.dangerOverlay) {
      const opacity = this.dangerLevel > 0 ? (this.dangerLevel - 0.5) * 2 : 0;
      this.dangerOverlay.style.opacity = String(Utils.clamp(opacity, 0, 0.6));
    }

    // Update flash overlay
    if (this.flashOverlay) {
      if (this.flash.active) {
        const progress = this.flash.elapsed / this.flash.duration;
        const opacity = 1 - Utils.easeOutQuad(progress);
        this.flashOverlay.style.backgroundColor = this.flash.color;
        this.flashOverlay.style.opacity = String(opacity * 0.5);
      } else {
        this.flashOverlay.style.opacity = "0";
      }
    }
  }

  getShakeOffset(): { x: number; y: number } {
    return { x: this.shake.offsetX, y: this.shake.offsetY };
  }

  isFrozen(): boolean {
    return this.freezeTimer > 0;
  }

  reset(): void {
    this.shake.intensity = 0;
    this.shake.offsetX = 0;
    this.shake.offsetY = 0;
    this.freezeTimer = 0;
    this.flash.active = false;
    this.dangerLevel = 0;
    if (this.dangerOverlay) this.dangerOverlay.style.opacity = "0";
    if (this.flashOverlay) this.flashOverlay.style.opacity = "0";
  }
}

// ============================================================================
// SECTION 11: PHYSICS SYSTEM
// ============================================================================

class PhysicsSystem {
  updatePlayer(player: Player, input: InputState, dt: number): void {
    const dtNorm = dt / 16.67; // Normalize to ~60fps

    // Apply input
    if (input.leanLeft) {
      player.angularVelocity -= CONFIG.PHYSICS.ANGULAR_ACCELERATION * dtNorm;
    }
    if (input.leanRight) {
      player.angularVelocity += CONFIG.PHYSICS.ANGULAR_ACCELERATION * dtNorm;
    }

    // Apply gravity torque
    player.angularVelocity +=
      Math.sin(player.angle) * CONFIG.PHYSICS.GRAVITY_TORQUE * dtNorm;

    // Apply friction
    player.angularVelocity *= Math.pow(CONFIG.PHYSICS.ANGULAR_FRICTION, dtNorm);

    // Clamp angular velocity
    player.angularVelocity = Utils.clamp(
      player.angularVelocity,
      -CONFIG.PHYSICS.MAX_ANGULAR_VELOCITY,
      CONFIG.PHYSICS.MAX_ANGULAR_VELOCITY,
    );

    // Update angle
    player.angle += player.angularVelocity * dtNorm;

    // Update squash/stretch based on angular velocity
    const targetSquashX =
      1 - Math.abs(player.angularVelocity) * CONFIG.PHYSICS.SQUASH_INTENSITY;
    const targetSquashY =
      1 + Math.abs(player.angularVelocity) * CONFIG.PHYSICS.SQUASH_INTENSITY;
    player.squashX = Utils.lerp(
      player.squashX,
      targetSquashX,
      CONFIG.PHYSICS.SQUASH_RECOVERY * dtNorm,
    );
    player.squashY = Utils.lerp(
      player.squashY,
      targetSquashY,
      CONFIG.PHYSICS.SQUASH_RECOVERY * dtNorm,
    );

    // Update arm spread based on angular velocity
    player.armSpread = 30 + Math.abs(player.angularVelocity) * 200;
  }

  hasFallen(player: Player): boolean {
    return Math.abs(player.angle) > CONFIG.PHYSICS.FALL_ANGLE;
  }

  getDangerLevel(player: Player): number {
    const threshold =
      CONFIG.PHYSICS.FALL_ANGLE * CONFIG.PHYSICS.WOBBLE_DANGER_ZONE;
    if (Math.abs(player.angle) < threshold) return 0;
    return (
      (Math.abs(player.angle) - threshold) /
      (CONFIG.PHYSICS.FALL_ANGLE - threshold)
    );
  }

  checkObstacleCollision(
    player: Player,
    obstacle: Obstacle,
    groundY: number,
  ): boolean {
    const wheelX = player.x;
    const wheelY = groundY - CONFIG.PLAYER.WHEEL_RADIUS;
    const wheelR = CONFIG.PLAYER.WHEEL_RADIUS;

    const obstacleTop = groundY - obstacle.height;

    // Circle-rectangle collision
    const closestX = Utils.clamp(
      wheelX,
      obstacle.x,
      obstacle.x + obstacle.width,
    );
    const closestY = Utils.clamp(wheelY, obstacleTop, groundY);

    const dx = wheelX - closestX;
    const dy = wheelY - closestY;

    return dx * dx + dy * dy < wheelR * wheelR;
  }

  checkCoinCollision(
    player: Player,
    coin: Coin,
    groundY: number,
    time: number,
  ): boolean {
    const bodyY =
      groundY - CONFIG.PLAYER.WHEEL_RADIUS - CONFIG.PLAYER.BODY_HEIGHT / 2;
    const coinY =
      coin.y +
      Math.sin(time * CONFIG.COINS.BOB_SPEED + coin.bobOffset) *
        CONFIG.COINS.BOB_AMPLITUDE;

    const dx = player.x - coin.x;
    const dy = bodyY - coinY;

    return dx * dx + dy * dy < Math.pow(CONFIG.COINS.RADIUS + 35, 2);
  }
}

// ============================================================================
// SECTION 12: GAME OBJECT SYSTEM (Obstacles & Coins)
// ============================================================================

class GameObjectSystem {
  private obstacles: Obstacle[] = [];
  private coins: Coin[] = [];
  private nextObstacleDistance = CONFIG.OBSTACLES.MIN_GAP;

  createObstacle(x: number): void {
    const height = Utils.randomRange(
      CONFIG.OBSTACLES.MIN_HEIGHT,
      CONFIG.OBSTACLES.MAX_HEIGHT,
    );
    this.obstacles.push({
      x,
      width: CONFIG.OBSTACLES.WIDTH,
      height,
      passed: false,
      // Pre-computed visual properties
      shadowOffset: Utils.randomRange(3, 6),
      colorVariant: Utils.randomRange(0.9, 1.1),
    });
  }

  createCoin(x: number, y: number): void {
    this.coins.push({
      x,
      y,
      collected: false,
      // Pre-computed visual properties
      bobOffset: Utils.randomRange(0, Math.PI * 2),
      glowIntensity: Utils.randomRange(0.2, 0.4),
      rotationSpeed: Utils.randomRange(0.001, 0.003),
    });
  }

  update(
    groundSpeed: number,
    dt: number,
    layout: Layout,
  ): { spawned: boolean } {
    const dtNorm = dt / 16.67;
    let spawned = false;

    // Update spawn timer
    this.nextObstacleDistance -= groundSpeed * dtNorm;
    if (this.nextObstacleDistance <= 0) {
      this.createObstacle(layout.width + 50);

      // Maybe spawn coin
      if (Math.random() < CONFIG.COINS.SPAWN_CHANCE) {
        const lastObstacle = this.obstacles[this.obstacles.length - 1];
        this.createCoin(
          layout.width + 50 + CONFIG.OBSTACLES.WIDTH / 2,
          layout.groundY - lastObstacle.height - 60 - CONFIG.COINS.RADIUS,
        );
      }

      this.nextObstacleDistance = Utils.randomRange(
        CONFIG.OBSTACLES.MIN_GAP,
        CONFIG.OBSTACLES.MAX_GAP,
      );
      spawned = true;
    }

    // Update obstacle positions
    for (const o of this.obstacles) {
      o.x -= groundSpeed * dtNorm;
    }

    // Update coin positions
    for (const c of this.coins) {
      c.x -= groundSpeed * dtNorm;
    }

    // Remove off-screen obstacles and coins
    this.obstacles = this.obstacles.filter((o) => o.x + o.width > -50);
    this.coins = this.coins.filter((c) => c.x > -50 && !c.collected);

    return { spawned };
  }

  getObstacles(): Obstacle[] {
    return this.obstacles;
  }

  getCoins(): Coin[] {
    return this.coins;
  }

  markObstaclePassed(obstacle: Obstacle): void {
    obstacle.passed = true;
  }

  collectCoin(coin: Coin): void {
    coin.collected = true;
  }

  reset(): void {
    this.obstacles = [];
    this.coins = [];
    this.nextObstacleDistance = CONFIG.OBSTACLES.MIN_GAP + 200;
  }
}

// ============================================================================
// SECTION 13: UI SYSTEM
// ============================================================================

class UISystem {
  private hud: HTMLElement | null;
  private scoreDisplay: HTMLElement | null;
  private speedSegments: NodeListOf<Element>;
  private controlHints: HTMLElement | null;
  private mobileHints: HTMLElement | null;
  private lastScore = -1;
  private scorePopTimeout: number | null = null;

  constructor() {
    this.hud = document.getElementById("hud");
    this.scoreDisplay = document.getElementById("score-display");
    this.speedSegments = document.querySelectorAll(".speed-segment");
    this.controlHints = document.getElementById("control-hints");
    this.mobileHints = document.getElementById("mobile-hints");
  }

  showHUD(): void {
    this.hud?.classList.remove("hidden");
  }

  hideHUD(): void {
    this.hud?.classList.add("hidden");
  }

  showHints(): void {
    this.controlHints?.classList.add("visible");
    this.mobileHints?.classList.add("visible");
  }

  hideHints(): void {
    this.controlHints?.classList.remove("visible");
    this.mobileHints?.classList.remove("visible");
  }

  updateScore(score: number): void {
    if (score !== this.lastScore && this.scoreDisplay) {
      this.scoreDisplay.textContent = String(score);
      this.lastScore = score;

      // Pop animation
      this.scoreDisplay.classList.add("pop");
      if (this.scorePopTimeout) clearTimeout(this.scorePopTimeout);
      this.scorePopTimeout = window.setTimeout(() => {
        this.scoreDisplay?.classList.remove("pop");
      }, 150);
    }
  }

  updateSpeedBar(speedPercent: number): void {
    const activeCount = Math.ceil(speedPercent * this.speedSegments.length);
    this.speedSegments.forEach((seg, i) => {
      seg.classList.toggle("active", i < activeCount);
    });
  }

  reset(): void {
    this.lastScore = -1;
    this.updateScore(0);
    this.updateSpeedBar(0);
  }
}

// ============================================================================
// SECTION 14: RENDER SYSTEM
// ============================================================================

class RenderSystem {
  private bgCtx: CanvasRenderingContext2D;
  private ctx: CanvasRenderingContext2D;
  private bgDrawn = false;
  private groundOffset = 0;
  private time = 0;

  // Pre-computed cloud positions (NO random in render!)
  private clouds: Array<{
    x: number;
    y: number;
    scale: number;
    speed: number;
  }> = [];

  constructor(
    private bgCanvas: HTMLCanvasElement,
    private gameCanvas: HTMLCanvasElement,
  ) {
    this.bgCtx = bgCanvas.getContext("2d")!;
    this.ctx = gameCanvas.getContext("2d")!;
    this.generateClouds();
  }

  private generateClouds(): void {
    this.clouds = [];
    for (let i = 0; i < 8; i++) {
      this.clouds.push({
        x: Math.random() * 2000,
        y: 50 + Math.random() * 150,
        scale: 0.5 + Math.random() * 0.8,
        speed: 0.1 + Math.random() * 0.2,
      });
    }
  }

  resize(layout: Layout): void {
    this.bgCanvas.width = layout.width;
    this.bgCanvas.height = layout.height;
    this.gameCanvas.width = layout.width;
    this.gameCanvas.height = layout.height;
    this.bgDrawn = false;
  }

  updateTime(dt: number): void {
    this.time += dt;
  }

  updateGroundOffset(groundSpeed: number, dt: number): void {
    this.groundOffset = (this.groundOffset + groundSpeed * (dt / 16.67)) % 40;
  }

  drawBackground(layout: Layout): void {
    if (this.bgDrawn) return;

    const { width, height } = layout;
    const ctx = this.bgCtx;

    // Sky gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, CONFIG.COLORS.SKY_TOP);
    gradient.addColorStop(1, CONFIG.COLORS.SKY_BOTTOM);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Clouds (static, pre-computed positions)
    ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
    for (const cloud of this.clouds) {
      const x = cloud.x % width;
      this.drawCloud(ctx, x, cloud.y, cloud.scale);
    }

    this.bgDrawn = true;
  }

  private drawCloud(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    scale: number,
  ): void {
    ctx.beginPath();
    ctx.arc(x, y, 30 * scale, 0, Math.PI * 2);
    ctx.arc(x + 25 * scale, y - 10 * scale, 25 * scale, 0, Math.PI * 2);
    ctx.arc(x + 50 * scale, y, 30 * scale, 0, Math.PI * 2);
    ctx.arc(x + 25 * scale, y + 10 * scale, 20 * scale, 0, Math.PI * 2);
    ctx.fill();
  }

  clear(): void {
    this.ctx.clearRect(0, 0, this.gameCanvas.width, this.gameCanvas.height);
  }

  applyShake(offset: { x: number; y: number }): void {
    this.ctx.save();
    this.ctx.translate(Math.round(offset.x), Math.round(offset.y));
  }

  resetTransform(): void {
    this.ctx.restore();
  }

  drawGround(layout: Layout): void {
    const { width, groundY } = layout;
    const groundHeight = CONFIG.MOVEMENT.GROUND_HEIGHT;

    // Main ground
    this.ctx.fillStyle = CONFIG.COLORS.GROUND;
    this.ctx.fillRect(0, groundY, width, groundHeight);

    // Ground pattern (scrolling stripes)
    this.ctx.fillStyle = CONFIG.COLORS.GROUND_DARK;
    for (let x = -this.groundOffset; x < width + 40; x += 40) {
      this.ctx.fillRect(Math.round(x), groundY, 20, 5);
    }

    // Ground line
    this.ctx.strokeStyle = CONFIG.COLORS.GROUND_PATTERN;
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.moveTo(0, groundY);
    this.ctx.lineTo(width, groundY);
    this.ctx.stroke();
  }

  drawObstacle(obstacle: Obstacle, groundY: number): void {
    const { x, width, height, shadowOffset } = obstacle;
    const top = groundY - height;

    // Shadow
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
    this.ctx.fillRect(
      Math.round(x + shadowOffset),
      Math.round(top + shadowOffset),
      width,
      height,
    );

    // Main body
    this.ctx.fillStyle = CONFIG.COLORS.OBSTACLE;
    this.ctx.fillRect(Math.round(x), Math.round(top), width, height);

    // Left highlight
    this.ctx.fillStyle = CONFIG.COLORS.OBSTACLE_SHADOW;
    this.ctx.fillRect(Math.round(x), Math.round(top), width * 0.25, height);

    // Top highlight
    this.ctx.fillStyle = CONFIG.COLORS.OBSTACLE_HIGHLIGHT;
    this.ctx.fillRect(Math.round(x), Math.round(top), width, 4);
  }

  drawCoin(coin: Coin, groundY: number): void {
    const bobY =
      coin.y +
      Math.sin(this.time * CONFIG.COINS.BOB_SPEED + coin.bobOffset) *
        CONFIG.COINS.BOB_AMPLITUDE;
    const x = Math.round(coin.x);
    const y = Math.round(bobY);

    // Glow
    this.ctx.beginPath();
    this.ctx.arc(x, y, CONFIG.COINS.RADIUS + 6, 0, Math.PI * 2);
    this.ctx.fillStyle = CONFIG.COLORS.COIN_GLOW;
    this.ctx.fill();

    // Main coin
    this.ctx.beginPath();
    this.ctx.arc(x, y, CONFIG.COINS.RADIUS, 0, Math.PI * 2);
    this.ctx.fillStyle = CONFIG.COLORS.COIN;
    this.ctx.fill();

    // Inner circle
    this.ctx.beginPath();
    this.ctx.arc(x, y, CONFIG.COINS.RADIUS * 0.6, 0, Math.PI * 2);
    this.ctx.fillStyle = CONFIG.COLORS.COIN_DARK;
    this.ctx.fill();

    // Shine
    this.ctx.beginPath();
    this.ctx.arc(x - 4, y - 4, 4, 0, Math.PI * 2);
    this.ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    this.ctx.fill();
  }

  drawPlayer(player: Player, groundY: number, groundSpeed: number): void {
    const wheelX = Math.round(player.x);
    const wheelY = Math.round(groundY - CONFIG.PLAYER.WHEEL_RADIUS);

    this.ctx.save();
    this.ctx.translate(wheelX, wheelY);
    this.ctx.rotate(player.angle);
    this.ctx.scale(player.squashX, player.squashY);

    // Wheel
    this.ctx.beginPath();
    this.ctx.arc(0, 0, CONFIG.PLAYER.WHEEL_RADIUS, 0, Math.PI * 2);
    this.ctx.fillStyle = CONFIG.COLORS.PLAYER_WHEEL;
    this.ctx.fill();

    // Wheel spokes
    this.ctx.strokeStyle = CONFIG.COLORS.PLAYER_WHEEL_SPOKE;
    this.ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      const angle = player.wheelRotation + (Math.PI / 2) * i;
      this.ctx.beginPath();
      this.ctx.moveTo(0, 0);
      this.ctx.lineTo(
        Math.cos(angle) * CONFIG.PLAYER.WHEEL_RADIUS * 0.8,
        Math.sin(angle) * CONFIG.PLAYER.WHEEL_RADIUS * 0.8,
      );
      this.ctx.stroke();
    }

    // Wheel center
    this.ctx.beginPath();
    this.ctx.arc(0, 0, 5, 0, Math.PI * 2);
    this.ctx.fillStyle = "#666688";
    this.ctx.fill();

    // Seat post
    this.ctx.fillStyle = "#555577";
    this.ctx.fillRect(-3, -CONFIG.PLAYER.WHEEL_RADIUS - 20, 6, 20);

    // Seat
    this.ctx.fillStyle = CONFIG.COLORS.PLAYER_WHEEL;
    this.ctx.beginPath();
    this.ctx.ellipse(
      0,
      -CONFIG.PLAYER.WHEEL_RADIUS - 22,
      15,
      6,
      0,
      0,
      Math.PI * 2,
    );
    this.ctx.fill();

    // Body
    const bodyY = -CONFIG.PLAYER.WHEEL_RADIUS - 25;

    // Torso
    this.ctx.fillStyle = CONFIG.COLORS.PLAYER_BODY;
    this.ctx.beginPath();
    this.ctx.moveTo(-12, bodyY);
    this.ctx.lineTo(-10, bodyY - CONFIG.PLAYER.BODY_HEIGHT + 15);
    this.ctx.lineTo(10, bodyY - CONFIG.PLAYER.BODY_HEIGHT + 15);
    this.ctx.lineTo(12, bodyY);
    this.ctx.closePath();
    this.ctx.fill();

    // Arms
    const armY = bodyY - 35;
    const armOffset = player.angularVelocity * 80;
    this.ctx.strokeStyle = CONFIG.COLORS.PLAYER_SKIN;
    this.ctx.lineWidth = 6;
    this.ctx.lineCap = "round";

    // Left arm
    this.ctx.beginPath();
    this.ctx.moveTo(-10, armY);
    this.ctx.lineTo(-10 - player.armSpread, armY - 5 + armOffset);
    this.ctx.stroke();

    // Right arm
    this.ctx.beginPath();
    this.ctx.moveTo(10, armY);
    this.ctx.lineTo(10 + player.armSpread, armY - 5 - armOffset);
    this.ctx.stroke();

    // Head
    const headY =
      bodyY - CONFIG.PLAYER.BODY_HEIGHT - CONFIG.PLAYER.HEAD_RADIUS + 15;
    this.ctx.beginPath();
    this.ctx.arc(0, headY, CONFIG.PLAYER.HEAD_RADIUS, 0, Math.PI * 2);
    this.ctx.fillStyle = CONFIG.COLORS.PLAYER_SKIN;
    this.ctx.fill();

    // Hair
    this.ctx.fillStyle = "#4a3728";
    this.ctx.beginPath();
    this.ctx.arc(0, headY - 4, CONFIG.PLAYER.HEAD_RADIUS, Math.PI, 0, false);
    this.ctx.fill();

    // Eyes (follow lean direction)
    const eyeOffset = player.angularVelocity * 3;
    this.ctx.fillStyle = "#333";
    this.ctx.beginPath();
    this.ctx.arc(-5 + eyeOffset, headY - 2, 2.5, 0, Math.PI * 2);
    this.ctx.arc(5 + eyeOffset, headY - 2, 2.5, 0, Math.PI * 2);
    this.ctx.fill();

    // Expression based on danger
    const danger = Math.abs(player.angle) / CONFIG.PHYSICS.FALL_ANGLE;
    this.ctx.strokeStyle = "#333";
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    if (danger > 0.5) {
      // Worried
      this.ctx.arc(0, headY + 6, 4, 0.2 * Math.PI, 0.8 * Math.PI);
    } else {
      // Slight smile
      this.ctx.arc(0, headY + 3, 4, 0.2 * Math.PI, 0.8 * Math.PI);
    }
    this.ctx.stroke();

    this.ctx.restore();

    // Update wheel rotation
    player.wheelRotation += groundSpeed * 0.008;
  }

  drawStartScreen(layout: Layout): void {
    const { width, height } = layout;
    const ctx = this.ctx;

    // Overlay
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(0, 0, width, height);

    // Title
    ctx.fillStyle = CONFIG.COLORS.TEXT;
    ctx.font = "bold 52px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(0, 0, 0, 0.3)";
    ctx.shadowBlur = 8;
    ctx.fillText("Unicycle Hero", width / 2, height / 2 - 80);

    // Subtitle
    ctx.font = "20px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    ctx.shadowBlur = 0;
    ctx.fillText("Balance Challenge", width / 2, height / 2 - 35);

    // Instructions
    ctx.font = "18px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    const instruction = layout.isMobile
      ? "Tap left or right to balance"
      : "Use A/D or Arrow Keys";
    ctx.fillText(instruction, width / 2, height / 2 + 20);

    // Start prompt (pulsing)
    const pulse = 0.7 + Math.sin(this.time * 0.005) * 0.3;
    ctx.globalAlpha = pulse;
    ctx.font = "bold 24px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillStyle = CONFIG.COLORS.COIN;
    const startText = layout.isMobile ? "Tap to Start" : "Press Space";
    ctx.fillText(startText, width / 2, height / 2 + 80);
    ctx.globalAlpha = 1;

    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
  }

  drawGameOverScreen(layout: Layout, score: number): void {
    const { width, height } = layout;
    const ctx = this.ctx;

    // Overlay
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(0, 0, width, height);

    // Game Over text
    ctx.fillStyle = CONFIG.COLORS.OBSTACLE;
    ctx.font = "bold 48px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
    ctx.shadowBlur = 8;
    ctx.fillText("Game Over", width / 2, height / 2 - 60);

    // Score
    ctx.fillStyle = CONFIG.COLORS.TEXT;
    ctx.font = "bold 40px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.shadowBlur = 0;
    ctx.fillText(`Score: ${score}`, width / 2, height / 2 + 10);

    // Retry prompt (pulsing)
    const pulse = 0.7 + Math.sin(this.time * 0.005) * 0.3;
    ctx.globalAlpha = pulse;
    ctx.font = "bold 22px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillStyle = CONFIG.COLORS.GROUND;
    const retryText = layout.isMobile ? "Tap to Retry" : "Press Space";
    ctx.fillText(retryText, width / 2, height / 2 + 80);
    ctx.globalAlpha = 1;

    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
  }

  getTime(): number {
    return this.time;
  }
}

// ============================================================================
// SECTION 15: GAME ENGINE (Orchestrator)
// ============================================================================

class GameEngine {
  // Core state
  private state: GameState = "start";
  private score = 0;
  private distance = 0;
  private groundSpeed = CONFIG.MOVEMENT.GROUND_SPEED_INITIAL;

  // Player
  private player: Player;

  // Layout
  private layout: Layout;

  // Systems
  private settings: SettingsSystem;
  private input: InputSystem;
  private audio: AudioSystem;
  private haptics: HapticSystem;
  private particles: ParticleSystem;
  private feedback: FeedbackSystem;
  private physics: PhysicsSystem;
  private gameObjects: GameObjectSystem;
  private ui: UISystem;
  private render: RenderSystem;

  // AAA Systems
  private verlet: VerletSystem;
  private camera: CameraSystem;
  private timeDilation: TimeDilationSystem;
  private postProcess: PostProcessingSystem;
  private trail: TrailRenderer;
  private lighting: LightingSystem;

  // Timing
  private lastTime = 0;
  private accumulator = 0;

  // Dust spawn accumulator
  private dustAccumulator = 0;

  // Near-miss tracking for slow-mo
  private lastNearMissTime = 0;

  constructor() {
    // Initialize layout first
    this.layout = this.calculateLayout();

    // Initialize player
    this.player = this.createPlayer();

    // Initialize systems
    this.settings = new SettingsSystem();
    this.input = new InputSystem(this.layout);
    this.audio = new AudioSystem(this.settings);
    this.haptics = new HapticSystem(this.settings);
    this.particles = new ParticleSystem();
    this.feedback = new FeedbackSystem(
      this.audio,
      this.haptics,
      this.particles,
    );
    this.physics = new PhysicsSystem();
    this.gameObjects = new GameObjectSystem();
    this.ui = new UISystem();

    // Initialize render system
    const bgCanvas = document.getElementById("bg-canvas") as HTMLCanvasElement;
    const gameCanvas = document.getElementById(
      "game-canvas",
    ) as HTMLCanvasElement;
    this.render = new RenderSystem(bgCanvas, gameCanvas);

    // Initialize AAA systems
    this.verlet = new VerletSystem();
    this.camera = new CameraSystem(this.layout.width, this.layout.height);
    this.timeDilation = new TimeDilationSystem();
    this.postProcess = new PostProcessingSystem(
      this.layout.width,
      this.layout.height,
    );
    this.trail = new TrailRenderer();
    this.lighting = new LightingSystem();

    // Setup
    this.setupEventListeners();
    this.resize();

    // Start game loop
    requestAnimationFrame((t) => this.gameLoop(t));
  }

  private calculateLayout(): Layout {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const isMobile = window.matchMedia("(pointer: coarse)").matches;

    return {
      width,
      height,
      groundY: height - CONFIG.MOVEMENT.GROUND_HEIGHT,
      playerX: width * 0.25,
      safeAreaTop: isMobile
        ? CONFIG.LAYOUT.SAFE_AREA_MOBILE
        : CONFIG.LAYOUT.SAFE_AREA_DESKTOP,
      isMobile,
    };
  }

  private createPlayer(): Player {
    return {
      x: this.layout.playerX,
      y: this.layout.groundY - CONFIG.PLAYER.WHEEL_RADIUS,
      angle: 0,
      angularVelocity: 0,
      wheelRotation: 0,
      squashX: 1,
      squashY: 1,
      armSpread: 30,
    };
  }

  private setupEventListeners(): void {
    window.addEventListener("resize", () => this.resize());

    // Focus handling
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && this.state === "playing") {
        this.pause();
      }
    });

    window.addEventListener("blur", () => {
      if (this.state === "playing") {
        this.pause();
      }
    });
  }

  private resize(): void {
    this.layout = this.calculateLayout();
    this.player.x = this.layout.playerX;
    this.render.resize(this.layout);
    this.input.updateLayout(this.layout);
    this.postProcess.resize(this.layout.width, this.layout.height);
    this.camera.reset(this.layout.width, this.layout.height);
  }

  private gameLoop(currentTime: number): void {
    const rawFrameTime = Math.min(
      currentTime - this.lastTime,
      CONFIG.TIMING.MAX_FRAME_TIME,
    );
    this.lastTime = currentTime;

    // Handle settings modal
    if (this.settings.isOpen()) {
      requestAnimationFrame((t) => this.gameLoop(t));
      return;
    }

    // Handle input actions
    if (this.input.consumeAction()) {
      this.handleAction();
    }

    // Update time dilation
    const timeScale = this.timeDilation.update(rawFrameTime);
    const frameTime = rawFrameTime * timeScale;

    // Update based on state
    if (this.state === "playing" && !this.feedback.isFrozen()) {
      this.accumulator += frameTime;

      // Fixed timestep physics
      while (this.accumulator >= CONFIG.TIMING.FIXED_TIMESTEP) {
        this.updatePhysics(CONFIG.TIMING.FIXED_TIMESTEP);
        this.accumulator -= CONFIG.TIMING.FIXED_TIMESTEP;
      }

      // Update AAA systems
      const neckX = this.player.x - Math.sin(this.player.angle) * 50;
      const neckY =
        this.layout.groundY -
        CONFIG.PLAYER.WHEEL_RADIUS -
        CONFIG.PLAYER.BODY_HEIGHT -
        10;
      const windX = -this.groundSpeed * 0.5;
      this.verlet.update(neckX, neckY, this.player.angle, frameTime, windX);

      // Update camera
      this.camera.update(
        this.player.x,
        this.layout.groundY,
        this.groundSpeed,
        frameTime,
      );

      // Update trail
      if (this.groundSpeed > CONFIG.MOVEMENT.GROUND_SPEED_INITIAL * 1.5) {
        this.trail.addPoint(
          this.player.x,
          this.layout.groundY - CONFIG.PLAYER.WHEEL_RADIUS,
          this.player.angle,
        );
      }
      this.trail.update();
    }

    // Always update visual systems
    this.feedback.update(rawFrameTime);
    this.particles.update(frameTime);
    this.render.updateTime(frameTime);

    // Render
    this.renderFrame();

    // Reset action flag
    this.input.resetAction();

    requestAnimationFrame((t) => this.gameLoop(t));
  }

  private handleAction(): void {
    if (this.state === "start") {
      this.start();
    } else if (this.state === "gameOver") {
      this.reset();
    } else if (this.state === "paused") {
      this.resume();
    }
  }

  private start(): void {
    this.state = "playing";
    this.feedback.trigger("start");
    this.ui.showHUD();
    this.ui.hideHints();
    this.settings.setButtonVisible(true);
  }

  private pause(): void {
    this.state = "paused";
  }

  private resume(): void {
    this.state = "playing";
  }

  private gameOver(): void {
    this.state = "gameOver";
    this.feedback.trigger(
      "fall",
      this.player.x,
      this.layout.groundY - CONFIG.PLAYER.WHEEL_RADIUS,
    );
    this.ui.hideHUD();
    this.settings.setButtonVisible(false);

    // Submit score
    if (typeof window.submitScore === "function") {
      window.submitScore(this.score);
    }
  }

  private reset(): void {
    this.state = "start";
    this.score = 0;
    this.distance = 0;
    this.groundSpeed = CONFIG.MOVEMENT.GROUND_SPEED_INITIAL;
    this.player = this.createPlayer();
    this.gameObjects.reset();
    this.particles.clear();
    this.feedback.reset();
    this.ui.reset();
    this.ui.hideHUD();
    this.ui.showHints();
    this.settings.setButtonVisible(false);
    this.resetAAASystems();
  }

  private updatePhysics(dt: number): void {
    const input = this.input.getState();

    // Update player physics
    this.physics.updatePlayer(this.player, input, dt);

    // Check for fall
    if (this.physics.hasFallen(this.player)) {
      this.gameOver();
      return;
    }

    // Update danger level
    const danger = this.physics.getDangerLevel(this.player);
    this.feedback.setDangerLevel(danger);

    // Trigger wobble feedback at high danger
    if (danger > 0.7 && Math.random() < 0.05) {
      this.feedback.trigger("wobble");
    }

    // AAA: Trigger slow-mo on near-miss (high danger recovery)
    const now = performance.now();
    if (danger > 0.85 && now - this.lastNearMissTime > 2000) {
      this.timeDilation.triggerSlowMo(600);
      this.camera.triggerImpactZoom();
      this.feedback.trigger("nearMiss", this.player.x, this.layout.groundY);
      this.lastNearMissTime = now;
    }

    // Update ground speed (difficulty progression)
    this.groundSpeed = Math.min(
      this.groundSpeed + CONFIG.MOVEMENT.SPEED_INCREMENT * (dt / 16.67),
      CONFIG.MOVEMENT.GROUND_SPEED_MAX,
    );

    // Update distance and score
    this.distance += this.groundSpeed * (dt / 16.67);
    this.score = Math.floor(this.distance / 8);
    this.ui.updateScore(this.score);

    // Update speed bar
    const speedPercent =
      (this.groundSpeed - CONFIG.MOVEMENT.GROUND_SPEED_INITIAL) /
      (CONFIG.MOVEMENT.GROUND_SPEED_MAX - CONFIG.MOVEMENT.GROUND_SPEED_INITIAL);
    this.ui.updateSpeedBar(speedPercent);

    // Update ground offset
    this.render.updateGroundOffset(this.groundSpeed, dt);

    // Update game objects
    this.gameObjects.update(this.groundSpeed, dt, this.layout);

    // Check collisions
    this.checkCollisions();

    // Spawn dust particles
    this.dustAccumulator += dt;
    if (this.dustAccumulator > 50 / this.groundSpeed) {
      this.particles.spawnDust(
        this.player.x - CONFIG.PLAYER.WHEEL_RADIUS * 0.5,
        this.layout.groundY,
      );
      this.dustAccumulator = 0;
    }
  }

  private checkCollisions(): void {
    // Check obstacle collisions
    for (const obstacle of this.gameObjects.getObstacles()) {
      if (
        this.physics.checkObstacleCollision(
          this.player,
          obstacle,
          this.layout.groundY,
        )
      ) {
        this.gameOver();
        return;
      }

      // Check if passed
      if (
        !obstacle.passed &&
        obstacle.x + obstacle.width < this.player.x - CONFIG.PLAYER.WHEEL_RADIUS
      ) {
        this.gameObjects.markObstaclePassed(obstacle);
        this.score += 5;
        this.feedback.trigger(
          "obstaclePass",
          obstacle.x + obstacle.width / 2,
          this.layout.groundY - obstacle.height,
        );
      }
    }

    // Check coin collisions
    for (const coin of this.gameObjects.getCoins()) {
      if (
        !coin.collected &&
        this.physics.checkCoinCollision(
          this.player,
          coin,
          this.layout.groundY,
          this.render.getTime(),
        )
      ) {
        this.gameObjects.collectCoin(coin);
        this.score += CONFIG.COINS.VALUE;
        this.feedback.trigger("coinCollect", coin.x, coin.y);
      }
    }
  }

  private renderFrame(): void {
    const gameCanvas = document.getElementById(
      "game-canvas",
    ) as HTMLCanvasElement;
    const ctx = gameCanvas.getContext("2d")!;

    // Draw static background
    this.render.drawBackground(this.layout);

    // Clear game canvas
    this.render.clear();

    // Apply screen shake
    const shakeOffset = this.feedback.getShakeOffset();
    this.render.applyShake(shakeOffset);

    // AAA: Apply camera transform
    if (this.state === "playing") {
      this.camera.applyTransform(ctx, this.layout.width, this.layout.height);
    }

    // AAA: Draw dynamic lighting - ground shadow
    this.lighting.drawGroundShadow(
      ctx,
      this.player.x,
      this.layout.groundY,
      this.player.angle,
    );

    // Draw ground
    this.render.drawGround(this.layout);

    // AAA: Draw obstacle shadows
    for (const obstacle of this.gameObjects.getObstacles()) {
      this.lighting.drawObstacleShadow(
        ctx,
        obstacle.x,
        obstacle.width,
        this.layout.groundY,
        obstacle.height,
        this.player.x,
      );
    }

    // Draw obstacles
    for (const obstacle of this.gameObjects.getObstacles()) {
      this.render.drawObstacle(obstacle, this.layout.groundY);
    }

    // Draw coins
    for (const coin of this.gameObjects.getCoins()) {
      if (!coin.collected) {
        this.render.drawCoin(coin, this.layout.groundY);
      }
    }

    // AAA: Draw motion trail
    this.trail.draw(ctx, (c, x, y, angle, alpha) => {
      c.globalAlpha = alpha;
      this.render.drawPlayer(
        { ...this.player, x, angle },
        this.layout.groundY,
        this.groundSpeed,
      );
      c.globalAlpha = 1;
    });

    // Draw player
    this.render.drawPlayer(this.player, this.layout.groundY, this.groundSpeed);

    // AAA: Draw scarf/cape
    this.verlet.draw(ctx);

    // AAA: Draw wheel glow
    this.lighting.drawWheelGlow(
      ctx,
      this.player.x,
      this.layout.groundY - CONFIG.PLAYER.WHEEL_RADIUS,
      this.groundSpeed,
    );

    // Draw particles
    this.particles.draw(ctx);

    // Reset transform
    this.render.resetTransform();
    ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset camera transform

    // AAA: Post-processing effects
    if (this.state === "playing") {
      // Chromatic aberration on slow-mo
      if (this.timeDilation.isSlowMo()) {
        this.postProcess.applyChromaticAberration(
          ctx,
          gameCanvas,
          1 - this.timeDilation.getScale(),
        );
      }

      // Vignette effect
      const danger = this.physics.getDangerLevel(this.player);
      this.postProcess.drawVignette(
        ctx,
        this.layout.width,
        this.layout.height,
        0.5 + danger * 0.5,
      );

      // Bloom on coins and glow
      this.postProcess.applyBloom(ctx, gameCanvas);
    }

    // Draw overlays based on state
    if (this.state === "start") {
      this.render.drawStartScreen(this.layout);
    } else if (this.state === "gameOver") {
      this.render.drawGameOverScreen(this.layout, this.score);
    }

    // AAA: Draw slow-mo indicator
    if (this.timeDilation.isSlowMo()) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
      ctx.font = "bold 24px -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(
        "SLOW MOTION",
        this.layout.width / 2,
        this.layout.safeAreaTop + 80,
      );
    }
  }

  // AAA: Reset method update to include new systems
  private resetAAASystems(): void {
    this.verlet.reset();
    this.camera.reset(this.layout.width, this.layout.height);
    this.timeDilation.reset();
    this.trail.clear();
    this.lastNearMissTime = 0;
  }
}

// ============================================================================
// SECTION 16: INITIALIZATION
// ============================================================================

// Start the game when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => new GameEngine());
} else {
  new GameEngine();
}
