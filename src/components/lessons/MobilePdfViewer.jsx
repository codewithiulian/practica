import { useState, useRef, useCallback, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { C } from "../../styles/theme";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

const MIN_SCALE = 0.5;
const MAX_SCALE = 3;
const SCALE_STEP = 0.25;

export default function MobilePdfViewer({ blobUrl, fileName, onClose }) {
  const [numPages, setNumPages] = useState(null);
  const [scale, setScale] = useState(1);
  const [pageWidth, setPageWidth] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const containerRef = useRef(null);
  const scaleRef = useRef(1);
  const pinchRef = useRef({ active: false, startDist: 0, startScale: 1 });

  // Keep ref in sync for use in native event listeners
  useEffect(() => { scaleRef.current = scale; }, [scale]);

  // Measure container width for fit-to-width rendering
  useEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        setPageWidth(containerRef.current.offsetWidth);
      }
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // Native (non-passive) touch event listeners for pinch-to-zoom.
  // React synthetic touch events are passive on iOS, so preventDefault()
  // is silently ignored — we must use addEventListener with { passive: false }.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const getDist = (t1, t2) =>
      Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);

    const onTouchStart = (e) => {
      if (e.touches.length === 2) {
        pinchRef.current = {
          active: true,
          startDist: getDist(e.touches[0], e.touches[1]),
          startScale: scaleRef.current,
        };
      }
    };

    const onTouchMove = (e) => {
      if (e.touches.length === 2 && pinchRef.current.active) {
        e.preventDefault(); // works because { passive: false }
        const dist = getDist(e.touches[0], e.touches[1]);
        const { startDist, startScale } = pinchRef.current;
        if (startDist > 0) {
          const ratio = dist / startDist;
          const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, +(startScale * ratio).toFixed(2)));
          setScale(next);
        }
      }
    };

    const onTouchEnd = () => {
      pinchRef.current.active = false;
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  const onDocumentLoadSuccess = useCallback(({ numPages: n }) => {
    setNumPages(n);
    setLoadError(false);
  }, []);

  const onDocumentLoadError = useCallback(() => {
    setLoadError(true);
  }, []);

  // Zoom controls
  const zoomIn = () => setScale((s) => Math.min(MAX_SCALE, +(s + SCALE_STEP).toFixed(2)));
  const zoomOut = () => setScale((s) => Math.max(MIN_SCALE, +(s - SCALE_STEP).toFixed(2)));
  const zoomReset = () => setScale(1);

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      background: C.card, zIndex: 9999,
      display: "flex", flexDirection: "column",
      overflow: "hidden",
    }}>
      {/* Header */}
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
          fontFamily: "'Nunito', sans-serif", padding: 0,
          flexShrink: 0,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </button>
        <span style={{
          fontSize: 14, fontWeight: 700, color: C.text,
          flex: 1, textAlign: "center",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {fileName}
        </span>
        <div style={{ width: 50, flexShrink: 0 }} />
      </div>

      {/* Scrollable PDF pages */}
      <div
        ref={containerRef}
        style={{
          flex: 1, overflow: "auto",
          WebkitOverflowScrolling: "touch",
          background: "#E8E8E8",
        }}
      >
        {loadError ? (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            height: "100%", color: C.muted, fontSize: 14, fontWeight: 600,
            padding: 40, textAlign: "center",
          }}>
            Could not load PDF. Try closing and reopening.
          </div>
        ) : (
          // CSS zoom scales content AND affects layout (scroll area adjusts automatically).
          // Much faster than re-rendering canvases on every pinch frame.
          <div style={{ zoom: scale }}>
            <Document
              file={blobUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={
                <div style={{ padding: 40, textAlign: "center" }}>
                  <div className="skeleton" style={{ height: 400, borderRadius: 8 }} />
                </div>
              }
            >
              {numPages && Array.from({ length: numPages }, (_, i) => (
                <div key={i} style={{
                  marginBottom: i < numPages - 1 ? 8 : 0,
                  display: "flex", justifyContent: "center",
                }}>
                  <Page
                    pageNumber={i + 1}
                    width={pageWidth || undefined}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                    loading={
                      <div className="skeleton" style={{
                        width: pageWidth || "100%",
                        height: pageWidth ? Math.round(pageWidth * 1.414) : 500,
                        borderRadius: 0,
                      }} />
                    }
                  />
                </div>
              ))}
            </Document>
          </div>
        )}
      </div>

      {/* Bottom toolbar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        padding: "10px 16px",
        paddingBottom: "max(10px, env(safe-area-inset-bottom, 10px))",
        borderTop: `1px solid ${C.border}`,
        background: C.card, flexShrink: 0, zIndex: 2,
      }}>
        {/* Zoom out */}
        <button onClick={zoomOut} disabled={scale <= MIN_SCALE} style={{
          background: "none", border: `1.5px solid ${C.border}`, borderRadius: 8,
          width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", color: scale <= MIN_SCALE ? C.border : C.text,
          transition: "all 0.15s",
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>

        {/* Scale indicator — tap to reset */}
        <button onClick={zoomReset} style={{
          background: "none", border: "none", cursor: "pointer",
          fontSize: 13, fontWeight: 800, color: C.text,
          fontFamily: "'Nunito', sans-serif",
          minWidth: 50, textAlign: "center",
        }}>
          {Math.round(scale * 100)}%
        </button>

        {/* Zoom in */}
        <button onClick={zoomIn} disabled={scale >= MAX_SCALE} style={{
          background: "none", border: `1.5px solid ${C.border}`, borderRadius: 8,
          width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", color: scale >= MAX_SCALE ? C.border : C.text,
          transition: "all 0.15s",
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>

        {/* Page indicator */}
        {numPages && (
          <span style={{
            fontSize: 12, fontWeight: 700, color: C.muted,
            marginLeft: 8,
          }}>
            {numPages} {numPages === 1 ? "page" : "pages"}
          </span>
        )}
      </div>
    </div>
  );
}
