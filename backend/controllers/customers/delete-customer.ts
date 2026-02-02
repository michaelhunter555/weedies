import type { Request, Response } from "express";

export async function deleteCustomer(_req: Request, res: Response) {
  return res.status(501).json({ message: "Not implemented" });
}


