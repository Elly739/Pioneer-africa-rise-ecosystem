import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, stepCountIs, type UIMessage } from "ai";
import { createLovableAiGatewayProvider, CHAT_MODEL } from "@/lib/ai-gateway.server";
import { SYSTEM_PROMPTS, GROUNDING_RULES, TOOL_RULES, languageRule } from "@/lib/ai-prompts.server";
import { authenticateRequest } from "@/lib/api/chat-auth.server";
import { buildLearnerContext } from "@/lib/api/ai-context.server";
import { buildCoachTools } from "@/lib/api/ai-tools.server";

type Body = {
  messages?: UIMessage[];
  kind?: "mentor" | "advisor";
  conversationId?: string | null;
  language?: string;
  contextLabel?: string | null;
};

function textOf(message: UIMessage | undefined): string {
  if (!message) return "";
  return (message.parts ?? [])
    .map((p) => (p.type === "text" ? p.text : ""))
    .join("")
    .trim();
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await authenticateRequest(request);
        if (!auth) return new Response("Unauthorized", { status: 401 });
        const { supabase, userId } = auth;

        const body = (await request.json()) as Body;
        const messages = body.messages;
        const kind = body.kind === "advisor" ? "advisor" : "mentor";
        if (!Array.isArray(messages) || messages.length === 0) {
          return new Response("Messages are required", { status: 400 });
        }

        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) return new Response("AI is not configured on this app.", { status: 500 });

        // --- conversation persistence -------------------------------------
        let conversationId = body.conversationId ?? null;
        const lastUserText = textOf([...messages].reverse().find((m) => m.role === "user"));

        if (!conversationId) {
          const { data: conv, error } = await supabase
            .from("ai_conversations")
            .insert({
              user_id: userId,
              kind,
              title: (lastUserText || "New chat").slice(0, 60),
              context_label: body.contextLabel ?? null,
            })
            .select("id")
            .single();
          if (error) return new Response(error.message, { status: 400 });
          conversationId = conv.id;
        } else {
          const { data: owned } = await supabase
            .from("ai_conversations")
            .select("id")
            .eq("id", conversationId)
            .eq("user_id", userId)
            .maybeSingle();
          if (!owned) return new Response("Conversation not found", { status: 404 });
          await supabase
            .from("ai_conversations")
            .update({ updated_at: new Date().toISOString() })
            .eq("id", conversationId);
        }

        if (lastUserText) {
          await supabase
            .from("ai_messages")
            .insert({ conversation_id: conversationId, role: "user", content: lastUserText });
        }

        const grounding = await buildLearnerContext(supabase as never, userId).catch(() => "");

        const gateway = createLovableAiGatewayProvider(apiKey);
        const result = streamText({
          model: gateway(CHAT_MODEL),
          system: [
            SYSTEM_PROMPTS[kind],
            TOOL_RULES,
            languageRule(body.language ?? "en"),
            body.contextLabel ? `The learner opened this chat from: ${body.contextLabel}.` : "",
            grounding ? `${GROUNDING_RULES}\n\n${grounding}` : "",
          ]
            .filter(Boolean)
            .join("\n\n"),
          messages: await convertToModelMessages(messages),
          tools: buildCoachTools(supabase as never, userId),
          stopWhen: stepCountIs(50),
        });

        return result.toUIMessageStreamResponse({
          originalMessages: messages,
          headers: { "x-conversation-id": conversationId! },
          onFinish: async ({ responseMessage }) => {
            const reply = textOf(responseMessage);
            if (reply) {
              await supabase.from("ai_messages").insert({
                conversation_id: conversationId!,
                role: "assistant",
                content: reply,
              });
            }
          },
          onError: (error) => {
            const message = error instanceof Error ? error.message : String(error);
            if (/402|payment|credit/i.test(message)) {
              return "AI credits are exhausted for this workspace. The app owner needs to top up credits in Lovable to continue.";
            }
            if (/429|rate limit/i.test(message)) {
              return "The AI is busy right now (rate limited). Wait a few seconds and send your message again.";
            }
            if (/403/.test(message)) {
              return "AI access is currently blocked for this workspace. Ask the app owner to re-enable it.";
            }
            console.error("[ai chat]", message);
            return "Something went wrong reaching the AI. Please try again.";
          },
        });
      },
    },
  },
});
