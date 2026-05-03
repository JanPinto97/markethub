import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { PostX } from '../community/services/community.service';

export interface PublicCommunitySummary {
  id: string;
  name: string;
}

export interface PrivateCommunitySummary {
  id: string;
  name: string;
  avatar?: string;
}

export interface UserProfile {
  username: string;
  avatar?: string;
  coverImage?: string;
  bio?: string;
  followerCount: number;
  followingCount: number;
  isFollowing: boolean;
  publicCommunities: PublicCommunitySummary[];
  privateCommunities: PrivateCommunitySummary[];
}

export interface UserSummary {
  username: string;
  avatar?: string;
}

export interface FollowToggleResult {
  following: boolean;
  followerCount: number;
}

interface ProfileApiResponse {
  success: boolean;
  user: {
    id: string;
    username: string;
    avatar?: string;
    coverImage?: string;
    bio?: string;
    role?: string;
    followersCount: number;
    followingCount: number;
    createdAt: string;
  };
  communities: { id: string; name: string }[];
  privateCommunities?: { id: string; name: string; avatar?: string }[];
  isFollowing?: boolean;
}

interface PostsApiResponse {
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

interface FollowersApiResponse {
  success: boolean;
  followers: UserSummary[];
  pagination: { hasNextPage: boolean; page: number };
}

interface FollowingApiResponse {
  success: boolean;
  following: UserSummary[];
  pagination: { hasNextPage: boolean; page: number };
}

export interface PagedUsers {
  users: UserSummary[];
  hasNextPage: boolean;
  page: number;
}

export interface PagedPosts {
  posts: PostX[];
  hasNextPage: boolean;
}

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private api = inject(ApiService);

  getProfile(username: string): Observable<UserProfile> {
    return this.api.get<ProfileApiResponse>(`/users/${encodeURIComponent(username)}`).pipe(
      map(res => ({
        username: res.user.username,
        avatar: res.user.avatar || undefined,
        coverImage: res.user.coverImage || undefined,
        bio: res.user.bio || undefined,
        followerCount: res.user.followersCount ?? 0,
        followingCount: res.user.followingCount ?? 0,
        isFollowing: res.isFollowing ?? false,
        publicCommunities: (res.communities || []).map(c => ({ id: c.id, name: c.name })),
        privateCommunities: (res.privateCommunities || []).map(c => ({ id: c.id, name: c.name, avatar: c.avatar })),
      }))
    );
  }

  getUserPosts(username: string, page: number, limit = 10): Observable<PagedPosts> {
    return this.api
      .get<PostsApiResponse>(`/users/${encodeURIComponent(username)}/posts?page=${page}&limit=${limit}`)
      .pipe(map(res => ({ posts: res.posts, hasNextPage: res.pagination.hasNextPage })));
  }

  getFollowers(username: string, page: number, limit = 20): Observable<PagedUsers> {
    return this.api
      .get<FollowersApiResponse>(`/users/${encodeURIComponent(username)}/followers?page=${page}&limit=${limit}`)
      .pipe(map(res => ({ users: res.followers, hasNextPage: res.pagination.hasNextPage, page: res.pagination.page })));
  }

  getFollowing(username: string, page: number, limit = 20): Observable<PagedUsers> {
    return this.api
      .get<FollowingApiResponse>(`/users/${encodeURIComponent(username)}/following?page=${page}&limit=${limit}`)
      .pipe(map(res => ({ users: res.following, hasNextPage: res.pagination.hasNextPage, page: res.pagination.page })));
  }

  toggleFollow(username: string): Observable<FollowToggleResult> {
    return this.api
      .post<{ success: boolean; following: boolean; followersCount: number }>(
        `/users/${encodeURIComponent(username)}/follow`,
        {}
      )
      .pipe(map(res => ({ following: res.following, followerCount: res.followersCount })));
  }
}
