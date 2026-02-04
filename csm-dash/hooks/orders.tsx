import { useCallback } from "react";

import useAuth from "@/context/auth-context";
import { useApi } from "@/hooks/useHttp";
import type { Order } from "@/types";

export const useOrders = () => {
  const { request } = useApi();
  const auth = useAuth();

  // Matches adminRoutes: GET /api/admin/orders
  const getAllOrders = useCallback(async (): Promise<Order[]> => {
    const res = await request("orders", "GET", null, {
      Authorization: `Bearer ${auth.jwtToken}`,
    });
    return (res?.orders ?? res) as Order[];
  }, [auth.jwtToken, request]);

  // Matches adminRoutes: POST /api/admin/order
  const createOrder = useCallback(
    async (payload: any) => {
      return await request("order", "POST", JSON.stringify(payload), {
        "Content-Type": "application/json",
        Authorization: `Bearer ${auth.jwtToken}`,
      });
    },
    [auth.jwtToken, request]
  );

  // Matches adminRoutes: PUT /api/admin/order/:id
  const updateOrder = useCallback(
    async (id: string, payload: any) => {
      return await request(`order/${id}`, "PUT", JSON.stringify(payload), {
        "Content-Type": "application/json",
        Authorization: `Bearer ${auth.jwtToken}`,
      });
    },
    [auth.jwtToken, request]
  );

  // Matches adminRoutes: DELETE /api/admin/order/:id
  const deleteOrder = useCallback(
    async (id: string) => {
      return await request(`order/${id}`, "DELETE", null, {
        Authorization: `Bearer ${auth.jwtToken}`,
      });
    },
    [auth.jwtToken, request]
  );

  return { getAllOrders, createOrder, updateOrder, deleteOrder };
};


