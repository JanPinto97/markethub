import { Component, inject, signal, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';
import {
  CommunityService, CommunityPrivateDetail, PostX,
  CommunityMember, JoinRequest, CommunityRole
} from '../../services/community.service';
import { PostCardComponent } from '../../components/post-card/post-card.component';
import { PostSkeletonComponent } from '../../components/post-skeleton/post-skeleton.component';
import { EmojiPickerComponent } from '../../../../shared/components/emoji-picker/emoji-picker.component';
import { CommunityMembersPanelComponent } from '../../components/community-members-panel/community-members-panel.component';
import { PendingRequestsPanelComponent } from '../../components/pending-requests-panel/pending-requests-panel.component';
import { getUsernameColor, getInitial } from '../../../../shared/utils/color.utils';
import { MediaUrlPipe } from '../../../../shared/pipes/media-url.pipe';

@Component({
  selector: 'app-community-private-detail',
  standalone: true,
  imports: [
    RouterLink, PostCardComponent, PostSkeletonComponent, EmojiPickerComponent,
    CommunityMembersPanelComponent, PendingRequestsPanelComponent, MediaUrlPipe
  ],
  templateUrl: './community-private-detail.component.html',
  styleUrl: './community-private-detail.component.css'
})
export class CommunityPrivateDetailComponent implements OnInit, AfterViewInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  auth = inject(AuthService);
  private svc = inject(CommunityService);
  private toast = inject(ToastService);

  @ViewChild('feedSentinel') feedSentinel?: ElementRef<HTMLDivElement>;
  @ViewChild('postTextarea') postTextarea?: ElementRef<HTMLTextAreaElement>;

  communityId = '';
  community = signal<CommunityPrivateDetail | null>(null);
  loading = signal(true);
  error = signal(false);

  // Feed
  posts = signal<PostX[]>([]);
  pinnedPosts = signal<PostX[]>([]);
  feedLoading = signal(false);
  feedError = signal(false);
  feedPage = signal(1);
  hasMore = signal(true);
  loadingMore = signal(false);
  loadMoreError = signal(false);

  // Create post
  postText = signal('');
  mediaFile: File | null = null;
  mediaPreview = signal<string | null>(null);
  mediaIsVideo = signal(false);
  creating = signal(false);
  createError = signal<string | null>(null);
  emojiPickerOpen = signal(false);
  sidePanelOpen = signal(false);

  // Join request
  showJoinModal = signal(false);
  joinMessage = signal('');
  joinSending = signal(false);
  joinError = signal<string | null>(null);

  // Leave / Delete
  showLeaveConfirm = signal(false);
  showDeleteConfirm = signal(false);
  leaving = signal(false);

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
    this.svc.getCommunityPrivate(this.communityId).subscribe({
      next: (c) => {
        this.community.set(c);
        this.loading.set(false);
        if (c.isMember) {
          this.loadPosts(true);
        }
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
      this.pinnedPosts.set([]);
      this.feedPage.set(1);
      this.hasMore.set(true);
      this.feedError.set(false);
    }
    this.feedLoading.set(true);
    this.svc.getCommunityPrivatePosts(this.communityId, 1, 10).subscribe({
      next: (res) => {
        this.pinnedPosts.set(res.pinnedPosts || []);
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
    this.svc.getCommunityPrivatePosts(this.communityId, next, 10).subscribe({
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
  }

  retryFeed() {
    this.loadPosts(true);
  }

  retryLoadMore() {
    this.loadMore();
  }

  // ── Join Request ──

  openJoinModal() {
    this.showJoinModal.set(true);
    this.joinMessage.set('');
    this.joinError.set(null);
  }

  closeJoinModal() {
    this.showJoinModal.set(false);
  }

  onJoinMessageInput(event: Event) {
    const val = (event.target as HTMLTextAreaElement).value;
    this.joinMessage.set(val.slice(0, 150));
  }

  submitJoinRequest() {
    if (this.joinSending()) return;
    this.joinSending.set(true);
    this.joinError.set(null);
    this.svc.requestJoinPrivate(this.communityId, this.joinMessage() || undefined).subscribe({
      next: () => {
        this.joinSending.set(false);
        this.showJoinModal.set(false);
        this.community.update(c => c ? { ...c, myRequestStatus: 'pending' } : c);
      },
      error: (err) => {
        this.joinSending.set(false);
        this.joinError.set(err?.error?.message || 'Could not send request.');
      }
    });
  }

  // ── Leave ──

  onLeaveClick() {
    this.showLeaveConfirm.set(true);
  }

  cancelLeave() {
    this.showLeaveConfirm.set(false);
  }

  confirmLeave() {
    this.showLeaveConfirm.set(false);
    if (this.leaving()) return;
    this.leaving.set(true);
    this.svc.leaveCommunityPrivate(this.communityId).subscribe({
      next: () => {
        this.leaving.set(false);
        this.svc.communityMembershipChanged$.next({ id: this.communityId, action: 'left' });
        this.toast.show('Left community.', 'success');
        this.router.navigate(['/community']);
      },
      error: () => {
        this.leaving.set(false);
        this.toast.show('Could not leave community.', 'error');
      }
    });
  }

  get isLastMember(): boolean {
    const c = this.community();
    return !!c && c.memberCount <= 1 && c.isMember;
  }

  // ── Delete ──

  onDeleteClick() {
    this.showDeleteConfirm.set(true);
  }

  cancelDelete() {
    this.showDeleteConfirm.set(false);
  }

  confirmDelete() {
    this.showDeleteConfirm.set(false);
    this.svc.deleteCommunityPrivate(this.communityId).subscribe({
      next: () => {
        this.svc.communityMembershipChanged$.next({ id: this.communityId, action: 'left' });
        this.toast.show('Community deleted.', 'success');
        this.router.navigate(['/community']);
      },
      error: () => {
        this.toast.show('Could not delete community.', 'error');
      }
    });
  }

  // ── Members panel actions ──

  onExpelMember(userId: string) {
    this.svc.expelMember(this.communityId, userId).subscribe({
      next: () => {
        this.community.update(c => {
          if (!c || !c.members) return c;
          return {
            ...c,
            members: c.members.filter(m => m.user.id !== userId),
            memberCount: c.memberCount - 1
          };
        });
        this.toast.show('Member removed.', 'success');
      },
      error: () => this.toast.show('Could not remove member.', 'error')
    });
  }

  onPromoteMember(event: { userId: string; role: CommunityRole }) {
    this.svc.changeMemberRole(this.communityId, event.userId, event.role).subscribe({
      next: () => {
        this.community.update(c => {
          if (!c || !c.members) return c;
          return {
            ...c,
            members: c.members.map(m =>
              m.user.id === event.userId ? { ...m, role: event.role } : m
            )
          };
        });
        this.toast.show('Role updated.', 'success');
      },
      error: () => this.toast.show('Could not update role.', 'error')
    });
  }

  // ── Requests panel actions ──

  onAcceptRequest(requestId: string) {
    this.svc.acceptRequest(this.communityId, requestId).subscribe({
      next: () => {
        const c = this.community();
        if (!c) return;
        const req = c.pendingRequests?.find(r => r._id === requestId);
        this.community.update(v => {
          if (!v) return v;
          const updated = {
            ...v,
            pendingRequests: (v.pendingRequests || []).filter(r => r._id !== requestId),
            memberCount: v.memberCount + 1,
          };
          if (req && updated.members) {
            updated.members = [...updated.members, {
              user: { id: req.user.id, username: req.user.username, avatar: req.user.avatar },
              role: 'member' as CommunityRole
            }];
          }
          return updated;
        });
        this.toast.show('Request accepted.', 'success');
      },
      error: () => this.toast.show('Could not accept request.', 'error')
    });
  }

  onRejectRequest(requestId: string) {
    this.svc.rejectRequest(this.communityId, requestId).subscribe({
      next: () => {
        this.community.update(v => v ? {
          ...v,
          pendingRequests: (v.pendingRequests || []).filter(r => r._id !== requestId)
        } : v);
        this.toast.show('Request rejected.', 'success');
      },
      error: () => this.toast.show('Could not reject request.', 'error')
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

  triggerFilePicker(fileInput: HTMLInputElement) {
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
    const text = this.postText().trim();
    if (!text || this.creating()) return;

    this.creating.set(true);
    this.createError.set(null);
    this.svc.createCommunityPrivatePost(this.communityId, text, this.mediaFile).subscribe({
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
    this.pinnedPosts.update(list => list.filter(p => p.id !== postId));
  }

  onPinToggled(event: { postId: string; pinned: boolean }) {
    if (event.pinned) {
      const post = this.posts().find(p => p.id === event.postId);
      if (post) {
        this.posts.update(list => list.filter(p => p.id !== event.postId));
        this.pinnedPosts.update(list => [{ ...post, isPinned: true }, ...list]);
      }
    } else {
      const post = this.pinnedPosts().find(p => p.id === event.postId);
      if (post) {
        this.pinnedPosts.update(list => list.filter(p => p.id !== event.postId));
        this.posts.update(list => [{ ...post, isPinned: false }, ...list]);
      }
    }
  }

  get communityContext() {
    const c = this.community();
    if (!c) return undefined;
    return { communityId: this.communityId, myRole: c.myRole };
  }

  get currentUserId(): string {
    return this.auth.currentUser()?.id || '';
  }

  get showPendingRequests(): boolean {
    const c = this.community();
    return !!c && (c.myRole === 'leader' || c.myRole === 'moderator');
  }

  // ── Helpers ──

  getInitialColor(name: string): string {
    return getUsernameColor(name);
  }

  getInitial(name: string): string {
    return getInitial(name);
  }
}
