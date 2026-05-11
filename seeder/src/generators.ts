import type { Persona } from './personas.js';
import { generateText } from './llm.js';
import {
  pickUsernameStyle,
  pickBioStyle,
  pickPostStyle,
  pickCommentStyle,
  HUMAN_RULES,
} from './styles.js';
import { sanitizeUsername, strip, trim } from './utils.js';

export async function generateUsername(persona: Persona, system: string): Promise<string> {
  const style = pickUsernameStyle();
  const seed = Math.floor(Math.random() * 1_000_000);
  const allowDigits = Math.random() < 0.45 || style.label === 'numeric-coded';

  const prompt = [
    `Invent ONE social-network username for a ${persona.name} focused on ${persona.expertise}.`,
    `Style: ${style.instruction}`,
    `Hard constraints:`,
    `- lowercase only`,
    `- max 18 characters total`,
    `- only letters, digits and underscores`,
    `- no spaces, no quotes, no punctuation other than underscore`,
    allowDigits
      ? `- you MAY include a number of 1 to 4 digits if it fits the style (year, level, strike, age, etc.). Don't force it.`
      : `- no digits this time, letters and underscores only.`,
    `- avoid the literal examples shown above; produce something fresh`,
    `- do NOT use the words "trader", "trading", "user", "official"`,
    `Variation seed (do not output it, just use it to be different): ${seed}.`,
    `Return ONLY the username on a single line. No explanation, no quotes, no prefix.`,
  ].join('\n');

  const raw = await generateText(prompt, { system, maxTokens: 20 });
  let cleaned = sanitizeUsername(strip(raw)).replace(/[^a-z0-9_]/g, '');
  cleaned = cleaned.replace(/^_+|_+$/g, '').replace(/_{2,}/g, '_');
  if (!allowDigits) cleaned = cleaned.replace(/\d+/g, '');
  if (cleaned.length < 3) cleaned = `spy_${Math.floor(Math.random() * 9000 + 100)}`;
  if (cleaned.length > 18) cleaned = cleaned.slice(0, 18);
  console.log(`[gen] username style=${style.label} digits=${allowDigits} → ${cleaned}`);
  return cleaned;
}

export async function generateBio(persona: Persona, system: string): Promise<string> {
  const style = pickBioStyle();
  const seed = Math.floor(Math.random() * 1_000_000);
  const prompt = [
    `Write ONE first-person MarketHub profile bio.`,
    `Style: ${style.instruction}`,
    `Hard constraints:`,
    `- Max 180 characters total.`,
    `- One or two short sentences. Sentence fragments allowed.`,
    `- No hashtags, no emojis, no markdown, no surrounding quotes.`,
    `- Do NOT start with a generic intro like "I am a trader". Surprise me.`,
    `- Do not mention the word "bio". Just write the line.`,
    `- Stay inside YOUR niche (${persona.expertise}). Do not drift into SPY or generic US large-cap talk unless that is your niche.`,
    `Variation seed (ignore in output, just use it to make this distinct from any other bio): ${seed}.`,
  ].join('\n');
  console.log(`[gen] bio style=${style.label} seed=${seed}`);
  const raw = await generateText(prompt, { system, maxTokens: 140 });
  return trim(strip(raw), 200);
}

export async function generatePostText(persona: Persona, system: string): Promise<string> {
  const postStyle = pickPostStyle();
  const seed = Math.floor(Math.random() * 1_000_000);
  const topicAnchor = persona.topics[Math.floor(Math.random() * persona.topics.length)] ?? persona.expertise;
  const prompt = [
    `Write ONE MarketHub post in your own voice.`,
    `Style for THIS post: ${postStyle.instruction}`,
    `Topic anchor for THIS post: ${topicAnchor}. Center the post around this. You can name other things in your niche if it helps, but do not pivot to a different domain.`,
    `Strict niche lock: you are a ${persona.name}. Do NOT mention SPY, the Fed or generic US large-cap topics unless they belong in your niche.`,
    `Length: 1 to 4 short sentences, max 360 characters total.`,
    ...HUMAN_RULES.map((r) => `- ${r}`),
    `Variation seed (do not output, just be different): ${seed}.`,
    `Return only the post body. Nothing else.`,
  ].join('\n');
  console.log(`[gen] post style=${postStyle.label} topic=${topicAnchor} seed=${seed}`);
  const raw = await generateText(prompt, { system, maxTokens: 240 });
  return trim(strip(raw), 400);
}

