import { MarketHubClient, type PostXItem, type PostCommentItem } from './api-client.js';
import { generateText } from './llm.js';
import { getPersonaById, buildSystemPrompt, type Persona } from './personas.js';
import { generatePostText, generateCommentText, generateReplyText } from './generators.js';
import {
  getAuthorId,
  getAuthorUsername,
  pickTarget,
  trim,
  strip,
  weightedPick,
  shuffle,
} from './utils.js';
import { saveAgent, type AgentState } from './state.js';

export type ActionType = 'post' | 'comment' | 'like' | 'reply' | 'follow' | 'nothing';

interface Decision {
  action: ActionType;
  reason?: string;
}

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
    if (Math.random() < b.postRate) return 'post';
    if (Math.random() < b.socialRate) {
      const r = Math.random();
      if (r < 0.45) return 'like';
      if (r < 0.8) return 'comment';
      if (r < 0.92) return 'reply';
      return 'follow';
    }
    return 'nothing';
  }

  private async pickActionViaLLM(feedSummary: string): Promise<Decision> {
    const b = this.persona.behavior;
    const heuristic = this.rollAction();
    const prompt = [
      `You are acting on MarketHub as ${this.persona.name}.`,
      `Behavior knobs: postRate=${b.postRate}, socialRate=${b.socialRate}, contrarianness=${b.contrarianness}, followRate=${b.followRate}, silenceRate=${b.silenceRate}.`,
      `Available actions: post, comment, like, reply, follow, nothing.`,
      `Heuristic suggestion (you can override if it doesn't fit the feed): ${heuristic}.`,
      `Feed snapshot:`,
      feedSummary || '(empty feed)',
      ``,
      `Pick ONE action. Return strict JSON: {"action": "...", "reason": "..."}.`,
      `Keep reason under 12 words.`,
    ].join('\n');

    try {
      const raw = await generateText(prompt, { system: this.system, maxTokens: 80, json: true });
      const parsed = JSON.parse(raw) as Decision;
      const valid: ActionType[] = ['post', 'comment', 'like', 'reply', 'follow', 'nothing'];
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

    const feed = await this.client.getFeed({ mode: 'trending', limit: 30 });
    const summary = this.summarizeFeed(feed.posts);
    const decision = await this.pickActionViaLLM(summary);

    console.log(`[${this.state.username}] decision=${decision.action} reason="${decision.reason ?? ''}"`);

    try {
      switch (decision.action) {
        case 'post':       await this.doPost(); break;
        case 'comment':    await this.doComment(feed.posts); break;
        case 'like':       await this.doLike(feed.posts); break;
        case 'reply':      await this.doReply(feed.posts); break;
        case 'follow':     await this.doFollow(feed.posts); break;
        case 'nothing':    break;
      }
    } catch (err) {
      console.warn(`[${this.state.username}] action=${decision.action} failed: ${(err as Error).message}`);
    }

    this.state.lastActedAt = new Date().toISOString();
    this.state.actionsCount += 1;
    await saveAgent(this.state);
    return decision;
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
}

export function trimText(text: string, max: number): string {
  return trim(strip(text), max);
}
