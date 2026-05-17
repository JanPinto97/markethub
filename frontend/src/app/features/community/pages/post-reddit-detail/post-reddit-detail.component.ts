import { Component, OnInit, inject, signal, HostListener } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';
import { AssistantPopupService } from '../../../../core/services/assistant-popup.service';
import { CommunityService, DiscussionTopicFull, PostReddit } from '../../services/community.service';
import { PostRedditCommentSectionComponent } from '../../components/post-reddit-comment-section/post-reddit-comment-section.component';
import { getUsernameColor, getInitial } from '../../../../shared/utils/color.utils';

@Component({
  selector: 'app-post-reddit-detail',
  standalone: true,
  imports: [RouterLink, PostRedditCommentSectionComponent],
  templateUrl: './post-reddit-detail.component.html',
  styleUrl: './post-reddit-detail.component.css'
})
export class PostRedditDetailComponent implements OnInit {
  auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private svc = inject(CommunityService);
  private toast = inject(ToastService);
  private assistantPopup = inject(AssistantPopupService);

  slug = '';
  postId = '';

  post = signal<PostReddit | null>(null);
  topic = signal<DiscussionTopicFull | null>(null);
  loading = signal(true);
  error = signal<'none' | 'notFound' | 'network'>('none');

  menuOpen = signal(false);
  videoError = signal(false);
  removing = signal(false);

  ngOnInit() {
    this.slug = this.route.snapshot.paramMap.get('slug') || '';
    this.postId = this.route.snapshot.paramMap.get('postId') || '';
    this.load();
    this.loadTopic();
  }

  load() {
    this.loading.set(true);
    this.error.set('none');
    this.svc.getTopicPostDetail(this.slug, this.postId).subscribe({
      next: (p) => {
        this.post.set(p);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.status === 404 ? 'notFound' : 'network');
        this.loading.set(false);
      }
    });
  }

  loadTopic() {
    this.svc.getTopicDetail(this.slug).subscribe({
      next: (t) => this.topic.set(t),
      error: () => {}
    });
  }

  retry() { this.load(); }

  // ── Helpers ──

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

  authorName(): string {
    const p = this.post();
    return p?.author?.username || 'User';
  }

  mediaUrlFull(): string {
    const p = this.post();
    if (!p?.mediaUrl) return '';
    return `http://localhost:3000${p.mediaUrl}`;
  }

  isOwner(): boolean {
    const p = this.post();
    const u = this.auth.currentUser();
    if (!p || !u) return false;
    return p.author?._id === u.id;
  }

  isMod(): boolean {
    const u = this.auth.currentUser();
    return u?.role === 'moderator' || u?.role === 'superadmin';
  }

  showMenu(): boolean { return this.isOwner() || this.isMod(); }

  toggleMenu(event: Event) {
    event.stopPropagation();
    this.menuOpen.update(v => !v);
  }

  @HostListener('document:click')
  onDocClick() {
    if (this.menuOpen()) this.menuOpen.set(false);
  }

  private requireAuth(): boolean {
    if (this.auth.isAuthenticated()) return true;
    this.router.navigate(['/login']);
    return false;
  }

  vote(direction: 'up' | 'down') {
    if (!this.requireAuth()) return;
    const p = this.post();
    if (!p) return;

    const prev = { upvotes: p.upvotes, downvotes: p.downvotes, userVote: p.userVote, voteScore: p.voteScore };

    if (direction === 'up') {
      if (p.userVote === 'up') {
        p.upvotes--;
        p.userVote = null;
      } else {
        p.upvotes++;
        if (p.userVote === 'down') p.downvotes--;
        p.userVote = 'up';
      }
    } else {
      if (p.userVote === 'down') {
        p.downvotes--;
        p.userVote = null;
      } else {
        p.downvotes++;
        if (p.userVote === 'up') p.upvotes--;
        p.userVote = 'down';
      }
    }
    p.voteScore = p.upvotes - p.downvotes;
    this.post.set({ ...p });

    this.svc.voteTopicPost(this.slug, this.postId, direction).subscribe({
      next: (res) => {
        const cur = this.post();
        if (!cur) return;
        this.post.set({ ...cur, upvotes: res.upvotes, downvotes: res.downvotes, voteScore: res.voteScore, userVote: res.userVote });
      },
      error: () => {
        const cur = this.post();
        if (!cur) return;
        this.post.set({ ...cur, ...prev });
      }
    });
  }

  onDelete() {
    this.menuOpen.set(false);
    if (!confirm('Delete this post? This action cannot be undone.')) return;
    const p = this.post();
    if (!p) return;
    this.removing.set(true);
    this.svc.deleteTopicPost(this.slug, p.id).subscribe({
      next: () => {
        this.toast.show('Post deleted.', 'success');
        this.router.navigate(['/community/t', this.slug]);
      },
      error: () => {
        this.removing.set(false);
        this.toast.show('Could not delete post. Try again.', 'error');
      }
    });
  }

  onCommentCountChange(next: number) {
    const p = this.post();
    if (!p) return;
    this.post.set({ ...p, commentCount: next });
  }

  askWarren() {
    const p = this.post();
    if (!p) return;
    const t = this.topic();
    const full = p.title || '';
    const truncated = full.length > 80 ? full.slice(0, 77).trimEnd() + '…' : full;
    this.assistantPopup.open({
      initialMessage: 'Explain to me the point this user is giving',
      attachedContext: {
        title: truncated,
        subtitle: t?.name ? `Post from ${t.name}` : 'Discussion topic post',
        fields: [],
        data: {
          kind: 'topic_post',
          source: 'discussion_topic',
          topic: { slug: this.slug, name: t?.name, category: (t as any)?.category },
          post: {
            id: p.id,
            title: p.title,
            text: p.text,
            author: p.author?.username,
            createdAt: p.createdAt,
            upvotes: p.upvotes,
            downvotes: p.downvotes,
            voteScore: p.voteScore,
            commentCount: p.commentCount,
            mediaUrl: p.mediaUrl,
            mediaType: p.mediaType,
          },
        },
      },
    });
  }
}
