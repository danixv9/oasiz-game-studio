/**
 * GRID SURGE - Premium Block Puzzle
 *
 * Visual systems: Ambient starfield, shockwave rings, screen flash,
 * 3D block rendering, grid glow, danger zone, almost-full indicators
 * Gameplay: combos, perfect clears, milestones, difficulty scaling, haptics
 */

// ============= CONFIGURATION =============
const CONFIG = {
  GRID_SIZE: 8,
  BLOCK_COLORS: [
    { main: "#ff6b6b", light: "#ff9a9a", dark: "#c94040", glow: "rgba(255,107,107,0.55)", accent: "#ff4757" },
    { main: "#ffa94d", light: "#ffc078", dark: "#cc7a20", glow: "rgba(255,169,77,0.55)", accent: "#ff9f43" },
    { main: "#ffd43b", light: "#ffe580", dark: "#ccaa20", glow: "rgba(255,212,59,0.55)", accent: "#ffc312" },
    { main: "#51cf66", light: "#8ce99a", dark: "#2f9e44", glow: "rgba(81,207,102,0.55)", accent: "#26de81" },
    { main: "#339af0", light: "#74c0fc", dark: "#1971c2", glow: "rgba(51,154,240,0.55)", accent: "#4dabf7" },
    { main: "#cc5de8", light: "#e599f7", dark: "#9c36b5", glow: "rgba(204,93,232,0.55)", accent: "#a55eea" },
  ],
  GRID_BG: "#13132b",
  GRID_CELL_BG: "#1c1c42",
  GRID_CELL_BORDER: "#2e2e5e",
  COMBO_TIMEOUT: 3000,
  BLOCK_QUEUE_SIZE: 3,
  // Visual tuning
  AMBIENT_PARTICLE_COUNT: 40,
  GRID_GLOW_INTENSITY: 0.12,
  DANGER_THRESHOLD: 0.65,
  ALMOST_FULL_THRESHOLD: 7,
  MILESTONE_INTERVAL: 1000,
  // Difficulty scaling
  DIFFICULTY_SCORE_STEPS: [500, 1500, 3000, 5000, 8000, 12000],
  // Difficulty levels reduce easy shapes and increase complex ones
  DIFFICULTY_EASY_WEIGHT_MULT: [1.0, 0.85, 0.7, 0.55, 0.4, 0.3, 0.2],
  DIFFICULTY_HARD_WEIGHT_MULT: [1.0, 1.2, 1.5, 1.8, 2.2, 2.8, 3.5],
  // Streak rewards
  STREAK_BONUS_MULT: [0, 0, 0.25, 0.5, 1.0, 1.5, 2.0, 3.0],
};

// Block shape definitions
const BLOCK_SHAPES: { cells: [number, number][]; weight: number }[] = [
  { cells: [[0, 0]], weight: 22 },
  { cells: [[0, 0], [1, 0]], weight: 16 },
  { cells: [[0, 0], [0, 1]], weight: 16 },
  { cells: [[0, 0], [1, 0], [2, 0]], weight: 12 },
  { cells: [[0, 0], [0, 1], [0, 2]], weight: 12 },
  { cells: [[0, 0], [1, 0], [2, 0], [3, 0]], weight: 4 },
  { cells: [[0, 0], [0, 1], [0, 2], [0, 3]], weight: 4 },
  { cells: [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]], weight: 1 },
  { cells: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]], weight: 1 },
  { cells: [[0, 0], [1, 0], [0, 1], [1, 1]], weight: 12 },
  { cells: [[0, 0], [0, 1], [1, 1]], weight: 10 },
  { cells: [[1, 0], [0, 1], [1, 1]], weight: 10 },
  { cells: [[0, 0], [1, 0], [0, 1]], weight: 10 },
  { cells: [[0, 0], [1, 0], [1, 1]], weight: 10 },
  { cells: [[0, 0], [0, 1], [0, 2], [1, 2]], weight: 3 },
  { cells: [[0, 0], [0, 1], [0, 2], [1, 0]], weight: 3 },
  { cells: [[0, 0], [1, 0], [2, 0], [2, 1]], weight: 3 },
  { cells: [[0, 0], [1, 0], [2, 0], [0, 1]], weight: 3 },
  { cells: [[0, 0], [1, 0], [1, 1], [1, 2]], weight: 3 },
  { cells: [[0, 0], [0, 1], [1, 0], [2, 0]], weight: 3 },
  { cells: [[1, 0], [1, 1], [1, 2], [0, 2]], weight: 3 },
  { cells: [[0, 0], [1, 0], [2, 0], [1, 1]], weight: 4 },
  { cells: [[1, 0], [0, 1], [1, 1], [1, 2]], weight: 4 },
  { cells: [[1, 0], [0, 1], [1, 1], [2, 1]], weight: 4 },
  { cells: [[0, 0], [0, 1], [0, 2], [1, 1]], weight: 4 },
  { cells: [[0, 0], [1, 0], [1, 1], [2, 1]], weight: 4 },
  { cells: [[1, 0], [0, 1], [1, 1], [0, 2]], weight: 4 },
  { cells: [[0, 1], [1, 0], [1, 1], [2, 0]], weight: 4 },
  { cells: [[0, 0], [0, 1], [1, 1], [1, 2]], weight: 4 },
  { cells: [[0, 0], [1, 1]], weight: 10 },
  { cells: [[1, 0], [0, 1]], weight: 10 },
  { cells: [[0, 0], [1, 1], [2, 2]], weight: 3 },
  { cells: [[2, 0], [1, 1], [0, 2]], weight: 3 },
  { cells: [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2]], weight: 2 },
  { cells: [[0, 0], [1, 0], [1, 1]], weight: 8 },
  { cells: [[0, 0], [0, 1], [1, 0]], weight: 8 },
];

// ============= UTILITY =============
function lerp(a: number, b: number, t: number): number { return a + (b - a) * t; }
function clamp(v: number, min: number, max: number): number { return Math.max(min, Math.min(max, v)); }
function easeOutBack(t: number): number {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}
function easeOutElastic(t: number): number {
  if (t === 0 || t === 1) return t;
  return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
}
function easeOutCubic(t: number): number { return 1 - Math.pow(1 - t, 3); }
function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}
function easeOutQuart(t: number): number { return 1 - Math.pow(1 - t, 4); }

function weightedRandom<T extends { weight: number }>(items: T[]): T {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = Math.random() * total;
  for (const item of items) { r -= item.weight; if (r <= 0) return item; }
  return items[0];
}

function triggerHaptic(type: string): void {
  try { (window as any).triggerHaptic?.(type); } catch {}
}

// ============= AMBIENT STARFIELD =============
interface AmbientDot {
  x: number; y: number; size: number; speed: number;
  opacity: number; twinkleSpeed: number; twinklePhase: number;
}

class AmbientSystem {
  dots: AmbientDot[] = [];
  time = 0;

  init(w: number, h: number) {
    this.dots = [];
    for (let i = 0; i < CONFIG.AMBIENT_PARTICLE_COUNT; i++) {
      this.dots.push({
        x: Math.random() * w,
        y: Math.random() * h,
        size: 0.5 + Math.random() * 2,
        speed: 0.1 + Math.random() * 0.3,
        opacity: 0.1 + Math.random() * 0.35,
        twinkleSpeed: 0.5 + Math.random() * 2,
        twinklePhase: Math.random() * Math.PI * 2,
      });
    }
  }

  update(dt: number, h: number) {
    this.time += dt;
    for (const d of this.dots) {
      d.y -= d.speed * dt * 20;
      if (d.y < -5) { d.y = h + 5; d.x = Math.random() * window.innerWidth; }
    }
  }

