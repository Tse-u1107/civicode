import { ChatMessage } from "./types";

type ChatMessageListProps = {
  messages: ChatMessage[];
  isTyping: boolean;
};

export function ChatMessageList({ messages, isTyping }: ChatMessageListProps) {
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
          </div>
        ))}

        {isTyping ? (
          <div className="mr-auto rounded-md bg-zinc-200 px-3 py-2 text-sm text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            Gemini is typing...
          </div>
        ) : null}
      </div>
    </div>
  );
}
