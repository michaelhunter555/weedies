import { useCallback, useState } from "react";

type Methods = "POST" | "GET" | "PUT" | "DELETE";
type Body = string | FormData | null;

function joinUrl(base: string, path: string) {
  const b = base.replace(/\/+$/, "");
  const p = path.replace(/^\/+/, "");
  return p ? `${b}/${p}` : b;
}

export const useApi = () => {
  const [isError, setIsError] = useState<string>("");

  const request = useCallback(
    async (
      path: string,
      method: Methods = "GET",
      body: Body = null,
      customHeaders: Record<string, string> = {}
    ): Promise<any> => {
      const base = process.env.NEXT_PUBLIC_SERVER;
      if (!base) throw new Error("Missing NEXT_PUBLIC_SERVER");

      const res = await fetch(joinUrl(base, path), {
        method,
        body,
        headers: {
          ...customHeaders,
        },
        // allow refresh-cookie flow
        credentials: "include",
      });

      const contentType = res.headers.get("content-type") || "";
      const data = contentType.includes("application/json")
        ? await res.json()
        : await res.text();

      if (!res.ok) {
        const msg =
          typeof data === "string"
            ? data
            : data?.message || data?.error || `Request failed (${res.status})`;
        setIsError(msg);
        throw new Error(msg);
      }

      return data;
    },
    []
  );

  return { request, isError };
};