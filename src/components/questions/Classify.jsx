import { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { C } from "../../styles/theme";
import { shuffle } from "../../utils/helpers";

export default function Classify({ q, value, onChange }) {
  const allItems = useMemo(() => shuffle(Object.values(q.categories).flat()), [q]);
  const placements = value?.placements || {};
  const selected = value?._selected || null;
  const placed = Object.values(placements).flat();
  const unplaced = allItems.filter((it) => !placed.includes(it));

  const [dragging, setDragging] = useState(null);
  const [dragPos, setDragPos] = useState(null);
  const [hoveredCat, setHoveredCat] = useState(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const catRefs = useRef({});
  const hoveredCatRef = useRef(null);
  const dragItemRef = useRef(null);
  const placementsRef = useRef(placements);
  const onChangeRef = useRef(onChange);
  useEffect(() => { placementsRef.current = placements; }, [placements]);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  const startDrag = (item, clientX, clientY, rect) => {
    dragOffset.current = { x: clientX - rect.left, y: clientY - rect.top };
    dragItemRef.current = item;
    setDragging(item);
    setDragPos({ x: clientX, y: clientY });
  };

  const handleTouchStart = (item, e) => {
    const touch = e.touches[0];
    startDrag(item, touch.clientX, touch.clientY, e.currentTarget.getBoundingClientRect());
  };

  const handleMouseDown = (item, e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    startDrag(item, e.clientX, e.clientY, e.currentTarget.getBoundingClientRect());
  };

  useEffect(() => {
    if (!dragging) return;
    const hitTest = (cx, cy) => {
      let found = null;
      for (const [cat, el] of Object.entries(catRefs.current)) {
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom) { found = cat; break; }
      }
      hoveredCatRef.current = found;
      setHoveredCat(found);
    };
    const dropItem = () => {
      const cat = hoveredCatRef.current;
      const item = dragItemRef.current;
      if (cat && item) {
        const np = { ...placementsRef.current };
        Object.keys(np).forEach((k) => (np[k] = (np[k] || []).filter((x) => x !== item)));
        np[cat] = [...(np[cat] || []), item];
        onChangeRef.current({ placements: np, _selected: null });
      }
      setDragging(null); setDragPos(null); setHoveredCat(null);
      hoveredCatRef.current = null; dragItemRef.current = null;
    };
    const onTouchMove = (e) => { e.preventDefault(); const t = e.touches[0]; setDragPos({ x: t.clientX, y: t.clientY }); hitTest(t.clientX, t.clientY); };
    const onMouseMove = (e) => { setDragPos({ x: e.clientX, y: e.clientY }); hitTest(e.clientX, e.clientY); };
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", dropItem);
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", dropItem);
    return () => { document.removeEventListener("touchmove", onTouchMove); document.removeEventListener("touchend", dropItem); document.removeEventListener("mousemove", onMouseMove); document.removeEventListener("mouseup", dropItem); };
  }, [dragging]);

  const selectItem = (item) => {
    if (dragging) return;
    onChange({ ...value, placements, _selected: selected === item ? null : item });
  };
  const placeInCategory = (cat) => {
    if (!selected) return;
    const np = { ...placements };
    Object.keys(np).forEach((k) => (np[k] = (np[k] || []).filter((x) => x !== selected)));
    np[cat] = [...(np[cat] || []), selected];
    onChange({ placements: np, _selected: null });
  };
  const removeFromCategory = (item, cat) => {
    const np = { ...placements };
    np[cat] = (np[cat] || []).filter((x) => x !== item);
    onChange({ ...value, placements: np, _selected: null });
  };

  const chip = (isSel, isPlaced) => ({
    display: "inline-flex", alignItems: "center", padding: isPlaced ? "8px 14px" : "10px 18px",
    borderRadius: 20, fontSize: isPlaced ? 13 : 14, fontWeight: 600, cursor: "pointer",
    transition: "all 0.2s", userSelect: "none", minHeight: 44,
    border: `2.5px solid ${isSel || isPlaced ? C.accent : C.border}`,
    background: isSel || isPlaced ? C.accentLight : C.card,
    color: isSel || isPlaced ? C.accentHover : C.text,
  });

  return (
    <div>
      {unplaced.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
          {unplaced.map((item) => (
            <span key={item} onClick={() => selectItem(item)} onTouchStart={(e) => handleTouchStart(item, e)}
              onMouseDown={(e) => handleMouseDown(item, e)}
              style={{ ...chip(selected === item, false), opacity: dragging === item ? 0.3 : 1, cursor: "grab" }}>
              {item}
            </span>
          ))}
        </div>
      )}
      {selected && !dragging && (
        <p style={{ color: C.accent, fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
          Tap a category below to place "{selected}"
        </p>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {Object.keys(q.categories).map((cat) => (
          <div key={cat} ref={(el) => (catRefs.current[cat] = el)}>
            <div onClick={() => placeInCategory(cat)}
              style={{
                border: `2.5px ${placements[cat]?.length ? "solid" : "dashed"} ${hoveredCat === cat ? C.accent : selected ? C.accent + "88" : C.border}`,
                borderRadius: 14, padding: 14, minHeight: 56,
                cursor: selected ? "pointer" : "default", transition: "all 0.2s",
                background: hoveredCat === cat ? C.accentLight : selected ? `${C.accentLight}44` : "transparent",
                transform: hoveredCat === cat ? "scale(1.01)" : "none",
              }}>
              <p style={{
                fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase",
                letterSpacing: 1, marginBottom: placements[cat]?.length ? 10 : 0,
              }}>{cat}</p>
              {placements[cat]?.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {placements[cat].map((item) => (
                    <span key={item} onClick={(e) => { e.stopPropagation(); removeFromCategory(item, cat); }}
                      style={chip(false, true)}>{item} ×</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      {dragging && dragPos && createPortal(
        <div style={{
          position: "fixed", left: dragPos.x - dragOffset.current.x, top: dragPos.y - dragOffset.current.y,
          zIndex: 9999, pointerEvents: "none", display: "inline-flex", alignItems: "center",
          padding: "10px 18px", borderRadius: 20, fontSize: 14, fontWeight: 600,
          background: C.accentLight, border: `2.5px solid ${C.accent}`, color: C.accentHover,
          boxShadow: "0 8px 24px rgba(0,60,50,0.15)", transform: "scale(1.05)", whiteSpace: "nowrap",
        }}>{dragging}</div>,
        document.body
      )}
    </div>
  );
}
