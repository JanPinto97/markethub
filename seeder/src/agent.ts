import {
  MarketHubClient,
  type PostXItem,
  type PostCommentItem,
  type CommunitySummary,
  type TopicSummary,
  type PostRedditItem,
} from './api-client.js';
import { getPersonaById, buildSystemPrompt, type Persona } from './personas.js';
import {
  generatePostText,
  generateCommentText,
  generateCommunity,
  generateCommunityPostText,
  generateJoinRequestMessage,
  generateRedditPost,
  generateRedditComment,
  generateDiscussionOpener,
  generateDiscussionReply,
} from './generators.js';
import {
  getAuthorId,
  getAuthorUsername,
  pickTarget,
  trim,
  strip,
  weightedPick,
  shuffle,
} from './utils.js';
import { saveAgent, type AgentState, type AgentCommunityMembership } from './state.js';

export type ActionType =
  | 'post'
  | 'comment'
  | 'like'
  | 'follow'
  | 'community_post'
  | 'community_engage'
  | 'join_community'
  | 'create_community'
  | 'handle_requests'
  | 'topic_post'
  | 'topic_vote'
  | 'topic_comment'
  | 'start_discussion'
  | 'reply_discussion';

interface Decision {
  action: ActionType;
  reason?: string;
}

const COMMUNITY_ACTIONS: ActionType[] = [
  'community_post',
  'join_community',
  'create_community',
  'handle_requests',
];

export class Agent {
  readonly state: AgentState;
  readonly persona: Persona;
  readonly system: string;
  private client: MarketHubClient;

  constructor(state: AgentState, baseUrl: string) {
    this.state = state;
    const persona = getPersonaById(state.personaId);
    if (!persona) throw new Error(`Unknown persona id: ${state.personaId}`);
    this.persona = persona;
    this.system = buildSystemPrompt(persona);
    this.client = new MarketHubClient(baseUrl);
    if (state.accessToken) this.client.setToken(state.accessToken);
  }

  async ensureLogin(): Promise<void> {
    const res = await this.client.login({ email: this.state.email, password: this.state.password });
    this.state.accessToken = res.accessToken;
  }

  private rollAction(): ActionType {
    const b = this.persona.behavior;

    const inCommunities = this.state.communities.length > 0;
    const ownsPrivate = this.state.communities.some(
      (c) => c.type === 'private' && (c.role === 'leader' || c.role === 'moderator'),
    );
    const hasDiscussions = this.state.discussions.length > 0;
    const hasAuthoredComments = this.state.authoredCommentIds.length > 0;

    const r = Math.random();
    if (inCommunities && r < 0.05) return 'community_engage';
    if (inCommunities && r < 0.08) return 'community_post';
    if (r < 0.11) return 'join_community';
    if (r < 0.12) return 'create_community';
    if (ownsPrivate && r < 0.13) return 'handle_requests';
    if (r < 0.16) return 'topic_vote';
    if (r < 0.185) return 'topic_comment';
    if (r < 0.195) return 'topic_post';
    if (hasDiscussions && r < 0.215) return 'reply_discussion';
    if (hasAuthoredComments && r < 0.225) return 'start_discussion';

    if (Math.random() < b.socialRate) {
      const s = Math.random();
      if (s < 0.55) return 'like';
      if (s < 0.87) return 'comment';
      if (s < 0.97) return 'follow';
      return 'post';
    }
    if (Math.random() < b.postRate) return 'post';
    return 'like';
  }

  private pickAction(): Decision {
    return { action: this.rollAction(), reason: 'heuristic' };
  }

