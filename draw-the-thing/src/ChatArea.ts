import type { PlayerState } from "./playroom";
import type { GameManager } from "./GameManager";

interface Guess {
  playerId: string;
  guess: string;
}

export class ChatArea {
  private gameManager: GameManager;
  private guessesListEl: HTMLElement;
  private guessInputEl: HTMLInputElement;
  private lastGuessCount: number = 0;

  constructor(gameManager: GameManager) {
    this.gameManager = gameManager;
    this.guessesListEl = document.getElementById("guesses-list")!;
    this.guessInputEl = document.getElementById(
      "guess-input",
    ) as HTMLInputElement;

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.guessInputEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        this.submitGuess();
      }
    });

    // Prevent scrolling issues on mobile keyboards
    this.guessInputEl.addEventListener("focus", () => {
      setTimeout(() => {
        window.scrollTo(0, 0);
      }, 100);
    });
  }

  private submitGuess(): void {
    const guess = this.guessInputEl.value.trim();
    if (!guess) return;

    this.guessInputEl.value = "";
    this.gameManager.submitGuess(guess);
  }

  public updateGuesses(guesses: Guess[], players: PlayerState[]): void {
    // Only update if guesses changed
    if (guesses.length === this.lastGuessCount) return;
    this.lastGuessCount = guesses.length;

    this.guessesListEl.innerHTML = guesses
      .map((guess) => {
        const player = players.find((p) => p.id === guess.playerId);
        // Check customName first, then profile name, then fallback
        const customName = player?.getState("customName") as string;
        const profileName = player?.getProfile()?.name;
        const playerName = customName || profileName || "Player";
        const isCorrect = this.gameManager.isCorrectGuess(guess.guess);

        if (isCorrect) {
          return `
          <div class="guess-item correct">
            <span class="player-name">${playerName}</span> guessed correctly!
          </div>
        `;
        }

        return `
        <div class="guess-item">
          <span class="player-name">${playerName}</span>: ${this.escapeHtml(guess.guess)}
        </div>
      `;
      })
      .join("");

    // Scroll to bottom
    this.guessesListEl.scrollTop = this.guessesListEl.scrollHeight;
  }

  private escapeHtml(text: string): string {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  public setDisabled(disabled: boolean): void {
    this.guessInputEl.disabled = disabled;

    if (disabled) {
      if (this.gameManager.amIDrawing()) {
        this.guessInputEl.placeholder = "You're drawing!";
      } else if (this.gameManager.hasGuessedCorrectly()) {
        this.guessInputEl.placeholder = "You got it! Wait for others...";
      } else {
        this.guessInputEl.placeholder = "Waiting...";
      }
    } else {
      this.guessInputEl.placeholder = "Type your guess...";
    }
  }
}
