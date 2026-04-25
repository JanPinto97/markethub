import { Component, Input, Output, EventEmitter, inject, signal, computed, HostBinding, HostListener } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { CommunityService, PostX, PostComment } from '../../services/community.service';
import { ToastService } from '../../../../core/services/toast.service';
import { getUsernameColor, getInitial } from '../../../../shared/utils/color.utils';

@Component({
  selector: 'app-post-card',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './post-card.component.html',
  styleUrl: './post-card.component.css'
})
export class PostCardComponent {
  @Input({ required: true }) post!: PostX;
  @Output() deleted = new EventEmitter<string>();

  auth = inject(AuthService);
  private router = inject(Router);
  private svc = inject(CommunityService);
  private toast = inject(ToastService);

  readonly TEXT_LIMIT = 280;
  readonly REPLY_LIMIT = 400;

  expanded = signal(false);
  menuOpen = signal(false);
  removing = signal(false);
  videoError = signal(false);

  commentsOpen = signal(false);
  commentsLoading = signal(false);
  commentsError = signal(false);
  comments = signal<PostComment[]>([]);
  visibleCount = signal(5);
  newComment = signal('');
  sendingComment = signal(false);

  // Reply state — single open reply box per post
  activeReplyCommentId = signal<string | null>(null);
  replyText = signal('');
  replyingToUsername = signal<string>('');
  replyingToUserId = signal<string | undefined>(undefined);
  sendingReply = signal(false);
  replyError = signal<string | null>(null);

