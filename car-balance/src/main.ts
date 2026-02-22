// Car Balance - A minimalist physics balancing game using Matter.js
// Keep the car balanced on a seesaw platform while dodging bombs!

import Matter from 'matter-js';

const { Engine, World, Bodies, Body, Events, Composite, Constraint } = Matter;

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface Bomb {
  x: number;           // Target x position on screen
  y: number;           // Current y position
  warningTime: number; // Time remaining in warning phase (ms)
  dropping: boolean;   // Whether bomb is actively falling
  exploded: boolean;   // Whether bomb has exploded
  body: Matter.Body | null; // Physics body when dropping
}

interface Explosion {
  x: number;
  y: number;
  time: number;        // Time since explosion started
  maxTime: number;     // Duration of explosion animation
}

interface CarStyle {
  id: string;
  name: string;
  bodyColor: string;
  bodyStroke: string;
  wheelColor: string;
  hubColor: string;
  widthScale: number;   // 0.7 to 1.3
  heightScale: number;  // 0.7 to 1.3
  wheelScale: number;   // 0.7 to 1.3
}

type OasizSettings = {
  music?: boolean;
  fx?: boolean;
  haptics?: boolean;
};

function getOasizSettings(): { music: boolean; fx: boolean; haptics: boolean } {
  const raw = (window as any).__OASIZ_SETTINGS__ as OasizSettings | undefined;
  return {
    music: raw?.music !== false,
    fx: raw?.fx !== false,
    haptics: raw?.haptics !== false,
  };
}

interface GameSettings {
  music: boolean;
  fx: boolean;
  haptics: boolean;
}

const SETTINGS_STORAGE_KEY = 'car_balance_settings';

let settings: GameSettings = loadSettings();

function loadSettings(): GameSettings {
  const platform = getOasizSettings();
  const defaults: GameSettings = { music: platform.music, fx: platform.fx, haptics: platform.haptics };
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<GameSettings>;
    return {
      music: parsed.music ?? defaults.music,
      fx: parsed.fx ?? defaults.fx,
      haptics: parsed.haptics ?? defaults.haptics,
    };
  } catch {
    return defaults;
  }
}

function saveSettings(): void {
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}

function isMusicEnabled(): boolean {
  return settings.music && getOasizSettings().music;
}

function isFxEnabled(): boolean {
  return settings.fx && getOasizSettings().fx;
}

function isHapticsEnabled(): boolean {
  return settings.haptics && getOasizSettings().haptics;
}

function triggerGameHaptic(type: 'light' | 'medium' | 'heavy' | 'success' | 'error'): void {
  if (!isHapticsEnabled()) return;
  if (typeof (window as any).triggerHaptic === 'function') {
    (window as any).triggerHaptic(type);
  }
}

function updateSettingsToggleUI(buttonId: string, enabled: boolean): void {
  const button = document.getElementById(buttonId) as HTMLButtonElement | null;
  if (!button) return;
  button.textContent = enabled ? 'ON' : 'OFF';
  button.classList.toggle('active', enabled);
}

function refreshSettingsUI(): void {
  updateSettingsToggleUI('music-toggle', settings.music);
  updateSettingsToggleUI('fx-toggle', settings.fx);
  updateSettingsToggleUI('haptics-toggle', settings.haptics);
}

function applySettings(): void {
  if (themeMusic) {
    if (isMusicEnabled() && gamePhase === 'playing') {
      themeMusic.play().catch(() => {});
    } else {
      themeMusic.pause();
    }
  }
  if (gameOverMusic && !isMusicEnabled()) {
    gameOverMusic.pause();
  }
}

function setSettingsButtonVisible(visible: boolean): void {
  const button = document.getElementById('settings-btn');
  if (!button) return;
  button.classList.toggle('ui-hidden', !visible);
  if (!visible) {
    closeSettingsModal();
  }
}

function openSettingsModal(): void {
  document.getElementById('settings-modal')?.classList.remove('ui-hidden');
}

function closeSettingsModal(): void {
  document.getElementById('settings-modal')?.classList.add('ui-hidden');
}

// Available car styles (6 options)
const CAR_STYLES: CarStyle[] = [
  {
    id: 'classic',
    name: 'Classic',
    bodyColor: '#3498db',
    bodyStroke: '#1a5276',
    wheelColor: '#1a1a1a',
    hubColor: '#666',
    widthScale: 1.0,
    heightScale: 1.0,
    wheelScale: 1.0
  },
  {
    id: 'racer',
    name: 'Racer',
    bodyColor: '#e63946',
    bodyStroke: '#a11d2a',
    wheelColor: '#1a1a1a',
    hubColor: '#c0c0c0',
    widthScale: 1.25,
    heightScale: 0.7,
    wheelScale: 0.85
  },
  {
    id: 'monster',
    name: 'Monster',
    bodyColor: '#27ae60',
    bodyStroke: '#1e8449',
    wheelColor: '#1a1a1a',
    hubColor: '#555',
    widthScale: 1.1,
    heightScale: 1.2,
    wheelScale: 1.4
  },
  {
    id: 'cruiser',
    name: 'Cruiser',
    bodyColor: '#e67e22',
    bodyStroke: '#a04000',
    wheelColor: '#f5f5dc',
    hubColor: '#d4a056',
    widthScale: 1.15,
    heightScale: 1.1,
    wheelScale: 1.1
  },
  {
    id: 'mini',
    name: 'Mini',
    bodyColor: '#ff69b4',
    bodyStroke: '#c71585',
    wheelColor: '#4a4a4a',
    hubColor: '#aaa',
    widthScale: 0.75,
    heightScale: 0.85,
    wheelScale: 0.8
  },
  {
    id: 'tank',
    name: 'Tank',
    bodyColor: '#5d6d7e',
    bodyStroke: '#2c3e50',
    wheelColor: '#1c2833',
    hubColor: '#566573',
    widthScale: 1.3,
    heightScale: 1.3,
    wheelScale: 1.2
  }
];

interface WaterParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

interface AtmosphereCloud {
  x: number;
  y: number;
  radiusX: number;
  radiusY: number;
  speed: number;
  drift: number;
  phase: number;
  alpha: number;
}

interface SpeedStreak {
  baseX: number;
  baseY: number;
  length: number;
  width: number;
  speed: number;
  sway: number;
  phase: number;
}

interface CarComposite {
  composite: Matter.Composite;
  body: Matter.Body;
  wheelA: Matter.Body;
  wheelB: Matter.Body;
  // Store original dimensions for rendering (bounds change when rotated)
  bodyWidth: number;
  bodyHeight: number;
  wheelRadius: number;
  // Car style
  style: CarStyle;
}

type GamePhase = 'start' | 'playing' | 'gameOver';

// ============================================================================
// CONSTANTS
// ============================================================================

// Car dimensions (scaled based on screen)
const CAR_WIDTH = 120;
const CAR_HEIGHT = 30;
const WHEEL_SIZE = 25;

const BAR_LENGTH_RATIO = 0.65;
const BAR_THICKNESS = 12;
const TILT_SPEED = 0.015;          // Smooth rotation
// No max tilt - bar can rotate 360 degrees

// Bomb settings
const BOMB_START_TIME = 30000;      // 30 seconds before bombs start
const BOMB_WARNING_TIME = 1500;     // 1.5 seconds warning
const BOMB_RADIUS = 18;
const BOMB_INITIAL_INTERVAL = 6000;
const BOMB_MIN_INTERVAL = 2500;

// Water settings
const WATER_HEIGHT_RATIO = 0.15;
const WAVE_AMPLITUDE = 8;
const WAVE_FREQUENCY = 0.02;

// Colors (hand-drawn theme)
const COLORS = {
  carBody: '#e63946',
  carBodyStroke: '#222',
  wheel: '#1a1a1a',
  wheelHub: '#666',
  wheelSpoke: '#888',
  wheelCenter: '#aaa',
  bar: '#1a1a1a',
  barStroke: '#1a1a1a',
  pivot: '#222',
};

