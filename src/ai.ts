import { openai } from "./openai";
import { supabase } from "./supabase";

export async function generateAiResponse(roomId: string) {
  const { data: messages } = await supabase
    .from("chat_messages")
    .select("content, type, user_id")
    .eq("room_id", roomId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (!messages || messages.length === 0) return null;

  const chatHistory = messages.reverse().map((msg) => {
    if (msg.type === "ai") {
      return { role: "assistant" as const, content: msg.content };
    }
    if (msg.type === "system") {
      return { role: "system" as const, content: msg.content };
    }
    return { role: "user" as const, content: msg.content, name: msg.user_id };
  });

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You are a friendly AI participating in a shared diary chat room. " +
          "Respond naturally to the conversation. " +
          "Keep responses concise (2-3 sentences). " +
          "Be warm and supportive.",
      },
      ...chatHistory,
    ],
    max_tokens: 200,
  });

  return response.choices[0].message.content ?? null;
}
