import { C } from "../../styles/theme";

export default function VocabularyEmptyState({ onAdd }) {
  return (
    <div style={{
      textAlign: "center", padding: "64px 20px",
      display: "flex", flexDirection: "column", alignItems: "center", gap: 16,
    }}>
      {/* Book icon in green circle */}
      <div style={{
        width: 72, height: 72, borderRadius: "50%", background: C.accentLight,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
        </svg>
      </div>

      <div>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: C.text, marginBottom: 6 }}>
          Your vocabulary is empty
        </h2>
        <p style={{ color: C.muted, fontSize: 15, fontWeight: 600, lineHeight: 1.6, maxWidth: 280, margin: "0 auto" }}>
          Start adding Spanish words to build your personal dictionary
        </p>
      </div>

      <button
        onClick={onAdd}
        style={{
          padding: "12px 28px", borderRadius: 14, border: "none",
          background: C.accent, color: "white", fontSize: 15, fontWeight: 800,
          cursor: "pointer", fontFamily: "'Nunito', sans-serif",
          marginTop: 8,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = C.accentHover; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = C.accent; }}
      >
        + Add words
      </button>
    </div>
  );
}
