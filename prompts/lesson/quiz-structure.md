## Question Types (use a balanced mix of all 4)

### 1. fill_blank

Fill in the blank — use `___` in the prompt where blanks go.

```
{
  "type": "fill_blank",
  "title": "Short descriptive title of what this tests",
  "prompt": "Natural sentence with ___ for each blank",
  "blanks": ["CorrectAnswer1", "CorrectAnswer2"],
  "accept": [["answer1variant1", "answer1variant2"], ["answer2variant1"]],
  "hint": "Brief clue about what kind of answer is expected",
  "explanation": "Why this is the answer, with teaching context"
}
```

- `blanks`: the primary correct answer for each blank (displayed in review)
- `accept`: array of arrays — each inner array lists ALL accepted spellings/variants for that blank (LOWERCASE — matching is case-insensitive and accent-insensitive)
- **The sentence MUST come from the PDF** — from a dialogue, exercise, or example text. Do not invent sentences.

**FILL_BLANK FORMATTING RULES (critical):**

- The `prompt` must read as a natural, self-contained sentence or question. The student should understand what's being asked just by reading the prompt.
- Do NOT start prompts with meta-prefixes like "From the exercises:", "Complete the dialogue:", "From page 12:". Just write the sentence directly.
- `hint` is **MANDATORY** for fill_blank questions. The hint should clarify what TYPE of answer is expected (e.g., "nationality", "profession", "a greeting", "a verb in infinitive form"). Without a hint, the student often has no idea what category of word to fill in.
- Each blank should test exactly ONE word or short phrase. Do not make blanks that expect entire sentences.
- BAD: `"___, ___."\` (two disconnected blanks with no context — student has no idea what's expected)
- GOOD: `"___ colombiana, de Bogotá. ___ médica clínica."\` (the surrounding words give clear context for each blank)
- BAD: `"El queso Camembert es ___. El vodka es ___."\` (what adjective? what nationality? what quality? unclear)
- GOOD: `"La pizza es ___. La paella es ___."\` with hint: `"Fill in the nationality that matches each food's country of origin."\` (now it's clear)

### 2. multiple_choice

```
{
  "type": "multiple_choice",
  "title": "Short descriptive title of what this tests",
  "prompt": "The question text",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "answer": 1,
  "explanation": "Why this is the answer"
}
```

- `answer`: zero-indexed integer (0 = first option)
- Always 4 options
- Distractors must be plausible (from the same vocabulary set in the PDF), not obviously wrong

### 3. translate

```
{
  "type": "translate",
  "title": "Short descriptive title of what this tests",
  "prompt": "Translate to [target language]: '[phrase]'",
  "direction": "English → Spanish" or "Spanish → English",
  "accept": ["variant1", "variant2", "variant3"],
  "hint": "optional hint",
  "explanation": "Why this is the answer"
}
```

- `accept`: list ALL reasonable variants — with/without accents, with/without punctuation marks, alternate valid phrasings
- The phrase being translated MUST appear in the PDF (dialogue, exercise, vocabulary section, or grammar example)
- Use both directions

### 4. classify

Sort items into categories.

```
{
  "type": "classify",
  "title": "Short descriptive title of what this tests",
  "prompt": "Instruction for classification",
  "categories": {
    "Category A": ["item1", "item2"],
    "Category B": ["item3", "item4"]
  },
  "explanation": "Why these groupings are correct"
}
```

- 2-3 categories max
- 3-8 items per category
- ALL items MUST come from the PDF's vocabulary lists or exercises
