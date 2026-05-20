// WS contract constants shared by the Carolina2 hook. Kept local to carolina2
// — not imported by, and does not import, any existing Pinata code.
export const STT_PATH = "/api/stt";

// Mirror of the sidecar caps (carolina2-voice/types.ts). Client caps first so
// we never ship oversized payloads; the sidecar re-caps defensively.
export const PER_LESSON_CAP = 4000;
export const TOTAL_CONTEXT_CAP = 16000;
