import { Component, inject, signal, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';
import { CommunityService, CommunityPublic, PostX } from '../../services/community.service';
import { PostCardComponent } from '../../components/post-card/post-card.component';
import { PostSkeletonComponent } from '../../components/post-skeleton/post-skeleton.component';
import { EmojiPickerComponent } from '../../../../shared/components/emoji-picker/emoji-picker.component';
import { getUsernameColor, getInitial } from '../../../../shared/utils/color.utils';

@Component({
  selector: 'app-community-public-detail',
  standalone: true,
  imports: [RouterLink, PostCardComponent, PostSkeletonComponent, EmojiPickerComponent],
  templateUrl: './community-public-detail.component.html',
  styleUrl: './community-public-detail.component.css'
})
export class CommunityPublicDetailComponent implements OnInit, AfterViewInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  auth = inject(AuthService);
  private svc = inject(CommunityService);
  private toast = inject(ToastService);

  @ViewChild('feedSentinel') feedSentinel?: ElementRef<HTMLDivElement>;
  @ViewChild('postTextarea') postTextarea?: ElementRef<HTMLTextAreaElement>;

  communityId = '';
  community = signal<CommunityPublic | null>(null);
  loading = signal(true);
  error = signal(false);

  posts = signal<PostX[]>([]);
  feedLoading = signal(false);
  feedError = signal(false);
  feedPage = signal(1);
  hasMore = signal(true);
  loadingMore = signal(false);
  loadMoreError = signal(false);

  postText = signal('');
  mediaFile: File | null = null;
  mediaPreview = signal<string | null>(null);
  mediaIsVideo = signal(false);
  creating = signal(false);
  createError = signal<string | null>(null);
  emojiPickerOpen = signal(false);

  joiningOrLeaving = signal(false);
  showLeaveConfirm = signal(false);

  private observer?: IntersectionObserver;
  private subs: Subscription[] = [];

  ngOnInit() {
    this.communityId = this.route.snapshot.paramMap.get('id') || '';
    if (!this.communityId) {
      this.error.set(true);
      this.loading.set(false);
      return;
    }
    this.loadCommunity();
    this.loadPosts(true);
  }

  ngAfterViewInit() {
    this.setupObserver();
  }

  ngOnDestroy() {
    this.observer?.disconnect();
    this.subs.forEach(s => s.unsubscribe());
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

  private loadCommunity() {
    this.loading.set(true);
    this.error.set(false);
    this.svc.getCommunityPublic(this.communityId).subscribe({
      next: (c) => {
        this.community.set(c);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      }
    });
  }

  private loadPosts(reset: boolean) {
    if (reset) {
      this.posts.set([]);
      this.feedPage.set(1);
      this.hasMore.set(true);
      this.feedError.set(false);
    }
    this.feedLoading.set(true);
    this.svc.getCommunityPublicPosts(this.communityId, 1, 10).subscribe({
      next: (res) => {
        this.posts.set(res.posts);
        this.hasMore.set(res.pagination.hasNextPage);
        this.feedPage.set(1);
        this.feedLoading.set(false);
        setTimeout(() => this.setupObserver());
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
    this.svc.getCommunityPublicPosts(this.communityId, next, 10).subscribe({
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

  retryAll() {
    this.loadCommunity();
    this.loadPosts(true);
  }

  retryFeed() {
    this.loadPosts(true);
  }

  retryLoadMore() {
    this.loadMore();
  }

  // ── Join / Leave ──

  onJoinClick() {
    if (!this.auth.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }
    this.join();
  }

  private join() {
    const c = this.community();
    if (!c || this.joiningOrLeaving()) return;

    this.joiningOrLeaving.set(true);
    const prevMember = c.isMember;
    const prevCount = c.memberCount;
    this.community.set({ ...c, isMember: true, memberCount: c.memberCount + 1 });

    this.svc.joinCommunityPublic(this.communityId).subscribe({
      next: (res) => {
        this.community.update(v => v ? { ...v, memberCount: res.memberCount } : v);
        this.joiningOrLeaving.set(false);
        this.svc.communityMembershipChanged$.next({
          id: this.communityId,
          action: 'joined',
          community: this.community()!
        });
        this.toast.show('Joined community!', 'success');
      },
      error: () => {
        this.community.set({ ...c, isMember: prevMember, memberCount: prevCount });
        this.joiningOrLeaving.set(false);
        this.toast.show('Could not join community.', 'error');
      }
    });
  }

  onLeaveClick() {
    this.showLeaveConfirm.set(true);
  }

  cancelLeave() {
    this.showLeaveConfirm.set(false);
  }

  confirmLeave() {
    this.showLeaveConfirm.set(false);
    const c = this.community();
    if (!c || this.joiningOrLeaving()) return;

    this.joiningOrLeaving.set(true);
    const prevMember = c.isMember;
    const prevCount = c.memberCount;
    this.community.set({ ...c, isMember: false, memberCount: c.memberCount - 1 });

    this.svc.leaveCommunityPublic(this.communityId).subscribe({
      next: (res) => {
        this.community.update(v => v ? { ...v, memberCount: res.memberCount } : v);
        this.joiningOrLeaving.set(false);
        this.svc.communityMembershipChanged$.next({
          id: this.communityId,
          action: 'left'
        });
        this.toast.show('Left community.', 'success');
      },
      error: () => {
        this.community.set({ ...c, isMember: prevMember, memberCount: prevCount });
        this.joiningOrLeaving.set(false);
        this.toast.show('Could not leave community.', 'error');
      }
    });
  }

  get isLastMember(): boolean {
    const c = this.community();
    return !!c && c.memberCount <= 1 && c.isMember;
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

  triggerFilePicker(fileInput: HTMLInputElement) {
    if (!this.auth.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }
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
    if (!this.auth.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }
    const text = this.postText().trim();
    if (!text || this.creating()) return;

    this.creating.set(true);
    this.createError.set(null);
    this.svc.createCommunityPost(this.communityId, text, this.mediaFile).subscribe({
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

  // ── Helpers ──

  getInitialColor(name: string): string {
    return getUsernameColor(name);
  }

  getInitial(name: string): string {
    return getInitial(name);
  }
}
