import { useCallback, useEffect, useRef, useState } from "react";
import { STT_PATH } from "./messages.js";
import { getCachedSession } from "../supabase.js";

const MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg;codecs=opus",
];

function pickMimeType() {
  if (
    typeof MediaRecorder === "undefined" ||
    typeof MediaRecorder.isTypeSupported !== "function"
  ) {
    return null;
  }
  for (const mime of MIME_CANDIDATES) {
    if (MediaRecorder.isTypeSupported(mime)) return mime;
  }
  return null;
}

// Server sends raw PCM from ElevenLabs (output_format=pcm_22050):
// 16-bit signed little-endian mono. Decode directly into a Float32 AudioBuffer
// so chunks concatenate sample-accurate with no codec priming/padding gaps.
const PCM_SAMPLE_RATE = 22050;

function pcmBase64ToAudioBuffer(ctx, b64) {
  const bin = atob(b64);
  const len = bin.length;
  if (len < 2) return null;
  const samples = len >> 1;
  const buffer = ctx.createBuffer(1, samples, PCM_SAMPLE_RATE);
  const channel = buffer.getChannelData(0);
  for (let i = 0; i < samples; i++) {
    const lo = bin.charCodeAt(i * 2);
    const hi = bin.charCodeAt(i * 2 + 1);
    let s = (hi << 8) | lo;
    if (s & 0x8000) s |= ~0xffff;
    channel[i] = s / 32768;
  }
  return buffer;
}