  async act(): Promise<{ action: ActionType; reason?: string }> {
    await this.ensureLogin();
    await this.syncCommunities();

    const feed = await this.client.getFeed({ mode: 'trending', limit: 30 });
    const decision = this.pickAction();

    console.log(`[${this.state.username}] decision=${decision.action} reason="${decision.reason ?? ''}"`);

    try {
      switch (decision.action) {
        case 'post':            await this.doPost(); break;
        case 'comment':         await this.doComment(feed.posts); break;
        case 'like':            await this.doLike(feed.posts); break;
        case 'follow':          await this.doFollow(feed.posts); break;
        case 'community_post':  await this.doCommunityPost(); break;
        case 'community_engage':await this.doCommunityEngage(); break;
        case 'join_community':  await this.doJoinCommunity(); break;
        case 'topic_post':      await this.doTopicPost(); break;
        case 'topic_vote':      await this.doTopicVote(); break;
        case 'topic_comment':   await this.doTopicComment(); break;
        case 'start_discussion':await this.doStartDiscussion(feed.posts); break;
        case 'reply_discussion':await this.doReplyDiscussion(); break;
        case 'create_community':await this.doCreateCommunity(); break;
        case 'handle_requests': await this.doHandleRequests(); break;
      }
    } catch (err) {
      console.warn(`[${this.state.username}] action=${decision.action} failed: ${(err as Error).message}`);
    }

    this.state.lastActedAt = new Date().toISOString();
    this.state.actionsCount += 1;
    await saveAgent(this.state);
    return decision;
  }

  private async syncCommunities(): Promise<void> {
    try {
      const res = await this.client.getMyCommunities();
      const next: AgentCommunityMembership[] = res.communities.map((c) => {
        const prev = this.state.communities.find((p) => p.id === c.id);
        return {
          id: c.id,
          name: c.name,
          type: c.type,
          role: prev?.role,
        };
      });
      this.state.communities = next;
      const joinedIds = new Set(next.map((c) => c.id));
      this.state.requestedPrivateCommunityIds = this.state.requestedPrivateCommunityIds.filter(
        (id) => !joinedIds.has(id),
      );
      for (const c of next) {
        if (c.type !== 'private' || c.role) continue;
        try {
          const detail = await this.client.getPrivateCommunity(c.id);
          const myRole = detail.community?.myRole ?? detail.membership?.role;
          if (myRole) c.role = myRole;
        } catch {
          // ignore — role stays undefined
        }
      }
    } catch (err) {
      console.warn(`[${this.state.username}] syncCommunities failed: ${(err as Error).message}`);
    }
  }

  private async doPost(): Promise<void> {
    const text = await generatePostText(this.persona, this.system);
    const created = await this.client.createPostX({ text });
    this.state.postedPostIds.push(created.post.id);
    console.log(`[${this.state.username}] posted id=${created.post.id}`);
  }

  private async maybeFollowAuthorOf(post: PostXItem): Promise<void> {
    if (Math.random() >= 0.1) return;
    const username = getAuthorUsername(post);
    if (!username || username === this.state.username) return;
    if (this.state.followedUsernames.includes(username)) return;
    try {
      const res = await this.client.followUser(username);
      if (res.following && !this.state.followedUsernames.includes(username)) {
        this.state.followedUsernames.push(username);
      }
      console.log(`[${this.state.username}] auto-follow @${username} following=${res.following}`);
    } catch (err) {
      console.warn(`[${this.state.username}] auto-follow @${username} failed: ${(err as Error).message}`);
    }
  }

  private async doComment(posts: PostXItem[]): Promise<void> {
    const candidates = posts.filter(
      (p) => getAuthorId(p) !== this.state.userId && !this.state.commentedPostIds.includes(p.id),
    );
    const picked = pickTarget(candidates, this.state.userId);
    if (!picked) return;
    const body = (picked.post.text ?? '').toString();
    const text = await generateCommentText(this.persona, this.system, body, this.persona.behavior.contrarianness);
    const cmt = await this.client.commentOnPost(picked.post.id, { text });
    this.state.commentedPostIds.push(picked.post.id);
    if (cmt.comment?.id) this.state.authoredCommentIds.push(cmt.comment.id);
    console.log(`[${this.state.username}] commented post=${picked.post.id} comment=${cmt.comment.id}`);
    await this.maybeFollowAuthorOf(picked.post);
  }

  private async doLike(posts: PostXItem[]): Promise<void> {
    const candidates = posts.filter(
      (p) => getAuthorId(p) !== this.state.userId && !this.state.likedPostIds.includes(p.id),
    );
    if (candidates.length === 0) return;
    const picked = weightedPick(shuffle(candidates).slice(0, 12));
    if (!picked) return;
    const res = await this.client.likePost(picked.id);
    if (!this.state.likedPostIds.includes(picked.id)) this.state.likedPostIds.push(picked.id);
    console.log(`[${this.state.username}] liked post=${picked.id} liked=${res.liked}`);
    await this.maybeFollowAuthorOf(picked);
  }

