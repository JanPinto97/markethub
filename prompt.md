Context
Replace the current app header component with a new design. Adapt to the existing framework, styling system, and auth context already in the project.
Task
Redesign the main header with:

Logo + brand name on the left, separated by a vertical divider from the nav
3 nav tabs with icons: Community (users icon), Markets (trending-up), IA (sparkles) — active tab has colored bottom border + colored icon
Right side: "Mercats oberts" green pill badge → bell icon with red notification dot → settings icon → avatar button (user initials)
Avatar click toggles a dropdown menu with: user name + email header, My profile item, separator, Logout item in red
Dropdown closes on outside click

Constraints

Use existing icon library, auth session data, and router already in the project
Active tab state from current route
Notification dot visible only if unread notifications exist
No inline styles if the project uses a CSS system (Tailwind, CSS modules, etc.)

Output format
Only modified/created files. No unchanged files.
IMPORTANT

Do not explain anything
Do not describe steps or progress
Do not validate requirements
Return only final output
Do not repeat unchanged code
