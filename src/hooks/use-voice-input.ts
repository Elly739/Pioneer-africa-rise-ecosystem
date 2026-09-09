import { useCallback, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

function encodeWav(chunks: Float32Array[], sampleRate: number): Blob {
  const target = 16000;
  const merged = new Float32Array(chunks.reduce((n, c) => n + c.length, 0));
  let offset = 0;
  for (const c of chunks) {
    merged.set(c, offset);
    offset += c.length;
  }
  const ratio = sampleRate / target;
  const outLength = Math.floor(merged.length / ratio);
  const samples = new Int16Array(outLength);
  for (let i = 0; i < outLength; i++) {
    const s = Math.max(-1, Math.min(1, merged[Math.floor(i * ratio)] ?? 0));
    samples[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeString = (pos: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(pos + i, str.charCodeAt(i));
  };
  writeString(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, target, true);
  view.setUint32(28, target * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, samples.length * 2, true);
  new Int16Array(buffer, 44).set(samples);
  return new Blob([buffer], { type: "audio/wav" });
}

/** Records the microphone as WAV and transcribes it with the platform's speech model. */
export function useVoiceInput(language: string, onText: (text: string) => void) {
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<{
    ctx: AudioContext;
    stream: MediaStream;
    node: ScriptProcessorNode;
    source: MediaStreamAudioSourceNode;
    chunks: Float32Array[];
  } | null>(null);

  const start = useCallback(async () => {
    setError(null);
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError("Microphone access is needed to record.");
      return;
    }
    const ctx = new AudioContext();
    const source = ctx.createMediaStreamSource(stream);
    const node = ctx.createScriptProcessor(4096, 1, 1);
    const chunks: Float32Array[] = [];
    node.onaudioprocess = (e) => chunks.push(new Float32Array(e.inputBuffer.getChannelData(0)));
    source.connect(node);
    node.connect(ctx.destination);
    ref.current = { ctx, stream, node, source, chunks };
    setRecording(true);
  }, []);

  const stop = useCallback(async () => {
    const r = ref.current;
    ref.current = null;
    setRecording(false);
    if (!r) return;
    r.stream.getTracks().forEach((t) => t.stop());
    r.node.disconnect();
    r.source.disconnect();
    const blob = encodeWav(r.chunks, r.ctx.sampleRate);
    await r.ctx.close();
    if (blob.size < 4096) {
      setError("That recording was empty — try again.");
      return;
    }
    setTranscribing(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const form = new FormData();
      form.append("file", blob, "recording.wav");
      if (language !== "en") form.append("language", language);
      const res = await fetch("/api/transcribe", {
        method: "POST",
        headers: session.session?.access_token
          ? { Authorization: `Bearer ${session.session.access_token}` }
          : {},
        body: form,
      });
      if (!res.ok) {
        setError((await res.text().catch(() => "")) || "Could not transcribe that.");
        return;
      }
      const json = (await res.json()) as { text?: string };
      if (json.text?.trim()) onText(json.text.trim());
      else setError("Nothing was picked up — try again.");
    } catch {
      setError("Could not transcribe that.");
    } finally {
      setTranscribing(false);
    }
  }, [language, onText]);

  return { recording, transcribing, error, start, stop, clearError: () => setError(null) };
}
