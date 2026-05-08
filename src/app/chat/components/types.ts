export type ChatMessage = {
  id: number;
  role: "user" | "agent";
  text: string;
  feedbackEnabled?: boolean;
  sources?: Array<{
    id: string;
    title: string;
    summary: string;
    distance?: number | null;
  }>;
};

export type SavedChat = {
  id: string;
  title: string;
  createdAt: string;
  messages: ChatMessage[];
};
