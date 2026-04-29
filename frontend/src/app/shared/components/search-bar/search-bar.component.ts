import { Component, inject, signal, OnInit, OnDestroy, HostListener, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, Subscription, debounceTime, distinctUntilChanged, switchMap, of, catchError } from 'rxjs';
import { SearchService, UserResult, PostResult, CommunityResult } from '../../../features/search/search.service';
import { getUsernameColor, getInitial } from '../../utils/color.utils';

@Component({
  selector: 'app-search-bar',
  standalone: true,
  imports: [],
  templateUrl: './search-bar.component.html',
  styleUrl: './search-bar.component.css'
})
export class SearchBarComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private searchSvc = inject(SearchService);
  private elRef = inject(ElementRef);

  query = signal('');
  dropdownOpen = signal(false);
  loading = signal(false);
  error = signal(false);

  users = signal<UserResult[]>([]);
  posts = signal<PostResult[]>([]);
  communities = signal<CommunityResult[]>([]);

  focusedIndex = signal(-1);

  private search$ = new Subject<string>();
  private sub?: Subscription;

  ngOnInit() {
    this.sub = this.search$.pipe(
      debounceTime(350),
      distinctUntilChanged(),
      switchMap(q => {
        if (q.length < 2) {
          this.dropdownOpen.set(false);
          return of(null);
        }
        this.loading.set(true);
        this.error.set(false);
        this.dropdownOpen.set(true);
        return this.searchSvc.search(q, 'all', 1, 3).pipe(
          catchError(() => {
            this.error.set(true);
            this.loading.set(false);
            return of(null);
          })
        );
      })
    ).subscribe(res => {
      if (res) {
        this.users.set(res.users.slice(0, 3));
        this.posts.set(res.posts.slice(0, 3));
        this.communities.set(res.communities.slice(0, 3));
        this.loading.set(false);
        this.error.set(false);
        this.dropdownOpen.set(true);
      }
      this.focusedIndex.set(-1);
    });
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
    this.search$.complete();
  }

  onInput(event: Event) {
    const val = (event.target as HTMLInputElement).value;
    this.query.set(val);
    this.search$.next(val.trim());
  }

  onKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      this.dropdownOpen.set(false);
      (event.target as HTMLInputElement).blur();
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      const idx = this.focusedIndex();
      if (idx >= 0 && this.dropdownOpen()) {
        this.navigateToItem(idx);
      } else if (this.query().trim().length >= 2) {
        this.goToSearch();
      }
      return;
    }

    if (!this.dropdownOpen()) return;

    const total = this.totalItems;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.focusedIndex.update(v => (v + 1) % (total + 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.focusedIndex.update(v => v <= 0 ? total : v - 1);
    }
  }

  get totalItems(): number {
    return this.users().length + this.posts().length + this.communities().length;
  }

  get hasResults(): boolean {
    return this.users().length > 0 || this.posts().length > 0 || this.communities().length > 0;
  }

  getItemIndex(section: 'users' | 'posts' | 'communities', i: number): number {
    if (section === 'users') return i;
    if (section === 'posts') return this.users().length + i;
    return this.users().length + this.posts().length + i;
  }

  private navigateToItem(idx: number) {
    const uLen = this.users().length;
    const pLen = this.posts().length;
    const cLen = this.communities().length;

    if (idx < uLen) {
      this.router.navigate(['/profile', this.users()[idx].username]);
    } else if (idx < uLen + pLen) {
      this.goToSearch('posts');
    } else if (idx < uLen + pLen + cLen) {
      const c = this.communities()[idx - uLen - pLen];
      const route = c.type === 'public' ? '/community/c/' : '/community/p/';
      this.router.navigate([route + c.id]);
    } else {
      this.goToSearch();
    }
    this.close();
  }

  goToSearch(type?: string) {
    const params: any = { q: this.query().trim() };
    if (type) params.type = type;
    this.router.navigate(['/search'], { queryParams: params });
    this.close();
  }

  onUserClick(user: UserResult) {
    this.router.navigate(['/profile', user.username]);
    this.close();
  }

  onPostClick() {
    this.goToSearch('posts');
  }

  onCommunityClick(c: CommunityResult) {
    const route = c.type === 'public' ? '/community/c/' : '/community/p/';
    this.router.navigate([route + c.id]);
    this.close();
  }

  close() {
    this.dropdownOpen.set(false);
    this.focusedIndex.set(-1);
  }

  @HostListener('document:click', ['$event'])
  onDocClick(event: Event) {
    if (!this.elRef.nativeElement.contains(event.target)) {
      this.close();
    }
  }

  relativeTime(date: string): string {
    const diff = Date.now() - new Date(date).getTime();
    const s = Math.floor(diff / 1000);
    if (s < 60) return 'now';
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    return `${d}d ago`;
  }

  initialColor(name: string): string {
    return getUsernameColor(name);
  }

  initial(name: string): string {
    return getInitial(name);
  }
}
