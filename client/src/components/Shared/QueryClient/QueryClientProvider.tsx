"use client";
import { useState } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const QueryClientWrapper = ({ children }: { children: React.ReactNode }) => {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

export default QueryClientWrapper;
