# Assistant Hotlink — PostReddit Detail

## Context

MarketHub — Angular 17 standalone components. The Warren chat popup (`AssistantPopupService` + floating component) already exists. The PostReddit detail component is at `frontend/src/app/features/community` — analyse the routing and component structure to locate the correct file before implementing.

## Task

Add a Warren hotlink button to the PostReddit detail page. Reuse the existing popup infrastructure.

## Constraints

- Analyse the existing PostReddit detail component to understand the post data structure before implementing
- Add an "Ask Warren" button in the post detail view
- On click: open the popup and automatically send the pre-built message: `"Explain to me the point this user is giving"`
- Attached card: show only a truncated version of the post title (not the full content). Display it above the input area styled like a file attachment chip (same pattern as the other hotlinks), NOT inside the input field
- Pass the full post content as hidden context in the API request so Warren has full reference
- Warren must understand from the system context that the attached content is a user post from a discussion topic

## Output format

Only new or modified files.

## IMPORTANT

- Do not explain anything
- Do not describe steps or progress
- Do not validate requirements
- Return only final output
- Do not repeat unchanged code
