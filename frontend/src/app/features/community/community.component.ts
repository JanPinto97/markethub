import { Component, inject, signal, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { CommunityService, Community, Topic, PostX } from './services/community.service';
import { PostCardComponent } from './components/post-card/post-card.component';

@Component({
  selector: 'app-community',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, PostCardComponent],
  templateUrl: './community.component.html',
  styleUrl: './community.component.css'
})
export class CommunityComponent implements OnInit, AfterViewInit, OnDestroy {
  auth = inject(AuthService);
  private router = inject(Router);
  private communityService = inject(CommunityService);

  @ViewChild('feedSentinel') feedSentinel?: ElementRef<HTMLDivElement>;
  @ViewChild('postTextarea') postTextarea?: ElementRef<HTMLTextAreaElement>;

  activeTab: 'trending' | 'following' = 'trending';

  communities = signal<Community[]>([]);
  communitiesLoading = signal(false);
  communitiesError = signal(false);

  pinnedTopics = signal<Topic[]>([]);
  topicsLoading = signal(true);

  // Feed state
  posts = signal<PostX[]>([]);
  feedLoading = signal(false);
  feedError = signal(false);
  feedPage = signal(1);
  hasMore = signal(true);
  loadingMore = signal(false);

  // Create post state
  postText = signal('');
  mediaFile: File | null = null;
  mediaPreview = signal<string | null>(null);
  creating = signal(false);
  createError = signal<string | null>(null);

  private observer?: IntersectionObserver;

  ngOnInit() {
    if (this.auth.isAuthenticated()) {
      this.communitiesLoading.set(true);
      this.loadMyCommunities();
    }
    this.loadPinnedTopics();
    this.loadFeed(true);
  }

  ngAfterViewInit() {
    this.setupObserver();
  }

  ngOnDestroy() {
    this.observer?.disconnect();
  }

  private setupObserver() {
    if (!this.feedSentinel) return;
    this.observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !this.loadingMore() && !this.feedLoading() && this.hasMore()) {
        this.loadMore();
      }
    }, { rootMargin: '200px' });
    this.observer.observe(this.feedSentinel.nativeElement);
  }

  setTab(tab: 'trending' | 'following') {
    if (tab === this.activeTab) return;
    if (tab === 'following' && !this.requireAuth()) return;
    this.activeTab = tab;
    this.loadFeed(true);
  }

  private loadFeed(reset: boolean) {
    if (reset) {
      this.posts.set([]);
      this.feedPage.set(1);
      this.hasMore.set(true);
      this.feedError.set(false);
    }
    this.feedLoading.set(true);
    this.communityService.getFeed(this.activeTab, 1, 10).subscribe({
      next: (res) => {
        this.posts.set(res.posts);
        this.hasMore.set(res.pagination.hasNextPage);
        this.feedPage.set(1);
        this.feedLoading.set(false);
      },
      error: () => {
        this.feedError.set(true);
        this.feedLoading.set(false);
      }
    });
  }

  private loadMore() {
    const next = this.feedPage() + 1;
    this.loadingMore.set(true);
    this.communityService.getFeed(this.activeTab, next, 10).subscribe({
      next: (res) => {
        this.posts.update(list => [...list, ...res.posts]);
        this.hasMore.set(res.pagination.hasNextPage);
        this.feedPage.set(next);
        this.loadingMore.set(false);
      },
      error: () => {
        this.loadingMore.set(false);
      }
    });
  }

  // ── Create post ──

  onTextInput(event: Event) {
    const ta = event.target as HTMLTextAreaElement;
    let val = ta.value;
    if (val.length > 400) val = val.slice(0, 400);
    this.postText.set(val);
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 200) + 'px';
  }

  onCreateFocus() {
    if (!this.auth.isAuthenticated()) {
      this.router.navigate(['/login']);
    }
  }

  triggerFilePicker(fileInput: HTMLInputElement) {
    if (!this.requireAuth()) return;
    fileInput.click();
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const okTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!okTypes.includes(file.type)) {
      this.createError.set('Unsupported image type.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      this.createError.set('Image too large (max 10MB).');
      return;
    }
    this.createError.set(null);
    this.mediaFile = file;
    const reader = new FileReader();
    reader.onload = () => this.mediaPreview.set(reader.result as string);
    reader.readAsDataURL(file);
    input.value = '';
  }

  removeMedia() {
    this.mediaFile = null;
    this.mediaPreview.set(null);
  }

  onEmojiClick() {
    if (!this.requireAuth()) return;
    console.log('open emoji picker');
  }

  submitPost() {
    if (!this.requireAuth()) return;
    const text = this.postText().trim();
    if (!text || this.creating()) return;

    this.creating.set(true);
    this.createError.set(null);
    this.communityService.createPost(text, this.mediaFile).subscribe({
      next: (newPost) => {
        this.posts.update(list => [newPost, ...list]);
        this.postText.set('');
        this.mediaFile = null;
        this.mediaPreview.set(null);
        if (this.postTextarea) {
          this.postTextarea.nativeElement.style.height = 'auto';
        }
        this.creating.set(false);
      },
      error: (err) => {
        this.createError.set(err?.error?.message || 'Could not publish post.');
        this.creating.set(false);
      }
    });
  }

  onPostDeleted(postId: string) {
    this.posts.update(list => list.filter(p => p.id !== postId));
  }

  // ── Sidebar / other ──

  openTopicSearch() {
    if (!this.requireAuth()) return;
    console.log('open topic search');
  }

  openCreateCommunity() {
    if (!this.requireAuth()) return;
    console.log('open create community modal');
  }

  requireAuth(): boolean {
    if (this.auth.isAuthenticated()) return true;
    this.router.navigate(['/login']);
    return false;
  }

  getInitialColor(name: string): string {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 55%, 45%)`;
  }

  getCategoryIcon(category: string): string {
    switch (category) {
      case 'CORE_MARKETS': return '📈';
      case 'ECONOMIA_I_MACRO': return '🏦';
      case 'ASSETS_ESPECIFICS': return '💼';
      case 'TRADING_I_INVERSIO': return '⚡';
      default: return '📊';
    }
  }

  private loadMyCommunities() {
    this.communityService.getMyCommunities().subscribe({
      next: (comms) => {
        this.communities.set(comms);
        this.communitiesLoading.set(false);
      },
      error: () => {
        this.communitiesError.set(true);
        this.communitiesLoading.set(false);
      }
    });
  }

  private loadPinnedTopics() {
    const ids = this.communityService.getPinnedTopicIds();
    if (ids.length === 0) {
      this.topicsLoading.set(false);
      return;
    }
    this.communityService.getTopicsByIds(ids).subscribe({
      next: (topics) => {
        this.pinnedTopics.set(topics);
        this.topicsLoading.set(false);
      },
      error: () => {
        this.topicsLoading.set(false);
      }
    });
  }
}
