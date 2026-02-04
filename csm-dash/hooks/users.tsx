import { useCallback } from "react";

import useAuth from "@/context/auth-context";
import { useApi } from "./useHttp";
import type { User } from "@/types";

// Backwards-compatible file name, but this hook now matches backend adminRoutes:
// GET /api/admin/customers
export const useUsers = () => {
  const { request } = useApi();
  const auth = useAuth();

  const getAllCustomers = useCallback(async (): Promise<User[]> => {
    const res = await request("customers", "GET", null, {
      Authorization: `Bearer ${auth.jwtToken}`,
    });
    return (res?.customers ?? res) as User[];
  }, [auth.jwtToken, request]);

  return {
    getAllCustomers,
  };
};
