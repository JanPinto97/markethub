import 'dotenv/config';
import { MarketHubClient, type PostXItem } from './api-client.js';
import { generateText } from './llm.js';

interface Persona {
  name: string;
  expertise: string;
  voice: string;
  topics: string[];
}

const PERSONAS: Persona[] = [
  {
    name: 'SPY/options day trader',
    expertise: 'SPY, QQQ, VIX, options flow, gamma exposure, 0DTEs',
    voice: 'Concise, technical, slightly opinionated US equity day trader who lives on the open and the close.',
    topics: ['SPY', 'QQQ', 'VIX', '0DTE options', 'gamma squeezes', 'opex week', 'FOMC reaction'],
  },
  {
    name: 'crypto degen',
    expertise: 'BTC, ETH, altcoins, on-chain flows, perp funding, liquidations',
    voice: 'Sleep-deprived crypto degen who refreshes funding rates between meals. Slang heavy, half ironic.',
    topics: ['BTC dominance', 'ETH gas', 'altseason', 'funding rates', 'liquidation cascades', 'memecoins', 'L2 narratives'],
  },
  {
    name: 'forex macro trader',
    expertise: 'EUR/USD, DXY, JPY carry, central bank divergence, bond/FX cross-flow',
    voice: 'Calm, macro-brained FX trader who cares about rate differentials and central bank scripts.',
    topics: ['DXY', 'EUR/USD', 'USD/JPY', 'BoJ intervention', 'ECB minutes', 'carry trades', 'real yields'],
  },
  {
    name: 'commodities trader',
    expertise: 'crude oil, nat gas, gold, copper, agri, OPEC dynamics',
    voice: 'Old-school commodities trader. Dry humor. Talks barrels, contango, inventories.',
    topics: ['WTI crude', 'OPEC+ cuts', 'nat gas storage', 'gold vs real yields', 'copper demand', 'wheat futures', 'contango/backwardation'],
  },
  {
    name: 'biotech swing trader',
    expertise: 'small-cap biotech catalysts, FDA calendar, PDUFA dates, phase-3 readouts',
    voice: 'Biotech gambler. Knows every PDUFA date. Half scientist, half lottery player.',
    topics: ['PDUFA dates', 'phase 3 readouts', 'FDA AdComm', 'small-cap biotech', 'orphan drugs', 'oncology binaries'],
  },
  {
    name: 'value investor',
    expertise: 'fundamentals, free cash flow, balance sheets, multi-year holds, contrarian small caps',
    voice: 'Patient long-term value guy. Quotes Buffett ironically. Annoyed by hype.',
    topics: ['free cash flow', 'P/E multiples', 'tobacco stocks', 'Japanese net-nets', 'banks below book', 'shareholder yield'],
  },
  {
    name: 'macro doomer',
    expertise: 'global liquidity, sovereign debt, demographics, inflation regimes, gold and BTC as hedges',
    voice: 'Macro doomer with a sense of humor. Reads central bank balance sheets for fun.',
    topics: ['M2', 'TGA', 'reverse repo', 'sovereign debt spirals', 'yield curve control', 'demographic decline', 'currency debasement'],
  },
  {
    name: 'European equities trader',
    expertise: 'DAX, CAC, FTSE, IBEX, EU banks, luxury sector, energy majors',
    voice: 'European equities trader. Sees US session as background noise. Mildly amused by Wall Street drama.',
    topics: ['DAX', 'CAC 40', 'IBEX 35', 'LVMH', 'ASML', 'European banks', 'TotalEnergies', 'Stoxx 600'],
  },
  {
    name: 'emerging markets trader',
    expertise: 'Brazil, India, China A-shares, Turkey, ADRs, EM FX, sovereign spreads',
    voice: 'EM specialist. Talks BRL, INR, TRY like they are weather. Cynical about IMF programs.',
    topics: ['BRL', 'INR', 'CNY fix', 'TRY collapse', 'EM sovereign spreads', 'India equities', 'China stimulus'],
  },
  {
    name: 'momentum/CTA quant',
    expertise: 'trend following, cross-asset momentum, vol targeting, systematic signals',
    voice: 'Quant. Speaks in signals, lookbacks, regimes. Slightly cold, occasionally smug about humans.',
    topics: ['trend following', 'cross-asset momentum', 'vol targeting', 'breakout systems', 'CTA positioning', 'regime shifts'],
  },
  {
    name: 'high-yield credit trader',
    expertise: 'HY bonds, leveraged loans, credit spreads, default cycles, distressed debt',
    voice: 'Credit guy. Watches spreads more than equities. Convinced equity people are clueless.',
    topics: ['HY spreads', 'IG vs HY', 'leveraged loans', 'CLO tranches', 'distressed names', 'default rates', 'CDX'],
  },
  {
    name: 'energy & utilities specialist',
    expertise: 'nat gas, LNG, uranium, nuclear renaissance, grid build-out, AI power demand',
    voice: 'Energy specialist. Bullish on uranium and grid. Tired of green narratives without numbers.',
    topics: ['uranium', 'LNG terminals', 'nat gas inventories', 'grid build-out', 'AI power demand', 'utility capex', 'small modular reactors'],
  },
  {
    name: 'meme/retail trader',
    expertise: 'WSB favorites, short squeezes, single-stock options, retail sentiment',
    voice: 'Retail trader who lives on Discord and r/wallstreetbets. Maximum cope, maximum hype.',
    topics: ['short squeezes', 'GME', 'AMC', 'meme stocks', 'YOLO calls', 'theta gang', 'WSB sentiment'],
  },
  {
    name: 'crypto miner / on-chain analyst',
    expertise: 'mining hashrate, halving cycles, on-chain metrics, exchange flows',
    voice: 'On-chain analyst. Datapoint-obsessed. Talks UTXOs, hashrate, exchange outflows.',
    topics: ['BTC halving', 'hashrate', 'exchange outflows', 'long-term holder supply', 'realized cap', 'miner capitulation'],
  },
];

