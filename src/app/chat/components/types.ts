export type ChatMessage = {
  id: number;
  role: "user" | "agent";
  text: string;
  sources?: Array<{
    id: string;
    title: string;
    summary: string;
    distance?: number | null;
  }>;
};
