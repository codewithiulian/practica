I'm uploading a Spanish lesson PDF from my language course. Please analyze ALL the content — dialogues, vocabulary, grammar rules, exercises, and answer keys — and generate a quiz JSON file with exactly 15 questions that test the key concepts from this lesson.

## Output Format

Return ONLY a valid JSON file (no markdown code fences, no explanation before/after). The JSON must follow this exact schema:

```
{
  "meta": {
    "title": "Lección X: [Title from PDF]",
    "description": "[Brief summary of topics covered]",
    "unit": [number],
    "lesson": [number]
  },
  "questions": [ ... ]
}
```

## Question Types (use a balanced mix of all 4)

### 1. fill_blank

Fill in the blank — use `___` in the prompt where blanks go. Each blank needs accepted answers.

```
{
  "type": "fill_blank",
  "prompt": "___ colombiana, de Bogotá. ___ médica clínica.",
  "blanks": ["Soy", "Soy"],
  "accept": [["soy"], ["soy"]],
  "hint": "optional hint text",
  "explanation": "Why this is the answer"
}
```

- `blanks`: the primary correct answer for each blank (displayed in review)
- `accept`: array of arrays — each inner array lists all accepted spellings/variants for that blank
- Accept entries should be LOWERCASE (matching is case-insensitive and accent-insensitive)

### 2. multiple_choice

```
{
  "type": "multiple_choice",
  "prompt": "The question text",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "answer": 1,
  "explanation": "Why this is the answer"
}
```

- `answer`: zero-indexed integer (0 = first option, 1 = second, etc.)
- Always provide 4 options
- Make distractors plausible, not obviously wrong

### 3. translate

```
{
  "type": "translate",
  "prompt": "Translate to Spanish: 'What do you do for work?'",
  "direction": "English → Spanish",
  "accept": [
    "¿En qué trabajas?",
    "En que trabajas?",
    "¿En qué trabajas"
  ],
  "hint": "optional hint",
  "explanation": "Why this is the answer"
}
```

- `accept`: list ALL reasonable variants — with/without accent marks, with/without punctuation, alternate phrasings
- Matching is case-insensitive and accent-insensitive, but still include variants for clarity
- Use both directions: Spanish→English AND English→Spanish

### 4. classify

Sort items into categories (e.g., pronunciation groups, gender, verb types).

```
{
  "type": "classify",
  "prompt": "Sort these nationalities by gender form",
  "categories": {
    "Masculine": ["brasileño", "italiano", "japonés"],
    "Feminine": ["brasileña", "italiana", "japonesa"],
    "Both (invariable)": ["estadounidense", "belga"]
  },
  "explanation": "Why these groupings are correct"
}
```

- Category names are the labels shown to the user
- Items within each category are the correct placements
- Keep to 2-3 categories max
- 4-8 items per category works best

## Question Design Rules

1. **Pull directly from the PDF** — use the actual vocabulary, dialogues, grammar points, and exercises. Don't invent topics not covered.
2. **Cover the full lesson** — spread questions across ALL sections. Don't cluster on one topic.
3. **Test understanding, not just memorization** — include application questions (e.g., complete a sentence, translate in context) not just "what does X mean."
4. **Difficulty mix** — ~4 easy, ~7 medium, ~4 hard questions.
5. **Every question MUST have an `explanation`** — this is shown during review and should teach, not just state the answer.
6. **Balance the types** — aim for roughly: 4 fill_blank, 4 multiple_choice, 4 translate, 3 classify (adjust based on lesson content).
7. **Hints are optional** — only add them for harder questions.
8. **For fill_blank accept arrays** — always think about common misspellings and alternate valid answers. Include the number version for number answers (e.g., both "cuarenta y nueve" and "49").
9. **For translate accept arrays** — be generous with variants. Include versions with and without accent marks, with and without question marks, and alternate valid phrasings.

## Important

- Output ONLY the JSON. No other text.
- Ensure valid JSON (no trailing commas, proper escaping).
- Use UTF-8 for Spanish characters (ñ, á, é, í, ó, ú, ü, ¿, ¡).
