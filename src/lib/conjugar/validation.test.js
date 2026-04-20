import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { normalizeAnswer, checkExercise, buildSession } from "./validation.js";

// ── normalizeAnswer ──

describe("normalizeAnswer", () => {
  it("trims whitespace", () => {
    assert.equal(normalizeAnswer("  hablo  "), "hablo");
  });

  it("lowercases", () => {
    assert.equal(normalizeAnswer("Hablo"), "hablo");
  });

  it("strips accents", () => {
    assert.equal(normalizeAnswer("habló"), "hablo");
    assert.equal(normalizeAnswer("habláis"), "hablais");
  });

  it("handles empty/null", () => {
    assert.equal(normalizeAnswer(""), "");
    assert.equal(normalizeAnswer(null), "");
    assert.equal(normalizeAnswer(undefined), "");
  });
});

// ── classic_table ──

describe("checkExercise: classic_table", () => {
  const exercise = {
    type: "classic_table",
    answers: {
      yo: "hablo",
      tú: "hablas",
      "él/ella/usted": "habla",
      nosotros: "hablamos",
      vosotros: "habláis",
      "ellos/ellas": "hablan",
    },
  };

  it("all correct → correct=true", () => {
    const result = checkExercise(exercise, {
      yo: "hablo", tú: "hablas", "él/ella/usted": "habla",
      nosotros: "hablamos", vosotros: "habláis", "ellos/ellas": "hablan",
    });
    assert.equal(result.correct, true);
    assert.equal(result.correctCount, 6);
  });

  it("case-insensitive match", () => {
    const result = checkExercise(exercise, {
      yo: "Hablo", tú: "HABLAS", "él/ella/usted": "Habla",
      nosotros: "HABLAMOS", vosotros: "Habláis", "ellos/ellas": "HABLAN",
    });
    assert.equal(result.correct, true);
  });

  it("trims whitespace", () => {
    const result = checkExercise(exercise, {
      yo: "  hablo  ", tú: " hablas", "él/ella/usted": "habla ",
      nosotros: "hablamos", vosotros: "habláis", "ellos/ellas": "hablan",
    });
    assert.equal(result.correct, true);
  });

  it("4/6 correct → correct=true (partial credit)", () => {
    const result = checkExercise(exercise, {
      yo: "hablo", tú: "hablas", "él/ella/usted": "habla",
      nosotros: "hablamos", vosotros: "wrong", "ellos/ellas": "wrong",
    });
    assert.equal(result.correct, true);
    assert.equal(result.correctCount, 4);
  });

  it("3/6 correct → correct=false", () => {
    const result = checkExercise(exercise, {
      yo: "hablo", tú: "hablas", "él/ella/usted": "habla",
      nosotros: "wrong", vosotros: "wrong", "ellos/ellas": "wrong",
    });
    assert.equal(result.correct, false);
    assert.equal(result.correctCount, 3);
  });

  it("accent-insensitive match", () => {
    const result = checkExercise(exercise, {
      yo: "hablo", tú: "hablas", "él/ella/usted": "habla",
      nosotros: "hablamos", vosotros: "hablais", "ellos/ellas": "hablan",
    });
    // "hablais" vs "habláis" → now accepted
    assert.equal(result.details["vosotros"].correct, true);
    assert.equal(result.correctCount, 6);
  });
});

// ── gap_fill ──

describe("checkExercise: gap_fill", () => {
  const exercise = {
    type: "gap_fill",
    sentence: "María ___ con su madre.",
    correctAnswer: "habla",
    hint: "tercera persona",
  };

  it("exact match → correct", () => {
    assert.equal(checkExercise(exercise, "habla").correct, true);
  });

  it("case-insensitive", () => {
    assert.equal(checkExercise(exercise, "Habla").correct, true);
  });

  it("trimmed", () => {
    assert.equal(checkExercise(exercise, " habla ").correct, true);
  });

  it("wrong answer → incorrect", () => {
    assert.equal(checkExercise(exercise, "hablo").correct, false);
  });
});

// ── multiple_choice ──

describe("checkExercise: multiple_choice", () => {
  const exercise = {
    type: "multiple_choice",
    sentence: "Ellos ___ mucho.",
    options: ["hablan", "hablamos", "habláis", "hablas"],
    correctIndex: 0,
    verb: "hablar",
    tenseLabel: "Presente",
  };

  it("correct selection", () => {
    assert.equal(checkExercise(exercise, 0).correct, true);
  });

  it("wrong selection", () => {
    const r = checkExercise(exercise, 2);
    assert.equal(r.correct, false);
    assert.equal(r.correctIndex, 0);
  });
});

// ── chat_bubble ──

