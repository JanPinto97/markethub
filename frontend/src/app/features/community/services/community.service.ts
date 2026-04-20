import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';

export interface Community {
  id: string;
  name: string;
  type: 'public' | 'private';
  memberCount: number;
}

export interface Topic {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  postCount: number;
}

const STORAGE_KEY = 'mh_pinned_topics';

@Injectable({ providedIn: 'root' })
export class CommunityService {
  private api = inject(ApiService);

  getMyCommunities(): Observable<Community[]> {
    return this.api.get<{ success: boolean; communities: Community[] }>('/communities/my')
      .pipe(map(res => res.communities));
  }

  getTopicsByIds(ids: string[]): Observable<Topic[]> {
    if (ids.length === 0) return new Observable(sub => { sub.next([]); sub.complete(); });
    return this.api.get<{ success: boolean; topics: Topic[] }>(`/topics?ids=${ids.join(',')}`)
      .pipe(map(res => res.topics));
  }

  getPinnedTopicIds(): string[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  addPinnedTopic(id: string): void {
    const ids = this.getPinnedTopicIds();
    if (!ids.includes(id)) {
      ids.push(id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    }
  }

  removePinnedTopic(id: string): void {
    const ids = this.getPinnedTopicIds().filter(i => i !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  }
}
