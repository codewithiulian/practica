import { useState, useRef, useEffect, useMemo, useCallback } from "react";

// ═══════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════
const injectStyles = () => {
  if (document.getElementById("sq-styles")) return;
  const s = document.createElement("style");
  s.id = "sq-styles";
  s.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Figtree:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #FAF7F2; font-family: 'Figtree', system-ui, sans-serif; color: #2C2420; -webkit-font-smoothing: antialiased; }
    h1, h2, h3, h4 { font-family: 'DM Serif Display', Georgia, serif; font-weight: 400; }
    .fade-in { animation: fadeIn 0.4s ease-out both; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes scoreReveal { from { stroke-dashoffset: 339.292; } }
    @keyframes countUp { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } }
    .score-anim { animation: countUp 0.6s 0.5s ease-out both; }
    input[type="text"], textarea { font-family: 'Figtree', system-ui, sans-serif; }
    ::placeholder { color: #B5ADA6; }
  `;
  document.head.appendChild(s);
};

const C = {
  bg: "#FAF7F2", card: "#FFFFFF", accent: "#B8622D", accentLight: "#F5EDE6",
  accentHover: "#9E5324", text: "#2C2420", muted: "#8C7E76", success: "#2A7D5F",
  successLight: "#EBF5EE", error: "#B84040", errorLight: "#FDEDEE",
  border: "#E8E2DC", inputBg: "#FDFCFA",
};

// ═══════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════
const norm = (s) =>
  (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[¿¡.,!?;:'"]/g, "").replace(/\s+/g, " ").trim();

const levenshtein = (a, b) => {
  const m = a.length, n = b.length;
  const d = Array.from({ length: m + 1 }, (_, i) => [i]);
  for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] !== b[j - 1] ? 1 : 0));
  return d[m][n];
};

const fuzzyMatch = (input, target, threshold) => {
  const a = norm(input), b = norm(target);
  if (a === b) return true;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return true;
  const dist = levenshtein(a, b);
  return dist <= (threshold !== undefined ? threshold : Math.max(2, Math.floor(maxLen * 0.12)));
};

const grade = (q, a) => {
  if (!a || a.skipped) return { correct: false };
  switch (q.type) {
    case "fill_blank": {
      const res = (q.accept || []).map((acc, i) =>
        (acc || []).some((x) => fuzzyMatch(a.blanks?.[i] || "", x, Math.max(1, Math.floor(norm(x).length * 0.15))))
      );
      return { correct: res.every(Boolean), blanksCorrect: res };
    }
    case "multiple_choice":
      return { correct: a.selected === q.answer };
    case "translate":
      return { correct: (q.accept || []).some((x) => fuzzyMatch(a.text || "", x)) };
    case "classify": {
      const map = {};
      Object.entries(q.categories).forEach(([cat, items]) => items.forEach((item) => (map[norm(item)] = cat)));
      const total = Object.values(q.categories).flat().length;
      const placed = Object.entries(a.placements || {}).flatMap(([cat, items]) => items.map((it) => ({ it, cat })));
      return { correct: placed.length === total && placed.every(({ it, cat }) => map[norm(it)] === cat) };
    }
    default:
      return { correct: false };
  }
};

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};

const typeLabels = { fill_blank: "Fill in the Blanks", multiple_choice: "Multiple Choice", translate: "Translate", classify: "Classify" };

// ═══════════════════════════════════════════════════════════════
// UPLOAD SCREEN
// ═══════════════════════════════════════════════════════════════
function UploadScreen({ onLoad }) {
  const [err, setErr] = useState("");
  const [dragging, setDragging] = useState(false);
  const ref = useRef();

  const handle = (file) => {
    setErr("");
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const d = JSON.parse(e.target.result);
        if (!d.questions?.length) throw new Error("No questions found");
        onLoad(d);
      } catch { setErr("Invalid file. Please upload a valid quiz JSON file."); }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fade-in" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ maxWidth: 440, width: "100%", textAlign: "center" }}>
        <div style={{ fontSize: 56, marginBottom: 8 }}>📖</div>
        <h1 style={{ fontSize: 36, color: C.text, marginBottom: 8, letterSpacing: "-0.5px" }}>Práctica</h1>
        <p style={{ color: C.muted, fontSize: 16, marginBottom: 36, lineHeight: 1.5 }}>
          Upload a quiz file to start your Spanish practice session
        </p>
        <div
          onClick={() => ref.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); e.dataTransfer.files[0] && handle(e.dataTransfer.files[0]); }}
          style={{
            border: `2px dashed ${dragging ? C.accent : C.border}`,
            borderRadius: 16, padding: "48px 24px", cursor: "pointer",
            background: dragging ? C.accentLight : "transparent",
            transition: "all 0.25s ease",
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 8, opacity: 0.7 }}>📄</div>
          <p style={{ fontWeight: 600, color: C.text, marginBottom: 4 }}>Drop your quiz file here</p>
          <p style={{ color: C.muted, fontSize: 13 }}>or click to browse · JSON format</p>
          <input ref={ref} type="file" accept=".json" style={{ display: "none" }} onChange={(e) => e.target.files[0] && handle(e.target.files[0])} />
        </div>
        {err && <p style={{ color: C.error, fontSize: 13, marginTop: 16 }}>{err}</p>}
        <p style={{ color: C.muted, fontSize: 12, marginTop: 32, lineHeight: 1.6 }}>
          Quiz files contain questions generated from your lesson PDFs.
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// QUESTION COMPONENTS
// ═══════════════════════════════════════════════════════════════
function FillBlank({ q, value, onChange }) {
  const blanks = value?.blanks || [];
  const parts = q.prompt.split(/(___+)/);
  let idx = 0;

  const update = (i, v) => {
    const nb = [...blanks];
    nb[i] = v;
    onChange({ blanks: nb });
  };

  return (
    <div>
      <div style={{ fontSize: 18, lineHeight: 2.2, marginBottom: 8 }}>
        {parts.map((p, pi) => {
          if (/^___+$/.test(p)) {
            const ci = idx++;
            return (
              <input
                key={pi} type="text" value={blanks[ci] || ""} onChange={(e) => update(ci, e.target.value)}
                placeholder="..." autoComplete="off"
                style={{
                  display: "inline-block", border: "none", borderBottom: `2px solid ${C.accent}`,
                  background: "transparent", padding: "2px 6px", margin: "0 3px", textAlign: "center",
                  color: C.accent, fontWeight: 600, outline: "none", minWidth: 90, fontSize: "inherit",
                  lineHeight: "inherit", fontFamily: "'Figtree', sans-serif",
                }}
                onFocus={(e) => (e.target.style.borderColor = C.accentHover)}
                onBlur={(e) => (e.target.style.borderColor = C.accent)}
              />
            );
          }
          return <span key={pi}>{p}</span>;
        })}
      </div>
      {q.hint && <p style={{ color: C.muted, fontSize: 13, fontStyle: "italic", marginTop: 12 }}>💡 {q.hint}</p>}
    </div>
  );
}

function MultiChoice({ q, value, onChange }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {q.options.map((opt, i) => (
        <div
          key={i} onClick={() => onChange({ selected: i })}
          style={{
            padding: "14px 20px", borderRadius: 12, cursor: "pointer", transition: "all 0.2s",
            border: `1.5px solid ${value?.selected === i ? C.accent : C.border}`,
            background: value?.selected === i ? C.accentLight : C.card,
            color: value?.selected === i ? C.accent : C.text,
            fontWeight: value?.selected === i ? 600 : 400, fontSize: 15,
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 24, height: 24, borderRadius: "50%", border: `1.5px solid ${value?.selected === i ? C.accent : C.border}`, marginRight: 12, fontSize: 12, fontWeight: 700, background: value?.selected === i ? C.accent : "transparent", color: value?.selected === i ? "white" : C.muted }}>
            {String.fromCharCode(65 + i)}
          </span>
          {opt}
        </div>
      ))}
    </div>
  );
}

function Translate({ q, value, onChange }) {
  return (
    <div>
      {q.direction && <p style={{ color: C.muted, fontSize: 13, marginBottom: 12, fontWeight: 500 }}>{q.direction}</p>}
      <textarea
        value={value?.text || ""} onChange={(e) => onChange({ text: e.target.value })}
        placeholder="Type your translation here..."
        rows={3}
        style={{
          width: "100%", padding: 16, borderRadius: 12, border: `1.5px solid ${C.border}`,
          background: C.inputBg, fontSize: 16, resize: "vertical", outline: "none",
          lineHeight: 1.6, color: C.text, transition: "border-color 0.2s",
        }}
        onFocus={(e) => (e.target.style.borderColor = C.accent)}
        onBlur={(e) => (e.target.style.borderColor = C.border)}
      />
      {q.hint && <p style={{ color: C.muted, fontSize: 13, fontStyle: "italic", marginTop: 10 }}>💡 {q.hint}</p>}
    </div>
  );
}

function Classify({ q, value, onChange }) {
  const allItems = useMemo(() => shuffle(Object.values(q.categories).flat()), [q]);
  const placements = value?.placements || {};
  const selected = value?._selected || null;
  const placed = Object.values(placements).flat();
  const unplaced = allItems.filter((it) => !placed.includes(it));

  const selectItem = (item) => {
    onChange({ ...value, placements, _selected: selected === item ? null : item });
  };

  const placeInCategory = (cat) => {
    if (!selected) return;
    const np = { ...placements };
    // Remove from any category first
    Object.keys(np).forEach((k) => (np[k] = (np[k] || []).filter((x) => x !== selected)));
    np[cat] = [...(np[cat] || []), selected];
    onChange({ placements: np, _selected: null });
  };

  const removeFromCategory = (item, cat) => {
    const np = { ...placements };
    np[cat] = (np[cat] || []).filter((x) => x !== item);
    onChange({ ...value, placements: np, _selected: null });
  };

  const chipStyle = (isSelected) => ({
    display: "inline-flex", alignItems: "center", padding: "7px 16px", borderRadius: 999,
    fontSize: 14, fontWeight: 500, cursor: "pointer", transition: "all 0.2s", userSelect: "none",
    border: `1.5px solid ${isSelected ? C.accent : C.border}`,
    background: isSelected ? C.accentLight : C.card,
    color: isSelected ? C.accent : C.text,
  });

  return (
    <div>
      {unplaced.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
          {unplaced.map((item) => (
            <span key={item} onClick={() => selectItem(item)} style={chipStyle(selected === item)}>{item}</span>
          ))}
        </div>
      )}
      {selected && <p style={{ color: C.accent, fontSize: 13, marginBottom: 12, fontWeight: 500 }}>👆 Now click a category below to place "{selected}"</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {Object.keys(q.categories).map((cat) => (
          <div key={cat}>
            <div
              onClick={() => placeInCategory(cat)}
              style={{
                border: `1.5px ${(placements[cat]?.length) ? "solid" : "dashed"} ${selected ? C.accent : C.border}`,
                borderRadius: 12, padding: 14, minHeight: 56, cursor: selected ? "pointer" : "default",
                transition: "all 0.2s", background: selected ? C.accentLight + "44" : "transparent",
              }}
            >
              <p style={{ fontSize: 13, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: (placements[cat]?.length) ? 10 : 0 }}>{cat}</p>
              {(placements[cat]?.length > 0) && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {placements[cat].map((item) => (
                    <span key={item} onClick={(e) => { e.stopPropagation(); removeFromCategory(item, cat); }}
                      style={{ ...chipStyle(false), background: C.accentLight, borderColor: C.accent, color: C.accent, fontSize: 13 }}>
                      {item} ×
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// QUIZ SCREEN
// ═══════════════════════════════════════════════════════════════
function QuizScreen({ data, onFinish }) {
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [key, setKey] = useState(0);
  const q = data.questions[idx];
  const total = data.questions.length;
  const ans = answers[idx];

  const setAnswer = (a) => setAnswers((p) => ({ ...p, [idx]: a }));

  const canProceed = () => {
    if (!ans) return false;
    switch (q.type) {
      case "fill_blank": return (ans.blanks || []).some((b) => b?.trim());
      case "multiple_choice": return ans.selected !== undefined;
      case "translate": return !!ans.text?.trim();
      case "classify": return Object.values(ans.placements || {}).flat().length > 0;
      default: return false;
    }
  };

  const next = () => {
    if (idx < total - 1) { setIdx(idx + 1); setKey((k) => k + 1); }
    else onFinish(answers);
  };

  const skip = () => {
    setAnswers((p) => ({ ...p, [idx]: { skipped: true } }));
    if (idx < total - 1) { setIdx(idx + 1); setKey((k) => k + 1); }
    else onFinish({ ...answers, [idx]: { skipped: true } });
  };

  const QComponent = { fill_blank: FillBlank, multiple_choice: MultiChoice, translate: Translate, classify: Classify }[q.type];

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", padding: "32px 20px" }}>
      <div style={{ maxWidth: 580, width: "100%" }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: C.muted }}>{idx + 1} / {total}</span>
            <span style={{ fontSize: 12, color: C.accent, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
              {typeLabels[q.type] || q.type}
            </span>
          </div>
          <div style={{ height: 4, background: C.border, borderRadius: 2, overflow: "hidden" }}>
            <div style={{ height: "100%", background: C.accent, borderRadius: 2, transition: "width 0.4s ease", width: `${((idx + 1) / total) * 100}%` }} />
          </div>
        </div>

        {/* Question Card */}
        <div key={key} className="fade-in" style={{
          background: C.card, border: `1px solid ${C.border}`, borderRadius: 20,
          padding: "36px 32px", boxShadow: "0 1px 3px rgba(44,36,32,0.04), 0 6px 16px rgba(44,36,32,0.03)",
        }}>
          <h2 style={{ fontSize: 22, lineHeight: 1.4, marginBottom: 28, color: C.text }}>{q.prompt.includes("___") && q.type === "fill_blank" ? "" : q.prompt}</h2>
          {QComponent && <QComponent q={q} value={ans} onChange={setAnswer} />}
        </div>

        {/* Navigation */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 24 }}>
          <button onClick={skip} style={{
            background: "transparent", border: "none", color: C.muted, fontSize: 14,
            fontWeight: 500, cursor: "pointer", padding: "8px 0", fontFamily: "'Figtree', sans-serif",
          }}>
            Skip →
          </button>
          <button
            onClick={next} disabled={!canProceed()}
            style={{
              background: canProceed() ? C.accent : C.border, color: "white", border: "none",
              padding: "13px 36px", borderRadius: 12, fontWeight: 600, fontSize: 15,
              cursor: canProceed() ? "pointer" : "not-allowed", transition: "all 0.2s",
              fontFamily: "'Figtree', sans-serif", opacity: canProceed() ? 1 : 0.5,
            }}
            onMouseEnter={(e) => canProceed() && (e.target.style.background = C.accentHover)}
            onMouseLeave={(e) => canProceed() && (e.target.style.background = C.accent)}
          >
            {idx === total - 1 ? "Finish" : "Next"}
          </button>
        </div>

        {/* Meta */}
        {data.meta?.title && (
          <p style={{ textAlign: "center", color: C.muted, fontSize: 12, marginTop: 32, opacity: 0.6 }}>
            {data.meta.title}
          </p>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SCORE SCREEN
// ═══════════════════════════════════════════════════════════════
function ScoreScreen({ data, answers, overrides, onReview, onRestart }) {
  const results = data.questions.map((q, i) => grade(q, answers[i]));
  const effectiveResults = results.map((r, i) => overrides[i] ? { correct: true } : r);
  const correct = effectiveResults.filter((r) => r.correct).length;
  const total = data.questions.length;
  const pct = Math.round((correct / total) * 100);
  const circ = 2 * Math.PI * 54;
  const hasOverrides = Object.keys(overrides).length > 0;

  const msg = pct >= 90 ? ["¡Excelente!", "🎉"] : pct >= 70 ? ["¡Muy bien!", "👏"] : pct >= 50 ? ["¡Buen esfuerzo!", "💪"] : ["¡Sigue practicando!", "📚"];

  return (
    <div className="fade-in" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ maxWidth: 400, width: "100%", textAlign: "center" }}>
        {/* Score Circle */}
        <div style={{ position: "relative", display: "inline-block", marginBottom: 24 }}>
          <svg width="140" height="140" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="54" fill="none" stroke={C.border} strokeWidth="6" />
            <circle
              cx="60" cy="60" r="54" fill="none" stroke={pct >= 70 ? C.success : pct >= 50 ? C.accent : C.error}
              strokeWidth="6" strokeLinecap="round"
              strokeDasharray={circ} strokeDashoffset={circ - (pct / 100) * circ}
              transform="rotate(-90 60 60)"
              style={{ animation: "scoreReveal 1s ease-out forwards" }}
            />
          </svg>
          <div className="score-anim" style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}>
            <div style={{ fontSize: 36, fontWeight: 700, color: C.text, fontFamily: "'DM Serif Display', serif" }}>{pct}%</div>
          </div>
        </div>

        <div style={{ fontSize: 48, marginBottom: 8 }}>{msg[1]}</div>
        <h1 style={{ fontSize: 32, marginBottom: 8, color: C.text }}>{msg[0]}</h1>
        <p style={{ color: C.muted, fontSize: 16, marginBottom: 32 }}>
          {correct} of {total} correct{hasOverrides ? " (inc. overrides)" : ""}
        </p>

        {/* Type breakdown */}
        <div style={{ display: "flex", justifyContent: "center", gap: 16, marginBottom: 36, flexWrap: "wrap" }}>
          {Object.entries(
            data.questions.reduce((acc, q, i) => {
              const t = typeLabels[q.type] || q.type;
              if (!acc[t]) acc[t] = { correct: 0, total: 0 };
              acc[t].total++;
              if (effectiveResults[i].correct) acc[t].correct++;
              return acc;
            }, {})
          ).map(([type, stats]) => (
            <div key={type} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "10px 16px", fontSize: 13 }}>
              <div style={{ fontWeight: 600, color: C.text }}>{stats.correct}/{stats.total}</div>
              <div style={{ color: C.muted, fontSize: 11 }}>{type}</div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button onClick={() => onReview(results)} style={{
            background: C.accent, color: "white", border: "none", padding: "14px 32px",
            borderRadius: 12, fontWeight: 600, fontSize: 15, cursor: "pointer",
            fontFamily: "'Figtree', sans-serif", transition: "background 0.2s",
          }}>
            Review Answers
          </button>
          <button onClick={onRestart} style={{
            background: "transparent", color: C.text, border: `1.5px solid ${C.border}`,
            padding: "13px 32px", borderRadius: 12, fontWeight: 600, fontSize: 15,
            cursor: "pointer", fontFamily: "'Figtree', sans-serif",
          }}>
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// REVIEW SCREEN
// ═══════════════════════════════════════════════════════════════
function ReviewScreen({ data, answers, results, overrides, onOverride, onBack }) {
  const effectiveResults = results.map((r, i) => overrides[i] ? { correct: true } : r);
  const correct = effectiveResults.filter((r) => r.correct).length;

  const renderUserAnswer = (q, a) => {
    if (!a || a.skipped) return <em style={{ color: C.muted }}>Skipped</em>;
    switch (q.type) {
      case "fill_blank":
        return (a.blanks || []).map((b, i) => (
          <span key={i} style={{
            display: "inline-block", padding: "3px 10px", borderRadius: 6, marginRight: 6, marginBottom: 4, fontSize: 14,
            background: results[data.questions.indexOf(q)]?.blanksCorrect?.[i] ? C.successLight : C.errorLight,
            color: results[data.questions.indexOf(q)]?.blanksCorrect?.[i] ? C.success : C.error,
            fontWeight: 600,
          }}>
            {b || "(empty)"}
          </span>
        ));
      case "multiple_choice":
        return <span style={{ fontWeight: 500 }}>{q.options[a.selected] || "(none)"}</span>;
      case "translate":
        return <span style={{ fontWeight: 500 }}>{a.text || "(empty)"}</span>;
      case "classify":
        return Object.entries(a.placements || {}).map(([cat, items]) => (
          items.length > 0 && <div key={cat} style={{ marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>{cat}: </span>
            <span style={{ fontSize: 14 }}>{items.join(", ")}</span>
          </div>
        ));
      default: return null;
    }
  };

  const renderCorrectAnswer = (q) => {
    switch (q.type) {
      case "fill_blank":
        return (q.blanks || []).map((b, i) => (
          <span key={i} style={{ display: "inline-block", padding: "3px 10px", borderRadius: 6, marginRight: 6, background: C.successLight, color: C.success, fontWeight: 600, fontSize: 14 }}>{b}</span>
        ));
      case "multiple_choice":
        return <span style={{ fontWeight: 500 }}>{q.options[q.answer]}</span>;
      case "translate":
        return <span style={{ fontWeight: 500 }}>{(q.accept || []).join(" / ")}</span>;
      case "classify":
        return Object.entries(q.categories).map(([cat, items]) => (
          <div key={cat} style={{ marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>{cat}: </span>
            <span style={{ fontSize: 14 }}>{items.join(", ")}</span>
          </div>
        ));
      default: return null;
    }
  };

  return (
    <div className="fade-in" style={{ minHeight: "100vh", padding: "32px 20px" }}>
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 28, color: C.text }}>Review</h1>
            <p style={{ color: C.muted, fontSize: 14 }}>{correct}/{data.questions.length} correct</p>
          </div>
          <button onClick={onBack} style={{
            background: C.accent, color: "white", border: "none", padding: "10px 24px",
            borderRadius: 10, fontWeight: 600, fontSize: 14, cursor: "pointer",
            fontFamily: "'Figtree', sans-serif",
          }}>
            ← Back
          </button>
        </div>

        {/* Questions */}
        {data.questions.map((q, i) => {
          const r = effectiveResults[i];
          const wasOverridden = overrides[i];
          const wasOriginallyWrong = !results[i].correct;
          return (
            <div key={i} style={{
              background: C.card, borderRadius: 14, padding: "22px 24px", marginBottom: 14,
              border: `1px solid ${C.border}`, borderLeft: `4px solid ${r.correct ? C.success : C.error}`,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: C.muted }}>Q{i + 1} · {typeLabels[q.type]}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: r.correct ? C.success : C.error }}>
                  {wasOverridden ? "✓ Overridden" : r.correct ? "✓ Correct" : "✗ Incorrect"}
                </span>
              </div>
              <p style={{ fontSize: 16, fontWeight: 500, lineHeight: 1.5, marginBottom: 14, color: C.text }}>
                {q.prompt.replace(/___+/g, "______")}
              </p>

              {wasOriginallyWrong && (
                <div style={{ marginBottom: 10, padding: "10px 14px", borderRadius: 10, background: wasOverridden ? C.successLight : C.errorLight }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: wasOverridden ? C.success : C.error, marginBottom: 4 }}>Your answer:</p>
                  <div style={{ color: wasOverridden ? C.success : C.error }}>{renderUserAnswer(q, answers[i])}</div>
                </div>
              )}

              <div style={{ padding: "10px 14px", borderRadius: 10, background: C.successLight }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: C.success, marginBottom: 4 }}>Correct answer:</p>
                <div style={{ color: C.success }}>{renderCorrectAnswer(q)}</div>
              </div>

              {q.explanation && (
                <p style={{ fontSize: 13, color: C.muted, marginTop: 10, lineHeight: 1.5, fontStyle: "italic" }}>
                  💡 {q.explanation}
                </p>
              )}

              {/* Override button — only for originally wrong, non-multiple-choice */}
              {wasOriginallyWrong && !wasOverridden && q.type !== "multiple_choice" && (
                <button onClick={() => onOverride(i)} style={{
                  marginTop: 12, background: "transparent", border: `1.5px solid ${C.border}`,
                  borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600,
                  color: C.muted, cursor: "pointer", fontFamily: "'Figtree', sans-serif",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => { e.target.style.borderColor = C.success; e.target.style.color = C.success; }}
                onMouseLeave={(e) => { e.target.style.borderColor = C.border; e.target.style.color = C.muted; }}
                >
                  ✓ My answer was correct
                </button>
              )}
              {wasOverridden && (
                <button onClick={() => onOverride(i, false)} style={{
                  marginTop: 12, background: "transparent", border: `1.5px solid ${C.border}`,
                  borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 500,
                  color: C.muted, cursor: "pointer", fontFamily: "'Figtree', sans-serif",
                }}>
                  Undo override
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════
export default function App() {
  const [screen, setScreen] = useState("upload");
  const [data, setData] = useState(null);
  const [answers, setAnswers] = useState(null);
  const [results, setResults] = useState(null);
  const [overrides, setOverrides] = useState({});

  useEffect(() => { injectStyles(); }, []);

  const handleLoad = (d) => { setData(d); setScreen("quiz"); };
  const handleFinish = (ans) => { setAnswers(ans); setOverrides({}); setScreen("score"); };
  const handleReview = (res) => { setResults(res); setScreen("review"); };
  const handleRestart = () => { setAnswers(null); setResults(null); setOverrides({}); setScreen("quiz"); };
  const handleOverride = (idx, value = true) => {
    setOverrides((p) => {
      const n = { ...p };
      if (value) n[idx] = true; else delete n[idx];
      return n;
    });
  };

  switch (screen) {
    case "upload": return <UploadScreen onLoad={handleLoad} />;
    case "quiz": return <QuizScreen data={data} onFinish={handleFinish} />;
    case "score": return <ScoreScreen data={data} answers={answers} overrides={overrides} onReview={handleReview} onRestart={handleRestart} />;
    case "review": return <ReviewScreen data={data} answers={answers} results={results} overrides={overrides} onOverride={handleOverride} onBack={() => setScreen("score")} />;
    default: return null;
  }
}
