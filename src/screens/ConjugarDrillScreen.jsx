import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import DrillSession from "../components/conjugar/DrillSession";

export default function ConjugarDrillScreen() {
  const [searchParams] = useSearchParams();
  const packIds = useMemo(
    () => (searchParams.get("packs") || "").split(",").filter(Boolean),
    [searchParams]
  );

  return (
    <div className="desktop-main">
      <DrillSession packIds={packIds} />
    </div>
  );
}
