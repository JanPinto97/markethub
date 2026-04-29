import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  OnDestroy,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/services/auth.service';
import { PostCardComponent } from '../community/components/post-card/post-card.component';
import { PostSkeletonComponent } from '../community/components/post-skeleton/post-skeleton.component';
import { PostX } from '../community/services/community.service';
import { getInitial, getUsernameColor } from '../../shared/utils/color.utils';
import { ProfileService, UserProfile, UserSummary } from './profile.service';
import { MediaUrlPipe } from '../../shared/pipes/media-url.pipe';

type FollowersTab = 'followers' | 'following';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [RouterLink, PostCardComponent, PostSkeletonComponent, MediaUrlPipe],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css',
})
export class ProfileComponent implements AfterViewInit, OnDestroy {
  auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private svc = inject(ProfileService);
  private destroyRef = inject(DestroyRef);

  @ViewChild('postsSentinel') postsSentinel?: ElementRef<HTMLDivElement>;

  username = signal<string>('');

  profile = signal<UserProfile | null>(null);
  profileLoading = signal(true);
  profileNotFound = signal(false);

  posts = signal<PostX[]>([]);
  postsLoading = signal(true);
  postsPage = signal(1);
  hasMorePosts = signal(true);
  loadingMorePosts = signal(false);

  followPending = signal(false);

  showFollowersModal = signal(false);
  followersTab = signal<FollowersTab>('followers');
  modalUsers = signal<UserSummary[]>([]);
  modalPage = signal(1);
  modalLoading = signal(false);
  modalHasMore = signal(true);

  private observer?: IntersectionObserver;
  private sentinelTarget?: HTMLDivElement;

  isOwner = computed(() => {
    const me = this.auth.currentUser();
    const p = this.profile();
    if (!me || !p) return false;
    return me.username.toLowerCase() === p.username.toLowerCase();
  });

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe(params => {
      const uname = params.get('username') || '';
      if (!uname) return;
      this.username.set(uname);
      this.loadProfile(uname);
    });
  }

  ngAfterViewInit() {
    this.tryAttachObserver();
  }

  ngOnDestroy() {
    this.observer?.disconnect();
  }

  private tryAttachObserver() {
    if (this.observer || !this.postsSentinel) return;
    this.sentinelTarget = this.postsSentinel.nativeElement;
    this.observer = new IntersectionObserver(entries => {
      if (
        entries[0].isIntersecting &&
        !this.loadingMorePosts() &&
        !this.postsLoading() &&
        this.hasMorePosts() &&
        !this.profileNotFound()
      ) {
        this.loadMorePosts();
      }
    }, { rootMargin: '200px' });
    this.observer.observe(this.sentinelTarget);
  }

  private loadProfile(username: string) {
    this.profileLoading.set(true);
    this.profileNotFound.set(false);
    this.profile.set(null);
    this.posts.set([]);
    this.postsPage.set(1);
    this.hasMorePosts.set(true);

    this.svc.getProfile(username).subscribe({
      next: profile => {
        this.profile.set(profile);
        this.profileLoading.set(false);
        this.loadPosts(username, 1, true);
        queueMicrotask(() => this.tryAttachObserver());
      },
      error: err => {
        if (err?.status === 404) {
          this.profileNotFound.set(true);
        }
        this.profileLoading.set(false);
        this.postsLoading.set(false);
      },
    });
  }

  private loadPosts(username: string, page: number, reset: boolean) {
    if (reset) {
      this.postsLoading.set(true);
    } else {
      this.loadingMorePosts.set(true);
    }
    this.svc.getUserPosts(username, page, 10).subscribe({
      next: res => {
        if (reset) {
          this.posts.set(res.posts);
        } else {
          this.posts.update(list => [...list, ...res.posts]);
        }
        this.hasMorePosts.set(res.hasNextPage);
        this.postsPage.set(page);
        this.postsLoading.set(false);
        this.loadingMorePosts.set(false);
      },
      error: () => {
        this.postsLoading.set(false);
        this.loadingMorePosts.set(false);
        this.hasMorePosts.set(false);
      },
    });
  }

  private loadMorePosts() {
    const u = this.username();
    if (!u) return;
    this.loadPosts(u, this.postsPage() + 1, false);
  }

  // ── Follow / Unfollow ──

  onFollowClick() {
    if (!this.auth.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }
    const p = this.profile();
    if (!p || this.followPending()) return;

    const prevFollowing = p.isFollowing;
    const prevCount = p.followerCount;
    const optimistic: UserProfile = {
      ...p,
      isFollowing: !prevFollowing,
      followerCount: prevCount + (!prevFollowing ? 1 : -1),
    };
    this.profile.set(optimistic);
    this.followPending.set(true);

    this.svc.toggleFollow(p.username).subscribe({
      next: res => {
        const current = this.profile();
        if (current) {
          this.profile.set({
            ...current,
            isFollowing: res.following,
            followerCount: res.followerCount,
          });
        }
        this.followPending.set(false);
      },
      error: () => {
        const current = this.profile();
        if (current) {
          this.profile.set({
            ...current,
            isFollowing: prevFollowing,
            followerCount: prevCount,
          });
        }
        this.followPending.set(false);
      },
    });
  }

  onPostDeleted(postId: string) {
    this.posts.update(list => list.filter(p => p.id !== postId));
  }

  // ── Followers / Following modal ──

  openFollowers() { this.openModal('followers'); }
  openFollowing() { this.openModal('following'); }

  private openModal(tab: FollowersTab) {
    this.followersTab.set(tab);
    this.modalUsers.set([]);
    this.modalPage.set(1);
    this.modalHasMore.set(true);
    this.showFollowersModal.set(true);
    this.loadModalPage(1, true);
  }

  setModalTab(tab: FollowersTab) {
    if (this.followersTab() === tab) return;
    this.followersTab.set(tab);
    this.modalUsers.set([]);
    this.modalPage.set(1);
    this.modalHasMore.set(true);
    this.loadModalPage(1, true);
  }

  closeFollowersModal() {
    this.showFollowersModal.set(false);
  }

  onModalBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      this.closeFollowersModal();
    }
  }

  loadMoreModal() {
    if (this.modalLoading() || !this.modalHasMore()) return;
    this.loadModalPage(this.modalPage() + 1, false);
  }

  private loadModalPage(page: number, reset: boolean) {
    const u = this.profile()?.username || this.username();
    if (!u) return;
    this.modalLoading.set(true);
    const req$ =
      this.followersTab() === 'followers'
        ? this.svc.getFollowers(u, page)
        : this.svc.getFollowing(u, page);

    req$.subscribe({
      next: res => {
        if (reset) {
          this.modalUsers.set(res.users);
        } else {
          this.modalUsers.update(list => [...list, ...res.users]);
        }
        this.modalHasMore.set(res.hasNextPage);
        this.modalPage.set(page);
        this.modalLoading.set(false);
      },
      error: () => {
        this.modalLoading.set(false);
        this.modalHasMore.set(false);
      },
    });
  }

  // ── View helpers ──

  coverBackground(username: string): string {
    return getUsernameColor(username);
  }

  initialColor(name: string): string {
    return getUsernameColor(name);
  }

  initial(name: string): string {
    return getInitial(name);
  }

  mediaUrlFull(url?: string): string {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `http://localhost:3000${url}`;
  }
}
