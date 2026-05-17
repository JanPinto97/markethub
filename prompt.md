# Assistant Hotlink — Economic Release Popup

## Context
MarketHub — Angular 17 standalone components. `/assistant` page has a working chat UI (no sidebar, no history) connected to `POST /api/v1/assistant/chat` with SSE streaming. The economic calendar component is at `frontend/src/app/features/markets/economic-calendar`.

## Task
Add a Warren hotlink to each economic release/event detail, opening a floating chat popup at the bottom-right of the screen.

## Constraints

### Shared chat component
- Extract the chat UI logic from `AssistantComponent` into a new reusable standalone component (e.g. `ChatCoreComponent`)
- Both `/assistant` and the popup must use this shared component
- The shared component accepts an optional `initialMessage` and `attachedContext` as inputs

### Popup
- Floating panel, bottom-right corner, fixed position, does not navigate away from the page
- Opens when the user clicks the Warren button inside the release detail (the expandable detail section of a calendar event)
- Has a close button
- Same chat UI as `/assistant`: messages area + input bar + SSE streaming
- Popup state (open/closed) managed via a singleton `AssistantPopupService`

### Hotlink button
- Located inside the expanded detail view of each economic release/event
- Icon or small button labeled "Ask Warren" or similar
- On click: opens the popup and sends a pre-built first message automatically

### Pre-built message and context
On open, the popup receives:
- **Visible attached card** (shown above the input, not inside it) with: event name, currency, previous value, expected value, date. Style it like a file attachment chip (similar to how Claude shows attached files)
- **Pre-filled user message** (sent automatically, not typed): `"What is [event name] and what can we expect from this upcoming release?"`
- The full release data object is sent as additional context in the API request (not shown to the user), so Warren has all details to answer accurately

## Output format
Only new or modified files.

## IMPORTANT
- Do not explain anything
- Do not describe steps or progress
- Do not validate requirements
- Return only final output
- Do not repeat unchanged code