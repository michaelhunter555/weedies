import type { Metadata } from "next";

import MainNavigation from "@/components/Header/MainNavigation";
import QueryClientWrapper from "@/components/Shared/QueryClient/QueryClientProvider";
import NextAuthProvider from "@/components/Shared/Session/SessionProvider";

import { Content, PageContainer } from "../components/Footer/FooterStyles";
import AuthProvider from "../context/auth-context";
import CartContextProvider from "../context/cart/cart-context";

export const metadata: Metadata = {
  title: "Mihe Fitness X900 Exercise Bike",
  description: "An effective exercise bike for an effective price.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <NextAuthProvider>
          <QueryClientWrapper>
            <AuthProvider>
              <CartContextProvider>
                <PageContainer>
                  <MainNavigation />
                  <Content>{children}</Content>
                </PageContainer>
              </CartContextProvider>
            </AuthProvider>
          </QueryClientWrapper>
        </NextAuthProvider>
      </body>
    </html>
  );
}
