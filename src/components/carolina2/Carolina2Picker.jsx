import { useState } from "react";
import { C } from "../../styles/theme";

const P = "#3ABFA0";
const BORDER = "#e2e8e4";

// availableResources: [{ id, week_number, title, lessons:[{id,title}] }]
// selectedIds: { [lessonId]: { weekNumber, title } }
// onToggleLesson(lessonId, meta) ; onToggleWeek(week)
export default function Carolina2Picker({
  availableResources,
  selectedIds,
  onToggleLesson,
  onToggleWeek,
}) {
  const [expanded, setExpanded] = useState({});
  const toggleExpand = (id) =>
    setExpanded((p) => ({ ...p, [id]: !p[id] }));

  const weekState = (week) => {
    const ls = week.lessons || [];
    if (ls.length === 0) return "none";
    const sel = ls.filter((l) => l.id in selectedIds).length;
    if (sel === 0) return "none";
    if (sel === ls.length) return "all";
    return "some";
  };

  const Box = ({ state }) => (
    <div
      style={{
        width: 18,
        height: 18,
        borderRadius: 4,
        border: `1.5px solid ${state === "none" ? "#ccc" : P}`,
        background: state === "all" ? P : "transparent",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {state === "all" && (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )}
      {state === "some" && (
        <div style={{ width: 9, height: 2, background: P, borderRadius: 1 }} />
      )}
    </div>
  );

  return (
    <div style={{ fontFamily: "'Nunito', sans-serif" }}>
      {availableResources.map((week) => (
        <div key={week.id} style={{ borderBottom: `1px solid ${BORDER}` }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 16px",
            }}
          >
            <button
              onClick={() => toggleExpand(week.id)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
                display: "flex",
                color: C.muted,
              }}
              aria-label="expand week"
            >
              <svg
                width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                style={{
                  transform: expanded[week.id] ? "rotate(90deg)" : "rotate(0deg)",
                  transition: "transform 0.2s",
                }}
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
            <button
              onClick={() => onToggleWeek(week)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                flex: 1,
                background: "none",
                border: "none",
                cursor: "pointer",
                textAlign: "left",
                fontFamily: "'Nunito', sans-serif",
                fontSize: 14,
                fontWeight: 700,
                color: C.text,
                padding: 0,
              }}
            >
              <span style={{ flex: 1 }}>
                Week {week.week_number} {"—"} {week.title}
              </span>
              <span style={{ fontSize: 11, color: C.muted }}>
                {week.lessons?.length || 0} lessons
              </span>
              <Box state={weekState(week)} />
            </button>
          </div>

          {expanded[week.id] &&
            (week.lessons || []).map((lesson) => {
              const checked = lesson.id in selectedIds;
              return (
                <button
                  key={lesson.id}
                  onClick={() =>
                    onToggleLesson(lesson.id, {
                      weekNumber: week.week_number,
                      title: lesson.title,
                    })
                  }
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    width: "100%",
                    padding: "8px 16px 8px 44px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontFamily: "'Nunito', sans-serif",
                    fontSize: 13,
                    color: C.text,
                    textAlign: "left",
                  }}
                >
                  <span style={{ flex: 1 }}>{lesson.title}</span>
                  <Box state={checked ? "all" : "none"} />
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
  );
}
