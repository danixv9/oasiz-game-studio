import { setState } from "./playroom";
import type { GameManager } from "./GameManager";

// Sync interval for drawing data (ms) - balance between smoothness and network load
const DRAWING_SYNC_INTERVAL = 150;

export class DrawingCanvas {
  private gameManager: GameManager;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private viewerImage: HTMLImageElement;
  private controlsEl: HTMLElement;

  private isDrawing: boolean = false;
  private lastX: number = 0;
  private lastY: number = 0;
  private currentColor: string = "#000000";
  private currentSize: number = 5;
  private isDrawingMode: boolean = false;
  private syncInterval: ReturnType<typeof setInterval> | null = null;
  private lastSyncData: string = "";
  private hasChanges: boolean = false;

  constructor(gameManager: GameManager) {
    this.gameManager = gameManager;

    this.canvas = document.getElementById(
      "drawing-canvas",
    ) as HTMLCanvasElement;
    this.ctx = this.canvas.getContext("2d", { willReadFrequently: true })!;
    this.viewerImage = document.getElementById(
      "viewer-image",
    ) as HTMLImageElement;
    this.controlsEl = document.getElementById("drawing-controls")!;

    console.log("[DrawingCanvas] Initialized");

    this.setupCanvas();
    this.setupDrawingEvents();
    this.setupControlsEvents();
    this.setupResizeHandler();

    // Initially hide both until mode is set
    this.canvas.style.display = "block";
    this.viewerImage.style.display = "none";
  }

  private setupCanvas(): void {
    this.resizeCanvas();
    this.ctx.lineCap = "round";
    this.ctx.lineJoin = "round";
    this.ctx.strokeStyle = this.currentColor;
    this.ctx.lineWidth = this.currentSize;
  }

  private resizeCanvas(): void {
    const container = this.canvas.parentElement!;
    const rect = container.getBoundingClientRect();

    // Don't resize if container is not visible
    if (rect.width === 0 || rect.height === 0) {
      return;
    }

    const dpr = window.devicePixelRatio || 1;

    // Save current content only if canvas already has size
    let imageData: ImageData | null = null;
    if (this.canvas.width > 0 && this.canvas.height > 0) {
      try {
        imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
      } catch (e) {
        console.log("[DrawingCanvas] Could not save image data:", e);
      }
    }

    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.canvas.style.width = rect.width + "px";
    this.canvas.style.height = rect.height + "px";

    this.ctx.scale(dpr, dpr);
    this.ctx.lineCap = "round";
    this.ctx.lineJoin = "round";
    this.ctx.strokeStyle = this.currentColor;
    this.ctx.lineWidth = this.currentSize;

    // Fill with white
    this.ctx.fillStyle = "#FFFFFF";
    this.ctx.fillRect(0, 0, rect.width, rect.height);

    // Restore content if available
    if (imageData && imageData.data.some((v) => v !== 0)) {
      this.ctx.putImageData(imageData, 0, 0);
    }

  }

