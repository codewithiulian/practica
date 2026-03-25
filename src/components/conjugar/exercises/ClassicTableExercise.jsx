import { cn } from "@/lib/utils";
import { PERSONS } from "@/lib/conjugar/constants";
import { getExerciseMeta } from "../shared";

export default function ClassicTableExercise({ exercise, onAnswer, feedback, answer = {} }) {
  const meta = getExerciseMeta("classic_table");

  const handleChange = (person, value) => {
    onAnswer({ ...answer, [person]: value });
  };

  return (
    <div className="flex flex-col items-center w-full max-w-lg mx-auto">
      <span className="text-sm font-bold mb-3" style={{ color: meta.color }}>
        {meta.icon} {meta.label}
      </span>
      <h2 className="text-3xl font-black text-gray-900 mb-1">{exercise.verb}</h2>
      <p className="text-gray-500 text-sm font-semibold mb-6">
        {exercise.tenseLabel}
      </p>

      <div className="w-full rounded-2xl border border-gray-200 divide-y divide-gray-100">
        {PERSONS.map((person) => {
          const fb = feedback?.details?.[person];
          return (
            <div key={person} className="flex items-center gap-3 px-4 py-3">
              <span className="text-sm font-semibold text-gray-700 w-28 shrink-0">
                {person}
              </span>
              <div className="flex-1 flex flex-col gap-1">
                <input
                  type="text"
                  value={answer[person] || ""}
                  onChange={(e) => handleChange(person, e.target.value)}
                  disabled={!!feedback}
                  placeholder="..."
                  className={cn(
                    "w-full px-3 py-2.5 rounded-xl border text-center text-sm font-semibold outline-none transition-colors",
                    !feedback && "border-gray-200 bg-gray-50 focus:border-green-400 focus:bg-white",
                    fb?.correct && "border-green-400 bg-green-50 text-green-700",
                    fb && !fb.correct && "border-red-400 bg-red-50 text-red-700"
                  )}
                />
                {fb && !fb.correct && (
                  <span className="text-xs font-semibold text-green-600 text-center">
                    {fb.expected}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
