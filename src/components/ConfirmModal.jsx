import { C } from "../styles/theme";

export default function ConfirmModal({ open, title, message, confirmLabel, cancelLabel, onConfirm, onCancel, destructive }) {
  if (!open) return null;
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center",
      background: C.overlay, animation: "overlayFade 0.2s ease-out",
    }} onClick={onCancel}>
      <div className="slide-up" style={{
        background: C.card, borderRadius: 16, padding: 32, maxWidth: 340, width: "calc(100% - 48px)",
        boxShadow: "0 8px 32px rgba(0,60,50,0.15)", textAlign: "center",
      }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ fontSize: 18, fontWeight: 800, color: C.text, marginBottom: 8, lineHeight: 1.3 }}>{title}</h3>
        <p style={{ color: C.muted, fontSize: 15, fontWeight: 600, lineHeight: 1.6, marginBottom: 24 }}>{message}</p>
        <div style={{ display: "flex", gap: 12 }}>
          <button onClick={onCancel} style={{
            flex: 1, padding: "14px 16px", borderRadius: 14, border: `2px solid ${C.border}`,
            background: "transparent", color: C.text, fontWeight: 700, fontSize: 15,
            cursor: "pointer", fontFamily: "'Nunito', sans-serif", minHeight: 48,
          }}>{cancelLabel || "Cancel"}</button>
          <button onClick={onConfirm} style={{
            flex: 1, padding: "14px 16px", borderRadius: 14, border: "none",
            background: destructive ? C.error : C.accent, color: "white", fontWeight: 800, fontSize: 15,
            cursor: "pointer", fontFamily: "'Nunito', sans-serif", minHeight: 48,
          }}>{confirmLabel || "Leave"}</button>
        </div>
      </div>
    </div>
  );
}
