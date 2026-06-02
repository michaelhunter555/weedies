import type { Request, Response } from "express";

import { contactUsSupportEmail } from "../../lib/email-notifications";
import User from "../../models/user";

const CONTACT_TOPICS = new Set([
  "general",
  "buying",
  "selling",
  "account",
  "report",
  "other",
]);

const TOPIC_LABELS: Record<string, string> = {
  general: "General question",
  buying: "Buying on the marketplace",
  selling: "Selling / payouts",
  account: "Account & login",
  report: "Report a listing or user",
  other: "Other",
};

function cleanText(value: unknown, maxLen: number): string {
  return String(value ?? "")
    .trim()
    .slice(0, maxLen);
}

/**
 * POST /api/user/contact-us
 * Authenticated users only. Delivers to info@elevatedappgroup.com via Brevo.
 */
export async function postContactUs(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return void res.status(401).json({ ok: false, message: "Sign in to contact support." });
    }

    const user = await User.findById(userId).select("email name");
    const userEmail = user?.email?.trim().toLowerCase() ?? "";
    if (!userEmail) {
      return void res.status(400).json({
        ok: false,
        message: "Your account needs an email address before you can contact support.",
      });
    }

    const body = req.body as {
      topic?: unknown;
      message?: unknown;
      name?: unknown;
    };

    const topic = cleanText(body.topic, 32);
    if (!CONTACT_TOPICS.has(topic)) {
      return void res.status(400).json({ ok: false, message: "Invalid topic." });
    }

    const message = cleanText(body.message, 4000);
    if (message.length < 10) {
      return void res.status(400).json({
        ok: false,
        message: "Message must be at least 10 characters.",
      });
    }

    const userName =
      cleanText(body.name, 120) ||
      cleanText(user?.name, 120) ||
      userEmail.split("@")[0] ||
      "User";

    await contactUsSupportEmail({
      userId: String(userId),
      userEmail,
      userName,
      topic,
      topicLabel: TOPIC_LABELS[topic] ?? topic,
      message,
    });

    return void res.status(200).json({
      ok: true,
      message: "Your message was sent. We will reply to your account email when we can.",
    });
  } catch (err) {
    console.error("postContactUs:", err);
    const msg =
      err instanceof Error ? err.message : "Could not send your message.";
    return void res.status(503).json({ ok: false, message: msg });
  }
}
