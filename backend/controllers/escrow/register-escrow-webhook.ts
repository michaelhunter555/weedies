import type { Request, Response } from "express";

import {
  deleteEscrowWebhook,
  EscrowApiError,
  isEscrowApiConfigured,
  listEscrowWebhooks,
  registerEscrowWebhook,
} from "../../lib/escrow-api";

function defaultWebhookUrl(): string {
  if (process.env.NODE_ENV === "production") {
    return "https://dapandflip.com/api/escrow/webhook";
  }
  const port = process.env.PORT?.trim() || "5001";
  return `http://localhost:${port}/api/escrow/webhook`;
}

/**
 * POST /api/escrow/dev/register-webhook
 * Body (optional): `{ url?: string, replace?: boolean }`
 *
 * Dev helper to register the sandbox webhook with Escrow.com (use ngrok URL in production tests).
 */
export async function registerEscrowWebhookHandler(req: Request, res: Response) {
  if (process.env.NODE_ENV === "production" && process.env.ENABLE_ESCROW_WEBHOOK_SETUP !== "true") {
    return void res.status(403).json({
      ok: false,
      message: "Webhook setup is disabled in production.",
    });
  }

  if (!isEscrowApiConfigured()) {
    return void res.status(503).json({
      ok: false,
      message: "Set ESCROW_API_EMAIL and ESCROW_API_KEY first.",
    });
  }

  const url =
    typeof (req.body as { url?: unknown })?.url === "string"
      ? String((req.body as { url: string }).url).trim()
      : defaultWebhookUrl();

  if (!url || !/^https?:\/\//i.test(url)) {
    return void res.status(400).json({
      ok: false,
      message: "Provide a valid http(s) webhook URL.",
    });
  }

  const replace = Boolean((req.body as { replace?: unknown })?.replace);

  try {
    if (replace) {
      const existing = await listEscrowWebhooks();
      await Promise.all(
        (existing.webhooks ?? []).map((w) => deleteEscrowWebhook(w.id)),
      );
    }

    const created = await registerEscrowWebhook(url);
    const all = await listEscrowWebhooks();

    return void res.status(200).json({
      ok: true,
      created,
      webhooks: all.webhooks ?? [],
    });
  } catch (err) {
    console.error("registerEscrowWebhookHandler:", err);
    if (err instanceof EscrowApiError) {
      return void res.status(err.status).json({
        ok: false,
        message: err.message,
        details: err.body,
      });
    }
    return void res.status(500).json({ ok: false, message: "Failed to register webhook" });
  }
}
