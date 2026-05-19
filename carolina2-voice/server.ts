import { createServer } from "node:http";
import { config as loadEnv } from "dotenv";
import { WebSocketServer, WebSocket } from "ws";
import {
  createClient as createDeepgram,
  LiveTranscriptionEvents,
  type ListenLiveClient,
} from "@deepgram/sdk";
import { createClient as createSupabase } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
import type { ClientMessage, ServerMessage } from "./types.ts";
import { STT_PATH } from "./types.ts";
import { buildBrainSystem } from "./prompt.ts";

loadEnv();

const port = Number(process.env.PORT) || 3100;
const BRAIN_MODEL = process.env.ANTHROPIC_BRAIN_MODEL || "claude-opus-4-7";
const REFLEX_MODEL =
  process.env.ANTHROPIC_REFLEX_MODEL || "claude-haiku-4-5-20251001";
const ELEVENLABS_MODEL = "eleven_flash_v2_5";
const HISTORY_CAP = 20;
const REFLEX_GATE_MS = 1500;
const reflexEnabled = () => process.env.DISABLE_REFLEX !== "1";
const ttsSpeed = () => {
  const n = Number(process.env.ELEVENLABS_SPEED);
  return Number.isFinite(n) && n > 0 ? Math.min(1.2, Math.max(0.7, n)) : 1.0;
};

const REFLEX_PROMPT = `You generate ONE very short Spanish filler/acknowledgment to buy thinking time.
Output 1-4 words only. Examples:
- "Mmm, a ver..."
- "Interesante..."
- "Vale, déjame pensar..."
- "Claro..."
- "Ah, sí..."
Match the user's emotional tone (curious, frustrated, excited).
Do NOT answer their question. Just acknowledge naturally.
NEVER output anything other than the filler. No quotes, no explanation.`;

const allowedOrigins = (process.env.CAROLINA2_ALLOWED_ORIGIN || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const supabase =
  process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY
    ? createSupabase(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_ANON_KEY,
      )
    : null;

async function verifyToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  if (!supabase) return false; // misconfigured sidecar → fail closed
  try {
    const { data, error } = await supabase.auth.getUser(token);
    return !error && !!data?.user;
  } catch {
    return false;
  }
}

type ChatMessage = { role: "user" | "assistant"; content: string };

function send(ws: WebSocket, msg: ServerMessage) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
}

const server = createServer((req, res) => {
  // Health/readiness only; this process serves no pages.
  if (req.method === "GET" && (req.url === "/" || req.url === "/health")) {
    res.writeHead(200, { "content-type": "text/plain" });
    res.end("carolina2-voice ok");
    return;
  }
  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({
  noServer: true,
  verifyClient: (info, cb) => {
    if (allowedOrigins.length === 0) return cb(true); // dev: allow all
    const origin = info.origin || "";
    cb(allowedOrigins.includes(origin), 403, "origin not allowed");
  },
});

server.on("upgrade", (req, socket, head) => {
  const url = new URL(req.url || "/", "http://localhost");
  if (url.pathname === STT_PATH) {
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req);
    });
  } else {
    socket.destroy();
  }
});

