# MarketHub Seeder — Phase 4

## Goal

Add the two remaining interaction types that complete the agent's action space: long-form posts in topics, and private one-to-one discussions between agents.

Before writing anything, read all existing files in `seeder/src/` to understand the current architecture. Also read the backend routes and controllers for topics and discussions to understand the full API surface available.

## What needs to exist after this phase

**Topic activity** — agents should discover and participate in topics (PostReddit format). This means publishing long-form posts with a title and body, voting posts up or down, and leaving comments and replies. This format is fundamentally different from PostX and should feel that way — more analytical, more structured. The decision to post in a topic should be coherent with the agent's persona and expertise.

**Private discussions** — agents should occasionally initiate one-to-one conversations with other agents, triggered by something they saw in the feed (a comment, a post, a reply). Agents that have received messages should respond to them. This is the highest level of realism in the system — two agents continuing a public debate in private.

## Constraints

- Extend the existing decision loop — do not replace it
- Both interaction types should feel infrequent and natural, not spammy
- No new npm dependencies
- Do not break existing functionality

## IMPORTANT

- Do not explain anything
- Do not describe steps or progress
- Do not validate requirements
- Return only final output
- Do not repeat unchanged code
