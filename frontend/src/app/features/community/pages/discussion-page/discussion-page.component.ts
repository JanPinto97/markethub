import { Component, OnInit, OnDestroy, inject, signal, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { CommunityService, DiscussionDetail, DiscussionMessage } from '../../services/community.service';
import { MediaUrlPipe } from '../../../../shared/pipes/media-url.pipe';
import { getUsernameColor, getInitial } from '../../../../shared/utils/color.utils';

@Component({
  selector: 'app-discussion-page',
  standalone: true,
  imports: [RouterLink, MediaUrlPipe],
  templateUrl: './discussion-page.component.html',
  styleUrl: './discussion-page.component.css'
})
export class DiscussionPageComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private svc = inject(CommunityService);
  auth = inject(AuthService);

  @ViewChild('messageArea') messageArea?: ElementRef<HTMLTextAreaElement>;
  @ViewChild('messagesContainer') messagesContainer?: ElementRef<HTMLDivElement>;

  isNewMode = signal(false);
  commentId = signal<string | null>(null);
  discussionId = signal<string | null>(null);
  discussion = signal<DiscussionDetail | null>(null);

  messages = signal<DiscussionMessage[]>([]);
  loading = signal(true);
  error = signal(false);
  hasMore = signal(false);
  loadingMore = signal(false);

  newText = signal('');
  sending = signal(false);

  replyTo = signal<DiscussionMessage | null>(null);

  showScrollDown = signal(false);

  private pollInterval: ReturnType<typeof setInterval> | null = null;

  ngOnInit() {
    const params = this.route.snapshot.paramMap;
    const discId = params.get('discussionId');
    const cmtId = params.get('commentId');

    if (cmtId) {
      this.isNewMode.set(true);
      this.commentId.set(cmtId);
      this.loading.set(false);
    } else if (discId) {
      this.discussionId.set(discId);
      this.loadDiscussion(discId);
    }
  }

  ngOnDestroy() {
    this.stopPolling();
  }

  private loadDiscussion(id: string) {
    this.loading.set(true);
    this.error.set(false);
    this.svc.getDiscussion(id).subscribe({
      next: (disc) => {
        this.discussion.set(disc);
        this.loadMessages(id);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      }
    });
  }

  private loadMessages(discussionId: string) {
    this.svc.getDiscussionMessages(discussionId).subscribe({
      next: (res) => {
        this.messages.set(res.messages);
        this.hasMore.set(res.hasMore);
        this.loading.set(false);
        this.scrollToTop();
        this.startPolling();
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      }
    });
  }

  loadMore() {
    if (this.loadingMore() || !this.hasMore()) return;
    const msgs = this.messages();
    const cursor = msgs.length > 0 ? msgs[msgs.length - 1].createdAt : undefined;
    this.loadingMore.set(true);
    this.svc.getDiscussionMessages(this.discussionId()!, cursor).subscribe({
      next: (res) => {
        this.messages.update(list => [...list, ...res.messages]);
        this.hasMore.set(res.hasMore);
        this.loadingMore.set(false);
      },
      error: () => {
        this.loadingMore.set(false);
      }
    });
  }

  private startPolling() {
    this.pollInterval = setInterval(() => {
      const msgs = this.messages();
      if (!this.discussionId()) return;
      const cursor = msgs.length > 0 ? msgs[msgs.length - 1].createdAt : undefined;
      this.svc.getDiscussionMessages(this.discussionId()!, cursor).subscribe({
        next: (res) => {
          if (res.messages.length > 0) {
            this.messages.update(list => [...list, ...res.messages]);
          }
        }
      });
    }, 15000);
  }

  private stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  onKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  onInput(event: Event) {
    const ta = event.target as HTMLTextAreaElement;
    let val = ta.value;
    if (val.length > 2000) val = val.slice(0, 2000);
    this.newText.set(val);
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
  }

  send() {
    const text = this.newText().trim();
    if (!text || this.sending()) return;
    this.sending.set(true);

    if (this.isNewMode()) {
      this.svc.createDiscussion(this.commentId()!, text).subscribe({
        next: (res) => {
          this.sending.set(false);
          this.isNewMode.set(false);
          this.discussionId.set(res.discussion._id);
          this.discussion.set(res.discussion);
          this.messages.set([res.message]);
          this.newText.set('');
          this.replyTo.set(null);
          if (this.messageArea) this.messageArea.nativeElement.style.height = 'auto';
          this.router.navigate(['/community/discussion', res.discussion._id], { replaceUrl: true });
          this.startPolling();
        },
        error: () => {
          this.sending.set(false);
        }
      });
    } else {
      const replyToId = this.replyTo()?._id || undefined;
      this.svc.addDiscussionMessage(this.discussionId()!, text, replyToId).subscribe({
        next: (msg) => {
          this.messages.update(list => [...list, msg]);
          this.newText.set('');
          this.replyTo.set(null);
          this.sending.set(false);
          if (this.messageArea) this.messageArea.nativeElement.style.height = 'auto';
          this.scrollToBottom();
        },
        error: () => {
          this.sending.set(false);
        }
      });
    }
  }

  setReply(msg: DiscussionMessage) {
    this.replyTo.set(msg);
    this.messageArea?.nativeElement.focus();
  }

  cancelReply() {
    this.replyTo.set(null);
  }

  scrollToTop() {
    setTimeout(() => {
      const el = this.messagesContainer?.nativeElement;
      if (el) el.scrollTop = 0;
    }, 50);
  }

  scrollToBottom() {
    setTimeout(() => {
      const el = this.messagesContainer?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    }, 50);
  }

  jumpToBottom() {
    const id = this.discussionId();
    if (!id) return;
    const msgs = this.messages();
    const cursor = msgs.length > 0 ? msgs[msgs.length - 1].createdAt : undefined;
    this.svc.getDiscussionMessages(id, cursor).subscribe({
      next: (res) => {
        if (res.messages.length > 0) {
          this.messages.update(list => [...list, ...res.messages]);
        }
        this.hasMore.set(res.hasMore);
        this.scrollToBottom();
      }
    });
  }

  onMessagesScroll() {
    const el = this.messagesContainer?.nativeElement;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    this.showScrollDown.set(!atBottom);
  }

  formatTime(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  initial(name: string): string { return getInitial(name); }
  initialColor(name: string): string { return getUsernameColor(name); }

  truncateReply(text: string): string {
    return text.length > 80 ? text.slice(0, 80) + '...' : text;
  }

  goBack() {
    window.history.back();
  }
}
