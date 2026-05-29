/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "secureapi.escrow.com",
        pathname: "/api/ecart/Content/Images/**",
      },
    ],
  },
  async headers() {
    return [
      {
        // Relax COOP globally so Firebase's signInWithPopup can poll
        // `window.closed` on the Google OAuth popup without the browser
        // blocking it (the warning we were seeing in the console).
        // `same-origin-allow-popups` still isolates same-origin windows
        // while permitting cross-origin popups opened by us to be tracked.
        source: "/:path*",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