// Sky color options - vibrant, fun colors
const SKY_COLORS = [
  '#87CEEB', // Classic sky blue
  '#7EC8E3', // Soft cyan blue
  '#E8A87C', // Warm peach/orange
  '#C9A0DC', // Soft lavender purple
  '#B19CD9', // Light purple
  '#D4A574', // Warm tan/brown
  '#98D8C8', // Mint green
  '#F7B7A3', // Coral/salmon
];

let currentSkyColor = SKY_COLORS[0];

function darkenColor(hex: string, amount: number): string {
  const value = parseInt(hex.slice(1), 16);
  const red = Math.max(0, ((value >> 16) & 255) - amount);
  const green = Math.max(0, ((value >> 8) & 255) - amount);
  const blue = Math.max(0, (value & 255) - amount);
  return '#' + ((red << 16) | (green << 8) | blue).toString(16).padStart(6, '0');
}

function lightenColor(hex: string, amount: number): string {
  const value = parseInt(hex.slice(1), 16);
  const red = Math.min(255, ((value >> 16) & 255) + amount);
  const green = Math.min(255, ((value >> 8) & 255) + amount);
  const blue = Math.min(255, (value & 255) + amount);
  return '#' + ((red << 16) | (green << 8) | blue).toString(16).padStart(6, '0');
}

// ============================================================================
// GAME STATE
// ============================================================================

let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;

let engine: Matter.Engine;
let world: Matter.World;

let gamePhase: GamePhase = 'start';
let gameTime = 0;
let lastTime = 0;
let targetBarAngle = 0;

let car: CarComposite;
let barBody: Matter.Body;

let bombs: Bomb[] = [];
let explosions: Explosion[] = [];
let nextBombTime = BOMB_START_TIME;

// Audio
let audioContext: AudioContext | null = null;
let themeMusic: HTMLAudioElement | null = null;
let gameOverMusic: HTMLAudioElement | null = null;
let waterParticles: WaterParticle[] = [];
let atmosphereClouds: AtmosphereCloud[] = [];
let speedStreaks: SpeedStreak[] = [];

let holdingLeft = false;
let holdingRight = false;

// Layout calculations
let w = 0;
let h = 0;
let pivotX = 0;
let pivotY = 0;
let barLength = 0;
let waterLevel = 0;
let isMobile = false;
let selectedCarStyle: CarStyle = CAR_STYLES[0];

// ============================================================================
// CAR COMPOSITE CREATION
// ============================================================================

/**
 * Creates a composite with a proper car setup of bodies and constraints.
 * Based on the official Matter.js car example.
 * @param xx - X position for car center
 * @param yy - Y position for car center
 * @param width - Width of car body
 * @param height - Height of car body
 * @param wheelSize - Radius of wheels
 * @returns CarComposite with composite, body, wheelA, and wheelB references
 */
function createCar(xx: number, yy: number, width: number, height: number, wheelSize: number, style: CarStyle): CarComposite {
  console.log('[createCar] Creating car at', xx, yy, 'size:', width, 'x', height, 'wheels:', wheelSize, 'style:', style.name);
  
  // Create a collision group so car parts don't collide with each other
  const group = Body.nextGroup(true);
  
  // Wheel positioning - wheels at bottom of car body
  const wheelBase = width * 0.35;
  const wheelAOffset = -wheelBase;
  const wheelBOffset = wheelBase;
  // Position wheels below the body center so they touch the ground
  const wheelYOffset = height * 0.3;
  
  // Create the car composite
  const carComposite = Composite.create({ label: 'Car' });
  
  // Car body - rectangle with chamfer (rounded corners)
  // Very heavy car with minimal air friction = maximum inertia
  const body = Bodies.rectangle(xx, yy, width, height, {
    collisionFilter: {
      group: group
    },
    chamfer: {
      radius: height * 0.5
    },
    density: 0.025,     // Extra heavy - hard to stop once moving
    friction: 0.3,
    frictionAir: 0.001, // Minimal air resistance - maintains momentum
    label: 'carBody',
    render: {
      fillStyle: COLORS.carBody
    }
  });
  
  // Front wheel (right side)
  const wheelA = Bodies.circle(xx + wheelAOffset, yy + wheelYOffset, wheelSize, {
    collisionFilter: {
      group: group
    },
    friction: 0.05,
    frictionStatic: 0.01,
    frictionAir: 0.0005,  // Very low air resistance
    restitution: 0.05,
    density: 0.03,        // Heavy wheels - lots of inertia
    label: 'wheelA'
  });
  
  // Rear wheel (left side)
  const wheelB = Bodies.circle(xx + wheelBOffset, yy + wheelYOffset, wheelSize, {
    collisionFilter: {
      group: group
    },
    friction: 0.05,
    frictionStatic: 0.01,
    frictionAir: 0.0005,  // Very low air resistance
    restitution: 0.05,
    density: 0.03,        // Heavy wheels - lots of inertia
    label: 'wheelB'
  });
  
  // Axle constraints - connect wheels to body with stiff springs
  const axelA = Constraint.create({
    bodyB: body,
    pointB: { x: wheelAOffset, y: wheelYOffset },
    bodyA: wheelA,
    stiffness: 1,
    length: 0,
    render: {
      visible: false
    }
  });
  
  const axelB = Constraint.create({
    bodyB: body,
    pointB: { x: wheelBOffset, y: wheelYOffset },
    bodyA: wheelB,
    stiffness: 1,
    length: 0,
    render: {
      visible: false
    }
  });
  
  // Add all parts to the composite
  Composite.add(carComposite, [body, wheelA, wheelB, axelA, axelB]);
  
  return {
    composite: carComposite,
    body: body,
    wheelA: wheelA,
    wheelB: wheelB,
    // Store fixed dimensions for rendering
    bodyWidth: width,
    bodyHeight: height,
    wheelRadius: wheelSize,
    style: style
  };
}

// ============================================================================
// INITIALIZATION
// ============================================================================

function init(): void {
  console.log('[init] Starting Car Balance game with Matter.js physics');
  
  canvas = document.getElementById('game') as HTMLCanvasElement;
  ctx = canvas.getContext('2d')!;
  
  isMobile = window.matchMedia('(pointer: coarse)').matches;
  
  // Set up resize handler
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();
  
  // Set up input handlers
  setupInputHandlers();
  
  // Set up UI handlers
  setupUIHandlers();
  refreshSettingsUI();
  setSettingsButtonVisible(false);
  
  // Initialize physics
  initPhysics();
  
  // Initialize audio
  audioContext = null;
  
  // Load theme music
  themeMusic = new Audio('https://oasiz-assets.vercel.app/audio/balance.mp3');
  themeMusic.loop = true;
  themeMusic.volume = 0.3;
  
  // Load game over music
  gameOverMusic = new Audio('https://oasiz-assets.vercel.app/audio/car-balance/gameover.mp3');
  gameOverMusic.loop = false;
  gameOverMusic.volume = 0.4;
  
  // Start game loop
  requestAnimationFrame(gameLoop);
}

