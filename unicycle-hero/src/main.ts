// ============================================================================
// UNICYCLE HERO - Balance Challenge Game
// ============================================================================

// Make this file a module for global augmentation
export {};

// Declare global platform functions
declare global {
  interface Window {
    submitScore: (score: number) => void;
    triggerHaptic: (type: 'light' | 'medium' | 'heavy' | 'success' | 'error') => void;
  }
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  // Physics
  GRAVITY: 0.15,
  ANGULAR_ACCELERATION: 0.008,
  ANGULAR_FRICTION: 0.98,
  MAX_ANGULAR_VELOCITY: 0.15,
  FALL_ANGLE: Math.PI / 3, // 60 degrees = fall

  // Player
  PLAYER_WHEEL_RADIUS: 25,
  PLAYER_BODY_HEIGHT: 60,
  PLAYER_HEAD_RADIUS: 18,

  // Ground & Movement
  GROUND_SPEED_INITIAL: 2,
  GROUND_SPEED_MAX: 8,
  SPEED_INCREMENT: 0.0005,

  // Obstacles
  OBSTACLE_MIN_GAP: 300,
  OBSTACLE_MAX_GAP: 600,
  OBSTACLE_MIN_HEIGHT: 20,
  OBSTACLE_MAX_HEIGHT: 60,
  OBSTACLE_WIDTH: 30,

  // Coins
  COIN_RADIUS: 15,
  COIN_VALUE: 10,
  COIN_SPAWN_CHANCE: 0.4,

  // Colors
  COLORS: {
    SKY_TOP: '#1a1a2e',
    SKY_BOTTOM: '#16213e',
    GROUND: '#4ecca3',
    GROUND_DARK: '#3da882',
    PLAYER_BODY: '#e94560',
    PLAYER_SKIN: '#ffd5c8',
    PLAYER_WHEEL: '#2d2d44',
    OBSTACLE: '#ff6b6b',
    OBSTACLE_DARK: '#ee5a5a',
    COIN: '#ffd700',
    COIN_DARK: '#ccac00',
    TEXT: '#ffffff',
    TEXT_SHADOW: 'rgba(0, 0, 0, 0.3)',
  },

  // UI
  SAFE_AREA_TOP_DESKTOP: 45,
  SAFE_AREA_TOP_MOBILE: 120,
};

// ============================================================================
// TYPES
// ============================================================================

type GameState = 'start' | 'playing' | 'gameOver';

interface Obstacle {
  x: number;
  width: number;
  height: number;
  passed: boolean;
}

