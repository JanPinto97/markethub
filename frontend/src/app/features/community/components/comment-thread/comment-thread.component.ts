import { Component, Input, Output, EventEmitter, inject, signal, HostListener } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';
import { CommunityService, RedditComment } from '../../services/community.service';
import { getUsernameColor, getInitial } from '../../../../shared/utils/color.utils';
import { MediaUrlPipe } from '../../../../shared/pipes/media-url.pipe';

@Component({
  selector: 'app-comment-thread',
  standalone: true,
  imports: [RouterLink, MediaUrlPipe, CommentThreadComponent],
  templateUrl: './comment-thread.component.html',
  styleUrl: './comment-thread.component.css'
})
export class CommentThreadComponent {
  @Input({ required: true }) comment!: RedditComment;
  @Input() depth = 0;
  @Input() maxDepth = 3;
  @Input() postId = '';
  @Input() topicSlug = '';
  @Output() replyAdded = new EventEmitter<void>();
  @Output() commentDeleted = new EventEmitter<{ id: string; count: number }>();

  auth = inject(AuthService);
  private router = inject(Router);
  private svc = inject(CommunityService);
  private toast = inject(ToastService);

  replyOpen = signal(false);
  replyText = signal('');
  replyPosting = signal(false);
  replyError = signal<string | null>(null);
  menuOpen = signal(false);

  initial(name: string): string { return getInitial(name); }
  initialColor(name: string): string { return getUsernameColor(name); }

  authorName(): string { return this.comment.author?.username || 'User'; }
  authorAvatar(): string | undefined { return this.comment.author?.avatar; }

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

  canDelete(): boolean {
    const u = this.auth.currentUser();
    if (!u) return false;
    const isAuthor = this.comment.author?._id === u.id;
    const isMod = u.role === 'moderator' || u.role === 'superadmin';
    return isAuthor || isMod;
  }

  get atMaxDepth(): boolean {
    return this.depth >= this.maxDepth;
  }

  toggleMenu(event: Event) {
    event.stopPropagation();
    this.menuOpen.update(v => !v);
  }

  @HostListener('document:click')
  onDocClick() {
    if (this.menuOpen()) this.menuOpen.set(false);
  }

  openReply() {
    if (!this.auth.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }
    this.replyOpen.set(true);
    this.replyText.set('');
    this.replyError.set(null);
  }

  cancelReply() {
    this.replyOpen.set(false);
    this.replyText.set('');
    this.replyError.set(null);
  }

  onReplyInput(event: Event) {
    const ta = event.target as HTMLTextAreaElement;
    let val = ta.value;
    if (val.length > 400) val = val.slice(0, 400);
    this.replyText.set(val);
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 200) + 'px';
  }

  submitReply() {
    const text = this.replyText().trim();
    if (!text || this.replyPosting()) return;
    this.replyPosting.set(true);
    this.replyError.set(null);

    this.svc.addTopicReply(this.topicSlug, this.postId, this.comment.id, text).subscribe({
      next: (reply) => {
        const enriched: RedditComment = { ...reply, replies: [], hasMoreReplies: false };
        if (!this.comment.replies) this.comment.replies = [];
        this.comment.replies.push(enriched);
        this.replyPosting.set(false);
        this.cancelReply();
        this.replyAdded.emit();
      },
      error: (err) => {
        this.replyError.set(err?.error?.message || 'Could not post reply.');
        this.replyPosting.set(false);
      }
    });
  }

  deleteComment() {
    this.menuOpen.set(false);
    if (!confirm('Delete this comment? This action cannot be undone.')) return;

    this.svc.deleteTopicComment(this.topicSlug, this.postId, this.comment.id).subscribe({
      next: (res) => {
        this.toast.show('Comment deleted.', 'success');
        this.commentDeleted.emit({ id: this.comment.id, count: res.removed });
      },
      error: () => {
        this.toast.show('Could not delete comment. Try again.', 'error');
      }
    });
  }

  onChildReplyAdded() {
    this.replyAdded.emit();
  }

  onChildDeleted(event: { id: string; count: number }) {
    if (this.comment.replies) {
      this.comment.replies = this.comment.replies.filter(r => r.id !== event.id);
    }
    this.commentDeleted.emit(event);
  }
}