export async function generateCommentText(
  persona: Persona,
  system: string,
  targetBody: string,
  contrarianness: number,
): Promise<string> {
  const commentStyle = pickCommentStyle();
  const seed = Math.floor(Math.random() * 1_000_000);
  const hasBody = targetBody.trim().length > 0;
  const tilt =
    contrarianness > 0.6
      ? 'Lean toward pushback or skepticism in tone, but stay civil.'
      : contrarianness < 0.35
        ? 'Lean toward agreement or building on the idea.'
        : 'Mixed stance, react honestly.';

  const prompt = hasBody
    ? [
        `You are replying on MarketHub to the post quoted at the bottom.`,
        `Style for THIS reply: ${commentStyle.instruction}`,
        `You are a ${persona.name}; reply through that lens, but engage with what the post actually says — reference a concrete word or idea from it.`,
        `Stance: ${tilt}`,
        `It is fine if the post is from a different niche than yours; bring your own perspective without pretending to be in their seat.`,
        `Length: 1 to 3 short sentences, max 260 characters total.`,
        ...HUMAN_RULES.map((r) => `- ${r}`),
        `Variation seed (do not output): ${seed}.`,
        `Return only the reply text. Nothing else.`,
        ``,
        `POST:`,
        `"""${targetBody}"""`,
      ].join('\n')
    : [
        `Write a short generic MarketHub reply, max 240 characters.`,
        `Style for THIS reply: ${commentStyle.instruction}`,
        `Stay in your niche as a ${persona.name}.`,
        ...HUMAN_RULES.map((r) => `- ${r}`),
        `Variation seed (do not output): ${seed}.`,
      ].join('\n');

  console.log(`[gen] comment style=${commentStyle.label} seed=${seed}`);
  const raw = await generateText(prompt, { system, maxTokens: 200 });
  return trim(strip(raw), 400);
}

export interface GeneratedCommunity {
  name: string;
  description: string;
  type: 'public' | 'private';
}

export async function generateCommunity(
  persona: Persona,
  system: string,
): Promise<GeneratedCommunity> {
  const seed = Math.floor(Math.random() * 1_000_000);
  const type: 'public' | 'private' = Math.random() < 0.7 ? 'public' : 'private';
  const topic = persona.topics[Math.floor(Math.random() * persona.topics.length)] ?? persona.expertise;

  const prompt = [
    `Invent ONE community on MarketHub that a ${persona.name} would naturally create.`,
    `Topic anchor: ${topic}. Stay inside the persona's niche (${persona.expertise}).`,
    `Type: ${type} (${type === 'public' ? 'anyone can join' : 'request-to-join'}).`,
    `Return STRICT JSON: {"name": "...", "description": "..."}.`,
    `Constraints:`,
    `- name: 3 to 40 characters, no emojis, no markdown, no surrounding quotes. Real-sounding community name, not a hashtag.`,
    `- description: max 220 characters, one or two short sentences, persona-flavored. No emojis. No surrounding quotes.`,
    `Variation seed (ignore in output): ${seed}.`,
  ].join('\n');

  let raw = '';
  try {
    raw = await generateText(prompt, { system, maxTokens: 200, json: true });
    const parsed = JSON.parse(raw) as { name?: string; description?: string };
    const name = trim(strip(parsed.name ?? ''), 50);
    const description = trim(strip(parsed.description ?? ''), 280);
    if (name.length >= 3) {
      console.log(`[gen] community type=${type} name="${name}"`);
      return { name, description, type };
    }
  } catch {
    // fall through to fallback
  }
  const fallback = `${topic.replace(/[^a-zA-Z0-9 ]/g, '').slice(0, 28).trim() || 'markets'} crew`;
  console.log(`[gen] community fallback type=${type} name="${fallback}"`);
  return { name: fallback, description: `Spot for ${topic} talk.`, type };
}

export async function generateCommunityPostText(
  persona: Persona,
  system: string,
  communityName: string,
): Promise<string> {
  const seed = Math.floor(Math.random() * 1_000_000);
  const topicAnchor = persona.topics[Math.floor(Math.random() * persona.topics.length)] ?? persona.expertise;
  const prompt = [
    `Write ONE PostX inside the MarketHub community "${communityName}" in your own voice.`,
    `Center the post around: ${topicAnchor}.`,
    `Be conversational with other members — assume they share your niche. Less explaining, more inside-baseball.`,
    `Length: 1 to 4 short sentences, max 360 characters total.`,
    ...HUMAN_RULES.map((r) => `- ${r}`),
    `Variation seed (do not output): ${seed}.`,
    `Return only the post body. Nothing else.`,
  ].join('\n');
  console.log(`[gen] communityPost community="${communityName}" topic=${topicAnchor} seed=${seed}`);
  const raw = await generateText(prompt, { system, maxTokens: 240 });
  return trim(strip(raw), 400);
}

export async function generateJoinRequestMessage(
  persona: Persona,
  system: string,
  communityName: string,
): Promise<string> {
  const seed = Math.floor(Math.random() * 1_000_000);
  const prompt = [
    `Write ONE short message to request joining the private MarketHub community "${communityName}".`,
    `You are a ${persona.name}. Mention briefly why you fit.`,
    `Length: max 140 characters, one or two short sentences.`,
    ...HUMAN_RULES.map((r) => `- ${r}`),
    `Variation seed (do not output): ${seed}.`,
    `Return only the message. Nothing else.`,
  ].join('\n');
  const raw = await generateText(prompt, { system, maxTokens: 100 });
  return trim(strip(raw), 150);
}

export async function generateReplyText(
  persona: Persona,
  system: string,
  parentText: string,
  contrarianness: number,
): Promise<string> {
  return generateCommentText(persona, system, parentText, contrarianness);
}
