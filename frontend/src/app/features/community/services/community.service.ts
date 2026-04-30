import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject, map, of } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';

export interface Community {
  id: string;
  name: string;
  type: 'public' | 'private';
  memberCount: number;
  avatar?: string;
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
  hasMoreReplies?: boolean;
}

export interface CommunityPublic {
  id: string;
  name: string;
  description?: string;
  avatar?: string;
  memberCount: number;
  isMember: boolean;
  createdAt: string;
}

export type CommunityRole = 'leader' | 'moderator' | 'little_whale' | 'member';

export interface CommunityMember {
  user: { id: string; username: string; avatar?: string };
  role: CommunityRole;
}

export interface JoinRequest {
  _id: string;
  user: { id: string; username: string; avatar?: string };
  message: string;
  createdAt: string;
  status: 'pending' | 'accepted' | 'rejected';
}

export interface CommunityPrivateDetail {
  id: string;
  name: string;
  description?: string;
  avatar?: string;
  memberCount: number;
  isMember: boolean;
  myRole: CommunityRole | null;
  myRequestStatus?: 'pending' | 'accepted' | 'rejected' | null;
  members?: CommunityMember[];
  pendingRequests?: JoinRequest[];
  createdAt: string;
}

export interface CommunityPrivate {
  id: string;
  name: string;
  description?: string;
  avatar?: string;
  memberCount: number;
  createdAt: string;
}

export interface CreateCommunityDto {
  name: string;
  description?: string;
  avatar?: string;
}

export interface DiscussionTopicFull {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  postCount: number;
}

export interface RedditComment {
  id: string;
  author: { _id: string; username: string; avatar?: string };
  text: string;
  postId: string;
  postType: 'PostReddit';
  createdAt: string;
}

export interface PostReddit {
  id: string;
  author: { _id: string; username: string; avatar?: string; role?: string };
  title: string;
  text: string;
  mediaUrl: string;
  mediaType: 'none' | 'image' | 'video';
  upvotes: number;
  downvotes: number;
  voteScore: number;
  userVote: 'up' | 'down' | null;
  commentCount: number;
  topic: string;
  createdAt: string;
}

interface FeedResponse {
  success: boolean;
  posts: PostX[];
  pagination: Pagination;
}

interface FeedResponseReddit {
  success: boolean;
  posts: PostReddit[];
  pagination: Pagination;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
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

  // ── Community Public Detail ──

  communityMembershipChanged$ = new Subject<{
    id: string;
    action: 'joined' | 'left';
    community?: CommunityPublic;
  }>();

  getCommunityPublic(id: string): Observable<CommunityPublic> {
    return this.api.get<{ success: boolean; community: CommunityPublic }>(`/communities/public/${id}`)
      .pipe(map(res => res.community));
  }

  getCommunityPublicPosts(id: string, page: number, limit = 10): Observable<FeedResponse> {
    return this.api.get<FeedResponse>(`/communities/public/${id}/feed?page=${page}&limit=${limit}`);
  }

  joinCommunityPublic(id: string): Observable<{ memberCount: number }> {
    return this.api.post<{ success: boolean; memberCount: number }>(`/communities/public/${id}/join`, {})
      .pipe(map(res => ({ memberCount: res.memberCount })));
  }

  leaveCommunityPublic(id: string): Observable<{ memberCount: number }> {
    return this.api.post<{ success: boolean; memberCount: number }>(`/communities/public/${id}/leave`, {})
      .pipe(map(res => ({ memberCount: res.memberCount })));
  }

  createCommunityPublic(data: CreateCommunityDto): Observable<CommunityPublic> {
    return this.api.post<{ success: boolean; community: CommunityPublic }>('/communities/public', data)
      .pipe(map(res => res.community));
  }

  createCommunityPublicWithFile(data: CreateCommunityDto, avatarFile: File): Observable<CommunityPublic> {
    const formData = new FormData();
    formData.append('name', data.name);
    if (data.description) formData.append('description', data.description);
    formData.append('media', avatarFile);
    return this.http.post<{ success: boolean; community: CommunityPublic }>(`${this.baseUrl}/communities/public`, formData)
      .pipe(map(res => res.community));
  }

