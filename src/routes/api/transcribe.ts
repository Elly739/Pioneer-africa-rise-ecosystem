import { createFileRoute } from "@tanstack/react-router";
import { authenticateRequest } from "@/lib/api/chat-auth.server";

const MAX_BYTES = 12 * 1024 * 1024;

export const Route = createFileRoute("/api/transcribe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await authenticateRequest(request);
        if (!auth) return new Response("Unauthorized", { status: 401 });

        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) return new Response("Voice input is not configured.", { status: 500 });

        const form = await request.formData();
        const file = form.get("file");
        if (!(file instanceof File) || file.size === 0) {
          return new Response("No audio received.", { status: 400 });
        }
        if (file.size > MAX_BYTES) {
          return new Response("That recording is too long. Keep it under a minute.", { status: 400 });
        }
        const language = String(form.get("language") ?? "");

        const upstream = new FormData();
        upstream.append("model", "google/gemini-3.5-transcribe");
        upstream.append("file", file, "recording.wav");
        if (language && language !== "auto") upstream.append("language", language);

        const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}` },
          body: upstream,
        });

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          return new Response(text || "Transcription failed.", { status: res.status });
        }
        const json = (await res.json()) as { text?: string };
        return Response.json({ text: json.text ?? "" });
      },
    },
  },
});
