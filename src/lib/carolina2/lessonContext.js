import { PER_LESSON_CAP, TOTAL_CONTEXT_CAP } from "./messages.js";

// Pure: turn selected lessons into the markdown context string injected into
// Carolina's brain prompt. Caps bound latency/token cost. `lessons` is an
// array of { title, markdown_content }.
export function buildLessonContext(lessons, opts = {}) {
  const perLessonCap = opts.perLessonCap ?? PER_LESSON_CAP;
  const totalCap = opts.totalCap ?? TOTAL_CONTEXT_CAP;
  if (!Array.isArray(lessons) || lessons.length === 0) return "";

  const parts = [];
  let total = 0;
  for (const l of lessons) {
    const body = (l?.markdown_content || "").trim();
    if (!body) continue;
    let chunk = body;
    if (chunk.length > perLessonCap) {
      chunk = chunk.slice(0, perLessonCap) + " …[truncated]";
    }
    const section = `# ${l.title || "Lesson"}\n${chunk}`;
    if (total + section.length > totalCap) break;
    parts.push(section);
    total += section.length;
  }
  return parts.join("\n\n");
}
