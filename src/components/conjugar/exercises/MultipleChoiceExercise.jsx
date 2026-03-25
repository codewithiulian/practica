import { cn } from "@/lib/utils";
import { getExerciseMeta } from "../shared";

export default function MultipleChoiceExercise({ exercise, onAnswer, feedback, answer }) {
  const meta = getExerciseMeta("multiple_choice");
  const selected = answer ?? null;

  return (
    <div className="flex flex-col items-center w-full max-w-lg mx-auto">
      <span className="text-sm font-bold mb-4" style={{ color: meta.color }}>
        {meta.icon} {meta.label}
      </span>

      <p className="text-2xl font-bold text-gray-800 text-center mb-2">
        {exercise.sentence}
      </p>
      <p className="text-sm text-gray-400 font-semibold mb-8">
        {exercise.verb} · {exercise.tenseLabel}
      </p>

      <div className="grid grid-cols-2 gap-3 w-full">
        {exercise.options.map((opt, i) => {
          const isCorrect = feedback && i === exercise.correctIndex;
          const isSelected = selected === i;
          const wasWrong = feedback && isSelected && i !== exercise.correctIndex;

          return (
            <button
              key={i}
              onClick={() => !feedback && onAnswer(i)}
              disabled={!!feedback}
              className={cn(
                "px-4 py-4 rounded-xl border-2 text-lg font-bold transition-all",
                !feedback && !isSelected && "border-gray-200 bg-white text-gray-700 hover:border-gray-300",
                !feedback && isSelected && "border-green-400 bg-green-50 text-green-700",
                isCorrect && "border-green-500 bg-green-50 text-green-700",
                wasWrong && "border-red-400 bg-red-50 text-red-600"
              )}
            >
              {opt}
              {isCorrect && feedback && <span className="ml-1">✓</span>}
              {wasWrong && <span className="ml-1">✗</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