describe("checkExercise: chat_bubble", () => {
  const exercise = {
    type: "chat_bubble",
    messages: [],
    correctAnswer: "hablas",
    person: "tú",
  };

  it("correct answer", () => {
    assert.equal(checkExercise(exercise, "hablas").correct, true);
  });

  it("case-insensitive + trim", () => {
    assert.equal(checkExercise(exercise, "  Hablas  ").correct, true);
  });
});

// ── odd_one_out ──

describe("checkExercise: odd_one_out", () => {
  const exercise = {
    type: "odd_one_out",
    options: ["hablo", "hablas", "hablé", "habla"],
    oddIndex: 2,
    explanation: "hablé is pretérito",
    verb: "hablar",
    tenseLabel: "Presente",
  };

  it("correct pick", () => {
    assert.equal(checkExercise(exercise, 2).correct, true);
  });

  it("wrong pick", () => {
    assert.equal(checkExercise(exercise, 0).correct, false);
  });
});

// ── mini_story ──

describe("checkExercise: mini_story", () => {
  const exercise = {
    type: "mini_story",
    segments: [
      { text: "Todos ", isBlank: false },
      { text: "", isBlank: true, correctAnswer: "hablan" },
      { text: " español. Mi padre ", isBlank: false },
      { text: "", isBlank: true, correctAnswer: "habla" },
      { text: " y mi madre ", isBlank: false },
      { text: "", isBlank: true, correctAnswer: "habla" },
    ],
    hint: "hablar en presente",
    verb: "hablar",
  };

  it("all correct → correct", () => {
    const r = checkExercise(exercise, ["hablan", "habla", "habla"]);
    assert.equal(r.correct, true);
    assert.equal(r.correctCount, 3);
  });

  it("2/3 correct → correct (meets threshold)", () => {
    const r = checkExercise(exercise, ["hablan", "habla", "wrong"]);
    assert.equal(r.correct, true);
    assert.equal(r.correctCount, 2);
  });

  it("1/3 correct → incorrect", () => {
    const r = checkExercise(exercise, ["hablan", "wrong", "wrong"]);
    assert.equal(r.correct, false);
    assert.equal(r.correctCount, 1);
  });

  it("per-blank feedback details", () => {
    const r = checkExercise(exercise, ["hablan", "wrong", "habla"]);
    assert.equal(r.details[0].correct, true);
    assert.equal(r.details[1].correct, false);
    assert.equal(r.details[1].expected, "habla");
    assert.equal(r.details[2].correct, true);
  });
});

// ── buildSession ──

describe("buildSession", () => {
  function makePack(id, creativeCount = 6) {
    const exercises = [
      { id: `${id}-classic`, type: "classic_table", verb: "hablar", tenseLabel: "Presente", answers: {} },
    ];
    for (let i = 1; i <= creativeCount; i++) {
      exercises.push({ id: `${id}-ex-${i}`, type: "gap_fill", sentence: "test", correctAnswer: "x", hint: "y", person: "yo" });
    }
    return { id, verb_id: `verb-${id}`, tense: "presente", exercises };
  }

  it("returns 7 exercises for 1 pack (6 creatives + table)", () => {
    const session = buildSession([makePack("a")]);
    assert.equal(session.length, 7);
  });

  it("returns 14 exercises for 2 packs", () => {
    const session = buildSession([makePack("a"), makePack("b")]);
    assert.equal(session.length, 14);
  });

  it("returns 21 exercises for 3 packs", () => {
    const session = buildSession([makePack("a"), makePack("b"), makePack("c")]);
    assert.equal(session.length, 21);
  });

  it("places classic_table at the end of each pack's section", () => {
    const session = buildSession([makePack("a"), makePack("b"), makePack("c")]);
    // Tables should be at positions 6, 13, 20 (last position of each 7-exercise block)
    assert.equal(session[6].type, "classic_table");
    assert.equal(session[13].type, "classic_table");
    assert.equal(session[20].type, "classic_table");
  });

  it("keeps packs grouped in order", () => {
    const session = buildSession([makePack("a"), makePack("b")]);
    // First 7 exercises should all belong to pack a
    for (let i = 0; i < 7; i++) assert.equal(session[i]._packId, "a");
    // Next 7 should all belong to pack b
    for (let i = 7; i < 14; i++) assert.equal(session[i]._packId, "b");
  });

  it("enriches exercises with pack metadata", () => {
    const session = buildSession([makePack("a")]);
    assert.ok(session.every((e) => e._packId === "a"));
    assert.ok(session.every((e) => e._verb === "hablar"));
  });

  it("passes through all creatives from a pack (no cap)", () => {
    // Old packs may have more than 6 creatives — session should keep all of them
    const session = buildSession([makePack("a", 14)]);
    assert.equal(session.length, 15);
    assert.equal(session[14].type, "classic_table");
  });
});
