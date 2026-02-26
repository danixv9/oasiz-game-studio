import type { PlayerState } from "./playroom";
import type { GameManager } from "./GameManager";

// SVG icons
const PENCIL_ICON = `<svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>`;
const CHECK_ICON = `<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>`;
const USER_ICON = `<svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>`;

export class PlayerBar {
  private gameManager: GameManager;
  private containerEl: HTMLElement;

  constructor(gameManager: GameManager) {
    this.gameManager = gameManager;
    this.containerEl = document.getElementById("player-bar")!;
  }

  public updatePlayers(players: PlayerState[]): void {
    const drawerId = this.gameManager.getPlayerDrawingId();

    this.containerEl.innerHTML = players
      .map((player) => {
        const profile = player.getProfile();
        const isDrawing = player.id === drawerId;
        const hasGuessed = player.getState("guessed") === true;
        const score = (player.getState("score") as number) || 0;

        let statusIcon = "";
        if (isDrawing) {
          statusIcon = `<div class="status-icon pencil">${PENCIL_ICON}</div>`;
        } else if (hasGuessed) {
          statusIcon = `<div class="status-icon check">${CHECK_ICON}</div>`;
        }

        const avatarStyle = profile?.color ? `border-color: ${profile.color}` : "";
        const hasPhoto = profile?.photo;

        const avatarContent = hasPhoto
          ? `<img src="${profile.photo}" alt="${profile?.name || "Player"}">`
          : `<div class="default-avatar">${USER_ICON}</div>`;

        return `
        <div class="player-avatar ${isDrawing ? "drawing" : ""}" style="${avatarStyle}">
          ${avatarContent}
          ${statusIcon}
          <div class="player-score">${score}</div>
        </div>
      `;
      })
      .join("");
  }
}
