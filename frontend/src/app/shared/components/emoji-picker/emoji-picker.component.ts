import {
  Component,
  Output,
  EventEmitter,
  HostListener,
  ElementRef,
  inject,
  signal,
  computed,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

interface EmojiItem {
  emoji: string;
  name: string;
  group: string;
}

interface EmojiGroup {
  label: string;
  emojis: EmojiItem[];
}

const EMOJI_DATA_URL =
  'https://cdn.jsdelivr.net/npm/unicode-emoji-json@0.6.0/data-by-group.json';

const INITIAL_PER_GROUP = 8;
const FILTER_CHUNK_SIZE = 80;

let RAW_GROUPS: EmojiGroup[] | null = null;
let RAW_INFLIGHT: Promise<EmojiGroup[]> | null = null;
let CACHED_INITIAL: EmojiGroup[] | null = null;
let CACHED_FULL: EmojiGroup[] | null = null;
let FULL_INFLIGHT: Promise<EmojiGroup[]> | null = null;
const FULL_PROGRESS_LISTENERS = new Set<(groups: EmojiGroup[]) => void>();

const EMOJI_FONT_STACK =
  "'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif";

let SUPPORT_CTX: CanvasRenderingContext2D | null = null;
let TOFU_HASH: string | null = null;

function getSupportCtx(): CanvasRenderingContext2D | null {
  if (SUPPORT_CTX) return SUPPORT_CTX;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    ctx.textBaseline = 'top';
    ctx.font = `24px ${EMOJI_FONT_STACK}`;
    SUPPORT_CTX = ctx;
    return ctx;
  } catch {
    return null;
  }
}

function hashRender(ctx: CanvasRenderingContext2D, char: string): string {
  ctx.clearRect(0, 0, 32, 32);
  ctx.fillText(char, 0, 0);
  const data = ctx.getImageData(0, 0, 32, 32).data;
  let h = 0;
  for (let i = 0; i < data.length; i += 16) {
    h = ((h << 5) - h + data[i] + data[i + 1] * 3 + data[i + 2] * 7) | 0;
  }
  return h.toString(36);
}

function isEmojiSupported(emoji: string): boolean {
  const ctx = getSupportCtx();
  if (!ctx) return true;
  if (TOFU_HASH === null) {
    TOFU_HASH = hashRender(ctx, '￾');
  }
  const h = hashRender(ctx, emoji);
  return h !== TOFU_HASH;
}

async function loadRawGroups(): Promise<EmojiGroup[]> {
  if (RAW_GROUPS) return RAW_GROUPS;
  if (RAW_INFLIGHT) return RAW_INFLIGHT;

  RAW_INFLIGHT = (async () => {
    const res = await fetch(EMOJI_DATA_URL);
    if (!res.ok) throw new Error('Failed to load emojis');
    const json = await res.json();

    let groups: EmojiGroup[];
    if (Array.isArray(json)) {
      groups = json.map((g: any) => ({
        label: g.name ?? g.slug ?? 'Group',
        emojis: (g.emojis ?? []).map((e: any) => ({
          emoji: e.emoji,
          name: e.name,
          group: g.name ?? g.slug ?? 'Group',
        })),
      }));
    } else {
      groups = Object.entries(json as Record<string, any[]>).map(
        ([label, emojis]) => ({
          label,
          emojis: (emojis ?? []).map((e: any) => ({
            emoji: e.emoji,
            name: e.name,
            group: label,
          })),
        }),
      );
    }

    RAW_GROUPS = groups;
    return groups;
  })();

  try {
    return await RAW_INFLIGHT;
  } finally {
    RAW_INFLIGHT = null;
  }
}

async function loadInitialEmojis(): Promise<EmojiGroup[]> {
  if (CACHED_FULL) return CACHED_FULL;
  if (CACHED_INITIAL) return CACHED_INITIAL;
  const raw = await loadRawGroups();
  const initial = raw
    .map((g) => ({
      label: g.label,
      emojis: g.emojis
        .slice(0, INITIAL_PER_GROUP)
        .filter((e) => isEmojiSupported(e.emoji)),
    }))
    .filter((g) => g.emojis.length > 0);
  CACHED_INITIAL = initial;
  return initial;
}

