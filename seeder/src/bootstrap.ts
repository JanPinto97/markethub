import 'dotenv/config';
import { MarketHubClient } from './api-client.js';
import { pickPersona, buildSystemPrompt } from './personas.js';
import { generateUsername, generateBio } from './generators.js';
import { buildCreds, variant } from './utils.js';
import { saveAgent, newAgentId, type AgentState } from './state.js';

async function createOne(baseUrl: string): Promise<AgentState | null> {
  const client = new MarketHubClient(baseUrl);
  const persona = pickPersona();
  const system = buildSystemPrompt(persona);
  console.log(`[bootstrap] persona=${persona.name}`);

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
      console.warn(`[bootstrap] username "${creds.username}" taken, retrying`);
    }
  }
  if (!reg) {
    console.warn('[bootstrap] could not pick a free username after 8 attempts');
    return null;
  }
  console.log(`[bootstrap] registered username=${creds.username} id=${reg.user.id}`);

  try {
    await client.updateProfile({ bio });
  } catch (err) {
    console.warn(`[bootstrap] updateProfile skipped: ${(err as Error).message}`);
  }

  const state: AgentState = {
    id: newAgentId(),
    username: creds.username,
    email: creds.email,
    password: creds.password,
    userId: reg.user.id,
    accessToken: reg.accessToken,
    personaId: persona.id,
    bio,
    createdAt: new Date().toISOString(),
    lastActedAt: null,
    actionsCount: 0,
    postedPostIds: [],
    likedPostIds: [],
    commentedPostIds: [],
    repliedCommentIds: [],
    followedUsernames: [],
    communities: [],
    requestedPrivateCommunityIds: [],
    createdCommunityIds: [],
  };

  await saveAgent(state);
  console.log(`[bootstrap] saved agent id=${state.id} username=${state.username}`);
  return state;
}

async function main(): Promise<void> {
  const baseUrl = process.env.MARKETHUB_API_URL || 'http://localhost:3000/api/v1';
  const arg = process.argv[2] ?? '5';
  const count = Math.max(1, parseInt(arg, 10) || 0);
  console.log(`[bootstrap] base=${baseUrl} count=${count}`);

  let ok = 0;
  for (let i = 0; i < count; i++) {
    console.log(`[bootstrap] --- agent ${i + 1}/${count} ---`);
    try {
      const a = await createOne(baseUrl);
      if (a) ok += 1;
    } catch (err) {
      console.error(`[bootstrap] agent ${i + 1} failed: ${(err as Error).message}`);
    }
  }
  console.log(`[bootstrap] done: ${ok}/${count} agents created`);
}

main().catch((err) => {
  console.error('[bootstrap] fatal:', err);
  process.exit(1);
});
