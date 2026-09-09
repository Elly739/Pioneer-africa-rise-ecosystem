import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { supabase } from "@/integrations/supabase/client";
import {
  getConversation,
  listMyConversations,
  renameConversation,
  deleteConversation,
} from "@/lib/api/ai.functions";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTools,
  PromptInputButton,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Tool, ToolHeader, ToolContent, ToolInput, ToolOutput } from "@/components/ai-elements/tool";
import { useVoiceInput } from "@/hooks/use-voice-input";
import { Mic, Square, Plus, Trash2, Pencil, MessagesSquare, X } from "lucide-react";
import { toast } from "sonner";

type Kind = "mentor" | "advisor";
type ConvRow = {
  id: string;
  title: string | null;
  created_at: string;
  updated_at?: string | null;
  context_label?: string | null;
};

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "sw", label: "Kiswahili" },
  { code: "fr", label: "Français" },
];

function timeAgo(iso?: string | null) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function CoachChat({
  kind,
  intro,
  suggestions,
  contextLabel,
  initialPrompt,
}: {
  kind: Kind;
  intro: string;
  suggestions: string[];
  contextLabel?: string | null;
  initialPrompt?: string | null;
}) {
  const listConvs = useServerFn(listMyConversations);
  const loadConv = useServerFn(getConversation);
  const rename = useServerFn(renameConversation);
  const remove = useServerFn(deleteConversation);

  const [conversations, setConversations] = useState<ConvRow[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [sessionKey, setSessionKey] = useState(() => crypto.randomUUID());
  const [initialMessages, setInitialMessages] = useState<UIMessage[]>([]);
  const [language, setLanguage] = useState("en");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [input, setInput] = useState("");
  const convIdRef = useRef<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const refreshList = useCallback(() => {
    listConvs({ data: { kind } })
      .then((rows) => setConversations(rows as ConvRow[]))
      .catch(() => undefined);
  }, [listConvs, kind]);

  useEffect(() => {
    refreshList();
  }, [refreshList]);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        fetch: async (url, options) => {
          const { data } = await supabase.auth.getSession();
          const headers = new Headers(options?.headers);
          if (data.session?.access_token) {
            headers.set("Authorization", `Bearer ${data.session.access_token}`);
          }
          const res = await fetch(url, { ...options, headers });
          const newId = res.headers.get("x-conversation-id");
          if (newId && newId !== convIdRef.current) {
            convIdRef.current = newId;
            setConversationId(newId);
            setTimeout(refreshList, 800);
          }
          return res;
        },
      }),
    [refreshList],
  );

  const { messages, sendMessage, status, error, stop } = useChat({
    id: sessionKey,
    messages: initialMessages,
    transport,
  });

  const busy = status === "submitted" || status === "streaming";

  const focusInput = useCallback(() => {
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  useEffect(() => {
    if (!busy) focusInput();
  }, [busy, sessionKey, focusInput]);

  const send = useCallback(
    (text: string) => {
      const value = text.trim();
      if (!value || busy) return;
      setInput("");
      void sendMessage(
        { text: value },
        {
          body: {
            kind,
            language,
            conversationId: convIdRef.current,
            contextLabel: contextLabel ?? null,
          },
        },
      );
      focusInput();
    },
    [busy, sendMessage, kind, language, contextLabel, focusInput],
  );

  // Context-aware entry point: prefill and auto-send the prompt passed in the URL.
  const firedInitial = useRef(false);
  useEffect(() => {
    if (firedInitial.current || !initialPrompt) return;
    firedInitial.current = true;
    send(initialPrompt);
  }, [initialPrompt, send]);

  const voice = useVoiceInput(language, (text) =>
    setInput((prev) => (prev ? `${prev} ${text}` : text)),
  );

  async function openConversation(id: string) {
    try {
      const res = await loadConv({ data: { conversationId: id } });
      const restored: UIMessage[] = res.messages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({
          id: m.id,
          role: m.role as "user" | "assistant",
          parts: [{ type: "text" as const, text: m.content }],
        }));
      convIdRef.current = id;
      setConversationId(id);
      setInitialMessages(restored);
      setSessionKey(id);
      setSidebarOpen(false);
    } catch {
      toast.error("Could not open that chat.");
    }
  }

  function newChat() {
    convIdRef.current = null;
    setConversationId(null);
    setInitialMessages([]);
    setSessionKey(crypto.randomUUID());
    setSidebarOpen(false);
    focusInput();
  }

  async function handleRename(row: ConvRow) {
    const title = window.prompt("Rename this chat", row.title ?? "");
    if (!title?.trim()) return;
    await rename({ data: { conversationId: row.id, title: title.trim().slice(0, 80) } });
    refreshList();
  }

  async function handleDelete(row: ConvRow) {
    if (!window.confirm("Delete this chat?")) return;
    await remove({ data: { conversationId: row.id } });
    if (convIdRef.current === row.id) newChat();
    refreshList();
  }

  const errorMessage = error
    ? /402|credit|payment/i.test(error.message)
      ? "The AI credits for this workspace have run out. The app owner needs to top up to keep the coach running."
      : /429|rate/i.test(error.message)
        ? "The coach is handling a lot of requests right now. Wait a few seconds and send it again."
        : /401|unauthor/i.test(error.message)
          ? "Your session expired. Refresh the page and sign in again."
          : "Something went wrong reaching the coach. Try again."
    : null;

  return (
    <div className="flex gap-4 h-[calc(100vh-11rem)] max-w-6xl mx-auto w-full px-4">
      {/* Past chats */}
      <aside
        className={`${sidebarOpen ? "fixed inset-0 z-40 bg-brand-bg p-4 overflow-y-auto" : "hidden"} md:static md:block md:w-64 md:shrink-0 md:p-0`}
      >
        <div className="flex items-center justify-between mb-3 md:hidden">
          <span className="font-bold">Your chats</span>
          <button onClick={() => setSidebarOpen(false)} aria-label="Close chat list">
            <X className="size-5" />
          </button>
        </div>
        <button
          onClick={newChat}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-brand-navy text-white text-sm font-bold mb-3 focus-visible:ring-2 focus-visible:ring-brand-mint"
        >
          <Plus className="size-4" /> New chat
        </button>
        <div className="space-y-1 overflow-y-auto">
          {conversations.length === 0 && (
            <p className="text-xs text-brand-navy/50 px-2 py-4">
              Your past conversations will show up here.
            </p>
          )}
          {conversations.map((c) => (
            <div
              key={c.id}
              className={`group flex items-center gap-1 rounded-xl px-2 ${
                conversationId === c.id ? "bg-white shadow-sm" : "hover:bg-white/60"
              }`}
            >
              <button
                onClick={() => openConversation(c.id)}
                className="flex-1 text-left py-2 min-w-0"
              >
                <span className="block text-sm truncate">{c.title || "Untitled chat"}</span>
                <span className="block text-[11px] text-brand-navy/40">
                  {c.context_label ? `${c.context_label} · ` : ""}
                  {timeAgo(c.updated_at ?? c.created_at)}
                </span>
              </button>
              <button
                onClick={() => handleRename(c)}
                aria-label={`Rename ${c.title ?? "chat"}`}
                className="opacity-0 group-hover:opacity-100 p-1 text-brand-navy/50 hover:text-brand-navy"
              >
                <Pencil className="size-3.5" />
              </button>
              <button
                onClick={() => handleDelete(c)}
                aria-label={`Delete ${c.title ?? "chat"}`}
                className="opacity-0 group-hover:opacity-100 p-1 text-brand-navy/50 hover:text-red-600"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      </aside>

      {/* Chat */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center gap-2 pb-2">
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-white border border-brand-navy/10"
          >
            <MessagesSquare className="size-3.5" /> Chats
          </button>
          {contextLabel && (
            <span className="text-xs px-3 py-1.5 rounded-full bg-brand-mint/15 text-brand-navy/70 truncate">
              Context: {contextLabel}
            </span>
          )}
          <div className="ml-auto flex items-center gap-1">
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                onClick={() => setLanguage(l.code)}
                aria-pressed={language === l.code}
                className={`text-xs px-2.5 py-1.5 rounded-full ${
                  language === l.code
                    ? "bg-brand-navy text-white"
                    : "bg-white text-brand-navy/60 border border-brand-navy/10"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        <Conversation className="flex-1 rounded-3xl bg-white/60 border border-brand-navy/5">
          <ConversationContent className="space-y-2">
            {messages.length === 0 && (
              <div className="text-brand-navy/70 text-sm leading-relaxed px-1 py-6">{intro}</div>
            )}
            {messages.map((message) => (
              <Message key={message.id} from={message.role}>
                <MessageContent>
                  {message.parts.map((part, i) => {
                    if (part.type === "text") {
                      return <MessageResponse key={i}>{part.text}</MessageResponse>;
                    }
                    if (part.type.startsWith("tool-")) {
                      const p = part as unknown as {
                        type: string;
                        state: string;
                        input?: unknown;
                        output?: unknown;
                        errorText?: string;
                      };
                      return (
                        <Tool key={i} defaultOpen={false}>
                          <ToolHeader type={p.type as `tool-${string}`} state={p.state as never} />
                          <ToolContent>
                            <ToolInput input={p.input} />
                            <ToolOutput output={p.output} errorText={p.errorText} />
                          </ToolContent>
                        </Tool>
                      );
                    }
                    return null;
                  })}
                </MessageContent>
              </Message>
            ))}
            {status === "submitted" && <Shimmer className="text-sm px-1">Thinking…</Shimmer>}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        {errorMessage && (
          <div className="mt-2 text-sm rounded-2xl border border-red-200 bg-red-50 text-red-800 px-4 py-3">
            {errorMessage}
          </div>
        )}
        {voice.error && (
          <div className="mt-2 text-sm rounded-2xl border border-amber-200 bg-amber-50 text-amber-900 px-4 py-3">
            {voice.error}
          </div>
        )}

        {messages.length === 0 && (
          <div className="pt-3 flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="text-xs px-3 py-1.5 rounded-full bg-brand-clay text-brand-navy/80 hover:bg-brand-clay/70"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <div className="pt-3">
          <PromptInput
            onSubmit={(_message, event) => {
              event.preventDefault();
              send(input);
            }}
          >
            <PromptInputTextarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                voice.recording ? "Listening… tap stop when you're done" : "Ask your coach anything…"
              }
            />
            <PromptInputFooter>
              <PromptInputTools>
                <PromptInputButton
                  type="button"
                  onClick={() => (voice.recording ? void voice.stop() : void voice.start())}
                  disabled={voice.transcribing}
                  aria-label={voice.recording ? "Stop recording" : "Record a voice message"}
                >
                  {voice.recording ? <Square className="size-4" /> : <Mic className="size-4" />}
                  {voice.transcribing ? "Transcribing…" : voice.recording ? "Stop" : "Speak"}
                </PromptInputButton>
              </PromptInputTools>
              <PromptInputSubmit
                status={status}
                disabled={!input.trim() && !busy}
                onClick={busy ? () => stop() : undefined}
              />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </div>
    </div>
  );
}
