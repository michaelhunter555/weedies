import { buildApiBase } from "@/context/auth-context";

export type SupportChatHistoryItem = {
  role: "user" | "assistant";
  content: string;
};

type SupportChatResponse = {
  ok?: boolean;
  reply?: string;
  message?: string;
  saved?: boolean;
};

export async function postSupportChatMessage(
  message: string,
  history: SupportChatHistoryItem[],
): Promise<string> {
  const base = buildApiBase();
  const url = `${base}/support/chat`;

  const res = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, history }),
  });

  const data = (await res.json().catch(() => ({}))) as SupportChatResponse;

  if (!res.ok || !data.ok || !data.reply) {
    throw new Error(
      data.message ?? "Could not reach support chat. Try again or use the contact page.",
    );
  }

  return data.reply;
}
