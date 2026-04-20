import { useState, useEffect } from "react";
import { C } from "../../styles/theme";
import { SPANISH_TENSES } from "../../lib/conjugar/constants";
import { detectVerbType } from "../../lib/conjugar/constants";
import { generateVerbsWithPacks } from "../../lib/conjugar/api";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "../ui/dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "../ui/sheet";

// Per-verb states used inside the live progress list.
// pending → (running) → created | skipped | failed
const STATE_PENDING = "pending";
const STATE_RUNNING = "running";
const STATE_CREATED = "created";
const STATE_SKIPPED = "skipped";
const STATE_FAILED = "failed";

export default function AddVerbModal({ open, onClose, onVerbsChanged }) {
  const [verbInput, setVerbInput] = useState("");
  const [tense, setTense] = useState("presente");
  const [errors, setErrors] = useState([]);
  const [progress, setProgress] = useState([]); // [{infinitive, state, error?}]
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (open) {
      setVerbInput("");
      setTense("presente");
      setErrors([]);
      setProgress([]);
      setRunning(false);
      setDone(false);
    }
  }, [open]);

  const parseVerbs = () => {
    return verbInput
      .split(/[,\n]+/)
      .map((v) => v.trim().toLowerCase())
      .filter(Boolean);
  };

  const validate = () => {
    const verbs = parseVerbs();
    const errs = [];
    if (verbs.length === 0) {
      errs.push("Ingresa al menos un verbo.");
    }
    for (const v of verbs) {
      if (!detectVerbType(v)) {
        errs.push(`"${v}" no es un infinitivo válido (debe terminar en -ar, -er o -ir).`);
      }
    }
    return errs;
  };

  const updateItem = (infinitive, patch) => {
    setProgress((prev) =>
      prev.map((it) => (it.infinitive === infinitive ? { ...it, ...patch } : it)),
    );
  };

  const runVerb = async (infinitive, currentTense) => {
    updateItem(infinitive, { state: STATE_RUNNING });
    try {
      const { created = [], failed = [] } = await generateVerbsWithPacks(
        [infinitive],
        currentTense,
      );
      if (failed.length > 0) {
        updateItem(infinitive, { state: STATE_FAILED, error: failed[0].error });
        return { createdAny: false };
      }
      const entry = created[0];
      if (entry?.skipped) {
        updateItem(infinitive, { state: STATE_SKIPPED });
        return { createdAny: false };
      }
      updateItem(infinitive, { state: STATE_CREATED });
      return { createdAny: true };
    } catch (e) {
      updateItem(infinitive, { state: STATE_FAILED, error: e.message || "Error" });
      return { createdAny: false };
    }
  };

  const handleGenerate = async () => {
    const errs = validate();
    if (errs.length > 0) {
      setErrors(errs);
      return;
    }
    setErrors([]);

    const verbs = parseVerbs();
    setProgress(verbs.map((v) => ({ infinitive: v, state: STATE_PENDING })));
    setRunning(true);
    setDone(false);

    let anyCreated = false;
    for (const v of verbs) {
      const { createdAny } = await runVerb(v, tense);
      if (createdAny) anyCreated = true;
    }

    if (anyCreated) onVerbsChanged?.();
    setRunning(false);
    setDone(true);
  };

  const handleRetryFailed = async () => {
    const failedVerbs = progress.filter((p) => p.state === STATE_FAILED).map((p) => p.infinitive);
    if (failedVerbs.length === 0) return;

    setProgress((prev) =>
      prev.map((it) =>
        it.state === STATE_FAILED ? { ...it, state: STATE_PENDING, error: undefined } : it,
      ),
    );
    setRunning(true);
    setDone(false);

    let anyCreated = false;
    for (const v of failedVerbs) {
      const { createdAny } = await runVerb(v, tense);
      if (createdAny) anyCreated = true;
    }

    if (anyCreated) onVerbsChanged?.();
    setRunning(false);
    setDone(true);
  };

  const parsedVerbs = parseVerbs();
  const invalidVerbs = parsedVerbs.filter((v) => !detectVerbType(v));
  const isValid = parsedVerbs.length > 0 && invalidVerbs.length === 0;
  const disabledReason = parsedVerbs.length === 0
    ? "Ingresa al menos un verbo"
    : invalidVerbs.length > 0
      ? `Verbo${invalidVerbs.length > 1 ? "s" : ""} no válido${invalidVerbs.length > 1 ? "s" : ""}: ${invalidVerbs.join(", ")}`
      : null;

  const tenseLabel = SPANISH_TENSES.find((t) => t.id === tense)?.label || tense;
  const hasFailed = progress.some((p) => p.state === STATE_FAILED);
  const showProgress = progress.length > 0;

  const content = (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <FormContent
        verbInput={verbInput}
        setVerbInput={setVerbInput}
        tense={tense}
        setTense={setTense}
        errors={errors}
        isValid={isValid}
        disabledReason={disabledReason}
        onGenerate={handleGenerate}
        onClose={onClose}
        running={running}
      />
      {showProgress && (
        <ProgressList
          items={progress}
          tenseLabel={tenseLabel}
          running={running}
          done={done}
          hasFailed={hasFailed}
          onRetry={handleRetryFailed}
        />
      )}
    </div>
  );

  const isMobile = typeof window !== "undefined" && window.innerWidth < 1024;

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={(v) => { if (!v && !running) onClose(); }}>
        <SheetContent side="bottom" showClose={false} className="max-h-[92vh] overflow-y-auto">
          <SheetHeader>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button
                onClick={onClose}
                disabled={running}
                style={{
                  background: "none", border: "none", cursor: running ? "not-allowed" : "pointer",
                  fontSize: 14, fontWeight: 700, color: C.muted, fontFamily: "'Nunito', sans-serif",
                  opacity: running ? 0.5 : 1,
                }}
              >
                Cancelar
              </button>
              <SheetTitle>Añadir verbos</SheetTitle>
              <div style={{ width: 60 }} />
            </div>
            <SheetDescription className="sr-only">Añade verbos para generar ejercicios de conjugación</SheetDescription>
          </SheetHeader>
          <div className="px-5 pb-5">
            {content}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !running) onClose(); }}>
      <DialogContent
        showClose={!running}
        className="max-w-[560px] max-h-[92vh] overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle>Añadir verbos</DialogTitle>
          <DialogDescription className="sr-only">Añade verbos para generar ejercicios de conjugación</DialogDescription>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}