  draw(ctx: CanvasRenderingContext2D, difficulty = 0) {
    // Shift star colors with difficulty: blue → purple → red
    const r = Math.round(160 + difficulty * 12);
    const g = Math.round(180 - difficulty * 15);
    const b = Math.round(255 - difficulty * 10);
    const starColor = `rgb(${r},${g},${b})`;
    for (const d of this.dots) {
      const twinkle = 0.5 + 0.5 * Math.sin(this.time * d.twinkleSpeed + d.twinklePhase);
      ctx.globalAlpha = d.opacity * twinkle;
      ctx.fillStyle = starColor;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

// ============= SHOCKWAVE SYSTEM =============
interface Shockwave {
  x: number; y: number;
  radius: number; maxRadius: number;
  life: number; color: string; lineWidth: number;
}

class ShockwaveSystem {
  waves: Shockwave[] = [];

  emit(x: number, y: number, maxRadius: number, color: string, lineWidth = 3) {
    if (this.waves.length >= 20) return; // Cap shockwaves
    this.waves.push({ x, y, radius: 0, maxRadius, life: 1, color, lineWidth });
  }

  update(dt: number) {
    for (let i = this.waves.length - 1; i >= 0; i--) {
      const w = this.waves[i];
      w.life -= dt * 1.8;
      w.radius = (1 - w.life) * w.maxRadius;
      if (w.life <= 0) {
        this.waves[i] = this.waves[this.waves.length - 1];
        this.waves.pop();
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    for (const w of this.waves) {
      ctx.save();
      ctx.globalAlpha = w.life * 0.6;
      ctx.strokeStyle = w.color;
      ctx.lineWidth = w.lineWidth * w.life;
      ctx.beginPath();
      ctx.arc(w.x, w.y, w.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }
}

// ============= SCREEN FLASH =============
class ScreenFlash {
  alpha = 0;
  color = "#ffffff";

  trigger(color = "#ffffff", intensity = 0.3) {
    this.color = color;
    this.alpha = intensity;
  }

  update(dt: number) {
    if (this.alpha > 0) this.alpha = Math.max(0, this.alpha - dt * 4);
  }

  draw(ctx: CanvasRenderingContext2D, w: number, h: number) {
    if (this.alpha <= 0.001) return;
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = this.color;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
}

// ============= PARTICLE SYSTEM =============
interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; size: number;
  color: string; type: "spark" | "trail" | "burst" | "clear" | "star" | "ember" | "confetti";
  rotation: number; rotationSpeed: number;
}

class ParticleSystem {
  particles: Particle[] = [];
  static MAX_PARTICLES = 300;

  emit(x: number, y: number, color: string, count: number, type: Particle["type"] = "spark") {
    // Cap particle count to prevent memory explosion
    const available = ParticleSystem.MAX_PARTICLES - this.particles.length;
    count = Math.min(count, available);
    if (count <= 0) return;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = type === "burst" ? 4 + Math.random() * 8 :
                    type === "clear" ? 2.5 + Math.random() * 5 :
                    type === "star" ? 1 + Math.random() * 2 :
                    type === "ember" ? 0.5 + Math.random() * 1.5 :
                    type === "confetti" ? 3 + Math.random() * 6 :
                    1.5 + Math.random() * 3.5;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (type === "burst" ? 4 : type === "confetti" ? 5 : 0),
        life: 1, maxLife: 1,
        size: type === "burst" ? 5 + Math.random() * 10 :
              type === "clear" ? 4 + Math.random() * 7 :
              type === "star" ? 3 + Math.random() * 5 :
              type === "ember" ? 2 + Math.random() * 3 :
              type === "confetti" ? 4 + Math.random() * 6 :
              2 + Math.random() * 4,
        color, type,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.4,
      });
    }
  }

  emitTrail(x: number, y: number, color: string) {
    if (Math.random() > 0.4 || this.particles.length >= ParticleSystem.MAX_PARTICLES) return;
    this.particles.push({
      x: x + (Math.random() - 0.5) * 20,
      y: y + (Math.random() - 0.5) * 20,
      vx: (Math.random() - 0.5) * 0.5,
      vy: Math.random() * -1.5,
      life: 1, maxLife: 1,
      size: 2 + Math.random() * 4,
      color, type: "trail",
      rotation: 0, rotationSpeed: 0,
    });
  }

  update(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt * 60;
      p.y += p.vy * dt * 60;
      p.vy += (p.type === "ember" ? 0.05 : p.type === "confetti" ? 0.08 : 0.15) * dt * 60;
      p.rotation += p.rotationSpeed * dt * 60;
      const decay = p.type === "trail" ? 0.04 :
                    p.type === "clear" ? 0.025 :
                    p.type === "ember" ? 0.015 :
                    p.type === "star" ? 0.02 :
                    p.type === "confetti" ? 0.016 : 0.022;
      p.life -= decay * dt * 60;
      if (p.life <= 0) {
        // Swap-and-pop for O(1) removal instead of splice O(n)
        this.particles[i] = this.particles[this.particles.length - 1];
        this.particles.pop();
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = p.life * (p.type === "ember" ? 0.9 : 0.8);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);

      if (p.type === "star") {
        // 4-point star
        const s = p.size * p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2 - Math.PI / 2;
          const r = i % 2 === 0 ? s : s * 0.35;
          ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
          const a2 = ((i + 0.5) / 4) * Math.PI * 2 - Math.PI / 2;
          ctx.lineTo(Math.cos(a2) * s * 0.35, Math.sin(a2) * s * 0.35);
        }
        ctx.closePath();
        ctx.fill();
      } else if (p.type === "clear") {
        const s = p.size * p.life;
        ctx.fillStyle = p.color;
        ctx.fillRect(-s / 2, -s / 2, s, s);
      } else if (p.type === "confetti") {
        // Fluttering confetti rectangle with horizontal drift
        const s = p.size * p.life;
        ctx.fillStyle = p.color;
        const flutter = Math.sin(p.rotation * 3) * s * 0.3;
        ctx.translate(flutter, 0);
        ctx.scale(1, 0.3 + 0.7 * Math.abs(Math.sin(p.rotation * 2)));
        ctx.fillRect(-s / 2, -s / 4, s, s / 2);
      } else if (p.type === "ember") {
        // Glowing ember - use alpha fade instead of per-particle gradient
        const s = p.size * p.life;
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life * 0.9;
        ctx.beginPath();
        ctx.arc(0, 0, s, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = p.life * 0.4;
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(0, 0, p.size * p.life, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }
}

// ============= FLOATING TEXT =============
interface FloatingText {
  x: number; y: number; text: string; life: number; color: string; size: number;
}

class FloatingTextSystem {
  texts: FloatingText[] = [];

  add(x: number, y: number, text: string, color = "#ffffff", size = 24) {
    if (this.texts.length >= 30) this.texts.shift(); // Cap floating texts
    this.texts.push({ x, y, text, life: 1, color, size });
  }

  update(dt: number) {
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      t.y -= 40 * dt;
      t.life -= 0.015 * dt * 60;
      if (t.life <= 0) {
        this.texts[i] = this.texts[this.texts.length - 1];
        this.texts.pop();
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    for (const t of this.texts) {
      ctx.save();
      ctx.globalAlpha = t.life;
      const s = t.size * easeOutBack(Math.min(1, (1 - t.life) * 3 + 0.3));
      ctx.font = `700 ${s}px Fredoka, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      // Text outline for readability (double-stroke for stronger contrast)
      ctx.strokeStyle = "rgba(0,0,0,0.7)";
      ctx.lineWidth = 4;
      ctx.lineJoin = "round";
      ctx.strokeText(t.text, t.x, t.y);
      // Glow
      ctx.shadowColor = t.color;
      ctx.shadowBlur = 12;
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
      ctx.shadowBlur = 0;
      ctx.restore();
    }
  }
}

// ============= ANIMATION SYSTEM =============
interface GameAnimation {
  type: "place" | "clear" | "shake";
  x: number; y: number; progress: number; duration: number;
}

class AnimationSystem {
  animations: GameAnimation[] = [];
  screenShake = { x: 0, y: 0, intensity: 0 };

  addPlaceAnimation(x: number, y: number) {
    if (this.animations.length >= 200) return;
    this.animations.push({ type: "place", x, y, progress: 0, duration: 0.3 });
  }

  addClearAnimation(x: number, y: number, delay: number) {
    if (this.animations.length >= 200) return;
    this.animations.push({ type: "clear", x, y, progress: -delay, duration: 0.4 });
  }

  triggerScreenShake(reduced: boolean, intensity: number) {
    if (reduced) return;
    this.screenShake.intensity = Math.max(this.screenShake.intensity, intensity);
  }

  update(dt: number) {
    if (this.screenShake.intensity > 0) {
      this.screenShake.x = (Math.random() - 0.5) * this.screenShake.intensity * 12;
      this.screenShake.y = (Math.random() - 0.5) * this.screenShake.intensity * 12;
      this.screenShake.intensity *= 0.88;
      if (this.screenShake.intensity < 0.01) {
        this.screenShake.intensity = 0;
        this.screenShake.x = 0;
        this.screenShake.y = 0;
      }
    }
    for (let i = this.animations.length - 1; i >= 0; i--) {
      const a = this.animations[i];
      a.progress += dt / a.duration;
      if (a.progress >= 1) {
        this.animations[i] = this.animations[this.animations.length - 1];
        this.animations.pop();
      }
    }
  }

  getPlaceScale(x: number, y: number): number {
    for (const a of this.animations)
      if (a.type === "place" && a.x === x && a.y === y && a.progress >= 0)
        return easeOutBack(a.progress);
    return 1;
  }

  getClearState(x: number, y: number): { clearing: boolean; progress: number } {
    for (const a of this.animations)
      if (a.type === "clear" && a.x === x && a.y === y)
        return { clearing: true, progress: a.progress < 0 ? 0 : a.progress };
    return { clearing: false, progress: 0 };
  }
}

// ============= TYPES =============
interface BlockPiece {
  cells: [number, number][];
  colorIndex: number;
  x: number; y: number;
  scale: number; targetScale: number;
  entryProgress: number; // 0→1 for entrance animation
}

interface GameState {
  grid: (number | null)[][];
  blockQueue: BlockPiece[];
  score: number;
  highScore: number;
  linesCleared: number;
  blocksPlaced: number;
  combo: number;
  maxCombo: number;
  comboLeeway: number;
  gameOver: boolean;
  started: boolean;
  nextMilestone: number;
  gridFillPct: number;
  difficulty: number;
  totalClears: number;
  lastClearTime: number;
  rapidFireCount: number;
  streakMultiplier: number;
}

// ============= AUDIO MANAGER =============
class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private currentMusicSource: AudioBufferSourceNode | null = null;
  private initialized = false;
  private menuMusicBuffer: AudioBuffer | null = null;
  private gameMusicBuffer: AudioBuffer | null = null;
  private gameOverMusicBuffer: AudioBuffer | null = null;
  private buffersLoaded = false;
  private pendingMusic: "menu" | "game" | "gameover" | null = null;
  private megaClearNoiseBuffer: AudioBuffer | null = null;

  init(): void {
    if (this.initialized) return;
    try {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      // Resume suspended AudioContext (required by mobile browsers)
      if (this.ctx.state === "suspended") {
        this.ctx.resume();
      }
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.5;
      this.masterGain.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.4;
      this.musicGain.connect(this.masterGain);
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.6;
      this.sfxGain.connect(this.masterGain);
      this.initialized = true;
      this.loadMusicBuffers();
    } catch {}
  }

  ensureResumed(): void {
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  private async loadMusicBuffers(): Promise<void> {
    if (!this.ctx || this.buffersLoaded) return;
    try {
      const [menuR, gameR, overR] = await Promise.all([
        fetch("https://assets.oasiz.ai/audio/menu-music.wav"),
        fetch("https://assets.oasiz.ai/audio/game-music.mp3"),
        fetch("https://assets.oasiz.ai/audio/gameover-music.wav"),
      ]);
      const [menuD, gameD, overD] = await Promise.all([menuR.arrayBuffer(), gameR.arrayBuffer(), overR.arrayBuffer()]);
      const [mb, gb, ob] = await Promise.all([
        this.ctx.decodeAudioData(menuD),
        this.ctx.decodeAudioData(gameD),
        this.ctx.decodeAudioData(overD),
      ]);
      this.menuMusicBuffer = mb;
      this.gameMusicBuffer = gb;
      this.gameOverMusicBuffer = ob;
      this.buffersLoaded = true;
      if (this.pendingMusic === "menu") this.playMenuMusic();
      else if (this.pendingMusic === "game") this.playGameMusic();
      else if (this.pendingMusic === "gameover") this.playGameOverMusic();
      this.pendingMusic = null;
    } catch {}
  }

  private createOsc(freq: number, type: OscillatorType = "sine", filterNode?: BiquadFilterNode): OscillatorNode {
    const o = this.ctx!.createOscillator(); o.type = type; o.frequency.value = freq;
    o.onended = () => { try { o.disconnect(); if (filterNode) filterNode.disconnect(); } catch {} };
    return o;
  }
  private createGainNode(v: number): GainNode {
    const g = this.ctx!.createGain(); g.gain.value = v; return g;
  }

  stopMusic(): void {
    if (this.currentMusicSource) {
      // Fade out over 300ms instead of abrupt stop
      if (this.ctx && this.musicGain) {
        try {
          this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, this.ctx.currentTime);
          this.musicGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.3);
          const src = this.currentMusicSource;
          setTimeout(() => { try { src.stop(); src.disconnect(); } catch {} }, 350);
        } catch { try { this.currentMusicSource.stop(); this.currentMusicSource.disconnect(); } catch {} }
      } else {
        try { this.currentMusicSource.stop(); this.currentMusicSource.disconnect(); } catch {}
      }
      this.currentMusicSource = null;
    }
  }

  private playBuffer(buf: AudioBuffer | null, loop = true, speed = 1): void {
    if (!this.ctx || !this.musicGain || !buf) return;
    this.stopMusic();
    // Fade in over 300ms
    this.musicGain.gain.setValueAtTime(0, this.ctx.currentTime);
    this.musicGain.gain.linearRampToValueAtTime(0.4, this.ctx.currentTime + 0.5);
    const s = this.ctx.createBufferSource();
    s.buffer = buf; s.loop = loop;
    s.playbackRate.value = speed;
    s.connect(this.musicGain); s.start(0);
    this.currentMusicSource = s;
  }

  playMenuMusic(): void {
    if (!this.buffersLoaded) { this.pendingMusic = "menu"; return; }
    this.pendingMusic = null; this.playBuffer(this.menuMusicBuffer, true);
  }
  playGameMusic(speedMult = 1): void {
    if (!this.buffersLoaded) { this.pendingMusic = "game"; return; }
    this.pendingMusic = null; this.playBuffer(this.gameMusicBuffer, true, speedMult);
  }

  setMusicSpeed(speed: number): void {
    if (this.currentMusicSource) {
      this.currentMusicSource.playbackRate.value = clamp(speed, 0.8, 1.3);
    }
  }
  playGameOverMusic(): void {
    if (!this.buffersLoaded) { this.pendingMusic = "gameover"; return; }
    this.pendingMusic = null; this.playBuffer(this.gameOverMusicBuffer, false);
  }

  playPlaceSound(): void {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const o = this.createOsc(400, "sine");
    const g = this.createGainNode(0.3);
    o.connect(g); g.connect(this.sfxGain);
    o.frequency.setValueAtTime(400, now);
    o.frequency.exponentialRampToValueAtTime(200, now + 0.1);
    g.gain.setValueAtTime(0.3, now);
    g.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    o.start(now); o.stop(now + 0.15);
  }

  playClearSound(lines: number): void {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const freq = 300 + lines * 100;
    const f = this.ctx.createBiquadFilter();
    f.type = "lowpass"; f.frequency.value = 2000;
    const o = this.createOsc(freq, "sawtooth", f);
    const g = this.createGainNode(0.2);
    o.connect(f); f.connect(g); g.connect(this.sfxGain);
    o.frequency.setValueAtTime(freq, now);
    o.frequency.exponentialRampToValueAtTime(freq * 2, now + 0.2);
    f.frequency.setValueAtTime(500, now);
    f.frequency.exponentialRampToValueAtTime(4000, now + 0.15);
    g.gain.setValueAtTime(0.2, now);
    g.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    o.start(now); o.stop(now + 0.35);

    // Whoosh for multi-line clears
    if (lines >= 2) {
      const noise = this.ctx.createBufferSource();
      const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.15, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.05));
      noise.buffer = buf;
      const nf = this.ctx.createBiquadFilter();
      nf.type = "highpass"; nf.frequency.value = 2000 + lines * 500;
      const ng = this.createGainNode(0.08 + lines * 0.03);
      noise.connect(nf); nf.connect(ng); ng.connect(this.sfxGain);
      ng.gain.setValueAtTime(0.08, now);
      ng.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      noise.onended = () => { try { noise.disconnect(); nf.disconnect(); ng.disconnect(); } catch {} };
      noise.start(now); noise.stop(now + 0.2);
    }
  }

  playComboSound(streak: number): void {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    if (streak >= 4) { this.playMegaClearSound(); return; }
    const notes = streak === 2 ? [0, 4, 7] : [0, 4, 7, 12];
    notes.forEach((semi, i) => {
      const freq = 440 * Math.pow(2, semi / 12);
      const f = this.ctx!.createBiquadFilter();
      f.type = "lowpass"; f.frequency.value = 3000;
      const o = this.createOsc(freq, "square", f);
      const g = this.createGainNode(0.15);
      o.connect(f); f.connect(g); g.connect(this.sfxGain!);
      const t = now + i * 0.08;
      g.gain.setValueAtTime(0.15, t);
      g.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
      o.start(t); o.stop(t + 0.2);
    });
  }

  private playMegaClearSound(): void {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    if (!this.megaClearNoiseBuffer) {
      const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.5, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.1));
      this.megaClearNoiseBuffer = buf;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.megaClearNoiseBuffer;
    const nf = this.ctx.createBiquadFilter();
    nf.type = "bandpass"; nf.frequency.value = 1000; nf.Q.value = 0.5;
    const ng = this.createGainNode(0.3);
    noise.connect(nf); nf.connect(ng); ng.connect(this.sfxGain);
    ng.gain.setValueAtTime(0.3, now);
    ng.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
    noise.onended = () => { try { noise.disconnect(); nf.disconnect(); ng.disconnect(); } catch {} };
    noise.start(now); noise.stop(now + 0.5);
    [523.25, 659.25, 783.99, 1046.5].forEach(freq => {
      const o = this.createOsc(freq, "triangle");
      const g = this.createGainNode(0.12);
      o.connect(g); g.connect(this.sfxGain!);
      g.gain.setValueAtTime(0.12, now);
      g.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
      o.start(now); o.stop(now + 0.55);
    });
  }

  playGameOverSound(): void {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const f = this.ctx.createBiquadFilter();
    f.type = "lowpass"; f.frequency.value = 1500;
    const o = this.createOsc(400, "sawtooth", f);
    const g = this.createGainNode(0.2);
    o.connect(f); f.connect(g); g.connect(this.sfxGain);
    o.frequency.setValueAtTime(400, now);
    o.frequency.exponentialRampToValueAtTime(100, now + 0.8);
    f.frequency.setValueAtTime(1500, now);
    f.frequency.exponentialRampToValueAtTime(200, now + 0.6);
    g.gain.setValueAtTime(0.2, now);
    g.gain.linearRampToValueAtTime(0.15, now + 0.3);
    g.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
    o.start(now); o.stop(now + 1);
  }

  playPerfectClearSound(): void {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    // Ascending major scale fanfare
    const notes = [523.25, 587.33, 659.25, 698.46, 783.99, 880.0, 987.77, 1046.5];
    notes.forEach((freq, i) => {
      const o = this.createOsc(freq, "triangle");
      const g = this.createGainNode(0.18);
      o.connect(g); g.connect(this.sfxGain!);
      const t = now + i * 0.06;
      g.gain.setValueAtTime(0.18, t);
      g.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
      o.start(t); o.stop(t + 0.35);
    });
  }

  playMilestoneSound(): void {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      const o = this.createOsc(freq, "sine");
      const g = this.createGainNode(0.2);
      o.connect(g); g.connect(this.sfxGain!);
      const t = now + i * 0.12;
      g.gain.setValueAtTime(0.2, t);
      g.gain.exponentialRampToValueAtTime(0.01, t + 0.25);
      o.start(t); o.stop(t + 0.3);
    });
  }

  playPickupSound(): void {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const o = this.createOsc(600, "sine");
    const g = this.createGainNode(0.15);
    o.connect(g); g.connect(this.sfxGain);
    o.frequency.setValueAtTime(600, now);
    o.frequency.exponentialRampToValueAtTime(900, now + 0.06);
    g.gain.setValueAtTime(0.15, now);
    g.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
    o.start(now); o.stop(now + 0.1);
  }

  playInvalidSound(): void {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const f = this.ctx.createBiquadFilter();
    f.type = "lowpass"; f.frequency.value = 800;
    const o = this.createOsc(200, "square", f);
    const g = this.createGainNode(0.08);
    o.connect(f); f.connect(g); g.connect(this.sfxGain);
    o.frequency.setValueAtTime(200, now);
    o.frequency.exponentialRampToValueAtTime(120, now + 0.12);
    g.gain.setValueAtTime(0.08, now);
    g.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    o.start(now); o.stop(now + 0.18);
  }

  playLevelUpSound(): void {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    // Rising power chord
    const chords = [
      [261.63, 329.63, 392.0],  // C major
      [329.63, 415.30, 523.25], // E major
      [392.0, 493.88, 587.33],  // G-B-D
      [523.25, 659.25, 783.99], // C5 major
    ];
    chords.forEach((chord, ci) => {
      chord.forEach(freq => {
        const o = this.createOsc(freq, "triangle");
        const g = this.createGainNode(0.1);
        o.connect(g); g.connect(this.sfxGain!);
        const t = now + ci * 0.12;
        g.gain.setValueAtTime(0.1, t);
        g.gain.exponentialRampToValueAtTime(0.01, t + 0.25);
        o.start(t); o.stop(t + 0.3);
      });
    });
  }

  playRapidFireSound(): void {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    [880, 1100, 1320, 1560].forEach((freq, i) => {
      const o = this.createOsc(freq, "triangle");
      const g = this.createGainNode(0.12);
      o.connect(g); g.connect(this.sfxGain!);
      const t = now + i * 0.04;
      g.gain.setValueAtTime(0.12, t);
      g.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
      o.start(t); o.stop(t + 0.12);
    });
  }
}

// ============= MAIN GAME CLASS =============
class BlockBlastGame {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  // Systems
  particles: ParticleSystem;
  floatingText: FloatingTextSystem;
  animations: AnimationSystem;
  audio: AudioManager;
  ambient: AmbientSystem;
  shockwaves: ShockwaveSystem;
  flash: ScreenFlash;

  // State
  state: GameState;
  cellSize = 0;
  gridOffsetX = 0;
  gridOffsetY = 0;
  queueY = 0;
  queueCellSize = 0;

  // Background cache
  private cachedBgGradient: CanvasGradient | null = null;
  private cachedBgDifficulty = -1;
  private cachedBgWidth = 0;
  private cachedBgHeight = 0;
  private smoothDifficulty = 0;
  private cachedVignette: CanvasGradient | null = null;
  private cachedVigW = 0;
  private cachedVigH = 0;
  private cachedCellShadow: CanvasGradient | null = null;
  private cachedCellShadowSize = 0;

  // Drag
  draggedPiece: BlockPiece | null = null;
  draggedPieceIndex = -1;
  dragOffset = { x: 0, y: 0 };
  dragPos = { x: 0, y: 0 };
  dragTrail: { x: number; y: number }[] = [];
  ghostPos: { gridX: number; gridY: number } | null = null;
  isValidPlacement = false;
  private completionRows: number[] = [];
  private completionCols: number[] = [];
  private lastGhostKey = "";

  // Timing
  lastTime = 0;
  gameTime = 0;
  isMobile: boolean;
  reducedMotion: boolean;
  comboHideTimeout = 0;
  displayScore = 0;
  lastPointerTime = 0;
  newHighScoreShown = false;
  gridPulse = 0; // 0-1, triggered on clears
  timeScale = 1; // For slow-mo effects

  // Keyboard navigation
  kbPieceIdx = -1; // Selected queue piece (-1 = none)
  kbGridX = 3; // Cursor position on grid
  kbGridY = 3;
  kbInvalidFlash = 0; // Brief red flash timer

  // Row/col fill counts (for almost-full indicators)
  rowFill: number[] = new Array(CONFIG.GRID_SIZE).fill(0);
  colFill: number[] = new Array(CONFIG.GRID_SIZE).fill(0);

  constructor() {
    this.canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
    this.ctx = this.canvas.getContext("2d")!;

    this.particles = new ParticleSystem();
    this.floatingText = new FloatingTextSystem();
    this.animations = new AnimationSystem();
    this.audio = new AudioManager();
    this.ambient = new AmbientSystem();
    this.shockwaves = new ShockwaveSystem();
    this.flash = new ScreenFlash();

    this.isMobile = window.matchMedia("(pointer: coarse)").matches;
    this.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.state = this.createInitialState();
    this.setupEventListeners();
    this.resizeCanvas();

    window.addEventListener("resize", () => this.resizeCanvas());

    // Show best score on start screen
    const hs = this.loadHighScore();
    if (hs > 0) {
      const bestEl = document.getElementById("startBestScore");
      const bestVal = document.getElementById("startBestValue");
      if (bestEl) bestEl.style.display = "block";
      if (bestVal) bestVal.textContent = hs.toString();
    }

    // Pause/resume when app goes to background
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && this.state.started && !this.state.gameOver) {
        this.audio.stopMusic();
      } else if (!document.hidden && this.state.started && !this.state.gameOver) {
        this.audio.playGameMusic();
      }
    });

    requestAnimationFrame((t) => this.gameLoop(t));
  }

  createInitialState(): GameState {
    const grid: (number | null)[][] = [];
    for (let y = 0; y < CONFIG.GRID_SIZE; y++) {
      grid[y] = [];
      for (let x = 0; x < CONFIG.GRID_SIZE; x++) grid[y][x] = null;
    }
    return {
      grid, blockQueue: [], score: 0, highScore: this.loadHighScore(),
      linesCleared: 0, blocksPlaced: 0, combo: 0, maxCombo: 0, comboLeeway: 0,
      gameOver: false, started: false,
      nextMilestone: CONFIG.MILESTONE_INTERVAL,
      gridFillPct: 0,
      difficulty: 0, totalClears: 0, lastClearTime: 0, rapidFireCount: 0,
      streakMultiplier: 1,
    };
  }

  loadHighScore(): number {
    try { return parseInt(localStorage.getItem("blockblast_highscore") || "0", 10); }
    catch { return 0; }
  }
  saveHighScore(s: number): void {
    try { localStorage.setItem("blockblast_highscore", s.toString()); } catch {}
  }

  resizeCanvas(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2); // Cap at 2x for performance
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width = w + "px";
    this.canvas.style.height = h + "px";
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.calculateLayout();
    this.ambient.init(w, h);
  }

  calculateLayout(): void {
    const w = window.innerWidth, h = window.innerHeight;
    const topSafe = this.isMobile ? 60 : 0;
    const isLandscape = w > h * 1.2;
    const hudH = this.isMobile ? (isLandscape ? 80 : 130) : Math.max(90, h * 0.1);

    if (this.isMobile) {
      const qH = isLandscape ? 0 : 150; // In landscape, queue is conceptually to the side
      const maxGW = isLandscape ? h * 0.8 : w * 0.95;
      const avail = isLandscape ? h - topSafe - 40 : h - topSafe - hudH - qH;
      this.cellSize = Math.min(maxGW / CONFIG.GRID_SIZE, avail * 0.95 / CONFIG.GRID_SIZE);
      const gw = this.cellSize * CONFIG.GRID_SIZE;
      this.gridOffsetX = isLandscape ? (w * 0.45 - gw / 2) : (w - gw) / 2;
      this.gridOffsetY = isLandscape ? (h - gw) / 2 : topSafe + hudH;
      this.queueY = isLandscape ? (h - gw) / 2 : this.gridOffsetY + gw + 20;
      this.queueCellSize = Math.min(this.cellSize * 0.55, 32);
    } else {
      const tqcs = 38;
      const totalQH = 80 + 5 * tqcs;
      const maxGW = Math.min(w * 0.85, 700);
      const avail = h - hudH - totalQH;
      this.cellSize = Math.min(maxGW / CONFIG.GRID_SIZE, avail / CONFIG.GRID_SIZE);
      const gw = this.cellSize * CONFIG.GRID_SIZE;
      this.gridOffsetX = (w - gw) / 2;
      this.gridOffsetY = hudH;
      this.queueY = this.gridOffsetY + gw + 20;
      this.queueCellSize = tqcs;
    }
  }

  setupEventListeners(): void {
    document.getElementById("startButton")?.addEventListener("click", () => this.startGame());
    document.getElementById("restartButton")?.addEventListener("click", () => this.startGame());

    this.canvas.addEventListener("mousedown", (e) => this.onPointerDown(e.clientX, e.clientY));
    this.canvas.addEventListener("mousemove", (e) => this.onPointerMove(e.clientX, e.clientY));
    this.canvas.addEventListener("mouseup", () => this.onPointerUp());
    this.canvas.addEventListener("mouseleave", () => this.onPointerUp());

    this.canvas.addEventListener("touchstart", (e) => {
      e.preventDefault();
      this.onPointerDown(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: false });
    this.canvas.addEventListener("touchmove", (e) => {
      e.preventDefault();
      this.onPointerMove(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: false });
    this.canvas.addEventListener("touchend", (e) => {
      e.preventDefault(); this.onPointerUp();
    }, { passive: false });
    this.canvas.addEventListener("touchcancel", () => this.onPointerUp());

    // Keyboard navigation for accessibility
    document.addEventListener("keydown", (e) => this.onKeyDown(e));
  }

  startGame(): void {
    this.audio.init();
    this.audio.ensureResumed();
    this.audio.stopMusic();
    this.audio.playGameMusic();

    this.state = this.createInitialState();
    this.state.started = true;
    this.state.highScore = this.loadHighScore();
    this.displayScore = 0;
    this.newHighScoreShown = false;
    this.updateScoreDisplay();

    // Clean up previous game effects
    this.particles.particles.length = 0;
    this.floatingText.texts.length = 0;
    this.animations.animations.length = 0;
    this.animations.screenShake = { x: 0, y: 0, intensity: 0 };
    this.shockwaves.waves.length = 0;
    this.flash.alpha = 0;
    this.kbPieceIdx = -1;
    this.kbGridX = 3;
    this.kbGridY = 3;
    this.timeScale = 1;

    this.refillBlockQueue();
    this.updateFillCounts();
    this.gridPulse = 0.5; // Entrance bounce
    // Game start celebration
    const gcx = this.gridOffsetX + (CONFIG.GRID_SIZE / 2) * this.cellSize;
    const gcy = this.gridOffsetY + (CONFIG.GRID_SIZE / 2) * this.cellSize;
    this.particles.emit(gcx, gcy, "#8B5CF6", 12, "star");
    this.particles.emit(gcx, gcy, "#EC4899", 8, "burst");
    this.shockwaves.emit(gcx, gcy, this.cellSize * CONFIG.GRID_SIZE * 0.5, "#8B5CF6", 2);

    document.getElementById("startScreen")?.classList.add("hidden");
    document.getElementById("gameOverScreen")?.classList.add("hidden");
    document.getElementById("hud")!.style.display = "flex";
    this.updateHUD();
    triggerHaptic("medium");
  }

  getDifficultyLevel(): number {
    const steps = CONFIG.DIFFICULTY_SCORE_STEPS;
    let level = 0;
    for (const threshold of steps) {
      if (this.state.score >= threshold) level++;
      else break;
    }
    return Math.min(level, CONFIG.DIFFICULTY_EASY_WEIGHT_MULT.length - 1);
  }

  getAdjustedShapes(): { cells: [number, number][]; weight: number }[] {
    const d = this.getDifficultyLevel();
    const easyMult = CONFIG.DIFFICULTY_EASY_WEIGHT_MULT[d];
    const hardMult = CONFIG.DIFFICULTY_HARD_WEIGHT_MULT[d];
    return BLOCK_SHAPES.map(s => {
      const cellCount = s.cells.length;
      // 1-2 cells = easy, 4-5 cells = hard, 3 cells = medium
      const mult = cellCount <= 2 ? easyMult : cellCount >= 4 ? hardMult : 1;
      return { cells: s.cells, weight: Math.max(0.1, s.weight * mult) };
    });
  }

  refillBlockQueue(): void {
    const adjustedShapes = this.getAdjustedShapes();
    while (this.state.blockQueue.length < CONFIG.BLOCK_QUEUE_SIZE) {
      const shape = weightedRandom(adjustedShapes);
      const ci = Math.floor(Math.random() * CONFIG.BLOCK_COLORS.length);
      const staggerDelay = this.state.blockQueue.length * 0.15; // stagger 150ms each
      this.state.blockQueue.push({
        cells: shape.cells.map(c => [...c] as [number, number]),
        colorIndex: ci, x: 0, y: 0, scale: 0, targetScale: 1,
        entryProgress: -staggerDelay, // negative = delayed start
      });
    }
    this.positionQueuePieces();
  }

  positionQueuePieces(): void {
    const w = window.innerWidth, h = window.innerHeight;
    const isLandscape = w > h * 1.2 && this.isMobile;
    const pws: number[] = [], phs: number[] = [];
    for (const p of this.state.blockQueue) {
      const b = this.getPieceBounds(p);
      pws.push((b.maxX - b.minX + 1) * this.queueCellSize);
      phs.push((b.maxY - b.minY + 1) * this.queueCellSize);
    }
    if (isLandscape) {
      // Landscape: stack pieces vertically to the right of the grid
      const gw = this.cellSize * CONFIG.GRID_SIZE;
      const gridRight = this.gridOffsetX + gw;
      const queueCenterX = gridRight + (w - gridRight) / 2;
      const gap = 20;
      const totalH = phs.reduce((s, ph) => s + ph, 0) + gap * (phs.length - 1);
      let cy = (h - totalH) / 2;
      for (let i = 0; i < this.state.blockQueue.length; i++) {
        this.state.blockQueue[i].x = queueCenterX - pws[i] / 2;
        this.state.blockQueue[i].y = cy;
        cy += phs[i] + gap;
      }
    } else {
      const top = this.queueY + 40;
      const gap = this.isMobile ? 25 : 50;
      const total = pws.reduce((s, pw) => s + pw, 0) + gap * (pws.length - 1);
      let cx = (w - total) / 2;
      const maxH = 5 * this.queueCellSize;
      for (let i = 0; i < this.state.blockQueue.length; i++) {
        this.state.blockQueue[i].x = cx;
        this.state.blockQueue[i].y = top + (maxH - phs[i]) / 2;
        cx += pws[i] + gap;
      }
    }
  }

  getPieceBounds(p: BlockPiece) {
    let mnX = Infinity, mxX = -Infinity, mnY = Infinity, mxY = -Infinity;
    for (const [cx, cy] of p.cells) {
      mnX = Math.min(mnX, cx); mxX = Math.max(mxX, cx);
      mnY = Math.min(mnY, cy); mxY = Math.max(mxY, cy);
    }
    return { minX: mnX, maxX: mxX, minY: mnY, maxY: mxY };
  }

  updateFillCounts(): void {
    this.rowFill.fill(0);
    this.colFill.fill(0);
    let filled = 0;
    for (let y = 0; y < CONFIG.GRID_SIZE; y++) {
      for (let x = 0; x < CONFIG.GRID_SIZE; x++) {
        if (this.state.grid[y][x] !== null) {
          this.rowFill[y]++;
          this.colFill[x]++;
          filled++;
        }
      }
    }
    this.state.gridFillPct = filled / (CONFIG.GRID_SIZE * CONFIG.GRID_SIZE);
  }

  onPointerDown(x: number, y: number): void {
    if (!this.state.started || this.state.gameOver) return;
    this.audio.ensureResumed(); // Resume AudioContext on any user gesture
    // Debounce rapid taps (50ms cooldown)
    const now = performance.now();
    if (now - this.lastPointerTime < 50) return;
    this.lastPointerTime = now;
    for (let i = 0; i < this.state.blockQueue.length; i++) {
      const p = this.state.blockQueue[i];
      const b = this.getPieceBounds(p);
      const pw = (b.maxX - b.minX + 1) * this.queueCellSize;
      const ph = (b.maxY - b.minY + 1) * this.queueCellSize;
      const pad = this.isMobile ? 30 : 20;
      if (x >= p.x - pad && x <= p.x + pw + pad && y >= p.y - pad && y <= p.y + ph + pad) {
        this.draggedPiece = p;
        this.draggedPieceIndex = i;
        this.dragOffset = { x: x - p.x - pw / 2, y: y - p.y - ph / 2 };
        this.dragPos = { x, y };
        // Press-then-lift animation: briefly shrink before enlarging
        p.scale = 0.85;
        p.targetScale = 1.2;
        this.audio.playPickupSound();
        triggerHaptic("light");
        break;
      }
    }
  }

  onPointerMove(x: number, y: number): void {
    if (!this.draggedPiece) return;
    this.dragPos = { x, y };
    this.dragTrail.push({ x, y });
    if (this.dragTrail.length > 8) this.dragTrail.shift();
    const color = CONFIG.BLOCK_COLORS[this.draggedPiece.colorIndex];
    this.particles.emitTrail(x, y, color.glow);
    const offset = this.isMobile ? Math.min(120, window.innerHeight * 0.12) : 30;
    const cx = x, cy = y - offset;
    const b = this.getPieceBounds(this.draggedPiece);
    const pcx = (b.maxX + b.minX) / 2, pcy = (b.maxY + b.minY) / 2;
    const gx = Math.floor((cx - this.gridOffsetX) / this.cellSize - pcx + 0.5);
    const gy = Math.floor((cy - this.gridOffsetY) / this.cellSize - pcy + 0.5);
    this.ghostPos = { gridX: gx, gridY: gy };
    this.isValidPlacement = this.canPlacePiece(this.draggedPiece, gx, gy);

    // Pre-compute completion highlight (only when ghost position changes)
    const ghostKey = `${gx},${gy},${this.isValidPlacement}`;
    if (ghostKey !== this.lastGhostKey) {
      this.lastGhostKey = ghostKey;
      this.completionRows = [];
      this.completionCols = [];
      if (this.isValidPlacement && this.draggedPiece) {
        const simGrid: (number | null)[][] = this.state.grid.map(row => [...row]);
        for (const [cx, cy] of this.draggedPiece.cells) {
          simGrid[gy + cy][gx + cx] = this.draggedPiece.colorIndex;
        }
        for (let y = 0; y < CONFIG.GRID_SIZE; y++) {
          if (simGrid[y].every(c => c !== null)) this.completionRows.push(y);
        }
        for (let x = 0; x < CONFIG.GRID_SIZE; x++) {
          let full = true;
          for (let y = 0; y < CONFIG.GRID_SIZE; y++) if (simGrid[y][x] === null) { full = false; break; }
          if (full) this.completionCols.push(x);
        }
      }
    }
  }

  onPointerUp(): void {
    if (!this.draggedPiece) return;

    if (this.isValidPlacement && this.ghostPos) {
      this.placePiece(this.draggedPiece, this.ghostPos.gridX, this.ghostPos.gridY);
      this.state.blockQueue.splice(this.draggedPieceIndex, 1);
      this.state.blocksPlaced++;
      this.audio.playPlaceSound();
      triggerHaptic("light");

      const cleared = this.checkAndClearLines();

      if (cleared > 0) {
        this.state.combo++;
        this.state.comboLeeway = 2;
        this.updateComboPips();
        this.state.totalClears += cleared;
        this.state.maxCombo = Math.max(this.state.maxCombo, this.state.combo);
        this.audio.playClearSound(cleared);
        if (this.state.combo >= 2) setTimeout(() => this.audio.playComboSound(this.state.combo), 150);

        // Rapid-fire detection: clears within 2 seconds of each other
        const now = performance.now() / 1000;
        if (now - this.state.lastClearTime < 2) {
          this.state.rapidFireCount++;
        } else {
          this.state.rapidFireCount = 1;
        }
        this.state.lastClearTime = now;

        // Enhanced scoring with streak, rapid-fire, and difficulty bonuses
        const base = cleared * 100;
        const multiLineBonus = cleared > 1 ? (cleared - 1) * 50 : 0;
        const streakIdx = Math.min(this.state.combo, CONFIG.STREAK_BONUS_MULT.length - 1);
        const streakMul = 1 + CONFIG.STREAK_BONUS_MULT[streakIdx];
        const rapidMul = this.state.rapidFireCount > 1 ? 1 + this.state.rapidFireCount * 0.1 : 1;
        const diffBonus = 1 + this.getDifficultyLevel() * 0.1;
        const score = Math.floor((base + multiLineBonus) * streakMul * rapidMul * diffBonus);
        this.state.score += score;
        this.state.linesCleared += cleared;
        this.state.streakMultiplier = streakMul * rapidMul;

        const cx = this.gridOffsetX + (CONFIG.GRID_SIZE / 2) * this.cellSize;
        const cy = this.gridOffsetY + (CONFIG.GRID_SIZE / 2) * this.cellSize;

        // Update difficulty level — detect level-ups
        const prevDiff = this.state.difficulty;
        this.state.difficulty = this.getDifficultyLevel();
        if (this.state.difficulty > prevDiff) {
          this.floatingText.add(cx, cy - 60, "LEVEL UP!", "#00eeff", 34);
          this.floatingText.add(cx, cy - 25, "Level " + (this.state.difficulty + 1), "#88ddff", 22);
          this.particles.emit(cx, cy, "#00eeff", 20, "star");
          this.particles.emit(cx, cy, "#ffffff", 10, "confetti");
          this.shockwaves.emit(cx, cy, this.cellSize * CONFIG.GRID_SIZE * 0.8, "#00eeff", 3);
          this.flash.trigger("#00eeff", 0.12);
          this.audio.playLevelUpSound();
          // Speed up music slightly with each level
          this.audio.setMusicSpeed(1 + this.state.difficulty * 0.03);
          triggerHaptic("success");
        }

        // First clear celebration
        if (this.state.totalClears === cleared) {
          this.floatingText.add(cx, cy - 40, "FIRST CLEAR!", "#88ffcc", 26);
        }

        // Score popup at the piece placement location with random offset to prevent stacking
        const placeCx = this.gridOffsetX + (this.ghostPos!.gridX + 0.5) * this.cellSize + (Math.random() - 0.5) * 30;
        const placeCy = this.gridOffsetY + (this.ghostPos!.gridY + 0.5) * this.cellSize + (Math.random() - 0.5) * 20;
        this.showClearType(cleared, this.state.combo);
        const scoreColor = score >= 400 ? "#ffd700" : score >= 200 ? "#ffffff" : "#a0d8ff";
        const scoreSize = score >= 400 ? 34 : score >= 200 ? 28 : 24;
        this.floatingText.add(placeCx, placeCy, "+" + score, scoreColor, scoreSize);
        // Score trail particles fly upward toward HUD
        const trailCount = Math.min(5, Math.ceil(score / 150));
        for (let ti = 0; ti < trailCount; ti++) {
          setTimeout(() => this.particles.emit(placeCx + (Math.random() - 0.5) * 20, placeCy, scoreColor, 1, "trail"), ti * 40);
        }

        // Show multiplier if significant
        if (streakMul * rapidMul > 1.3) {
          const multText = "x" + (streakMul * rapidMul).toFixed(1);
          this.floatingText.add(cx + 60, cy + 70, multText, "#ff44ff", 22);
        }

        // Confetti for high combos
        if (this.state.combo >= 3) {
          const confettiColors = ["#ff6b6b", "#ffd43b", "#51cf66", "#339af0", "#cc5de8", "#ffa94d"];
          for (const cc of confettiColors) {
            this.particles.emit(cx, cy, cc, 3, "confetti");
          }
        }

        // Rapid-fire celebration
        if (this.state.rapidFireCount >= 3) {
          this.floatingText.add(cx, cy - 20, "RAPID FIRE!", "#ff6600", 30);
          this.particles.emit(cx, cy, "#ff6600", 15, "ember");
          this.audio.playRapidFireSound();
          triggerHaptic("heavy");
        }

        this.animations.triggerScreenShake(this.reducedMotion,0.2 + cleared * 0.15);

        // Shockwave
        this.shockwaves.emit(cx, cy, this.cellSize * CONFIG.GRID_SIZE * 0.6, "#ffd700", 2 + cleared);
        this.flash.trigger("#ffffff", 0.08 + cleared * 0.04);
        triggerHaptic(cleared >= 3 || this.state.combo >= 3 ? "heavy" : cleared >= 2 ? "medium" : "light");

        // Check clears and fill
        const prevFill = this.state.gridFillPct;
        this.updateFillCounts();

        // "Close call" — cleared lines when grid was nearly full
        if (prevFill > 0.80 && this.state.gridFillPct < prevFill - 0.1) {
          this.floatingText.add(cx, cy + 100, "CLUTCH!", "#00ff88", 26);
          this.particles.emit(cx, cy, "#00ff88", 10, "star");
        }

        // Perfect clear (grid completely empty)
        if (this.state.gridFillPct === 0) {
          const bonus = 500 + this.getDifficultyLevel() * 100;
          this.state.score += bonus;
          this.floatingText.add(cx, cy - 30, "PERFECT CLEAR!", "#00ffcc", 36);
          this.floatingText.add(cx, cy + 80, "+" + bonus, "#00ffcc", 32);
          this.particles.emit(cx, cy, "#00ffcc", 30, "star");
          this.particles.emit(cx, cy, "#ffd700", 20, "burst");
          this.shockwaves.emit(cx, cy, this.cellSize * CONFIG.GRID_SIZE, "#00ffcc", 4);
          this.flash.trigger("#00ffcc", 0.15);
          this.animations.triggerScreenShake(this.reducedMotion,0.8);
          this.audio.playPerfectClearSound();
          triggerHaptic("success");
        }

        // New high score detection (mid-game)
        if (!this.newHighScoreShown && this.state.highScore > 0 && this.state.score > this.state.highScore) {
          this.newHighScoreShown = true;
          this.floatingText.add(cx, cy - 100, "NEW BEST!", "#ffd700", 36);
          this.particles.emit(cx, cy, "#ffd700", 25, "confetti");
          this.particles.emit(cx, cy, "#ffffff", 10, "star");
          this.shockwaves.emit(cx, cy, this.cellSize * CONFIG.GRID_SIZE, "#ffd700", 4);
          this.flash.trigger("#ffd700", 0.15);
          this.audio.playPerfectClearSound();
          triggerHaptic("success");
        }

        // Milestone check
        if (this.state.score >= this.state.nextMilestone) {
          this.state.nextMilestone += CONFIG.MILESTONE_INTERVAL;
          this.floatingText.add(cx, cy - 70, this.state.score.toLocaleString() + "!", "#ff6bff", 32);
          this.particles.emit(cx, cy, "#ff6bff", 15, "star");
          this.audio.playMilestoneSound();
          triggerHaptic("success");
        }
      } else {
        if (this.state.combo > 0) {
          this.state.comboLeeway--;
          this.updateComboPips();
          if (this.state.comboLeeway <= 0) { this.hideCombo(); this.state.combo = 0; this.state.streakMultiplier = 1; }
        }
      }

      this.updateFillCounts();

      if (this.state.blockQueue.length === 0) this.refillBlockQueue();
      else this.positionQueuePieces();

      const delay = cleared > 0 ? 150 : 0;
      setTimeout(() => {
        if (!this.state.gameOver && this.state.started && this.checkGameOver()) this.endGame();
      }, delay);
      this.updateHUD();
    } else {
      // Snap back with subtle feedback if near grid (attempted placement)
      if (this.ghostPos) {
        this.audio.playInvalidSound();
        triggerHaptic("light");
        this.animations.triggerScreenShake(this.reducedMotion, 0.05);
      }
      // Wobble effect: shrink then bounce back
      this.draggedPiece.scale = 0.7;
      this.draggedPiece.targetScale = 1;
      this.positionQueuePieces();
    }

    this.draggedPiece = null;
    this.draggedPieceIndex = -1;
    this.ghostPos = null;
    this.isValidPlacement = false;
    this.completionRows = [];
    this.completionCols = [];
    this.lastGhostKey = "";
    this.dragTrail = [];
  }

  onKeyDown(e: KeyboardEvent): void {
    // Allow Enter/Space to start or restart
    if ((!this.state.started || this.state.gameOver) && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      this.startGame();
      return;
    }
    if (!this.state.started || this.state.gameOver) return;
    if (this.draggedPiece) return; // Don't interfere with mouse drag

    const q = this.state.blockQueue;
    if (q.length === 0) return;

    switch (e.key) {
      case "Tab":
        e.preventDefault();
        // Cycle through queue pieces
        this.kbPieceIdx = (this.kbPieceIdx + 1) % q.length;
        this.audio.playPickupSound();
        triggerHaptic("light");
        break;
      case "ArrowLeft":
        e.preventDefault();
        if (this.kbPieceIdx >= 0) { this.kbGridX = Math.max(0, this.kbGridX - 1); triggerHaptic("light"); }
        break;
      case "ArrowRight":
        e.preventDefault();
        if (this.kbPieceIdx >= 0) { this.kbGridX = Math.min(CONFIG.GRID_SIZE - 1, this.kbGridX + 1); triggerHaptic("light"); }
        break;
      case "ArrowUp":
        e.preventDefault();
        if (this.kbPieceIdx >= 0) { this.kbGridY = Math.max(0, this.kbGridY - 1); triggerHaptic("light"); }
        break;
      case "ArrowDown":
        e.preventDefault();
        if (this.kbPieceIdx >= 0) { this.kbGridY = Math.min(CONFIG.GRID_SIZE - 1, this.kbGridY + 1); triggerHaptic("light"); }
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (this.kbPieceIdx >= 0 && this.kbPieceIdx < q.length) {
          const piece = q[this.kbPieceIdx];
          if (this.canPlacePiece(piece, this.kbGridX, this.kbGridY)) {
            // Simulate a placement as if dragged
            this.draggedPiece = piece;
            this.draggedPieceIndex = this.kbPieceIdx;
            this.ghostPos = { gridX: this.kbGridX, gridY: this.kbGridY };
            this.isValidPlacement = true;
            this.onPointerUp();
            this.kbPieceIdx = Math.min(this.kbPieceIdx, q.length - 1);
            if (q.length === 0) this.kbPieceIdx = -1;
          } else {
            this.audio.playInvalidSound();
            triggerHaptic("light");
            this.kbInvalidFlash = 0.3;
          }
        }
        break;
      case "Escape":
        e.preventDefault();
        this.kbPieceIdx = -1;
        break;
    }
  }

  canPlacePiece(piece: BlockPiece, gx: number, gy: number): boolean {
    for (const [cx, cy] of piece.cells) {
      const x = gx + cx, y = gy + cy;
      if (x < 0 || x >= CONFIG.GRID_SIZE || y < 0 || y >= CONFIG.GRID_SIZE) return false;
      if (this.state.grid[y][x] !== null) return false;
    }
    return true;
  }

  placePiece(piece: BlockPiece, gx: number, gy: number): void {
    const color = CONFIG.BLOCK_COLORS[piece.colorIndex];
    for (const [cx, cy] of piece.cells) {
      const x = gx + cx, y = gy + cy;
      this.state.grid[y][x] = piece.colorIndex;
      this.animations.addPlaceAnimation(x, y);
      const px = this.gridOffsetX + (x + 0.5) * this.cellSize;
      const py = this.gridOffsetY + (y + 0.5) * this.cellSize;
      this.particles.emit(px, py, color.glow, 4, "spark");
      this.particles.emit(px, py, color.main, 2, "ember");
    }
    // Small shockwave at piece center
    const pcx = this.gridOffsetX + (gx + 0.5) * this.cellSize;
    const pcy = this.gridOffsetY + (gy + 0.5) * this.cellSize;
    this.shockwaves.emit(pcx, pcy, this.cellSize * 2, color.glow, 1.5);
    this.state.score += piece.cells.length;
  }

  checkAndClearLines(): number {
    const rows: number[] = [], cols: number[] = [];
    for (let y = 0; y < CONFIG.GRID_SIZE; y++) {
      if (this.state.grid[y].every(c => c !== null)) rows.push(y);
    }
    for (let x = 0; x < CONFIG.GRID_SIZE; x++) {
      let full = true;
      for (let y = 0; y < CONFIG.GRID_SIZE; y++) if (this.state.grid[y][x] === null) { full = false; break; }
      if (full) cols.push(x);
    }
    if (rows.length === 0 && cols.length === 0) return 0;

    const cells = new Set<string>();
    for (const y of rows) for (let x = 0; x < CONFIG.GRID_SIZE; x++) cells.add(x + "," + y);
    for (const x of cols) for (let y = 0; y < CONFIG.GRID_SIZE; y++) cells.add(x + "," + y);

    // Row/col flash lines
    for (const row of rows) {
      const fy = this.gridOffsetY + (row + 0.5) * this.cellSize;
      const gw = CONFIG.GRID_SIZE * this.cellSize;
      setTimeout(() => {
        this.shockwaves.emit(this.gridOffsetX + gw / 2, fy, gw * 0.7, "#ffffff", 2);
      }, 50);
    }
    for (const col of cols) {
      const fx = this.gridOffsetX + (col + 0.5) * this.cellSize;
      const gh = CONFIG.GRID_SIZE * this.cellSize;
      setTimeout(() => {
        this.shockwaves.emit(fx, this.gridOffsetY + gh / 2, gh * 0.7, "#ffffff", 2);
      }, 50);
    }

    // Row sweep
    for (const row of rows) {
      for (let x = 0; x < CONFIG.GRID_SIZE; x++) {
        const ci = this.state.grid[row][x];
        if (ci !== null) {
          const c = CONFIG.BLOCK_COLORS[ci];
          const px = this.gridOffsetX + (x + 0.5) * this.cellSize;
          const py = this.gridOffsetY + (row + 0.5) * this.cellSize;
          const d = x * 0.04;
          setTimeout(() => {
            this.particles.emit(px, py, c.main, 8, "clear");
            this.particles.emit(px, py, "#ffffff", 3, "star");
            this.particles.emit(px + 10, py, c.glow, 3, "ember");
          }, d * 1000);
          this.animations.addClearAnimation(x, row, d);
        }
      }
    }
    // Col sweep
    for (const col of cols) {
      for (let y = 0; y < CONFIG.GRID_SIZE; y++) {
        if (rows.includes(y)) continue;
        const ci = this.state.grid[y][col];
        if (ci !== null) {
          const c = CONFIG.BLOCK_COLORS[ci];
          const px = this.gridOffsetX + (col + 0.5) * this.cellSize;
          const py = this.gridOffsetY + (y + 0.5) * this.cellSize;
          const d = y * 0.04;
          setTimeout(() => {
            this.particles.emit(px, py, c.main, 8, "clear");
            this.particles.emit(px, py, "#ffffff", 3, "star");
            this.particles.emit(px, py + 10, c.glow, 3, "ember");
          }, d * 1000);
          this.animations.addClearAnimation(col, y, d);
        }
      }
    }

    // Center burst
    const cx = this.gridOffsetX + (CONFIG.GRID_SIZE / 2) * this.cellSize;
    const cy = this.gridOffsetY + (CONFIG.GRID_SIZE / 2) * this.cellSize;
    const total = rows.length + cols.length;
    setTimeout(() => {
      this.particles.emit(cx, cy, "#ffd700", 10 + total * 5, "burst");
      if (total >= 2) this.particles.emit(cx, cy, "#ffffff", 8, "star");
    }, 150);

    // Trigger grid pulse effect
    this.gridPulse = Math.min(1, 0.3 + total * 0.15);

    // Clear grid after animation starts
    setTimeout(() => {
      for (const key of cells) {
        const [x, y] = key.split(",").map(Number);
        this.state.grid[y][x] = null;
      }
    }, 100);

    return total;
  }

  checkGameOver(): boolean {
    for (const piece of this.state.blockQueue)
      for (let y = 0; y < CONFIG.GRID_SIZE; y++)
        for (let x = 0; x < CONFIG.GRID_SIZE; x++)
          if (this.canPlacePiece(piece, x, y)) return false;
    return true;
  }

  endGame(): void {
    this.state.gameOver = true;
    this.timeScale = 0.2; // Dramatic slow-mo
    this.audio.stopMusic();
    this.audio.playGameOverSound();
    setTimeout(() => this.audio.playGameOverMusic(), 500);
    triggerHaptic("error");

    if (typeof (window as any).submitScore === "function") {
      (window as any).submitScore(this.state.score);
    }

    const isNew = this.state.score > this.state.highScore;
    if (isNew) { this.state.highScore = this.state.score; this.saveHighScore(this.state.score); }

    // Animated score counter on game over
    const finalScoreEl = document.getElementById("finalScore")!;
    finalScoreEl.textContent = "0";
    const targetScore = this.state.score;
    const countDuration = Math.min(1500, 300 + targetScore * 0.5);
    const countStart = performance.now();
    const countUp = () => {
      const elapsed = performance.now() - countStart;
      const t = Math.min(1, elapsed / countDuration);
      const eased = easeOutCubic(t);
      finalScoreEl.textContent = Math.floor(eased * targetScore).toString();
      if (t < 1) requestAnimationFrame(countUp);
    };
    requestAnimationFrame(countUp);
    document.getElementById("linesCleared")!.textContent = this.state.linesCleared.toString();
    document.getElementById("blocksPlaced")!.textContent = this.state.blocksPlaced.toString();
    document.getElementById("maxCombo2")!.textContent = (this.state.maxCombo || 1).toString();
    const diffEl = document.getElementById("diffReached");
    if (diffEl) diffEl.textContent = (this.state.difficulty + 1).toString();
    const totalEl = document.getElementById("totalClears");
    if (totalEl) totalEl.textContent = this.state.totalClears.toString();

    const nhEl = document.getElementById("newHighScore")!;
    if (isNew) nhEl.classList.add("show"); else nhEl.classList.remove("show");

    // Grid dissolve effect — spiral outward from center
    const cx = this.gridOffsetX + (CONFIG.GRID_SIZE / 2) * this.cellSize;
    const cy = this.gridOffsetY + (CONFIG.GRID_SIZE / 2) * this.cellSize;
    for (let y = 0; y < CONFIG.GRID_SIZE; y++) {
      for (let x = 0; x < CONFIG.GRID_SIZE; x++) {
        const ci = this.state.grid[y][x];
        if (ci !== null) {
          const c = CONFIG.BLOCK_COLORS[ci];
          const px = this.gridOffsetX + (x + 0.5) * this.cellSize;
          const py = this.gridOffsetY + (y + 0.5) * this.cellSize;
          // Spiral delay based on angle + distance
          const dx = x - 3.5, dy = y - 3.5;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx);
          const delay = dist * 40 + (angle + Math.PI) * 15;
          setTimeout(() => {
            this.particles.emit(px, py, c.main, 5, "clear");
            this.particles.emit(px, py, c.glow, 2, "ember");
            this.particles.emit(px, py, "#ffffff", 1, "star");
          }, delay);
        }
      }
    }
    this.flash.trigger("#ff4444", 0.12);
    this.animations.triggerScreenShake(this.reducedMotion,0.5);

    setTimeout(() => document.getElementById("gameOverScreen")?.classList.remove("hidden"), 800);
  }

  updateComboPips(): void {
    const pip1 = document.getElementById("pip1");
    const pip2 = document.getElementById("pip2");
    if (pip1) pip1.classList.toggle("used", this.state.comboLeeway < 2);
    if (pip2) pip2.classList.toggle("used", this.state.comboLeeway < 1);
  }

  showClearType(lines: number, streak: number): void {
    const el = document.getElementById("comboDisplay")!;
    const txt = document.getElementById("comboText")!;
    const name = lines === 1 ? "CLEAR" : lines === 2 ? "DOUBLE" : lines === 3 ? "TRIPLE" : "MEGA";
    txt.textContent = streak > 1 ? name + " x" + streak : name;
    const base = this.isMobile ? 2.5 : 3.5;
    el.style.fontSize = (base + Math.min(lines - 1, 2) * 0.5 + Math.min(streak - 1, 3) * 0.3) + "rem";
    // Combo timeout scales with streak to give the player more time to read it
    const displayTime = 800 + Math.min(streak, 5) * 100;
    el.removeAttribute("data-combo");
    el.classList.remove("active");
    void el.offsetWidth;
    el.classList.add("active");
    clearTimeout(this.comboHideTimeout);
    this.comboHideTimeout = window.setTimeout(() => this.hideCombo(), displayTime);
  }

  hideCombo(): void {
    const el = document.getElementById("comboDisplay");
    if (el) { el.classList.remove("active"); el.removeAttribute("data-combo"); }
  }

  updateHUD(): void {
    const el = document.getElementById("score")!;
    // Score updates smoothly via displayScore counter in update()
    // Trigger bump animation
    el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump");
    document.getElementById("highScore")!.textContent = this.state.highScore.toString();
    const lvlEl = document.getElementById("levelIndicator");
    if (lvlEl) lvlEl.textContent = "Lv." + (this.state.difficulty + 1);
    // Level progress bar
    const progFill = document.getElementById("levelProgressFill");
    if (progFill) {
      const steps = CONFIG.DIFFICULTY_SCORE_STEPS;
      const d = this.state.difficulty;
      const prevThresh = d > 0 ? steps[d - 1] : 0;
      const nextThresh = d < steps.length ? steps[d] : steps[steps.length - 1] + 5000;
      const pct = clamp((this.state.score - prevThresh) / (nextThresh - prevThresh) * 100, 0, 100);
      progFill.style.width = pct + "%";
    }
    // Update multiplier indicator + score glow
    const multEl = document.getElementById("multiplier");
    const scoreContainer = document.querySelector(".score-container") as HTMLElement;
    if (multEl) {
      if (this.state.streakMultiplier > 1.1) {
        multEl.textContent = "x" + this.state.streakMultiplier.toFixed(1);
        multEl.style.display = "block";
        if (scoreContainer) scoreContainer.classList.add("multiplier-active");
      } else {
        multEl.style.display = "none";
        if (scoreContainer) scoreContainer.classList.remove("multiplier-active");
      }
    }
  }

  // ============= GAME LOOP =============
  gameLoop(ts: number): void {
    const rawDt = Math.min((ts - this.lastTime) / 1000, 0.1);
    this.lastTime = ts;
    // Recover timeScale
    if (this.timeScale < 1) this.timeScale = Math.min(1, this.timeScale + rawDt * 0.5);
    const dt = rawDt * this.timeScale;
    this.gameTime += dt;
    this.update(dt);
    this.render();
    requestAnimationFrame((t) => this.gameLoop(t));
  }

  update(dt: number): void {
    // Adaptive quality: reduce MAX_PARTICLES on slow devices
    if (dt > 0.05 && ParticleSystem.MAX_PARTICLES > 150) {
      ParticleSystem.MAX_PARTICLES = 150; // Halve for low-perf devices
    }
    this.particles.update(dt);
    this.floatingText.update(dt);
    this.animations.update(dt);
    this.ambient.update(dt, window.innerHeight);
    this.shockwaves.update(dt);
    this.flash.update(dt);

    // Animate queue piece scales + entry animation
    for (let i = 0; i < this.state.blockQueue.length; i++) {
      const p = this.state.blockQueue[i];
      if (p.entryProgress < 1) {
        p.entryProgress = Math.min(1, p.entryProgress + dt * 3.5);
      }
      p.scale = lerp(p.scale, p.targetScale, Math.min(1, dt * 12));
    }

    // Smooth difficulty transition
    this.smoothDifficulty = lerp(this.smoothDifficulty, this.state.difficulty, dt * 2);

    // Grid pulse decay
    if (this.gridPulse > 0) this.gridPulse = Math.max(0, this.gridPulse - dt * 4);
    if (this.kbInvalidFlash > 0) this.kbInvalidFlash = Math.max(0, this.kbInvalidFlash - dt * 3);

    // Smooth score counting
    if (this.displayScore !== this.state.score) {
      const diff = this.state.score - this.displayScore;
      const step = Math.max(1, Math.ceil(Math.abs(diff) * 0.12));
      this.displayScore += diff > 0 ? Math.min(step, diff) : Math.max(-step, diff);
      this.updateScoreDisplay();
    }
  }

  updateScoreDisplay(): void {
    const el = document.getElementById("score");
    if (el) el.textContent = this.displayScore.toString();
  }

  render(): void {
    const ctx = this.ctx;
    const w = window.innerWidth, h = window.innerHeight;
    // Dynamic background with smooth difficulty transition
    const sd = this.smoothDifficulty;
    const sdRounded = Math.round(sd * 100); // cache key with precision
    if (!this.cachedBgGradient || this.cachedBgDifficulty !== sdRounded || this.cachedBgWidth !== w || this.cachedBgHeight !== h) {
      const bgColors = [
        [12,12,32, 17,17,51, 13,13,40, 8,8,24],
        [12,12,34, 19,19,64, 13,13,48, 8,8,28],
        [16,8,28, 26,16,80, 18,13,53, 10,6,32],
        [20,8,24, 32,16,72, 24,8,46, 12,4,26],
        [24,8,16, 40,8,48, 30,6,32, 16,4,18],
        [26,8,8, 42,16,16, 28,8,8, 14,4,4],
        [30,5,5, 48,16,8, 32,6,5, 18,3,3],
      ];
      const lo = Math.floor(clamp(sd, 0, bgColors.length - 1));
      const hi = Math.min(lo + 1, bgColors.length - 1);
      const t = sd - lo;
      const mix = (a: number[], b: number[], i: number) => Math.round(a[i] + (b[i] - a[i]) * t);
      const c = (i: number) => `rgb(${mix(bgColors[lo], bgColors[hi], i*3)},${mix(bgColors[lo], bgColors[hi], i*3+1)},${mix(bgColors[lo], bgColors[hi], i*3+2)})`;
      this.cachedBgGradient = ctx.createLinearGradient(0, 0, w * 0.3, h);
      this.cachedBgGradient.addColorStop(0, c(0));
      this.cachedBgGradient.addColorStop(0.4, c(1));
      this.cachedBgGradient.addColorStop(0.7, c(2));
      this.cachedBgGradient.addColorStop(1, c(3));
      this.cachedBgDifficulty = sdRounded;
      this.cachedBgWidth = w;
      this.cachedBgHeight = h;
    }
    ctx.fillStyle = this.cachedBgGradient;
    ctx.fillRect(0, 0, w, h);

    // Subtle radial vignette (cached)
    if (!this.cachedVignette || this.cachedVigW !== w || this.cachedVigH !== h) {
      this.cachedVignette = ctx.createRadialGradient(w / 2, h / 2, h * 0.2, w / 2, h / 2, h * 0.9);
      this.cachedVignette.addColorStop(0, "transparent");
      this.cachedVignette.addColorStop(1, "rgba(0,0,0,0.35)");
      this.cachedVigW = w;
      this.cachedVigH = h;
    }
    ctx.fillStyle = this.cachedVignette;
    ctx.fillRect(0, 0, w, h);

    // Ambient starfield (behind everything)
    this.ambient.draw(ctx, this.smoothDifficulty);

    ctx.save();
    ctx.translate(this.animations.screenShake.x, this.animations.screenShake.y);

    if (this.state.started) {
      this.renderGrid(ctx);
      this.renderCompletionHighlight(ctx);
      this.renderGhost(ctx);
      this.renderQueue(ctx);
      this.renderDraggedPiece(ctx);
    }

    // Danger vignette when grid is nearly full
    if (this.state.gridFillPct > CONFIG.DANGER_THRESHOLD && this.state.started && !this.state.gameOver) {
      const dangerIntensity = (this.state.gridFillPct - CONFIG.DANGER_THRESHOLD) / (1 - CONFIG.DANGER_THRESHOLD);
      const dangerPulse = 0.5 + 0.5 * Math.sin(this.gameTime * 3);
      const alpha = dangerIntensity * dangerPulse * 0.12;
      ctx.save();
      ctx.globalAlpha = alpha;
      const dangerVig = ctx.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, h * 0.7);
      dangerVig.addColorStop(0, "transparent");
      dangerVig.addColorStop(1, "#ff2020");
      ctx.fillStyle = dangerVig;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }

    // Effects on top
    this.shockwaves.draw(ctx);
    this.particles.draw(ctx);
    this.floatingText.draw(ctx);
    ctx.restore();

    // Screen flash (not affected by shake)
    this.flash.draw(ctx, w, h);
  }

  renderGrid(ctx: CanvasRenderingContext2D): void {
    const padding = 6;
    const borderR = 14;
    const gridW = CONFIG.GRID_SIZE * this.cellSize;

    // Grid pulse scale effect on line clear
    if (this.gridPulse > 0.01) {
      const pulseScale = 1 + this.gridPulse * 0.015;
      const centerX = this.gridOffsetX + gridW / 2;
      const centerY = this.gridOffsetY + gridW / 2;
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.scale(pulseScale, pulseScale);
      ctx.translate(-centerX, -centerY);
    }

    // Grid outer glow
    const danger = this.state.gridFillPct > CONFIG.DANGER_THRESHOLD;
    const glowColor = danger ? "rgba(255,60,60,0.12)" : "rgba(100,120,255,0.08)";
    const pulse = 0.7 + 0.3 * Math.sin(this.gameTime * (danger ? 4 : 1.5));
    ctx.save();
    ctx.shadowColor = danger ? "rgba(255,60,60,0.4)" : "rgba(100,120,255,0.25)";
    ctx.shadowBlur = 20 * pulse;
    ctx.fillStyle = CONFIG.GRID_BG;
    this.roundRect(ctx,
      this.gridOffsetX - padding, this.gridOffsetY - padding,
      gridW + padding * 2, gridW + padding * 2, borderR);
    ctx.fill();
    ctx.restore();

    // Grid border — gradient that shifts with difficulty
    ctx.save();
    const borderGrad = ctx.createLinearGradient(
      this.gridOffsetX, this.gridOffsetY,
      this.gridOffsetX + gridW, this.gridOffsetY + gridW
    );
    if (danger) {
      borderGrad.addColorStop(0, `rgba(255,80,80,${0.3 * pulse})`);
      borderGrad.addColorStop(0.5, `rgba(255,120,60,${0.2 * pulse})`);
      borderGrad.addColorStop(1, `rgba(255,80,80,${0.3 * pulse})`);
    } else {
      const d = this.state.difficulty;
      const hue = 230 + d * 15; // Shifts from blue toward purple
      borderGrad.addColorStop(0, `hsla(${hue},70%,60%,${0.15 * pulse})`);
      borderGrad.addColorStop(0.5, `hsla(${hue + 30},60%,50%,${0.1 * pulse})`);
      borderGrad.addColorStop(1, `hsla(${hue},70%,60%,${0.15 * pulse})`);
    }
    ctx.strokeStyle = borderGrad;
    ctx.lineWidth = 1.5;
    this.roundRect(ctx,
      this.gridOffsetX - padding, this.gridOffsetY - padding,
      gridW + padding * 2, gridW + padding * 2, borderR);
    ctx.stroke();
    ctx.restore();

    // Draw cells
    for (let y = 0; y < CONFIG.GRID_SIZE; y++) {
      for (let x = 0; x < CONFIG.GRID_SIZE; x++) {
        const cx = this.gridOffsetX + x * this.cellSize;
        const cy = this.gridOffsetY + y * this.cellSize;
        const cp = 2, cr = 6;
        const clearSt = this.animations.getClearState(x, y);

        if (clearSt.clearing && clearSt.progress > 0) {
          ctx.save();
          const sc = 1 - easeInOutQuad(clearSt.progress);
          const ccx = cx + this.cellSize / 2, ccy = cy + this.cellSize / 2;
          ctx.translate(ccx, ccy); ctx.scale(sc, sc); ctx.translate(-ccx, -ccy);
        }

        // Cell background - check for almost-full highlighting
        const rowAlmost = this.rowFill[y] >= CONFIG.ALMOST_FULL_THRESHOLD;
        const colAlmost = this.colFill[x] >= CONFIG.ALMOST_FULL_THRESHOLD;

        const almostFull = (rowAlmost || colAlmost) && this.state.grid[y][x] === null;
        if (almostFull) {
          const glowI = 0.08 + 0.04 * Math.sin(this.gameTime * 3);
          ctx.fillStyle = `rgba(255,215,0,${glowI})`;
        } else {
          ctx.fillStyle = CONFIG.GRID_CELL_BG;
        }
        this.roundRect(ctx, cx + cp, cy + cp, this.cellSize - cp * 2, this.cellSize - cp * 2, cr);
        ctx.fill();

        // Inner shadow for depth (only on empty cells)
        if (this.state.grid[y][x] === null) {
          const inS = this.cellSize - cp * 2;
          if (!this.cachedCellShadow || this.cachedCellShadowSize !== inS) {
            this.cachedCellShadow = ctx.createLinearGradient(0, 0, 0, inS * 0.3);
            this.cachedCellShadow.addColorStop(0, "rgba(0,0,0,0.12)");
            this.cachedCellShadow.addColorStop(1, "transparent");
            this.cachedCellShadowSize = inS;
          }
          ctx.save();
          ctx.translate(cx + cp, cy + cp);
          ctx.fillStyle = this.cachedCellShadow;
          this.roundRect(ctx, 0, 0, inS, inS, cr);
          ctx.fill();
          ctx.restore();
          // Diagonal shimmer
          const shimmerT = (this.gameTime * 0.3 + (x + y) * 0.15) % 1;
          if (shimmerT < 0.15) {
            ctx.save();
            ctx.globalAlpha = (1 - Math.abs(shimmerT - 0.075) / 0.075) * 0.06;
            ctx.fillStyle = "#ffffff";
            this.roundRect(ctx, cx + cp, cy + cp, inS, inS, cr);
            ctx.fill();
            ctx.restore();
          }
        }

        // Cell border — golden for almost-full empty cells
        if (almostFull) {
          const borderPulse = 0.2 + 0.15 * Math.sin(this.gameTime * 4);
          ctx.strokeStyle = `rgba(255,215,0,${borderPulse})`;
          ctx.lineWidth = 1.2;
        } else if (this.state.gridFillPct > CONFIG.DANGER_THRESHOLD) {
          // Danger mode: reddish borders
          const dangerT = (this.state.gridFillPct - CONFIG.DANGER_THRESHOLD) / (1 - CONFIG.DANGER_THRESHOLD);
          ctx.strokeStyle = `rgba(${Math.round(46 + dangerT * 100)},${Math.round(46 - dangerT * 20)},${Math.round(94 - dangerT * 50)},${0.4 + dangerT * 0.3})`;
          ctx.lineWidth = 0.5 + dangerT * 0.5;
        } else {
          ctx.strokeStyle = CONFIG.GRID_CELL_BORDER;
          ctx.lineWidth = 0.5;
        }
        this.roundRect(ctx, cx + cp, cy + cp, this.cellSize - cp * 2, this.cellSize - cp * 2, cr);
        ctx.stroke();

        // Block
        const ci = this.state.grid[y][x];
        if (ci !== null && (!clearSt.clearing || clearSt.progress === 0)) {
          const color = CONFIG.BLOCK_COLORS[ci];
          const placeS = this.animations.getPlaceScale(x, y);
          this.renderBlock(ctx, cx + this.cellSize / 2, cy + this.cellSize / 2,
            this.cellSize - cp * 2 - 4, color, placeS);
          // Subtle positional brightness variation
          const posVar = ((x + y) % 2 === 0) ? 0.04 : -0.02;
          if (posVar !== 0) {
            ctx.save();
            ctx.globalAlpha = Math.abs(posVar);
            ctx.fillStyle = posVar > 0 ? "#ffffff" : "#000000";
            this.roundRect(ctx, cx + cp + 2, cy + cp + 2, this.cellSize - cp * 2 - 4, this.cellSize - cp * 2 - 4, cr);
            ctx.fill();
            ctx.restore();
          }
          // Brief white flash on freshly placed blocks
          if (placeS < 0.95) {
            ctx.save();
            ctx.globalAlpha = (1 - placeS) * 0.4;
            ctx.fillStyle = "#ffffff";
            this.roundRect(ctx, cx + cp, cy + cp, this.cellSize - cp * 2, this.cellSize - cp * 2, cr);
            ctx.fill();
            ctx.restore();
          }
          // Edge glow on blocks in almost-full rows/cols
          if (rowAlmost || colAlmost) {
            ctx.save();
            ctx.globalAlpha = 0.08 + 0.04 * Math.sin(this.gameTime * 3.5);
            ctx.shadowColor = "#ffd700";
            ctx.shadowBlur = 6;
            ctx.fillStyle = "#ffd700";
            this.roundRect(ctx, cx + cp + 2, cy + cp + 2, this.cellSize - cp * 2 - 4, this.cellSize - cp * 2 - 4, cr);
            ctx.fill();
            ctx.restore();
          }
        }

        if (clearSt.clearing && clearSt.progress > 0) ctx.restore();
      }
    }

    // Keyboard cursor highlight
    if (this.kbPieceIdx >= 0 && !this.draggedPiece) {
      const kx = this.gridOffsetX + this.kbGridX * this.cellSize;
      const ky = this.gridOffsetY + this.kbGridY * this.cellSize;
      const kp = 0.5 + 0.3 * Math.sin(this.gameTime * 4);
      ctx.save();
      const flashR = this.kbInvalidFlash > 0 ? this.kbInvalidFlash / 0.3 : 0;
      const cursorR = Math.round(255 * (1 - flashR * 0.3));
      const cursorG = Math.round(255 * (1 - flashR));
      const cursorB = Math.round(255 * (1 - flashR));
      ctx.strokeStyle = `rgba(${cursorR},${cursorG},${cursorB},${kp})`;
      ctx.lineWidth = 2 + flashR * 2;
      this.roundRect(ctx, kx + 1, ky + 1, this.cellSize - 2, this.cellSize - 2, 6);
      ctx.stroke();
      // Ghost preview of the selected piece at cursor position
      const piece = this.state.blockQueue[this.kbPieceIdx];
      if (piece) {
        const valid = this.canPlacePiece(piece, this.kbGridX, this.kbGridY);
        ctx.globalAlpha = valid ? 0.35 : 0.15;
        ctx.fillStyle = valid ? CONFIG.BLOCK_COLORS[piece.colorIndex].main : "#ff4444";
        for (const [cx, cy] of piece.cells) {
          const bx = this.gridOffsetX + (this.kbGridX + cx) * this.cellSize;
          const by = this.gridOffsetY + (this.kbGridY + cy) * this.cellSize;
          this.roundRect(ctx, bx + 3, by + 3, this.cellSize - 6, this.cellSize - 6, 4);
          ctx.fill();
        }
      }
      ctx.restore();
    }

    // Close grid pulse scale
    if (this.gridPulse > 0.01) ctx.restore();
  }

  renderCompletionHighlight(ctx: CanvasRenderingContext2D): void {
    if (this.completionRows.length === 0 && this.completionCols.length === 0) return;

    const pulse = 0.12 + 0.06 * Math.sin(this.gameTime * 5);
    const gridW = CONFIG.GRID_SIZE * this.cellSize;
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.fillStyle = "#ffd700";

    for (const y of this.completionRows) {
      ctx.fillRect(this.gridOffsetX, this.gridOffsetY + y * this.cellSize, gridW, this.cellSize);
    }
    for (const x of this.completionCols) {
      ctx.fillRect(this.gridOffsetX + x * this.cellSize, this.gridOffsetY, this.cellSize, gridW);
    }
    ctx.restore();
  }

  renderGhost(ctx: CanvasRenderingContext2D): void {
    if (!this.draggedPiece || !this.ghostPos) return;
    const { gridX: gx, gridY: gy } = this.ghostPos;
    const color = CONFIG.BLOCK_COLORS[this.draggedPiece.colorIndex];

    if (this.isValidPlacement) {
      // Drop shadow beneath ghost blocks
      ctx.save();
      ctx.globalAlpha = 0.15;
      ctx.fillStyle = "#000000";
      for (const [cx, cy] of this.draggedPiece.cells) {
        const x = gx + cx, y = gy + cy;
        if (x < 0 || x >= CONFIG.GRID_SIZE || y < 0 || y >= CONFIG.GRID_SIZE) continue;
        const px = this.gridOffsetX + x * this.cellSize;
        const py = this.gridOffsetY + y * this.cellSize;
        this.roundRect(ctx, px + 4, py + 6, this.cellSize - 8, this.cellSize - 6, 6);
        ctx.fill();
      }
      ctx.restore();

      // Ghost blocks with glow
      const pulse = 0.35 + 0.15 * Math.sin(this.gameTime * 6);
      ctx.save();
      ctx.globalAlpha = pulse;
      for (const [cx, cy] of this.draggedPiece.cells) {
        const x = gx + cx, y = gy + cy;
        if (x < 0 || x >= CONFIG.GRID_SIZE || y < 0 || y >= CONFIG.GRID_SIZE) continue;
        const px = this.gridOffsetX + x * this.cellSize;
        const py = this.gridOffsetY + y * this.cellSize;
        ctx.shadowColor = color.glow;
        ctx.shadowBlur = 18;
        this.renderBlock(ctx, px + this.cellSize / 2, py + this.cellSize / 2,
          this.cellSize - 8, color, 1);
        ctx.shadowBlur = 0;
      }
      ctx.restore();
    } else {
      // Invalid placement: show red-tinted outline
      const pulse = 0.15 + 0.08 * Math.sin(this.gameTime * 8);
      ctx.save();
      ctx.globalAlpha = pulse;
      for (const [cx, cy] of this.draggedPiece.cells) {
        const x = gx + cx, y = gy + cy;
        if (x < 0 || x >= CONFIG.GRID_SIZE || y < 0 || y >= CONFIG.GRID_SIZE) continue;
        const px = this.gridOffsetX + x * this.cellSize;
        const py = this.gridOffsetY + y * this.cellSize;
        const s = this.cellSize - 8;
        ctx.strokeStyle = "rgba(255,60,60,0.8)";
        ctx.lineWidth = 2;
        this.roundRect(ctx, px + 4, py + 4, s, s, 6);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  renderQueue(ctx: CanvasRenderingContext2D): void {
    const w = window.innerWidth, h = window.innerHeight;
    const isLandscape = w > h * 1.2 && this.isMobile;
    const isDragging = this.draggedPiece !== null;

    if (isLandscape) {
      // Landscape: vertical queue panel to the right of grid
      const gw = this.cellSize * CONFIG.GRID_SIZE;
      const gridRight = this.gridOffsetX + gw;
      const panelX = gridRight + 15;
      const panelW = w - panelX - 15;
      const panelH = h * 0.7;
      const panelY = (h - panelH) / 2;
      ctx.save();
      ctx.globalAlpha = isDragging ? 0.04 : 0.08;
      ctx.fillStyle = "#ffffff";
      this.roundRect(ctx, panelX, panelY, panelW, panelH, 16);
      ctx.fill();
      ctx.restore();
      ctx.save();
      ctx.globalAlpha = 0.12;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1;
      this.roundRect(ctx, panelX, panelY, panelW, panelH, 16);
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.font = "600 11px Nunito, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText("DRAG TO PLACE", panelX + panelW / 2, panelY + 8);
    } else {
      // Portrait: horizontal queue panel below grid
      const qw = Math.min(w - 40, 500);
      const qx = (w - qw) / 2;
      const qh = this.isMobile ? 130 : 150;
      ctx.save();
      ctx.globalAlpha = isDragging ? 0.04 : 0.08;
      ctx.fillStyle = "#ffffff";
      this.roundRect(ctx, qx, this.queueY - 5, qw, qh, 16);
      ctx.fill();
      ctx.restore();
      ctx.save();
      ctx.globalAlpha = 0.12;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1;
      this.roundRect(ctx, qx, this.queueY - 5, qw, qh, 16);
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.font = "600 13px Nunito, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText("DRAG TO PLACE", w / 2, this.queueY + 2);
    }

    for (let i = 0; i < this.state.blockQueue.length; i++) {
      if (i === this.draggedPieceIndex) continue;
      const piece = this.state.blockQueue[i];
      const color = CONFIG.BLOCK_COLORS[piece.colorIndex];
      const b = this.getPieceBounds(piece);
      const pw = (b.maxX - b.minX + 1) * this.queueCellSize;
      const ph = (b.maxY - b.minY + 1) * this.queueCellSize;
      const pcx = piece.x + pw / 2, pcy = piece.y + ph / 2;
      // Entry animation (slide up from below + elastic) + idle bob
      const ep = Math.max(0, piece.entryProgress);
      const entryT = ep < 1 ? easeOutBack(ep) : 1;
      const entryOffset = (1 - entryT) * 40;
      const entryAlpha = entryT;
      const bob = ep >= 1 ? Math.sin(this.gameTime * 1.8 + i * 1.2) * 3 : 0;
      const breathe = ep >= 1 ? 1 + Math.sin(this.gameTime * 1.2 + i * 2.1) * 0.02 : 1;

      ctx.save();
      ctx.globalAlpha *= entryAlpha;
      ctx.translate(pcx, pcy + bob + entryOffset);
      ctx.scale(piece.scale * breathe, piece.scale * breathe);
      ctx.translate(-pcx, -pcy);

      for (const [cx, cy] of piece.cells) {
        const bx = piece.x + (cx - b.minX) * this.queueCellSize;
        const by = piece.y + (cy - b.minY) * this.queueCellSize;
        this.renderBlock(ctx, bx + this.queueCellSize / 2, by + this.queueCellSize / 2,
          this.queueCellSize - 4, color, 1);
      }
      // Keyboard selection highlight ring
      if (i === this.kbPieceIdx && !this.draggedPiece) {
        ctx.strokeStyle = "rgba(255,255,255,0.6)";
        ctx.lineWidth = 2;
        this.roundRect(ctx, piece.x - 4, piece.y - 4, pw + 8, ph + 8, 8);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  renderDraggedPiece(ctx: CanvasRenderingContext2D): void {
    if (!this.draggedPiece) return;
    const color = CONFIG.BLOCK_COLORS[this.draggedPiece.colorIndex];
    const b = this.getPieceBounds(this.draggedPiece);
    const offset = this.isMobile ? Math.min(120, window.innerHeight * 0.12) : 30;
    const pcx = (b.maxX + b.minX) / 2, pcy = (b.maxY + b.minY) / 2;

    // Motion trail
    if (this.dragTrail.length > 1) {
      ctx.save();
      for (let i = 0; i < this.dragTrail.length - 1; i++) {
        const t = i / this.dragTrail.length;
        ctx.globalAlpha = t * 0.15;
        ctx.fillStyle = color.glow;
        ctx.beginPath();
        ctx.arc(this.dragTrail[i].x, this.dragTrail[i].y - offset, 4 + t * 6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // Glow circle under dragged piece
    ctx.save();
    const glowR = this.cellSize * 2;
    const dragGlow = ctx.createRadialGradient(
      this.dragPos.x, this.dragPos.y - offset, 0,
      this.dragPos.x, this.dragPos.y - offset, glowR
    );
    dragGlow.addColorStop(0, color.glow);
    dragGlow.addColorStop(1, "transparent");
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = dragGlow;
    ctx.fillRect(this.dragPos.x - glowR, this.dragPos.y - offset - glowR, glowR * 2, glowR * 2);
    ctx.restore();

    ctx.save();
    const sc = this.draggedPiece.scale;
    ctx.translate(this.dragPos.x, this.dragPos.y - offset);
    ctx.scale(sc, sc);
    if (this.isValidPlacement) { ctx.shadowColor = color.glow; ctx.shadowBlur = 24; }

    for (const [cx, cy] of this.draggedPiece.cells) {
      this.renderBlock(ctx, (cx - pcx) * this.cellSize, (cy - pcy) * this.cellSize,
        this.cellSize - 8, color, 1);
    }
    ctx.restore();
  }

  renderBlock(
    ctx: CanvasRenderingContext2D, centerX: number, centerY: number, size: number,
    color: { main: string; light: string; dark: string; glow: string; accent: string },
    scale: number
  ): void {
    const s = size * scale;
    const x = centerX - s / 2, y = centerY - s / 2;
    const r = Math.max(4, s * 0.18);

    // Outer glow (subtle)
    ctx.save();
    ctx.shadowColor = color.glow;
    ctx.shadowBlur = s * 0.25;

    // Main body
    ctx.fillStyle = color.main;
    this.roundRect(ctx, x, y, s, s, r);
    ctx.fill();
    ctx.restore();

    // Top highlight (3D bevel)
    const topGrad = ctx.createLinearGradient(x, y, x, y + s * 0.5);
    topGrad.addColorStop(0, color.light);
    topGrad.addColorStop(1, "transparent");
    ctx.fillStyle = topGrad;
    this.roundRect(ctx, x, y, s, s * 0.5, r);
    ctx.fill();

    // Bottom shadow (3D depth)
    ctx.fillStyle = color.dark;
    this.roundRect(ctx, x + s * 0.05, y + s * 0.6, s * 0.9, s * 0.38, r * 0.7);
    ctx.fill();

    // Specular highlight (glossy reflection)
    const specGrad = ctx.createLinearGradient(x + s * 0.15, y + s * 0.08, x + s * 0.5, y + s * 0.25);
    specGrad.addColorStop(0, "rgba(255,255,255,0.45)");
    specGrad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = specGrad;
    this.roundRect(ctx, x + s * 0.12, y + s * 0.08, s * 0.4, s * 0.2, r * 0.5);
    ctx.fill();

    // Inner glow ring
    ctx.save();
    ctx.globalAlpha = 0.15;
    ctx.strokeStyle = color.light;
    ctx.lineWidth = 1.5;
    this.roundRect(ctx, x + 2, y + 2, s - 4, s - 4, r - 1);
    ctx.stroke();
    ctx.restore();
  }

  roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
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
  new BlockBlastGame();
});
