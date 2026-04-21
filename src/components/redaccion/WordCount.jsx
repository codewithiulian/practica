// 4 thresholds derived from mock 10-component-states.html ("Word count · 4 states"):
//   under min          → muted
//   in [min, max]      → teal
//   in (max, 2*max]    → amber, "Por encima (ok)"
//   above 2*max        → red,   "Muy por encima"
function bucket(value, min, max) {
  if (value < min) return "under";
  if (value <= max) return "in";
  if (value <= max * 2) return "over";
  return "way";
}

const COLORS = {
  under: { num: "text-[#9CA3AF]", bar: "bg-[#D1D5DB]" },
  in:    { num: "text-[#059669]", bar: "bg-[#10B981]" },
  over:  { num: "text-[#D97706]", bar: "bg-[#F59E0B]" },
  way:   { num: "text-[#B91C1C]", bar: "bg-[#EF4444]" },
};

export default function WordCount({ value, min, max, size = "md" }) {
  const state = bucket(value, min, max);
  const colors = COLORS[state];
  const fill = max > 0 ? Math.min(value / max, 1) * 100 : 0;

  const numClass =
    size === "sm"
      ? `font-black text-[16px] tabular-nums leading-none ${colors.num}`
      : `font-black text-[22px] tabular-nums ${colors.num}`;
  const labelClass =
    size === "sm"
      ? "text-[#6B7280] text-[10px] font-bold tabular-nums"
      : "text-[#6B7280] text-sm font-semibold tabular-nums";

  return (
    <div className="flex items-center gap-3">
      {size === "sm" ? (
        <div className="flex flex-col">
          <div className={numClass}>{value}</div>
          <div className={labelClass}>/ {min}–{max}</div>
        </div>
      ) : (
        <>
          <div className={numClass}>{value}</div>
          <div className={labelClass}>/ {min}–{max} palabras</div>
        </>
      )}
      <div className="flex-1 h-1.5 rounded-full bg-[#F3F4F6] overflow-hidden min-w-[80px]">
        <div className={`h-full rounded-full ${colors.bar} transition-all`} style={{ width: `${fill}%` }} />
      </div>
    </div>
  );
}
