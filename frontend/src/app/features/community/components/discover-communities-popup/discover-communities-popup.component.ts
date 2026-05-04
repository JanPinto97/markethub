import { Component, Output, EventEmitter, inject, signal, OnInit, OnDestroy, HostListener, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';
import { CommunityService } from '../../services/community.service';
import { MediaUrlPipe } from '../../../../shared/pipes/media-url.pipe';
import { getUsernameColor } from '../../../../shared/utils/color.utils';

export interface DiscoverCommunity {
  id: string;
  name: string;
  avatar: string;
  type: 'public' | 'private';
  memberCount: number;
  isJoined: boolean;
}

@Component({
  selector: 'app-discover-communities-popup',
  standalone: true,
  imports: [MediaUrlPipe],
  templateUrl: './discover-communities-popup.component.html',
  styleUrl: './discover-communities-popup.component.css'
})
export class DiscoverCommunitiesPopupComponent implements OnInit, OnDestroy {
  @Output() closed = new EventEmitter<void>();

  private el = inject(ElementRef);
  private router = inject(Router);
  private communityService = inject(CommunityService);

  search = signal('');
  activeSort = signal<'popularity' | 'members' | 'new'>('popularity');
  activeTypes = signal<Set<string>>(new Set(['public', 'private']));
  communities = signal<DiscoverCommunity[]>([]);
  loading = signal(false);

  private search$ = new Subject<string>();
  private destroy$ = new Subject<void>();

  readonly sortOptions: { key: 'popularity' | 'members' | 'new'; label: string }[] = [
    { key: 'popularity', label: 'Popularity' },
    { key: 'members', label: 'Members' },
    { key: 'new', label: 'New' },
  ];

  ngOnInit() {
    setTimeout(() => {
      const input = this.el.nativeElement.querySelector('.dcp-search-input');
      input?.focus();
    });

    this.search$.pipe(
      debounceTime(350),
      takeUntil(this.destroy$)
    ).subscribe(() => this.fetchCommunities());

    this.fetchCommunities();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  @HostListener('document:keydown.escape')
  onEscape() { this.closed.emit(); }

  onSearch(event: Event) {
    const val = (event.target as HTMLInputElement).value;
    this.search.set(val);
    this.search$.next(val);
  }

  setSort(sort: 'popularity' | 'members' | 'new') {
    if (this.activeSort() === sort) return;
    this.activeSort.set(sort);
    this.fetchCommunities();
  }

  toggleType(type: string) {
    const current = new Set(this.activeTypes());
    if (current.has(type)) {
      if (current.size <= 1) return;
      current.delete(type);
    } else {
      current.add(type);
    }
    this.activeTypes.set(current);
    this.fetchCommunities();
  }

  isTypeActive(type: string): boolean {
    return this.activeTypes().has(type);
  }

  goToCommunity(community: DiscoverCommunity) {
    const prefix = community.type === 'public' ? '/community/c/' : '/community/p/';
    this.router.navigate([prefix + community.id]);
    this.closed.emit();
  }

  getInitialColor(name: string): string {
    return getUsernameColor(name);
  }

  private fetchCommunities() {
    this.loading.set(true);
    const types = Array.from(this.activeTypes()).join(',');
    this.communityService.discoverCommunities(this.search(), this.activeSort(), types).subscribe({
      next: (communities) => {
        this.communities.set(communities);
        this.loading.set(false);
      },
      error: () => {
        this.communities.set([]);
        this.loading.set(false);
      }
    });
  }
}