  private setupResizeHandler(): void {
    let resizeTimeout: ReturnType<typeof setTimeout>;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        this.resizeCanvas();
      }, 100);
    });
  }

  private setupDrawingEvents(): void {
    // Mouse events
    this.canvas.addEventListener("mousedown", (e) => this.startDrawing(e));
    this.canvas.addEventListener("mousemove", (e) => this.draw(e));
    this.canvas.addEventListener("mouseup", () => this.stopDrawing());
    this.canvas.addEventListener("mouseleave", () => this.stopDrawing());

    // Touch events
    this.canvas.addEventListener(
      "touchstart",
      (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        this.startDrawing(touch);
      },
      { passive: false },
    );

    this.canvas.addEventListener(
      "touchmove",
      (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        this.draw(touch);
      },
      { passive: false },
    );

    this.canvas.addEventListener("touchend", () => this.stopDrawing());
    this.canvas.addEventListener("touchcancel", () => this.stopDrawing());
  }

  private getCanvasCoordinates(
    e: MouseEvent | Touch,
  ): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  private startDrawing(e: MouseEvent | Touch): void {
    if (!this.isDrawingMode) return;

    this.isDrawing = true;
    const coords = this.getCanvasCoordinates(e);
    this.lastX = coords.x;
    this.lastY = coords.y;

    // Draw a dot for single clicks
    this.ctx.beginPath();
    this.ctx.arc(coords.x, coords.y, this.currentSize / 2, 0, Math.PI * 2);
    this.ctx.fillStyle = this.currentColor;
    this.ctx.fill();
    this.hasChanges = true;

    // Haptic feedback when starting to draw
    this.gameManager.triggerHaptic("light");
  }

  private draw(e: MouseEvent | Touch): void {
    if (!this.isDrawing || !this.isDrawingMode) return;

    const coords = this.getCanvasCoordinates(e);

    this.ctx.beginPath();
    this.ctx.strokeStyle = this.currentColor;
    this.ctx.lineWidth = this.currentSize;
    this.ctx.moveTo(this.lastX, this.lastY);
    this.ctx.lineTo(coords.x, coords.y);
    this.ctx.stroke();

    this.lastX = coords.x;
    this.lastY = coords.y;
    this.hasChanges = true;
  }

  private stopDrawing(): void {
    if (this.isDrawing) {
      this.isDrawing = false;
      // Sync immediately on stop to ensure final state is sent
      if (this.isDrawingMode && this.hasChanges) {
        this.syncDrawing();
      }
    }
  }

  private startSyncInterval(): void {
    if (this.syncInterval) return;

    this.syncInterval = setInterval(() => {
      if (this.hasChanges) {
        this.syncDrawing();
      }
    }, DRAWING_SYNC_INTERVAL);
  }

  private stopSyncInterval(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  private syncDrawing(): void {
    if (!this.isDrawingMode) return;

    try {
      // Use lower quality JPEG for faster sync
      const imageData = this.canvas.toDataURL("image/jpeg", 0.5);

      // Only sync if data changed
      if (imageData !== this.lastSyncData) {
        this.lastSyncData = imageData;
        setState("drawingData", imageData, false); // Use unreliable for performance
        this.hasChanges = false;
      }
    } catch (e) {
      console.error("[DrawingCanvas] Error syncing drawing:", e);
    }
  }

  private setupControlsEvents(): void {
    // Color buttons
    const colorBtns = document.querySelectorAll(".color-btn");
    colorBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        colorBtns.forEach((b) => b.classList.remove("selected"));
        btn.classList.add("selected");
        this.currentColor = (btn as HTMLElement).dataset.color || "#000000";
        this.gameManager.triggerHaptic("light");
      });
    });

    // Brush size buttons
    const sizeBtns = document.querySelectorAll(".brush-size-btn");
    sizeBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        sizeBtns.forEach((b) => b.classList.remove("selected"));
        btn.classList.add("selected");
        this.currentSize = parseInt((btn as HTMLElement).dataset.size || "5");
        this.gameManager.triggerHaptic("light");
      });
    });

    // Clear button
    const clearBtn = document.getElementById("clear-btn");
    clearBtn?.addEventListener("click", () => {
      this.clear();
      this.gameManager.triggerHaptic("medium");
    });
  }

  public setDrawingMode(enabled: boolean): void {
    this.isDrawingMode = enabled;

    if (enabled) {
      // Drawer sees canvas with controls
      this.controlsEl.classList.add("active");
      this.canvas.style.display = "block";
      this.viewerImage.style.display = "none";
      this.canvas.style.cursor = "crosshair";
      this.canvas.style.pointerEvents = "auto";

      // Make sure canvas is properly sized
      this.resizeCanvas();

      // Start sync interval for drawing data
      this.startSyncInterval();
      this.hasChanges = false;
      this.lastSyncData = "";
    } else {
      // Viewers see the image, not canvas
      this.controlsEl.classList.remove("active");
      this.canvas.style.display = "none";
      this.viewerImage.style.display = "block";
      this.canvas.style.cursor = "default";
      this.canvas.style.pointerEvents = "none";

      // Stop sync interval
      this.stopSyncInterval();
    }
  }

  public clear(): void {
    const container = this.canvas.parentElement!;
    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    this.ctx.fillStyle = "#FFFFFF";
    this.ctx.fillRect(0, 0, rect.width * dpr, rect.height * dpr);
  }

  public getImageData(): string | null {
    try {
      return this.canvas.toDataURL("image/png");
    } catch (e) {
      console.error("[DrawingCanvas] Error getting image data:", e);
      return null;
    }
  }

  public displayImage(imageData: string): void {
    this.viewerImage.src = imageData;
  }
}
