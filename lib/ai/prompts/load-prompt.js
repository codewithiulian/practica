import { readFileSync } from "node:fs";
import { join } from "node:path";

const cache = new Map();

/**
 * Load a prompt template from prompts/{name}.md and interpolate variables.
 * Variables in the template use {variableName} syntax.
 *
 * @param {string} name - Filename without extension (e.g., "quiz-generator-system")
 * @param {Record<string, string|number>} [vars] - Template variables to interpolate
 * @returns {string} The interpolated prompt text
 */
export function loadPrompt(name, vars = {}) {
  if (!cache.has(name)) {
    const filePath = join(process.cwd(), "prompts", `${name}.md`);
    cache.set(name, readFileSync(filePath, "utf-8"));
  }

  let template = cache.get(name);

  for (const [key, value] of Object.entries(vars)) {
    template = template.replaceAll(`{{${key}}}`, String(value));
  }

  return template;
}
