import { useState, useEffect, useRef, useCallback } from "react";
import { C } from "../../styles/theme";

function formatSize(bytes) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function touchDist(a, b) {
  const dx = a.clientX - b.clientX, dy = a.clientY - b.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

export default function MobilePdfViewer({ blob, fileName, fileSize, isCached, onClose }) {
  const scrollRef = useRef(null);
  const contentRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rendered, setRendered] = useState(0);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1);
  const [contentH, setContentH] = useState(0);
  const pdfDocRef = useRef(null);
  const pageOffsetsRef = useRef([]);
  const pinch = useRef({ active: false, dist: 0, baseScale: 1, live: 1 });
  const lastTap = useRef(0);

  // --- Render PDF pages ---
  useEffect(() => {
    if (!blob) return;
    let cancelled = false;

    async function renderPdf() {
      try {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

        const arrayBuffer = await blob.arrayBuffer();
        const pdfDoc = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
        if (cancelled) { pdfDoc.destroy(); return; }

        pdfDocRef.current = pdfDoc;
        setTotal(pdfDoc.numPages);

        const content = contentRef.current;
        const scroll = scrollRef.current;
        if (!content || !scroll) return;
        content.innerHTML = "";

        const containerWidth = scroll.clientWidth || window.innerWidth;
        const dpr = window.devicePixelRatio || 1;
        const offsets = [];

        for (let i = 1; i <= pdfDoc.numPages; i++) {
          if (cancelled) break;
          const page = await pdfDoc.getPage(i);
          const vp = page.getViewport({ scale: 1 });
          const s = containerWidth / vp.width;
          const svp = page.getViewport({ scale: s });

          const canvas = document.createElement("canvas");
          canvas.width = Math.floor(svp.width * dpr);
          canvas.height = Math.floor(svp.height * dpr);
          canvas.style.width = `${Math.floor(svp.width)}px`;
          canvas.style.height = `${Math.floor(svp.height)}px`;
          canvas.style.display = "block";

          const ctx = canvas.getContext("2d");
          ctx.scale(dpr, dpr);
          await page.render({ canvasContext: ctx, viewport: svp }).promise;

          offsets.push(content.scrollHeight);
          content.appendChild(canvas);
          setRendered(i);
          if (i === 1) setLoading(false);
        }

        pageOffsetsRef.current = offsets;
        setContentH(content.scrollHeight);
      } catch (err) {
        if (!cancelled) {
          console.error("PDF render error:", err);
          setError(err.message || "Failed to render PDF");
          setLoading(false);
        }
      }
    }

    renderPdf();
    return () => {
      cancelled = true;
      if (pdfDocRef.current) { pdfDocRef.current.destroy(); pdfDocRef.current = null; }
    };
  }, [blob]);

  // --- Pinch-to-zoom (direct DOM for smoothness) ---
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    function applyScale(newScale) {
      const content = contentRef.current;
      if (!content) return;
      content.style.transform = `scale(${newScale})`;
      content.parentElement.style.height = `${contentH * newScale}px`;
      content.parentElement.style.width = `${(scrollRef.current?.clientWidth || window.innerWidth) * newScale}px`;
    }

    function onTouchStart(e) {
      if (e.touches.length === 2) {
        pinch.current = { active: true, dist: touchDist(e.touches[0], e.touches[1]), baseScale: pinch.current.live, live: pinch.current.live };
      }
      // Double-tap
      if (e.touches.length === 1) {
        const now = Date.now();
        if (now - lastTap.current < 300) {
          e.preventDefault();
          const rect = el.getBoundingClientRect();
          const tx = e.touches[0].clientX - rect.left;
          const ty = e.touches[0].clientY - rect.top;
          const curScale = pinch.current.live;

          if (curScale > 1.1) {
            // Reset to 1x
            pinch.current.live = 1;
            applyScale(1);
            setScale(1);
            el.scrollLeft = 0;
          } else {
            // Zoom to 2.5x centered on tap
            const newScale = 2.5;
            const cX = (tx + el.scrollLeft) / curScale;
            const cY = (ty + el.scrollTop) / curScale;
            pinch.current.live = newScale;
            applyScale(newScale);
            setScale(newScale);
            el.scrollLeft = cX * newScale - tx;
            el.scrollTop = cY * newScale - ty;
          }
          lastTap.current = 0;
          return;
        }
        lastTap.current = now;
      }
    }

    function onTouchMove(e) {
      if (!pinch.current.active || e.touches.length < 2) return;
      e.preventDefault();
      const newDist = touchDist(e.touches[0], e.touches[1]);
      const ratio = newDist / pinch.current.dist;
      const newScale = Math.min(Math.max(pinch.current.baseScale * ratio, 1), 5);

      // Keep pinch center stationary
      const rect = el.getBoundingClientRect();
      const cx = ((e.touches[0].clientX + e.touches[1].clientX) / 2) - rect.left;
      const cy = ((e.touches[0].clientY + e.touches[1].clientY) / 2) - rect.top;
      const oldScale = pinch.current.live;

      applyScale(newScale);

      el.scrollLeft = (el.scrollLeft + cx) * (newScale / oldScale) - cx;
      el.scrollTop = (el.scrollTop + cy) * (newScale / oldScale) - cy;

      pinch.current.live = newScale;
    }

    function onTouchEnd() {
      if (pinch.current.active) {
        pinch.current.active = false;
        const final = pinch.current.live < 1.05 ? 1 : pinch.current.live;
        pinch.current.live = final;
        applyScale(final);
        setScale(final);
      }
    }

    el.addEventListener("touchstart", onTouchStart, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [contentH]);

  // --- Track current page on scroll ---
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || !pageOffsetsRef.current.length) return;
    const scrollTop = el.scrollTop;
    const s = pinch.current.live || 1;
    let page = 1;
    for (let i = 0; i < pageOffsetsRef.current.length; i++) {
      if (scrollTop >= pageOffsetsRef.current[i] * s - 80) page = i + 1;
    }
    setCurrentPage(page);
  }, []);

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      background: C.card, zIndex: 9999,
      display: "flex", flexDirection: "column", overflow: "hidden",
    }}>
      {/* Top bar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "12px 16px",
        paddingTop: "max(12px, env(safe-area-inset-top, 12px))",
        borderBottom: `1px solid ${C.border}`,
        flexShrink: 0, background: C.card, zIndex: 2,
      }}>
        <button onClick={onClose} style={{
          background: "none", border: "none", color: C.accent,
          fontWeight: 700, fontSize: 14, cursor: "pointer",
          display: "flex", alignItems: "center", gap: 4,
          fontFamily: "'Nunito', sans-serif", padding: 0, flexShrink: 0,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Lesson
        </button>

        <div style={{ flex: 1, textAlign: "center", overflow: "hidden", minWidth: 0 }}>
          <div style={{
            fontSize: 14, fontWeight: 700, color: C.text,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {fileName}
          </div>
          <div style={{
            fontSize: 11, fontWeight: 600, color: C.muted,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 4, marginTop: 1,
          }}>
            {isCached && (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.success} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <span>Available offline</span>
              </>
            )}
            {fileSize ? <span>{isCached ? " \u00B7 " : ""}{formatSize(fileSize)}</span> : null}
          </div>
        </div>

        <div style={{ width: 50, flexShrink: 0 }} />
      </div>

      {/* Toolbar: page indicator + zoom reset */}
      {!loading && total > 0 && (
        <div style={{
          padding: "6px 16px", background: C.bg, flexShrink: 0,
          display: "flex", justifyContent: "space-between", alignItems: "center",
          borderBottom: `1px solid ${C.border}`,
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.muted }}>
            {rendered < total ? `Rendering... ${rendered}/${total}` : `Page ${currentPage} of ${total}`}
          </div>
          {scale > 1.05 && (
            <button onClick={() => {
              pinch.current.live = 1;
              const content = contentRef.current;
              if (content) {
                content.style.transform = "scale(1)";
                content.parentElement.style.height = `${contentH}px`;
                content.parentElement.style.width = "100%";
              }
              if (scrollRef.current) scrollRef.current.scrollLeft = 0;
              setScale(1);
            }} style={{
              fontSize: 11, fontWeight: 700, color: C.accent, background: C.accentLight,
              border: "none", borderRadius: 6, padding: "2px 8px", cursor: "pointer",
              fontFamily: "'Nunito', sans-serif",
            }}>
              {Math.round(scale * 100)}% — Reset
            </button>
          )}
        </div>
      )}

      {/* Loading */}
      {loading && !error && (
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 3 }}>
          <div className="skeleton" style={{ width: 200, height: 280, borderRadius: 8 }} />
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 32, textAlign: "center" }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.error, marginBottom: 8 }}>Failed to load PDF</div>
            <div style={{ fontSize: 12, color: C.muted }}>{error}</div>
          </div>
        </div>
      )}

      {/* Scrollable + zoomable PDF */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        style={{
          flex: 1, overflow: "auto", WebkitOverflowScrolling: "touch",
          background: "#e8e8e8",
          opacity: loading ? 0 : 1, transition: "opacity 0.2s",
          touchAction: "pan-x pan-y",
        }}
      >
        {/* Size wrapper — grows with scale so scrolling works */}
        <div style={{ width: "100%", height: contentH || "auto", overflow: "hidden" }}>
          <div
            ref={contentRef}
            style={{ transformOrigin: "0 0", transform: `scale(${scale})` }}
          />
        </div>
      </div>
    </div>
  );
}
