Two small fixes in seeder/src/single-agent.ts:

1. USERNAME GENERATION
Replace the current random hash suffix username with an LLM-generated one.
Add a generateUsername(persona) call before register that asks Gemma to invent
a social-network-style username coherent with the persona (examples for a day
trader: vix_whisperer, spy_scalper, gamma_flow, 0dte_hunter).
Prompt must return ONLY the username, no explanation, no quotes, lowercase,
underscores allowed, max 20 chars, no numbers unless they add meaning.

2. CONTEXT-AWARE COMMENT
When commenting on a post, the feed response already returns the post object.
Pass the full post text to the comment generation prompt so Gemma can respond
coherently to what was actually written, not just generically.
Check what field the feed returns for post content (text, body, content...)
and use it. If the field is empty or missing, fall back to a generic comment.

Do not touch llm.ts, api-client.ts, or any other file.
Do not explain anything. Return only the modified single-agent.ts.