function snapshotProgress(result: EmojiGroup[]): EmojiGroup[] {
  return result
    .map((g) => ({ label: g.label, emojis: [...g.emojis] }))
    .filter((g) => g.emojis.length > 0);
}

function loadFullEmojis(
  onProgress: (groups: EmojiGroup[]) => void,
): Promise<EmojiGroup[]> {
  if (CACHED_FULL) {
    onProgress(CACHED_FULL);
    return Promise.resolve(CACHED_FULL);
  }
  FULL_PROGRESS_LISTENERS.add(onProgress);
  if (FULL_INFLIGHT) {
    return FULL_INFLIGHT.finally(() => {
      FULL_PROGRESS_LISTENERS.delete(onProgress);
    });
  }

  FULL_INFLIGHT = (async () => {
    const raw = await loadRawGroups();
    const result: EmojiGroup[] = raw.map((g) => ({
      label: g.label,
      emojis: g.emojis
        .slice(0, INITIAL_PER_GROUP)
        .filter((e) => isEmojiSupported(e.emoji)),
    }));

    const notify = () => {
      const snap = snapshotProgress(result);
      for (const l of FULL_PROGRESS_LISTENERS) l(snap);
    };

    for (let gi = 0; gi < raw.length; gi++) {
      const sourceEmojis = raw[gi].emojis;
      for (let i = INITIAL_PER_GROUP; i < sourceEmojis.length; i += FILTER_CHUNK_SIZE) {
        const end = Math.min(i + FILTER_CHUNK_SIZE, sourceEmojis.length);
        for (let j = i; j < end; j++) {
          const e = sourceEmojis[j];
          if (isEmojiSupported(e.emoji)) result[gi].emojis.push(e);
        }
        await new Promise((r) => setTimeout(r, 0));
        notify();
      }
    }

    const final = result.filter((g) => g.emojis.length > 0);
    CACHED_FULL = final;
    CACHED_INITIAL = null;
    return final;
  })();

  return FULL_INFLIGHT.finally(() => {
    FULL_PROGRESS_LISTENERS.delete(onProgress);
    FULL_INFLIGHT = null;
  });
}

