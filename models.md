# AI Models

## Carolina Text Chat

| Layer | Model | Service |
|-------|-------|---------|
| Conversation | `claude-sonnet-4-6` | Anthropic |

| Prompt | Path |
|--------|------|
| Identity (shared) | `prompts/carolina/carolina-identity.md` |
| Mode: Essay | `prompts/carolina/carolina-text/carolina-mode-essay.md` |
| Mode: Grammar | `prompts/carolina/carolina-text/carolina-mode-grammar.md` |
| Mode: Vocabulary | `prompts/carolina/carolina-text/carolina-mode-vocab.md` |
| Mode: Conversation | `prompts/carolina/carolina-text/carolina-mode-conversation.md` |
| Lesson context | `prompts/carolina/carolina-text/carolina-lesson-context.md` |

## Carolina Voice Call

| Layer | Model | Service |
|-------|-------|---------|
| Speech-to-Text | `nova-2` | Deepgram |
| Conversation + Audio | `gemini-2.5-flash-native-audio-preview-12-2025` | Google |

| Prompt | Path |
|--------|------|
| Base instruction | `prompts/carolina/carolina-voice/gemini-voice-base.md` |
| Unit context mode | `prompts/carolina/carolina-voice/gemini-voice-unit-context.md` |
| General mode | `prompts/carolina/carolina-voice/gemini-voice-general-mode.md` |

## Vocabulary Explanations

| Layer | Model | Service |
|-------|-------|---------|
| Word analysis | `gpt-5-nano` | OpenAI |

| Prompt | Path |
|--------|------|
| Single word | `prompts/vocab/vocab-explain-single.md` |
| Bulk words | `prompts/vocab/vocab-explain-bulk.md` |

## PDF Lesson Processing

| Layer | Model | Service |
|-------|-------|---------|
| PDF extraction & quiz generation | `claude-sonnet-4-6` | Anthropic |

| Prompt | Path |
|--------|------|
| Lesson summary | `prompts/lesson/lesson-summary-system.md` |
| Quiz generator | `prompts/lesson/quiz-generator-system.md` |
