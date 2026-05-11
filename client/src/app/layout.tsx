import type { Metadata } from "next";

import MainNavigation from "@/components/Header/MainNavigation";
import QueryClientWrapper from "@/components/Shared/QueryClient/QueryClientProvider";

import { Content, PageContainer } from "../components/Footer/FooterStyles";
import AuthProvider from "../context/auth-context";
import CartContextProvider from "../context/cart/cart-context";
import { SocketProvider } from "../context/socket-io/socket-provider";
import SocketEventsListener from "@/components/SocketEventsListener/SocketEventsListener";
import Toaster from "@/components/Toaster/Toaster";
import Footer from "@/components/Footer/Footer";
import Copyright from "@/components/Footer/Copyright";
import StripeCheckoutProvider from "@/components/StripeProvider/StripeCheckoutProvider";

export const metadata: Metadata = {
  title: "VibeStack — Discover & Sell Vibecoded Apps",
  description:
    "VibeStack is the marketplace for vibecoded apps. Discover, buy, and launch AI-assisted apps — or list your own and get paid.",
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
          <StripeCheckoutProvider>
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
                <SocketEventsListener />
                <Toaster />
              </CartContextProvider>
            </SocketProvider>
          </AuthProvider>
          </StripeCheckoutProvider>
        </QueryClientWrapper>
      </body>
    </html>
  );
}
