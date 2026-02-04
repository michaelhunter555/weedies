import { useCallback } from "react";

import useAuth from "@/context/auth-context";
import { useApi } from "@/hooks/useHttp";
import type { User } from "@/types";

export const useCustomers = () => {
  const { request } = useApi();
  const auth = useAuth();

  // Matches adminRoutes: GET /api/admin/customers
  const getAllCustomers = useCallback(async (): Promise<User[]> => {
    const res = await request("customers", "GET", null, {
      Authorization: `Bearer ${auth.jwtToken}`,
    });
    return (res?.customers ?? res) as User[];
  }, [auth.jwtToken, request]);

  return { getAllCustomers };
};


