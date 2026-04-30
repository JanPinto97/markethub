import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommunityService, RedditComment } from '../../services/community.service';
import { CommentThreadComponent } from '../../components/comment-thread/comment-thread.component';

@Component({
  selector: 'app-comment-thread-page',
  standalone: true,
  imports: [RouterLink, CommentThreadComponent],
  templateUrl: './comment-thread-page.component.html',
  styleUrl: './comment-thread-page.component.css'
})
export class CommentThreadPageComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private svc = inject(CommunityService);

  comment = signal<RedditComment | null>(null);
  loading = signal(true);
  error = signal(false);

  topicSlug = '';
  postId = '';
  commentId = '';

  ngOnInit() {
    this.commentId = this.route.snapshot.params['commentId'];
    this.topicSlug = this.route.snapshot.queryParams['topicSlug'] || '';
    this.postId = this.route.snapshot.queryParams['postId'] || '';
    this.loadThread();
  }

  loadThread() {
    this.loading.set(true);
    this.error.set(false);

    if (this.topicSlug && this.postId) {
      this.svc.getTopicCommentThread(this.topicSlug, this.postId, this.commentId).subscribe({
        next: (c) => {
          this.comment.set(c);
          this.loading.set(false);
        },
        error: () => {
          this.error.set(true);
          this.loading.set(false);
        }
      });
    } else if (this.postId) {
      this.svc.getCommentThread(this.postId, this.commentId).subscribe({
        next: (c) => {
          this.comment.set(c as unknown as RedditComment);
          this.loading.set(false);
        },
        error: () => {
          this.error.set(true);
          this.loading.set(false);
        }
      });
    } else {
      this.error.set(true);
      this.loading.set(false);
    }
  }

  get backLink(): string {
    if (this.topicSlug && this.postId) {
      return `/community/t/${this.topicSlug}/p/${this.postId}`;
    }
    return '/community';
  }
}
