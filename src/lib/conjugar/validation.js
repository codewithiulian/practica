/**
 * Answer validation and session builder for Conjugar drills.
 */

// ── Normalize ──

export function normalizeAnswer(str) {
  return (str || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// ── Per-type checkers ──

function checkClassicTable(exercise, answers) {
  const persons = Object.keys(exercise.answers);
  const details = {};
  let correctCount = 0;
  for (const person of persons) {
    const expected = normalizeAnswer(exercise.answers[person]);
    const actual = normalizeAnswer(answers?.[person]);
    const isCorrect = actual === expected;
    if (isCorrect) correctCount++;
    details[person] = { correct: isCorrect, expected: exercise.answers[person] };
  }
  return { correct: correctCount >= 4, correctCount, total: persons.length, details };
}

function checkGapFill(exercise, answer) {
  const correct = normalizeAnswer(answer) === normalizeAnswer(exercise.correctAnswer);
  return { correct, expected: exercise.correctAnswer };
}

function checkMultipleChoice(exercise, selectedIndex) {
  return {
    correct: selectedIndex === exercise.correctIndex,
    correctIndex: exercise.correctIndex,
  };
}

function checkChatBubble(exercise, answer) {
  const correct = normalizeAnswer(answer) === normalizeAnswer(exercise.correctAnswer);
  return { correct, expected: exercise.correctAnswer };
}

function checkOddOneOut(exercise, selectedIndex) {
  return {
    correct: selectedIndex === exercise.oddIndex,
    oddIndex: exercise.oddIndex,
    explanation: exercise.explanation,
  };
}

function checkMiniStory(exercise, answers) {
  const blanks = exercise.segments.filter((s) => s.isBlank);
  let correctCount = 0;
  const details = blanks.map((blank, i) => {
    const isCorrect =
      normalizeAnswer(answers?.[i]) === normalizeAnswer(blank.correctAnswer);
    if (isCorrect) correctCount++;
    return { correct: isCorrect, expected: blank.correctAnswer };
  });
  const threshold = Math.ceil((blanks.length * 2) / 3);
  return { correct: correctCount >= threshold, correctCount, total: blanks.length, details };
}

// ── Answered-ness check — blocks submission on empty fields / no selection ──

function nonEmptyString(v) {
  return typeof v === "string" && v.trim().length > 0;
}

export function isAnswered(exercise, answer) {
  if (!exercise) return false;
  switch (exercise.type) {
    case "classic_table": {
      const persons = Object.keys(exercise.answers || {});
      if (persons.length === 0) return false;
      return persons.every((p) => nonEmptyString(answer?.[p]));
    }
    case "mini_story": {
      const blankCount = (exercise.segments || []).filter((s) => s.isBlank).length;
      if (blankCount === 0) return false;
      if (!Array.isArray(answer)) return false;
      for (let i = 0; i < blankCount; i++) {
        if (!nonEmptyString(answer[i])) return false;
      }
      return true;
    }
    case "gap_fill":
    case "chat_bubble":
      return nonEmptyString(answer);
    case "multiple_choice":
    case "odd_one_out":
    case "spot_error":
      return typeof answer === "number" && Number.isInteger(answer) && answer >= 0;
    default:
      return false;
  }
}

// ── Main dispatcher ──

export function checkExercise(exercise, userAnswer) {
  switch (exercise.type) {
    case "classic_table":
      return checkClassicTable(exercise, userAnswer);
    case "gap_fill":
      return checkGapFill(exercise, userAnswer);
    case "multiple_choice":
      return checkMultipleChoice(exercise, userAnswer);
    case "chat_bubble":
      return checkChatBubble(exercise, userAnswer);
    case "odd_one_out":
      return checkOddOneOut(exercise, userAnswer);
    case "mini_story":
      return checkMiniStory(exercise, userAnswer);
    default:
      return { correct: false };
  }
}

// ── Session builder ──

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function buildSession(packs) {
  const session = [];

  for (const pack of packs) {
    const verbName = pack.exercises.find((e) => e.verb)?.verb || "";
    const classics = [];
    const creatives = [];

    for (const ex of pack.exercises) {
      const enriched = {
        ...ex,
        _packId: pack.id,
        _verbId: pack.verb_id,
        _verb: verbName,
        _tense: pack.tense,
      };
      if (ex.type === "classic_table") {
        classics.push(enriched);
      } else {
        creatives.push(enriched);
      }
    }

    // Shuffle creatives, then append classic table(s) last for this pack
    session.push(...shuffle(creatives), ...classics);
  }

  return session;
}
