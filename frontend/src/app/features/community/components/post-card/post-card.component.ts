import { Component, Input, Output, EventEmitter, inject, signal, computed, HostBinding, HostListener } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { CommunityService, PostX, PostComment, CommunityRole } from '../../services/community.service';
import { ToastService } from '../../../../core/services/toast.service';
import { getUsernameColor, getInitial } from '../../../../shared/utils/color.utils';
import { MediaUrlPipe } from '../../../../shared/pipes/media-url.pipe';

@Component({
  selector: 'app-post-card',
  standalone: true,
  imports: [RouterLink, MediaUrlPipe],
  templateUrl: './post-card.component.html',
  styleUrl: './post-card.component.css'
})
export class PostCardComponent {
  @Input({ required: true }) post!: PostX;
  @Input() communityContext?: { communityId: string; myRole: CommunityRole | null };
  @Output() deleted = new EventEmitter<string>();
  @Output() pinToggled = new EventEmitter<{ postId: string; pinned: boolean }>();

  auth = inject(AuthService);
  private router = inject(Router);
  private svc = inject(CommunityService);
  private toast = inject(ToastService);

  readonly TEXT_LIMIT = 280;

  expanded = signal(false);
  menuOpen = signal(false);
  openCommentMenuId = signal<string | null>(null);
  removing = signal(false);
  videoError = signal(false);

  commentsOpen = signal(false);
  commentsLoading = signal(false);
  commentsError = signal(false);
  comments = signal<PostComment[]>([]);
  visibleCount = signal(5);
  newComment = signal('');
  sendingComment = signal(false);

  @HostBinding('class.removing') get isRemoving() { return this.removing(); }

  get authorName(): string {
    const a = this.post.author;
    if (!a) return 'Unknown';
    if (typeof a === 'string') return 'User';
    return a.username || 'User';
  }

  get authorUsername(): string {
    const a = this.post.author;
    if (!a || typeof a === 'string') return '';
    return a.username || '';
  }

  get authorAvatar(): string | undefined {
    const a = this.post.author;
    if (!a || typeof a === 'string') return undefined;
    return a.avatar;
  }

  get communityName(): string | null {
    const c = this.post.community;
    if (!c || typeof c === 'string') return null;
    return c.name || null;
  }

  get communityId(): string | null {
    const c = this.post.community;
    if (!c || typeof c === 'string') return c || null;
    return c._id || null;
  }

  get isOwner(): boolean {
    const u = this.auth.currentUser();
    if (!u) return false;
    const a = this.post.author;
    if (!a || typeof a === 'string') return false;
    return a._id === u.id;
  }

  get isMod(): boolean {
    const u = this.auth.currentUser();
    return u?.role === 'moderator' || u?.role === 'superadmin';
  }

  get displayText(): string {
    const t = this.post.text || '';
    if (this.expanded() || t.length <= this.TEXT_LIMIT) return t;
    return t.slice(0, this.TEXT_LIMIT) + '…';
  }

  get shouldTruncate(): boolean {
    return (this.post.text || '').length > this.TEXT_LIMIT;
  }

  get mediaUrlFull(): string {
    if (!this.post.mediaUrl) return '';
    return `http://localhost:3000${this.post.mediaUrl}`;
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
    if (d < 7) return `${d}d ago`;
    const w = Math.floor(d / 7);
    if (w < 4) return `${w}w ago`;
    const mo = Math.floor(d / 30);
    if (mo < 12) return `${mo}mo ago`;
    return `${Math.floor(d / 365)}y ago`;
  }

  initial(name: string): string {
    return getInitial(name);
  }

  initialColor(name: string): string {
    return getUsernameColor(name);
  }

  toggleExpand() {
    this.expanded.update(v => !v);
  }

  toggleMenu(event: Event) {
    event.stopPropagation();
    this.openCommentMenuId.set(null);
    this.menuOpen.update(v => !v);
  }

  closeMenu() {
    this.menuOpen.set(false);
  }

  toggleCommentMenu(event: Event, commentId: string) {
    event.stopPropagation();
    this.menuOpen.set(false);
    this.openCommentMenuId.update(id => id === commentId ? null : commentId);
  }

  @HostListener('document:click')
  onDocClick() {
    if (this.menuOpen()) this.menuOpen.set(false);
    if (this.openCommentMenuId() !== null) this.openCommentMenuId.set(null);
  }

  requireAuth(): boolean {
    if (this.auth.isAuthenticated()) return true;
    this.router.navigate(['/login']);
    return false;
  }

