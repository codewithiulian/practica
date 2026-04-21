// Single source of truth for the word-count rule.
// Imported by both client (live count + autosave hook) and the API route
// (server-side recompute), so the editor and the persisted value never drift.
export function countWords(text) {
  if (!text) return 0;
  const trimmed = String(text).trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}
