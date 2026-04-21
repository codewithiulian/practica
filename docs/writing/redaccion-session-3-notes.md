# Redacción · Session 3 — Implementation notes

Built the real writing experience: desktop 40/60 split, mobile *Tarea*/*Escribir* segmented control with swipe, debounced autosave, live word count. Replaces the throwaway placeholder from S1/S2. No corrections (Session 4).

## Files

**New:**
- `src/lib/redaccion/word-count.js` — `countWords()`. Imported by client components AND the server PATCH route so client live count and persisted value can't drift.
- `src/lib/redaccion/use-essay-autosave.js` — hook. 3s debounce + blur (`flushNow`) + `visibilitychange:hidden` + unmount, all with `keepalive: true` on the unload paths. Online fail → `syncQueue.enqueue` → status `offline`. HTTP error → status `error` with `retry`.
- `app/api/attempts/[id]/route.js` — `PATCH`, recomputes `word_count` server-side, RLS via Bearer.
- `app/api/assignments/[id]/draft-attempt/route.js` — `POST`, idempotent: returns latest open draft, creates v1 if none.
- `src/components/redaccion/{BriefView,EssayEditor,WordCount,SaveIndicator,AssignmentEditorDesktop,AssignmentEditorMobile}.jsx` — visual layer.

**Edited:**
- `src/screens/RedaccionAssignmentRoute.jsx` — full rewrite. Fetches assignment + bootstraps draft attempt in parallel, picks Desktop/Mobile shell on `window.innerWidth >= 1024` (with resize listener).
- `src/lib/api.js` — `fetchOrCreateDraftAttempt`, `updateAttemptEssay({ keepalive })`.
- `src/App.jsx` — added `/^\/lesson\/[^/]+\/redaccion\/[^/]+$/` to `hideNavBar` predicate.

## Non-obvious decisions / gotchas

- **Spec-vs-mock conflict:** spec puts *Regenerar tema* in the sticky footer; mock 04 puts it in the right-column header. Followed mock — also placed it on the *Tarea* view on mobile (no editor footer there to host it). Mock's *Cancelar* button next to *Corregir* was treated as a mock artifact and omitted (autosave makes it meaningless).
- **Confirm-on-regenerate-with-content** lives here, not in S2. S2 notes were explicit: deferred until attempts existed. Implemented as a shadcn `Dialog` in both shells.
- **Save path = online + queue.** `updateAttemptEssay` throws on net errors; the hook detects offline-likely (`!navigator.onLine` or `Failed to fetch`-class messages) and enqueues to `syncQueue` instead of flipping to `error`. App.jsx already auto-flushes the queue on `online` and visibility change.
- **`countWords` is shared client/server**, imported by the API route via deep relative path `../../../../src/lib/redaccion/word-count.js`. No issue with bundling — it's a pure JS file with no client-only deps.
- **Word count states (4, not 3).** Spec mentions 3 (under/in/over). Mock 10 shows 4 (added "Muy por encima" red state at >2× max). Implemented all 4 to match the visual source of truth.
- **Desktop shell positioning.** `DesktopSidebar` is `position: fixed; left: 0; width: 220px`. Editor uses `fixed inset-0 lg:left-[220px] z-30` so it sits cleanly to the right of the sidebar without relying on `.desktop-main` classes.
- **Mobile fullscreen.** Shell is `fixed inset-0 z-30`. Bottom nav is hidden via the `hideNavBar` predicate, matching `/quiz/`, `/conjugar/drill`, `/carolina`, `/dialog`. No tab-bar overlap.
- **State persistence on tab switch (mobile).** Parent owns `essay`, `cursorOffset`, `scrollTop`, `briefScrollTop`. EssayEditor restores cursor + scroll on mount. Switching `view` unmounts the inactive subtree but state survives in the parent.
- **Tooltip wraps a `<span tabIndex={0}>`** around the disabled *Corregir* button — Radix tooltip won't trigger on a `disabled` button directly.
- **Color tokens.** Per S1 + S2 notes, `tailwind.config.js` overrides `amber` to only `amber/amber-light/amber-dark` and has no teal/redac/ink scales. Used raw hex (`#F59E0B`, `#B45309`, `#FAFAF7`, `#10B981`, `#EF4444`, etc.) and arbitrary Tailwind values for everything in the mocks.

## Verification

`npm run build` passes. Both new API routes appear in the dynamic route table. End-to-end browser test left to user per the chat wrap-up.

## Out of scope (Session 4)

Corrections pipeline, *Corregir* enabled state, segments rendering, score bars, attempts stepper UI (slot is empty), v2 flow, *Escribir versión 2* button.
