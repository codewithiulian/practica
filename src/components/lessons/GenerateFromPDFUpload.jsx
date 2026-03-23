import { useRef, useState } from "react";
import { C } from "../../styles/theme";

export default function GenerateFromPDFUpload({ uploading, fileName, progress, phase, onFileSelect }) {
  const fileRef = useRef();
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file && (file.type === "application/pdf" || file.name?.toLowerCase().endsWith(".pdf"))) {
      onFileSelect(file);
    }
  };

  if (uploading) {
    return (
      <div style={{
        border: `1px solid ${C.border}`, borderRadius: 12, padding: 16,
        display: "flex", alignItems: "center", gap: 12,
      }}>
        {/* Pink doc icon */}
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: "#fdf0f3", display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#e8768a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 13, fontWeight: 700, color: C.text,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            fontFamily: "'Nunito', sans-serif",
          }}>
            {fileName}
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, marginTop: 2, fontFamily: "'Nunito', sans-serif" }}>
            {phase === "compressing" ? "Compressing…"
              : phase === "saving" ? "Saving…"
              : phase === "token" ? "Preparing…"
              : `Uploading & compressing… ${progress}%`}
          </div>
          {/* Progress bar */}
          <div style={{ height: 4, borderRadius: 2, background: "#e8ecf0", marginTop: 8, overflow: "hidden" }}>
            {phase === "compressing" || phase === "saving" || phase === "token" ? (
              <div className="progress-indeterminate" style={{
                height: "100%", width: "40%", borderRadius: 2, background: "#3dba6f",
              }} />
            ) : (
              <div style={{
                height: "100%", borderRadius: 2, background: "#3dba6f",
                width: `${progress}%`, transition: "width 0.3s ease",
              }} />
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <p style={{
        fontSize: 13, fontWeight: 600, color: C.muted, lineHeight: 1.5, marginBottom: 16,
        fontFamily: "'Nunito', sans-serif",
      }}>
        Upload a lesson PDF to automatically create a lesson with AI-generated summary and quiz.
      </p>
      <div
        onClick={() => fileRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        style={{
          border: `2px dashed ${dragOver ? "#3dba6f" : C.border}`,
          borderRadius: 14, padding: "40px 20px", textAlign: "center",
          cursor: "pointer", background: "#fafbfc",
          transition: "border-color 0.2s",
        }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = "#3dba6f")}
        onMouseLeave={e => { if (!dragOver) e.currentTarget.style.borderColor = C.border; }}
      >
        {/* Upload icon in green circle */}
        <div style={{
          width: 48, height: 48, borderRadius: 14, margin: "0 auto 12px",
          background: "rgba(61, 186, 111, 0.12)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3dba6f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </div>
        <p style={{
          fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 4,
          fontFamily: "'Nunito', sans-serif",
        }}>
          <span className="gpdf-desktop-only">Drop PDF here or click to browse</span>
          <span className="gpdf-mobile-only">Tap to select PDF</span>
        </p>
        <p style={{ fontSize: 12, fontWeight: 600, color: "#9ca3af", fontFamily: "'Nunito', sans-serif" }}>
          Any PDF size
        </p>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept=".pdf,application/pdf"
        style={{ display: "none" }}
        onChange={(e) => { if (e.target.files?.[0]) onFileSelect(e.target.files[0]); e.target.value = ""; }}
      />
    </>
  );
}
