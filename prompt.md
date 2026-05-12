# Google OAuth Implementation

## Context
MarketHub — Angular 17 + Node/Express + MongoDB + JWT (access token in memory, refresh token httpOnly cookie). Auth already implemented.

## Task
Add Google OAuth as an additional login method without replacing the existing auth flow.

## Constraints
- Backend: `passport` + `passport-google-oauth20`, endpoints `/api/v1/auth/google` and `/api/v1/auth/google/callback`, integrate with existing JWT logic
- User model: add optional `googleId` field, handle email collision between regular and Google accounts
- Frontend: add "Continue with Google" button to existing login and register components
- Env vars: add `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` to `.env.example`
- Callback flow must redirect to frontend with access token

## Output format
Only new or modified files.

## IMPORTANT
- Do not explain anything
- Do not describe steps or progress
- Do not validate requirements
- Return only final output
- Do not repeat unchanged code