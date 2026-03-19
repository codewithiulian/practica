export const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};

export const typeLabels = { fill_blank: "Fill in the Blanks", multiple_choice: "Single Choice", translate: "Translate", classify: "Classify" };
export const typeShortLabels = { fill_blank: "Fill", multiple_choice: "SC", translate: "Trans", classify: "Classify" };

export const typeColors = {
  fill_blank: { bg: "#E0F5F1", text: "#008F7E" },
  multiple_choice: { bg: "#FBEAF0", text: "#993556" },
  translate: { bg: "#E6F1FB", text: "#0C447C" },
  classify: { bg: "#FAEEDA", text: "#854F0B" },
};

export const getResultMsg = (pct) => {
  if (pct === 100) return { msg: "\u00a1Perfecto! \ud83c\udf89", sub: "Flawless victory" };
  if (pct >= 91) return { msg: "\u00a1Casi perfecto!", sub: "So close to perfection" };
  if (pct >= 76) return { msg: "\u00a1Excelente!", sub: "You're really getting this" };
  if (pct >= 51) return { msg: "\u00a1Muy bien!", sub: "Great work, keep it up" };
  if (pct >= 26) return { msg: "\u00a1Vas por buen camino!", sub: "You're on the right track" };
  if (pct >= 1) return { msg: "\u00a1Sigue intentando!", sub: "You're building the foundation" };
  return { msg: "\u00a1No te rindas!", sub: "Keep practicing, you'll get there" };
};

export const relativeTime = (ts) => {
  const diff = Date.now() - ts;
  if (diff < 60000) return "just now";
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(diff / 3600000);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(diff / 86400000);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(ts));
};

export const computeStreak = (results) => {
  if (!results.length) return 0;
  const days = [...new Set(results.map((r) => {
    const d = new Date(r.created_at);
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  }))].sort().reverse();
  const today = new Date();
  let expected = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let streak = 0;
  for (const dayStr of days) {
    const [y, m, d] = dayStr.split("-").map(Number);
    const date = new Date(y, m, d);
    const diff = (expected - date) / 86400000;
    if (diff <= 1) { streak++; expected = date; } else break;
  }
  return streak;
};
