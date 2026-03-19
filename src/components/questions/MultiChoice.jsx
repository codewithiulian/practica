import { C } from "../../styles/theme";

export default function MultiChoice({ q, value, onChange }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {q.options.map((opt, i) => {
        const sel = value?.selected === i;
        return (
          <div key={i} onClick={() => onChange({ selected: i })}
            style={{
              padding: "14px 16px", borderRadius: 14, cursor: "pointer", transition: "all 0.15s",
              border: `2.5px solid ${sel ? C.accent : C.border}`,
              background: sel ? C.accentLight : C.card, color: C.text,
              fontWeight: 600, fontSize: 14, minHeight: 52,
              display: "flex", alignItems: "center", gap: 10,
            }}>
            <span style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
              transition: "all 0.15s",
              border: `2.5px solid ${sel ? C.accent : "#B0E0D8"}`,
              background: sel ? C.accent : "transparent",
              boxShadow: sel ? "inset 0 0 0 4px #fff" : "none",
            }} />
            {opt}
          </div>
        );
      })}
    </div>
  );
}
