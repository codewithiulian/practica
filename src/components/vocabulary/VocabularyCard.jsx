import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { C } from "../../styles/theme";

const mdComponents = {
  p: ({ children }) => (
    <p style={{ fontSize: 14, color: "#3A5A52", lineHeight: 1.7, margin: "4px 0", fontWeight: 600 }}>{children}</p>
  ),
  strong: ({ children }) => (
    <strong style={{ fontWeight: 800, color: C.text }}>{children}</strong>
  ),
  em: ({ children }) => (
    <em style={{ color: C.accent, fontStyle: "italic" }}>{children}</em>
  ),
  ul: ({ children }) => (
    <ul style={{ paddingLeft: 20, margin: "4px 0", fontSize: 14, color: "#3A5A52", lineHeight: 1.7, fontWeight: 600 }}>{children}</ul>
  ),
  ol: ({ children }) => (
    <ol style={{ paddingLeft: 20, margin: "4px 0", fontSize: 14, color: "#3A5A52", lineHeight: 1.7, fontWeight: 600 }}>{children}</ol>
  ),
  li: ({ children }) => (
    <li style={{ marginBottom: 2 }}>{children}</li>
  ),
};

export default function VocabularyCard({ word, onEdit, onRerunAI, onDelete }) {
  const [englishOpen, setEnglishOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [contentHeight, setContentHeight] = useState(0);
  const contentRef = useRef(null);
  const menuRef = useRef(null);

  // Measure content height for animation
  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight);
    }
  }, [word.explanation_en, englishOpen]);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  return (
    <div
      className="fade-in"
      style={{
        background: C.inputBg, borderRadius: 12, padding: "16px 18px",
        border: `1px solid ${C.border}`,
      }}
    >
      {/* Header: word + AI badge + menu */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
        <h3 style={{ fontSize: 20, fontWeight: 800, color: C.text, margin: 0, lineHeight: 1.3 }}>
          {word.word}
        </h3>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          {word.ai_generated && (
            <span style={{
              background: C.accent, color: "white", fontSize: 11, fontWeight: 800,
              padding: "2px 8px", borderRadius: 6, letterSpacing: "0.03em",
            }}>AI</span>
          )}
          {/* Three-dot menu */}
          <div ref={menuRef} style={{ position: "relative" }}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              style={{
                background: "none", border: "none", cursor: "pointer",
                padding: "2px 4px", color: C.muted, fontSize: 18,
                fontWeight: 800, lineHeight: 1, display: "flex",
              }}
            >⋮</button>
            {menuOpen && (
              <div style={{
                position: "absolute", top: "100%", right: 0, marginTop: 4,
                background: C.card, borderRadius: 10, border: `1px solid ${C.border}`,
                boxShadow: "0 4px 16px rgba(0,60,50,0.12)", zIndex: 10,
                minWidth: 140, overflow: "hidden",
              }}>
                {[
                  { label: "Edit", action: onEdit },
                  { label: "Re-run AI", action: onRerunAI },
                  { label: "Delete", action: onDelete, color: C.error },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={() => { setMenuOpen(false); item.action(); }}
                    style={{
                      display: "block", width: "100%", padding: "10px 14px",
                      background: "none", border: "none", textAlign: "left",
                      fontFamily: "'Nunito', sans-serif", fontSize: 14, fontWeight: 700,
                      color: item.color || C.text, cursor: "pointer",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = C.inputBg; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Spanish explanation */}
      {word.explanation_es && (
        <div style={{ marginBottom: 12 }}>
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
            {word.explanation_es}
          </ReactMarkdown>
        </div>
      )}

      {/* English collapsible section */}
      {word.explanation_en && (
        <>
          <div style={{ borderTop: `1px solid ${C.border}`, marginTop: 4, paddingTop: 10 }}>
            <button
              onClick={() => setEnglishOpen(!englishOpen)}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                background: "none", border: "none", cursor: "pointer",
                fontFamily: "'Nunito', sans-serif", fontSize: 13, fontWeight: 700,
                color: C.muted, padding: 0, width: "100%",
              }}
            >
              <span style={{ fontSize: 14 }}>🇬🇧</span>
              <span>{englishOpen ? "English" : "Show English"}</span>
              <svg
                width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                style={{
                  transition: "transform 0.2s ease",
                  transform: englishOpen ? "rotate(180deg)" : "rotate(0deg)",
                }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {/* Animated content */}
            <div style={{
              maxHeight: englishOpen ? contentHeight : 0,
              overflow: "hidden",
              transition: "max-height 0.3s ease",
            }}>
              <div ref={contentRef} style={{ paddingTop: 8 }}>
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                  {word.explanation_en}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
