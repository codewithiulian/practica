import { useState, useEffect } from "react";
import { Popover, PopoverTrigger, PopoverContent } from "../ui/popover";
import { fetchPacks, translateVerb } from "../../lib/conjugar/api";
import { C } from "../../styles/theme";

const PRONOUN_LABELS = [
  { key: "yo", label: "yo" },
  { key: "tú", label: "tú" },
  { key: "él/ella/usted", label: "él/ella/ud." },
  { key: "nosotros", label: "nosotros" },
  { key: "vosotros", label: "vosotros" },
  { key: "ellos/ellas", label: "ellos/uds." },
];

function HighlightedExample({ sentence, word }) {
  if (!word || !sentence) return <span style={{ fontStyle: "italic" }}>{sentence}</span>;
  const idx = sentence.toLowerCase().indexOf(word.toLowerCase());
  if (idx === -1) return <span style={{ fontStyle: "italic" }}>{sentence}</span>;
  return (
    <span style={{ fontStyle: "italic" }}>
      {sentence.slice(0, idx)}
      <span style={{ color: "#059669", fontWeight: 700, fontStyle: "normal" }}>
        {sentence.slice(idx, idx + word.length)}
      </span>
      {sentence.slice(idx + word.length)}
    </span>
  );
}

export default function VerbInfoPopover({ verb, verbId, tense, cachedPacks, onPacksFetched }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [translation, setTranslation] = useState(verb?.translation_en || null);

  // If the parent hands us a new verb prop with a translation, reflect it.
  useEffect(() => {
    if (verb?.translation_en) setTranslation(verb.translation_en);
  }, [verb?.translation_en]);

  const extractData = (packs) => {
    const pack = packs.find((p) => p.tense === tense);
    const classic = pack?.exercises?.find((e) => e.type === "classic_table");
    if (classic) {
      setData({ answers: classic.answers, verbInfo: classic.verbInfo || null });
      // If the pack's verbInfo carries an English translation and we don't have one yet, use it.
      if (!translation && classic.verbInfo?.translationEn) {
        setTranslation(classic.verbInfo.translationEn);
      }
    }
  };

  const handleOpenChange = async (isOpen) => {
    setOpen(isOpen);
    if (!isOpen) return;

    // Kick off a lazy translation fetch for pre-existing verbs that lack one.
    if (!translation && verbId) {
      translateVerb(verbId)
        .then((r) => r?.translation_en && setTranslation(r.translation_en))
        .catch(() => {});
    }

    if (data) return;

    if (cachedPacks) {
      extractData(cachedPacks);
      return;
    }

    setLoading(true);
    try {
      const { packs } = await fetchPacks(verbId);
      onPacksFetched?.(packs);
      extractData(packs);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          style={{
            width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
            border: `1.5px solid ${C.border}`,
            background: "transparent", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, fontWeight: 800, fontFamily: "Georgia, serif",
            color: C.muted, lineHeight: 1, padding: 0,
            transition: "border-color 0.15s, color 0.15s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#9CA3AF"; e.currentTarget.style.color = "#4B5563"; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.muted; }}
          aria-label="Ver conjugaciones"
        >
          i
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="end"
        style={{ width: 420, maxWidth: "calc(100vw - 32px)", padding: 0 }}
        sideOffset={8}
      >
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 32 }}>
            <div style={{
              width: 20, height: 20, borderRadius: "50%",
              border: "2px solid #E5E7EB", borderTopColor: "#059669",
              animation: "gpdfSpin 0.8s linear infinite",
            }} />
          </div>
        ) : data ? (
          <div style={{ padding: 16 }}>
            {/* Verb + English translation */}
            {(verb?.infinitive || translation) && (
              <div style={{
                display: "flex", alignItems: "baseline", gap: 8,
                paddingBottom: 10, marginBottom: 12,
                borderBottom: "1px solid #F3F4F6",
              }}>
                <span style={{
                  fontSize: 18, fontWeight: 800, color: C.text,
                  fontFamily: "'Nunito', sans-serif",
                }}>
                  {verb?.infinitive}
                </span>
                {translation && (
                  <span style={{
                    fontSize: 13, fontWeight: 600, color: "#6B7280",
                    fontFamily: "'Nunito', sans-serif", fontStyle: "italic",
                  }}>
                    — {translation}
                  </span>
                )}
              </div>
            )}
            {/* Two-column layout */}
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              {/* Conjugation table */}
              <div style={{ flexShrink: 0, width: 170 }}>
                {PRONOUN_LABELS.map(({ key, label }) => (
                  <div key={key} style={{
                    display: "flex", alignItems: "baseline", justifyContent: "space-between",
                    padding: "3px 0",
                  }}>
                    <span style={{
                      fontSize: 12, color: "#6B7280",
                      fontFamily: "'Nunito', sans-serif",
                    }}>
                      {label}
                    </span>
                    <span style={{
                      fontSize: 13, fontWeight: 800, color: C.text,
                      fontFamily: "'Nunito', sans-serif", marginLeft: 12,
                    }}>
                      {data.answers?.[key] || "—"}
                    </span>
                  </div>
                ))}
              </div>

              {/* Explanation card */}
              {data.verbInfo ? (
                <div style={{
                  flex: 1, minWidth: 160,
                  borderLeft: "3px solid #F5E6C8", paddingLeft: 12,
                }}>
                  {data.verbInfo.meaning && (
                    <>
                      <p style={{
                        fontSize: 10, fontWeight: 700, color: "#9CA3AF",
                        textTransform: "uppercase", letterSpacing: "0.05em",
                        margin: "0 0 4px",
                      }}>
                        Significado
                      </p>
                      <p style={{
                        fontSize: 13, color: "#1F2937", margin: "0 0 12px",
                        lineHeight: 1.5, fontFamily: "'Nunito', sans-serif",
                      }}>
                        {data.verbInfo.meaning}
                      </p>
                    </>
                  )}
                  <p style={{
                    fontSize: 13, fontWeight: 800, color: C.text, margin: "0 0 4px",
                    fontFamily: "'Nunito', sans-serif",
                  }}>
                    {data.verbInfo.type}
                  </p>
                  <p style={{
                    fontSize: 12, color: "#4B5563", margin: "0 0 12px",
                    lineHeight: 1.5, fontFamily: "'Nunito', sans-serif",
                  }}>
                    {data.verbInfo.rule}
                  </p>

                  <p style={{
                    fontSize: 10, fontWeight: 700, color: "#9CA3AF",
                    textTransform: "uppercase", letterSpacing: "0.05em",
                    margin: "0 0 4px",
                  }}>
                    Ejemplo
                  </p>
                  <p style={{
                    fontSize: 13, color: "#1F2937", margin: 0,
                    lineHeight: 1.5, fontFamily: "'Nunito', sans-serif",
                  }}>
                    <HighlightedExample
                      sentence={data.verbInfo.example.sentence}
                      word={data.verbInfo.example.highlightedWord}
                    />
                  </p>
                </div>
              ) : (
                <div style={{
                  flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                  padding: "0 8px",
                }}>
                  <p style={{
                    fontSize: 11, color: "#9CA3AF", textAlign: "center",
                    lineHeight: 1.5, fontFamily: "'Nunito', sans-serif", margin: 0,
                  }}>
                    Regenera el paquete para ver la explicación
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{
              marginTop: 12, paddingTop: 8,
              borderTop: "1px solid #F3F4F6",
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <svg
                width="12" height="12" viewBox="0 0 24 24"
                fill="none" stroke="#D1D5DB" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="8.01" />
                <line x1="12" y1="12" x2="12" y2="16" />
              </svg>
              <span style={{
                fontSize: 10, color: "#9CA3AF",
                fontFamily: "'Nunito', sans-serif",
              }}>
                Generado con IA
              </span>
            </div>
          </div>
        ) : (
          <div style={{ padding: 24, textAlign: "center" }}>
            <p style={{
              fontSize: 11, color: "#9CA3AF", margin: 0,
              fontFamily: "'Nunito', sans-serif",
            }}>
              No se pudo cargar la información
            </p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
