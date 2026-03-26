import { cn } from "@/lib/utils";
import { getExerciseMeta } from "../shared";

export default function ChatBubbleExercise({ exercise, onAnswer, feedback, answer = "" }) {
  const meta = getExerciseMeta("chat_bubble");

  return (
    <div className="flex flex-col items-center w-full max-w-lg mx-auto">
      <span className="text-sm font-bold mb-6" style={{ color: meta.color }}>
        {meta.icon} {meta.label}
      </span>

      <div className="w-full flex flex-col gap-3">
        {exercise.messages.map((msg, i) => {
          const hasBlank = msg.blankPosition;

          return (
            <div key={i} className={cn("flex flex-col", msg.isUser ? "items-end" : "items-start")}>
              <div
                className={cn(
                  "max-w-[80%] px-4 py-3 rounded-2xl text-base font-medium",
                  msg.isUser
                    ? "bg-green-50 border border-green-200 text-gray-800 rounded-br-md"
                    : "bg-gray-100 text-gray-800 rounded-bl-md"
                )}
              >
                {(() => {
                  // Build full text from whichever fields the AI populated
                  const fullText = hasBlank
                    ? `${msg.blankPosition.before}___${msg.blankPosition.after}`
                    : msg.text || "";
                  const blankParts = fullText.split("___");

                  if (blankParts.length < 2) return fullText;

                  return (
                    <span className="leading-relaxed">
                      {blankParts[0]}
                      <span className="inline-flex flex-col items-center mx-1">
                        <input
                          type="text"
                          value={answer}
                          onChange={(e) => onAnswer(e.target.value)}
                          disabled={!!feedback}
                          className={cn(
                            "w-24 text-center font-bold border-b-2 outline-none bg-transparent",
                            !feedback && "border-green-400",
                            feedback?.correct && "border-green-500 text-green-700",
                            feedback && !feedback.correct && "border-red-500 text-red-700"
                          )}
                          placeholder="___"
                        />
                        {feedback && !feedback.correct && (
                          <span className="text-xs font-semibold text-green-600 mt-0.5">
                            {feedback.expected}
                          </span>
                        )}
                      </span>
                      {blankParts.slice(1).join("___")}
                    </span>
                  );
                })()}
              </div>
              <span className="text-xs text-gray-400 mt-1 px-1">
                {msg.isUser ? "Tú" : msg.sender}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
