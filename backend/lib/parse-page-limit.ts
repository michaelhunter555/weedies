import type { Request } from "express";

export function parsePageLimit(
  req: Request,
  defaults: { page?: number; limit?: number; maxLimit?: number } = {},
) {
  const defaultPage = defaults.page ?? 1;
  const defaultLimit = defaults.limit ?? 20;
  const maxLimit = defaults.maxLimit ?? 50;

  const page = Math.max(1, Number.parseInt(String(req.query.page ?? defaultPage), 10) || defaultPage);
  const rawLimit = Number.parseInt(String(req.query.limit ?? defaultLimit), 10) || defaultLimit;
  const limit = Math.min(maxLimit, Math.max(1, rawLimit));
  const skip = (page - 1) * limit;
  const totalPages = (total: number) => Math.max(1, Math.ceil(total / limit));

  return { page, limit, skip, totalPages };
}