function initPhysics(): void {
  console.log('[initPhysics] Creating Matter.js engine with car composite');
  
  // Recalculate layout to ensure values are current
  w = window.innerWidth;
  h = window.innerHeight;
  pivotX = w / 2;
  pivotY = h * 0.5;
  // Use wider bar on mobile for better gameplay
  const mobileBarRatio = isMobile ? 0.9 : BAR_LENGTH_RATIO;
  barLength = Math.min(w * mobileBarRatio, 550);
  waterLevel = h * (1 - WATER_HEIGHT_RATIO);
  
  // Create engine with moderate gravity
  engine = Engine.create({
    gravity: { x: 0, y: 1.5 }
  });
  world = engine.world;
  
  // Create the seesaw bar (static but we'll rotate it manually)
  barBody = Bodies.rectangle(pivotX, pivotY, barLength, BAR_THICKNESS, {
    isStatic: true,
    friction: 0.02,       // Almost frictionless - car rolls immediately
    frictionStatic: 0.005, // Near-zero static - any tilt causes movement
    restitution: 0.0,
    label: 'bar',
    chamfer: {
      radius: 2
    }
  });
  
  // Scale car based on screen size and selected style
  const scale = isMobile ? 0.7 : 0.9;
  const carWidth = CAR_WIDTH * scale * selectedCarStyle.widthScale;
  const carHeight = CAR_HEIGHT * scale * selectedCarStyle.heightScale;
  const wheelSize = WHEEL_SIZE * scale * selectedCarStyle.wheelScale;
  
  // Create the car composite - positioned slightly above the bar to drop down
  // The drop height should be modest so the car lands gently
  const dropHeight = wheelSize * 4;
  car = createCar(pivotX, pivotY - dropHeight, carWidth, carHeight, wheelSize, selectedCarStyle);
  
  // Add everything to the world
  World.add(world, barBody);
  World.add(world, car.composite);
  
  // Set up collision detection
  Events.on(engine, 'collisionStart', handleCollision);
  
  console.log('[initPhysics] Bar at', pivotX, pivotY, 'length:', barLength);
  console.log('[initPhysics] Car starting at', pivotX, pivotY - dropHeight);
}

function handleCollision(event: Matter.IEventCollision<Matter.Engine>): void {
  for (const pair of event.pairs) {
    const labels = [pair.bodyA.label, pair.bodyB.label];
    
    // Check for bomb-car collision
    if (labels.includes('bomb') && (labels.includes('carBody') || labels.includes('wheelA') || labels.includes('wheelB'))) {
      console.log('[handleCollision] Bomb hit car! Game over.');
      
      // Find which body is the bomb
      const bombBody = pair.bodyA.label === 'bomb' ? pair.bodyA : pair.bodyB;
      
      // Create explosion at bomb position
      createExplosion(bombBody.position.x, bombBody.position.y);
      triggerGameHaptic('heavy');
      
      // Mark bomb as exploded and remove from world
      for (const bomb of bombs) {
        if (bomb.body === bombBody) {
          bomb.exploded = true;
          World.remove(world, bomb.body);
          break;
        }
      }
      
      // End the game - bomb hit the car!
      endGame();
      return;
    }
  }
}

function resetPhysics(): void {
  console.log('[resetPhysics] Resetting physics world');
  
  // Clear events
  Events.off(engine, 'collisionStart', handleCollision);
  
  // Clear the world
  World.clear(world, false);
  Engine.clear(engine);
  
  // Reinitialize
  initPhysics();
}

function resizeCanvas(): void {
  w = window.innerWidth;
  h = window.innerHeight;
  canvas.width = w;
  canvas.height = h;
  
  // Calculate layout
  pivotX = w / 2;
  pivotY = h * 0.5;
  // Use wider bar on mobile for better gameplay
  const mobileRatio = isMobile ? 0.9 : BAR_LENGTH_RATIO;
  barLength = Math.min(w * mobileRatio, 550);
  waterLevel = h * (1 - WATER_HEIGHT_RATIO);
  
  console.log('[resizeCanvas] Canvas resized to', w, 'x', h);
  
  // Update bar position if it exists
  if (barBody) {
    Body.setPosition(barBody, { x: pivotX, y: pivotY });
    // Re-scale the bar (would need to recreate it for proper scaling)
  }

  rebuildVisualAtmosphere();
}

function rebuildVisualAtmosphere(): void {
  atmosphereClouds = [];
  speedStreaks = [];

  const cloudCount = Math.max(7, Math.floor(Math.min(w, h) / 110));
  for (let i = 0; i < cloudCount; i++) {
    atmosphereClouds.push({
      x: Math.random() * w,
      y: Math.random() * h,
      radiusX: 45 + Math.random() * 140,
      radiusY: 18 + Math.random() * 62,
      speed: 3 + Math.random() * 12,
      drift: 0.18 + Math.random() * 0.45,
      phase: Math.random() * Math.PI * 2,
      alpha: 0.05 + Math.random() * 0.12
    });
  }

  const streakCount = Math.max(14, Math.floor(Math.min(w, h) / 40));
  for (let i = 0; i < streakCount; i++) {
    speedStreaks.push({
      baseX: Math.random() * w,
      baseY: Math.random() * h,
      length: 30 + Math.random() * 95,
      width: 1 + Math.random() * 2.2,
      speed: 0.7 + Math.random() * 1.8,
      sway: 6 + Math.random() * 18,
      phase: Math.random() * Math.PI * 2
    });
  }
}

// ============================================================================
// INPUT HANDLING
// ============================================================================

function setupInputHandlers(): void {
  // Keyboard
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const settingsModal = document.getElementById('settings-modal');
      if (settingsModal && !settingsModal.classList.contains('ui-hidden')) {
        closeSettingsModal();
        return;
      }
    }
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
      holdingLeft = true;
    }
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
      holdingRight = true;
    }
  });
  
  window.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
      holdingLeft = false;
    }
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
      holdingRight = false;
    }
  });
  
  // Touch/Mouse for control buttons
  const btnLeft = document.getElementById('btn-left')!;
  const btnRight = document.getElementById('btn-right')!;
  
  // Left button - tilts beam so left side goes DOWN (holdingRight action)
  btnLeft.addEventListener('mousedown', () => { holdingRight = true; btnLeft.classList.add('active'); triggerGameHaptic('light'); });
  btnLeft.addEventListener('mouseup', () => { holdingRight = false; btnLeft.classList.remove('active'); });
  btnLeft.addEventListener('mouseleave', () => { holdingRight = false; btnLeft.classList.remove('active'); });
  btnLeft.addEventListener('touchstart', (e) => { e.preventDefault(); holdingRight = true; btnLeft.classList.add('active'); triggerGameHaptic('light'); }, { passive: false });
  btnLeft.addEventListener('touchend', () => { holdingRight = false; btnLeft.classList.remove('active'); });
  btnLeft.addEventListener('touchcancel', () => { holdingRight = false; btnLeft.classList.remove('active'); });
  
  // Right button - tilts beam so right side goes DOWN (holdingLeft action)
  btnRight.addEventListener('mousedown', () => { holdingLeft = true; btnRight.classList.add('active'); triggerGameHaptic('light'); });
  btnRight.addEventListener('mouseup', () => { holdingLeft = false; btnRight.classList.remove('active'); });
  btnRight.addEventListener('mouseleave', () => { holdingLeft = false; btnRight.classList.remove('active'); });
  btnRight.addEventListener('touchstart', (e) => { e.preventDefault(); holdingLeft = true; btnRight.classList.add('active'); triggerGameHaptic('light'); }, { passive: false });
  btnRight.addEventListener('touchend', () => { holdingLeft = false; btnRight.classList.remove('active'); });
  btnRight.addEventListener('touchcancel', () => { holdingLeft = false; btnRight.classList.remove('active'); });
}

// ============================================================================
// UI HANDLING
// ============================================================================

function setupUIHandlers(): void {
  const startBtn = document.getElementById('start-btn')!;
  const restartBtn = document.getElementById('restart-btn')!;
  const galleryBtn = document.getElementById('gallery-btn')!;
  const backBtn = document.getElementById('back-btn')!;
  const settingsBtn = document.getElementById('settings-btn') as HTMLButtonElement;
  const settingsModal = document.getElementById('settings-modal') as HTMLElement;
  const settingsClose = document.getElementById('settings-close') as HTMLButtonElement;
  const musicToggle = document.getElementById('music-toggle') as HTMLButtonElement;
  const fxToggle = document.getElementById('fx-toggle') as HTMLButtonElement;
  const hapticsToggle = document.getElementById('haptics-toggle') as HTMLButtonElement;

  startBtn.addEventListener('click', () => {
    triggerGameHaptic('light');
    startGame();
  });
  restartBtn.addEventListener('click', () => {
    triggerGameHaptic('light');
    restartGame();
  });
  galleryBtn.addEventListener('click', () => {
    triggerGameHaptic('light');
    openGallery();
  });
  backBtn.addEventListener('click', () => {
    triggerGameHaptic('light');
    closeGallery();
  });
  settingsBtn.addEventListener('click', () => {
    triggerGameHaptic('light');
    openSettingsModal();
  });
  settingsClose.addEventListener('click', () => {
    triggerGameHaptic('light');
    closeSettingsModal();
  });
  settingsModal.addEventListener('click', (event) => {
    if (event.target === settingsModal) {
      closeSettingsModal();
    }
  });
  musicToggle.addEventListener('click', () => {
    settings.music = !settings.music;
    saveSettings();
    refreshSettingsUI();
    applySettings();
    triggerGameHaptic('light');
  });
  fxToggle.addEventListener('click', () => {
    settings.fx = !settings.fx;
    saveSettings();
    refreshSettingsUI();
    triggerGameHaptic('light');
  });
  hapticsToggle.addEventListener('click', () => {
    settings.haptics = !settings.haptics;
    saveSettings();
    refreshSettingsUI();
    if (settings.haptics) {
      triggerGameHaptic('light');
    }
  });
  
  // Initialize gallery with car options
  initGallery();
}

