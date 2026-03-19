import { useRef, useEffect } from "react";
import { C } from "../../styles/theme";

export default function FillBlank({ q, value, onChange, onSubmit }) {
  const blanks = value?.blanks || [];
  const parts = q.prompt.split(/(___+)/);
  const inputRefs = useRef([]);
  let idx = 0;

  useEffect(() => {
    if (inputRefs.current[0]) inputRefs.current[0].focus();
  }, [q]);

  const update = (i, v) => {
    const nb = [...blanks]; nb[i] = v; onChange({ blanks: nb });
  };

  const blankCount = parts.filter((p) => /^___+$/.test(p)).length;

  const handleKeyDown = (i, e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (inputRefs.current[i + 1]) inputRefs.current[i + 1].focus();
      else if (i === blankCount - 1 && onSubmit) onSubmit();
    }
  };

  return (
    <div>
      <div style={{ fontSize: 18, fontWeight: 600, lineHeight: 2.4, marginBottom: 8 }}>
        {parts.map((p, pi) => {
          if (/^___+$/.test(p)) {
            const ci = idx++;
            return (
              <input key={pi} ref={(el) => (inputRefs.current[ci] = el)}
                type="text" value={blanks[ci] || ""} onChange={(e) => update(ci, e.target.value)}
                onKeyDown={(e) => handleKeyDown(ci, e)}
                placeholder="" autoComplete="off"
                style={{
                  display: "inline-block", border: `2.5px solid ${C.border}`, borderRadius: 10,
                  background: C.inputBg, padding: "6px 12px", margin: "0 4px",
                  textAlign: "center", color: C.accent, fontWeight: 700, outline: "none",
                  minWidth: 100, minHeight: 44, fontSize: "inherit", lineHeight: "inherit",
                  fontFamily: "'Nunito', sans-serif", transition: "all 0.2s",
                }}
                onFocus={(e) => { e.target.style.borderColor = C.accent; e.target.style.boxShadow = `0 0 0 3px ${C.accent}20`; }}
                onBlur={(e) => { e.target.style.borderColor = C.border; e.target.style.boxShadow = "none"; }}
              />
            );
          }
          return <span key={pi}>{p}</span>;
        })}
      </div>
      {q.hint && <p style={{ color: C.muted, fontSize: 12, fontWeight: 600, marginTop: 12, lineHeight: 1.5 }}>💡 {q.hint}</p>}
    </div>
  );
}
