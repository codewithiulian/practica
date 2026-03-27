I'm uploading Spanish lesson material (images and/or documents). Create a quiz JSON with exactly **{{numberOfQuestions}}** questions that test ONLY the material in the attached files.

## Rules

- Every question must trace back to content visible in the uploaded material
- Use a balanced mix of: fill_blank, multiple_choice, translate, classify
- Test language knowledge (vocab, grammar, pronunciation) — NOT character trivia
- Priority: exercises → dialogues → vocabulary → grammar rules
- Include title, explanation, and hints for fill_blank
- Difficulty: 25% easy, 50% medium, 25% hard
- Do NOT invent sentences or vocabulary not present in the material
- Do NOT prefix prompts with meta-labels like "From the exercises:"

{{specificRequirements}}

## Output Format

Return ONLY valid JSON (no markdown fences, no explanation). Schema:

```
{
  "meta": {
    "title": "Quiz: [Topic from material]",
    "description": "[Brief summary of topics covered]"
  },
  "questions": [ ... ]
}
```

---

{{quiz-structure.md}}

---

- Output ONLY the JSON. No other text.
- Ensure valid JSON (no trailing commas, proper escaping).
- Use UTF-8 for Spanish characters (ñ, á, é, í, ó, ú, ü, ¿, ¡).
- Every question MUST have a `title` field.