  private async doFollow(posts: PostXItem[]): Promise<void> {
    const seen = new Set(this.state.followedUsernames);
    const usernames = posts
      .map((p) => getAuthorUsername(p))
      .filter((u): u is string => !!u && u !== this.state.username && !seen.has(u));
    if (usernames.length === 0) return;
    const picked = weightedPick(usernames.slice(0, 10));
    if (!picked) return;
    const res = await this.client.followUser(picked);
    if (res.following) this.state.followedUsernames.push(picked);
    console.log(`[${this.state.username}] follow @${picked} following=${res.following}`);
  }

  private async doCommunityPost(): Promise<void> {
    if (this.state.communities.length === 0) {
      await this.doJoinCommunity();
      return;
    }
    const community = this.state.communities[Math.floor(Math.random() * this.state.communities.length)]!;
    const text = await generateCommunityPostText(this.persona, this.system, community.name);
    const res = community.type === 'public'
      ? await this.client.createPublicCommunityPost(community.id, { text })
      : await this.client.createPrivateCommunityPost(community.id, { text });
    this.state.postedPostIds.push(res.post.id);
    console.log(`[${this.state.username}] community_post in="${community.name}" type=${community.type} id=${res.post.id}`);
  }

  private async doJoinCommunity(): Promise<void> {
    const term = this.persona.topics[Math.floor(Math.random() * this.persona.topics.length)] ?? '';
    let candidates: CommunitySummary[] = [];
    try {
      const res = await this.client.discoverCommunities({ search: term, sort: 'popularity', limit: 20 });
      candidates = res.communities;
    } catch (err) {
      console.warn(`[${this.state.username}] discover failed: ${(err as Error).message}`);
    }
    if (candidates.length === 0) {
      try {
        const res = await this.client.discoverCommunities({ sort: 'popularity', limit: 20 });
        candidates = res.communities;
      } catch {
        return;
      }
    }
    const joinedIds = new Set(this.state.communities.map((c) => c.id));
    const requestedIds = new Set(this.state.requestedPrivateCommunityIds);
    const filtered = candidates.filter(
      (c) => !joinedIds.has(c.id) && !c.isJoined && !(c.type === 'private' && requestedIds.has(c.id)),
    );
    if (filtered.length === 0) return;
    const target = weightedPick(filtered.slice(0, 10));
    if (!target) return;

    if (target.type === 'public') {
      const res = await this.client.joinPublicCommunity(target.id);
      this.state.communities.push({ id: target.id, name: target.name, type: 'public' });
      console.log(`[${this.state.username}] joined public="${target.name}" members=${res.memberCount ?? '?'}`);
    } else {
      const message = await generateJoinRequestMessage(this.persona, this.system, target.name);
      try {
        await this.client.requestPrivateCommunity(target.id, message);
        this.state.requestedPrivateCommunityIds.push(target.id);
        console.log(`[${this.state.username}] requested private="${target.name}"`);
      } catch (err) {
        const msg = (err as Error).message;
        if (msg.includes('HTTP 409')) {
          this.state.requestedPrivateCommunityIds.push(target.id);
          console.log(`[${this.state.username}] already requested private="${target.name}"`);
        } else {
          throw err;
        }
      }
    }
  }