  // Per-comment open menu (id of comment or reply)
  openCommentMenuId = signal<string | null>(null);
  removingIds = signal<Set<string>>(new Set());

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
    this.menuOpen.update(v => !v);
  }

  closeMenu() {
    this.menuOpen.set(false);
  }

  @HostListener('document:click')
  onDocClick() {
    if (this.menuOpen()) this.menuOpen.set(false);
    if (this.openCommentMenuId()) this.openCommentMenuId.set(null);
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

  commentAuthorUsername(c: PostComment): string {
    const a = c.author;
    if (!a || typeof a === 'string') return '';
    return a.username || '';
  }

  commentAuthorAvatar(c: PostComment): string | undefined {
    const a = c.author;
    if (!a || typeof a === 'string') return undefined;
    return a.avatar;
  }

  commentAuthorId(c: PostComment): string {
    const a = c.author;
    if (!a || typeof a === 'string') return '';
    return a._id || '';
  }

  isCommentOwner(c: PostComment): boolean {
    const u = this.auth.currentUser();
    if (!u) return false;
    return this.commentAuthorId(c) === u.id;
  }

  canDeleteComment(c: PostComment): boolean {
    return this.isCommentOwner(c) || this.isMod;
  }

  toggleCommentMenu(event: Event, id: string) {
    event.stopPropagation();
    this.openCommentMenuId.update(v => v === id ? null : id);
  }

  // ── Likes on comments / replies ──

  toggleCommentLike(c: PostComment) {
    if (!this.requireAuth()) return;
    const prevLiked = c.liked;
    const prevCount = c.likesCount;
    c.liked = !prevLiked;
    c.likesCount = prevCount + (c.liked ? 1 : -1);

    this.svc.likeComment(this.post.id, c.id).subscribe({
      next: (res) => { c.liked = res.liked; c.likesCount = res.likesCount; },
      error: () => { c.liked = prevLiked; c.likesCount = prevCount; }
    });
  }

  toggleReplyLike(parent: PostComment, r: PostComment) {
    if (!this.requireAuth()) return;
    const prevLiked = r.liked;
    const prevCount = r.likesCount;
    r.liked = !prevLiked;
    r.likesCount = prevCount + (r.liked ? 1 : -1);

    this.svc.likeReply(this.post.id, parent.id, r.id).subscribe({
      next: (res) => { r.liked = res.liked; r.likesCount = res.likesCount; },
      error: () => { r.liked = prevLiked; r.likesCount = prevCount; }
    });
  }

  // ── Reply box ──

  openReplyToComment(c: PostComment) {
    if (!this.requireAuth()) return;
    this.activeReplyCommentId.set(c.id);
    this.replyingToUsername.set(this.commentAuthorName(c));
    this.replyingToUserId.set(this.commentAuthorId(c) || undefined);
    this.replyText.set('');
    this.replyError.set(null);
  }

  openReplyToReply(parent: PostComment, r: PostComment) {
    if (!this.requireAuth()) return;
    this.activeReplyCommentId.set(parent.id);
    this.replyingToUsername.set(this.commentAuthorName(r));
    this.replyingToUserId.set(this.commentAuthorId(r) || undefined);
    this.replyText.set('');
    this.replyError.set(null);
  }

  closeReplyBox() {
    this.activeReplyCommentId.set(null);
    this.replyText.set('');
    this.replyError.set(null);
    this.replyingToUserId.set(undefined);
  }

  onReplyInput(event: Event) {
    const val = (event.target as HTMLTextAreaElement).value;
    this.replyText.set(val.slice(0, this.REPLY_LIMIT));
  }

  sendReply() {
    const parentId = this.activeReplyCommentId();
    if (!parentId) return;
    const text = this.replyText().trim();
    if (!text || this.sendingReply()) return;
    if (!this.requireAuth()) return;

    this.sendingReply.set(true);
    this.replyError.set(null);

    this.svc.addReply(this.post.id, parentId, text, this.replyingToUserId()).subscribe({
      next: (reply) => {
        this.comments.update(list => list.map(c => {
          if (c.id !== parentId) return c;
          const replies = [...(c.replies || []), reply];
          return { ...c, replies };
        }));
        this.post.commentCount += 1;
        this.sendingReply.set(false);
        this.closeReplyBox();
      },
      error: () => {
        this.sendingReply.set(false);
        this.replyError.set('Could not send reply. Try again.');
      }
    });
  }

  isRemovingId(id: string): boolean {
    return this.removingIds().has(id);
  }

  private markRemoving(id: string) {
    const next = new Set(this.removingIds());
    next.add(id);
    this.removingIds.set(next);
  }

  private unmarkRemoving(id: string) {
    const next = new Set(this.removingIds());
    next.delete(id);
    this.removingIds.set(next);
  }

  // ── Deletion ──

  onDeleteComment(c: PostComment) {
    this.openCommentMenuId.set(null);
    if (!this.canDeleteComment(c)) return;
    if (!confirm('Delete this comment? This action cannot be undone.')) return;

    this.markRemoving(c.id);
    const replyCount = (c.replies || []).length;

    this.svc.deleteComment(this.post.id, c.id).subscribe({
      next: () => {
        this.toast.show('Comment deleted.', 'success');
        setTimeout(() => {
          this.comments.update(list => list.filter(x => x.id !== c.id));
          this.post.commentCount = Math.max(0, this.post.commentCount - 1 - replyCount);
          this.unmarkRemoving(c.id);
        }, 300);
      },
      error: () => {
        this.unmarkRemoving(c.id);
        this.toast.show('Could not delete comment.', 'error');
      }
    });
  }

  onDeleteReply(parent: PostComment, r: PostComment) {
    this.openCommentMenuId.set(null);
    if (!this.canDeleteComment(r)) return;
    if (!confirm('Delete this reply? This action cannot be undone.')) return;

    this.markRemoving(r.id);

    this.svc.deleteReply(this.post.id, parent.id, r.id).subscribe({
      next: () => {
        this.toast.show('Comment deleted.', 'success');
        setTimeout(() => {
          this.comments.update(list => list.map(c => {
            if (c.id !== parent.id) return c;
            return { ...c, replies: (c.replies || []).filter(x => x.id !== r.id) };
          }));
          this.post.commentCount = Math.max(0, this.post.commentCount - 1);
          this.unmarkRemoving(r.id);
        }, 300);
      },
      error: () => {
        this.unmarkRemoving(r.id);
        this.toast.show('Could not delete reply.', 'error');
      }
    });
  }

  onEdit() {
    this.closeMenu();
    console.log('edit post', this.post.id);
  }

  onReport() {
    this.closeMenu();
    console.log('report post', this.post.id);
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