  createCommunityPrivate(data: CreateCommunityDto): Observable<CommunityPrivate> {
    return this.api.post<{ success: boolean; community: CommunityPrivate }>('/communities/private', data)
      .pipe(map(res => res.community));
  }

  createCommunityPrivateWithFile(data: CreateCommunityDto, avatarFile: File): Observable<CommunityPrivate> {
    const formData = new FormData();
    formData.append('name', data.name);
    if (data.description) formData.append('description', data.description);
    formData.append('media', avatarFile);
    return this.http.post<{ success: boolean; community: CommunityPrivate }>(`${this.baseUrl}/communities/private`, formData)
      .pipe(map(res => res.community));
  }

  createCommunityPost(communityId: string, text: string, mediaFile?: File | null): Observable<PostX> {
    const formData = new FormData();
    formData.append('text', text);
    if (mediaFile) formData.append('media', mediaFile);
    return this.http.post<{ success: boolean; post: PostX }>(`${this.baseUrl}/communities/public/${communityId}/posts`, formData)
      .pipe(map(res => res.post));
  }

  // ── Discussion Topics ──

  getAllTopics(): Observable<DiscussionTopicFull[]> {
    return this.api.get<{ success: boolean; topics: DiscussionTopicFull[] }>('/topics')
      .pipe(map(res => res.topics));
  }

  getTopicDetail(slug: string): Observable<DiscussionTopicFull> {
    return this.api.get<{ success: boolean; topic: DiscussionTopicFull }>(`/topics/${slug}`)
      .pipe(map(res => res.topic));
  }

  getTopicPosts(slug: string, sort: 'top' | 'recent', page: number, limit = 10): Observable<FeedResponseReddit> {
    return this.api.get<FeedResponseReddit>(`/topics/${slug}/feed?sort=${sort}&page=${page}&limit=${limit}`);
  }

  createTopicPost(slug: string, title: string, text?: string, mediaFile?: File | null): Observable<PostReddit> {
    if (mediaFile) {
      const formData = new FormData();
      formData.append('title', title);
      if (text) formData.append('text', text);
      formData.append('media', mediaFile);
      return this.http.post<{ success: boolean; post: PostReddit }>(`${this.baseUrl}/topics/${slug}/posts`, formData)
        .pipe(map(res => res.post));
    }
    return this.api.post<{ success: boolean; post: PostReddit }>(`/topics/${slug}/posts`, { title, text: text || '' })
      .pipe(map(res => res.post));
  }

  voteTopicPost(slug: string, postId: string, vote: 'up' | 'down'): Observable<{ upvotes: number; downvotes: number; voteScore: number; userVote: 'up' | 'down' | null }> {
    return this.api.post<{ success: boolean; upvotes: number; downvotes: number; voteScore: number; userVote: 'up' | 'down' | null }>(`/topics/${slug}/posts/${postId}/vote`, { vote })
      .pipe(map(res => ({ upvotes: res.upvotes, downvotes: res.downvotes, voteScore: res.voteScore, userVote: res.userVote })));
  }

  deleteTopicPost(slug: string, postId: string): Observable<void> {
    return this.http.delete<{ success: boolean }>(`${this.baseUrl}/topics/${slug}/posts/${postId}`)
      .pipe(map(() => undefined));
  }

  // ── PostReddit detail + comments ──

  getTopicPostDetail(slug: string, postId: string): Observable<PostReddit> {
    return this.api.get<{ success: boolean; post: PostReddit }>(`/topics/${slug}/posts/${postId}`)
      .pipe(map(res => res.post));
  }

  getTopicPostComments(slug: string, postId: string, page: number, limit = 10): Observable<{ comments: RedditComment[]; hasNextPage: boolean }> {
    return this.api.get<{ success: boolean; comments: RedditComment[]; pagination: Pagination }>(
      `/topics/${slug}/posts/${postId}/comments?page=${page}&limit=${limit}`
    ).pipe(map(res => ({ comments: res.comments, hasNextPage: res.pagination.hasNextPage })));
  }

