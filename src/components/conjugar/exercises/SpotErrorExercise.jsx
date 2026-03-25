import { cn } from "@/lib/utils";
import { getExerciseMeta } from "../shared";

export default function SpotErrorExercise({ exercise, onAnswer, feedback, answer }) {
  const meta = getExerciseMeta("spot_error");
  const selected = answer ?? null;

  return (
    <div className="flex flex-col items-center w-full max-w-lg mx-auto">
      <span className="text-sm font-bold mb-2" style={{ color: meta.color }}>
        {meta.icon} {meta.label}
      </span>
      <p className="text-gray-500 text-sm font-semibold mb-6">
        Toca la palabra incorrecta
      </p>

      <div className="flex flex-wrap justify-center gap-3">
        {exercise.words.map((word, i) => {
          const isError = feedback && i === exercise.errorIndex;
          const isSelected = selected === i;
          const wasWrong = feedback && isSelected && !feedback.correct;

          return (
            <button
              key={i}
              onClick={() => !feedback && onAnswer(i)}
              disabled={!!feedback}
              className={cn(
                "px-5 py-3 rounded-xl border-2 text-lg font-semibold transition-all",
                !feedback && !isSelected && "border-gray-200 bg-white text-gray-700 hover:border-gray-300",
                !feedback && isSelected && "border-blue-400 bg-blue-50 text-blue-700",
                isError && "border-red-400 bg-red-50 text-red-500 line-through",
                wasWrong && "border-red-300 bg-red-50 text-red-400",
                feedback && !isError && !wasWrong && "border-gray-100 bg-gray-50 text-gray-400"
              )}
            >
              {word}
            </button>
          );
        })}
      </div>

      {feedback && (
        <div className="mt-6 text-center">
          <p className="text-sm font-semibold text-green-600">
            {exercise.errorWord} → {exercise.correctWord}
          </p>
          <p className="text-xs text-gray-500 mt-1">{exercise.explanation}</p>
        </div>
      )}
    </div>
  );
}
