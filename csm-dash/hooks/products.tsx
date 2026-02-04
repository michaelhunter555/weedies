import { useCallback } from "react";

import useAuth from "@/context/auth-context";
import { useApi } from "@/hooks/useHttp";
import type { Product } from "@/types";

export const useProducts = () => {
  const { request } = useApi();
  const auth = useAuth();

  const getAllProducts = useCallback(async (): Promise<Product[]> => {
    const res = await request("products", "GET", null, {
      Authorization: `Bearer ${auth.jwtToken}`,
    });
    return (res?.products ?? res) as Product[];
  }, [auth.jwtToken, request]);

  // Matches adminRoutes: POST /api/admin/   (createProduct)
  const createProduct = useCallback(
    async (payload: any, files?: File[]) => {
      let body: any = payload;
      let headers: Record<string, string> = { Authorization: `Bearer ${auth.jwtToken}` };

      if (files?.length) {
        const form = new FormData();
        form.append("data", JSON.stringify(payload));
        files.forEach((f) => form.append("images", f));
        body = form;
      } else {
        headers["Content-Type"] = "application/json";
        body = JSON.stringify(payload);
      }

      return await request("", "POST", body, headers);
    },
    [auth.jwtToken, request]
  );

  // Matches adminRoutes: PUT /api/admin/:id
  const updateProduct = useCallback(
    async (id: string, payload: any) => {
      return await request(`${id}`, "PUT", JSON.stringify(payload), {
        "Content-Type": "application/json",
        Authorization: `Bearer ${auth.jwtToken}`,
      });
    },
    [auth.jwtToken, request]
  );

  // Matches adminRoutes: DELETE /api/admin/:id
  const deleteProduct = useCallback(
    async (id: string) => {
      return await request(`${id}`, "DELETE", null, {
        Authorization: `Bearer ${auth.jwtToken}`,
      });
    },
    [auth.jwtToken, request]
  );

  return { getAllProducts, createProduct, updateProduct, deleteProduct };
};


