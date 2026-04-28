import { Component, inject, signal, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { CommunityService, Community, Topic, PostX, DiscussionTopicFull } from './services/community.service';
import { Subscription } from 'rxjs';
import { PostCardComponent } from './components/post-card/post-card.component';
import { PostSkeletonComponent } from './components/post-skeleton/post-skeleton.component';
import { EmojiPickerComponent } from '../../shared/components/emoji-picker/emoji-picker.component';
import { CreateCommunityModalComponent } from './components/create-community-modal/create-community-modal.component';
import { TopicSearchPopupComponent } from './components/topic-search-popup/topic-search-popup.component';
import { SearchBarComponent } from '../../shared/components/search-bar/search-bar.component';
import { getUsernameColor } from '../../shared/utils/color.utils';

@Component({
  selector: 'app-community',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, PostCardComponent, PostSkeletonComponent, EmojiPickerComponent, CreateCommunityModalComponent, TopicSearchPopupComponent, SearchBarComponent],
  templateUrl: './community.component.html',
  styleUrl: './community.component.css'
})
export class CommunityComponent implements OnInit, AfterViewInit, OnDestroy {
  auth = inject(AuthService);
  private router = inject(Router);
  private communityService = inject(CommunityService);
  private toast = inject(ToastService);

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
  loadMoreError = signal(false);

  // Create post state
  postText = signal('');
  mediaFile: File | null = null;
  mediaPreview = signal<string | null>(null);
  mediaIsVideo = signal(false);
  creating = signal(false);
  createError = signal<string | null>(null);
  emojiPickerOpen = signal(false);

  showCreateCommunityModal = signal(false);
  showTopicSearchPopup = signal(false);
  allTopics = signal<DiscussionTopicFull[]>([]);
  allTopicsLoaded = false;

  private observer?: IntersectionObserver;
  private membershipSub?: Subscription;

  ngOnInit() {
    if (this.auth.isAuthenticated()) {
      this.communitiesLoading.set(true);
      this.loadMyCommunities();
    }
    this.loadPinnedTopics();
    this.loadFeed(true);
    this.membershipSub = this.communityService.communityMembershipChanged$.subscribe(event => {
      if (event.action === 'joined' && event.community) {
        const newComm: Community = {
          id: event.community.id,
          name: event.community.name,
          type: 'public',
          memberCount: event.community.memberCount,
          avatar: event.community.avatar || ''
        };
        this.communities.update(list => {
          if (list.some(c => c.id === newComm.id)) return list;
          return [...list, newComm];
        });
      } else if (event.action === 'left') {
        this.communities.update(list => list.filter(c => c.id !== event.id));
      }
    });
  }

  ngAfterViewInit() {
    this.setupObserver();
  }

  ngOnDestroy() {
    this.observer?.disconnect();
    this.membershipSub?.unsubscribe();
    if (this.mediaIsVideo() && this.mediaPreview()) {
      URL.revokeObjectURL(this.mediaPreview()!);
    }
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
    this.loadMoreError.set(false);
    this.communityService.getFeed(this.activeTab, next, 10).subscribe({
      next: (res) => {
        this.posts.update(list => [...list, ...res.posts]);
        this.hasMore.set(res.pagination.hasNextPage);
        this.feedPage.set(next);
        this.loadingMore.set(false);
      },
      error: () => {
        this.loadingMore.set(false);
        this.loadMoreError.set(true);
      }
    });
  }

  retryFeed() {
    this.loadFeed(true);
  }

  retryLoadMore() {
    this.loadMore();
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
    const imageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const videoTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
    const isImage = imageTypes.includes(file.type);
    const isVideo = videoTypes.includes(file.type);
    if (!isImage && !isVideo) {
      this.createError.set('Unsupported file type.');
      input.value = '';
      return;
    }
    const maxSize = isVideo ? 100 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      this.createError.set(isVideo ? 'Video too large (max 100MB).' : 'Image too large (max 10MB).');
      input.value = '';
      return;
    }
    this.createError.set(null);
    this.removeMedia();
    this.mediaFile = file;
    this.mediaIsVideo.set(isVideo);
    if (isImage) {
      const reader = new FileReader();
      reader.onload = () => this.mediaPreview.set(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      this.mediaPreview.set(URL.createObjectURL(file));
    }
    input.value = '';
  }

  removeMedia() {
    if (this.mediaIsVideo() && this.mediaPreview()) {
      URL.revokeObjectURL(this.mediaPreview()!);
    }
    this.mediaFile = null;
    this.mediaPreview.set(null);
    this.mediaIsVideo.set(false);
  }

  onEmojiClick(event: Event) {
    event.stopPropagation();
    if (!this.requireAuth()) return;
    this.emojiPickerOpen.update(v => !v);
  }

  onEmojiSelected(emoji: string) {
    const ta = this.postTextarea?.nativeElement;
    if (ta) {
      const start = ta.selectionStart ?? ta.value.length;
      const end = ta.selectionEnd ?? start;
      const val = ta.value;
      const newVal = val.slice(0, start) + emoji + val.slice(end);
      if (newVal.length <= 400) {
        this.postText.set(newVal);
        ta.value = newVal;
        const pos = start + emoji.length;
        ta.setSelectionRange(pos, pos);
        ta.focus();
      }
    } else {
      const cur = this.postText();
      if (cur.length + emoji.length <= 400) {
        this.postText.set(cur + emoji);
      }
    }
    this.emojiPickerOpen.set(false);
  }

  onEmojiClosed() {
    this.emojiPickerOpen.set(false);
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
        this.removeMedia();
        if (this.postTextarea) {
          this.postTextarea.nativeElement.style.height = 'auto';
        }
        this.creating.set(false);
        this.toast.show('Post published successfully', 'success');
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
    if (!this.allTopicsLoaded) {
      this.communityService.getAllTopics().subscribe({
        next: (topics) => {
          this.allTopics.set(topics);
          this.allTopicsLoaded = true;
        }
      });
    }
    this.showTopicSearchPopup.update(v => !v);
  }

  onTopicSearchClose() {
    this.showTopicSearchPopup.set(false);
  }

  onTopicPinChanged(event: { id: string; pinned: boolean }) {
    if (event.pinned) {
      this.communityService.addPinnedTopic(event.id);
    } else {
      this.communityService.removePinnedTopic(event.id);
    }
    this.loadPinnedTopics();
  }

  get pinnedTopicIds(): string[] {
    return this.communityService.getPinnedTopicIds();
  }

  openCreateCommunity() {
    if (!this.requireAuth()) return;
    this.showCreateCommunityModal.set(true);
  }

  onCreateCommunityClose() {
    this.showCreateCommunityModal.set(false);
  }

  onCommunityCreated(event: { community: any; type: 'public' | 'private' }) {
    const c = event.community;
    const newComm: Community = {
      id: c.id,
      name: c.name,
      type: event.type,
      memberCount: c.memberCount ?? 1,
      avatar: c.avatar || ''
    };
    this.communities.update(list => [...list, newComm]);
  }

  requireAuth(): boolean {
    if (this.auth.isAuthenticated()) return true;
    this.router.navigate(['/login']);
    return false;
  }

  getInitialColor(name: string): string {
    return getUsernameColor(name);
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
