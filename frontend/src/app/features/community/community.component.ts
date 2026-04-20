import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { CommunityService, Community, Topic } from './services/community.service';

@Component({
  selector: 'app-community',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './community.component.html',
  styleUrl: './community.component.css'
})
export class CommunityComponent implements OnInit {
  auth = inject(AuthService);
  private communityService = inject(CommunityService);

  activeTab: 'trending' | 'following' = 'trending';

  communities = signal<Community[]>([]);
  communitiesLoading = signal(true);
  communitiesError = signal(false);

  pinnedTopics = signal<Topic[]>([]);
  topicsLoading = signal(true);

  ngOnInit() {
    if (this.auth.isAuthenticated()) {
      this.loadMyCommunities();
    } else {
      this.communitiesLoading.set(false);
    }
    this.loadPinnedTopics();
  }

  setTab(tab: 'trending' | 'following') {
    this.activeTab = tab;
  }

  openTopicSearch() {
    console.log('open topic search');
  }

  openCreateCommunity() {
    console.log('open create community modal');
  }

  getInitialColor(name: string): string {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 55%, 45%)`;
  }

  getCategoryIcon(category: string): string {
    switch (category) {
      case 'CORE_MARKETS': return '📈';
      case 'ECONOMIA_I_MACRO': return '🏦';
      case 'ASSETS_ESPECIFICS': return '💼';
      case 'TRADING_I_INVERSIO': return '⚡';
      default: return '📊';
    }
  }

  private loadMyCommunities() {
    this.communityService.getMyCommunities().subscribe({
      next: (comms) => {
        this.communities.set(comms);
        this.communitiesLoading.set(false);
      },
      error: () => {
        this.communitiesError.set(true);
        this.communitiesLoading.set(false);
      }
    });
  }

  private loadPinnedTopics() {
    const ids = this.communityService.getPinnedTopicIds();
    if (ids.length === 0) {
      this.topicsLoading.set(false);
      return;
    }
    this.communityService.getTopicsByIds(ids).subscribe({
      next: (topics) => {
        this.pinnedTopics.set(topics);
        this.topicsLoading.set(false);
      },
      error: () => {
        this.topicsLoading.set(false);
      }
    });
  }
}
