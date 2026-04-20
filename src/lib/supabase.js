import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Reads the auth session directly from localStorage, bypassing Supabase's
// refresh-token logic. Use this when we need the session quickly — e.g. offline,
// where supabase.auth.getSession() blocks for up to 30s retrying the refresh
// endpoint (AUTO_REFRESH_TICK_DURATION_MS) when the access token is within its
// 90s expiry margin. Supabase writes the session to this key on sign-in and
// after every auto-refresh, so the cached value stays current while online.
export function getCachedSession() {
  try {
    if (typeof localStorage === "undefined") return null;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!url) return null;
    const projectRef = new URL(url).hostname.split(".")[0];
    const raw = localStorage.getItem(`sb-${projectRef}-auth-token`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && parsed.access_token && parsed.refresh_token ? parsed : null;
  } catch {
    return null;
  }
}

// Every PostgREST query (supabase.from(...).select|insert|update|delete) runs
// through a fetch wrapper that awaits supabase._getAccessToken() → auth.getSession().
// Offline, that call can block up to 30s retrying the refresh endpoint and
// serializing behind the auto-refresh lock — which is what caused multi-minute
// load times for quiz details, conjugar, history, and results pages in flight mode.
//
// Supabase's _getAccessToken has a built-in short-circuit: if the client instance
// has an `accessToken` property set to a function, that function is awaited
// instead of auth.getSession(). Point it at the cached session so queries read
// the current access_token synchronously from localStorage without touching the
// refresh machinery. Fall back to the anon key when signed out, matching
// Supabase's own fallback behavior for unauthenticated queries.
supabase.accessToken = async () =>
  getCachedSession()?.access_token ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  null;
