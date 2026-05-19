import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from '../../core/services/api.service';

export interface UserResult {
  username: string;
  avatar?: string;
  bio?: string;
  followerCount: number;
}

export interface PostResult {
  id: string;
  author: { _id: string; username: string; avatar?: string };
  text: string;
  mediaUrl: string;
  mediaType: string;
  likesCount: number;
  commentCount: number;
  origin: string;
  community: { _id: string; name: string } | null;
  createdAt: string;
}

export interface CommunityResult {
  id: string;
  name: string;
  avatar?: string;
  type: 'public' | 'private';
  memberCount: number;
  description?: string;
}

export interface SearchResults {
  users: UserResult[];
  posts: PostResult[];
  communities: CommunityResult[];
  totals: { users: number; posts: number; communities: number };
  pagination: { page: number; totalPages: number; total: number };
}

interface BackendResponse {
  success: boolean;
  query: string;
  results: {
    users?: { items: any[]; total: number };
    posts?: { items: any[]; total: number };
    communities?: { items: any[]; total: number };
  };
}

@Injectable({ providedIn: 'root' })
export class SearchService {
  private api = inject(ApiService);

  search(query: string, type: 'all' | 'users' | 'posts' | 'communities' = 'all', page = 1, limit = 10): Observable<SearchResults> {
    const typeParam = type === 'all' ? '' : `&type=${type}`;
    return this.api.get<BackendResponse>(`/search?q=${encodeURIComponent(query)}${typeParam}&page=${page}&limit=${limit}`)
      .pipe(map(res => {
        const r = res.results;
        const users = (r.users?.items ?? []).map((u: any) => ({
          ...u,
          followerCount: u.followerCount ?? u.followersCount ?? 0,
        }));
        const posts = r.posts?.items ?? [];
        const communities = r.communities?.items ?? [];
        const totalUsers = r.users?.total ?? 0;
        const totalPosts = r.posts?.total ?? 0;
        const totalCommunities = r.communities?.total ?? 0;
        const total = totalUsers + totalPosts + totalCommunities;
        const maxTotal = Math.max(totalUsers, totalPosts, totalCommunities);
        const totalPages = Math.ceil(maxTotal / limit) || 1;
        return {
          users, posts, communities,
          totals: { users: totalUsers, posts: totalPosts, communities: totalCommunities },
          pagination: { page, totalPages, total }
        };
      }));
  }
}
