import { useEffect, useMemo, useRef, useState } from "react";
import { C } from "../styles/theme";
import {
  fetchCarolinaResources,
  fetchLesson,
  fetchCarolina2Prompt,
} from "../lib/api.js";
import { buildLessonContext } from "../lib/carolina2/lessonContext.js";
import { useCarolina2Voice } from "../lib/carolina2/useCarolina2Voice.js";
import Carolina2Picker from "../components/carolina2/Carolina2Picker.jsx";

const WS_URL = process.env.NEXT_PUBLIC_CAROLINA2_WS_URL || "";
const USD_PER_1K = Number(process.env.NEXT_PUBLIC_EL_USD_PER_1K ?? "0.05");

function Hud({ status, sttLatencyMs, metrics, session, mimeType }) {
  const fmt = (n) => (n === null || n === undefined ? "—" : `${n} ms`);
  return (
    <div style={{
      position: "fixed", right: 12, top: 12, borderRadius: 8,
      background: "rgba(0,0,0,0.8)", padding: "8px 12px",
      fontFamily: "monospace", fontSize: 11, color: "#86efac", zIndex: 60,
    }}>
      <div>state: {status}</div>
      <div>stt latency: <span style={{ color: "#fff" }}>{fmt(sttLatencyMs)}</span></div>
      <div>reflex first audio: <span style={{ color: "#fff" }}>{fmt(metrics?.ttfaReflex)}</span></div>
      <div>perceived: <span style={{ color: "#fde047", fontWeight: 700 }}>{fmt(metrics?.perceived)}</span></div>
      <div>opus first token: <span style={{ color: "#fff" }}>{fmt(metrics?.ttft)}</span></div>
      <div>brain first audio: <span style={{ color: "#fff" }}>{fmt(metrics?.ttfa)}</span></div>
      <div>total turn: <span style={{ color: "#fff" }}>{fmt(metrics?.total)}</span></div>
      <div style={{ borderTop: "1px solid #14532d", margin: "4px 0" }} />
      <div>
        session chars ({session?.exact ? "exact" : "est"}):{" "}
        <span style={{ color: "#fff" }}>
          {session ? session.chars.toLocaleString() : "—"}
        </span>
      </div>
      <div>
        session cost:{" "}
        <span style={{ color: "#67e8f9", fontWeight: 700 }}>
          {session ? `~$${((session.chars / 1000) * USD_PER_1K).toFixed(4)}` : "—"}
        </span>
      </div>
      <div style={{ color: "#22c55e" }}>{mimeType || "mime: —"}</div>
    </div>
  );
}

