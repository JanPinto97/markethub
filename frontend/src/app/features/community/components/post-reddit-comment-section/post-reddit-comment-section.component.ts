import { Component, Input, Output, EventEmitter, OnInit, inject, signal, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';
import { CommunityService, RedditComment } from '../../services/community.service';
import { getUsernameColor, getInitial } from '../../../../shared/utils/color.utils';
import { MediaUrlPipe } from '../../../../shared/pipes/media-url.pipe';
import { CommentThreadComponent } from '../comment-thread/comment-thread.component';

@Component({
  selector: 'app-post-reddit-comment-section',
  standalone: true,
  imports: [MediaUrlPipe, CommentThreadComponent],
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


  ngOnInit() {
    this.loadFirstPage();
  }

  initial(name: string): string { return getInitial(name); }
  initialColor(name: string): string { return getUsernameColor(name); }

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

  // ── New root comment ──

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
        const enriched: RedditComment = { ...comment, replies: [] };
        this.comments.update(list => [enriched, ...list]);
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

  // ── Thread events ──

  onThreadReplyAdded() {
    this.bumpCount(1);
  }

  onThreadCommentDeleted(event: { id: string; count: number }) {
    this.comments.update(list => list.filter(c => c.id !== event.id));
    this.bumpCount(-Math.max(1, event.count));
  }

  private bumpCount(delta: number) {
    const next = Math.max(0, this.commentCount + delta);
    this.commentCount = next;
    this.commentCountChange.emit(next);
  }
}
