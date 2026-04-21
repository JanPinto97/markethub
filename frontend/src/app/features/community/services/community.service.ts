import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, of } from 'rxjs';
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

export interface PostAuthor {
  _id: string;
  username: string;
  avatar?: string;
  role?: string;
}

export interface PostCommunity {
  _id: string;
  name: string;
}

export interface PostX {
  id: string;
  author: PostAuthor;
  text: string;
  mediaUrl: string;
  mediaType: 'none' | 'image' | 'video';
  likesCount: number;
  liked: boolean;
  commentCount: number;
  origin: 'general' | 'public_community' | 'private_community';
  community: PostCommunity | string | null;
  communityType: string | null;
  isPinned: boolean;
  trendingScore: number;
  createdAt: string;
}

export interface PostComment {
  id: string;
  author: { _id: string; username: string; avatar?: string } | string;
  text: string;
  postId: string;
  postType: string;
  parentComment: string | null;
  replyingTo: { _id: string; username: string } | null;
  likesCount: number;
  createdAt: string;
  replies?: PostComment[];
}

interface FeedResponse {
  success: boolean;
  posts: PostX[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

const STORAGE_KEY = 'mh_pinned_topics';

@Injectable({ providedIn: 'root' })
export class CommunityService {
  private api = inject(ApiService);
  private http = inject(HttpClient);
  private baseUrl = 'http://localhost:3000/api/v1';

  // ── Communities ──
  getMyCommunities(): Observable<Community[]> {
    return this.api.get<{ success: boolean; communities: Community[] }>('/communities/my')
      .pipe(map(res => res.communities));
  }

  // ── Topics ──
  getTopicsByIds(ids: string[]): Observable<Topic[]> {
    if (ids.length === 0) return of([]);
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

  // ── Feed ──
  getFeed(mode: 'trending' | 'following', page: number, limit = 10): Observable<FeedResponse> {
    return this.api.get<FeedResponse>(`/posts/feed?mode=${mode}&page=${page}&limit=${limit}`);
  }

  createPost(text: string, mediaFile?: File | null): Observable<PostX> {
    const formData = new FormData();
    formData.append('text', text);
    if (mediaFile) formData.append('media', mediaFile);
    return this.http.post<{ success: boolean; post: PostX }>(`${this.baseUrl}/posts`, formData)
      .pipe(map(res => res.post));
  }

  likePost(postId: string): Observable<{ liked: boolean; likesCount: number }> {
    return this.api.post<{ success: boolean; liked: boolean; likesCount: number }>(`/posts/${postId}/like`, {})
      .pipe(map(res => ({ liked: res.liked, likesCount: res.likesCount })));
  }

  deletePost(postId: string): Observable<void> {
    return this.http.delete<{ success: boolean }>(`${this.baseUrl}/posts/${postId}`)
      .pipe(map(() => undefined));
  }

  getComments(postId: string): Observable<PostComment[]> {
    return this.api.get<{ success: boolean; comments: PostComment[] }>(`/posts/${postId}/comments`)
      .pipe(map(res => res.comments));
  }

  addComment(postId: string, text: string): Observable<PostComment> {
    return this.api.post<{ success: boolean; comment: PostComment }>(`/posts/${postId}/comments`, { text })
      .pipe(map(res => res.comment));
  }
}