interface Coin {
  x: number;
  y: number;
  collected: boolean;
  bobOffset: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface Settings {
  music: boolean;
  fx: boolean;
  haptics: boolean;
}

// ============================================================================
// GAME STATE
// ============================================================================

let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
let width: number;
let height: number;
let isMobile: boolean;
let safeAreaTop: number;

// Game state
let gameState: GameState = 'start';
let score: number = 0;
let highScore: number = 0;
let distance: number = 0;
let groundSpeed: number = CONFIG.GROUND_SPEED_INITIAL;

// Player state
let playerX: number;
let playerY: number;
let playerAngle: number = 0;
let playerAngularVelocity: number = 0;
let wheelRotation: number = 0;

// Game objects
let obstacles: Obstacle[] = [];
let coins: Coin[] = [];
let particles: Particle[] = [];
let nextObstacleDistance: number = 0;

// Input state
let isLeaningLeft: boolean = false;
let isLeaningRight: boolean = false;

// Settings
let settings: Settings = {
  music: true,
  fx: true,
  haptics: true,
};

// Animation
let lastTime: number = 0;
let groundOffset: number = 0;

// Audio context for sound effects
let audioContext: AudioContext | null = null;

// ============================================================================
// INITIALIZATION
// ============================================================================

function init(): void {
  canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  ctx = canvas.getContext('2d')!;

  isMobile = window.matchMedia('(pointer: coarse)').matches;
  safeAreaTop = isMobile ? CONFIG.SAFE_AREA_TOP_MOBILE : CONFIG.SAFE_AREA_TOP_DESKTOP;

  loadSettings();
  setupEventListeners();
  resize();

  window.addEventListener('resize', resize);

  requestAnimationFrame(gameLoop);
}

function resize(): void {
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = width;
  canvas.height = height;

  // Reset player position
  playerX = width * 0.3;
  playerY = height - 100 - CONFIG.PLAYER_WHEEL_RADIUS;
}

function loadSettings(): void {
  const saved = localStorage.getItem('unicycle-hero-settings');
  if (saved) {
    settings = JSON.parse(saved);
  }
  updateSettingsUI();
}

function saveSettings(): void {
  localStorage.setItem('unicycle-hero-settings', JSON.stringify(settings));
}

function updateSettingsUI(): void {
  const musicToggle = document.getElementById('toggle-music');
  const fxToggle = document.getElementById('toggle-fx');
  const hapticsToggle = document.getElementById('toggle-haptics');

  if (musicToggle) musicToggle.classList.toggle('active', settings.music);
  if (fxToggle) fxToggle.classList.toggle('active', settings.fx);
  if (hapticsToggle) hapticsToggle.classList.toggle('active', settings.haptics);
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

function setupEventListeners(): void {
  // Settings modal
  const settingsBtn = document.getElementById('settings-btn');
  const settingsModal = document.getElementById('settings-modal');
  const closeSettings = document.getElementById('close-settings');
  const musicToggle = document.getElementById('toggle-music');
  const fxToggle = document.getElementById('toggle-fx');
  const hapticsToggle = document.getElementById('toggle-haptics');

  settingsBtn?.addEventListener('click', () => {
    settingsModal?.classList.add('active');
    triggerHaptic('light');
  });

  closeSettings?.addEventListener('click', () => {
    settingsModal?.classList.remove('active');
    triggerHaptic('light');
  });

  settingsModal?.addEventListener('click', (e) => {
    if (e.target === settingsModal) {
      settingsModal.classList.remove('active');
    }
  });

  musicToggle?.addEventListener('click', () => {
    settings.music = !settings.music;
    saveSettings();
    updateSettingsUI();
    triggerHaptic('light');
  });

  fxToggle?.addEventListener('click', () => {
    settings.fx = !settings.fx;
    saveSettings();
    updateSettingsUI();
    triggerHaptic('light');
  });

  hapticsToggle?.addEventListener('click', () => {
    settings.haptics = !settings.haptics;
    saveSettings();
    updateSettingsUI();
    triggerHaptic('light');
  });

  // Game controls - Keyboard
  window.addEventListener('keydown', (e) => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
      isLeaningLeft = true;
    }
    if (e.code === 'ArrowRight' || e.code === 'KeyD') {
      isLeaningRight = true;
    }
    if (e.code === 'Space' || e.code === 'Enter') {
      handleTap();
    }
  });

  window.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
      isLeaningLeft = false;
    }
    if (e.code === 'ArrowRight' || e.code === 'KeyD') {
      isLeaningRight = false;
    }
  });

  // Touch controls
  canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
  canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
  canvas.addEventListener('touchcancel', handleTouchEnd, { passive: false });

  // Mouse controls
  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('mouseup', handleMouseUp);
}

function handleTouchStart(e: TouchEvent): void {
  e.preventDefault();

  if (gameState !== 'playing') {
    handleTap();
    return;
  }

  for (const touch of Array.from(e.touches)) {
    if (touch.clientX < width / 2) {
      isLeaningLeft = true;
    } else {
      isLeaningRight = true;
    }
  }
}

function handleTouchEnd(e: TouchEvent): void {
  e.preventDefault();

  // Check remaining touches
  const leftTouches = Array.from(e.touches).filter((t) => t.clientX < width / 2);
  const rightTouches = Array.from(e.touches).filter((t) => t.clientX >= width / 2);

  isLeaningLeft = leftTouches.length > 0;
  isLeaningRight = rightTouches.length > 0;
}

function handleMouseDown(e: MouseEvent): void {
  if (gameState !== 'playing') {
    handleTap();
    return;
  }

  if (e.clientX < width / 2) {
    isLeaningLeft = true;
  } else {
    isLeaningRight = true;
  }
}

function handleMouseUp(_e: MouseEvent): void {
  isLeaningLeft = false;
  isLeaningRight = false;
}

