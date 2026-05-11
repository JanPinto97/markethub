import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STATE_DIR = path.resolve(__dirname, '..', 'state');
const AGENTS_DIR = path.join(STATE_DIR, 'agents');
const MANIFEST_PATH = path.join(STATE_DIR, 'manifest.json');

export interface AgentCommunityMembership {
  id: string;
  name: string;
  type: 'public' | 'private';
  role?: string;
}

export interface AgentState {
  id: string;
  username: string;
  email: string;
  password: string;
  userId: string;
  accessToken: string | null;
  personaId: string;
  bio: string;
  createdAt: string;
  lastActedAt: string | null;
  actionsCount: number;
  postedPostIds: string[];
  likedPostIds: string[];
  commentedPostIds: string[];
  repliedCommentIds: string[];
  followedUsernames: string[];
  communities: AgentCommunityMembership[];
  requestedPrivateCommunityIds: string[];
  createdCommunityIds: string[];
}

export function ensureAgentDefaults(s: AgentState): AgentState {
  if (!Array.isArray(s.communities)) s.communities = [];
  if (!Array.isArray(s.requestedPrivateCommunityIds)) s.requestedPrivateCommunityIds = [];
  if (!Array.isArray(s.createdCommunityIds)) s.createdCommunityIds = [];
  return s;
}

interface Manifest {
  agentIds: string[];
}

async function ensureDirs(): Promise<void> {
  await fs.mkdir(AGENTS_DIR, { recursive: true });
}

async function readManifest(): Promise<Manifest> {
  try {
    const raw = await fs.readFile(MANIFEST_PATH, 'utf8');
    return JSON.parse(raw) as Manifest;
  } catch {
    return { agentIds: [] };
  }
}

async function writeManifest(m: Manifest): Promise<void> {
  await ensureDirs();
  await fs.writeFile(MANIFEST_PATH, JSON.stringify(m, null, 2), 'utf8');
}

function agentPath(id: string): string {
  return path.join(AGENTS_DIR, `${id}.json`);
}

export async function listAgentIds(): Promise<string[]> {
  await ensureDirs();
  const m = await readManifest();
  return m.agentIds;
}

export async function loadAgent(id: string): Promise<AgentState | null> {
  try {
    const raw = await fs.readFile(agentPath(id), 'utf8');
    return ensureAgentDefaults(JSON.parse(raw) as AgentState);
  } catch {
    return null;
  }
}

export async function loadAllAgents(): Promise<AgentState[]> {
  const ids = await listAgentIds();
  const out: AgentState[] = [];
  for (const id of ids) {
    const a = await loadAgent(id);
    if (a) out.push(a);
  }
  return out;
}

export async function saveAgent(state: AgentState): Promise<void> {
  await ensureDirs();
  await fs.writeFile(agentPath(state.id), JSON.stringify(state, null, 2), 'utf8');
  const m = await readManifest();
  if (!m.agentIds.includes(state.id)) {
    m.agentIds.push(state.id);
    await writeManifest(m);
  }
}

export function newAgentId(): string {
  return `agent_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
