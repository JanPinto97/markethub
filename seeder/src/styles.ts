export interface Style {
  label: string;
  instruction: string;
}

export const USERNAME_STYLES: Style[] = [
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

export const BIO_STYLES: Style[] = [
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

export const POST_STYLES: Style[] = [
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

export const COMMENT_STYLES: Style[] = [
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

export const HUMAN_RULES: string[] = [
  'Sound like a real human typing fast on a phone between trades, not a marketing copywriter.',
  'Lowercase is fine. Mid-sentence cuts are fine. Trader slang is fine.',
  'No hashtags. No emojis. No markdown. No surrounding quotes. No "As a day trader,". No "In conclusion".',
  'Avoid corporate phrasing like "leveraging", "navigating volatility", "stay tuned".',
  'Vary sentence length. Allow fragments. Allow one swear if it fits, but no slurs.',
  'Do not introduce yourself. Do not sign off. Just write the line.',
  'Do NOT start with meta-preamble like "Okay, here\'s a post:", "Sure, here is...", "Here\'s your reply:". Output the body only.',
];

function pickFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

export const pickUsernameStyle = () => pickFrom(USERNAME_STYLES);
export const pickBioStyle      = () => pickFrom(BIO_STYLES);
export const pickPostStyle     = () => pickFrom(POST_STYLES);
export const pickCommentStyle  = () => pickFrom(COMMENT_STYLES);
