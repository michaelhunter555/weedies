import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@mui/material",
    "@mui/material-nextjs",
    "@mui/icons-material",
    "@mui/x-data-grid",
    "@mui/x-charts",
    "@mui/x-date-pickers",
  ],
};

export default nextConfig;
