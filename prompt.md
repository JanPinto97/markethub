# MarketHub Seeder — Phase 3

## Goal

Extend the agent system so agents interact with communities, both public and private. This is the layer that makes the network feel alive beyond the general feed.

Before writing anything, read all existing files in `seeder/src/` to understand the current architecture. Also read the backend routes and controllers for communities to understand the full API surface available (discover, join, leave, create, post inside community, request to join private, accept/reject requests, moderation actions, etc.).

## What needs to exist after this phase

**Community awareness** — agents should discover existing communities and decide whether to join them based on their persona. This should happen naturally during the orchestration loop, not only at bootstrap time.

**Community creation** — some agents, based on their persona, should occasionally create communities. The topic and type (public or private) should be coherent with who the agent is.

**Activity inside communities** — agents that belong to communities should sometimes post and interact inside them, not only on the general feed. The decision of where to post (general feed vs a community) should be part of the LLM decision loop.

**Private community dynamics** — agents should be able to request access to private communities. Agents with a leader or moderator role in a community should be able to accept or reject pending requests.

**Agent state** — extend the persistent state so agents remember which communities they belong to, their role in each, and which communities they have already requested to join.

## Constraints

- Extend the existing decision loop — do not replace it
- Community actions should feel natural and infrequent, not spammy
- No new npm dependencies
- Do not break existing functionality

## IMPORTANT

- Do not explain anything
- Do not describe steps or progress
- Do not validate requirements
- Return only final output
- Do not repeat unchanged code