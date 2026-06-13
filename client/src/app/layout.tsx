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
import { GoogleAnalytics } from "@next/third-parties/google";
import Script from "next/script";

const SITE_OG_IMAGE = "homepage_pack/3.png";
const GOOGLE_ADS_ID = "AW-18151888903";

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
  const metaPixelId = "1984631592413604";

  return (
    <html lang="en">
      <GoogleAnalytics gaId="G-Q43283MQVN" />
      <Script id="reddit-pixel" strategy="afterInteractive">
        {`!function(w,d){
        if(!w.rdt){
        var p=w.rdt=function(){p.sendEvent?
        p.sendEvent.apply(p,arguments):
        p.callQueue.push(arguments)
        };
        p.callQueue=[];
        var t=d.createElement("script");
        t.src="https://www.redditstatic.com/ads/pixel.js?pixel_id=a2_if30zgqsoklk",t.async=!0;
        var s=d.getElementsByTagName("script")[0];
        s.parentNode.insertBefore(t,s)}}(window,document);
        rdt('init','a2_if30zgqsoklk');
        rdt('track', 'PageVisit');`}
      </Script>

      <body>
        <Script id="google-ads-gtag" strategy="afterInteractive">
          {`gtag('config', '${GOOGLE_ADS_ID}');`}
        </Script>
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${metaPixelId}');
fbq('track', 'PageView');`}
        </Script>
        <noscript>
          <img
            alt=""
            height="1"
            width="1"
            style={{ display: "none" }}
            src={`https://www.facebook.com/tr?id=${metaPixelId}&ev=PageView&noscript=1`}
          />
        </noscript>
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
