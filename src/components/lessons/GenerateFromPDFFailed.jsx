import { C } from "../../styles/theme";

export default function GenerateFromPDFFailed({ steps, results, onRetry, onContinue }) {
  const failedSteps = steps.filter(s => s.status === "failed");
  const failedTask = failedSteps[0]; // Primary failed task for retry

  // Build error message
  let errorMsg = "An error occurred during processing. You can retry or continue without it.";
  if (failedTask) {
    const taskName = failedTask.key === "summary" ? "Summary generation" : "Quiz generation";
    const detail = failedTask.error || "timed out";
    const savedParts = steps.filter(s => s.status === "done" && s.key !== "pdf").map(s =>
      s.key === "summary" ? "summary" : "quiz"
    );
    const savedText = savedParts.length > 0
      ? `PDF${savedParts.length > 0 ? " and " + savedParts.join(", ") : ""} were saved.`
      : "PDF was saved.";
    errorMsg = `${taskName} ${detail}. ${savedText} You can retry or continue without it.`;
  }

  const retryLabel = failedTask?.key === "summary" ? "Retry summary" : "Retry quiz";

  return (
    <>
      {/* Amber pill badge */}
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "6px 16px", borderRadius: 20,
          background: "#fffbeb", color: "#d97706",
          fontSize: 12, fontWeight: 700, fontFamily: "'Nunito', sans-serif",
          border: "1px solid rgba(245, 158, 11, 0.2)",
        }}>
          &#9888; Partially completed
        </span>
      </div>

      {/* Stepper card */}
      <div style={{
        border: `1px solid ${C.border}`, borderRadius: 12,
        padding: "16px 18px", marginBottom: 16,
      }}>
        {steps.map((step, i) => {
          const isLast = i === steps.length - 1;
          const nextStep = steps[i + 1];
          const lineGreen = step.status === "done" && nextStep && nextStep.status !== "pending";

          return (
            <div key={step.key}>
              <div style={{ display: "flex", gap: 12 }}>
                {/* Left: icon + vertical line */}
                <div style={{
                  display: "flex", flexDirection: "column", alignItems: "center",
                  width: 28, flexShrink: 0,
                }}>
                  {step.status === "done" && (
                    <div style={{
                      width: 28, height: 28, borderRadius: 14,
                      background: "#3dba6f", display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                  )}
                  {step.status === "failed" && (
                    <div style={{
                      width: 28, height: 28, borderRadius: 14,
                      border: "2.5px solid #ef4444", background: "white",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="3" strokeLinecap="round">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </div>
                  )}

                  {/* Connecting line */}
                  {!isLast && (
                    <div style={{
                      width: 2, flex: 1, minHeight: step.status === "failed" ? 8 : 12,
                      background: lineGreen ? "#3dba6f" : "#e8ecf0",
                    }} />
                  )}
                </div>

                {/* Right: label + status */}
                <div style={{
                  flex: 1, paddingBottom: step.status === "failed" ? 4 : (isLast ? 0 : 16),
                  minHeight: 28,
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                }}>
                  <span style={{
                    fontSize: 14, fontWeight: 600,
                    color: step.status === "failed" ? "#ef4444" : C.text,
                    fontFamily: "'Nunito', sans-serif",
                  }}>
                    {step.status === "failed"
                      ? (step.key === "summary" ? "Lesson summary failed" : "Quiz generation failed")
                      : step.label}
                  </span>
                  {step.status === "done" && (
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#3dba6f", fontFamily: "'Nunito', sans-serif" }}>
                      Done
                    </span>
                  )}
                </div>
              </div>

              {/* Retry button below failed step */}
              {step.status === "failed" && (
                <div style={{ paddingLeft: 40, paddingBottom: isLast ? 0 : 12 }}>
                  <button
                    onClick={() => onRetry(step.key)}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 4,
                      padding: "4px 10px", borderRadius: 6, border: "none",
                      background: "rgba(61, 186, 111, 0.1)", color: "#3dba6f",
                      fontSize: 12, fontWeight: 700, cursor: "pointer",
                      fontFamily: "'Nunito', sans-serif",
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="23 4 23 10 17 10" />
                      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                    </svg>
                    Retry
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Error message */}
      <div style={{
        background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10,
        padding: "10px 14px", marginBottom: 20,
      }}>
        <p style={{
          fontSize: 11, fontWeight: 600, color: "#dc2626", lineHeight: 1.5,
          fontFamily: "'Nunito', sans-serif", margin: 0,
        }}>
          {errorMsg}
        </p>
      </div>

      {/* Footer buttons */}
      <div className="gpdf-footer">
        <button
          onClick={onContinue}
          className="gpdf-footer-cancel"
          style={{
            padding: "12px 20px", borderRadius: 10,
            border: `1.5px solid ${C.border}`, background: C.card,
            color: C.text, fontWeight: 700, fontSize: 14,
            cursor: "pointer", fontFamily: "'Nunito', sans-serif",
          }}
        >
          Continue
        </button>
        <button
          onClick={() => { if (failedTask) onRetry(failedTask.key); }}
          className="gpdf-footer-cta"
          style={{
            padding: "12px 20px", borderRadius: 10, border: "none",
            background: "#3dba6f", color: "white",
            fontWeight: 700, fontSize: 14, cursor: "pointer",
            fontFamily: "'Nunito', sans-serif",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            transition: "filter 0.15s",
          }}
          onMouseEnter={e => (e.currentTarget.style.filter = "brightness(1.08)")}
          onMouseLeave={e => (e.currentTarget.style.filter = "none")}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
          {retryLabel}
        </button>
      </div>
    </>
  );
}
