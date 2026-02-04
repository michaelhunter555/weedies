import type { Request } from "express";

export function getCookie(req: Request, name: string) {
  const raw = req.headers.cookie;
  if (!raw) return undefined;
  const parts = raw.split(";").map((p) => p.trim());
  for (const part of parts) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const k = decodeURIComponent(part.slice(0, idx));
    if (k !== name) continue;
    return decodeURIComponent(part.slice(idx + 1));
  }
  return undefined;
}


