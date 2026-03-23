import { useState, useEffect, useRef } from "react";
import { C } from "../styles/theme";

// Shared color tokens used by both Carolina chat and voice call
const K = {
  primary: "#3ABFA0",
  pillBg: "#fff3e0",
  pillText: "#854F0B",
  bubbleBorder: "#e2e8e4",
};

// ─── Resource Pills ────────────────────────────────────────────
export function ResourcePills({ resources, onRemove }) {
  if (!resources?.length) return null;
  return (
    <div style={{
      display: "flex", gap: 8, padding: "8px 16px",
      overflowX: "auto", flexShrink: 0,
      scrollbarWidth: "none", msOverflowStyle: "none",
    }}>
      {resources.map((r) => (
        <div key={r.id} style={{
          display: "flex", alignItems: "center", gap: 6,
          background: K.pillBg, borderRadius: 8,
          padding: "4px 10px", flexShrink: 0,
          fontSize: 12, fontWeight: 600, color: K.pillText,
          fontFamily: "'Nunito', sans-serif",
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          {r.label}
          {onRemove && (
            <button
              onClick={() => onRemove(r.id)}
              style={{
                background: "none", border: "none", cursor: "pointer",
                padding: 0, color: K.pillText, display: "flex",
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Resource Picker ───────────────────────────────────────────
export function ResourcePicker({ availableResources, selectedIds, onToggle, onClose, onAttach, isMobile }) {
  const [expandedWeeks, setExpandedWeeks] = useState({});
  const selectedCount = Object.keys(selectedIds).length;

  const toggleWeek = (weekId) => {
    setExpandedWeeks((prev) => ({ ...prev, [weekId]: !prev[weekId] }));
  };

  const content = (
    <div style={{ fontFamily: "'Nunito', sans-serif" }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "16px 20px 12px", borderBottom: `1px solid ${K.bubbleBorder}`,
      }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: C.text }}>Attach resources</span>
        <button onClick={onClose} style={{
          background: "none", border: "none", cursor: "pointer", padding: 4,
          color: C.muted, display: "flex",
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div style={{ maxHeight: isMobile ? "50vh" : 280, overflowY: "auto", padding: "8px 0" }}>
        {availableResources.map((week) => (
          <div key={week.id}>
            <button
              onClick={() => toggleWeek(week.id)}
              style={{
                display: "flex", alignItems: "center", gap: 10, width: "100%",
                padding: "10px 20px", background: "none", border: "none", cursor: "pointer",
                fontFamily: "'Nunito', sans-serif", fontSize: 14, fontWeight: 600,
                color: C.text, textAlign: "left",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
              <span style={{ flex: 1 }}>
                Week {week.week_number} {"\u2014"} {week.title}
              </span>
              <span style={{ fontSize: 11, color: C.muted }}>
                {week.lessons?.length || 0} lessons
              </span>
              <svg
                width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.muted}
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                style={{
                  transform: expandedWeeks[week.id] ? "rotate(90deg)" : "rotate(0deg)",
                  transition: "transform 0.2s",
                }}
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>

            {expandedWeeks[week.id] &&
              week.lessons?.map((lesson) => {
                const checked = lesson.id in selectedIds;
                return (
                  <button
                    key={lesson.id}
                    onClick={() => onToggle(lesson.id, `Wk ${week.week_number}: ${lesson.title}`)}
                    style={{
                      display: "flex", alignItems: "center", gap: 10, width: "100%",
                      padding: "8px 20px 8px 48px", background: "none", border: "none",
                      cursor: "pointer", fontFamily: "'Nunito', sans-serif",
                      fontSize: 13, color: C.text, textAlign: "left",
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                    <span style={{ flex: 1 }}>{lesson.title}</span>
                    <div style={{
                      width: 18, height: 18, borderRadius: 4,
                      border: `1.5px solid ${checked ? K.primary : "#ccc"}`,
                      background: checked ? K.primary : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0,
                    }}>
                      {checked && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                  </button>
                );
              })}
          </div>
        ))}
        {availableResources.length === 0 && (
          <div style={{ padding: 20, textAlign: "center", color: C.muted, fontSize: 13 }}>
            No lessons available yet
          </div>
        )}
      </div>

      {selectedCount > 0 && (
        <div style={{ padding: "12px 20px", borderTop: `1px solid ${K.bubbleBorder}` }}>
          <button
            onClick={onAttach}
            style={{
              width: "100%", padding: 10, borderRadius: 10,
              background: K.primary, color: "#FFFFFF", border: "none",
              fontFamily: "'Nunito', sans-serif", fontSize: 14, fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Attach {selectedCount} lesson{selectedCount !== 1 ? "s" : ""}
          </button>
        </div>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <>
        <div
          onClick={onClose}
          style={{
            position: "fixed", inset: 0, background: C.overlay, zIndex: 100,
            animation: "overlayFade 0.2s ease-out both",
          }}
        />
        <div style={{
          position: "fixed", bottom: 0, left: 0, right: 0,
          background: "#FFFFFF", borderRadius: "16px 16px 0 0",
          zIndex: 101, animation: "sheetUp 0.3s ease-out both",
          paddingBottom: "env(safe-area-inset-bottom, 0)",
        }}>
          {content}
        </div>
      </>
    );
  }

  return (
    <div style={{
      position: "absolute", bottom: "100%", left: 0,
      width: 340, background: "#FFFFFF",
      borderRadius: 12, boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
      border: `0.5px solid ${K.bubbleBorder}`,
      zIndex: 50, marginBottom: 8,
    }}>
      {content}
    </div>
  );
}

// ─── Helpers ───────────────────────────────────────────────────

/** Resolve raw {type, id} resources into displayable {type, id, label} */
export function resolveResourceLabels(rawResources, weeksList) {
  if (!Array.isArray(rawResources) || !weeksList.length) return rawResources || [];
  const lessonMap = {};
  for (const week of weeksList) {
    for (const lesson of week.lessons || []) {
      lessonMap[lesson.id] = `Wk ${week.week_number}: ${lesson.title}`;
    }
  }
  return rawResources.map((r) => ({
    ...r,
    label: r.label || lessonMap[r.id] || r.id,
  }));
}
