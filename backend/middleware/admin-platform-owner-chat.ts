import type { NextFunction, Request, Response } from "express";

import type { ChatActorRequest } from "../lib/chat-actor";
import { getPlatformOwnerUserId } from "../lib/platform-owner";

/** Admin inbox: read/send chats as the platform owner marketplace User. */
export async function attachPlatformOwnerChatActor(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    (req as ChatActorRequest).chatActorUserId = await getPlatformOwnerUserId();
    next();
  } catch (err) {
    return void res.status(503).json({
      message:
        err instanceof Error
          ? err.message
          : "Platform owner not configured (ADMIN_CREATE_EMAIL).",
    });
  }
}
