import { C } from "../../styles/theme";

function formatFileSize(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function GenerateFromPDFDone({
  fileInfo, genSummary, genQuiz, summaryPreview, onViewLesson,
}) {
  let subtitle = "Lesson saved";
  if (genSummary && genQuiz) subtitle = "Summary and quiz are ready";
  else if (genSummary) subtitle = "Summary is ready";
  else if (genQuiz) subtitle = "Quiz is ready";

  return (
    <>
      {/* Success icon */}
      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <div style={{
          width: 48, height: 48, borderRadius: 24, margin: "0 auto 12px",
          border: "3px solid #3dba6f", display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3dba6f" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h3 style={{
          fontSize: 16, fontWeight: 800, color: C.text, marginBottom: 4,
          fontFamily: "'Nunito', sans-serif",
        }}>
          Lesson created!
        </h3>
        <p style={{
          fontSize: 12, fontWeight: 600, color: C.muted,
          fontFamily: "'Nunito', sans-serif",
        }}>
          {subtitle}
        </p>
      </div>

      {/* Result cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
        {/* PDF card */}
        <div style={{
          background: "#fdf0f3", border: "1px solid rgba(232, 118, 138, 0.2)",
          borderRadius: 12, padding: "12px 14px",
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#e8768a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.text, fontFamily: "'Nunito', sans-serif" }}>
              Course PDF
            </div>
            <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, marginTop: 1, fontFamily: "'Nunito', sans-serif" }}>
              {formatFileSize(fileInfo?.fileSize)} · Saved
            </div>
          </div>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3dba6f" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        {/* Summary card */}
        {genSummary && (
          <div style={{
            background: "#f3f0ff", border: "1px solid rgba(139, 92, 246, 0.15)",
            borderRadius: 12, padding: "12px 14px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text, fontFamily: "'Nunito', sans-serif" }}>
                  Lesson Summary
                </div>
              </div>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3dba6f" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            {summaryPreview && (
              <div style={{
                marginTop: 8, padding: "8px 10px", borderRadius: 8,
                background: "rgba(139, 92, 246, 0.06)",
                fontSize: 12, fontWeight: 600, color: "#6b7280", lineHeight: 1.5,
                fontFamily: "'Nunito', sans-serif",
                overflow: "hidden", textOverflow: "ellipsis",
                display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
              }}>
                {summaryPreview}
              </div>
            )}
          </div>
        )}

        {/* Quiz card */}
        {genQuiz && (
          <div style={{
            background: "rgba(61, 186, 111, 0.08)", border: "1px solid rgba(61, 186, 111, 0.15)",
            borderRadius: 12, padding: "12px 14px",
            display: "flex", alignItems: "center", gap: 12,
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3dba6f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text, fontFamily: "'Nunito', sans-serif" }}>
                Quiz Generated
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, marginTop: 1, fontFamily: "'Nunito', sans-serif" }}>
                15 questions · 4 types
              </div>
            </div>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3dba6f" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        )}
      </div>

      {/* View lesson button */}
      <button
        onClick={onViewLesson}
        style={{
          width: "100%", padding: "14px", borderRadius: 12, border: "none",
          background: "#3dba6f", color: "white",
          fontWeight: 700, fontSize: 15, cursor: "pointer",
          fontFamily: "'Nunito', sans-serif",
          transition: "filter 0.15s",
        }}
        onMouseEnter={e => (e.currentTarget.style.filter = "brightness(1.08)")}
        onMouseLeave={e => (e.currentTarget.style.filter = "none")}
      >
        View lesson
      </button>
    </>
  );
}
