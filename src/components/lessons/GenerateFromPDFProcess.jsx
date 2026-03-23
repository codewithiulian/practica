import { useState, useEffect, useRef } from "react";
import { C } from "../../styles/theme";

export default function GenerateFromPDFProcess({ steps }) {
  const activeKey = steps.find(s => s.status === "active")?.key;
  const timerStartRef = useRef(null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (activeKey) {
      timerStartRef.current = Date.now();
      setElapsed(0);
      const interval = setInterval(() => {
        setElapsed(Math.floor((Date.now() - timerStartRef.current) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    }
    setElapsed(0);
  }, [activeKey]);

  // Shimmer label based on active step
  const activeStep = steps.find(s => s.status === "active");
  let shimmerLabel = "PROCESSING...";
  if (activeStep?.key === "summary") shimmerLabel = "READING PDF...";
  if (activeStep?.key === "quiz") shimmerLabel = "CRAFTING QUESTIONS...";

  return (
    <>
      {/* Purple pill badge */}
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "6px 16px", borderRadius: 20,
          background: "#f3f0ff", color: "#8b5cf6",
          fontSize: 12, fontWeight: 700, fontFamily: "'Nunito', sans-serif",
        }}>
          <span style={{ fontSize: 12 }}>&#10022;</span>
          Creating your lesson...
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
            <div key={step.key} style={{ display: "flex", gap: 12 }}>
              {/* Left: icon + vertical line */}
              <div style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                width: 28, flexShrink: 0,
              }}>
                {/* Circle icon */}
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
                {step.status === "active" && (
                  <div style={{
                    width: 28, height: 28, borderRadius: 14,
                    border: "2.5px solid #3dba6f", background: "white",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <div style={{
                      width: 14, height: 14, borderRadius: 7,
                      border: "2.5px solid #3dba6f", borderTopColor: "transparent",
                      animation: "gpdfSpin 0.8s linear infinite",
                    }} />
                  </div>
                )}
                {step.status === "pending" && (
                  <div style={{
                    width: 28, height: 28, borderRadius: 14,
                    background: "#f0f2f5", display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <div style={{ width: 8, height: 8, borderRadius: 4, background: "#d1d5db" }} />
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
                    width: 2, flex: 1, minHeight: 12,
                    background: lineGreen ? "#3dba6f" : "#e8ecf0",
                    transition: "background 0.3s",
                  }} />
                )}
              </div>

              {/* Right: label + status */}
              <div style={{
                flex: 1, paddingBottom: isLast ? 0 : 16, minHeight: 28,
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}>
                <span style={{
                  fontSize: 14, fontWeight: 600,
                  color: step.status === "pending" ? "#9ca3af"
                    : step.status === "failed" ? "#ef4444"
                    : C.text,
                  fontFamily: "'Nunito', sans-serif",
                }}>
                  {step.status === "failed" ? step.label.replace("Generating", "").trim() + " failed" : step.label}
                </span>
                {step.status === "done" && (
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#3dba6f", fontFamily: "'Nunito', sans-serif" }}>
                    Done
                  </span>
                )}
                {step.status === "active" && (
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.muted, fontFamily: "'Nunito', sans-serif" }}>
                    {elapsed}s
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Shimmer skeleton */}
      <div style={{
        border: `1px solid ${C.border}`, borderRadius: 10,
        padding: "14px 16px",
      }}>
        <div style={{
          fontSize: 10, fontWeight: 800, color: "#9ca3af",
          letterSpacing: "0.08em", textTransform: "uppercase",
          fontFamily: "'Nunito', sans-serif", marginBottom: 12,
        }}>
          {shimmerLabel}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div className="gpdf-shimmer" style={{ height: 8, width: "100%", borderRadius: 4 }} />
          <div className="gpdf-shimmer" style={{ height: 8, width: "80%", borderRadius: 4 }} />
          <div className="gpdf-shimmer" style={{ height: 8, width: "65%", borderRadius: 4 }} />
          <div className="gpdf-shimmer" style={{ height: 8, width: "40%", borderRadius: 4 }} />
        </div>
      </div>
    </>
  );
}
