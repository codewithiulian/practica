import { useCallback, useEffect, useRef, useState } from "react";
import { updateAttemptEssay } from "../api.js";
import { enqueue } from "../syncQueue.js";
import { countWords } from "./word-count.js";

const DEBOUNCE_MS = 3000;

// Status: idle | saving | saved | error | offline
// - idle: nothing to save (initial mount, value matches what's persisted)
// - saving: a network call is in flight
// - saved: last attempt succeeded; stays until the next change
// - error: HTTP 4xx/5xx from the server (user can hit retry)
// - offline: network threw → we queued the write to sync later
//
// The hook fires saves on three triggers: 3s after the last keystroke,
// on textarea blur (via `flushNow`), and on tab-hide / unmount (with
// `keepalive: true` so the request survives navigation/page-close).
export function useEssayAutosave({ attemptId, value, initialValue }) {
  const [status, setStatus] = useState("idle");
  const [lastSavedAt, setLastSavedAt] = useState(null);

  const lastSavedValueRef = useRef(initialValue ?? "");
  const valueRef = useRef(value);
  const debounceRef = useRef(null);
  const inFlightRef = useRef(false);

  useEffect(() => { valueRef.current = value; }, [value]);

  const queueOffline = useCallback((essayText) => {
    enqueue({
      table: "attempts",
      method: "update",
      payload: {
        data: { essay: essayText, word_count: countWords(essayText) },
        match: { id: attemptId },
      },
    });
    lastSavedValueRef.current = essayText;
    setStatus("offline");
  }, [attemptId]);

  // Core save. Skips if the value hasn't changed since the last successful save
  // and there's no in-flight request. `keepalive` is used by the unmount path.
  const save = useCallback(async (essayText, { keepalive = false } = {}) => {
    if (!attemptId) return;
    if (essayText === lastSavedValueRef.current) return;
    if (inFlightRef.current && !keepalive) return;

    inFlightRef.current = true;
    if (!keepalive) setStatus("saving");

    try {
      await updateAttemptEssay(attemptId, essayText, { keepalive });
      lastSavedValueRef.current = essayText;
      setStatus("saved");
      setLastSavedAt(Date.now());
    } catch (err) {
      const offlineLike =
        typeof navigator !== "undefined" && !navigator.onLine ||
        /Failed to fetch|NetworkError|Load failed/i.test(err?.message || "");
      if (offlineLike) {
        queueOffline(essayText);
      } else {
        setStatus("error");
      }
    } finally {
      inFlightRef.current = false;
    }
  }, [attemptId, queueOffline]);

  // Debounced save scheduler — re-arms on every keystroke.
  useEffect(() => {
    if (!attemptId) return;
    if (value === lastSavedValueRef.current) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      save(valueRef.current);
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [attemptId, value, save]);

  // Tab hidden → flush with keepalive so it lands even on close.
  useEffect(() => {
    if (!attemptId) return;
    const onVis = () => {
      if (document.visibilityState !== "hidden") return;
      if (valueRef.current === lastSavedValueRef.current) return;
      save(valueRef.current, { keepalive: true });
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [attemptId, save]);

  // Unmount → flush with keepalive (navigation away from the page).
  useEffect(() => {
    return () => {
      if (!attemptId) return;
      if (valueRef.current === lastSavedValueRef.current) return;
      // Fire-and-forget — don't await on unmount.
      save(valueRef.current, { keepalive: true });
    };
  }, [attemptId, save]);

  // External callers: textarea blur + manual retry.
  const flushNow = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    save(valueRef.current);
  }, [save]);

  const retry = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    save(valueRef.current);
  }, [save]);

  return { status, lastSavedAt, flushNow, retry };
}
