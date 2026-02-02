import type { Request, Response } from "express";

export async function updateOrder(_req: Request, res: Response) {
  return res.status(501).json({ message: "Not implemented" });
}


