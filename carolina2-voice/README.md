# carolina2-voice

Standalone real-time voice engine for Piñata's **Carolina2** tab. Separate
process — Piñata (`next start`) cannot host a raw WebSocket. Ported from
pinata-talk; isolated from Piñata's old Carolina/Dialog.

## Run (dev)

1. `cd carolina2-voice && npm install`
2. `cp .env.example .env` and fill keys (Deepgram, Anthropic, ElevenLabs voice,
   Supabase URL + anon key for token verification).
3. `npm run dev`  → `http://localhost:3100`, WS at `/api/stt`.
4. In Piñata set `NEXT_PUBLIC_CAROLINA2_WS_URL=ws://localhost:3100/api/stt`
   and run Piñata (`npm run dev`).

## Verify

- `curl http://localhost:3100/health` → `carolina2-voice ok`
- `npm test` → prompt-builder unit tests pass.
- Connect from Carolina2 with no/garbage token → socket receives
  `{type:"error",message:"unauthorized"}` then closes.

## Production

Deploy this folder as its own Node service where WebSockets are allowed. Set
`CAROLINA2_ALLOWED_ORIGIN` to the Piñata origin and point
`NEXT_PUBLIC_CAROLINA2_WS_URL` at this service (`wss://…/api/stt`).

## Isolation

Imports nothing from Piñata; Piñata imports nothing from here. Reuses only the
shared Supabase project for `auth.getUser(token)`. Remove the tab by deleting
this folder + the Piñata client files listed in the plan.
