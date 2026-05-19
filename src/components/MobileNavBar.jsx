import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router-dom";
import { C } from "../styles/theme";

export default function MobileNavBar({ active }) {
  const navigate = useNavigate();
  const location = useLocation();

  const activeId = active || (() => {
    if (location.pathname === "/lessons" || location.pathname.startsWith("/lesson/")) return "lessons";
    if (location.pathname === "/vocabulary") return "vocabulary";
    if (location.pathname.startsWith("/conjugar")) return "conjugar";
    if (location.pathname === "/carolina") return "carolina";
    if (location.pathname === "/carolina2") return "carolina2";
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
      id: "vocabulary", label: "Vocab", to: "/vocabulary",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m5 8 6 6" /><path d="m4 14 6-6 2-3" /><path d="M2 5h12" /><path d="M7 2h1" /><path d="m22 22-5-10-5 10" /><path d="M14 18h6" />
        </svg>
      ),
    },
    {
      id: "conjugar", label: "Conjugar", to: "/conjugar",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3z" /><path d="M14 17h7M14 14h7M14 20h7" />
        </svg>
      ),
    },
    {
      id: "carolina", label: "Carolina", to: "/carolina",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      ),
    },
    {
      id: "carolina2", label: "Carolina2", to: "/carolina2",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
        </svg>
      ),
    },
  ];

  return createPortal(
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
    </nav>,
    document.body
  );
}
