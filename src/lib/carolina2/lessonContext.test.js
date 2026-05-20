import { test } from "node:test";
import assert from "node:assert/strict";
import { buildLessonContext } from "./lessonContext.js";

test("empty selection → empty string", () => {
  assert.equal(buildLessonContext([]), "");
});

test("joins lessons with titled headers", () => {
  const out = buildLessonContext([
    { title: "Preterito", markdown_content: "hola" },
    { title: "Futuro", markdown_content: "adios" },
  ]);
  assert.ok(out.includes("# Preterito"));
  assert.ok(out.includes("hola"));
  assert.ok(out.includes("# Futuro"));
  assert.ok(out.includes("adios"));
});

test("per-lesson cap truncates a single huge lesson", () => {
  const out = buildLessonContext(
    [{ title: "Big", markdown_content: "x".repeat(9999) }],
    { perLessonCap: 100, totalCap: 100000 },
  );
  assert.ok(out.length < 400);
  assert.ok(out.includes("[truncated]"));
});

test("total cap stops adding further lessons", () => {
  const lessons = Array.from({ length: 50 }, (_, i) => ({
    title: `L${i}`,
    markdown_content: "y".repeat(1000),
  }));
  const out = buildLessonContext(lessons, {
    perLessonCap: 1000,
    totalCap: 3000,
  });
  assert.ok(out.length <= 3200);
});

test("skips lessons with no content but keeps others", () => {
  const out = buildLessonContext([
    { title: "Empty", markdown_content: "" },
    { title: "Good", markdown_content: "contenido" },
  ]);
  assert.ok(!out.includes("# Empty"));
  assert.ok(out.includes("# Good"));
});
