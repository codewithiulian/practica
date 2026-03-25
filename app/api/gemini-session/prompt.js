import { loadPrompt } from "../../../lib/ai/prompts/load-prompt.js";

export function buildSystemInstruction(unitContext) {
  const base = loadPrompt("carolina/carolina-voice/gemini-voice-base");
  if (unitContext) {
    return `${base}\n\n${loadPrompt("carolina/carolina-voice/gemini-voice-unit-context", { unitContext })}`;
  }
  return `${base}\n\n${loadPrompt("carolina/carolina-voice/gemini-voice-general-mode")}`;
}
