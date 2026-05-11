export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface UpdateProfilePayload {
  username?: string;
  email?: string;
  bio?: string;
  avatar?: string;
  coverImage?: string;
}

export interface CreatePostPayload {
  text: string;
}

export interface FeedQuery {
  mode?: 'trending' | 'following';
  limit?: number;
  page?: number;
}

export interface CommentPayload {
  text: string;
}

interface AuthResponse {
  success: boolean;
  accessToken: string;
  user: { id: string; username: string; email: string; [k: string]: unknown };
}

interface PostAuthor {
  _id?: string;
  id?: string;
  username?: string;
}

export interface PostXItem {
  id: string;
  author: string | PostAuthor;
  text: string;
  origin: string;
  [k: string]: unknown;
}

interface FeedResponse {
  success: boolean;
  posts: PostXItem[];
}

interface CreatePostResponse {
  success: boolean;
  post: PostXItem;
}

interface CommentResponse {
  success: boolean;
  comment: { id: string; text: string; [k: string]: unknown };
}

export interface PostCommentItem {
  id: string;
  author: string | PostAuthor;
  text: string;
  createdAt?: string;
  replies?: PostCommentItem[];
  [k: string]: unknown;
}

interface CommentsListResponse {
  success: boolean;
  comments: PostCommentItem[];
}

interface LikeResponse {
  success: boolean;
  liked: boolean;
  likesCount: number;
}

interface FollowResponse {
  success: boolean;
  following: boolean;
  followerCount?: number;
}

interface UserProfileResponse {
  success: boolean;
  user: { id: string; username: string; [k: string]: unknown };
}

export interface CommunitySummary {
  id: string;
  name: string;
  type: 'public' | 'private';
  memberCount?: number;
  avatar?: string;
  isJoined?: boolean;
  createdAt?: string;
}

interface DiscoverResponse {
  success: boolean;
  communities: CommunitySummary[];
  pagination?: unknown;
}

interface MyCommunitiesResponse {
  success: boolean;
  communities: { id: string; name: string; type: 'public' | 'private'; memberCount: number; avatar?: string }[];
}

interface CommunityCreateResponse {
  success: boolean;
  community: { id?: string; _id?: string; name: string; [k: string]: unknown };
}

interface CommunityJoinResponse {
  success: boolean;
  message?: string;
  memberCount?: number;
}

export interface PendingJoinRequest {
  id: string;
  user: { id?: string; _id?: string; username?: string; avatar?: string } | string;
  message?: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt?: string;
}

interface PrivateCommunityDetailResponse {
  success: boolean;
  community?: {
    id?: string;
    _id?: string;
    name?: string;
    members?: { user: { id?: string; _id?: string; username?: string }; role?: string }[];
    pendingRequests?: PendingJoinRequest[];
    myRole?: string;
    [k: string]: unknown;
  };
  membership?: { isMember?: boolean; role?: string; myRequestStatus?: string };
  [k: string]: unknown;
}

interface HandleRequestResponse {
  success: boolean;
  action: 'accept' | 'reject';
  message?: string;
}

export interface TopicSummary {
  id: string;
  name: string;
  slug: string;
  category: string;
  description?: string;
  postCount?: number;
}

export interface PostRedditItem {
  id: string;
  author: string | PostAuthor;
  title: string;
  text: string;
  upvotes?: number;
  downvotes?: number;
  voteScore?: number;
  commentCount?: number;
  topic?: string;
  createdAt?: string;
  userVote?: 'up' | 'down' | null;
  [k: string]: unknown;
}

export interface CreateCommunityPayload {
  name: string;
  description?: string;
  avatar?: string;
}

export class MarketHubClient {
  private token: string | null = null;

  constructor(private readonly baseUrl: string) {}

