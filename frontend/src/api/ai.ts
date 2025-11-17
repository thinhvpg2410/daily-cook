import { http } from "./http";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatResponse {
  message: string;
  timestamp: string;
}

export interface SuggestFromChatResponse {
  date: string;
  dishes: Array<{
    id: string;
    title: string;
    image?: string | null;
    cookTime?: number | null;
    likes?: number | null;
    tags?: string[];
  }>;
  totalKcal?: number;
}

/**
 * Chat với AI về gợi ý món ăn
 */
export const chatWithAI = async (
  message: string,
  history?: ChatMessage[]
): Promise<ChatResponse> => {
  const res = await http.post<ChatResponse>("/ai/chat", {
    message,
    history,
  });
  return res.data;
};

/**
 * Gợi ý món ăn từ yêu cầu chat
 */
export const suggestFromChat = async (
  request: string,
  date?: string
): Promise<SuggestFromChatResponse> => {
  const res = await http.post<SuggestFromChatResponse>("/ai/suggest-from-chat", {
    request,
    date,
  });
  return res.data;
};

