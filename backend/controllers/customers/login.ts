import type { Request, Response } from "express";
import { signup } from "./signup";

export async function login(req: Request, res: Response) {
  // For OAuth/Firebase-based auth, "login" and "signup" are effectively the same:
  // verify provider token, upsert user, return app JWTs.
  return signup(req, res);
}