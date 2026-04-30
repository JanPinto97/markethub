import { Component, Input, Output, EventEmitter, OnInit, inject, signal, ViewChild, ElementRef, HostListener } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';
import { CommunityService, RedditComment } from '../../services/community.service';
import { getUsernameColor, getInitial } from '../../../../shared/utils/color.utils';
import { MediaUrlPipe } from '../../../../shared/pipes/media-url.pipe';

@Component({
  selector: 'app-post-reddit-comment-section',
  standalone: true,
  imports: [RouterLink, MediaUrlPipe],
  templateUrl: './post-reddit-comment-section.component.html',
  styleUrl: './post-reddit-comment-section.component.css'
})
export class PostRedditCommentSectionComponent implements OnInit {
  @Input({ required: true }) postId!: string;
  @Input({ required: true }) topicSlug!: string;
  @Input({ required: true }) commentCount!: number;
  @Output() commentCountChange = new EventEmitter<number>();

  auth = inject(AuthService);
  private router = inject(Router);
  private svc = inject(CommunityService);
  private toast = inject(ToastService);

  @ViewChild('newCommentArea') newCommentArea?: ElementRef<HTMLTextAreaElement>;

  comments = signal<RedditComment[]>([]);
  loading = signal(true);
  error = signal(false);
  page = signal(1);
  hasMore = signal(false);
  loadingMore = signal(false);

  newText = signal('');
  posting = signal(false);
  postError = signal<string | null>(null);

  openMenuId = signal<string | null>(null);

  ngOnInit() {
    this.loadFirstPage();
  }

  initial(name: string): string { return getInitial(name); }
  initialColor(name: string): string { return getUsernameColor(name); }

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

  authorName(c: RedditComment): string { return c.author?.username || 'User'; }
  authorAvatar(c: RedditComment): string | undefined { return c.author?.avatar; }

  canDelete(c: RedditComment): boolean {
    const u = this.auth.currentUser();
    if (!u) return false;
    const isAuthor = c.author?._id === u.id;
    const isMod = u.role === 'moderator' || u.role === 'superadmin';
    return isAuthor || isMod;
  }

  loadFirstPage() {
    this.loading.set(true);
    this.error.set(false);
    this.svc.getTopicPostComments(this.topicSlug, this.postId, 1, 10).subscribe({
      next: (res) => {
        this.comments.set(res.comments);
        this.hasMore.set(res.hasNextPage);
        this.page.set(1);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      }
    });
  }

  loadMore() {
    if (this.loadingMore() || !this.hasMore()) return;
    const next = this.page() + 1;
    this.loadingMore.set(true);
    this.svc.getTopicPostComments(this.topicSlug, this.postId, next, 10).subscribe({
      next: (res) => {
        this.comments.update(list => [...list, ...res.comments]);
        this.hasMore.set(res.hasNextPage);
        this.page.set(next);
        this.loadingMore.set(false);
      },
      error: () => {
        this.loadingMore.set(false);
        this.toast.show('Could not load more comments.', 'error');
      }
    });
  }

  signInRedirect() {
    this.router.navigate(['/login']);
  }

  onNewInput(event: Event) {
    const ta = event.target as HTMLTextAreaElement;
    let val = ta.value;
    if (val.length > 400) val = val.slice(0, 400);
    this.newText.set(val);
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 200) + 'px';
  }

  submitNew() {
    const text = this.newText().trim();
    if (!text || this.posting()) return;
    this.posting.set(true);
    this.postError.set(null);

    this.svc.addTopicComment(this.topicSlug, this.postId, text).subscribe({
      next: (comment) => {
        this.comments.update(list => [comment, ...list]);
        this.newText.set('');
        if (this.newCommentArea) this.newCommentArea.nativeElement.style.height = 'auto';
        this.posting.set(false);
        this.bumpCount(1);
      },
      error: (err) => {
        this.postError.set(err?.error?.message || 'Could not post comment.');
        this.posting.set(false);
      }
    });
  }

  toggleMenu(event: Event, id: string) {
    event.stopPropagation();
    this.openMenuId.update(cur => cur === id ? null : id);
  }

  @HostListener('document:click')
  onDocClick() {
    if (this.openMenuId()) this.openMenuId.set(null);
  }

  deleteComment(comment: RedditComment) {
    this.openMenuId.set(null);
    if (!confirm('Delete this comment? This action cannot be undone.')) return;

    this.svc.deleteTopicComment(this.topicSlug, this.postId, comment.id).subscribe({
      next: () => {
        this.comments.update(list => list.filter(c => c.id !== comment.id));
        this.toast.show('Comment deleted.', 'success');
        this.bumpCount(-1);
      },
      error: () => {
        this.toast.show('Could not delete comment. Try again.', 'error');
      }
    });
  }

  private bumpCount(delta: number) {
    const next = Math.max(0, this.commentCount + delta);
    this.commentCount = next;
    this.commentCountChange.emit(next);
  }
}
