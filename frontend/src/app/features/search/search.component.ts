import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { SearchService, UserResult, PostResult, CommunityResult, SearchResults } from './search.service';
import { getUsernameColor, getInitial } from '../../shared/utils/color.utils';
import { MediaUrlPipe } from '../../shared/pipes/media-url.pipe';

type FilterType = 'all' | 'users' | 'posts' | 'communities';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [RouterLink, MediaUrlPipe],
  templateUrl: './search.component.html',
  styleUrl: './search.component.css'
})
export class SearchComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private searchSvc = inject(SearchService);

  query = signal('');
  activeFilter = signal<FilterType>('all');
  page = signal(1);

  loading = signal(false);
  error = signal(false);

  users = signal<UserResult[]>([]);
  posts = signal<PostResult[]>([]);
  communities = signal<CommunityResult[]>([]);
  totals = signal({ users: 0, posts: 0, communities: 0 });
  totalPages = signal(1);

  private sub?: Subscription;
  private inputSub?: Subscription;
  private input$ = new Subject<string>();

  ngOnInit() {
    this.inputSub = this.input$
      .pipe(debounceTime(350), distinctUntilChanged())
      .subscribe(q => {
        this.router.navigate(['/search'], {
          queryParams: { q: q || null, page: null },
          queryParamsHandling: 'merge',
          replaceUrl: true
        });
      });

    this.sub = this.route.queryParams.subscribe(params => {
      const q = (params['q'] || '').trim();
      const type = (['all', 'users', 'posts', 'communities'].includes(params['type']) ? params['type'] : 'all') as FilterType;
      const page = Math.max(1, parseInt(params['page']) || 1);

      this.query.set(q);
      this.activeFilter.set(type);
      this.page.set(page);

      if (q.length >= 2) {
        this.doSearch(q, type, page);
      } else {
        this.users.set([]);
        this.posts.set([]);
        this.communities.set([]);
        this.totals.set({ users: 0, posts: 0, communities: 0 });
        this.loading.set(false);
        this.error.set(false);
      }
    });
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
    this.inputSub?.unsubscribe();
  }

  onSearchInput(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.query.set(value);
    this.input$.next(value.trim());
  }

  clearSearch() {
    this.query.set('');
    this.input$.next('');
  }

  private doSearch(q: string, type: FilterType, page: number) {
    this.loading.set(true);
    this.error.set(false);
    this.searchSvc.search(q, type, page, 10).subscribe({
      next: (res) => {
        this.users.set(res.users);
        this.posts.set(res.posts);
        this.communities.set(res.communities);
        this.totals.set(res.totals);
        this.totalPages.set(res.pagination.totalPages);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      }
    });
  }

  setFilter(type: FilterType) {
    this.router.navigate(['/search'], {
      queryParams: { q: this.query(), type: type === 'all' ? undefined : type, page: undefined },
      queryParamsHandling: 'merge'
    });
  }

  goToPage(p: number) {
    this.router.navigate(['/search'], {
      queryParams: { page: p > 1 ? p : undefined },
      queryParamsHandling: 'merge'
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  retry() {
    this.doSearch(this.query(), this.activeFilter(), this.page());
  }

  get hasAnyResults(): boolean {
    return this.users().length > 0 || this.posts().length > 0 || this.communities().length > 0;
  }

  get showUsers(): boolean {
    return this.activeFilter() === 'all' || this.activeFilter() === 'users';
  }

  get showPosts(): boolean {
    return this.activeFilter() === 'all' || this.activeFilter() === 'posts';
  }

  get showCommunities(): boolean {
    return this.activeFilter() === 'all' || this.activeFilter() === 'communities';
  }

  communityRoute(c: CommunityResult): string {
    return c.type === 'public' ? '/community/c/' + c.id : '/community/p/' + c.id;
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
