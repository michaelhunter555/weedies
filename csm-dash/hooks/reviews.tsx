import { useCallback } from "react";

import useAuth from "@/context/auth-context";
import { useApi } from "@/hooks/useHttp";
import type { Review } from "@/types";

export const useReviews = () => {
  const { request } = useApi();
  const auth = useAuth();

  // Matches adminRoutes: GET /api/admin/reviews
  const getAllReviews = useCallback(async (): Promise<Review[]> => {
    const res = await request("reviews", "GET", null, {
      Authorization: `Bearer ${auth.jwtToken}`,
    });
    return (res?.reviews ?? res) as Review[];
  }, [auth.jwtToken, request]);

  return { getAllReviews };
};


