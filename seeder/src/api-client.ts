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
}
