import { useState, useRef } from "react";
import { C } from "../styles/theme";

export default function AddQuizSheet({ open, onClose, onLoad }) {
  const ref = useRef();
  const [err, setErr] = useState("");
  const [dragging, setDragging] = useState(false);
  const dragCounter = useRef(0);

  const handle = (file) => {
    setErr("");
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const d = JSON.parse(e.target.result);
        if (!d.questions?.length) throw new Error("No questions");
        onLoad(d);
        onClose();
      } catch { setErr("Invalid file. Please upload a valid quiz JSON."); }
    };
    reader.readAsText(file);
  };

  if (!open) return null;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "flex-end",
      justifyContent: "center", background: C.overlay, animation: "overlayFade 0.2s ease-out",
    }} onClick={onClose}>
      <div style={{
        background: C.card, borderRadius: "20px 20px 0 0", padding: "12px 24px 32px",
        width: "100%", maxWidth: 480, animation: "sheetUp 0.3s ease-out",
      }} onClick={(e) => e.stopPropagation()}
        onDragEnter={(e) => { e.preventDefault(); dragCounter.current++; setDragging(true); }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={(e) => { e.preventDefault(); dragCounter.current--; if (dragCounter.current <= 0) { dragCounter.current = 0; setDragging(false); } }}
        onDrop={(e) => { e.preventDefault(); dragCounter.current = 0; setDragging(false); e.dataTransfer.files[0] && handle(e.dataTransfer.files[0]); }}
      >
        <div style={{ width: 36, height: 4, borderRadius: 2, background: C.border, margin: "0 auto 20px" }} />
        <h3 style={{ fontSize: 18, fontWeight: 800, color: C.text, marginBottom: 16, textAlign: "center" }}>Add Quiz</h3>
        <button onClick={() => ref.current?.click()} style={{
          width: "100%", padding: "14px 24px", borderRadius: 14, border: "none",
          background: C.accent, color: "white", fontWeight: 800, fontSize: 15,
          cursor: "pointer", fontFamily: "'Nunito', sans-serif", marginBottom: 16, minHeight: 52,
          transition: "filter 0.1s, transform 0.1s",
        }}
        onMouseEnter={(e) => (e.target.style.filter = "brightness(1.05)")}
        onMouseLeave={(e) => (e.target.style.filter = "none")}
        >Choose Quiz File</button>
        <input ref={ref} type="file" accept=".json" style={{ display: "none" }}
          onChange={(e) => { if (e.target.files[0]) handle(e.target.files[0]); }} />
        <div style={{
          border: `2px dashed ${dragging ? C.accent : C.border}`, borderRadius: 12,
          padding: "24px 16px", textAlign: "center",
          background: dragging ? C.accentLight : "transparent", transition: "all 0.2s",
        }}>
          <p style={{ color: C.muted, fontSize: 14, fontWeight: 600 }}>or drag & drop a JSON file here</p>
        </div>
        {err && <p style={{ color: C.error, fontSize: 13, fontWeight: 600, marginTop: 12, textAlign: "center" }}>{err}</p>}
      </div>
    </div>
  );
}