wss.on("connection", (ws: WebSocket) => {
  const dgKey = process.env.DEEPGRAM_API_KEY;
  if (!dgKey) {
    send(ws, {
      type: "error",
      message: "DEEPGRAM_API_KEY is not set on the server.",
    });
    ws.close();
    return;
  }

  const deepgram = createDeepgram(dgKey);
  const history: ChatMessage[] = [];
  let sessionTtsChars = 0;
  let elBaseChars: number | null = null;
  let elCharLimit: number | null = null;

  // Set once from the first authenticated `start`. The picked-lesson markdown
  // is chosen before the call, so it is constant for this connection.
  let authed = false;
  let lessonContext = "";

  const fetchElUsage = async (
    key: string,
  ): Promise<{ used: number; limit: number } | null> => {
    try {
      const res = await fetch("https://api.elevenlabs.io/v1/user/subscription", {
        headers: { "xi-api-key": key },
      });
      if (!res.ok) return null;
      const j = (await res.json()) as {
        character_count?: number;
        character_limit?: number;
      };
      if (typeof j.character_count !== "number") return null;
      return { used: j.character_count, limit: j.character_limit ?? 0 };
    } catch {
      return null;
    }
  };
  {
    const k = process.env.ELEVENLABS_API_KEY;
    if (k) {
      fetchElUsage(k).then((u) => {
        if (u) {
          elBaseChars = u.used;
          elCharLimit = u.limit;
        }
      });
    }
  }

  let dgConn: ListenLiveClient | null = null;
  let utteranceParts: string[] = [];
  let finalizeTimer: NodeJS.Timeout | null = null;
  let finalized = false;
  let socketClosed = false;

  type TtsHandle = {
    feed: (text: string) => void;
    endInput: () => void;
    close: () => void;
  };
  let currentAbort: AbortController | null = null;
  let elReflex: TtsHandle | null = null;
  let elBrain: TtsHandle | null = null;
  let clearGate: (() => void) | null = null;

  const cancelTurn = () => {
    if (currentAbort) {
      currentAbort.abort();
      currentAbort = null;
    }
    if (clearGate) {
      clearGate();
      clearGate = null;
    }
    elReflex?.close();
    elBrain?.close();
    elReflex = null;
    elBrain = null;
  };

  const openTts = (
    voiceId: string,
    elKey: string,
    onAudio: (b64: string) => void,
    onFinal: () => void,
  ): TtsHandle => {
    const el = new WebSocket(
      `wss://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream-input` +
        `?model_id=${ELEVENLABS_MODEL}&output_format=mp3_22050_32`,
    );
    let elReady = false;
    let closed = false;
    const pending: string[] = [];

    const rawSend = (payload: object) => {
      if (el.readyState === WebSocket.OPEN) el.send(JSON.stringify(payload));
    };

    el.on("open", () => {
      elReady = true;
      rawSend({
        text: " ",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.8,
          speed: ttsSpeed(),
        },
        xi_api_key: elKey,
      });
      for (const p of pending) {
        rawSend(p === "" ? { text: "" } : { text: p, try_trigger_generation: true });
      }
      pending.length = 0;
    });

    el.on("message", (raw: Buffer) => {
      let payload: { audio?: string | null; isFinal?: boolean };
      try {
        payload = JSON.parse(raw.toString());
      } catch {
        return;
      }
      if (payload.audio) onAudio(payload.audio);
      if (payload.isFinal) onFinal();
    });

    el.on("error", (err: Error) => {
      send(ws, { type: "error", message: `ElevenLabs error: ${err.message}` });
    });

    return {
      feed: (text: string) => {
        if (!text) return;
        if (elReady) rawSend({ text, try_trigger_generation: true });
        else pending.push(text);
      },
      endInput: () => {
        if (elReady) rawSend({ text: "" });
        else pending.push("");
      },
      close: () => {
        if (closed) return;
        closed = true;
        try {
          el.close();
        } catch {
          // already closing
        }
      },
    };
  };

  const closeDeepgram = () => {
    if (dgConn) {
      try {
        dgConn.requestClose();
      } catch {
        // already closing
      }
      dgConn = null;
    }
  };

  const startDeepgram = () => {
    cancelTurn();
    closeDeepgram();
    if (finalizeTimer) {
      clearTimeout(finalizeTimer);
      finalizeTimer = null;
    }
    utteranceParts = [];
    finalized = false;

    dgConn = deepgram.listen.live({
      model: "nova-3",
      language: "es",
      interim_results: true,
      endpointing: 300,
      utterance_end_ms: 1000,
      vad_events: true,
      smart_format: true,
    });

    dgConn.on(LiveTranscriptionEvents.Open, () => {
      send(ws, { type: "ready" });
    });
    dgConn.on(LiveTranscriptionEvents.Transcript, (data) => {
      const alt = data?.channel?.alternatives?.[0];
      const text: string = alt?.transcript ?? "";
      if (!text) return;
      if (data.is_final) {
        utteranceParts.push(text);
        send(ws, { type: "final", text, ts: Date.now() });
      } else {
        send(ws, { type: "partial", text, ts: Date.now() });
      }
    });
    dgConn.on(LiveTranscriptionEvents.Error, (err) => {
      send(ws, {
        type: "error",
        message:
          typeof err?.message === "string" ? err.message : "Deepgram error",
      });
    });
    dgConn.on(LiveTranscriptionEvents.Close, () => {
      finalizeUtterance();
    });
  };

  const finalizeUtterance = () => {
    if (finalized) return;
    finalized = true;
    if (finalizeTimer) {
      clearTimeout(finalizeTimer);
      finalizeTimer = null;
    }
    const userText = utteranceParts.join(" ").replace(/\s+/g, " ").trim();
    utteranceParts = [];
    if (!userText) return;

    history.push({ role: "user", content: userText });
    if (history.length > HISTORY_CAP)
      history.splice(0, history.length - HISTORY_CAP);
    send(ws, { type: "user_transcript", text: userText });
    runTurn(userText);
  };

  const runTurn = (userText: string) => {
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    const elKey = process.env.ELEVENLABS_API_KEY;
    const voiceId = process.env.ELEVENLABS_VOICE_ID;
    if (!anthropicKey || !elKey || !voiceId) {
      send(ws, {
        type: "error",
        message:
          "Missing AI keys: set ANTHROPIC_API_KEY, ELEVENLABS_API_KEY and " +
          "ELEVENLABS_VOICE_ID in .env.",
      });
      return;
    }

    const REFLEX_ENABLED = reflexEnabled();
    const t0 = Date.now();
    let ttft = 0;
    let ttfa = 0;
    let ttfaReflex = 0;
    let perceived = 0;
    let fullText = "";
    let ttsBuffer = "";
    let turnTtsChars = 0;

    const ac = new AbortController();
    currentAbort = ac;
    const anthropic = new Anthropic({ apiKey: anthropicKey });

    const brainAudioBuffer: string[] = [];
    let gateOpen = false;

    const sendChunk = (audio: string, track: "reflex" | "brain") => {
      if (!perceived) perceived = Date.now() - t0;
      send(ws, { type: "tts_chunk", audio, track });
    };
    const openGate = () => {
      if (gateOpen) return;
      gateOpen = true;
      if (clearGate) {
        clearGate();
        clearGate = null;
      }
      for (const audio of brainAudioBuffer) sendChunk(audio, "brain");
      brainAudioBuffer.length = 0;
    };
    const gateTimer = setTimeout(openGate, REFLEX_GATE_MS);
    clearGate = () => clearTimeout(gateTimer);

    if (!REFLEX_ENABLED) {
      openGate();
    } else {
      const reflex = openTts(
        voiceId,
        elKey,
        (audio) => {
          if (!ttfaReflex) ttfaReflex = Date.now() - t0;
          sendChunk(audio, "reflex");
        },
        openGate,
      );
      elReflex = reflex;

      (async () => {
        let filler = "";
        try {
          const stream = anthropic.messages.stream(
            {
              model: REFLEX_MODEL,
              max_tokens: 30,
              system: REFLEX_PROMPT,
              messages: [{ role: "user", content: userText }],
            },
            { signal: ac.signal },
          );
          stream.on("text", (delta: string) => {
            filler += delta;
          });
          await stream.finalMessage();
          const fillerText = filler.trim();
          if (fillerText) {
            const chunk = fillerText + " ";
            turnTtsChars += chunk.length;
            reflex.feed(chunk);
            reflex.endInput();
          } else {
            openGate();
          }
        } catch {
          if (ac.signal.aborted) return;
          openGate();
        }
      })();
    }

    const brain = openTts(
      voiceId,
      elKey,
      (audio) => {
        if (!ttfa) ttfa = Date.now() - t0;
        if (gateOpen) sendChunk(audio, "brain");
        else brainAudioBuffer.push(audio);
      },
      () => {
        openGate();
        send(ws, { type: "tts_done" });
        sessionTtsChars += turnTtsChars;
        brain.close();
        if (elBrain === brain) elBrain = null;

        const baseMetrics = {
          type: "metrics" as const,
          ttft,
          ttfa,
          ttfaReflex,
          perceived,
          total: Date.now() - t0,
          ttsChars: turnTtsChars,
          sessionTtsChars,
        };
        send(ws, baseMetrics);

        if (elKey) {
          fetchElUsage(elKey).then((u) => {
            if (!u) return;
            if (elBaseChars === null) elBaseChars = u.used;
            if (elCharLimit === null) elCharLimit = u.limit;
            send(ws, {
              ...baseMetrics,
              elExactSessionChars: Math.max(0, u.used - elBaseChars),
              elCharsRemaining:
                u.limit > 0 ? Math.max(0, u.limit - u.used) : null,
            });
          });
        }
      },
    );
    elBrain = brain;

    const maybeFlush = (force: boolean) => {
      if (force) {
        if (ttsBuffer.trim()) {
          const chunk = ttsBuffer + " ";
          turnTtsChars += chunk.length;
          brain.feed(chunk);
        }
        ttsBuffer = "";
        return;
      }
      if (/[.?!,]/.test(ttsBuffer) || ttsBuffer.length >= 20) {
        const chunk = ttsBuffer + " ";
        turnTtsChars += chunk.length;
        brain.feed(chunk);
        ttsBuffer = "";
      }
    };

    (async () => {
      try {
        const stream = anthropic.messages.stream(
          {
            model: BRAIN_MODEL,
            max_tokens: 400,
            system: buildBrainSystem(lessonContext, REFLEX_ENABLED),
            messages: history.map((m) => ({
              role: m.role,
              content: m.content,
            })),
          },
          { signal: ac.signal },
        );
        stream.on("text", (delta: string) => {
          if (!ttft) ttft = Date.now() - t0;
          fullText += delta;
          ttsBuffer += delta;
          send(ws, { type: "assistant_delta", text: delta });
          maybeFlush(false);
        });
        await stream.finalMessage();
        maybeFlush(true);
        brain.endInput();

        const finalText = fullText.trim();
        if (finalText) {
          history.push({ role: "assistant", content: finalText });
          if (history.length > HISTORY_CAP)
            history.splice(0, history.length - HISTORY_CAP);
        }
        send(ws, { type: "assistant_done", text: finalText });
      } catch (err) {
        if (ac.signal.aborted) return;
        send(ws, {
          type: "error",
          message:
            err instanceof Error ? err.message : "Anthropic stream failed",
        });
        brain.close();
      } finally {
        if (currentAbort === ac) currentAbort = null;
      }
    })();
  };

  ws.on("message", async (data: Buffer, isBinary: boolean) => {
    if (socketClosed) return;
    if (isBinary) {
      if (authed && dgConn && dgConn.getReadyState() === 1) {
        const ab = data.buffer.slice(
          data.byteOffset,
          data.byteOffset + data.byteLength,
        ) as ArrayBuffer;
        dgConn.send(ab);
      }
      return;
    }
    let msg: ClientMessage;
    try {
      msg = JSON.parse(data.toString()) as ClientMessage;
    } catch {
      return;
    }
    if (msg.type === "start") {
      if (!authed) {
        const ok = await verifyToken(msg.token);
        if (!ok) {
          send(ws, { type: "error", message: "unauthorized" });
          ws.close();
          return;
        }
        authed = true;
        lessonContext = (msg.lessonContext || "").toString();
      }
      startDeepgram();
    } else if (msg.type === "stop") {
      if (!authed) return;
      closeDeepgram();
      if (finalizeTimer) clearTimeout(finalizeTimer);
      finalizeTimer = setTimeout(finalizeUtterance, 1500);
    }
  });

  ws.on("close", () => {
    socketClosed = true;
    if (finalizeTimer) clearTimeout(finalizeTimer);
    cancelTurn();
    closeDeepgram();
  });
  ws.on("error", () => {
    socketClosed = true;
    if (finalizeTimer) clearTimeout(finalizeTimer);
    cancelTurn();
    closeDeepgram();
  });
});

server.listen(port, () => {
  console.log(`> carolina2-voice ready on http://localhost:${port} (ws ${STT_PATH})`);
});