  private async doCreateCommunity(): Promise<void> {
    if (this.state.createdCommunityIds.length >= 2) {
      console.log(`[${this.state.username}] create_community skipped (cap reached)`);
      return;
    }
    const draft = await generateCommunity(this.persona, this.system);
    let lastErr: unknown = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const name = attempt === 0 ? draft.name : `${draft.name.slice(0, 46)} ${attempt + 1}`;
      try {
        const res = draft.type === 'public'
          ? await this.client.createPublicCommunity({ name, description: draft.description })
          : await this.client.createPrivateCommunity({ name, description: draft.description });
        const id = (res.community.id ?? res.community._id ?? '') as string;
        if (!id) return;
        this.state.createdCommunityIds.push(id);
        this.state.communities.push({
          id,
          name: res.community.name,
          type: draft.type,
          role: draft.type === 'private' ? 'leader' : undefined,
        });
        console.log(`[${this.state.username}] created ${draft.type}="${res.community.name}" id=${id}`);
        return;
      } catch (err) {
        lastErr = err;
        const msg = (err as Error).message;
        if (!msg.includes('HTTP 409')) break;
      }
    }
    if (lastErr) console.warn(`[${this.state.username}] create_community failed: ${(lastErr as Error).message}`);
  }

  private async doCommunityEngage(): Promise<void> {
    if (this.state.communities.length === 0) {
      console.log(`[${this.state.username}] community_engage skipped (no communities)`);
      return;
    }
    const ordered = shuffle(this.state.communities);
    for (const community of ordered) {
      let posts: PostXItem[] = [];
      try {
        const res = community.type === 'public'
          ? await this.client.getPublicCommunityFeed(community.id, 20)
          : await this.client.getPrivateCommunityFeed(community.id, 20);
        posts = res.posts ?? [];
      } catch (err) {
        console.warn(`[${this.state.username}] community feed failed (${community.name}): ${(err as Error).message}`);
        continue;
      }
      const candidates = posts.filter((p) => getAuthorId(p) !== this.state.userId);
      if (candidates.length === 0) continue;

      const wantsComment = Math.random() < 0.35;
      if (wantsComment) {
        const eligible = candidates.filter((p) => !this.state.commentedPostIds.includes(p.id));
        const picked = pickTarget(eligible, this.state.userId) ?? pickTarget(candidates, this.state.userId);
        if (!picked) continue;
        const body = (picked.post.text ?? '').toString();
        const text = await generateCommentText(this.persona, this.system, body, this.persona.behavior.contrarianness);
        const cmt = await this.client.commentOnPost(picked.post.id, { text });
        if (!this.state.commentedPostIds.includes(picked.post.id)) this.state.commentedPostIds.push(picked.post.id);
        if (cmt.comment?.id) this.state.authoredCommentIds.push(cmt.comment.id);
        console.log(`[${this.state.username}] community_engage commented in="${community.name}" post=${picked.post.id} comment=${cmt.comment.id}`);
        await this.maybeFollowAuthorOf(picked.post);
        return;
      }

      const likeCandidates = candidates.filter((p) => !this.state.likedPostIds.includes(p.id));
      if (likeCandidates.length === 0) continue;
      const target = weightedPick(shuffle(likeCandidates).slice(0, 10));
      if (!target) continue;
      const res = await this.client.likePost(target.id);
      if (!this.state.likedPostIds.includes(target.id)) this.state.likedPostIds.push(target.id);
      console.log(`[${this.state.username}] community_engage liked in="${community.name}" post=${target.id} liked=${res.liked}`);
      await this.maybeFollowAuthorOf(target);
      return;
    }
  }

  private async doHandleRequests(): Promise<void> {
    const owned = this.state.communities.filter(
      (c) => c.type === 'private' && (c.role === 'leader' || c.role === 'moderator'),
    );
    if (owned.length === 0) {
      console.log(`[${this.state.username}] handle_requests skipped (no leader/moderator role)`);
      return;
    }
    const community = owned[Math.floor(Math.random() * owned.length)]!;
    let pending: { id: string; message?: string }[] = [];
    try {
      const detail = await this.client.getPrivateCommunity(community.id);
      const list = detail.pendingRequests ?? detail.community?.pendingRequests ?? [];
      pending = list
        .filter((r) => r.status === 'pending')
        .map((r) => ({ id: (r.id ?? r._id) as string, message: r.message }))
        .filter((r) => !!r.id);
    } catch (err) {
      console.warn(`[${this.state.username}] getPrivateCommunity failed: ${(err as Error).message}`);
      return;
    }
    if (pending.length === 0) {
      console.log(`[${this.state.username}] handle_requests no pending in "${community.name}"`);
      return;
    }
    const batch = pending.slice(0, 3);
    for (const req of batch) {
      const action: 'accept' | 'reject' = Math.random() < 0.8 ? 'accept' : 'reject';
      try {
        await this.client.handleJoinRequest(community.id, req.id, action);
        console.log(`[${this.state.username}] ${action} request=${req.id} in="${community.name}"`);
      } catch (err) {
        console.warn(`[${this.state.username}] handle_request failed: ${(err as Error).message}`);
      }
    }
  }

  private async pickTopicForPersona(): Promise<TopicSummary | null> {
    let topics: TopicSummary[] = [];
    try {
      const res = await this.client.listTopics();
      topics = res.topics ?? [];
    } catch {
      return null;
    }
    if (topics.length === 0) return null;
    const haystack = [
      ...this.persona.topics.map((t) => t.toLowerCase()),
      this.persona.expertise.toLowerCase(),
    ].join(' ');
    const scored = topics.map((t) => {
      const words = t.name.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 3);
      let score = 0;
      for (const w of words) if (haystack.includes(w)) score += 2;
      return { t, score };
    });
    scored.sort((a, b) => b.score - a.score);
    const matched = scored.filter((s) => s.score > 0).slice(0, 5);
    const pool = matched.length > 0 ? matched : scored.slice(0, 8);
    return pool[Math.floor(Math.random() * pool.length)]!.t;
  }

  private async doTopicPost(): Promise<void> {
    const topic = await this.pickTopicForPersona();
    if (!topic) {
      console.log(`[${this.state.username}] topic_post skipped (no topic)`);
      return;
    }
    const { title, text } = await generateRedditPost(this.persona, this.system, topic.name);
    try {
      const res = await this.client.createTopicPost(topic.slug, { title, text });
      this.state.postedRedditPostIds.push(res.post.id);
      console.log(`[${this.state.username}] topic_post topic="${topic.name}" id=${res.post.id}`);
    } catch (err) {
      console.warn(`[${this.state.username}] topic_post failed: ${(err as Error).message}`);
    }
  }

  private async doTopicVote(): Promise<void> {
    const topic = await this.pickTopicForPersona();
    if (!topic) return;
    let posts: PostRedditItem[] = [];
    try {
      const res = await this.client.getTopicFeed(topic.slug, Math.random() < 0.5 ? 'top' : 'recent', 25);
      posts = res.posts ?? [];
    } catch (err) {
      console.warn(`[${this.state.username}] topic feed failed: ${(err as Error).message}`);
      return;
    }
    const eligible = posts.filter(
      (p) => getAuthorId(p as unknown as PostXItem) !== this.state.userId
        && !this.state.votedRedditPostIds.includes(p.id),
    );
    if (eligible.length === 0) return;
    const target = weightedPick(shuffle(eligible).slice(0, 12));
    if (!target) return;
    const vote: 'up' | 'down' = Math.random() < (0.85 - this.persona.behavior.contrarianness * 0.4) ? 'up' : 'down';
    try {
      const res = await this.client.voteTopicPost(topic.slug, target.id, vote);
      this.state.votedRedditPostIds.push(target.id);
      console.log(`[${this.state.username}] topic_vote topic="${topic.name}" post=${target.id} vote=${vote} up=${res.upvotes} down=${res.downvotes}`);
    } catch (err) {
      console.warn(`[${this.state.username}] topic_vote failed: ${(err as Error).message}`);
    }
  }

  private async doTopicComment(): Promise<void> {
    const topic = await this.pickTopicForPersona();
    if (!topic) return;
    let posts: PostRedditItem[] = [];
    try {
      const res = await this.client.getTopicFeed(topic.slug, 'top', 20);
      posts = res.posts ?? [];
    } catch {
      return;
    }
    const eligible = posts.filter(
      (p) => getAuthorId(p as unknown as PostXItem) !== this.state.userId
        && !this.state.commentedRedditPostIds.includes(p.id),
    );
    if (eligible.length === 0) return;
    const target = weightedPick(shuffle(eligible).slice(0, 8));
    if (!target) return;
    const text = await generateRedditComment(
      this.persona,
      this.system,
      target.title ?? '',
      target.text ?? '',
      this.persona.behavior.contrarianness,
    );
    try {
      const res = await this.client.commentTopicPost(topic.slug, target.id, { text });
      this.state.commentedRedditPostIds.push(target.id);
      console.log(`[${this.state.username}] topic_comment topic="${topic.name}" post=${target.id} comment=${res.comment.id}`);
    } catch (err) {
      console.warn(`[${this.state.username}] topic_comment failed: ${(err as Error).message}`);
    }
  }

  private async doStartDiscussion(feedPosts: PostXItem[]): Promise<void> {
    const candidatePosts = shuffle(feedPosts.filter((p) => getAuthorId(p) !== this.state.userId)).slice(0, 6);
    for (const post of candidatePosts) {
      let comments: PostCommentItem[] = [];
      try {
        const res = await this.client.getPostComments(post.id);
        comments = res.comments ?? [];
      } catch {
        continue;
      }
      const target = comments.find((c) => {
        const aid = typeof c.author === 'string' ? c.author : c.author?._id ?? c.author?.id;
        if (!aid || aid === this.state.userId) return false;
        return !this.state.discussions.some((d) => d.otherUserId === aid);
      });
      if (!target) continue;
      const aid = typeof target.author === 'string' ? target.author : target.author?._id ?? target.author?.id;
      const aname = typeof target.author === 'string' ? 'someone' : target.author?.username ?? 'someone';

      try {
        const existing = await this.client.checkDiscussion(target.id);
        if (existing.exists) continue;
      } catch {
        continue;
      }

      const text = await generateDiscussionOpener(this.persona, this.system, target.text ?? '', aname);
      try {
        const res = await this.client.createDiscussion(target.id, text);
        this.state.discussions.push({
          id: res.discussion._id,
          otherUserId: aid,
          otherUsername: aname,
          lastMessageAt: new Date().toISOString(),
        });
        console.log(`[${this.state.username}] start_discussion with=@${aname} discussion=${res.discussion._id}`);
      } catch (err) {
        console.warn(`[${this.state.username}] start_discussion failed: ${(err as Error).message}`);
      }
      return;
    }
    console.log(`[${this.state.username}] start_discussion no eligible comment`);
  }

  private async syncInboundDiscussions(): Promise<void> {
    const knownCommentIds = new Set(this.state.discussions.map((d) => d.id));
    const sample = shuffle(this.state.authoredCommentIds).slice(0, 4);
    for (const cid of sample) {
      try {
        const res = await this.client.checkDiscussion(cid);
        if (res.exists && res.discussionId && !knownCommentIds.has(res.discussionId)
          && !this.state.discussions.some((d) => d.id === res.discussionId)) {
          let otherUserId: string | undefined;
          let otherUsername: string | undefined;
          try {
            const detail = await this.client.getDiscussion(res.discussionId);
            const createdBy = detail.discussion.createdBy;
            if (createdBy && createdBy !== this.state.userId) {
              otherUserId = createdBy;
              otherUsername = detail.discussion.commentId?.author?.username;
            }
          } catch {
            // ignore
          }
          this.state.discussions.push({
            id: res.discussionId,
            otherUserId,
            otherUsername,
            lastMessageAt: new Date(0).toISOString(),
          });
          console.log(`[${this.state.username}] inbound discussion detected id=${res.discussionId}`);
        }
      } catch {
        // ignore single-failure
      }
    }
  }

  private async doReplyDiscussion(): Promise<void> {
    await this.syncInboundDiscussions();
    if (this.state.discussions.length === 0) {
      console.log(`[${this.state.username}] reply_discussion no discussions`);
      return;
    }
    const ordered = shuffle(this.state.discussions);
    for (const d of ordered) {
      let messages: { _id: string; author: { _id: string; username: string }; text: string; createdAt: string }[] = [];
      try {
        const res = await this.client.getDiscussionMessages(d.id);
        messages = res.messages ?? [];
      } catch {
        continue;
      }
      if (messages.length === 0) continue;
      const last = messages[messages.length - 1]!;
      if (last.author._id === this.state.userId) continue;

      const history = messages.map((m) => ({ author: m.author.username, text: m.text }));
      const text = await generateDiscussionReply(this.persona, this.system, history);
      try {
        await this.client.addDiscussionMessage(d.id, text);
        d.lastMessageAt = new Date().toISOString();
        if (!d.otherUserId) {
          d.otherUserId = last.author._id;
          d.otherUsername = last.author.username;
        }
        console.log(`[${this.state.username}] reply_discussion id=${d.id} to=@${last.author.username}`);
      } catch (err) {
        console.warn(`[${this.state.username}] reply_discussion failed: ${(err as Error).message}`);
      }
      return;
    }
    console.log(`[${this.state.username}] reply_discussion nothing pending`);
  }
}

export function trimText(text: string, max: number): string {
  return trim(strip(text), max);
}
