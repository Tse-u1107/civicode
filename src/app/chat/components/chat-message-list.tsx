import { useEffect, useRef, useState } from "react";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import Link from "next/link";
import { ChatMessage } from "./types";

type ChatMessageListProps = {
  messages: ChatMessage[];
  isTyping: boolean;
};

export function ChatMessageList({ messages, isTyping }: ChatMessageListProps) {
  const [feedbackByMessageId, setFeedbackByMessageId] = useState<Record<number, "up" | "down">>({});
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isTyping]);

  function handleFeedback(messageId: number, feedback: "up" | "down") {
    setFeedbackByMessageId((prev) => ({
      ...prev,
      [messageId]: prev[messageId] === feedback ? undefined : feedback,
    }));
  }

  return (
    <div className="mb-4 min-h-0 flex-1 overflow-y-auto rounded-md border border-zinc-300 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900">
      <div className="flex flex-col gap-3">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`max-w-[85%] rounded-md px-3 py-2 text-sm ${
              message.role === "user"
                ? "ml-auto bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "mr-auto bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
            }`}
          >
            <p>{message.text}</p>
            {message.role === "agent" && message.retrieveHref ? (
              <div className="mt-2">
                <Link
                  href={message.retrieveHref}
                  className="inline-flex rounded border border-zinc-400/60 px-2 py-1 text-xs font-medium transition hover:bg-zinc-300/60 dark:border-zinc-600 dark:hover:bg-zinc-700/60"
                >
                  {message.retrieveLabel ?? "Retrieve"}
                </Link>
              </div>
            ) : null}
            {message.role === "agent" && message.sources && message.sources.length > 0 ? (
              <div className="mt-2 border-t border-zinc-400/40 pt-2 text-xs">
                <p className="mb-1 font-semibold">Sources</p>
                <ul className="space-y-1">
                  {message.sources.map((source, index) => (
                    <li key={`${source.id}-${index}`}>
                      <p className="font-medium">{source.title}</p>
                      <p className="whitespace-pre-wrap opacity-90">{source.summary}</p>
                      {typeof source.distance === "number" ? (
                        <p className="opacity-75">Distance: {source.distance.toFixed(4)}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {message.role === "agent" && message.feedbackEnabled !== false ? (
              <div className="mt-2 border-t border-zinc-400/40 pt-2">
                {feedbackByMessageId[message.id] ? (
                  <p className="text-xs font-medium">Thanks for your feedback</p>
                ) : (
                  <>
                    <p className="mb-2 text-xs font-medium">Like this response?</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        aria-label="Like this response"
                        onClick={() => handleFeedback(message.id, "up")}
                        className="rounded-md border border-zinc-400/60 px-2 py-1 text-sm transition hover:bg-zinc-300/60 dark:border-zinc-600 dark:hover:bg-zinc-700/60"
                      >
                        <ThumbsUp className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        aria-label="Dislike this response"
                        onClick={() => handleFeedback(message.id, "down")}
                        className="rounded-md border border-zinc-400/60 px-2 py-1 text-sm transition hover:bg-zinc-300/60 dark:border-zinc-600 dark:hover:bg-zinc-700/60"
                      >
                        <ThumbsDown className="h-4 w-4" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : null}
          </div>
        ))}

        {isTyping ? (
          <div className="mr-auto rounded-md bg-zinc-200 px-3 py-2 text-sm text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            <div className="flex items-end gap-1" aria-label="Civicode is typing" role="status">
              <span className="h-2 w-2 animate-bounce rounded-full bg-current" />
              <span
                className="h-2 w-2 animate-bounce rounded-full bg-current"
                style={{ animationDelay: "150ms" }}
              />
              <span
                className="h-2 w-2 animate-bounce rounded-full bg-current"
                style={{ animationDelay: "300ms" }}
              />
            </div>
          </div>
        ) : null}
        <div ref={endOfMessagesRef} />
      </div>
    </div>
  );
}
