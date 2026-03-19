import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { C } from "../styles/theme";

export default function DialogScreen() {
  const navigate = useNavigate();
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [messages, setMessages] = useState([]);
  const [correction, setCorrection] = useState(null);
  const [currentUnit, setCurrentUnit] = useState("");
  const [availableUnits, setAvailableUnits] = useState([]);
  const [selectedUnit, setSelectedUnit] = useState("");
  const [error, setError] = useState(null);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const audioRef = useRef(null);
  const audioUnlockedRef = useRef(false);
  const scrollRef = useRef(null);

  // Discover available unit files
  useEffect(() => {
    const units = [];
    const checkUnit = async (i) => {
      const num = String(i).padStart(2, "0");
      try {
        const res = await fetch(`/units/unit-${num}.txt`, { method: "HEAD" });
        if (res.ok) {
          units.push(`unit-${num}`);
          return true;
        }
      } catch {}
      return false;
    };

    (async () => {
      for (let i = 1; i <= 20; i++) {
        const found = await checkUnit(i);
        if (!found) break;
      }
      setAvailableUnits(units);
      if (units.length > 0) {
        setSelectedUnit(units[0]);
        const res = await fetch(`/units/${units[0]}.txt`);
        if (res.ok) setCurrentUnit(await res.text());
      }
    })();
  }, []);

  // Load unit context when selection changes
  const handleUnitChange = async (unitId) => {
    setSelectedUnit(unitId);
    try {
      const res = await fetch(`/units/${unitId}.txt`);
      if (res.ok) setCurrentUnit(await res.text());
    } catch {}
  };

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, correction, isProcessing]);

  // Unlock audio on iOS (must be triggered by user gesture)
  const unlockAudio = () => {
    if (audioUnlockedRef.current) return;
    const a = audioRef.current;
    if (a) {
      a.src = "data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAABhgC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAAYYoRBqSAAAAAAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAABhgC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAAYYoRBqSAAAAAAAAAAAAAAAAAAAA";
      a.play().catch(() => {});
      audioUnlockedRef.current = true;
    }
  };

  const getMimeType = () => {
    if (typeof MediaRecorder === "undefined") return null;
    if (MediaRecorder.isTypeSupported("audio/mp4")) return "audio/mp4";
    if (MediaRecorder.isTypeSupported("audio/webm")) return "audio/webm";
    if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) return "audio/webm;codecs=opus";
    return null;
  };

  const startRecording = async () => {
    setError(null);
    unlockAudio();

    const mimeType = getMimeType();
    if (!mimeType) {
      setError("Your browser doesn't support audio recording.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        processPipeline(blob, mimeType);
      };

      recorder.start();
      setIsRecording(true);
    } catch (e) {
      if (e.name === "NotAllowedError") {
        setError("Microphone access denied. Please enable it in your device settings.");
      } else {
        setError("Could not access microphone.");
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsProcessing(true);
    }
  };

  const handleMicTap = () => {
    if (isProcessing) return;
    if (isRecording) stopRecording();
    else startRecording();
  };

  const processPipeline = async (audioBlob, mimeType) => {
    try {
      // Step 1: STT
      const contentType = mimeType.split(";")[0]; // strip codecs
      const sttRes = await fetch("/api/stt", {
        method: "POST",
        headers: { "Content-Type": contentType },
        body: audioBlob,
      });
      const sttData = await sttRes.json();
      if (!sttRes.ok || !sttData.text) {
        setError(sttData.error || "Could not transcribe audio.");
        setIsProcessing(false);
        return;
      }

      const userText = sttData.text;
      const newMessages = [...messages, { role: "user", text: userText }];
      setMessages(newMessages);

      // Step 2: Chat
      const chatHistory = newMessages.map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.text,
      }));

      const chatRes = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: chatHistory, unitContext: currentUnit }),
      });
      const chatData = await chatRes.json();
      if (!chatRes.ok || !chatData.reply) {
        setError(chatData.error || "Could not get response.");
        setIsProcessing(false);
        return;
      }

      setMessages((prev) => [...prev, { role: "assistant", text: chatData.reply }]);
      setCorrection(chatData.correction || null);

      // Step 3: TTS
      const ttsRes = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: chatData.reply }),
      });

      if (ttsRes.ok) {
        const audioBlob = await ttsRes.blob();
        const url = URL.createObjectURL(audioBlob);
        if (audioRef.current) {
          audioRef.current.src = url;
          audioRef.current.play().catch(() => {});
        }
      }

      setIsProcessing(false);
    } catch (e) {
      setError("Something went wrong. Please try again.");
      setIsProcessing(false);
    }
  };

  // Cleanup stream on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const unitLabel = (id) => {
    const num = parseInt(id.replace("unit-", ""), 10);
    return `Unit ${num}`;
  };

  return (
    <div className="fade-in" style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div className="safe-top" style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 20,
        background: C.bg, padding: "16px 20px 12px",
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={() => navigate("/")} style={{
            background: "none", border: "none", cursor: "pointer", padding: 4,
            minWidth: 44, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.text} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <h1 style={{ fontSize: 20, fontWeight: 900, color: C.text }}>Hablar</h1>
        </div>

        {availableUnits.length > 0 && (
          <select
            value={selectedUnit}
            onChange={(e) => handleUnitChange(e.target.value)}
            style={{
              padding: "6px 12px", borderRadius: 10, border: `2px solid ${C.accent}`,
              background: C.accent, color: "#fff", fontSize: 13, fontWeight: 700,
              fontFamily: "'Nunito', sans-serif", cursor: "pointer",
              appearance: "none", WebkitAppearance: "none",
              paddingRight: 28, backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
              backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center",
            }}
          >
            {availableUnits.map((u) => (
              <option key={u} value={u}>{unitLabel(u)}</option>
            ))}
          </select>
        )}
      </div>

      {/* Spacer for fixed header */}
      <div style={{ height: 72 }} className="safe-top" />

      {/* Messages area */}
      <div ref={scrollRef} style={{
        flex: 1, overflowY: "auto", padding: "8px 16px 16px",
        maxWidth: 520, margin: "0 auto", width: "100%",
      }}>
        {messages.length === 0 && !isProcessing && (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.8 }}>🎙️</div>
            <p style={{ color: C.text, fontSize: 17, fontWeight: 800, marginBottom: 6 }}>Ready to practice!</p>
            <p style={{ color: C.muted, fontSize: 14, fontWeight: 600, lineHeight: 1.6 }}>
              Tap the mic and speak in Spanish.
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} style={{ marginBottom: 12 }}>
            <div style={{
              display: "flex",
              justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
              alignItems: "flex-end",
              gap: 8,
            }}>
              {msg.role === "assistant" && (
                <div style={{
                  width: 32, height: 32, borderRadius: "50%", background: C.accentLight,
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="23" />
                    <line x1="8" y1="23" x2="16" y2="23" />
                  </svg>
                </div>
              )}
              <div style={{
                maxWidth: "75%",
                padding: "10px 14px",
                borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                background: msg.role === "user" ? C.accent : C.card,
                color: msg.role === "user" ? "#fff" : C.text,
                fontSize: 15, fontWeight: 600, lineHeight: 1.5,
                boxShadow: msg.role === "assistant" ? "0 1px 4px rgba(0,60,50,0.06)" : "none",
              }}>
                {msg.text}
              </div>
            </div>

            {/* Correction — show under assistant messages */}
            {msg.role === "assistant" && i === messages.length - 1 && correction && (
              <div style={{
                marginLeft: 40, marginTop: 6, padding: "6px 12px",
                background: "#FFFBEB", borderRadius: 10, border: "1px solid #F5D680",
                fontSize: 13, fontWeight: 600, color: "#92400E",
                fontStyle: "italic", lineHeight: 1.5,
              }}>
                ✓ {correction}
              </div>
            )}
          </div>
        ))}

        {/* Processing indicator */}
        {isProcessing && (
          <div style={{
            display: "flex", alignItems: "flex-end", gap: 8, marginBottom: 12,
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%", background: C.accentLight,
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            </div>
            <div style={{
              padding: "10px 18px", borderRadius: "16px 16px 16px 4px",
              background: C.card, boxShadow: "0 1px 4px rgba(0,60,50,0.06)",
              display: "flex", gap: 4, alignItems: "center",
            }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{
                  width: 8, height: 8, borderRadius: "50%", background: C.accent,
                  opacity: 0.5,
                  animation: `dotPulse 1.2s ${i * 0.2}s infinite ease-in-out`,
                }} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Error toast */}
      {error && (
        <div style={{
          position: "fixed", bottom: 180, left: "50%", transform: "translateX(-50%)",
          background: C.errorLight, border: `1px solid ${C.error}`, borderRadius: 12,
          padding: "10px 16px", fontSize: 13, fontWeight: 700, color: "#B91C45",
          maxWidth: 340, textAlign: "center", zIndex: 30,
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        }}>
          {error}
          <button onClick={() => setError(null)} style={{
            background: "none", border: "none", color: "#B91C45", fontWeight: 800,
            marginLeft: 8, cursor: "pointer", fontSize: 13,
          }}>✕</button>
        </div>
      )}

      {/* Mic button area */}
      <div style={{
        padding: "16px 20px 32px", textAlign: "center",
        paddingBottom: "max(32px, env(safe-area-inset-bottom, 32px))",
      }}>
        {isRecording && (
          <div style={{ marginBottom: 12 }}>
            {/* Audio waveform bars */}
            <div style={{ display: "flex", justifyContent: "center", gap: 3, marginBottom: 8, height: 28 }}>
              {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                <div key={i} style={{
                  width: 4, borderRadius: 2, background: C.error,
                  animation: `waveBar 0.8s ${i * 0.1}s infinite ease-in-out alternate`,
                }} />
              ))}
            </div>
            <p style={{ color: C.error, fontSize: 13, fontWeight: 700 }}>
              Recording... tap to stop
            </p>
          </div>
        )}

        {!isRecording && !isProcessing && messages.length > 0 && (
          <p style={{ color: C.muted, fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
            Tap to speak
          </p>
        )}

        <button
          onClick={handleMicTap}
          disabled={isProcessing}
          style={{
            width: 72, height: 72, borderRadius: "50%", border: "none",
            cursor: isProcessing ? "default" : "pointer",
            background: isRecording ? C.error : isProcessing ? C.muted : C.accent,
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            transition: "transform 0.15s, background 0.2s",
            transform: isRecording ? "scale(1.1)" : "scale(1)",
            boxShadow: isRecording
              ? `0 0 0 8px ${C.errorLight}, 0 4px 20px rgba(255,101,132,0.3)`
              : `0 4px 16px rgba(0,180,160,0.25)`,
            opacity: isProcessing ? 0.5 : 1,
          }}
        >
          {isRecording ? (
            // Stop icon
            <div style={{ width: 22, height: 22, borderRadius: 4, background: "#fff" }} />
          ) : isProcessing ? (
            // Spinner
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" style={{ animation: "spin 1s linear infinite" }}>
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
          ) : (
            // Mic icon
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          )}
        </button>
      </div>

      {/* Hidden audio element for TTS playback */}
      <audio ref={audioRef} style={{ display: "none" }} />

      {/* Injected animations */}
      <style>{`
        @keyframes dotPulse {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.3; }
          40% { transform: scale(1); opacity: 1; }
        }
        @keyframes waveBar {
          from { height: 6px; }
          to { height: 24px; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