function handleTap(): void {
  if (gameState === 'start') {
    startGame();
  } else if (gameState === 'gameOver') {
    resetGame();
  }
}

// ============================================================================
// GAME LOGIC
// ============================================================================

function startGame(): void {
  gameState = 'playing';
  triggerHaptic('medium');
  playSound('start');
}

function resetGame(): void {
  gameState = 'start';
  score = 0;
  distance = 0;
  groundSpeed = CONFIG.GROUND_SPEED_INITIAL;
  playerAngle = 0;
  playerAngularVelocity = 0;
  wheelRotation = 0;
  obstacles = [];
  coins = [];
  particles = [];
  nextObstacleDistance = CONFIG.OBSTACLE_MIN_GAP;
  isLeaningLeft = false;
  isLeaningRight = false;
}

function update(deltaTime: number): void {
  if (gameState !== 'playing') return;

  const dt = Math.min(deltaTime / 16.67, 2); // Normalize to ~60fps, cap at 2x

  // Update ground speed (difficulty progression)
  groundSpeed = Math.min(groundSpeed + CONFIG.SPEED_INCREMENT * dt, CONFIG.GROUND_SPEED_MAX);

  // Update distance and score
  distance += groundSpeed * dt;
  score = Math.floor(distance / 10);

  // Update ground offset for scrolling effect
  groundOffset = (groundOffset + groundSpeed * dt) % 40;

  // Update wheel rotation
  wheelRotation += (groundSpeed * dt * 0.1);

  // Apply angular acceleration based on input
  if (isLeaningLeft) {
    playerAngularVelocity -= CONFIG.ANGULAR_ACCELERATION * dt;
  }
  if (isLeaningRight) {
    playerAngularVelocity += CONFIG.ANGULAR_ACCELERATION * dt;
  }

  // Apply gravity (always pulling towards falling)
  playerAngularVelocity += Math.sin(playerAngle) * CONFIG.GRAVITY * dt * 0.1;

  // Apply friction
  playerAngularVelocity *= Math.pow(CONFIG.ANGULAR_FRICTION, dt);

  // Clamp angular velocity
  playerAngularVelocity = Math.max(
    -CONFIG.MAX_ANGULAR_VELOCITY,
    Math.min(CONFIG.MAX_ANGULAR_VELOCITY, playerAngularVelocity)
  );

  // Update angle
  playerAngle += playerAngularVelocity * dt;

  // Check for fall
  if (Math.abs(playerAngle) > CONFIG.FALL_ANGLE) {
    gameOver();
    return;
  }

  // Spawn obstacles
  nextObstacleDistance -= groundSpeed * dt;
  if (nextObstacleDistance <= 0) {
    spawnObstacle();
    nextObstacleDistance =
      CONFIG.OBSTACLE_MIN_GAP +
      Math.random() * (CONFIG.OBSTACLE_MAX_GAP - CONFIG.OBSTACLE_MIN_GAP);
  }

  // Update obstacles
  for (const obstacle of obstacles) {
    obstacle.x -= groundSpeed * dt;

    // Check collision
    if (!obstacle.passed && checkObstacleCollision(obstacle)) {
      gameOver();
      return;
    }

    // Mark as passed for scoring
    if (!obstacle.passed && obstacle.x + obstacle.width < playerX - CONFIG.PLAYER_WHEEL_RADIUS) {
      obstacle.passed = true;
      score += 5;
      triggerHaptic('light');
      playSound('pass');
    }
  }

  // Remove off-screen obstacles
  obstacles = obstacles.filter((o) => o.x + o.width > -50);

  // Update coins
  for (const coin of coins) {
    coin.x -= groundSpeed * dt;
    coin.bobOffset += 0.1 * dt;

    // Check collection
    if (!coin.collected && checkCoinCollision(coin)) {
      coin.collected = true;
      score += CONFIG.COIN_VALUE;
      triggerHaptic('medium');
      playSound('coin');
      spawnCoinParticles(coin.x, coin.y);
    }
  }

  // Remove off-screen or collected coins
  coins = coins.filter((c) => c.x > -50 && !c.collected);

  // Update particles
  updateParticles(dt);

  // Occasional balance feedback
  if (Math.abs(playerAngle) > CONFIG.FALL_ANGLE * 0.7) {
    triggerHaptic('light');
  }
}

