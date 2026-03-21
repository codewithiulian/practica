import { useNavigate, useLocation } from "react-router-dom";
import { C } from "../styles/theme";

export default function MobileNavBar({ active }) {
  const navigate = useNavigate();
  const location = useLocation();

  const activeId = active || (() => {
    if (location.pathname === "/lessons" || location.pathname.startsWith("/lesson/")) return "lessons";
    if (location.pathname === "/history" || location.pathname === "/history/view") return "history";
    if (location.pathname === "/dialog") return "hablar";
    return "quizzes";
  })();

  const items = [
    {
      id: "quizzes", label: "Quizzes", to: "/",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      ),
    },
    {
      id: "lessons", label: "Lessons", to: "/lessons",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
        </svg>
      ),
    },
    {
      id: "history", label: "History", to: "/history",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
        </svg>
      ),
    },
    {
      id: "hablar", label: "Hablar", to: "/dialog",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" />
        </svg>
      ),
    },
  ];

  return (
    <nav className="mobile-nav-bar" style={{
      position: "fixed", bottom: 0, left: 0, right: 0,
      background: C.card, borderTop: `1px solid ${C.border}`,
      display: "flex", justifyContent: "space-around", alignItems: "center",
      padding: "8px 0",
      paddingBottom: "max(8px, env(safe-area-inset-bottom, 8px))",
      zIndex: 50,
    }}>
      {items.map((item) => (
        <button key={item.id} onClick={() => navigate(item.to)} style={{
          display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
          background: "none", border: "none", cursor: "pointer",
          color: activeId === item.id ? C.accent : C.muted,
          fontFamily: "'Nunito', sans-serif", fontSize: 10, fontWeight: 700,
          padding: "4px 12px", minWidth: 60,
        }}>
          {item.icon}
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
