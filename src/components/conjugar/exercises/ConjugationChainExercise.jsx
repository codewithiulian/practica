import { useState, useEffect, useImperativeHandle, forwardRef } from "react";
import { cn } from "@/lib/utils";
import { normalizeAnswer } from "@/lib/conjugar/validation";
import { getExerciseMeta } from "../shared";

const ConjugationChainExercise = forwardRef(function ConjugationChainExercise(
  { exercise, onAnswer, onComplete },
  ref
) {
  const meta = getExerciseMeta("conjugation_chain");
  const chain = exercise.chain;
  const [chainIndex, setChainIndex] = useState(0);
  const [input, setInput] = useState("");
  const [results, setResults] = useState([]); // { person, answer, correct, expected }
  const [showFeedback, setShowFeedback] = useState(false);
  const [done, setDone] = useState(false);

  const current = chain[chainIndex];

  // Expose check method for parent's Comprobar button
  useImperativeHandle(ref, () => ({ check: checkCurrent }));

  function checkCurrent() {
    if (done || showFeedback) return;
    const expected = current.correctAnswer;
    const correct = normalizeAnswer(input) === normalizeAnswer(expected);
    const result = { person: current.person, answer: input, correct, expected };

    setResults((prev) => [...prev, result]);
    setShowFeedback(true);

    setTimeout(() => {
      setShowFeedback(false);
      setInput("");
      if (chainIndex < chain.length - 1) {
        setChainIndex((prev) => prev + 1);
      } else {
        setDone(true);
        const allAnswers = [...results.map((r) => r.answer), input];
        onAnswer(allAnswers);
        onComplete(allAnswers);
      }
    }, 600);
  }

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      checkCurrent();
    }
  };

  // Reset when exercise changes
  useEffect(() => {
    setChainIndex(0);
    setInput("");
    setResults([]);
    setShowFeedback(false);
    setDone(false);
  }, [exercise.id]);

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto">
      <span className="text-sm font-bold mb-2" style={{ color: meta.color }}>
        {meta.icon} {meta.label}
      </span>
      <p className="text-sm text-gray-400 font-semibold mb-4">
        {exercise.verb} · {exercise.tenseLabel}
      </p>

      {/* Progress dots */}
      <div className="flex gap-2 mb-6">
        {chain.map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-1.5 w-8 rounded-full transition-colors",
              i < results.length
                ? results[i]?.correct
                  ? "bg-green-500"
                  : "bg-red-400"
                : i === chainIndex
                  ? "bg-green-300"
                  : "bg-gray-200"
            )}
          />
        ))}
      </div>

      {!done && (
        <>
          {/* Person badge */}
          <div className="w-32 h-32 rounded-2xl bg-green-50 flex items-center justify-center mb-6">
            <span className="text-2xl font-bold text-green-700">
              {current.person}
            </span>
          </div>

          {/* Input */}
          <div className="flex items-center gap-3 w-full max-w-xs">
            <span className="text-gray-400 text-lg">→</span>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={showFeedback}
              autoFocus
              placeholder="conjugación..."
              className={cn(
                "flex-1 px-4 py-3 rounded-xl border-2 text-lg font-semibold text-center outline-none transition-colors",
                !showFeedback && "border-green-400 focus:border-green-500",
                showFeedback && results[results.length - 1]?.correct && "border-green-500 bg-green-50 text-green-700",
                showFeedback && !results[results.length - 1]?.correct && "border-red-400 bg-red-50 text-red-700"
              )}
            />
          </div>

          {showFeedback && !results[results.length - 1]?.correct && (
            <p className="text-sm font-semibold text-green-600 mt-2">
              {results[results.length - 1]?.expected}
            </p>
          )}
        </>
      )}

      {/* Completed persons list */}
      {results.length > 0 && (
        <div className="mt-6 w-full flex flex-col gap-1">
          {results.map((r, i) => (
            <div key={i} className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-gray-50">
              <span className="text-sm font-semibold text-gray-600">{r.person}</span>
              <span className={cn(
                "text-sm font-bold",
                r.correct ? "text-green-600" : "text-red-500"
              )}>
                {r.correct ? r.answer : `${r.answer} → ${r.expected}`}
              </span>
            </div>
          ))}
        </div>
      )}

      {done && (
        <p className="mt-4 text-sm font-semibold text-gray-500">
          {results.filter((r) => r.correct).length}/{chain.length} correctas
        </p>
      )}
    </div>
  );
});

export default ConjugationChainExercise;