function spawnObstacle(): void {
  const obstacleHeight =
    CONFIG.OBSTACLE_MIN_HEIGHT +
    Math.random() * (CONFIG.OBSTACLE_MAX_HEIGHT - CONFIG.OBSTACLE_MIN_HEIGHT);

  obstacles.push({
    x: width + 50,
    width: CONFIG.OBSTACLE_WIDTH,
    height: obstacleHeight,
    passed: false,
  });

  // Maybe spawn a coin above the obstacle
  if (Math.random() < CONFIG.COIN_SPAWN_CHANCE) {
    const groundY = height - 100;
    coins.push({
      x: width + 50 + CONFIG.OBSTACLE_WIDTH / 2,
      y: groundY - obstacleHeight - 50 - CONFIG.COIN_RADIUS,
      collected: false,
      bobOffset: Math.random() * Math.PI * 2,
    });
  }
}

function checkObstacleCollision(obstacle: Obstacle): boolean {
  const groundY = height - 100;
  const wheelX = playerX;
  const wheelY = groundY - CONFIG.PLAYER_WHEEL_RADIUS;

  // Simple AABB collision with the wheel
  const wheelLeft = wheelX - CONFIG.PLAYER_WHEEL_RADIUS;
  const wheelRight = wheelX + CONFIG.PLAYER_WHEEL_RADIUS;
  const wheelBottom = wheelY + CONFIG.PLAYER_WHEEL_RADIUS;

  const obstacleTop = groundY - obstacle.height;

  return (
    wheelRight > obstacle.x &&
    wheelLeft < obstacle.x + obstacle.width &&
    wheelBottom > obstacleTop
  );
}

function checkCoinCollision(coin: Coin): boolean {
  const groundY = height - 100;
  const bodyY = groundY - CONFIG.PLAYER_WHEEL_RADIUS - CONFIG.PLAYER_BODY_HEIGHT / 2;

  const coinY = coin.y + Math.sin(coin.bobOffset) * 5;

  const dx = playerX - coin.x;
  const dy = bodyY - coinY;
  const dist = Math.sqrt(dx * dx + dy * dy);

  return dist < CONFIG.COIN_RADIUS + 30;
}

function spawnCoinParticles(x: number, y: number): void {
  for (let i = 0; i < 8; i++) {
    const angle = (Math.PI * 2 * i) / 8;
    particles.push({
      x: x,
      y: y,
      vx: Math.cos(angle) * 3 + (Math.random() - 0.5) * 2,
      vy: Math.sin(angle) * 3 + (Math.random() - 0.5) * 2,
      life: 1,
      maxLife: 1,
      color: CONFIG.COLORS.COIN,
      size: 4 + Math.random() * 4,
    });
  }
}

function spawnFallParticles(): void {
  for (let i = 0; i < 15; i++) {
    particles.push({
      x: playerX + (Math.random() - 0.5) * 40,
      y: playerY + (Math.random() - 0.5) * 60,
      vx: (Math.random() - 0.5) * 8,
      vy: -Math.random() * 5 - 2,
      life: 1,
      maxLife: 1,
      color: CONFIG.COLORS.PLAYER_BODY,
      size: 3 + Math.random() * 5,
    });
  }
}

function updateParticles(dt: number): void {
  for (const p of particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 0.2 * dt; // Gravity
    p.life -= 0.02 * dt;
  }

  particles = particles.filter((p) => p.life > 0);
}

function gameOver(): void {
  gameState = 'gameOver';
  spawnFallParticles();
  triggerHaptic('error');
  playSound('fall');

  if (score > highScore) {
    highScore = score;
  }

  // Submit score to platform
  if (typeof window.submitScore === 'function') {
    window.submitScore(score);
  }
}

// ============================================================================
// RENDERING
// ============================================================================