  addTopicComment(slug: string, postId: string, text: string): Observable<RedditComment> {
    return this.api.post<{ success: boolean; comment: RedditComment }>(
      `/topics/${slug}/posts/${postId}/comments`, { text }
    ).pipe(map(res => res.comment));
  }

  deleteTopicComment(slug: string, postId: string, commentId: string): Observable<void> {
    return this.http.delete<{ success: boolean }>(
      `${this.baseUrl}/topics/${slug}/posts/${postId}/comments/${commentId}`
    ).pipe(map(() => undefined));
  }

  // ── Community Private Detail ──

  getCommunityPrivate(id: string): Observable<CommunityPrivateDetail> {
    return this.api.get<{ success: boolean; community: CommunityPrivateDetail; pendingRequests?: JoinRequest[] }>(`/communities/private/${id}`)
      .pipe(map(res => {
        const c = res.community;
        if (res.pendingRequests) c.pendingRequests = res.pendingRequests;
        return c;
      }));
  }

  getCommunityPrivatePosts(id: string, page: number, limit = 10): Observable<{ pinnedPosts: PostX[]; posts: PostX[]; pagination: Pagination }> {
    return this.api.get<{ success: boolean; pinnedPosts: PostX[]; posts: PostX[]; pagination: Pagination }>(`/communities/private/${id}/feed?page=${page}&limit=${limit}`)
      .pipe(map(res => ({ pinnedPosts: res.pinnedPosts, posts: res.posts, pagination: res.pagination })));
  }

  requestJoinPrivate(id: string, message?: string): Observable<void> {
    return this.api.post<{ success: boolean }>(`/communities/private/${id}/request`, { message: message || '' })
      .pipe(map(() => undefined));
  }

  acceptRequest(communityId: string, requestId: string): Observable<void> {
    return this.api.post<{ success: boolean }>(`/communities/private/${communityId}/requests/${requestId}`, { action: 'accept' })
      .pipe(map(() => undefined));
  }

  rejectRequest(communityId: string, requestId: string): Observable<void> {
    return this.api.post<{ success: boolean }>(`/communities/private/${communityId}/requests/${requestId}`, { action: 'reject' })
      .pipe(map(() => undefined));
  }

  expelMember(communityId: string, userId: string): Observable<void> {
    return this.http.delete<{ success: boolean }>(`${this.baseUrl}/communities/private/${communityId}/members/${userId}`)
      .pipe(map(() => undefined));
  }

  changeMemberRole(communityId: string, userId: string, role: CommunityRole): Observable<void> {
    return this.api.put<{ success: boolean }>(`/communities/private/${communityId}/members/${userId}/role`, { role })
      .pipe(map(() => undefined));
  }

  leaveCommunityPrivate(id: string): Observable<void> {
    return this.api.post<{ success: boolean }>(`/communities/private/${id}/leave`, {})
      .pipe(map(() => undefined));
  }

  deleteCommunityPrivate(id: string): Observable<void> {
    return this.http.delete<{ success: boolean }>(`${this.baseUrl}/communities/private/${id}`)
      .pipe(map(() => undefined));
  }

  createCommunityPrivatePost(communityId: string, text: string, mediaFile?: File | null): Observable<PostX> {
    const formData = new FormData();
    formData.append('text', text);
    if (mediaFile) formData.append('media', mediaFile);
    return this.http.post<{ success: boolean; post: PostX }>(`${this.baseUrl}/communities/private/${communityId}/posts`, formData)
      .pipe(map(res => res.post));
  }

  pinPost(communityId: string, postId: string): Observable<{ pinned: boolean }> {
    return this.api.post<{ success: boolean; pinned: boolean }>(`/communities/private/${communityId}/posts/${postId}/pin`, {})
      .pipe(map(res => ({ pinned: res.pinned })));
  }

}
