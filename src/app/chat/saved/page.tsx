"use client";

import Link from "next/link";
import { useState } from "react";
import { loadSavedChats } from "../components/storage";
import { SavedChat } from "../components/types";

export default function SavedChatsPage() {
  const [savedChats] = useState<SavedChat[]>(() => loadSavedChats());

  return (
    <div className="flex h-screen flex-col p-8 font-sans">
      <main className="mx-auto flex min-h-0 w-full flex-1 flex-col rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">Saved Chats</h1>
          <Link
            href="/chat"
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800"
          >
            Back to Chat
          </Link>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto rounded-md border border-zinc-300 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900">
          {savedChats.length === 0 ? (
            <p className="text-sm text-zinc-700 dark:text-zinc-300">No saved chats yet.</p>
          ) : (
            <ul className="space-y-3">
              {savedChats.map((chat) => (
                <li
                  key={chat.id}
                  className="rounded-md border border-zinc-300 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-950"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-zinc-900 dark:text-zinc-100">{chat.title}</p>
                      <p className="text-xs text-zinc-600 dark:text-zinc-400">
                        {new Date(chat.createdAt).toLocaleString()} · {chat.messages.length} messages
                      </p>
                    </div>
                    <Link
                      href={`/chat?savedChatId=${chat.id}`}
                      className="rounded-md border border-zinc-300 px-3 py-1 text-sm text-zinc-900 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800"
                    >
                      Open
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