function render(): void {
  // Clear with gradient sky
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, CONFIG.COLORS.SKY_TOP);
  gradient.addColorStop(1, CONFIG.COLORS.SKY_BOTTOM);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Draw ground
  drawGround();

  // Draw obstacles
  for (const obstacle of obstacles) {
    drawObstacle(obstacle);
  }

  // Draw coins
  for (const coin of coins) {
    drawCoin(coin);
  }

  // Draw player
  drawPlayer();

  // Draw particles
  drawParticles();

  // Draw UI
  drawUI();
}

function drawGround(): void {
  const groundY = height - 100;

  // Main ground
  ctx.fillStyle = CONFIG.COLORS.GROUND;
  ctx.fillRect(0, groundY, width, 100);

  // Ground pattern
  ctx.fillStyle = CONFIG.COLORS.GROUND_DARK;
  for (let x = -groundOffset; x < width + 40; x += 40) {
    ctx.fillRect(x, groundY, 20, 5);
  }

  // Ground line
  ctx.strokeStyle = CONFIG.COLORS.GROUND_DARK;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, groundY);
  ctx.lineTo(width, groundY);
  ctx.stroke();
}

function drawObstacle(obstacle: Obstacle): void {
  const groundY = height - 100;

  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.fillRect(obstacle.x + 5, groundY - obstacle.height + 5, obstacle.width, obstacle.height);

  // Main body
  ctx.fillStyle = CONFIG.COLORS.OBSTACLE;
  ctx.fillRect(obstacle.x, groundY - obstacle.height, obstacle.width, obstacle.height);

  // Highlight
  ctx.fillStyle = CONFIG.COLORS.OBSTACLE_DARK;
  ctx.fillRect(obstacle.x, groundY - obstacle.height, obstacle.width * 0.3, obstacle.height);

  // Top
  ctx.fillStyle = '#ff8585';
  ctx.fillRect(obstacle.x, groundY - obstacle.height, obstacle.width, 5);
}