// `wsUrl` absolute (ws://host:3100/api/stt) or "" to derive from window.
// `lessonContextRef` is a ref holding the current lesson-context string so the
// hook reads the latest value without re-subscribing.
// `systemInstructionRef` (optional) is a ref holding the Carolina-voice system
// prompt built by /api/carolina2-prompt — sent to the sidecar on greet/start.
export function useCarolina2Voice(wsUrl, lessonContextRef, systemInstructionRef) {
  const [status, setStatus] = useState("idle");
  const [userText, setUserText] = useState("");
  const [partial, setPartial] = useState("");
  const [assistantText, setAssistantText] = useState("");
  const [sttLatencyMs, setSttLatencyMs] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [session, setSession] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [mimeType, setMimeType] = useState("");

  const wsRef = useRef(null);
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const mimeRef = useRef("");
  const releasedAtRef = useRef(null);
  const sttMeasuredRef = useRef(false);

  const audioCtxRef = useRef(null);
  const nextStartRef = useRef(0);
  const activeSourcesRef = useRef([]);

  const mountedRef = useRef(true);
  const reconnectAttemptsRef = useRef(0);

  // `callActiveRef` is true between greet() and endCall(). When the server
  // signals tts_done we auto-fire startTurn() so the user's mic opens for the
  // next turn — strict turn loop matching the original Carolina turn mode.
  const callActiveRef = useRef(false);
  const startTurnRef = useRef(() => {});

  const stopPlayback = useCallback(() => {
    for (const src of activeSourcesRef.current) {
      try {
        src.stop();
      } catch {
        // already stopped
      }
    }
    activeSourcesRef.current = [];
    nextStartRef.current = 0;
    const ctx = audioCtxRef.current;
    if (ctx && ctx.state === "running") {
      ctx.suspend().then(
        () => ctx.resume().catch(() => {}),
        () => {},
      );
    }
  }, []);

  const enqueueAudio = useCallback((b64) => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    const buffer = pcmBase64ToAudioBuffer(ctx, b64);
    if (!buffer) return;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(ctx.destination);
    const startAt = Math.max(ctx.currentTime, nextStartRef.current);
    src.start(startAt);
    nextStartRef.current = startAt + buffer.duration;
    activeSourcesRef.current.push(src);
    src.onended = () => {
      activeSourcesRef.current = activeSourcesRef.current.filter(
        (s) => s !== src,
      );
    };
  }, []);

  const handleMessage = useCallback(
    (msg) => {
      if (msg.type === "ready") {
        const stream = streamRef.current;
        const mime = mimeRef.current;
        if (!stream || !mime) return;
        const recorder = new MediaRecorder(stream, { mimeType: mime });
        recorderRef.current = recorder;
        recorder.ondataavailable = (e) => {
          const ws = wsRef.current;
          if (e.data.size > 0 && ws && ws.readyState === WebSocket.OPEN) {
            ws.send(e.data);
          }
        };
        recorder.start(250);
        setStatus("recording");
      } else if (msg.type === "partial") {
        setPartial(msg.text);
      } else if (msg.type === "final") {
        if (
          !sttMeasuredRef.current &&
          releasedAtRef.current !== null &&
          msg.text.trim() !== ""
        ) {
          sttMeasuredRef.current = true;
          setSttLatencyMs(
            Math.round(performance.now() - releasedAtRef.current),
          );
        }
        setPartial("");
      } else if (msg.type === "user_transcript") {
        setUserText(msg.text);
        setPartial("");
        setStatus("thinking");
      } else if (msg.type === "assistant_delta") {
        if (!callActiveRef.current) return;
        setStatus("speaking");
        setAssistantText((prev) => prev + msg.text);
      } else if (msg.type === "tts_chunk") {
        if (!callActiveRef.current) return;
        enqueueAudio(msg.audio);
      } else if (msg.type === "assistant_done") {
        if (msg.text) setAssistantText(msg.text);
      } else if (msg.type === "tts_done") {
        if (callActiveRef.current) {
          // Strict turn mode: Carolina just finished, open the user's mic.
          // startTurn itself sets status to "connecting" → "recording".
          Promise.resolve().then(() => startTurnRef.current());
        } else {
          setStatus("idle");
        }
      } else if (msg.type === "metrics") {
        setMetrics({
          ttft: msg.ttft,
          ttfa: msg.ttfa,
          ttfaReflex: msg.ttfaReflex,
          perceived: msg.perceived,
          total: msg.total,
          ttsChars: msg.ttsChars,
          sessionTtsChars: msg.sessionTtsChars,
          elExactSessionChars: msg.elExactSessionChars,
          elCharsRemaining: msg.elCharsRemaining,
        });
        setSession((prev) => {
          const hasExact = typeof msg.elExactSessionChars === "number";
          if (!hasExact && prev?.exact) return prev;
          return {
            chars: hasExact ? msg.elExactSessionChars : msg.sessionTtsChars,
            exact: hasExact,
            remaining: msg.elCharsRemaining ?? null,
          };
        });
      } else if (msg.type === "error") {
        setStatus("error");
        setErrorMsg(msg.message);
      } else if (msg.type === "closed") {
        setStatus((s) => (s === "error" ? s : "idle"));
      }
    },
    [enqueueAudio],
  );

  const handleMessageRef = useRef(handleMessage);
  useEffect(() => {
    handleMessageRef.current = handleMessage;
  }, [handleMessage]);

  const resolveUrl = useCallback(() => {
    if (wsUrl) return wsUrl;
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    return `${proto}://${window.location.host}${STT_PATH}`;
  }, [wsUrl]);

  const connectRef = useRef(() => {});
  const connect = useCallback(() => {
    if (
      wsRef.current &&
      (wsRef.current.readyState === WebSocket.OPEN ||
        wsRef.current.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }
    const ws = new WebSocket(resolveUrl());
    ws.binaryType = "arraybuffer";
    wsRef.current = ws;
    ws.onopen = () => {
      reconnectAttemptsRef.current = 0;
    };
    ws.onmessage = (ev) => {
      let msg;
      try {
        msg = JSON.parse(ev.data);
      } catch {
        return;
      }
      handleMessageRef.current(msg);
    };
    ws.onclose = () => {
      if (!mountedRef.current) return;
      const attempt = reconnectAttemptsRef.current++;
      const delay = Math.min(500 * 2 ** attempt, 8000);
      setTimeout(() => {
        if (mountedRef.current) connectRef.current();
      }, delay);
    };
    ws.onerror = () => {
      ws.close();
    };
  }, [resolveUrl]);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  useEffect(() => {
    mountedRef.current = true;
    connect();
    return () => {
      mountedRef.current = false;
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== "inactive") recorder.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      stopPlayback();
      audioCtxRef.current?.close();
      wsRef.current?.close();
    };
  }, [connect, stopPlayback]);

  const startTurn = useCallback(async () => {
    if (status === "recording" || status === "connecting") return;

    setUserText("");
    setPartial("");
    setAssistantText("");
    setSttLatencyMs(null);
    setMetrics(null);
    setErrorMsg("");
    releasedAtRef.current = null;
    sttMeasuredRef.current = false;
    setStatus("connecting");

    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }
    if (audioCtxRef.current.state === "suspended") {
      await audioCtxRef.current.resume();
    }
    stopPlayback();

    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("error");
      setErrorMsg(
        "Microphone unavailable. Use a secure context (https:// or localhost).",
      );
      return;
    }
    const mime = pickMimeType();
    if (!mime) {
      setStatus("error");
      setErrorMsg("This browser does not support MediaRecorder audio capture.");
      return;
    }
    mimeRef.current = mime;
    setMimeType(mime);

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
    } catch {
      setStatus("error");
      setErrorMsg("Microphone permission denied.");
      return;
    }
    streamRef.current = stream;

    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      setStatus("error");
      setErrorMsg("Not connected to the voice service. Retrying — try again shortly.");
      connect();
      stream.getTracks().forEach((t) => t.stop());
      return;
    }
    const token = getCachedSession()?.access_token || "";
    ws.send(
      JSON.stringify({
        type: "start",
        mimeType: mime,
        token,
        lessonContext: lessonContextRef.current || "",
        systemInstruction: systemInstructionRef?.current || "",
      }),
    );
  }, [status, connect, stopPlayback, lessonContextRef, systemInstructionRef]);

  useEffect(() => {
    startTurnRef.current = startTurn;
  }, [startTurn]);

  const greet = useCallback(async () => {
    callActiveRef.current = true;
    setUserText("");
    setPartial("");
    setAssistantText("");
    setSttLatencyMs(null);
    setMetrics(null);
    setErrorMsg("");

    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }
    if (audioCtxRef.current.state === "suspended") {
      await audioCtxRef.current.resume();
    }
    stopPlayback();

    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      setStatus("error");
      setErrorMsg("Not connected to the voice service. Retrying — try again shortly.");
      connect();
      return;
    }
    const token = getCachedSession()?.access_token || "";
    setStatus("thinking");
    ws.send(
      JSON.stringify({
        type: "greet",
        token,
        lessonContext: lessonContextRef.current || "",
        systemInstruction: systemInstructionRef?.current || "",
      }),
    );
  }, [connect, stopPlayback, lessonContextRef, systemInstructionRef]);

  const endCall = useCallback(() => {
    callActiveRef.current = false;
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
    recorderRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    stopPlayback();
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "cancel" }));
    }
    setStatus("idle");
    setUserText("");
    setPartial("");
    setAssistantText("");
  }, [stopPlayback]);

  const endTurn = useCallback(() => {
    if (status !== "recording" && status !== "connecting") return;
    releasedAtRef.current = performance.now();
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    recorderRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "stop" }));
    }
    setStatus("thinking");
  }, [status]);

  return {
    status,
    userText,
    partial,
    assistantText,
    sttLatencyMs,
    metrics,
    session,
    errorMsg,
    mimeType,
    startTurn,
    endTurn,
    greet,
    endCall,
  };
}