@Component({
  selector: 'app-emoji-picker',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="ep-popover" (click)="$event.stopPropagation()">
      <div class="ep-search">
        <input
          type="text"
          class="ep-search-input"
          placeholder="Search emoji..."
          [ngModel]="searchTerm()"
          (ngModelChange)="onSearchInput($event)"
          aria-label="Search emoji"
        />
      </div>

      @if (loading()) {
        <div class="ep-state">Loading emojis...</div>
      } @else if (errored()) {
        <div class="ep-state">Failed to load emojis</div>
      } @else {
        @if (!searchTerm().trim()) {
          <div class="ep-tabs" role="tablist">
            @for (g of groups(); track g.label) {
              <button
                type="button"
                class="ep-tab"
                [class.active]="g.label === activeGroup()"
                (click)="selectGroup(g.label)"
                role="tab"
              >{{ g.label }}</button>
            }
          </div>
        }

        <div class="ep-grid-wrap">
          @if (visibleEmojis().length === 0) {
            <div class="ep-state">No emojis found</div>
          } @else {
            <div class="ep-grid">
              @for (e of visibleEmojis(); track e.emoji) {
                <button
                  type="button"
                  class="ep-btn"
                  [title]="e.name"
                  (click)="pick(e.emoji)"
                >{{ e.emoji }}</button>
              }
            </div>
          }
          @if (loadingMore()) {
            <div class="ep-loading-more">Loading more emojis...</div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      position: absolute;
      top: 100%;
      left: 0;
      z-index: 1000;
      margin-top: var(--spacing-2);
    }

    .ep-popover {
      background-color: var(--surface-container-lowest);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-ambient);
      width: 320px;
      height: 400px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .ep-search {
      padding: var(--spacing-3);
      border-bottom: 1px solid var(--surface-container-high);
    }

    .ep-search-input {
      width: 100%;
      padding: var(--spacing-2) var(--spacing-3);
      border: 1px solid var(--surface-container-high);
      border-radius: var(--radius-default);
      font-family: var(--font-body);
      font-size: var(--text-body-sm);
      background-color: var(--surface-container-lowest);
      color: var(--on-surface);
      outline: none;
    }

    .ep-search-input:focus {
      border-color: var(--secondary);
    }

    .ep-tabs {
      display: flex;
      gap: var(--spacing-1);
      padding: var(--spacing-2);
      overflow-x: auto;
      overflow-y: hidden;
      border-bottom: 1px solid var(--surface-container-high);
      flex-shrink: 0;
      scrollbar-width: thin;
    }

    .ep-tabs::-webkit-scrollbar {
      height: 4px;
    }

    .ep-tab {
      flex-shrink: 0;
      padding: var(--spacing-1) var(--spacing-3);
      border: none;
      background: none;
      border-radius: var(--radius-default);
      font-family: var(--font-body);
      font-size: var(--text-body-sm);
      font-weight: var(--weight-medium);
      color: var(--on-surface-variant);
      cursor: pointer;
      white-space: nowrap;
      text-transform: capitalize;
      transition: background-color 0.12s, color 0.12s;
    }

    .ep-tab:hover {
      background-color: var(--surface-container-low);
    }

    .ep-tab.active {
      background-color: var(--surface-container-high);
      color: var(--on-surface);
      font-weight: var(--weight-semibold);
    }

    .ep-grid-wrap {
      flex: 1;
      overflow-y: auto;
      padding: var(--spacing-2);
    }

    .ep-grid {
      display: grid;
      grid-template-columns: repeat(8, 1fr);
      gap: var(--spacing-1);
    }

    .ep-btn {
      width: 100%;
      aspect-ratio: 1;
      border: none;
      background: none;
      border-radius: var(--radius-default);
      font-family: 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif;
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

    .ep-state {
      padding: var(--spacing-4);
      text-align: center;
      color: var(--on-surface-variant);
      font-size: var(--text-body-sm);
    }

    .ep-loading-more {
      padding: var(--spacing-3);
      text-align: center;
      color: var(--on-surface-variant);
      font-size: var(--text-body-sm);
      font-style: italic;
      font-family: var(--font-body);
    }
  `],
})
export class EmojiPickerComponent implements OnInit, OnDestroy {
  @Output() emojiSelected = new EventEmitter<string>();
  @Output() closed = new EventEmitter<void>();

  private el = inject(ElementRef);

  readonly groups = signal<EmojiGroup[]>([]);
  readonly loading = signal(true);
  readonly loadingMore = signal(false);
  readonly errored = signal(false);
  readonly searchTerm = signal('');
  readonly debouncedTerm = signal('');
  readonly activeGroup = signal<string>('');

  private debounceTimer: any = null;
  private destroyed = false;

  readonly visibleEmojis = computed<EmojiItem[]>(() => {
    const term = this.debouncedTerm().trim().toLowerCase();
    const allGroups = this.groups();
    if (term) {
      const out: EmojiItem[] = [];
      for (const g of allGroups) {
        for (const e of g.emojis) {
          if (e.name.toLowerCase().includes(term)) out.push(e);
        }
      }
      return out;
    }
    const active = this.activeGroup();
    const grp = allGroups.find((g) => g.label === active);
    return grp ? grp.emojis : [];
  });

  ngOnInit(): void {
    loadInitialEmojis()
      .then((initial) => {
        if (this.destroyed) return;
        this.groups.set(initial);
        if (initial.length > 0 && !this.activeGroup()) {
          this.activeGroup.set(initial[0].label);
        }
        this.loading.set(false);

        if (CACHED_FULL) {
          this.groups.set(CACHED_FULL);
          this.loadingMore.set(false);
        } else {
          this.loadingMore.set(true);
          loadFullEmojis((progress) => {
            if (this.destroyed) return;
            this.groups.set(progress);
          })
            .then((full) => {
              if (this.destroyed) return;
              this.groups.set(full);
              this.loadingMore.set(false);
            })
            .catch(() => {
              if (this.destroyed) return;
              this.loadingMore.set(false);
            });
        }
      })
      .catch(() => {
        if (this.destroyed) return;
        this.errored.set(true);
        this.loading.set(false);
      });
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
  }

  onSearchInput(value: string) {
    this.searchTerm.set(value);
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.debouncedTerm.set(value);
    }, 200);
  }

  selectGroup(label: string) {
    this.activeGroup.set(label);
  }

  pick(emoji: string) {
    this.emojiSelected.emit(emoji);
    this.closed.emit();
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
