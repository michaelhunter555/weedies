"use client";

import { useEffect, useState } from "react";
import useMediaQuery from "@mui/material/useMediaQuery";
import useTheme from "@mui/material/styles/useTheme";

/**
 * Shared breakpoints (MUI defaults: sm 600, md 900, lg 1200).
 * - Phone: below sm
 * - Tablet: sm through below md (600–899px)
 * - Compact nav (drawer): below md (phones + tablets)
 * - Desktop nav: md and up
 */
export const useDeviceCheck = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.between("sm", "md"));
  const isCompactNav = useMediaQuery(theme.breakpoints.down("md"));
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return {
    isMobile: mounted ? isMobile : false,
    isTablet: mounted ? isTablet : false,
    /** Hamburger + drawer nav (below md). */
    isCompactNav: mounted ? isCompactNav : false,
    isDesktop: mounted ? isDesktop : true,
  };
};