function drawCoin(coin: Coin): void {
  const bobY = coin.y + Math.sin(coin.bobOffset) * 5;

  // Glow
  ctx.beginPath();
  ctx.arc(coin.x, bobY, CONFIG.COIN_RADIUS + 5, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
  ctx.fill();

  // Main coin
  ctx.beginPath();
  ctx.arc(coin.x, bobY, CONFIG.COIN_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = CONFIG.COLORS.COIN;
  ctx.fill();

  // Inner circle
  ctx.beginPath();
  ctx.arc(coin.x, bobY, CONFIG.COIN_RADIUS * 0.6, 0, Math.PI * 2);
  ctx.fillStyle = CONFIG.COLORS.COIN_DARK;
  ctx.fill();

  // Shine
  ctx.beginPath();
  ctx.arc(coin.x - 4, bobY - 4, 4, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.fill();
}

function drawPlayer(): void {
  const groundY = height - 100;
  const wheelX = playerX;
  const wheelY = groundY - CONFIG.PLAYER_WHEEL_RADIUS;

  ctx.save();
  ctx.translate(wheelX, wheelY);
  ctx.rotate(playerAngle);

  // Draw wheel
  ctx.beginPath();
  ctx.arc(0, 0, CONFIG.PLAYER_WHEEL_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = CONFIG.COLORS.PLAYER_WHEEL;
  ctx.fill();

  // Wheel spokes
  ctx.strokeStyle = '#444466';
  ctx.lineWidth = 2;
  for (let i = 0; i < 4; i++) {
    const angle = wheelRotation + (Math.PI / 2) * i;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(
      Math.cos(angle) * CONFIG.PLAYER_WHEEL_RADIUS * 0.8,
      Math.sin(angle) * CONFIG.PLAYER_WHEEL_RADIUS * 0.8
    );
    ctx.stroke();
  }

  // Wheel center
  ctx.beginPath();
  ctx.arc(0, 0, 5, 0, Math.PI * 2);
  ctx.fillStyle = '#666688';
  ctx.fill();

  // Seat post
  ctx.fillStyle = '#555577';
  ctx.fillRect(-3, -CONFIG.PLAYER_WHEEL_RADIUS - 20, 6, 20);

  // Seat
  ctx.fillStyle = CONFIG.COLORS.PLAYER_WHEEL;
  ctx.beginPath();
  ctx.ellipse(0, -CONFIG.PLAYER_WHEEL_RADIUS - 22, 15, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body
  const bodyY = -CONFIG.PLAYER_WHEEL_RADIUS - 25;

  // Torso
  ctx.fillStyle = CONFIG.COLORS.PLAYER_BODY;
  ctx.beginPath();
  ctx.moveTo(-12, bodyY);
  ctx.lineTo(-10, bodyY - CONFIG.PLAYER_BODY_HEIGHT + 15);
  ctx.lineTo(10, bodyY - CONFIG.PLAYER_BODY_HEIGHT + 15);
  ctx.lineTo(12, bodyY);
  ctx.closePath();
  ctx.fill();

  // Arms (spread for balance)
  const armSpread = Math.abs(playerAngularVelocity) * 200 + 30;
  ctx.strokeStyle = CONFIG.COLORS.PLAYER_SKIN;
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';

  // Left arm
  ctx.beginPath();
  ctx.moveTo(-10, bodyY - 35);
  ctx.lineTo(-10 - armSpread, bodyY - 25 + playerAngularVelocity * 100);
  ctx.stroke();

  // Right arm
  ctx.beginPath();
  ctx.moveTo(10, bodyY - 35);
  ctx.lineTo(10 + armSpread, bodyY - 25 - playerAngularVelocity * 100);
  ctx.stroke();

  // Head
  const headY = bodyY - CONFIG.PLAYER_BODY_HEIGHT - CONFIG.PLAYER_HEAD_RADIUS + 15;
  ctx.beginPath();
  ctx.arc(0, headY, CONFIG.PLAYER_HEAD_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = CONFIG.COLORS.PLAYER_SKIN;
  ctx.fill();

  // Hair
  ctx.fillStyle = '#4a3728';
  ctx.beginPath();
  ctx.arc(0, headY - 5, CONFIG.PLAYER_HEAD_RADIUS, Math.PI, 0, false);
  ctx.fill();

  // Eyes
  const eyeOffset = playerAngularVelocity * 3;
  ctx.fillStyle = '#333';
  ctx.beginPath();
  ctx.arc(-5 + eyeOffset, headY - 2, 3, 0, Math.PI * 2);
  ctx.arc(5 + eyeOffset, headY - 2, 3, 0, Math.PI * 2);
  ctx.fill();

  // Expression based on danger
  const danger = Math.abs(playerAngle) / CONFIG.FALL_ANGLE;
  if (danger > 0.5) {
    // Worried mouth
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, headY + 6, 5, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.stroke();
  } else {
    // Slight smile
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, headY + 3, 5, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.stroke();
  }

  ctx.restore();

  // Balance indicator (wobble warning)
  if (gameState === 'playing') {
    const danger2 = Math.abs(playerAngle) / CONFIG.FALL_ANGLE;
    if (danger2 > 0.5) {
      ctx.fillStyle = `rgba(255, 100, 100, ${(danger2 - 0.5) * 0.5})`;
      ctx.fillRect(0, 0, width, height);
    }
  }
}

function drawParticles(): void {
  for (const p of particles) {
    ctx.globalAlpha = p.life;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawUI(): void {
  // Score
  ctx.fillStyle = CONFIG.COLORS.TEXT;
  ctx.font = 'bold 32px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textAlign = 'center';
  ctx.shadowColor = CONFIG.COLORS.TEXT_SHADOW;
  ctx.shadowBlur = 4;
  ctx.shadowOffsetY = 2;
  ctx.fillText(`${score}`, width / 2, safeAreaTop + 40);
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // Speed indicator
  const speedPercent = ((groundSpeed - CONFIG.GROUND_SPEED_INITIAL) /
    (CONFIG.GROUND_SPEED_MAX - CONFIG.GROUND_SPEED_INITIAL)) * 100;
  ctx.font = '14px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.fillText(`Speed: ${Math.floor(speedPercent)}%`, width / 2, safeAreaTop + 60);

  // State-specific UI
  if (gameState === 'start') {
    drawStartScreen();
  } else if (gameState === 'gameOver') {
    drawGameOverScreen();
  } else if (gameState === 'playing') {
    drawControlHints();
  }
}

function drawStartScreen(): void {
  // Overlay
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.fillRect(0, 0, width, height);

  // Title
  ctx.fillStyle = CONFIG.COLORS.TEXT;
  ctx.font = 'bold 48px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textAlign = 'center';
  ctx.shadowColor = CONFIG.COLORS.TEXT_SHADOW;
  ctx.shadowBlur = 8;
  ctx.fillText('Unicycle Hero', width / 2, height / 2 - 60);
  ctx.shadowBlur = 0;

  // Instructions
  ctx.font = '20px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';

  if (isMobile) {
    ctx.fillText('Tap left or right to balance', width / 2, height / 2);
  } else {
    ctx.fillText('Use A/D or Arrow Keys to balance', width / 2, height / 2);
  }

  // Start prompt
  ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillStyle = CONFIG.COLORS.COIN;
  const pulse = Math.sin(Date.now() / 300) * 0.2 + 0.8;
  ctx.globalAlpha = pulse;
  ctx.fillText(isMobile ? 'Tap to Start' : 'Press Space to Start', width / 2, height / 2 + 60);
  ctx.globalAlpha = 1;

  // High score
  if (highScore > 0) {
    ctx.font = '18px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fillText(`Best: ${highScore}`, width / 2, height / 2 + 110);
  }
}

function drawGameOverScreen(): void {
  // Overlay
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(0, 0, width, height);

  // Game Over text
  ctx.fillStyle = CONFIG.COLORS.OBSTACLE;
  ctx.font = 'bold 48px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 8;
  ctx.fillText('Game Over', width / 2, height / 2 - 60);
  ctx.shadowBlur = 0;

  // Score
  ctx.fillStyle = CONFIG.COLORS.TEXT;
  ctx.font = 'bold 36px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText(`Score: ${score}`, width / 2, height / 2);

  // High score
  ctx.font = '20px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  if (score >= highScore && score > 0) {
    ctx.fillStyle = CONFIG.COLORS.COIN;
    ctx.fillText('New Best!', width / 2, height / 2 + 40);
  } else {
    ctx.fillText(`Best: ${highScore}`, width / 2, height / 2 + 40);
  }

  // Restart prompt
  ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillStyle = CONFIG.COLORS.GROUND;
  const pulse = Math.sin(Date.now() / 300) * 0.2 + 0.8;
  ctx.globalAlpha = pulse;
  ctx.fillText(isMobile ? 'Tap to Retry' : 'Press Space to Retry', width / 2, height / 2 + 100);
  ctx.globalAlpha = 1;
}

function drawControlHints(): void {
  if (distance > 500) return; // Hide after initial play

  ctx.font = '16px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.textAlign = 'center';

  if (isMobile) {
    // Left side hint
    ctx.fillText('TAP', width * 0.15, height / 2);
    ctx.fillText('LEFT', width * 0.15, height / 2 + 20);

    // Right side hint
    ctx.fillText('TAP', width * 0.85, height / 2);
    ctx.fillText('RIGHT', width * 0.85, height / 2 + 20);
  }
}

// ============================================================================
// AUDIO
// ============================================================================

function initAudio(): void {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  }
}

function playSound(type: 'start' | 'coin' | 'pass' | 'fall'): void {
  if (!settings.fx) return;

  initAudio();
  if (!audioContext) return;

  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  osc.connect(gain);
  gain.connect(audioContext.destination);

  const now = audioContext.currentTime;

  switch (type) {
    case 'start':
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.1);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
      break;

    case 'coin':
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(1320, now + 0.1);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
      break;

    case 'pass':
      osc.frequency.setValueAtTime(660, now);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
      break;

    case 'fall':
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.5);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
      osc.start(now);
      osc.stop(now + 0.5);
      break;
  }
}

function triggerHaptic(type: 'light' | 'medium' | 'heavy' | 'success' | 'error'): void {
  if (!settings.haptics) return;

  if (typeof window.triggerHaptic === 'function') {
    window.triggerHaptic(type);
  }
}

// ============================================================================
// GAME LOOP
// ============================================================================

function gameLoop(currentTime: number): void {
  const deltaTime = lastTime ? currentTime - lastTime : 16.67;
  lastTime = currentTime;

  update(deltaTime);
  render();

  requestAnimationFrame(gameLoop);
}

// ============================================================================
// START
// ============================================================================

init();
