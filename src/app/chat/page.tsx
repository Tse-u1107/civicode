"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ChatInput } from "./components/chat-input";
import { ChatMessageList } from "./components/chat-message-list";
import { loadSavedChats, saveSavedChats } from "./components/storage";
import { ChatMessage, SavedChat } from "./components/types";

async function wait(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export default function ChatPage() {
  const searchParams = useSearchParams();
  const savedChatId = searchParams.get("savedChatId");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      role: "agent",
      text: "Ask a municipal code question. Optional scoped format: Municipality, State, Query.",
      feedbackEnabled: false,
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const canSend = useMemo(() => input.trim().length > 0 && !isTyping, [input, isTyping]);

  useEffect(() => {
    if (!savedChatId) {
      return;
    }

    const savedChats = loadSavedChats();
    const selectedChat = savedChats.find((chat) => chat.id === savedChatId);

    if (selectedChat) {
      setMessages(selectedChat.messages);
    }
  }, [savedChatId]);

  function handleSaveChat() {
    const title = window.prompt("Enter a title for this chat");
    const normalizedTitle = title?.trim();
    if (!normalizedTitle) {
      return;
    }

    const savedChats = loadSavedChats();
    const newSavedChat: SavedChat = {
      id: typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}`,
      title: normalizedTitle,
      createdAt: new Date().toISOString(),
      messages,
    };

    try {
      saveSavedChats([newSavedChat, ...savedChats]);
      window.alert("Chat saved.");
    } catch {
      window.alert("Unable to save chat.");
    }
  }

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
      const retrieveHref =
        data && typeof data === "object" && typeof (data as { retrieveHref?: unknown }).retrieveHref === "string"
          ? (data as { retrieveHref: string }).retrieveHref
          : undefined;
      const retrieveLabel =
        data && typeof data === "object" && typeof (data as { retrieveLabel?: unknown }).retrieveLabel === "string"
          ? (data as { retrieveLabel: string }).retrieveLabel
          : undefined;
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

      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, role: "agent", text: reply, sources, retrieveHref, retrieveLabel, feedbackEnabled: true },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "agent",
          text: error instanceof Error ? `Error: ${error.message}` : "Error: Request failed.",
          feedbackEnabled: true,
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  }

  return (
    <div className="flex h-screen flex-col p-8 font-sans">
      <main className="mx-auto flex min-h-0 w-full flex-1 flex-col rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">Chat</h1>
          <div className="flex items-center gap-2">
            <Link
              href="/chat/saved"
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800"
            >
              Saved Chats
            </Link>
            <button
              type="button"
              onClick={handleSaveChat}
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800"
            >
              Save Chat
            </button>
          </div>
        </div>

        <ChatMessageList messages={messages} isTyping={isTyping} />
        <ChatInput value={input} onChange={setInput} onSubmit={handleSubmit} disabled={!canSend} />
      </main>
    </div>
  );
}
