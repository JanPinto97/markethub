import { Component, inject, signal, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';
import { CommunityService, DiscussionTopicFull, PostReddit } from '../../services/community.service';
import { PostRedditCardComponent } from '../../components/post-reddit-card/post-reddit-card.component';
import { PostSkeletonComponent } from '../../components/post-skeleton/post-skeleton.component';
import { EmojiPickerComponent } from '../../../../shared/components/emoji-picker/emoji-picker.component';

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
  selector: 'app-topic-detail',
  standalone: true,
  imports: [RouterLink, PostRedditCardComponent, PostSkeletonComponent, EmojiPickerComponent],
  templateUrl: './topic-detail.component.html',
  styleUrl: './topic-detail.component.css'
})
export class TopicDetailComponent implements OnInit, AfterViewInit, OnDestroy {
  auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private svc = inject(CommunityService);
  private toast = inject(ToastService);

  @ViewChild('feedSentinel') feedSentinel?: ElementRef<HTMLDivElement>;
  @ViewChild('titleInput') titleInput?: ElementRef<HTMLInputElement>;
  @ViewChild('textArea') textArea?: ElementRef<HTMLTextAreaElement>;

  slug = '';
  topic = signal<DiscussionTopicFull | null>(null);
  topicLoading = signal(true);
  topicError = signal(false);

  sortMode = signal<'top' | 'recent'>('top');
  posts = signal<PostReddit[]>([]);
  feedLoading = signal(false);
  feedError = signal(false);
  feedPage = signal(1);
  hasMore = signal(true);
  loadingMore = signal(false);
  loadMoreError = signal(false);

  postTitle = signal('');
  postText = signal('');
  mediaFile: File | null = null;
  mediaPreview = signal<string | null>(null);
  mediaIsVideo = signal(false);
  creating = signal(false);
  createError = signal<string | null>(null);
  emojiPickerOpen = signal(false);

  private observer?: IntersectionObserver;

  ngOnInit() {
    this.slug = this.route.snapshot.paramMap.get('slug') || '';
    this.loadTopic();
    this.loadFeed(true);
  }

  ngAfterViewInit() {
    this.setupObserver();
  }

  ngOnDestroy() {
    this.observer?.disconnect();
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

  getCategoryIcon(): string {
    return CATEGORY_ICONS[this.topic()?.category || ''] || '📊';
  }

  getCategoryLabel(): string {
    return CATEGORY_LABELS[this.topic()?.category || ''] || '';
  }

  loadTopic() {
    this.topicLoading.set(true);
    this.topicError.set(false);
    this.svc.getTopicDetail(this.slug).subscribe({
      next: (t) => {
        this.topic.set(t);
        this.topicLoading.set(false);
      },
      error: () => {
        this.topicError.set(true);
        this.topicLoading.set(false);
      }
    });
  }

  setSort(mode: 'top' | 'recent') {
    if (mode === this.sortMode()) return;
    this.sortMode.set(mode);
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
    this.svc.getTopicPosts(this.slug, this.sortMode(), 1, 10).subscribe({
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
    this.svc.getTopicPosts(this.slug, this.sortMode(), next, 10).subscribe({
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

  retryFeed() { this.loadFeed(true); }
  retryLoadMore() { this.loadMore(); }

  onPostDeleted(postId: string) {
    this.posts.update(list => list.filter(p => p.id !== postId));
    const t = this.topic();
    if (t) this.topic.set({ ...t, postCount: Math.max(0, t.postCount - 1) });
  }

  // ── Create post ──

  requireAuth(): boolean {
    if (this.auth.isAuthenticated()) return true;
    this.router.navigate(['/login']);
    return false;
  }

  onTitleInput(event: Event) {
    const val = (event.target as HTMLInputElement).value;
    this.postTitle.set(val.slice(0, 300));
  }

  onTextInput(event: Event) {
    const ta = event.target as HTMLTextAreaElement;
    let val = ta.value;
    if (val.length > 2000) val = val.slice(0, 2000);
    this.postText.set(val);
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 300) + 'px';
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
    const ta = this.textArea?.nativeElement;
    if (ta) {
      const start = ta.selectionStart ?? ta.value.length;
      const end = ta.selectionEnd ?? start;
      const val = ta.value;
      const newVal = val.slice(0, start) + emoji + val.slice(end);
      if (newVal.length <= 2000) {
        this.postText.set(newVal);
        ta.value = newVal;
        const pos = start + emoji.length;
        ta.setSelectionRange(pos, pos);
        ta.focus();
      }
    } else {
      const cur = this.postText();
      if (cur.length + emoji.length <= 2000) {
        this.postText.set(cur + emoji);
      }
    }
    this.emojiPickerOpen.set(false);
  }

  onEmojiClosed() { this.emojiPickerOpen.set(false); }

  submitPost() {
    if (!this.requireAuth()) return;
    const title = this.postTitle().trim();
    if (!title || this.creating()) return;

    this.creating.set(true);
    this.createError.set(null);
    const text = this.postText().trim() || undefined;
    this.svc.createTopicPost(this.slug, title, text, this.mediaFile).subscribe({
      next: (newPost) => {
        newPost.userVote = null;
        this.posts.update(list => [newPost, ...list]);
        this.postTitle.set('');
        this.postText.set('');
        this.removeMedia();
        if (this.textArea) this.textArea.nativeElement.style.height = 'auto';
        this.creating.set(false);
        this.toast.show('Post published.', 'success');
        const t = this.topic();
        if (t) this.topic.set({ ...t, postCount: t.postCount + 1 });
      },
      error: (err) => {
        this.createError.set(err?.error?.message || 'Could not publish post.');
        this.creating.set(false);
      }
    });
  }
}
