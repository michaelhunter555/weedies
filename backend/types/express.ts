import "express";
import type { AppRole } from "../lib/jwt";

declare module "express-serve-static-core" {
  interface Request {
    user?: {
      userId: string;
      role: AppRole;
    };
  }
}


