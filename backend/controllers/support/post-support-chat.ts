import type { Request, Response } from "express";

import { createSupportChatCompletion } from "../../lib/openai";

/**
 * POST /api/support/chat
 * Body: { message: string, history?: { role: "user"|"assistant", content: string }[] }
 * Stateless — no chat persistence.
 */
export async function postSupportChat(req: Request, res: Response) {
  const { message, history } = req.body ?? {};

  try {
    const result = await createSupportChatCompletion({ message, history });
    return void res.status(200).json({
      ok: true,
      reply: result.reply,
      model: result.model,
      saved: false,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "UNKNOWN";

    if (msg === "OPENAI_NOT_CONFIGURED") {
      return void res.status(503).json({
        ok: false,
        message:
          "AI support is temporarily unavailable. Please use our FAQs or contact page.",
      });
    }
    if (msg === "MESSAGE_REQUIRED") {
      return void res.status(400).json({
        ok: false,
        message: "Message is required.",
      });
    }

    console.error("postSupportChat:", err);
    return void res.status(502).json({
      ok: false,
      message:
        "We could not get a response right now. Try again or use the contact page.",
    });
  }
}
