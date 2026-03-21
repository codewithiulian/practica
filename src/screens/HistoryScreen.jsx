import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { C } from "../styles/theme";
import { supabase } from "../lib/supabase.js";
import { relativeTime, computeStreak } from "../utils/helpers";
import MiniScoreCircle from "../components/MiniScoreCircle";
import SkeletonCard from "../components/SkeletonCard";
import MobileNavBar from "../components/MobileNavBar";

export default function HistoryScreen({ session }) {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (!session?.user?.id) return;
    supabase.from("quiz_results")
      .select("*, quizzes:quiz_id (title)")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data }) => {
        if (data) {
          setHistory(data);
          if (data.length > 0) {
            const avg = Math.round(data.reduce((s, r) => s + r.percentage, 0) / data.length);
            const best = Math.max(...data.map((r) => r.percentage));
            setStats({ count: data.length, avg, best });
          }
        }
        setLoading(false);
      });
  }, [session?.user?.id]);

  const streak = useMemo(() => computeStreak(history), [history]);

  return (
    <div className="fade-in" style={{ minHeight: "100vh", background: C.bg }}>
      <div className="desktop-main quizzes-page">
        <div className="safe-top" style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
            <div>
              <h1 style={{ fontSize: 28, fontWeight: 900, color: C.text, lineHeight: 1.2 }}>History</h1>
              <p style={{ color: C.muted, fontSize: 14, fontWeight: 600, marginTop: 4 }}>
                Your quiz results
              </p>
            </div>
            <div style={{ display: "flex", gap: 8, flexShrink: 0, flexWrap: "wrap" }}>
              {streak > 0 && (
                <span style={{
                  padding: "6px 14px", borderRadius: 20, fontSize: 13, fontWeight: 800,
                  background: C.accent, color: "#fff",
                }}>{"\ud83d\udd25"} {streak} day streak</span>
              )}
              {stats && (
                <>
                  <span style={{
                    padding: "6px 14px", borderRadius: 20, fontSize: 13, fontWeight: 800,
                    background: C.accentLight, color: C.accentHover,
                  }}>Avg: {stats.avg}%</span>
                  <span style={{
                    padding: "6px 14px", borderRadius: 20, fontSize: 13, fontWeight: 800,
                    background: "#FEF3C7", color: "#92400E",
                  }}>Best: {stats.best}%</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div style={{ maxWidth: 700 }}>
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
            </div>
          ) : history.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 20px" }}>
              <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.8 }}>{"\ud83d\udcca"}</div>
              <p style={{ color: C.text, fontSize: 16, fontWeight: 800 }}>No quiz results yet</p>
              <p style={{ color: C.muted, fontSize: 14, fontWeight: 600, marginTop: 4 }}>
                Complete a quiz to see your history!
              </p>
            </div>
          ) : (
            <div className="history-list">
              {history.map((r) => (
                <div key={r.id} className="fade-in" onClick={() => navigate("/history/view", { state: { cloudRecord: r } })} style={{
                  background: C.card, borderRadius: 14, padding: "14px 16px",
                  display: "flex", alignItems: "center", gap: 12,
                  boxShadow: "0 1px 4px rgba(0,60,50,0.06)",
                  cursor: "pointer", transition: "transform 0.15s, box-shadow 0.15s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,60,50,0.1)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,60,50,0.06)"; }}>
                  <MiniScoreCircle pct={r.percentage} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {r.quizzes?.title || r.lesson_title || "Quiz"}
                    </div>
                    <div style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>
                      {r.score}/{r.total} correct
                      {r.overrides > 0 ? ` (+${r.overrides} override${r.overrides !== 1 ? "s" : ""})` : ""}
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: C.accent, fontWeight: 700, whiteSpace: "nowrap" }}>
                    {relativeTime(new Date(r.created_at).getTime())}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <MobileNavBar active="history" />
    </div>
  );
}