  toggleLike() {
    if (!this.requireAuth()) return;
    const prevLiked = this.post.liked;
    const prevCount = this.post.likesCount;
    this.post.liked = !prevLiked;
    this.post.likesCount = prevCount + (this.post.liked ? 1 : -1);

    this.svc.likePost(this.post.id).subscribe({
      next: (res) => {
        this.post.liked = res.liked;
        this.post.likesCount = res.likesCount;
      },
      error: () => {
        this.post.liked = prevLiked;
        this.post.likesCount = prevCount;
      }
    });
  }

  toggleComments() {
    const next = !this.commentsOpen();
    this.commentsOpen.set(next);
    if (next && this.comments().length === 0) {
      this.loadComments();
    }
  }

  private loadComments() {
    this.commentsLoading.set(true);
    this.commentsError.set(false);
    this.svc.getComments(this.post.id).subscribe({
      next: (list) => {
        this.comments.set(list);
        this.commentsLoading.set(false);
      },
      error: () => {
        this.commentsError.set(true);
        this.commentsLoading.set(false);
      }
    });
  }

  visibleComments = computed(() => this.comments().slice(0, this.visibleCount()));

  loadMoreComments() {
    this.visibleCount.update(v => v + 5);
  }

  onCommentInput(event: Event) {
    const val = (event.target as HTMLInputElement).value;
    this.newComment.set(val.slice(0, 400));
  }

  sendComment() {
    if (!this.requireAuth()) return;
    const text = this.newComment().trim();
    if (!text || this.sendingComment()) return;

    this.sendingComment.set(true);
    this.svc.addComment(this.post.id, text).subscribe({
      next: (comment) => {
        this.comments.update(list => [comment, ...list]);
        this.post.commentCount += 1;
        this.newComment.set('');
        this.sendingComment.set(false);
      },
      error: () => {
        this.sendingComment.set(false);
      }
    });
  }

  commentAuthorName(c: PostComment): string {
    const a = c.author;
    if (!a) return 'User';
    if (typeof a === 'string') return 'User';
    return a.username || 'User';
  }

  commentAuthorAvatar(c: PostComment): string | undefined {
    const a = c.author;
    if (!a || typeof a === 'string') return undefined;
    return a.avatar;
  }

  commentAuthorUsername(c: PostComment): string | null {
    const a = c.author;
    if (!a || typeof a === 'string') return null;
    return a.username || null;
  }

  canDeleteComment(c: PostComment): boolean {
    const u = this.auth.currentUser();
    if (!u) return false;
    if (this.isMod) return true;
    const a = c.author;
    if (!a || typeof a === 'string') return false;
    return a._id === u.id;
  }

  deleteComment(c: PostComment): void {
    if (!this.canDeleteComment(c)) return;
    this.openCommentMenuId.set(null);
    if (!confirm('Delete this comment?')) return;

    const prev = this.comments();
    this.comments.set(prev.filter(x => x.id !== c.id));
    this.post.commentCount = Math.max(0, (this.post.commentCount || 0) - 1);

    this.svc.deleteComment(this.post.id, c.id).subscribe({
      next: () => {
        this.toast.show('Comment deleted', 'success');
      },
      error: () => {
        this.comments.set(prev);
        this.post.commentCount = (this.post.commentCount || 0) + 1;
        this.toast.show('Could not delete comment', 'error');
      }
    });
  }

  get canPin(): boolean {
    return !!this.communityContext && this.communityContext.myRole === 'leader';
  }

  get hasMenuActions(): boolean {
    return this.canPin || this.isOwner || this.isMod;
  }

  onPin() {
    this.closeMenu();
    if (!this.communityContext) return;
    const prev = this.post.isPinned;
    this.post.isPinned = !prev;
    this.svc.pinPost(this.communityContext.communityId, this.post.id).subscribe({
      next: (res) => {
        this.post.isPinned = res.pinned;
        this.toast.show(res.pinned ? 'Post pinned.' : 'Post unpinned.', 'success');
        this.pinToggled.emit({ postId: this.post.id, pinned: res.pinned });
      },
      error: () => {
        this.post.isPinned = prev;
        this.toast.show('Could not update pin.', 'error');
      }
    });
  }

  onDelete() {
    this.closeMenu();
    if (!confirm('Delete this post? This action cannot be undone.')) return;

    this.removing.set(true);
    this.svc.deletePost(this.post.id).subscribe({
      next: () => {
        this.toast.show('Post deleted.', 'success');
        setTimeout(() => this.deleted.emit(this.post.id), 300);
      },
      error: () => {
        this.removing.set(false);
        this.toast.show('Could not delete post. Try again.', 'error');
      }
    });
  }
}
