"use client";

import { useMemo, useState } from "react";
import { ChatInput } from "./components/chat-input";
import { ChatMessageList } from "./components/chat-message-list";
import { ChatMessage } from "./components/types";

async function wait(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      role: "agent",
      text: "Ask a municipal code question. Optional scoped format: Municipality, State, Query.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const canSend = useMemo(() => input.trim().length > 0 && !isTyping, [input, isTyping]);

  async function handleSubmit() {
    const text = input.trim();
    if (!text || isTyping) {
      return;
    }

    const userMessage: ChatMessage = { id: Date.now(), role: "user", text };
    const history = messages.map((message) => ({ role: message.role, text: message.text }));

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    try {
      const [response] = await Promise.all([
        fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text,
            history,
          }),
        }),
        wait(1000),
      ]);

      if (!response.ok) {
        throw new Error(`Chat request failed with status ${response.status}`);
      }

      const data = (await response.json()) as { reply?: unknown; sources?: unknown };
      const reply = typeof data.reply === "string" && data.reply.trim() ? data.reply.trim() : "No response.";
      const sources =
        data && typeof data === "object" && Array.isArray((data as { sources?: unknown }).sources)
          ? ((data as { sources: unknown[] }).sources.filter(
              (item): item is { id: string; title: string; summary: string; distance?: number | null } =>
                !!item &&
                typeof item === "object" &&
                "id" in item &&
                typeof (item as { id: unknown }).id === "string" &&
                "title" in item &&
                typeof (item as { title: unknown }).title === "string" &&
                "summary" in item &&
                typeof (item as { summary: unknown }).summary === "string" &&
                (!("distance" in item)
                  || (item as { distance?: unknown }).distance == null
                  || typeof (item as { distance: unknown }).distance === "number"),
            ) ?? [])
          : [];

      setMessages((prev) => [...prev, { id: Date.now() + 1, role: "agent", text: reply, sources }]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "agent",
          text: error instanceof Error ? `Error: ${error.message}` : "Error: Request failed.",
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  }

  return (
    <div className="flex h-screen flex-col p-8 font-sans">
      <main className="mx-auto flex min-h-0 w-full flex-1 flex-col rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <h1 className="mb-4 text-2xl font-semibold text-black dark:text-zinc-50">Chat</h1>

        <ChatMessageList messages={messages} isTyping={isTyping} />
        <ChatInput value={input} onChange={setInput} onSubmit={handleSubmit} disabled={!canSend} />
      </main>
    </div>
  );
}
