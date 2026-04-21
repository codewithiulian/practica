import { Lightbulb } from "lucide-react";

// Shared brief renderer. Used by the desktop left column AND the mobile
// "Tarea" view. Stateless — parents control scroll. Tolerates partial briefs
// (Session 1 mock briefs may be missing some fields).
export default function BriefView({ brief, density = "comfortable" }) {
  if (!brief) return null;

  const isCompact = density === "compact";
  const titleSize = isCompact ? "text-[24px]" : "text-[26px]";
  const sectionGap = isCompact ? "mt-5" : "mt-6";
  const bodySize = isCompact ? "text-[14px]" : "text-[15px]";

  return (
    <div className="font-nunito text-[#1F2937]">
      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#FEF3C7] text-[#B45309] text-[11px] font-black tracking-widest uppercase mb-3">
        La Tarea
      </div>
      {brief.titulo && (
        <h1 className={`font-black ${titleSize} leading-tight text-[#0F1720] tracking-tight`}>
          {brief.titulo}
        </h1>
      )}
      <div className="text-[#6B7280] text-sm mt-1 flex items-center gap-2 flex-wrap">
        {brief.nivel && <span className="font-bold">{brief.nivel}</span>}
        {brief.nivel && (brief.extensionMin || brief.extensionMax) && <span>·</span>}
        {(brief.extensionMin || brief.extensionMax) && (
          <span>{brief.extensionMin}–{brief.extensionMax} palabras</span>
        )}
      </div>

      {brief.mision && (
        <div className={sectionGap}>
          <SectionHeader>Misión</SectionHeader>
          <div className={`text-[#1F2937] ${bodySize} leading-relaxed`}>
            {brief.mision}
          </div>
        </div>
      )}

      {brief.requisitos?.length > 0 && (
        <div className={sectionGap}>
          <SectionHeader>Requisitos</SectionHeader>
          <ul className={`space-y-1.5 text-[#1F2937] ${bodySize} leading-relaxed`}>
            {brief.requisitos.map((r, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-[#D97706] font-black">▸</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {brief.estructura?.length > 0 && (
        <div className={sectionGap}>
          <SectionHeader>Estructura sugerida</SectionHeader>
          <ol className={`space-y-1.5 text-[#1F2937] ${bodySize} leading-relaxed list-decimal pl-5`}>
            {brief.estructura.map((s, i) => <li key={i}>{s}</li>)}
          </ol>
        </div>
      )}

      {brief.preguntas?.length > 0 && (
        <div className={sectionGap}>
          <SectionHeader>Preguntas de apoyo</SectionHeader>
          <ul className={`space-y-1.5 text-[#374151] ${bodySize} italic leading-relaxed`}>
            {brief.preguntas.map((q, i) => (
              <li key={i}>· {q}</li>
            ))}
          </ul>
        </div>
      )}

      {brief.consejo && (
        <div className="mt-6 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] p-4 flex gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#F59E0B] grid place-items-center text-white shrink-0">
            <Lightbulb size={16} strokeWidth={2.4} />
          </div>
          <div>
            <div className="text-[#B45309] font-black text-[11px] tracking-widest uppercase">
              Consejo del día
            </div>
            <div className="text-[#1F2937] text-sm mt-0.5 leading-relaxed">
              {brief.consejo}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SectionHeader({ children }) {
  return (
    <div className="text-[#B45309] font-black text-xs tracking-widest uppercase mb-1.5">
      {children}
    </div>
  );
}
