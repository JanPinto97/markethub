# MarketHub Seeder — Phase 2

## Goal

Scale the seeder from a single hardcoded agent to a multi-agent system with persistent state, distinct personas, and a continuous orchestration loop.

Before writing anything, read all existing files in `seeder/src/` to understand what is already built and how it works. Extend it — do not rewrite what already works.

Also read the relevant backend routes and controllers to discover any endpoints not yet used in the seeder (likes, replies, follow user, etc.).

## What needs to exist after this phase

**Personas** — a catalogue of distinct investor/trader personality types. Each persona defines how an agent behaves: tone, expertise, how often it posts, how social it is, how contrarian, how often it likes content, etc. There should be enough variety that agents feel like different kinds of people on a financial social network.

**Persistent agent state** — agents must survive between runs. Their identity (username, credentials, MarketHub user id), their token, and their memory of what they have already seen and done must be saved to disk and loaded on the next run.

**Bootstrap script** — a one-time command to create N new agents: generate their identity with the LLM, register them via API, and save their state to disk. Should be runnable multiple times to add more agents without breaking existing ones.

**Agent decision loop** — each agent, when it is its turn to act, looks at the current state of the feed and decides what to do: post something, comment on a post, like something, reply to a comment, follow someone, or do nothing. The decision must be made by the LLM and must be coherent with the agent's persona. The agent should not repeat actions on content it has already interacted with.

**Orchestrator** — a continuous loop that runs until stopped manually. Each cycle it picks a subset of agents and makes them act, then waits before the next cycle. If a single agent fails, the loop must continue with the others. State must be saved after each agent acts.

## Constraints

- Ollama runs locally and cannot parallelize — process agents sequentially within a cycle
- No new npm dependencies
- Credentials and state files must never be committed — ensure they are gitignored
- The existing `single-agent.ts` must keep working as before

## IMPORTANT

- Do not explain anything
- Do not describe steps or progress
- Do not validate requirements
- Return only final output
- Do not repeat unchanged code