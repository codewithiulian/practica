import { useState, useEffect, useRef } from "react";
import { C } from "../../styles/theme";

export default function MobilePdfViewer({ blobUrl, fileName, fileSize, isCached, onClose }) {
  const [viewerUrl, setViewerUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const iframeRef = useRef(null);

  // Build the pdf.js viewer URL with the blob URL as the file parameter
  useEffect(() => {
    if (blobUrl) {
      setViewerUrl(`/pdfjs/web/viewer.html?file=${encodeURIComponent(blobUrl)}`);
    }
  }, [blobUrl]);

  const handleIframeLoad = () => {
    setLoading(false);
  };

  const formatSize = (bytes) => {
    if (!bytes) return "";
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      background: C.card, zIndex: 9999,
      display: "flex", flexDirection: "column",
      overflow: "hidden",
    }}>
      {/* Custom top bar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "12px 16px",
        paddingTop: "max(12px, env(safe-area-inset-top, 12px))",
        borderBottom: `1px solid ${C.border}`,
        flexShrink: 0, background: C.card, zIndex: 2,
      }}>
        {/* Back button */}
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
          Lesson
        </button>

        {/* File name + metadata */}
        <div style={{
          flex: 1, textAlign: "center",
          overflow: "hidden", minWidth: 0,
        }}>
          <div style={{
            fontSize: 14, fontWeight: 700, color: C.text,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {fileName}
          </div>
          <div style={{
            fontSize: 11, fontWeight: 600, color: C.muted,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
            marginTop: 1,
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
            {fileSize ? (
              <span>{isCached ? " \u00B7 " : ""}{formatSize(fileSize)}</span>
            ) : null}
          </div>
        </div>

        {/* Spacer to balance the back button */}
        <div style={{ width: 50, flexShrink: 0 }} />
      </div>

      {/* Loading indicator */}
      {loading && (
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%, -50%)", zIndex: 3,
        }}>
          <div className="skeleton" style={{ width: 200, height: 280, borderRadius: 8 }} />
        </div>
      )}

      {/* pdf.js viewer iframe */}
      {viewerUrl && (
        <iframe
          ref={iframeRef}
          src={viewerUrl}
          title="PDF Viewer"
          onLoad={handleIframeLoad}
          style={{
            flex: 1, width: "100%", border: "none",
            opacity: loading ? 0 : 1,
            transition: "opacity 0.2s",
          }}
          allow="fullscreen"
        />
      )}
    </div>
  );
}