export default function Carolina2Screen() {
  const [phase, setPhase] = useState("setup"); // "setup" | "call"
  const [resources, setResources] = useState([]);
  const [selected, setSelected] = useState({}); // {lessonId:{weekNumber,title}}
  const [loadingCtx, setLoadingCtx] = useState(false);
  const [setupError, setSetupError] = useState("");

  const lessonContextRef = useRef("");
  const systemInstructionRef = useRef("");
  const voice = useCarolina2Voice(WS_URL, lessonContextRef, systemInstructionRef);
  const greetFiredRef = useRef(false);

  useEffect(() => {
    fetchCarolinaResources()
      .then(setResources)
      .catch(() => setResources([]));
  }, []);

  const selectedCount = Object.keys(selected).length;

  const toggleLesson = (lessonId, meta) => {
    setSelected((prev) => {
      const next = { ...prev };
      if (lessonId in next) delete next[lessonId];
      else next[lessonId] = meta;
      return next;
    });
  };

  const toggleWeek = (week) => {
    const ls = week.lessons || [];
    setSelected((prev) => {
      const next = { ...prev };
      const allSelected =
        ls.length > 0 && ls.every((l) => l.id in next);
      for (const l of ls) {
        if (allSelected) delete next[l.id];
        else next[l.id] = { weekNumber: week.week_number, title: l.title };
      }
      return next;
    });
  };

  const startCall = async () => {
    setSetupError("");
    setLoadingCtx(true);
    try {
      const ids = Object.keys(selected);
      const lessons = await Promise.all(
        ids.map((id) =>
          fetchLesson(id)
            .then((l) => ({
              title: l?.title || selected[id]?.title || "Lesson",
              markdown_content: l?.markdown_content || "",
            }))
            .catch(() => null),
        ),
      );
      lessonContextRef.current = buildLessonContext(
        lessons.filter(Boolean),
      );
      try {
        systemInstructionRef.current = await fetchCarolina2Prompt(
          lessonContextRef.current,
        );
      } catch {
        systemInstructionRef.current = "";
      }
    } catch {
      // Non-blocking: a call with no context is still valid.
      lessonContextRef.current = "";
      systemInstructionRef.current = "";
      setSetupError("Could not load some lessons — starting without them.");
    } finally {
      setLoadingCtx(false);
      greetFiredRef.current = false;
      setPhase("call");
    }
  };

  // On entering "call" phase, fire the opening greeting exactly once.
  // `voice` identity changes every render so we deliberately depend only on
  // `phase` and gate re-entry with the ref to avoid re-firing on each render.
  const voiceGreetRef = useRef(voice.greet);
  useEffect(() => {
    voiceGreetRef.current = voice.greet;
  });
  useEffect(() => {
    if (phase !== "call" || greetFiredRef.current) return;
    greetFiredRef.current = true;
    voiceGreetRef.current();
  }, [phase]);

  const hangup = () => {
    voice.endCall();
    greetFiredRef.current = false;
    setPhase("setup");
  };

  const pills = useMemo(
    () =>
      Object.entries(selected).map(([id, m]) => ({
        id,
        label: `Wk ${m.weekNumber}: ${m.title}`,
      })),
    [selected],
  );

  if (phase === "setup") {
    return (
      <div className="desktop-main" style={{
        minHeight: "100dvh", background: "#f0f9f7",
        fontFamily: "'Nunito', sans-serif", padding: "24px 16px 96px",
      }}>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: C.text, marginBottom: 4 }}>
            Carolina2
          </h1>
          <p style={{ color: C.muted, fontSize: 14, marginBottom: 20 }}>
            Pick the lessons or weeks you want to practise, then start a voice call.
          </p>

          {pills.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
              {pills.map((p) => (
                <span key={p.id} style={{
                  background: "#fff3e0", color: "#854F0B", borderRadius: 8,
                  padding: "4px 10px", fontSize: 12, fontWeight: 600,
                }}>
                  {p.label}
                </span>
              ))}
            </div>
          )}

          <div style={{
            background: "#fff", borderRadius: 12,
            border: "0.5px solid #e2e8e4", overflow: "hidden", marginBottom: 20,
          }}>
            <Carolina2Picker
              availableResources={resources}
              selectedIds={selected}
              onToggleLesson={toggleLesson}
              onToggleWeek={toggleWeek}
            />
          </div>

          {setupError && (
            <p style={{ color: "#dc2626", fontSize: 13, marginBottom: 12 }}>
              {setupError}
            </p>
          )}

          <button
            onClick={startCall}
            disabled={loadingCtx}
            style={{
              width: "100%", padding: 14, borderRadius: 12, border: "none",
              background: C.accent, color: "#fff", fontFamily: "'Nunito', sans-serif",
              fontSize: 16, fontWeight: 800,
              cursor: loadingCtx ? "default" : "pointer",
              opacity: loadingCtx ? 0.6 : 1,
            }}
          >
            {loadingCtx
              ? "Preparing…"
              : selectedCount > 0
                ? `Start call with ${selectedCount} lesson${selectedCount !== 1 ? "s" : ""}`
                : "Start call (no lessons)"}
          </button>
        </div>
      </div>
    );
  }

  const {
    status, userText, partial, assistantText,
    sttLatencyMs, metrics, session, errorMsg, mimeType,
    endTurn,
  } = voice;
  const isUserTurn = status === "recording";
  const isCarolinaTurn = status === "thinking" || status === "speaking" || status === "connecting";

  const statusLabel = (() => {
    if (status === "recording") return "Your turn — tap Done when finished";
    if (status === "connecting") return "Opening mic…";
    if (status === "thinking") return "Carolina is thinking…";
    if (status === "speaking") return "Carolina is speaking…";
    if (status === "error") return "Error";
    return "Starting call…";
  })();

  return (
    <div className="desktop-main" style={{
      minHeight: "100dvh", background: "#f0f9f7",
      fontFamily: "'Nunito', sans-serif",
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", gap: 32, padding: 24,
    }}>
      <Hud
        status={status}
        sttLatencyMs={sttLatencyMs}
        metrics={metrics}
        session={session}
        mimeType={mimeType}
      />

      <button
        onClick={hangup}
        style={{
          position: "fixed", left: 16, top: 16, zIndex: 60,
          background: "#fff", border: "0.5px solid #e2e8e4", borderRadius: 8,
          padding: "6px 12px", fontFamily: "'Nunito', sans-serif",
          fontSize: 13, fontWeight: 700, color: C.text, cursor: "pointer",
        }}
      >
        ← Hang up
      </button>

      <h1 style={{ fontSize: 18, fontWeight: 800, color: C.text, textAlign: "center" }}>
        Carolina2
        <span style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.muted }}>
          Strict turns · Carolina greets first, then your turn
        </span>
      </h1>

      <div
        aria-live="polite"
        style={{
          height: 176, width: 176, borderRadius: "50%",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", fontSize: 15, fontWeight: 800, textAlign: "center",
          padding: 24, lineHeight: 1.3,
          boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
          background: isUserTurn
            ? "#16a34a"
            : isCarolinaTurn
              ? "#f59e0b"
              : C.accent,
        }}
      >
        {isUserTurn
          ? "🎤 Your turn"
          : status === "speaking"
            ? "🗣️ Carolina"
            : status === "thinking"
              ? "🤔 Thinking"
              : status === "connecting"
                ? "Connecting"
                : "…"}
      </div>

      <p style={{ color: C.muted, fontSize: 14, textAlign: "center", margin: 0 }}>
        {statusLabel}
      </p>

      {isUserTurn && (
        <button
          type="button"
          onClick={endTurn}
          style={{
            padding: "14px 28px", borderRadius: 999, border: "none",
            background: "#16a34a", color: "#fff",
            fontFamily: "'Nunito', sans-serif",
            fontSize: 16, fontWeight: 800, cursor: "pointer",
            boxShadow: "0 4px 14px rgba(22,163,74,0.4)",
          }}
        >
          ✓ Done speaking
        </button>
      )}

      {errorMsg && (
        <p style={{ color: "#dc2626", fontSize: 14, maxWidth: 420, textAlign: "center" }}>
          {errorMsg}
        </p>
      )}

      <div style={{
        minHeight: 96, maxWidth: 560, width: "100%", textAlign: "center",
        fontSize: 17, lineHeight: 1.5,
      }}>
        {(userText || partial) && (
          <p>
            {userText && <span style={{ fontWeight: 700, color: "#000" }}>{userText}</span>}
            {partial && <span style={{ fontStyle: "italic", color: "#9ca3af" }}> {partial}</span>}
          </p>
        )}
        {assistantText && <p style={{ color: "#9f1239" }}>{assistantText}</p>}
      </div>
    </div>
  );
}
