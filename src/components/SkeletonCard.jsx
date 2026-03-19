import { C } from "../styles/theme";

export default function SkeletonCard({ variant = "default" }) {
  return (
    <div className="skeleton-glow" style={{
      background: C.card, borderRadius: 16, padding: 16,
      border: variant === "progress" ? `2.5px solid ${C.accentLight}` : "1px solid transparent",
    }}>
      {variant === "progress" && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
          <div className="skeleton" style={{ width: 80, height: 22, borderRadius: 20 }} />
        </div>
      )}
      <div className="skeleton" style={{ width: "70%", height: 18, marginBottom: 8 }} />
      <div className="skeleton" style={{ width: "45%", height: 13, marginBottom: variant === "progress" ? 14 : 4 }} />
      {variant === "progress" && (
        <>
          <div style={{ display: "flex", gap: 3, padding: 3, background: "#D4F0EB", borderRadius: 10, height: 14, marginBottom: 14 }}>
            {Array.from({ length: 12 }, (_, i) => (
              <div key={i} className="skeleton" style={{ flex: 1, borderRadius: 7 }} />
            ))}
          </div>
          <div className="skeleton" style={{ width: "100%", height: 44, borderRadius: 14 }} />
        </>
      )}
    </div>
  );
}
