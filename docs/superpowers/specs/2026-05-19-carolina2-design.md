# Carolina2 — Voice Tutor Migration Design

**Date:** 2026-05-19
**Status:** Approved design, pre-implementation
**Source workflow:** `D:\Projects\pinata-talk` (custom WS voice pipeline)
**Target:** `D:\Projects\Piñata` (Next.js 16 + React Router SPA)

## 1. Goal

Add a new authenticated menu tab **Carolina2** to Piñata. The user clicks it,
multi-selects lessons and/or weeks, starts a real-time voice call backed by the
exact pinata-talk workflow (Deepgram STT → Haiku reflex + Opus brain → ElevenLabs
TTS, press-to-interrupt), talks, hangs up. No persistence.

The existing Carolina text chat and Dialog voice call are **left completely
untouched** — no imports, no shared code, no shared DB rows. Old paths will be
removed later in a separate effort; out of scope here.

## 2. Constraints & Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| D1 | Voice engine runs as a **separate Node process** (sidecar), not inside Next.js | Piñata runs as plain `next start`; it cannot host a raw WebSocket. Adding a custom server would change dev/build/deploy + PWA service-worker path for the whole app. |
| D2 | Sidecar code **lives inside the Piñata repo** in its own top-level folder (`carolina2-voice/`) | "Inside the pinata project" per user. Separate process, same repo. |
| D3 | Sidecar is a **trimmed copy** of pinata-talk's backend, not an import of that repo | Full isolation; pinata-talk repo is not a dependency. |
| D4 | Lesson/week content **injected into the Opus brain system prompt** as context | Simple, grounds answers in selected material. Per-lesson + total char cap to bound latency/tokens. |
| D5 | **No persistence** — no Supabase writes, `chat_sessions`/`chat_messages` never touched | Ephemeral calls only. |
| D6 | Reuse only: Piñata Supabase session + read-only `/api/carolina/resources` | Minimal coupling. `/api/carolina/resources` is read-only and shared, not modified. |
| D7 | Auth = two gates: React Router route guard **and** sidecar Supabase JWT verification on WS handshake | Engine port is not an open endpoint even though it is a separate process. |
| D8 | Old Carolina/Dialog code, APIs, prompts, DB: **zero edits** | Explicit user constraint. |

## 3. Architecture

### Part A — Voice engine sidecar (`carolina2-voice/`, separate process)

A trimmed copy of pinata-talk's `server.ts`:

- **Drop** the Next.js wrapping (`next({dev})`, `app.prepare()`, request/upgrade
  forwarding). pinata-talk's server.ts currently also serves its own `page.tsx`;
  the sidecar serves **only** the WebSocket.
- **Keep** unchanged: the `/api/stt` WebSocket, per-turn Deepgram (`nova-3`, `es`),
  parallel Haiku reflex + Opus brain under one `AbortController`, dual ElevenLabs
  streaming WS, server-side reflex→brain audio gate, metrics, press-to-interrupt
  cancel path.
- **Add** on the `{type:"start"}` handshake:
  - `token` (Supabase access token) → verify via Supabase `auth.getUser(token)`.
    Reject the WS with a clear error if invalid/expired. Sidecar holds
    `SUPABASE_URL` + `SUPABASE_ANON_KEY` in its own `.env`.
  - `lessonContext` (string) → appended to `CAROLINA_PROMPT` for the Opus brain
    only (reflex Haiku unchanged, still no history). Empty string allowed
    (call with no lessons selected).
- **CORS / origin**: accept WS only from the configured Piñata origin
  (`CAROLINA2_ALLOWED_ORIGIN` env).
- Files: `carolina2-voice/server.ts`, `carolina2-voice/types.ts`,
  `carolina2-voice/package.json`, `carolina2-voice/.env.example`,
  `carolina2-voice/README.md`. Own `node_modules`, own scripts
  (`dev` = `tsx watch server.ts`, `start` = `tsx server.ts`).

### Part B — Piñata integration (additive only)

New files:
- `src/screens/Carolina2Screen.jsx` — ported from pinata-talk `page.tsx`
  (TS→JSX, React Router not Next). Two states:
  1. **Setup**: lesson/week multi-select via the existing `ResourcePicker`
     component + a "Start call" button.
  2. **In call**: hold-to-talk button, status, transcript, latency HUD —
     visual logic ported from `page.tsx`.
  Styled with Piñata conventions (`C` theme object / Tailwind, `desktop-main`
  layout wrapper) — not pinata-talk's raw CSS.
- `src/lib/carolina2/voiceClient.js` — the transport/audio machinery extracted
  from `page.tsx`: WebSocket lifecycle + reconnect, `getUserMedia` +
  `MediaRecorder` chunking, gapless `AudioContext` playback queue
  (promise-chain decode, `nextStartRef` scheduling), interrupt
  (suspend/resume + abort). Framework-agnostic module the screen consumes via a
  thin hook or direct calls.
- `src/lib/carolina2/types.js` (or `.ts`) — the WS message contract mirrored
  from pinata-talk `src/lib/types.ts` (`STT_PATH`, client/server message
  shapes). Kept local to carolina2, not shared with anything.

