import { Component, Input, Output, EventEmitter, inject, signal, computed, HostListener, ElementRef, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommunityService, DiscussionTopicFull } from '../../services/community.service';

const CATEGORY_LABELS: Record<string, string> = {
  CORE_MARKETS: 'Core Markets',
  ECONOMIA_I_MACRO: 'Macro',
  ASSETS_ESPECIFICS: 'Assets',
  TRADING_I_INVERSIO: 'Trading',
};

const CATEGORY_ICONS: Record<string, string> = {
  CORE_MARKETS: '📈',
  ECONOMIA_I_MACRO: '🏦',
  ASSETS_ESPECIFICS: '💼',
  TRADING_I_INVERSIO: '⚡',
};

@Component({
  selector: 'app-topic-search-popup',
  standalone: true,
  imports: [],
  templateUrl: './topic-search-popup.component.html',
  styleUrl: './topic-search-popup.component.css'
})
export class TopicSearchPopupComponent implements OnInit {
  @Input() topics: DiscussionTopicFull[] = [];
  @Input() pinnedIds: string[] = [];
  @Output() closed = new EventEmitter<void>();
  @Output() pinChanged = new EventEmitter<{ id: string; pinned: boolean }>();
  @Output() navigated = new EventEmitter<string>();

  private el = inject(ElementRef);
  private router = inject(Router);

  search = signal('');
  activeCategory = signal<string | null>(null);
  loading = signal(false);

  readonly categories = Object.entries(CATEGORY_LABELS);

  filtered = computed(() => {
    let list = this.topics;
    const cat = this.activeCategory();
    if (cat) list = list.filter(t => t.category === cat);
    const q = this.search().toLowerCase().trim();
    if (q) list = list.filter(t => t.name.toLowerCase().includes(q));
    return list;
  });

  ngOnInit() {
    setTimeout(() => {
      const input = this.el.nativeElement.querySelector('.tsp-search-input');
      input?.focus();
    });
  }

  @HostListener('document:keydown.escape')
  onEscape() { this.closed.emit(); }

  @HostListener('document:click', ['$event'])
  onDocClick(event: Event) {
    if (!this.el.nativeElement.contains(event.target)) {
      this.closed.emit();
    }
  }

  onSearch(event: Event) {
    this.search.set((event.target as HTMLInputElement).value);
  }

  setCategory(cat: string | null) {
    this.activeCategory.set(cat);
  }

  getCategoryIcon(category: string): string {
    return CATEGORY_ICONS[category] || '📊';
  }

  getCategoryLabel(category: string): string {
    return CATEGORY_LABELS[category] || category;
  }

  isPinned(id: string): boolean {
    return this.pinnedIds.includes(id);
  }

  togglePin(event: Event, topic: DiscussionTopicFull) {
    event.stopPropagation();
    const pinned = !this.isPinned(topic.id);
    this.pinChanged.emit({ id: topic.id, pinned });
  }

  goToTopic(slug: string) {
    this.navigated.emit(slug);
    this.router.navigate(['/community/t', slug]);
    this.closed.emit();
  }
}