  private async request<T>(
    path: string,
    init: RequestInit & { auth?: boolean } = {}
  ): Promise<T> {
    const headers = new Headers(init.headers);
    if (init.auth && this.token) headers.set('Authorization', `Bearer ${this.token}`);
    if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const res = await fetch(`${this.baseUrl}${path}`, { ...init, headers });
    const text = await res.text();
    let body: unknown = text;
    try { body = text ? JSON.parse(text) : null; } catch { /* keep raw text */ }

    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${path} → ${typeof body === 'string' ? body : JSON.stringify(body)}`);
    }
    return body as T;
  }

  setToken(token: string): void {
    this.token = token;
  }

  getToken(): string | null {
    return this.token;
  }

  async register(payload: RegisterPayload): Promise<AuthResponse> {
    const res = await this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (res.accessToken) this.token = res.accessToken;
    return res;
  }

  async login(payload: LoginPayload): Promise<AuthResponse> {
    const res = await this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (res.accessToken) this.token = res.accessToken;
    return res;
  }

  async updateProfile(payload: UpdateProfilePayload): Promise<{ success: boolean; user: unknown }> {
    return this.request('/profile', {
      method: 'PUT',
      auth: true,
      body: JSON.stringify(payload),
    });
  }

  async createPostX(payload: CreatePostPayload): Promise<CreatePostResponse> {
    const fd = new FormData();
    fd.append('text', payload.text);
    return this.request<CreatePostResponse>('/posts', {
      method: 'POST',
      auth: true,
      body: fd,
    });
  }

  async getFeed(query: FeedQuery = {}): Promise<FeedResponse> {
    const params = new URLSearchParams();
    if (query.mode) params.set('mode', query.mode);
    if (query.limit) params.set('limit', String(query.limit));
    if (query.page) params.set('page', String(query.page));
    const qs = params.toString();
    return this.request<FeedResponse>(`/posts/feed${qs ? `?${qs}` : ''}`, {
      method: 'GET',
      auth: true,
    });
  }

  async commentOnPost(postId: string, payload: CommentPayload): Promise<CommentResponse> {
    return this.request<CommentResponse>(`/posts/${postId}/comments`, {
      method: 'POST',
      auth: true,
      body: JSON.stringify(payload),
    });
  }

  async getPostComments(postId: string): Promise<CommentsListResponse> {
    return this.request<CommentsListResponse>(`/posts/${postId}/comments`, {
      method: 'GET',
    });
  }

  async likePost(postId: string): Promise<LikeResponse> {
    return this.request<LikeResponse>(`/posts/${postId}/like`, {
      method: 'POST',
      auth: true,
    });
  }

  async replyToComment(
    postId: string,
    commentId: string,
    payload: CommentPayload,
  ): Promise<CommentResponse> {
    return this.request<CommentResponse>(`/posts/${postId}/comments/${commentId}/reply`, {
      method: 'POST',
      auth: true,
      body: JSON.stringify(payload),
    });
  }

  async followUser(username: string): Promise<FollowResponse> {
    return this.request<FollowResponse>(`/users/${encodeURIComponent(username)}/follow`, {
      method: 'POST',
      auth: true,
    });
  }

  async getUserProfile(username: string): Promise<UserProfileResponse> {
    return this.request<UserProfileResponse>(`/users/${encodeURIComponent(username)}`, {
      method: 'GET',
    });
  }

  async discoverCommunities(query: {
    search?: string;
    sort?: 'popularity' | 'members' | 'new';
    type?: ('public' | 'private')[];
    limit?: number;
    page?: number;
  } = {}): Promise<DiscoverResponse> {
    const params = new URLSearchParams();
    if (query.search) params.set('search', query.search);
    if (query.sort) params.set('sort', query.sort);
    if (query.type && query.type.length > 0) params.set('type', query.type.join(','));
    if (query.limit) params.set('limit', String(query.limit));
    if (query.page) params.set('page', String(query.page));
    const qs = params.toString();
    return this.request<DiscoverResponse>(`/communities/discover${qs ? `?${qs}` : ''}`, {
      method: 'GET',
      auth: true,
    });
  }

  async getMyCommunities(): Promise<MyCommunitiesResponse> {
    return this.request<MyCommunitiesResponse>('/communities/my', {
      method: 'GET',
      auth: true,
    });
  }

  async createPublicCommunity(payload: CreateCommunityPayload): Promise<CommunityCreateResponse> {
    const fd = new FormData();
    fd.append('name', payload.name);
    if (payload.description) fd.append('description', payload.description);
    if (payload.avatar) fd.append('avatar', payload.avatar);
    return this.request<CommunityCreateResponse>('/communities/public', {
      method: 'POST',
      auth: true,
      body: fd,
    });
  }

  async joinPublicCommunity(id: string): Promise<CommunityJoinResponse> {
    return this.request<CommunityJoinResponse>(`/communities/public/${id}/join`, {
      method: 'POST',
      auth: true,
    });
  }

  async leavePublicCommunity(id: string): Promise<CommunityJoinResponse> {
    return this.request<CommunityJoinResponse>(`/communities/public/${id}/leave`, {
      method: 'POST',
      auth: true,
    });
  }

  async createPublicCommunityPost(id: string, payload: CreatePostPayload): Promise<CreatePostResponse> {
    const fd = new FormData();
    fd.append('text', payload.text);
    return this.request<CreatePostResponse>(`/communities/public/${id}/posts`, {
      method: 'POST',
      auth: true,
      body: fd,
    });
  }

  async createPrivateCommunity(payload: CreateCommunityPayload): Promise<CommunityCreateResponse> {
    const fd = new FormData();
    fd.append('name', payload.name);
    if (payload.description) fd.append('description', payload.description);
    if (payload.avatar) fd.append('avatar', payload.avatar);
    return this.request<CommunityCreateResponse>('/communities/private', {
      method: 'POST',
      auth: true,
      body: fd,
    });
  }

  async getPrivateCommunity(id: string): Promise<PrivateCommunityDetailResponse> {
    return this.request<PrivateCommunityDetailResponse>(`/communities/private/${id}`, {
      method: 'GET',
      auth: true,
    });
  }

  async requestPrivateCommunity(id: string, message?: string): Promise<{ success: boolean; message?: string }> {
    return this.request(`/communities/private/${id}/request`, {
      method: 'POST',
      auth: true,
      body: JSON.stringify({ message: message ?? '' }),
    });
  }

  async handleJoinRequest(
    communityId: string,
    requestId: string,
    action: 'accept' | 'reject',
  ): Promise<HandleRequestResponse> {
    return this.request<HandleRequestResponse>(`/communities/private/${communityId}/requests/${requestId}`, {
      method: 'POST',
      auth: true,
      body: JSON.stringify({ action }),
    });
  }

  async createPrivateCommunityPost(id: string, payload: CreatePostPayload): Promise<CreatePostResponse> {
    const fd = new FormData();
    fd.append('text', payload.text);
    return this.request<CreatePostResponse>(`/communities/private/${id}/posts`, {
      method: 'POST',
      auth: true,
      body: fd,
    });
  }

  async listTopics(): Promise<{ success: boolean; topics: TopicSummary[] }> {
    return this.request('/topics', { method: 'GET' });
  }

  async getTopicFeed(slug: string, sort: 'top' | 'recent' = 'top', limit = 20): Promise<{ success: boolean; posts: PostRedditItem[] }> {
    return this.request(`/topics/${encodeURIComponent(slug)}/feed?sort=${sort}&limit=${limit}`, {
      method: 'GET',
      auth: true,
    });
  }

  async createTopicPost(slug: string, payload: { title: string; text: string }): Promise<{ success: boolean; post: PostRedditItem }> {
    const fd = new FormData();
    fd.append('title', payload.title);
    fd.append('text', payload.text);
    return this.request(`/topics/${encodeURIComponent(slug)}/posts`, {
      method: 'POST',
      auth: true,
      body: fd,
    });
  }

  async voteTopicPost(slug: string, postId: string, vote: 'up' | 'down'): Promise<{ success: boolean; upvotes: number; downvotes: number }> {
    return this.request(`/topics/${encodeURIComponent(slug)}/posts/${postId}/vote`, {
      method: 'POST',
      auth: true,
      body: JSON.stringify({ vote }),
    });
  }

  async commentTopicPost(slug: string, postId: string, payload: CommentPayload): Promise<CommentResponse> {
    return this.request<CommentResponse>(`/topics/${encodeURIComponent(slug)}/posts/${postId}/comments`, {
      method: 'POST',
      auth: true,
      body: JSON.stringify(payload),
    });
  }

  async listTopicPostComments(slug: string, postId: string): Promise<CommentsListResponse> {
    return this.request<CommentsListResponse>(`/topics/${encodeURIComponent(slug)}/posts/${postId}/comments`, {
      method: 'GET',
    });
  }

  async checkDiscussion(commentId: string): Promise<{ success: boolean; exists: boolean; discussionId?: string }> {
    return this.request(`/discussions/comment/${commentId}`, { method: 'GET', auth: true });
  }

  async createDiscussion(commentId: string, text: string): Promise<{ success: boolean; discussion: { _id: string; commentId: string; createdBy: string }; message: { _id: string; text: string } }> {
    return this.request(`/discussions/comment/${commentId}`, {
      method: 'POST',
      auth: true,
      body: JSON.stringify({ text }),
    });
  }

  async getDiscussion(discussionId: string): Promise<{ success: boolean; discussion: { _id: string; createdBy: string; commentId?: { _id: string; author?: { _id?: string; username?: string } } } }> {
    return this.request(`/discussions/${discussionId}`, { method: 'GET', auth: true });
  }

  async getDiscussionMessages(discussionId: string, cursor?: string): Promise<{ success: boolean; messages: { _id: string; author: { _id: string; username: string }; text: string; createdAt: string }[]; hasMore: boolean }> {
    const qs = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
    return this.request(`/discussions/${discussionId}/messages${qs}`, { method: 'GET', auth: true });
  }

  async addDiscussionMessage(discussionId: string, text: string, replyTo?: string): Promise<{ success: boolean; message: { _id: string; text: string } }> {
    return this.request(`/discussions/${discussionId}/messages`, {
      method: 'POST',
      auth: true,
      body: JSON.stringify({ text, replyTo: replyTo ?? null }),
    });
  }

  async getPublicCommunityFeed(id: string, limit = 20): Promise<FeedResponse> {
    return this.request<FeedResponse>(`/communities/public/${id}/feed?limit=${limit}`, {
      method: 'GET',
    });
  }

  async getPrivateCommunityFeed(id: string, limit = 20): Promise<FeedResponse> {
    return this.request<FeedResponse>(`/communities/private/${id}/feed?limit=${limit}`, {
      method: 'GET',
      auth: true,
    });
  }
}