function pickPersona(): Persona {
  return PERSONAS[Math.floor(Math.random() * PERSONAS.length)]!;
}

function buildSystemPrompt(p: Persona): string {
  return [
    `You are a ${p.name} on a financial social network called MarketHub.`,
    `Your expertise: ${p.expertise}.`,
    `Voice: ${p.voice}`,
    `Stay strictly inside YOUR niche. Do NOT default to talking about SPY or US large-cap indices unless your persona is explicitly about them.`,
    `Always write in English. Never use hashtags. Never use emojis. Never use markdown formatting.`,
  ].join('\n');
}

function trim(text: string, max: number): string {
  const t = text.replace(/\s+/g, ' ').trim();
  return t.length > max ? t.slice(0, max - 1).trimEnd() + '.' : t;
}

function strip(text: string): string {
  return text
    .replace(/[#*_`>]/g, '')
    .replace(/\p{Extended_Pictographic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function sanitizeUsername(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/["'`]/g, '')
    .split(/\s+/)[0] ?? '';
}

const USERNAME_STYLES: { label: string; instruction: string }[] = [
  { label: 'animal-mashup',   instruction: 'Combine a market animal (bull, bear, wolf, hawk, shark, whale, raven) with a trading concept. e.g. gamma_wolf, vix_raven.' },
  { label: 'verb-noun',       instruction: 'Use a verb + noun pattern that sounds aggressive or active. e.g. fade_the_open, hunt_liquidity, tape_reader.' },
  { label: 'compound-jargon', instruction: 'Glue two pieces of options/markets jargon together with no underscore at all. e.g. gammapulse, theta_decay, deltabandit.' },
  { label: 'mythic',          instruction: 'Reference mythology, gods, or folklore mixed with markets. e.g. odin_options, hermes_flow, kraken_bid.' },
  { label: 'self-deprecating',instruction: 'Be self-mocking about losing or coping. e.g. wrong_again, copium_dealer, blown_account.' },
  { label: 'menacing',        instruction: 'Sound mildly threatening to market makers or other traders. e.g. mm_killer, stop_hunter_99, bid_smasher.' },
  { label: 'noir-cool',       instruction: 'Dark, cinematic, vaguely noir. e.g. midnight_tape, neon_short, ghost_in_the_book.' },
  { label: 'absurd-random',   instruction: 'Pair markets with something completely unrelated and absurd. e.g. vix_pickle, gamma_taco, spy_lasagna.' },
  { label: 'numeric-coded',   instruction: 'A short word followed by a number 1-4 digits long that feels meaningful (year, level, strike, age). e.g. spy_420, vix_84, gamma_2008, fomc1971.' },
  { label: 'lowercase-handle',instruction: 'Lowercase one-word handle, vibe-driven, no underscore. e.g. drawdown, slippage, basisrisk, fadeit.' },
  { label: 'ticker-fan',      instruction: 'Fanboy of one specific ticker. e.g. tsla_only, nvda_pilled, qqq_4life, spy_supremacy.' },
  { label: 'old-school',      instruction: 'Old-school chatroom / IRC vibe. e.g. xX_pit_trader_Xx style WITHOUT the Xx, just retro. e.g. tape_92, pit_ghost, big_unit_ts.' },
];

function pickUsernameStyle(): { label: string; instruction: string } {
  return USERNAME_STYLES[Math.floor(Math.random() * USERNAME_STYLES.length)]!;
}

async function generateUsername(persona: Persona, system: string): Promise<string> {
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
  console.log(`[1] username style=${style.label} digits=${allowDigits} → ${cleaned}`);
  return cleaned;
}

function buildCreds(username: string): { username: string; email: string; password: string } {
  const email = `${username}@seeder.local`;
  const password = `Pwd_${username}!A2x`.slice(0, 64);
  return { username, email, password };
}

function variant(base: string, attempt: number): string {
  if (attempt === 0) return base;
  const tail = String(attempt + 1);
  const room = 20 - tail.length - 1;
  const trimmed = base.length > room ? base.slice(0, room) : base;
  return `${trimmed}_${tail}`;
}

const BIO_STYLES: { label: string; instruction: string }[] = [
  { label: 'self-deprecating',     instruction: 'Be self-deprecating and openly admit a recent embarrassing loss or stupid trade. Roast yourself.' },
  { label: 'cocky-arrogant',       instruction: 'Be cocky and slightly insufferable. Brag about a P&L number, a call you nailed, or how rarely you are wrong.' },
  { label: 'bitter-cynic',         instruction: 'Be a bitter, jaded cynic. Mock retail, mock CNBC, mock yourself for still being here after years of pain.' },
  { label: 'cryptic-degenerate',   instruction: 'Sound like a sleep-deprived 0DTE degenerate. Use trader slang, fragmented phrasing, dark humor about your account.' },
  { label: 'philosophical-monk',   instruction: 'Be weirdly philosophical or zen, as if trading is a spiritual discipline. Quote-like vibe but in your own words.' },
  { label: 'pseudo-academic',      instruction: 'Pretend to be an over-credentialed quant. Drop one fake-sounding metric or jargon term. Keep it deadpan.' },
  { label: 'absurdist',            instruction: 'Be absurdist and deliberately ridiculous. Mention something off-topic and surreal next to your trading edge.' },
  { label: 'noir-detective',       instruction: 'Write like a noir detective monologue, but the case is the S&P 500 open.' },
  { label: 'corporate-parody',     instruction: 'Parody a stiff LinkedIn bio. Use corporate buzzwords ironically, then undercut them with one honest line.' },
  { label: 'menace',               instruction: 'Sound like a menace to the order book. Slightly threatening tone toward market makers, half joking.' },
  { label: 'nostalgic-veteran',    instruction: 'Be a nostalgic veteran. Reference an old crash or era as if you were there, with dry humor.' },
  { label: 'absolute-confidence',  instruction: 'Be absurdly overconfident about one specific oddly-narrow edge (e.g. only trades Tuesdays, only after 2:30pm).' },
];

function pickStyle(): { label: string; instruction: string } {
  return BIO_STYLES[Math.floor(Math.random() * BIO_STYLES.length)]!;
}

const POST_STYLES: { label: string; instruction: string }[] = [
  { label: 'hot-take',           instruction: 'Drop a spicy contrarian hot take. Pick a fight with consensus. State it like you mean it.' },
  { label: 'live-pnl',           instruction: 'Narrate a live P&L moment as if you just closed a position 5 minutes ago. Real numbers, real ticker, dirty hands.' },
  { label: 'confession',         instruction: 'Confess a stupid mistake you just made. Self-roast. End with one lesson, no moralizing.' },
  { label: 'observation',        instruction: 'Share a very specific micro-observation from the tape today (a print, a wick, an option chain anomaly). Niche, almost too detailed.' },
  { label: 'rant',               instruction: 'Mini rant. Annoyed. Short sentences. About the Fed, CNBC, market makers, slippage, or some retail meme.' },
  { label: 'shitpost',           instruction: 'Pure shitpost energy. Half joking, half cope. Trader humor. Can be absurd.' },
  { label: 'genuine-question',   instruction: 'Ask the feed a real question you actually want answered about today\'s session. Curious tone, not lecturing.' },
  { label: 'micro-thesis',       instruction: 'Lay out a 2-3 line micro-thesis on one ticker for the rest of the week. Specific level. Specific catalyst.' },
  { label: 'flex',               instruction: 'Casually flex a recent win without saying "I won". Imply it. Smug, dry.' },
  { label: 'doomer',             instruction: 'Doomer mood. Everything is fragile, the cycle is breaking, you saw 08. Half-serious, half-meme.' },
  { label: 'storytime',          instruction: 'Tell a 2-line micro-story from your screen today. Set scene → punchline.' },
  { label: 'cryptic-oneliner',   instruction: 'One cryptic line that sounds like it means something. No explanation.' },
];

const COMMENT_STYLES: { label: string; instruction: string }[] = [
  { label: 'agree-build',        instruction: 'Agree, then add ONE specific data point or level the original post missed.' },
  { label: 'pushback',           instruction: 'Politely disagree. Counter with one concrete reason, not a lecture.' },
  { label: 'roast-friendly',     instruction: 'Friendly roast. Tease the OP without being mean. Trader banter.' },
  { label: 'ask-followup',       instruction: 'Ask one sharp follow-up question that exposes a gap in their thesis.' },
  { label: 'shared-pain',        instruction: 'Reply with empathy because you got burned the same way. One line of solidarity, one line of dark humor.' },
  { label: 'one-liner',          instruction: 'A single dry one-liner. No filler. No greeting.' },
  { label: 'skeptic',            instruction: 'Be the skeptic in the room. Question the premise, not the person.' },
  { label: 'confirm-with-receipt', instruction: 'Confirm what they said and casually mention you have the position on already.' },
  { label: 'tangential-joke',    instruction: 'Make a tangential joke that loosely connects to the post. Trader humor.' },
  { label: 'caution',            instruction: 'Caution them about a specific risk they did not mention.' },
  { label: 'meta-comment',       instruction: 'Comment on the WAY the post is written rather than the content (their tone, their cope, their conviction).' },
];

function pickPostStyle(): { label: string; instruction: string } {
  return POST_STYLES[Math.floor(Math.random() * POST_STYLES.length)]!;
}

function pickCommentStyle(): { label: string; instruction: string } {
  return COMMENT_STYLES[Math.floor(Math.random() * COMMENT_STYLES.length)]!;
}

const HUMAN_RULES = [
  'Sound like a real human typing fast on a phone between trades, not a marketing copywriter.',
  'Lowercase is fine. Mid-sentence cuts are fine. Trader slang is fine.',
  'No hashtags. No emojis. No markdown. No surrounding quotes. No "As a day trader,". No "In conclusion".',
  'Avoid corporate phrasing like "leveraging", "navigating volatility", "stay tuned".',
  'Vary sentence length. Allow fragments. Allow one swear if it fits, but no slurs.',
  'Do not introduce yourself. Do not sign off. Just write the line.',
  'Do NOT start with meta-preamble like "Okay, here\'s a post:", "Sure, here is...", "Here\'s your reply:". Output the body only.',
];

function weightedPick<T>(items: T[]): T | null {
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

function pickTarget(posts: PostXItem[], ownId: string): { post: PostXItem; mode: 'trending' | 'recent' } | null {
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

function getAuthorId(post: PostXItem): string | null {
  const a = post.author;
  if (typeof a === 'string') return a;
  if (a && typeof a === 'object') return a._id ?? a.id ?? null;
  return null;
}

async function main(): Promise<void> {
  const baseUrl = process.env.MARKETHUB_API_URL || 'http://localhost:3000/api/v1';
  const client = new MarketHubClient(baseUrl);

  console.log(`[seeder] base url: ${baseUrl}`);

  // Pick the persona for THIS run — drives every prompt below.
  const persona = pickPersona();
  const system = buildSystemPrompt(persona);
  console.log(`[persona] ${persona.name}`);

  // 1. Generate bio + register
  const style = pickStyle();
  const seed = Math.floor(Math.random() * 1_000_000);
  const bioPrompt = [
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
  console.log(`[1] bio style=${style.label} seed=${seed}`);
  const bioRaw = await generateText(bioPrompt, { system, maxTokens: 140 });
  const bio = trim(strip(bioRaw), 200);

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
  const postStyle = pickPostStyle();
  const postSeed = Math.floor(Math.random() * 1_000_000);
  const topicAnchor = persona.topics[Math.floor(Math.random() * persona.topics.length)] ?? persona.expertise;
  const postPrompt = [
    `Write ONE MarketHub post in your own voice.`,
    `Style for THIS post: ${postStyle.instruction}`,
    `Topic anchor for THIS post: ${topicAnchor}. Center the post around this. You can name other things in your niche if it helps, but do not pivot to a different domain.`,
    `Strict niche lock: you are a ${persona.name}. Do NOT mention SPY, the Fed or generic US large-cap topics unless they belong in your niche.`,
    `Length: 1 to 4 short sentences, max 360 characters total.`,
    ...HUMAN_RULES.map((r) => `- ${r}`),
    `Variation seed (do not output, just be different): ${postSeed}.`,
    `Return only the post body. Nothing else.`,
  ].join('\n');
  console.log(`[4] post style=${postStyle.label} topic=${topicAnchor} seed=${postSeed}`);
  const postRaw = await generateText(postPrompt, { system, maxTokens: 240 });
  const text = trim(strip(postRaw), 400);
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

  // 6. Generate comment + post it (context-aware over the post body)
  const targetBody = (target.text ?? '').toString().trim();
  const hasBody = targetBody.length > 0;
  const commentStyle = pickCommentStyle();
  const commentSeed = Math.floor(Math.random() * 1_000_000);

  const commentPrompt = hasBody
    ? [
        `You are replying on MarketHub to the post quoted at the bottom.`,
        `Style for THIS reply: ${commentStyle.instruction}`,
        `You are a ${persona.name}; reply through that lens, but engage with what the post actually says — reference a concrete word or idea from it.`,
        `It is fine if the post is from a different niche than yours; bring your own perspective without pretending to be in their seat.`,
        `Length: 1 to 3 short sentences, max 260 characters total.`,
        ...HUMAN_RULES.map((r) => `- ${r}`),
        `Variation seed (do not output): ${commentSeed}.`,
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
        `Variation seed (do not output): ${commentSeed}.`,
      ].join('\n');

  if (!hasBody) console.warn('[6] target post body empty/missing — using generic fallback comment');
  console.log(`[6] comment style=${commentStyle.label} seed=${commentSeed}`);
  const commentRaw = await generateText(commentPrompt, { system, maxTokens: 200 });
  const commentText = trim(strip(commentRaw), 400);
  const cmt = await client.commentOnPost(target.id, { text: commentText });
  console.log(`[6] commented id=${cmt.comment.id}`);
}

main().catch((err) => {
  console.error('[seeder] fatal:', err);
  process.exit(1);
});