Edits to existing Piñata files (additive lines only, no behavior change to
existing items):
- `src/components/DesktopSidebar.jsx` — add one Carolina2 entry (its own
  button in/near the CAROLINA section, **not** altering the existing
  "Carolina Chat" / "Call Carolina" entries).
- `src/components/MobileNavBar.jsx` — add one Carolina2 item.
- `src/App.jsx` — add `<Route path="/carolina2" element={session ?
  <Carolina2Screen session={session} /> : <Navigate to="/login" replace />} />`.

Env:
- Piñata: `NEXT_PUBLIC_CAROLINA2_WS_URL` (e.g. `ws://localhost:3100/api/stt`
  in dev).

## 4. Data Flow

1. Authenticated user clicks **Carolina2**. Route guard: no `session` →
   redirect `/login`.
2. Screen fetches weeks+lessons from existing authenticated
   `GET /api/carolina/resources` (returns weeks with nested lessons). Renders
   `ResourcePicker` for multi-select of lessons and/or whole weeks.
3. User selects, clicks **Start call**.
4. Screen builds `lessonContext`: concatenate selected lessons'
   `markdown_content` (whole-week selection = all its lessons). Apply caps:
   per-lesson cap (e.g. 4000 chars) and total cap (e.g. 16000 chars), truncating
   with a marker. Caps are tunable constants.
5. Screen opens WS to `NEXT_PUBLIC_CAROLINA2_WS_URL`, sends
   `{ type:"start", mimeType, lessonContext, token }`
   (`token` = `supabase.auth.getSession()` access token).
6. Sidecar verifies token → injects `lessonContext` into Opus system prompt →
   runs the exact pinata-talk turn loop. Audio streams back, gapless playback,
   press-to-interrupt works as today.
7. User hangs up (end-call button) → WS closed, mic released, AudioContext
   torn down. Nothing written anywhere.

## 5. Auth

- **Gate 1 (UI):** React Router guard on `/carolina2` — identical pattern to
  existing protected routes. Tab/screen unreachable when logged out.
- **Gate 2 (engine):** Sidecar calls Supabase `auth.getUser(token)` on the WS
  handshake; invalid/expired/missing → WS rejected with
  `{type:"error", message:"unauthorized"}` then close. Prevents the separate
  port from being an open relay.

No new auth system, no new tables, no new tokens minted.

## 6. Isolation Guarantees

- Piñata `next.config`, build, `start`, PWA/Workbox: **unchanged**.
- `CarolinaScreen`, `DialogScreen`, `app/api/carolina/*` (except read-only
  reuse of `resources`), `chat_sessions`, `chat_messages`, Carolina prompts:
  **unchanged**.
- No shared voice/prompt/transport code between Carolina2 and old
  Carolina/Dialog.
- Teardown to remove Carolina2 later = delete `carolina2-voice/`,
  `src/screens/Carolina2Screen.jsx`, `src/lib/carolina2/`, and the 3 added nav
  lines. No migration needed.

## 7. Error Handling

- Sidecar unreachable / WS connect fails → inline error in Carolina2 screen,
  retry button; rest of Piñata unaffected.
- Token invalid/expired → handshake rejected, screen prompts re-login.
- Missing Deepgram/Anthropic/ElevenLabs keys on sidecar → existing pinata-talk
  error surfacing reused (clear message, STT-only degradation where it already
  degrades).
- Lesson fetch fails → screen still allows a call with empty `lessonContext`
  (general conversation), with a non-blocking notice.
- `DISABLE_REFLEX` / reflex failure: graceful-degradation behavior carried over
  unchanged from pinata-talk.

## 8. Testing

- **Sidecar standalone:** existing pinata-talk README smoke flow against the
  trimmed server; plus a token-rejection test (bad/missing token → WS refused)
  and a lessonContext-injection check (selected text appears in Opus system
  prompt).
- **Piñata side:** route-guard test (logged-out → `/login`); lesson fetch +
  multi-select selection state; WS client connect/teardown against a stub
  socket; interrupt path (suspend/resume) unit-checked in `voiceClient.js`.
- **Manual integration:** run sidecar (`npm run dev` in `carolina2-voice/`) +
  Piñata; full call with 1 lesson, multiple lessons, a whole week, and zero
  selection; press-to-interrupt mid-response; expired-token rejection.

## 9. Operational Notes

- Production requires **two processes**: Piñata (as today) + the
  `carolina2-voice` sidecar hosted where WebSockets are allowed. This is the
  deliberate cost of not adding a custom server to Piñata.
- Dev: terminal 1 `npm run dev` (Piñata), terminal 2 `npm run dev` in
  `carolina2-voice/`. Document in `carolina2-voice/README.md`.
- Secrets: sidecar `.env` holds Deepgram/Anthropic/ElevenLabs + Supabase
  URL/anon key. Not committed.

## 10. Out of Scope

- Removing/rewiring old Carolina/Dialog (future effort).
- Persistence of Carolina2 transcripts/sessions.
- RAG/embeddings for lesson context (plain prompt injection only).
- Changing Piñata's server/build/PWA model.
