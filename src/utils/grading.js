export const norm = (s) =>
  (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[¿¡.,!?;:'"]/g, "").replace(/\s+/g, " ").trim();

export const levenshtein = (a, b) => {
  const m = a.length, n = b.length;
  const d = Array.from({ length: m + 1 }, (_, i) => [i]);
  for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] !== b[j - 1] ? 1 : 0));
  return d[m][n];
};

export const fuzzyMatch = (input, target, threshold) => {
  const a = norm(input), b = norm(target);
  if (a === b) return true;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return true;
  const dist = levenshtein(a, b);
  return dist <= (threshold !== undefined ? threshold : Math.max(2, Math.floor(maxLen * 0.12)));
};

export const grade = (q, a) => {
  if (!a || a.skipped) return { correct: false };
  switch (q.type) {
    case "fill_blank": {
      const res = (q.accept || []).map((acc, i) =>
        (acc || []).some((x) => fuzzyMatch(a.blanks?.[i] || "", x, Math.max(1, Math.floor(norm(x).length * 0.15))))
      );
      return { correct: res.every(Boolean), blanksCorrect: res };
    }
    case "multiple_choice":
      return { correct: a.selected === q.answer };
    case "translate":
      return { correct: (q.accept || []).some((x) => fuzzyMatch(a.text || "", x)) };
    case "classify": {
      const map = {};
      Object.entries(q.categories).forEach(([cat, items]) => items.forEach((item) => (map[norm(item)] = cat)));
      const total = Object.values(q.categories).flat().length;
      const pl = Object.entries(a.placements || {}).flatMap(([cat, items]) => items.map((it) => ({ it, cat })));
      return { correct: pl.length === total && pl.every(({ it, cat }) => map[norm(it)] === cat) };
    }
    default:
      return { correct: false };
  }
};
