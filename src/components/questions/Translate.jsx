import { useRef, useEffect } from "react";
import { C } from "../../styles/theme";

export default function Translate({ q, value, onChange }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) { ref.current.style.height = "auto"; ref.current.style.height = ref.current.scrollHeight + "px"; }
  }, [value?.text]);
  useEffect(() => { if (ref.current) ref.current.focus(); }, [q]);

  return (
    <div>
      {q.direction && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, color: C.muted, fontSize: 14, fontWeight: 700 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
          </svg>
          {q.direction}
        </div>
      )}
      <textarea ref={ref} value={value?.text || ""} onChange={(e) => onChange({ text: e.target.value })}
        placeholder="Type your translation here..." rows={2}
        style={{
          width: "100%", padding: 14, borderRadius: 14, border: `2.5px solid ${C.border}`,
          background: "transparent", fontSize: 15, fontWeight: 600, resize: "none", outline: "none", overflow: "hidden",
          lineHeight: 1.6, color: C.text, transition: "border-color 0.2s", minHeight: 80,
          fontFamily: "'Nunito', sans-serif",
        }}
        onFocus={(e) => (e.target.style.borderColor = C.accent)}
        onBlur={(e) => (e.target.style.borderColor = C.border)} />
      {q.hint && <p style={{ color: C.muted, fontSize: 12, fontWeight: 600, marginTop: 10, lineHeight: 1.5 }}>💡 {q.hint}</p>}
    </div>
  );
}
