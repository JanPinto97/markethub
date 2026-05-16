# Assistant — Frontend/Backend Connection

## Context
MarketHub — Angular 17 standalone components. Backend endpoint `POST /api/v1/assistant/chat` already exists with SSE streaming. Existing `AssistantComponent` at `/assistant` has static UI.

## Task
Connect the assistant frontend to the backend endpoint. The chat must be functional with real responses.

## Constraints
- Use existing `ApiService` for HTTP calls
- Handle SSE streaming to render text progressively as it arrives
- Manage loading, error, and empty states in the UI
- Send the full conversation history on each request

## Output format
Only new or modified files.

## IMPORTANT
- Do not explain anything
- Do not describe steps or progress
- Do not validate requirements
- Return only final output
- Do not repeat unchanged code