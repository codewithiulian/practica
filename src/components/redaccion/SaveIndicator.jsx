import { Check, AlertCircle, WifiOff } from "lucide-react";

// Maps the autosave hook's status → mock 10-component-states.html visuals.
// `idle` renders nothing — the indicator only appears once there's something
// meaningful to communicate.
export default function SaveIndicator({ status, onRetry, size = "md" }) {
  if (status === "idle") return null;

  const textSize = size === "sm" ? "text-[10px]" : "text-xs";
  const iconSize = size === "sm" ? 10 : 12;

  if (status === "saving") {
    return (
      <div className={`flex items-center gap-1.5 text-[#4B5563] ${textSize} font-bold`}>
        <span
          className="rounded-full border-2 border-[#9CA3AF] border-t-transparent animate-spin inline-block"
          style={{ width: iconSize, height: iconSize }}
        />
        Guardando…
      </div>
    );
  }
  if (status === "saved") {
    return (
      <div className={`flex items-center gap-1.5 text-[#6B7280] ${textSize} font-bold`}>
        <Check size={iconSize} color="#10B981" strokeWidth={3} />
        Guardado
      </div>
    );
  }
  if (status === "error") {
    return (
      <div className={`flex items-center gap-1.5 ${textSize} font-bold`}>
        <AlertCircle size={iconSize} color="#EF4444" strokeWidth={2.4} />
        <span className="text-[#991B1B]">Error al guardar</span>
        <button
          type="button"
          onClick={onRetry}
          className="text-[#059669] font-black hover:underline"
        >
          Reintentar
        </button>
      </div>
    );
  }
  if (status === "offline") {
    return (
      <div className={`flex items-center gap-1.5 text-[#B45309] ${textSize} font-bold`}>
        <WifiOff size={iconSize} color="#D97706" strokeWidth={2.4} />
        Sin conexión · en cola
      </div>
    );
  }
  return null;
}
