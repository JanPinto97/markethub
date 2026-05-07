import type { PostXItem } from './api-client.js';

export function trim(text: string, max: number): string {
  const t = text.replace(/\s+/g, ' ').trim();
  return t.length > max ? t.slice(0, max - 1).trimEnd() + '.' : t;
}

export function strip(text: string): string {
  return text
    .replace(/[#*_`>]/g, '')
    .replace(/\p{Extended_Pictographic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function sanitizeUsername(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/["'`]/g, '')
    .split(/\s+/)[0] ?? '';
}

export function buildCreds(username: string): { username: string; email: string; password: string } {
  const email = `${username}@seeder.local`;
  const password = `Pwd_${username}!A2x`.slice(0, 64);
  return { username, email, password };
}

export function variant(base: string, attempt: number): string {
  if (attempt === 0) return base;
  const tail = String(attempt + 1);
  const room = 20 - tail.length - 1;
  const trimmed = base.length > room ? base.slice(0, room) : base;
  return `${trimmed}_${tail}`;
}

export function weightedPick<T>(items: T[]): T | null {
  if (items.length === 0) return null;
  const weights = items.map((_, i) => 1 / (i + 1));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i]!;
    if (r <= 0) return items[i]!;
  }
  return items[items.length - 1]!;
}

export function getAuthorId(post: PostXItem): string | null {
  const a = post.author;
  if (typeof a === 'string') return a;
  if (a && typeof a === 'object') return a._id ?? a.id ?? null;
  return null;
}

export function getAuthorUsername(post: PostXItem): string | null {
  const a = post.author;
  if (!a || typeof a === 'string') return null;
  return a.username ?? null;
}

export function pickTarget(
  posts: PostXItem[],
  ownId: string,
): { post: PostXItem; mode: 'trending' | 'recent' } | null {
  const candidates = posts.filter((p) => getAuthorId(p) !== ownId);
  if (candidates.length === 0) return null;

  const mode: 'trending' | 'recent' = Math.random() < 0.5 ? 'trending' : 'recent';

  if (mode === 'trending') {
    const top = candidates.slice(0, Math.min(10, candidates.length));
    const picked = weightedPick(top);
    if (picked) return { post: picked, mode };
  }

  const byRecent = [...candidates].sort((a, b) => {
    const ta = new Date((a as { createdAt?: string }).createdAt ?? 0).getTime();
    const tb = new Date((b as { createdAt?: string }).createdAt ?? 0).getTime();
    return tb - ta;
  });
  const top = byRecent.slice(0, Math.min(10, byRecent.length));
  const picked = weightedPick(top);
  return picked ? { post: picked, mode: 'recent' } : null;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}
