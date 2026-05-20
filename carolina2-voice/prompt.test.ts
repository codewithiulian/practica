import { test } from "node:test";
import assert from "node:assert/strict";
import { buildBrainSystem, BASE_PROMPT, CONTINUITY_HINT } from "./prompt.ts";

test("no lesson context, reflex on → base + continuity hint", () => {
  const out = buildBrainSystem("", true);
  assert.ok(out.startsWith(BASE_PROMPT));
  assert.ok(out.includes(CONTINUITY_HINT.trim()));
  assert.ok(!out.includes("Lesson context"));
});

test("no lesson context, reflex off → base only", () => {
  const out = buildBrainSystem("", false);
  assert.equal(out, BASE_PROMPT);
});

test("lesson context is injected before the continuity hint", () => {
  const out = buildBrainSystem("EL PRETERITO", true);
  assert.ok(out.includes("Lesson context"));
  assert.ok(out.includes("EL PRETERITO"));
  assert.ok(out.indexOf("EL PRETERITO") < out.indexOf(CONTINUITY_HINT.trim()));
});

test("lesson context truncated to TOTAL_CONTEXT_CAP", () => {
  const huge = "a".repeat(50000);
  const out = buildBrainSystem(huge, false);
  assert.ok(out.length < 20000);
  assert.ok(out.includes("[context truncated]"));
});
