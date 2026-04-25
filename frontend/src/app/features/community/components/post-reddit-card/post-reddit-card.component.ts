import { Component, Input, Output, EventEmitter, inject, signal, HostBinding, HostListener } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { CommunityService, PostReddit } from '../../services/community.service';
import { ToastService } from '../../../../core/services/toast.service';
import { getUsernameColor, getInitial } from '../../../../shared/utils/color.utils';

@Component({
  selector: 'app-post-reddit-card',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './post-reddit-card.component.html',
  styleUrl: './post-reddit-card.component.css'
})
export class PostRedditCardComponent {
  @Input({ required: true }) post!: PostReddit;
  @Input({ required: true }) topicSlug!: string;
  @Output() deleted = new EventEmitter<string>();

  auth = inject(AuthService);
  private router = inject(Router);
  private svc = inject(CommunityService);
  private toast = inject(ToastService);

  menuOpen = signal(false);
  removing = signal(false);
  videoError = signal(false);

  @HostBinding('class.removing') get isRemoving() { return this.removing(); }

  get authorName(): string {
    const a = this.post.author;
    if (!a || typeof a === 'string') return 'User';
    return a.username || 'User';
  }

  get authorAvatar(): string | undefined {
    const a = this.post.author;
    if (!a || typeof a === 'string') return undefined;
    return a.avatar;
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

  get showMenu(): boolean {
    return this.isOwner || this.isMod;
  }

  get mediaUrlFull(): string {
    if (!this.post.mediaUrl) return '';
    return `http://localhost:3000${this.post.mediaUrl}`;
  }

  get detailLink(): string {
    return `/community/t/${this.topicSlug}/p/${this.post.id}`;
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

  initial(name: string): string { return getInitial(name); }
  initialColor(name: string): string { return getUsernameColor(name); }

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

    const prev = { upvotes: this.post.upvotes, downvotes: this.post.downvotes, userVote: this.post.userVote, voteScore: this.post.voteScore };

    if (direction === 'up') {
      if (this.post.userVote === 'up') {
        this.post.upvotes--;
        this.post.userVote = null;
      } else {
        this.post.upvotes++;
        if (this.post.userVote === 'down') this.post.downvotes--;
        this.post.userVote = 'up';
      }
    } else {
      if (this.post.userVote === 'down') {
        this.post.downvotes--;
        this.post.userVote = null;
      } else {
        this.post.downvotes++;
        if (this.post.userVote === 'up') this.post.upvotes--;
        this.post.userVote = 'down';
      }
    }
    this.post.voteScore = this.post.upvotes - this.post.downvotes;

    this.svc.voteTopicPost(this.topicSlug, this.post.id, direction).subscribe({
      next: (res) => {
        this.post.upvotes = res.upvotes;
        this.post.downvotes = res.downvotes;
        this.post.voteScore = res.voteScore;
        this.post.userVote = res.userVote;
      },
      error: () => {
        this.post.upvotes = prev.upvotes;
        this.post.downvotes = prev.downvotes;
        this.post.voteScore = prev.voteScore;
        this.post.userVote = prev.userVote;
      }
    });
  }

  onDelete() {
    this.menuOpen.set(false);
    if (!confirm('Delete this post? This action cannot be undone.')) return;

    this.removing.set(true);
    this.svc.deleteTopicPost(this.topicSlug, this.post.id).subscribe({
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
