import type { Request, Response } from "express";

type FirebaseSendOobResponse = {
  email: string;
};

export async function passwordReset(req: Request, res: Response) {
  try {
    const email = (req.body?.email as string | undefined)?.trim().toLowerCase();
    if (!email) return res.status(400).json({ message: "Missing email" });

    const apiKey = process.env.FIREBASE_WEB_API_KEY;
    if (!apiKey) return res.status(500).json({ message: "Missing FIREBASE_WEB_API_KEY env var" });

    const resp = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          requestType: "PASSWORD_RESET",
          email,
        }),
      }
    );

    if (!resp.ok) {
      const text = await resp.text();
      return res.status(400).json({ message: "Could not send password reset email", detail: text });
    }

    const data = (await resp.json()) as FirebaseSendOobResponse;
    return res.status(200).json({ ok: true, email: data.email });
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
}


