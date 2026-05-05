# Fix: Sticky Navbar Bottom Container

### Context

Sidebar navbar with scroll and a sticky container at the bottom holding a button ("Create Community"). The container does not extend to the bottom of the viewport, leaving navbar content visible behind it.

### Task

Fix the sticky button container so that:

1. It is pushed further down, anchored to the bottom of the navbar
2. Its background extends all the way to the bottom of the viewport/parent container, covering the content behind it

### Constraints

- Container must have `position: sticky` and `bottom: 0`
- Add enough `padding-bottom` to fill the bottom gap (include safe area inset if applicable)
- Container `background` must match the navbar background to fully cover content behind it
- Do not modify scroll logic or navbar behavior
- Only change CSS/styles of the button container and its wrapper

### Output format

Only changed files (only the diff/modified lines, no full file reprint unless <50 lines)

### IMPORTANT

- Do not explain anything
- Do not describe steps or progress
- Do not validate requirements
- Return only final output (code or requested artifacts)
- Do not repeat unchanged code