function FormContent({ verbInput, setVerbInput, tense, setTense, errors, isValid, disabledReason, onGenerate, onClose, running }) {
  const formDisabled = running;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <label style={{
          display: "block", fontSize: 14, fontWeight: 700, color: C.text,
          marginBottom: 6, fontFamily: "'Nunito', sans-serif",
        }}>
          Verbos (en infinitivo)
        </label>
        <textarea
          value={verbInput}
          onChange={(e) => setVerbInput(e.target.value)}
          placeholder="hablar, comer, vivir"
          rows={3}
          disabled={formDisabled}
          style={{
            width: "100%", padding: "12px 14px", borderRadius: 12,
            border: `1.5px solid ${C.border}`, background: formDisabled ? "#F9FAFB" : C.card,
            fontSize: 15, fontFamily: "'Nunito', sans-serif", fontWeight: 600,
            color: C.text, outline: "none", resize: "none",
            opacity: formDisabled ? 0.6 : 1,
          }}
          onFocus={(e) => { if (!formDisabled) e.target.style.borderColor = C.accent; }}
          onBlur={(e) => { e.target.style.borderColor = C.border; }}
        />
        <p style={{ fontSize: 12, fontWeight: 600, color: C.muted, marginTop: 4 }}>
          Separa con comas o saltos de línea.
        </p>
      </div>

      <div>
        <label style={{
          display: "block", fontSize: 14, fontWeight: 700, color: C.text,
          marginBottom: 6, fontFamily: "'Nunito', sans-serif",
        }}>
          Tiempo verbal
        </label>
        <div style={{ position: "relative" }}>
          <select
            value={tense}
            onChange={(e) => setTense(e.target.value)}
            disabled={formDisabled}
            style={{
              width: "100%", padding: "12px 14px", borderRadius: 12,
              border: `1.5px solid ${C.border}`, background: formDisabled ? "#F9FAFB" : C.card,
              fontSize: 15, fontFamily: "'Nunito', sans-serif", fontWeight: 700,
              color: C.text, outline: "none", appearance: "none",
              cursor: formDisabled ? "not-allowed" : "pointer", paddingRight: 40,
              opacity: formDisabled ? 0.6 : 1,
            }}
          >
            {SPANISH_TENSES.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>

      <div style={{
        padding: "14px 16px", borderRadius: 12,
        background: "#ECFDF5", border: "1px solid #A7F3D0",
      }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: "#059669", marginBottom: 2 }}>
          {"\u2728"} 7 ejercicios por verbo
        </p>
        <p style={{ fontSize: 13, fontWeight: 600, color: "#047857" }}>
          1 tabla clásica + 6 ejercicios variados generados por IA
        </p>
      </div>

      {errors.length > 0 && (
        <div style={{
          padding: "10px 14px", borderRadius: 10,
          background: "#FEF2F2", border: "1px solid #FECACA",
        }}>
          {errors.map((err, i) => (
            <p key={i} style={{ fontSize: 13, fontWeight: 600, color: "#DC2626", margin: 0 }}>{err}</p>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button
          onClick={onClose}
          className="add-quiz-btn-desktop"
          style={{
            padding: "10px 22px", borderRadius: 12, border: `2px solid ${C.border}`,
            background: "transparent", color: C.text, fontSize: 14, fontWeight: 700,
            cursor: "pointer", fontFamily: "'Nunito', sans-serif",
            display: "none",
          }}
        >
          Cancelar
        </button>
        <div style={{ flex: 1, position: "relative" }}
          {...(!isValid && disabledReason ? { title: disabledReason } : {})}
        >
          <button
            onClick={onGenerate}
            disabled={!isValid || running}
            style={{
              width: "100%", padding: "10px 22px", borderRadius: 12, border: "none",
              background: isValid && !running ? C.accent : "#E5E7EB",
              color: isValid && !running ? "white" : "#9CA3AF",
              fontSize: 14, fontWeight: 800,
              cursor: isValid && !running ? "pointer" : "not-allowed",
              fontFamily: "'Nunito', sans-serif",
              display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}
          >
            {running ? (
              <>
                <InlineSpinner />
                Generando…
              </>
            ) : (
              <>{"\u2726"} Generar con IA</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function ProgressRow({ item, tenseLabel, isLast }) {
  const { infinitive, state, error } = item;

  let icon, statusText, statusColor, verbColor = C.text;
  switch (state) {
    case STATE_PENDING:
      icon = <Dot />;
      statusText = "En espera";
      statusColor = "#9CA3AF";
      verbColor = "#6B7280";
      break;
    case STATE_RUNNING:
      icon = <Spinner />;
      statusText = "Generando…";
      statusColor = C.accent;
      break;
    case STATE_CREATED:
      icon = <CheckIcon />;
      statusText = "Creado";
      statusColor = "#059669";
      break;
    case STATE_SKIPPED:
      icon = <SkipIcon />;
      statusText = `Ya tenías ${tenseLabel} · saltado`;
      statusColor = "#6B7280";
      break;
    case STATE_FAILED:
      icon = <CrossIcon />;
      statusText = error ? `Error · ${error}` : "Error";
      statusColor = "#DC2626";
      break;
    default:
      icon = null;
      statusText = "";
      statusColor = C.muted;
  }

  return (
    <div
      title={state === STATE_FAILED && error ? error : undefined}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "8px 2px",
        borderBottom: isLast ? "none" : `1px solid ${C.border}`,
        minHeight: 32,
      }}
    >
      <div style={{ width: 16, height: 16, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {icon}
      </div>
      <span style={{
        fontSize: 14, fontWeight: 800, color: verbColor,
        fontFamily: "'Nunito', sans-serif", flexShrink: 0,
      }}>
        {infinitive}
      </span>
      <span style={{ color: "#D1D5DB", fontWeight: 700, flexShrink: 0 }}>·</span>
      <span style={{
        fontSize: 13, fontWeight: 600, color: statusColor,
        fontFamily: "'Nunito', sans-serif",
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        flex: 1, minWidth: 0,
      }}>
        {statusText}
      </span>
    </div>
  );
}

function ProgressList({ items, tenseLabel, running, done, hasFailed, onRetry }) {
  const createdCount = items.filter((i) => i.state === STATE_CREATED).length;
  const skippedCount = items.filter((i) => i.state === STATE_SKIPPED).length;
  const failedCount = items.filter((i) => i.state === STATE_FAILED).length;
  const runningCount = items.filter((i) => i.state === STATE_RUNNING).length;
  const pendingCount = items.filter((i) => i.state === STATE_PENDING).length;
  const processedCount = items.length - pendingCount - runningCount;

  return (
    <div style={{
      display: "flex", flexDirection: "column", gap: 8,
      paddingTop: 14, borderTop: `1px solid ${C.border}`,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
        <span style={{
          fontSize: 13, fontWeight: 800, color: C.text,
          fontFamily: "'Nunito', sans-serif", textTransform: "uppercase", letterSpacing: 0.5,
        }}>
          Progreso
        </span>
        <span style={{
          fontSize: 12, fontWeight: 700, color: C.muted,
          fontFamily: "'Nunito', sans-serif",
        }}>
          {processedCount} / {items.length}
          {done && (
            <>
              {" "}
              {createdCount > 0 && <span style={{ color: "#059669" }}>· {createdCount} creado{createdCount !== 1 ? "s" : ""}</span>}
              {skippedCount > 0 && <span> · {skippedCount} saltado{skippedCount !== 1 ? "s" : ""}</span>}
              {failedCount > 0 && <span style={{ color: "#DC2626" }}> · {failedCount} fallido{failedCount !== 1 ? "s" : ""}</span>}
            </>
          )}
        </span>
      </div>

      <div style={{
        display: "flex", flexDirection: "column",
        maxHeight: 320, overflowY: "auto",
        margin: "0 -2px", padding: "0 2px",
      }}>
        {items.map((it, idx) => (
          <ProgressRow
            key={it.infinitive}
            item={it}
            tenseLabel={tenseLabel}
            isLast={idx === items.length - 1}
          />
        ))}
      </div>

      {done && hasFailed && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
          <button
            onClick={onRetry}
            disabled={running}
            style={{
              padding: "8px 16px", borderRadius: 10, border: `2px solid ${C.border}`,
              background: "transparent", color: C.text, fontSize: 13, fontWeight: 700,
              cursor: running ? "not-allowed" : "pointer", fontFamily: "'Nunito', sans-serif",
              opacity: running ? 0.6 : 1,
            }}
          >
            Reintentar fallidos
          </button>
        </div>
      )}

      <style>{`@keyframes pinata-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function InlineSpinner() {
  return (
    <div style={{
      width: 14, height: 14, borderRadius: "50%",
      border: "2px solid rgba(255,255,255,0.35)", borderTopColor: "#9CA3AF",
      animation: "pinata-spin 0.8s linear infinite",
    }} />
  );
}

function Spinner() {
  return (
    <div style={{
      width: 14, height: 14, borderRadius: "50%",
      border: `2px solid ${C.border}`, borderTopColor: C.accent,
      animation: "pinata-spin 0.8s linear infinite",
    }} />
  );
}

function Dot() {
  return (
    <div style={{
      width: 8, height: 8, borderRadius: "50%",
      background: "#D1D5DB",
    }} />
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function CrossIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function SkipIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  );
}
