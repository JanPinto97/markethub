import { Component, Output, EventEmitter, HostListener, ElementRef, inject } from '@angular/core';

const EMOJI_GROUPS = [
  {
    label: 'Smileys',
    emojis: ['😀', '😂', '😍', '🤔', '😎', '🙄', '😤', '🤯', '😴', '🥳'],
  },
  {
    label: 'Finance',
    emojis: ['📈', '📉', '💰', '💵', '💹', '🏦', '📊', '🪙', '💎', '🚀'],
  },
  {
    label: 'Hands',
    emojis: ['👍', '👎', '🙌', '👏', '🤝', '💪', '🫡', '☝️', '👀', '✅'],
  },
  {
    label: 'Objects',
    emojis: ['🔥', '⚡', '🎯', '📌', '🗓️', '📰', '🔔', '⏰', '🌍', '⚠️'],
  },
];

@Component({
  selector: 'app-emoji-picker',
  standalone: true,
  template: `
    <div class="ep-popover" (click)="$event.stopPropagation()">
      @for (group of groups; track group.label) {
        <div class="ep-group">
          <div class="ep-label">{{ group.label }}</div>
          <div class="ep-grid">
            @for (emoji of group.emojis; track emoji) {
              <button
                type="button"
                class="ep-btn"
                (click)="pick(emoji)">{{ emoji }}</button>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      position: absolute;
      bottom: 100%;
      left: 0;
      z-index: 50;
      margin-bottom: var(--spacing-2);
    }

    .ep-popover {
      background-color: var(--surface-container-lowest);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-ambient);
      padding: var(--spacing-3);
      width: 280px;
      max-height: 320px;
      overflow-y: auto;
    }

    .ep-group + .ep-group {
      margin-top: var(--spacing-3);
    }

    .ep-label {
      font-family: var(--font-body);
      font-size: var(--text-body-sm);
      font-weight: var(--weight-semibold);
      color: var(--on-surface-variant);
      margin-bottom: var(--spacing-2);
    }

    .ep-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: var(--spacing-1);
    }

    .ep-btn {
      width: 100%;
      aspect-ratio: 1;
      border: none;
      background: none;
      border-radius: var(--radius-default);
      font-size: 1.4rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background-color 0.12s;
    }

    .ep-btn:hover {
      background-color: var(--surface-container-high);
    }
  `],
})
export class EmojiPickerComponent {
  @Output() emojiSelected = new EventEmitter<string>();
  @Output() closed = new EventEmitter<void>();

  private el = inject(ElementRef);

  readonly groups = EMOJI_GROUPS;

  pick(emoji: string) {
    this.emojiSelected.emit(emoji);
  }

  @HostListener('document:click', ['$event'])
  onDocClick(event: MouseEvent) {
    if (!this.el.nativeElement.contains(event.target)) {
      this.closed.emit();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    this.closed.emit();
  }
}
