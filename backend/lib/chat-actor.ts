import type { Request } from "express";

/** When set (admin dashboard), chat handlers act as the platform owner User. */
export type ChatActorRequest = Request & { chatActorUserId?: string };

export function resolveChatActorUserId(req: Request): string | undefined {
  const actorReq = req as ChatActorRequest;
  return actorReq.chatActorUserId ?? req.user?.userId;
}
