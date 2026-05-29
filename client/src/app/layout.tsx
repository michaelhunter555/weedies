import type { Metadata } from "next";

import MainNavigation from "@/components/Header/MainNavigation";
import QueryClientWrapper from "@/components/Shared/QueryClient/QueryClientProvider";

import { Content, PageContainer } from "../components/Footer/FooterStyles";
import AuthProvider from "../context/auth-context";
import { SnackbarProvider } from "../context/snackbar-context";
import { SocketProvider } from "../context/socket-io/socket-provider";
import SocketEventsListener from "@/components/SocketEventsListener/SocketEventsListener";
import UserLocaleSync from "@/components/UserLocaleSync";
import Toaster from "@/components/Toaster/Toaster";
import Footer from "@/components/Footer/Footer";
import Copyright from "@/components/Footer/Copyright";
import StripeCheckoutProvider from "@/components/StripeProvider/StripeCheckoutProvider";
import { AccountAccessGate } from "@/components/Auth/AccountAccessGate";
import { EmailVerificationGate } from "@/components/Auth/EmailVerificationGate";
import { LiveChatWidget } from "@/components/SupportChat/LiveChatWidget";
import { LiveChatProvider } from "@/context/live-chat-context";
import { AppThemeProvider } from "@/theme/app-theme";
import { APP_DOMAIN } from "@/brand";
import Typography from "@mui/material/Typography";

const SITE_OG_IMAGE = "homepage_pack/3.png";

export const metadata: Metadata = {
  metadataBase: new URL(`https://${APP_DOMAIN}`),
  title: "Dap & Flip - Discover & Sell Apps | Dapandflip.com",
  description:
    "Dapandflip.com is the marketplace to discover, buy, and sell indie apps. List your app on Dap & Flip or find your next flip — secure checkout and seller payouts built in.",
  applicationName: "Dap & Flip",
  icons: {
    icon: [{ url: "/favicon.png", type: "image/png" }],
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
  openGraph: {
    title: "Dap & Flip | Dapandflip.com",
    description:
      "Discover, buy, and sell indie apps. The marketplace to list and flip digital products.",
    siteName: "Dap & Flip",
    images: [
      {
        url: SITE_OG_IMAGE,
        alt: "Dap & Flip",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Dap & Flip | Dapandflip.com",
    description:
      "Discover, buy, and sell indie apps on dapandflip.com.",
    images: [SITE_OG_IMAGE],
  },
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
          <AppThemeProvider>
            <SnackbarProvider>
              <StripeCheckoutProvider>
                <AuthProvider>
                  <AccountAccessGate>
                  <EmailVerificationGate>
                  <SocketProvider>
                    <LiveChatProvider>
                      <PageContainer>
                        <Typography dangerouslySetInnerHTML={{
                          __html:
                            `<!-- Google tag (gtag.js) -->
                          <script async src="https://www.googletagmanager.com/gtag/js?id=G-Q43283MQVN"></script>
                          <script>
                            window.dataLayer = window.dataLayer || [];
                            function gtag(){dataLayer.push(arguments);}
                            gtag('js', new Date());

                            gtag('config', 'G-Q43283MQVN');
                          </script>`
                        }} />
                        <MainNavigation />
                        <Content>{children}</Content>
                        <Footer>
                          <Copyright />
                        </Footer>
                      </PageContainer>
                      <LiveChatWidget />
                      <SocketEventsListener />
                      <UserLocaleSync />
                      <Toaster />
                    </LiveChatProvider>
                  </SocketProvider>
                  </EmailVerificationGate>
                  </AccountAccessGate>
                </AuthProvider>
              </StripeCheckoutProvider>
            </SnackbarProvider>
          </AppThemeProvider>
        </QueryClientWrapper>
      </body>
    </html>
  );
}
