import type { Metadata } from "next";

import MainNavigation from "@/components/Header/MainNavigation";
import QueryClientWrapper from "@/components/Shared/QueryClient/QueryClientProvider";

import { Content, PageContainer } from "../components/Footer/FooterStyles";
import AuthProvider from "../context/auth-context";
import CartContextProvider from "../context/cart/cart-context";
import { SocketProvider } from "../context/socket-io/socket-provider";
import Footer from "@/components/Footer/Footer";
import Copyright from "@/components/Footer/Copyright";

export const metadata: Metadata = {
  title: "Weedies - The Best Weed in Town",
  description: "The Best Weed in Town",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <QueryClientWrapper>
          <AuthProvider>
            <SocketProvider>
              <CartContextProvider>
                <PageContainer>
                  <MainNavigation />
                  <Content>{children}</Content>
                  <Footer>
                    <Copyright />
                  </Footer>
                </PageContainer>
              </CartContextProvider>
            </SocketProvider>
          </AuthProvider>
        </QueryClientWrapper>
      </body>
    </html>
  );
}
