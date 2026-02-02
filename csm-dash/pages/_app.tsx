import type { AppProps } from "next/app";

import AppLayout from "@/components/Shared/AppLayout/AppLayout";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from '@/context/auth-context';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

export default function App({ Component, pageProps }: AppProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
      <AppLayout>
        <Component {...pageProps} />
      </AppLayout>
      </AuthProvider>
    </QueryClientProvider>
  );
}
