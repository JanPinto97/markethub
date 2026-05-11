import {
  MarketHubClient,
  type PostXItem,
  type PostCommentItem,
  type CommunitySummary,
} from './api-client.js';
import { generateText } from './llm.js';
import { getPersonaById, buildSystemPrompt, type Persona } from './personas.js';
import {
  generatePostText,
  generateCommentText,
  generateReplyText,
  generateCommunity,
  generateCommunityPostText,
  generateJoinRequestMessage,
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
  | 'reply'
  | 'follow'
  | 'nothing'
  | 'community_post'
  | 'join_community'
  | 'create_community'
  | 'handle_requests';

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
    if (Math.random() < b.silenceRate) return 'nothing';

    const r = Math.random();
    if (r < 0.05) return 'community_post';
    if (r < 0.08) return 'join_community';
    if (r < 0.095) return 'create_community';
    if (r < 0.11) return 'handle_requests';

    if (Math.random() < b.socialRate) {
      const s = Math.random();
      if (s < 0.55) return 'like';
      if (s < 0.78) return 'comment';
      if (s < 0.9) return 'reply';
      if (s < 0.97) return 'follow';
      return 'post';
    }
    if (Math.random() < b.postRate) return 'post';
    return 'like';
  }

  private describeCommunities(): string {
    if (this.state.communities.length === 0) return '(none)';
    return this.state.communities
      .map((c) => `${c.name} [${c.type}${c.role ? `, role=${c.role}` : ''}]`)
      .join('; ');
  }

  private async pickActionViaLLM(feedSummary: string): Promise<Decision> {
    const b = this.persona.behavior;
    const heuristic = this.rollAction();
    const prompt = [
      `You are acting on MarketHub as ${this.persona.name}.`,
      `Behavior knobs: postRate=${b.postRate}, socialRate=${b.socialRate}, contrarianness=${b.contrarianness}, followRate=${b.followRate}, silenceRate=${b.silenceRate}.`,
      `Available actions: post, comment, like, reply, follow, nothing, community_post, join_community, create_community, handle_requests.`,
      `On a real social network, LIKES are the most common action by far. Most engagement turns should be a "like", not a "comment" or "post". Only pick "post" when you genuinely have something to say.`,
      `Community actions are valid but RARE: prefer them when the heuristic suggests one, otherwise leave them alone. "create_community" should be very occasional. "handle_requests" only makes sense if you are leader/moderator of a private community.`,
      `Your current communities: ${this.describeCommunities()}.`,
      `Heuristic suggestion (lean toward this unless it clearly doesn't fit): ${heuristic}.`,
      `Feed snapshot:`,
      feedSummary || '(empty feed)',
      ``,
      `Pick ONE action. Return strict JSON: {"action": "...", "reason": "..."}.`,
      `Keep reason under 12 words.`,
    ].join('\n');

    try {
      const raw = await generateText(prompt, { system: this.system, maxTokens: 80, json: true });
      const parsed = JSON.parse(raw) as Decision;
      const valid: ActionType[] = [
        'post', 'comment', 'like', 'reply', 'follow', 'nothing',
        'community_post', 'join_community', 'create_community', 'handle_requests',
      ];
      if (valid.includes(parsed.action)) return parsed;
    } catch {
      // fall through
    }
    return { action: heuristic, reason: 'heuristic fallback' };
  }

  private summarizeFeed(posts: PostXItem[]): string {
    const lines: string[] = [];
    for (let i = 0; i < Math.min(8, posts.length); i++) {
      const p = posts[i]!;
      const handle = getAuthorUsername(p) ?? 'someone';
      const text = (p.text ?? '').slice(0, 120).replace(/\s+/g, ' ');
      lines.push(`${i + 1}. @${handle}: ${text}`);
    }
    return lines.join('\n');
  }

  async act(): Promise<{ action: ActionType; reason?: string }> {
    await this.ensureLogin();
    await this.syncCommunities();

    const feed = await this.client.getFeed({ mode: 'trending', limit: 30 });
    const summary = this.summarizeFeed(feed.posts);
    const decision = await this.pickActionViaLLM(summary);

    console.log(`[${this.state.username}] decision=${decision.action} reason="${decision.reason ?? ''}"`);

    try {
      switch (decision.action) {
        case 'post':            await this.doPost(); break;
        case 'comment':         await this.doComment(feed.posts); break;
        case 'like':            await this.doLike(feed.posts); break;
        case 'reply':           await this.doReply(feed.posts); break;
        case 'follow':          await this.doFollow(feed.posts); break;
        case 'community_post':  await this.doCommunityPost(); break;
        case 'join_community':  await this.doJoinCommunity(); break;
        case 'create_community':await this.doCreateCommunity(); break;
        case 'handle_requests': await this.doHandleRequests(); break;
        case 'nothing':         break;
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
    console.log(`[${this.state.username}] commented post=${picked.post.id} comment=${cmt.comment.id}`);
  }

  private async doLike(posts: PostXItem[]): Promise<void> {
    const candidates = posts.filter(
      (p) => getAuthorId(p) !== this.state.userId && !this.state.likedPostIds.includes(p.id),
    );
    if (candidates.length === 0) return;
    const picked = weightedPick(shuffle(candidates).slice(0, 12));
    if (!picked) return;
    const res = await this.client.likePost(picked.id);
    if (res.liked) this.state.likedPostIds.push(picked.id);
    console.log(`[${this.state.username}] liked post=${picked.id} liked=${res.liked}`);
  }

  private async doReply(posts: PostXItem[]): Promise<void> {
    const candidates = posts.filter((p) => getAuthorId(p) !== this.state.userId);
    const targets = shuffle(candidates).slice(0, 6);
    for (const post of targets) {
      let comments: PostCommentItem[] = [];
      try {
        const res = await this.client.getPostComments(post.id);
        comments = res.comments ?? [];
      } catch {
        continue;
      }
      const replyable = comments.filter((c) => {
        const aid = typeof c.author === 'string' ? c.author : c.author?._id ?? c.author?.id;
        return aid !== this.state.userId && !this.state.repliedCommentIds.includes(c.id);
      });
      if (replyable.length === 0) continue;
      const target = weightedPick(replyable.slice(0, 8));
      if (!target) continue;
      const text = await generateReplyText(this.persona, this.system, target.text ?? '', this.persona.behavior.contrarianness);
      const res = await this.client.replyToComment(post.id, target.id, { text });
      this.state.repliedCommentIds.push(target.id);
      console.log(`[${this.state.username}] replied comment=${target.id} reply=${res.comment.id}`);
      return;
    }
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

  private async doHandleRequests(): Promise<void> {
    const owned = this.state.communities.filter((c) => c.type === 'private' && c.role === 'leader');
    if (owned.length === 0) {
      console.log(`[${this.state.username}] handle_requests skipped (no leader role)`);
      return;
    }
    const community = owned[Math.floor(Math.random() * owned.length)]!;
    let pending: { id: string; message?: string }[] = [];
    try {
      const detail = await this.client.getPrivateCommunity(community.id);
      const list = detail.community?.pendingRequests ?? [];
      pending = list
        .filter((r) => r.status === 'pending')
        .map((r) => ({ id: r.id, message: r.message }));
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
      const action: 'accept' | 'reject' = Math.random() < 0.7 ? 'accept' : 'reject';
      try {
        await this.client.handleJoinRequest(community.id, req.id, action);
        console.log(`[${this.state.username}] ${action} request=${req.id} in="${community.name}"`);
      } catch (err) {
        console.warn(`[${this.state.username}] handle_request failed: ${(err as Error).message}`);
      }
    }
  }
}

export function trimText(text: string, max: number): string {
  return trim(strip(text), max);
}