function initGallery(): void {
  const grid = document.getElementById('gallery-grid')!;
  grid.innerHTML = '';
  
  CAR_STYLES.forEach((style) => {
    const option = document.createElement('div');
    option.className = 'car-option' + (style.id === selectedCarStyle.id ? ' selected' : '');
    option.dataset.carId = style.id;
    
    // Create mini canvas for car preview
    const canvas = document.createElement('canvas');
    canvas.width = 70;
    canvas.height = 40;
    drawCarPreview(canvas, style, 0.7);
    
    const name = document.createElement('div');
    name.className = 'car-name';
    name.textContent = style.name;
    
    option.appendChild(canvas);
    option.appendChild(name);
    
    option.addEventListener('click', () => selectCar(style));
    
    grid.appendChild(option);
  });
  
  // Update the large preview
  updatePreview();
}

function updatePreview(): void {
  const previewCanvas = document.getElementById('preview-canvas') as HTMLCanvasElement;
  const previewName = document.getElementById('preview-name')!;
  
  // Clear and redraw preview
  const ctx = previewCanvas.getContext('2d')!;
  ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
  drawCarPreview(previewCanvas, selectedCarStyle, 1.5);
  
  previewName.textContent = selectedCarStyle.name;
}

function drawCarPreview(canvas: HTMLCanvasElement, style: CarStyle, scale: number): void {
  const ctx = canvas.getContext('2d')!;
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2 + 5;
  
  // Scale dimensions for preview
  const baseWidth = 40 * scale;
  const baseHeight = 12 * scale;
  const baseWheel = 8 * scale;
  
  const bodyWidth = baseWidth * style.widthScale;
  const bodyHeight = baseHeight * style.heightScale;
  const wheelRadius = baseWheel * style.wheelScale;
  const wheelBase = bodyWidth * 0.38;
  const wheelY = centerY + wheelRadius * 0.3;
  
  // Draw shadow
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath();
  ctx.ellipse(centerX, centerY + wheelRadius + 3, bodyWidth * 0.45, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Draw left wheel
  ctx.fillStyle = style.wheelColor;
  ctx.beginPath();
  ctx.arc(centerX - wheelBase, wheelY, wheelRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#222';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = style.hubColor;
  ctx.beginPath();
  ctx.arc(centerX - wheelBase, wheelY, wheelRadius * 0.45, 0, Math.PI * 2);
  ctx.fill();
  
  // Draw right wheel
  ctx.fillStyle = style.wheelColor;
  ctx.beginPath();
  ctx.arc(centerX + wheelBase, wheelY, wheelRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#222';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = style.hubColor;
  ctx.beginPath();
  ctx.arc(centerX + wheelBase, wheelY, wheelRadius * 0.45, 0, Math.PI * 2);
  ctx.fill();
  
  // Draw body (on top of wheels)
  ctx.fillStyle = style.bodyColor;
  ctx.beginPath();
  ctx.roundRect(centerX - bodyWidth / 2, centerY - bodyHeight, bodyWidth, bodyHeight, bodyHeight / 3);
  ctx.fill();
  ctx.strokeStyle = style.bodyStroke;
  ctx.lineWidth = 2.5;
  ctx.stroke();
}

function selectCar(style: CarStyle): void {
  console.log('[selectCar] Selected:', style.name);
  selectedCarStyle = style;
  
  // Update selection UI
  document.querySelectorAll('.car-option').forEach((el) => {
    el.classList.toggle('selected', (el as HTMLElement).dataset.carId === style.id);
  });
  
  // Update the large preview
  updatePreview();
}

function openGallery(): void {
  console.log('[openGallery] Opening gallery');
  document.getElementById('game-over')!.classList.add('hidden');
  document.getElementById('gallery')!.classList.remove('hidden');
  
  // Refresh gallery to update selection
  initGallery();
}

function closeGallery(): void {
  console.log('[closeGallery] Closing gallery');
  document.getElementById('gallery')!.classList.add('hidden');
  document.getElementById('game-over')!.classList.remove('hidden');
}

function startGame(): void {
  console.log('[startGame] Starting game');
  
  gamePhase = 'playing';
  gameTime = 0;
  
  // Start theme music
  if (themeMusic && isMusicEnabled()) {
    themeMusic.currentTime = 0;
    themeMusic.play().catch(() => {});
  } else if (themeMusic) {
    themeMusic.pause();
  }
  // Stop game over music if playing
  if (gameOverMusic) {
    gameOverMusic.pause();
    gameOverMusic.currentTime = 0;
  }
  
  // Randomize sky color
  currentSkyColor = SKY_COLORS[Math.floor(Math.random() * SKY_COLORS.length)];
  console.log('[startGame] Sky color:', currentSkyColor);
  rebuildVisualAtmosphere();
  
  // Reset physics accumulators
  hiddenBias = (Math.random() - 0.5) * 0.002; // Start with random hidden bias
  velocityAccumulator = 0;
  // Start with small tilt - gives player time to react
  targetBarAngle = (Math.random() > 0.5 ? 1 : -1) * 0.05;
  bombs = [];
  explosions = [];
  nextBombTime = BOMB_START_TIME;
  waterParticles = [];
  lastTime = performance.now();
  
  // Reset input states
  holdingLeft = false;
  holdingRight = false;
  
  // Reset physics
  resetPhysics();
  
  // Apply initial tilt to bar
  Body.setAngle(barBody, targetBarAngle);
  
  // Show HUD and controls
  document.getElementById('start-screen')!.classList.add('hidden');
  document.getElementById('hud')!.classList.remove('hidden');
  setSettingsButtonVisible(true);
  closeSettingsModal();
  if (isMobile) {
    document.getElementById('controls')!.classList.remove('hidden');
  }
}

function restartGame(): void {
  console.log('[restartGame] Restarting game');
  
  document.getElementById('game-over')!.classList.add('hidden');
  startGame();
}

function playSplashSound(): void {
  if (!isFxEnabled()) return;
  try {
    // Create audio context if needed
    if (!audioContext) {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    const ctx = audioContext;
    const now = ctx.currentTime;
    
    // Cute "doink" sound - bouncy spring effect
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    
    // High pitched bounce - starts high, dips, then settles
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(800, now);
    osc1.frequency.exponentialRampToValueAtTime(300, now + 0.08);
    osc1.frequency.exponentialRampToValueAtTime(500, now + 0.12);
    osc1.frequency.exponentialRampToValueAtTime(200, now + 0.2);
    
    gain1.gain.setValueAtTime(0.35, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
    
    osc1.start(now);
    osc1.stop(now + 0.25);
    
    // Add a cute "bloop" overtone
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1200, now);
    osc2.frequency.exponentialRampToValueAtTime(400, now + 0.1);
    
    gain2.gain.setValueAtTime(0.15, now);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
    
    osc2.start(now);
    osc2.stop(now + 0.12);
    
    console.log('[playSplashSound] Playing doink sound');
  } catch (e) {
    console.log('[playSplashSound] Audio not available');
  }
}

function endGame(): void {
  console.log('[endGame] Game over at', (gameTime / 1000).toFixed(1), 'seconds');
  
  gamePhase = 'gameOver';
  triggerGameHaptic('error');
  
  // Stop theme music
  if (themeMusic) {
    themeMusic.pause();
  }
  
  // Play splash sound
  playSplashSound();
  
  // Play game over music after a short delay
  setTimeout(() => {
    if (gameOverMusic && isMusicEnabled()) {
      gameOverMusic.currentTime = 0;
      gameOverMusic.play().catch(() => {});
    } else if (gameOverMusic) {
      gameOverMusic.pause();
    }
  }, 500);
  
  // Submit score
  const score = Math.floor(gameTime / 100); // Score in tenths of seconds
  if (typeof (window as any).submitScore === 'function') {
    (window as any).submitScore(score);
  }
  
  // Create splash particles at car position
  createSplash(car.body.position.x, waterLevel);
  
  // Update UI
  document.getElementById('hud')!.classList.add('hidden');
  document.getElementById('controls')!.classList.add('hidden');
  setSettingsButtonVisible(false);
  document.getElementById('final-time')!.textContent = (gameTime / 1000).toFixed(1) + 's';
  
  // Delay showing game over screen for splash effect
  setTimeout(() => {
    document.getElementById('game-over')!.classList.remove('hidden');
  }, 800);
}

// ============================================================================
// GAME LOOP
// ============================================================================

function gameLoop(currentTime: number): void {
  // Handle first frame or large time gaps
  if (lastTime === 0 || currentTime - lastTime > 100) {
    lastTime = currentTime;
  }
  
  const deltaTime = Math.min(currentTime - lastTime, 16.667); // Cap delta for smooth physics
  lastTime = currentTime;
  
  update(deltaTime);
  render();
  
  requestAnimationFrame(gameLoop);
}

function update(dt: number): void {
  if (gamePhase === 'playing') {
    gameTime += dt;
    
    // Update bar angle based on input
    updateBarAngle(dt);
    
    // Apply rolling force to car based on tilt (game feel, not physics)
    applyRollingForce();
    
    // Update physics engine (use fixed timestep for stability)
    const fixedDelta = Math.min(dt, 16.667);
    Engine.update(engine, fixedDelta);
    
    // Update bombs
    updateBombs(dt);
    
    // Check for game over conditions
    checkGameOver();
    
    // Update timer display
    document.getElementById('timer')!.textContent = (gameTime / 1000).toFixed(1) + 's';
  }
  
  // Always update water particles (for game over splash)
  updateWaterParticles(dt);
}

function updateBarAngle(dt: number): void {
  const currentAngle = barBody.angle;
  
  // Dead zone around center - makes it impossible to balance perfectly
  const DEAD_ZONE = 0.03; // About 1.7 degrees
  
  // Apply tilt based on input - bar stays where it is when no key is pressed
  let newAngle = currentAngle;
  
  if (holdingLeft && !holdingRight) {
    // Tilt left (positive angle)
    newAngle = currentAngle + TILT_SPEED;
    
    // Skip over the dead zone when crossing from negative to positive
    if (currentAngle < -DEAD_ZONE && newAngle >= -DEAD_ZONE) {
      newAngle = DEAD_ZONE;
    }
  } else if (holdingRight && !holdingLeft) {
    // Tilt right (negative angle)
    newAngle = currentAngle - TILT_SPEED;
    
    // Skip over the dead zone when crossing from positive to negative
    if (currentAngle > DEAD_ZONE && newAngle <= DEAD_ZONE) {
      newAngle = -DEAD_ZONE;
    }
  }
  // If no key pressed, bar stays at current angle (no auto-centering)
  // No max tilt - bar can rotate freely 360 degrees
  
  // Rotate bar around pivot point
  Body.setAngle(barBody, newAngle);
  Body.setPosition(barBody, { x: pivotX, y: pivotY });
  
  // No angular velocity - just set the angle directly
  // This prevents the bar from "pushing" the car when rotating
  Body.setAngularVelocity(barBody, 0);
}

// Hidden bias - even when bar looks level, car will roll in this direction
let hiddenBias = 0;
// Velocity accumulator - acceleration builds up over time
let velocityAccumulator = 0;

function applyRollingForce(): void {
  if (!car || !barBody) return;
  
  const angle = barBody.angle;
  
  // Hidden bias that changes randomly - even a "level" bar has a secret slope
  hiddenBias += (Math.random() - 0.5) * 0.0001;
  hiddenBias *= 0.995;
  hiddenBias = Math.max(-0.003, Math.min(0.003, hiddenBias));
  
  // Effective angle includes hidden bias
  const effectiveAngle = angle + hiddenBias;
  
  // Strong acceleration from tilt - car picks up speed quickly
  const tiltAcceleration = Math.sin(effectiveAngle) * 0.0008;
  
  // Velocity builds up fast, decays slowly (high inertia feel)
  velocityAccumulator += tiltAcceleration;
  velocityAccumulator *= 0.998; // Very slow decay = more inertia
  velocityAccumulator = Math.max(-0.015, Math.min(0.015, velocityAccumulator));
  
  // Position amplifier - runaway effect
  const distFromCenter = (car.body.position.x - pivotX) / barLength;
  const positionMultiplier = 1 + Math.abs(distFromCenter) * 2.5;
  
  // Minimum force - car is NEVER perfectly still
  const minForce = (Math.random() > 0.5 ? 1 : -1) * 0.0002;
  
  // Total force
  const totalForce = (velocityAccumulator * positionMultiplier) + minForce;
  
  // Apply force to car body
  Body.applyForce(car.body, car.body.position, { 
    x: totalForce, 
    y: 0 
  });
  
  // Apply to wheels
  Body.applyForce(car.wheelA, car.wheelA.position, { x: totalForce * 0.5, y: 0 });
  Body.applyForce(car.wheelB, car.wheelB.position, { x: totalForce * 0.5, y: 0 });
}

function updateBombs(dt: number): void {
  // Spawn new bombs after 30 seconds
  if (gameTime >= BOMB_START_TIME && gameTime >= nextBombTime) {
    spawnBomb();
    
    // Calculate next bomb time with increasing frequency
    const elapsed = gameTime - BOMB_START_TIME;
    const interval = Math.max(
      BOMB_MIN_INTERVAL,
      BOMB_INITIAL_INTERVAL - elapsed * 0.03
    );
    nextBombTime = gameTime + interval;
  }
  
  // Update existing bombs
  for (const bomb of bombs) {
    if (bomb.warningTime > 0) {
      bomb.warningTime -= dt;
      if (bomb.warningTime <= 0) {
        bomb.dropping = true;
        // Create physics body for bomb
        bomb.body = Bodies.circle(bomb.x, -50, BOMB_RADIUS, {
          friction: 0.5,
          restitution: 0.1,
          density: 0.008,
          label: 'bomb'
        });
        World.add(world, bomb.body);
      }
    } else if (bomb.dropping && !bomb.exploded && bomb.body) {
      bomb.y = bomb.body.position.y;
      const bombX = bomb.body.position.x;
      const bombY = bomb.body.position.y;
      
      // Calculate bar surface Y at bomb's X position
      const bombXRelativeToPivot = bombX - pivotX;
      const barSurfaceY = pivotY - Math.sin(barBody.angle) * bombXRelativeToPivot;
      
      // Check if bomb hit the bar
      if (bombY >= barSurfaceY - BOMB_RADIUS && 
          bombX >= pivotX - barLength / 2 && 
          bombX <= pivotX + barLength / 2) {
        // Bomb hit the bar - explode!
        createExplosion(bombX, bombY);
        bomb.exploded = true;
        World.remove(world, bomb.body);
        
        // Check if bomb explosion is close enough to the car
        const carDist = Math.sqrt(
          Math.pow(bombX - car.body.position.x, 2) + 
          Math.pow(bombY - car.body.position.y, 2)
        );
        
        // Explosion radius is larger than bomb - if car is within blast radius, game over
        const explosionRadius = BOMB_RADIUS * 3;
        if (carDist < explosionRadius + car.bodyWidth / 2) {
          // Bomb explosion hit the car - game over!
          console.log('[updateBombs] Bomb explosion hit the car! Distance:', carDist.toFixed(0));
          triggerGameHaptic('heavy');
          endGame();
          return;
        }
        continue;
      }
      
      // Check if bomb fell into water
      if (bombY > waterLevel) {
        createExplosion(bombX, waterLevel - 10);
        bomb.exploded = true;
        World.remove(world, bomb.body);
        createSplash(bombX, waterLevel);
      }
    }
  }
  
  // Update explosions
  for (const explosion of explosions) {
    explosion.time += dt;
  }
  explosions = explosions.filter(e => e.time < e.maxTime);
  
  // Remove old exploded bombs
  bombs = bombs.filter(b => !b.exploded);
}

function createExplosion(x: number, y: number): void {
  explosions.push({
    x,
    y,
    time: 0,
    maxTime: 500  // 500ms explosion animation
  });
}

function spawnBomb(): void {
  // Random position, biased toward where the car is
  const carBias = car.body.position.x * 0.3;
  const randomOffset = (Math.random() - 0.5) * barLength * 0.8;
  const x = Math.max(pivotX - barLength / 2 + 50, Math.min(pivotX + barLength / 2 - 50, carBias + pivotX * 0.7 + randomOffset));
  
  bombs.push({
    x,
    y: -50,
    warningTime: BOMB_WARNING_TIME,
    dropping: false,
    exploded: false,
    body: null,
  });
  
  console.log('[spawnBomb] Bomb spawned at x:', x.toFixed(0));
}

function checkGameOver(): void {
  // Check if any part of the car fell into water
  const lowestY = Math.max(car.body.position.y, car.wheelA.position.y, car.wheelB.position.y);
  
  if (lowestY > waterLevel) {
    endGame();
    return;
  }
  
  // Check if car went too far off screen
  if (car.body.position.x < -100 || car.body.position.x > w + 100) {
    endGame();
    return;
  }
}

// ============================================================================
// WATER EFFECTS
// ============================================================================

function createSplash(x: number, y: number): void {
  const particleCount = 30;
  for (let i = 0; i < particleCount; i++) {
    const angle = Math.PI + (Math.random() - 0.5) * Math.PI;
    const speed = 5 + Math.random() * 10;
    waterParticles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 5,
      life: 1,
      maxLife: 0.5 + Math.random() * 0.5,
    });
  }
}

function updateWaterParticles(dt: number): void {
  const dtSeconds = dt / 1000;
  
  for (const p of waterParticles) {
    p.vy += 15 * dtSeconds; // Gravity
    p.x += p.vx;
    p.y += p.vy;
    p.life -= dtSeconds / p.maxLife;
  }
  
  waterParticles = waterParticles.filter(p => p.life > 0);
}

// ============================================================================
// RENDERING
// ============================================================================

function render(): void {
  const time = performance.now() * 0.001;

  // Dynamic sky gradient
  const skyGradient = ctx.createLinearGradient(0, 0, 0, h);
  skyGradient.addColorStop(0, lightenColor(currentSkyColor, 28));
  skyGradient.addColorStop(0.6, currentSkyColor);
  skyGradient.addColorStop(1, darkenColor(currentSkyColor, 42));
  ctx.fillStyle = skyGradient;
  ctx.fillRect(0, 0, w, h);

  // Atmospheric top glow
  const skyGlow = ctx.createRadialGradient(
    w * 0.5 + Math.sin(time * 0.2) * w * 0.1,
    h * 0.12,
    0,
    w * 0.5,
    h * 0.15,
    Math.max(w, h) * 0.75
  );
  skyGlow.addColorStop(0, 'rgba(255,255,255,0.26)');
  skyGlow.addColorStop(0.55, 'rgba(255,255,255,0.08)');
  skyGlow.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = skyGlow;
  ctx.fillRect(0, 0, w, h);

  // Moving cloud layers
  if (atmosphereClouds.length > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (const cloud of atmosphereClouds) {
      const cloudX = cloud.x + Math.sin(time * cloud.drift + cloud.phase) * cloud.radiusX * 0.35;
      const cloudY = ((cloud.y + time * cloud.speed) % (h + cloud.radiusY * 2)) - cloud.radiusY;
      const cloudGlow = ctx.createRadialGradient(
        cloudX,
        cloudY,
        cloud.radiusX * 0.12,
        cloudX,
        cloudY,
        cloud.radiusX
      );
      cloudGlow.addColorStop(0, 'rgba(255,255,255,' + cloud.alpha + ')');
      cloudGlow.addColorStop(0.45, 'rgba(255,255,255,' + (cloud.alpha * 0.32) + ')');
      cloudGlow.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = cloudGlow;
      ctx.beginPath();
      ctx.ellipse(cloudX, cloudY, cloud.radiusX, cloud.radiusY, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  
  // Draw water
  drawWater();

  // Draw object shadows before geometry
  drawSceneShadows();
  
  // Draw seesaw
  drawSeesaw();
  
  // Draw bomb warnings and bombs
  drawBombs();
  
  // Draw car (using physics body positions)
  drawCar();
  
  // Draw water particles (on top)
  drawWaterParticles();

  drawPostFx();
}

function drawWater(): void {
  const time = performance.now() * 0.001;
  
  // Water gradient with depth
  const waterGradient = ctx.createLinearGradient(0, waterLevel - 20, 0, h);
  waterGradient.addColorStop(0, '#5ca8d8');
  waterGradient.addColorStop(0.35, '#4a90c2');
  waterGradient.addColorStop(1, '#2a5f89');
  ctx.fillStyle = waterGradient;
  ctx.beginPath();
  ctx.moveTo(-10, h);
  
  // Draw wave top - extend past edges to ensure full coverage
  for (let x = -10; x <= w + 10; x += 8) {
    const waveY = waterLevel + Math.sin(x * WAVE_FREQUENCY + time * 1.5) * WAVE_AMPLITUDE;
    ctx.lineTo(x, waveY);
  }
  
  ctx.lineTo(w + 10, h);
  ctx.closePath();
  ctx.fill();

  // Surface shimmer
  const shimmer = ctx.createLinearGradient(0, waterLevel - 10, 0, waterLevel + 20);
  shimmer.addColorStop(0, 'rgba(255,255,255,0.35)');
  shimmer.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = shimmer;
  ctx.fillRect(-10, waterLevel - 10, w + 20, 30);
  
  // Draw wavy outline on top
  ctx.strokeStyle = '#222';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-10, waterLevel + Math.sin((-10) * WAVE_FREQUENCY + time * 1.5) * WAVE_AMPLITUDE);
  
  for (let x = -10; x <= w + 10; x += 8) {
    const waveY = waterLevel + Math.sin(x * WAVE_FREQUENCY + time * 1.5) * WAVE_AMPLITUDE;
    ctx.lineTo(x, waveY);
  }
  ctx.stroke();

  // Foam streak detail
  ctx.save();
  ctx.globalAlpha = 0.45;
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineCap = 'round';
  for (let i = 0; i < speedStreaks.length; i++) {
    const streak = speedStreaks[i];
    const phase = time * (1.1 + streak.speed * 0.7) + streak.phase;
    const y = waterLevel + Math.sin(phase) * 5 + (i % 3) * 5;
    const x = ((streak.baseX + phase * 70) % (w + 80)) - 40;
    const len = 12 + streak.length * 0.18;
    ctx.lineWidth = 1 + streak.width * 0.35;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + len, y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawSeesaw(): void {
  ctx.save();
  ctx.translate(pivotX, pivotY);

  // Grounded shadow for the bar
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath();
  ctx.ellipse(0, barLength * 0.02, barLength * 0.4, BAR_THICKNESS * 1.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  
  // Draw pivot - straight vertical line extending into the ocean (T shape)
  ctx.strokeStyle = COLORS.pivot;
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  
  // Line extends from pivot down to bottom of screen
  const lineLength = h - pivotY + 20; // Goes past the bottom
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, lineLength);
  ctx.stroke();
  
  // Draw bar - solid black
  ctx.rotate(barBody.angle);
  
  // Bar fill - solid black
  ctx.fillStyle = COLORS.bar;
  ctx.beginPath();
  ctx.roundRect(-barLength / 2, -BAR_THICKNESS / 2, barLength, BAR_THICKNESS, 3);
  ctx.fill();

  // Bar edge highlight
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-barLength / 2 + 8, -BAR_THICKNESS / 2 + 2);
  ctx.lineTo(barLength / 2 - 8, -BAR_THICKNESS / 2 + 2);
  ctx.stroke();
  
  ctx.restore();
}

function drawBombs(): void {
  // Draw explosions first (behind bombs)
  for (const explosion of explosions) {
    const progress = explosion.time / explosion.maxTime;
    const size = 30 + progress * 60;
    const alpha = 1 - progress;
    
    // Outer explosion (orange/yellow)
    const gradient = ctx.createRadialGradient(
      explosion.x, explosion.y, 0,
      explosion.x, explosion.y, size
    );
    gradient.addColorStop(0, 'rgba(255, 200, 50, ' + alpha + ')');
    gradient.addColorStop(0.4, 'rgba(255, 100, 20, ' + (alpha * 0.8) + ')');
    gradient.addColorStop(0.7, 'rgba(200, 50, 0, ' + (alpha * 0.5) + ')');
    gradient.addColorStop(1, 'rgba(100, 20, 0, 0)');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(explosion.x, explosion.y, size, 0, Math.PI * 2);
    ctx.fill();
    
    // Inner bright core
    if (progress < 0.3) {
      ctx.fillStyle = 'rgba(255, 255, 200, ' + (alpha * 1.5) + ')';
      ctx.beginPath();
      ctx.arc(explosion.x, explosion.y, size * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  
  for (const bomb of bombs) {
    // Draw warning indicator - extends to current bar position
    if (bomb.warningTime > 0) {
      const flash = Math.sin(performance.now() * 0.015) > 0;
      
      // Calculate where bar surface is at bomb's X position
      const bombXRelativeToPivot = bomb.x - pivotX;
      const barSurfaceY = pivotY - Math.sin(barBody.angle) * bombXRelativeToPivot;
      
      // Draw warning line from top to bar (dashed)
      ctx.strokeStyle = flash ? '#ff4444' : '#cc3333';
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 10]);
      ctx.beginPath();
      ctx.moveTo(bomb.x, 30);
      ctx.lineTo(bomb.x, barSurfaceY - 10);
      ctx.stroke();
      ctx.setLineDash([]);

      // Warning beam glow
      const warningGlow = ctx.createLinearGradient(bomb.x, 20, bomb.x, barSurfaceY);
      warningGlow.addColorStop(0, 'rgba(255,80,80,0)');
      warningGlow.addColorStop(0.5, 'rgba(255,80,80,0.18)');
      warningGlow.addColorStop(1, 'rgba(255,80,80,0)');
      ctx.strokeStyle = warningGlow;
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(bomb.x, 20);
      ctx.lineTo(bomb.x, barSurfaceY);
      ctx.stroke();
      
      // Draw target circle at bar position
      ctx.strokeStyle = flash ? '#ff4444' : '#cc3333';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(bomb.x, barSurfaceY, 15, 0, Math.PI * 2);
      ctx.stroke();
      
      // Draw crosshair
      ctx.beginPath();
      ctx.moveTo(bomb.x - 20, barSurfaceY);
      ctx.lineTo(bomb.x + 20, barSurfaceY);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(bomb.x, barSurfaceY - 20);
      ctx.lineTo(bomb.x, barSurfaceY + 20);
      ctx.stroke();
      
      // Draw exclamation at top
      ctx.fillStyle = '#ff4444';
      ctx.font = 'bold 28px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('!', bomb.x, 28);
      
      // Draw bomb icon at top
      ctx.fillStyle = '#333';
      ctx.beginPath();
      ctx.arc(bomb.x, 55, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    
    // Draw bomb (hand-drawn style - simple black circle with fuse)
    if (bomb.dropping && !bomb.exploded && bomb.body) {
      ctx.save();
      ctx.translate(bomb.body.position.x, bomb.body.position.y);
      ctx.rotate(bomb.body.angle);

      // Falling motion blur
      const fallSpeed = Math.abs(bomb.body.velocity.y);
      if (fallSpeed > 2) {
        const trailGradient = ctx.createLinearGradient(0, -BOMB_RADIUS * 2.5, 0, BOMB_RADIUS * 1.4);
        trailGradient.addColorStop(0, 'rgba(255,120,80,0)');
        trailGradient.addColorStop(1, 'rgba(255,120,80,0.28)');
        ctx.fillStyle = trailGradient;
        ctx.beginPath();
        ctx.ellipse(0, -BOMB_RADIUS * 1.1, BOMB_RADIUS * 0.7, BOMB_RADIUS * (0.6 + Math.min(1, fallSpeed / 10)), 0, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // Bomb body - simple filled circle
      ctx.fillStyle = '#333';
      ctx.beginPath();
      ctx.arc(0, 0, BOMB_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      
      // Bomb outline (hand-drawn)
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 3;
      ctx.stroke();
      
      // Fuse - simple curved line
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, -BOMB_RADIUS);
      ctx.quadraticCurveTo(6, -BOMB_RADIUS - 8, 3, -BOMB_RADIUS - 12);
      ctx.stroke();
      
      // Spark - simple orange dot
      const sparkFlicker = Math.sin(performance.now() * 0.05) * 0.5 + 0.5;
      ctx.fillStyle = '#ff6600';
      ctx.beginPath();
      ctx.arc(3, -BOMB_RADIUS - 12, 4 + sparkFlicker * 2, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.restore();
    }
  }
}

/**
 * Draw the car using physics body positions
 * Renders the car body as a rounded rectangle and wheels as circles with spokes
 */
function drawCar(): void {
  if (!car) return;
  
  // Use stored fixed dimensions (bounds change when body rotates)
  const bodyWidth = car.bodyWidth;
  const bodyHeight = car.bodyHeight;
  const wheelRadius = car.wheelRadius;
  const style = car.style;
  const velocityX = car.body.velocity.x;
  const velocityY = car.body.velocity.y;
  const speed = Math.hypot(velocityX, velocityY);

  // Motion trail
  if (speed > 0.6) {
    const dirX = velocityX / speed;
    const dirY = velocityY / speed;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = Math.min(0.38, 0.12 + speed * 0.04);
    for (let i = 0; i < 3; i++) {
      const t = (i + 1) / 3;
      const trailX = car.body.position.x - dirX * (16 + t * 26);
      const trailY = car.body.position.y - dirY * (10 + t * 18);
      ctx.fillStyle = 'rgba(255,255,255,' + (0.22 - t * 0.05) + ')';
      ctx.beginPath();
      ctx.ellipse(
        trailX,
        trailY,
        bodyWidth * (0.18 + t * 0.07),
        bodyHeight * (0.3 + t * 0.12),
        car.body.angle,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
    ctx.restore();
  }
  
  // Draw car body
  ctx.save();
  ctx.translate(car.body.position.x, car.body.position.y);
  ctx.rotate(car.body.angle);
  
  // Body shadow
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath();
  ctx.roundRect(-bodyWidth / 2 + 3, -bodyHeight / 2 + 3, bodyWidth, bodyHeight, bodyHeight / 2);
  ctx.fill();
  
  // Body fill - use style color
  ctx.fillStyle = style.bodyColor;
  ctx.beginPath();
  ctx.roundRect(-bodyWidth / 2, -bodyHeight / 2, bodyWidth, bodyHeight, bodyHeight / 2);
  ctx.fill();
  
  // Body outline - use style color
  ctx.strokeStyle = style.bodyStroke;
  ctx.lineWidth = 3;
  ctx.stroke();

  // Paint highlight
  const bodyHighlight = ctx.createLinearGradient(-bodyWidth * 0.45, -bodyHeight * 0.55, bodyWidth * 0.45, bodyHeight * 0.2);
  bodyHighlight.addColorStop(0, 'rgba(255,255,255,0.35)');
  bodyHighlight.addColorStop(0.55, 'rgba(255,255,255,0.08)');
  bodyHighlight.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = bodyHighlight;
  ctx.beginPath();
  ctx.roundRect(-bodyWidth / 2 + 2, -bodyHeight / 2 + 2, bodyWidth - 4, bodyHeight * 0.55, bodyHeight * 0.3);
  ctx.fill();
  
  // Windshield (on the right/front of car)
  ctx.fillStyle = '#87ceeb';
  ctx.beginPath();
  ctx.roundRect(bodyWidth * 0.1, -bodyHeight / 2 + 4, bodyWidth * 0.25, bodyHeight - 8, 4);
  ctx.fill();
  ctx.strokeStyle = '#222';
  ctx.lineWidth = 2;
  ctx.stroke();
  
  // Headlight
  ctx.fillStyle = '#ffeb3b';
  ctx.beginPath();
  ctx.arc(bodyWidth / 2 - 8, 0, 5, 0, Math.PI * 2);
  ctx.fill();
  
  // Tail light
  ctx.fillStyle = '#ff1744';
  ctx.beginPath();
  ctx.arc(-bodyWidth / 2 + 8, 0, 4, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.restore();
  
  // Draw wheels with style colors
  drawWheel(car.wheelA.position.x, car.wheelA.position.y, car.wheelA.angle, wheelRadius, style);
  drawWheel(car.wheelB.position.x, car.wheelB.position.y, car.wheelB.angle, wheelRadius, style);
}

/**
 * Draw a single wheel with spokes
 */
function drawWheel(x: number, y: number, angle: number, radius: number, style: CarStyle): void {
  ctx.save();
  ctx.translate(x, y);
  
  // Tire shadow
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath();
  ctx.arc(2, 2, radius, 0, Math.PI * 2);
  ctx.fill();
  
  // Tire - use style color
  ctx.fillStyle = style.wheelColor;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();
  
  // Tire outline
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 2;
  ctx.stroke();
  
  // Hub - use style color
  ctx.fillStyle = style.hubColor;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.6, 0, Math.PI * 2);
  ctx.fill();
  
  // Spokes (rotate with wheel physics rotation)
  ctx.save();
  ctx.rotate(angle);
  ctx.strokeStyle = COLORS.wheelSpoke;
  ctx.lineWidth = 2;
  for (let i = 0; i < 5; i++) {
    const spokeAngle = (i / 5) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(spokeAngle) * radius * 0.5, Math.sin(spokeAngle) * radius * 0.5);
    ctx.stroke();
  }
  ctx.restore();
  
  // Center cap
  ctx.fillStyle = style.hubColor;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.2, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.restore();
}

function drawWaterParticles(): void {
  for (const p of waterParticles) {
    const alpha = p.life;
    const speed = Math.hypot(p.vx, p.vy);

    if (speed > 2) {
      ctx.strokeStyle = 'rgba(255,255,255,' + (alpha * 0.25) + ')';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(p.x - p.vx * 0.6, p.y - p.vy * 0.6);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }
    // Hand-drawn style water drops
    ctx.fillStyle = 'rgba(74, 144, 194, ' + alpha + ')';
    ctx.strokeStyle = 'rgba(34, 34, 34, ' + (alpha * 0.5) + ')';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4 + (1 - p.life) * 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}

function drawSceneShadows(): void {
  if (!car || gamePhase === 'start') return;

  const lightX = w * 0.22;
  const lightY = h * 0.1;
  const carSpeed = Math.hypot(car.body.velocity.x, car.body.velocity.y);
  const carOffsetX = (car.body.position.x - lightX) * 0.08;
  const carOffsetY = (car.body.position.y - lightY) * 0.05;
  const speedStretch = Math.min(1, carSpeed / 12);

  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath();
  ctx.ellipse(
    car.body.position.x + carOffsetX,
    car.body.position.y + car.bodyHeight * 0.82 + carOffsetY,
    car.bodyWidth * (0.42 + speedStretch * 0.22),
    car.bodyHeight * 0.38,
    0,
    0,
    Math.PI * 2
  );
  ctx.fill();

  for (const bomb of bombs) {
    if (!bomb.dropping || bomb.exploded || !bomb.body) continue;
    const bombOffsetX = (bomb.body.position.x - lightX) * 0.06;
    const bombOffsetY = (bomb.body.position.y - lightY) * 0.04;
    ctx.globalAlpha = 0.14;
    ctx.beginPath();
    ctx.ellipse(
      bomb.body.position.x + bombOffsetX,
      bomb.body.position.y + BOMB_RADIUS * 1.2 + bombOffsetY,
      BOMB_RADIUS * 0.85,
      BOMB_RADIUS * 0.28,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }
  ctx.restore();
}

function getThreatLevel(): number {
  if (!car || gamePhase === 'start') return 0;
  const distanceFromCenter = Math.min(1, Math.abs(car.body.position.x - pivotX) / (barLength * 0.46));
  const proximityToWater = Math.min(1, Math.max(0, (car.body.position.y - (waterLevel - 180)) / 180));
  const tiltDanger = Math.min(1, Math.abs(barBody.angle) / 0.65);
  const bombDanger = Math.min(1, bombs.length / 4);
  return Math.min(1, distanceFromCenter * 0.34 + proximityToWater * 0.34 + tiltDanger * 0.2 + bombDanger * 0.22);
}

function drawPostFx(): void {
  const threatLevel = getThreatLevel();
  const time = performance.now() * 0.001;

  // Cinematic vignette
  const vignette = ctx.createRadialGradient(
    w * 0.5,
    h * 0.44,
    Math.min(w, h) * 0.18,
    w * 0.5,
    h * 0.5,
    Math.max(w, h) * 0.9
  );
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(0.68, 'rgba(0,0,0,0.1)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.26)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);

  // Threat edge tint
  if (threatLevel > 0.02) {
    const edgeGlow = ctx.createRadialGradient(
      w * 0.5,
      h * 0.45,
      Math.min(w, h) * 0.22,
      w * 0.5,
      h * 0.5,
      Math.max(w, h) * 0.95
    );
    edgeGlow.addColorStop(0, 'rgba(255,96,82,0)');
    edgeGlow.addColorStop(0.72, 'rgba(255,96,82,0)');
    edgeGlow.addColorStop(1, 'rgba(255,96,82,' + (0.08 + threatLevel * 0.2) + ')');
    ctx.fillStyle = edgeGlow;
    ctx.fillRect(0, 0, w, h);
  }

  // Speed streaks during high car momentum
  if (car && gamePhase === 'playing') {
    const velocity = Math.hypot(car.body.velocity.x, car.body.velocity.y);
    const speedEnergy = Math.min(1, velocity / 11);
    if (speedEnergy > 0.18) {
      const direction = car.body.velocity.x >= 0 ? -1 : 1;
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = 0.08 + speedEnergy * 0.12;
      for (const streak of speedStreaks) {
        const y = ((streak.baseY + time * streak.speed * 180 + Math.sin(time + streak.phase) * streak.sway) % (h + 70)) - 35;
        const x = ((streak.baseX + time * streak.speed * 90) % (w + 120)) - 60;
        const length = streak.length * (0.45 + speedEnergy * 0.95);
        const x2 = x + length * direction;
        const gradient = ctx.createLinearGradient(x, y, x2, y);
        gradient.addColorStop(0, 'rgba(255,255,255,0)');
        gradient.addColorStop(0.55, 'rgba(190,225,255,0.45)');
        gradient.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.strokeStyle = gradient;
        ctx.lineWidth = streak.width;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x2, y);
        ctx.stroke();
      }
      ctx.restore();
    }
  }
}

// ============================================================================
// START GAME
// ============================================================================

init();
