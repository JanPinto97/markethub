# Assistant — Function Calling (Tools)

## Context
MarketHub — Node/Express backend, Mongoose models, JWT auth, routes prefixed `/api/v1`. Endpoint `POST /api/v1/assistant/chat` already streams responses from Gemini 2.5 Flash. Two context files exist at project root: `context-platform.md` and `context-assistant.md` — these must be loaded by the assistant service as the system prompt (currently not wired up).

## Task
Wire up the two context files as the system prompt, and add function calling so Warren can query the database via Gemini tools.

## Constraints

### Context files
- Move both `context-platform.md` and `context-assistant.md` from project root to `backend/context/`
- Load both at server startup, concatenate, and inject as the system instruction on every Gemini request
- Replace any existing placeholder context loading

### Tools — 8 read-only endpoints under `/api/v1/assistant/tools/`
All endpoints reuse existing controllers/models where possible and return **trimmed payloads** (only fields useful to an LLM, omit avatars, full timestamps, internal IDs unless needed for links):

1. `GET /communities/search?q=&type=` — search public/private communities by name
2. `GET /communities/:id` — community details + recent activity summary
3. `GET /users/search?q=` — search users by username
4. `GET /users/:username` — user profile summary
5. `GET /topics/search?q=` — search discussion topics
6. `GET /topics/:slug/posts?limit=` — recent PostReddit entries in a topic
7. `GET /news/latest?limit=` — most recent financial news
8. `GET /calendar?from=&to=` — economic calendar releases in date range

### Gemini integration
- Register the 8 endpoints as Gemini tools using `functionDeclarations` with proper JSON Schema parameters
- Implement the function-calling loop: when Gemini returns a `functionCall`, execute it, send the result back, continue until a final text response
- Keep SSE streaming to the client — only stream the final assistant text, not intermediate tool calls
- All tool endpoints require authentication (same JWT middleware as the chat endpoint)

## Output format
Only new or modified files.

## IMPORTANT
- Do not explain anything
- Do not describe steps or progress
- Do not validate requirements
- Return only final output
- Do not repeat unchanged code