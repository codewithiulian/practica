import { cn } from "@/lib/utils";
import { getExerciseMeta } from "../shared";

export default function MiniStoryExercise({ exercise, onAnswer, feedback, answer = [] }) {
  const meta = getExerciseMeta("mini_story");
  let blankIdx = 0;

  const handleChange = (idx, value) => {
    const next = [...answer];
    next[idx] = value;
    onAnswer(next);
  };

  return (
    <div className="flex flex-col items-center w-full max-w-lg mx-auto">
      <span className="text-sm font-bold mb-6" style={{ color: meta.color }}>
        {meta.icon} {meta.label}
      </span>

      <div className="w-full rounded-2xl border border-gray-200 bg-white p-5">
        <p className="text-xl font-semibold text-gray-800 leading-relaxed">
          {exercise.segments.map((seg, i) => {
            if (!seg.isBlank) {
              return <span key={i}>{seg.text}</span>;
            }
            const idx = blankIdx++;
            const fb = feedback?.details?.[idx];
            return (
              <span key={i} className="inline-flex flex-col items-center mx-1">
                <input
                  type="text"
                  value={answer[idx] || ""}
                  onChange={(e) => handleChange(idx, e.target.value)}
                  disabled={!!feedback}
                  className={cn(
                    "w-28 text-center text-xl font-semibold border-b-2 outline-none bg-transparent pb-0.5",
                    !feedback && "border-green-400 text-gray-800",
                    fb?.correct && "border-green-500 text-green-700",
                    fb && !fb.correct && "border-red-500 text-red-700"
                  )}
                  placeholder="___"
                />
                {fb && !fb.correct && (
                  <span className="text-xs font-semibold text-green-600 mt-0.5">
                    {fb.expected}
                  </span>
                )}
              </span>
            );
          })}
        </p>
      </div>

      {exercise.hint && (
        <div className="mt-6 px-4 py-2.5 rounded-xl bg-gray-100 text-gray-500 text-sm font-semibold flex items-center gap-2">
          <span>💡</span> {exercise.hint}
        </div>
      )}
    </div>
  );
}
