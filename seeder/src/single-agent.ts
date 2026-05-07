import 'dotenv/config';
import { MarketHubClient } from './api-client.js';
import { pickPersona, buildSystemPrompt } from './personas.js';
import {
  generateUsername,
  generateBio,
  generatePostText,
  generateCommentText,
} from './generators.js';
import { buildCreds, variant, getAuthorId, pickTarget } from './utils.js';

async function main(): Promise<void> {
  const baseUrl = process.env.MARKETHUB_API_URL || 'http://localhost:3000/api/v1';
  const client = new MarketHubClient(baseUrl);

  console.log(`[seeder] base url: ${baseUrl}`);

  const persona = pickPersona();
  const system = buildSystemPrompt(persona);
  console.log(`[persona] ${persona.name}`);

  // 1. Generate bio + register
  const bio = await generateBio(persona, system);
  const base = await generateUsername(persona, system);

  let reg: Awaited<ReturnType<typeof client.register>> | null = null;
  let creds = buildCreds(base);
  for (let attempt = 0; attempt < 8; attempt++) {
    creds = buildCreds(variant(base, attempt));
    try {
      reg = await client.register(creds);
      break;
    } catch (err) {
      const msg = (err as Error).message;
      if (!msg.includes('HTTP 409')) throw err;
      console.warn(`[1] username "${creds.username}" taken, retrying`);
    }
  }
  if (!reg) throw new Error('Could not pick a free username after 8 attempts');
  console.log(`[1] registered user id=${reg.user.id} username=${creds.username}`);

  // 2. Login
  const login = await client.login({ email: creds.email, password: creds.password });
  console.log(`[2] logged in token len=${login.accessToken.length}`);

  // 3. Update profile (bio)
  try {
    const upd = await client.updateProfile({ bio });
    const u = upd.user as { id?: string };
    console.log(`[3] profile updated id=${u?.id ?? reg.user.id} bio="${bio}"`);
  } catch (err) {
    console.warn(`[3] updateProfile skipped: ${(err as Error).message}`);
  }

  // 4. Create PostX
  const text = await generatePostText(persona, system);
  const created = await client.createPostX({ text });
  console.log(`[4] created PostX id=${created.post.id}`);

  // 5. Fetch a wider trending feed and pick a target via weighted blend of trending + recent
  const feed = await client.getFeed({ mode: 'trending', limit: 30 });
  const ownId = reg.user.id;
  const picked = pickTarget(feed.posts, ownId);
  if (!picked) {
    console.warn('[5] no non-own post found in feed; exiting');
    return;
  }
  const target = picked.post;
  console.log(`[5] picked target post id=${target.id} author=${getAuthorId(target)} mode=${picked.mode} (pool=${feed.posts.length})`);

  // 6. Generate comment + post it
  const targetBody = (target.text ?? '').toString();
  const commentText = await generateCommentText(persona, system, targetBody, persona.behavior.contrarianness);
  const cmt = await client.commentOnPost(target.id, { text: commentText });
  console.log(`[6] commented id=${cmt.comment.id}`);
}

main().catch((err) => {
  console.error('[seeder] fatal:', err);
  process.exit(1);
});
