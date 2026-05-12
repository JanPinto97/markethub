import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../../core/services/api.service';
import { MediaUrlPipe } from '../../../../shared/pipes/media-url.pipe';
import { getUsernameColor, getInitial } from '../../../../shared/utils/color.utils';

interface TopCommunity {
  id: string;
  name: string;
  avatar?: string;
  memberCount: number;
}

interface TrendingUser {
  id: string;
  username: string;
  avatar?: string;
  followersCount: number;
  recentFollowerCount: number;
}

interface HotNews {
  id: string;
  title: string;
  source: string;
  time: number;
}

@Component({
  selector: 'app-community-right-sidebar',
  standalone: true,
  imports: [RouterLink, MediaUrlPipe],
  templateUrl: './right-sidebar.component.html',
  styleUrl: './right-sidebar.component.css',
})
export class RightSidebarComponent implements OnInit {
  private api = inject(ApiService);

  communities = signal<TopCommunity[]>([]);
  communitiesLoading = signal(true);

  users = signal<TrendingUser[]>([]);
  usersLoading = signal(true);

  news = signal<HotNews | null>(null);
  newsLoading = signal(true);

  ngOnInit(): void {
    this.loadCommunities();
    this.loadUsers();
    this.loadNews();
  }

  private loadCommunities() {
    this.api.get<{ success: boolean; communities: TopCommunity[] }>('/communities/public?sort=members&limit=3')
      .subscribe({
        next: (res) => {
          this.communities.set(res.communities || []);
          this.communitiesLoading.set(false);
        },
        error: () => this.communitiesLoading.set(false),
      });
  }

  private loadUsers() {
    this.api.get<{ success: boolean; users: TrendingUser[] }>('/users/trending?period=week&limit=3')
      .subscribe({
        next: (res) => {
          this.users.set(res.users || []);
          this.usersLoading.set(false);
        },
        error: () => this.usersLoading.set(false),
      });
  }

  private loadNews() {
    try {
      const cached = localStorage.getItem('markethub_news_cache');
      if (cached) {
        const { date, news } = JSON.parse(cached);
        if (date === new Date().toDateString() && Array.isArray(news) && news.length > 0) {
          const n = news[0];
          if (n && n.url) {
            this.news.set({
              id: btoa(encodeURIComponent(n.url)),
              title: n.title,
              source: n.source,
              time: n.time,
            });
          }
        }
      }
    } catch {
      // cache unreadable: leave news as null
    }
    this.newsLoading.set(false);
  }

  getColor(name: string): string { return getUsernameColor(name || ''); }
  getInitial(name: string): string { return getInitial(name || ''); }

  formatMembers(n: number): string {
    if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1) + 'k';
    return String(n);
  }
}
