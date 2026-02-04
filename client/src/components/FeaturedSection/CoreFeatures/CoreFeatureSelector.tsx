"use client";
import { useEffect, useState } from "react";

import Box from "@mui/material/Box";
import CardMedia from "@mui/material/CardMedia";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid2";
import useTheme from "@mui/material/styles/useTheme";
import useMediaQuery from "@mui/material/useMediaQuery";

import FeaturedCards from "./FeatureCards";

const CoreFeaturePreview = () => {
  const [path, setPath] = useState("/magnetic-resistance.svg");
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.down("md"));
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const effectiveIsMobile = mounted ? isMobile : false;

  const handleFeatureChange = (path: string) => {
    setPath(path);
  };

  return (
    <Grid
      container
      direction={effectiveIsMobile ? "column" : "row"}
      justifyContent="center"
      spacing={2}
    >
      <Grid size={effectiveIsMobile ? 12 : 4} order={effectiveIsMobile ? 2 : undefined}>
        <FeaturedCards onClick={handleFeatureChange} />
      </Grid>
      <Divider orientation="vertical" flexItem />
      <Grid size={effectiveIsMobile ? 12 : 7}>
        <Box sx={{ border: "1px solid #b1b1b1", borderRadius: 2 }}>
          <CardMedia
            component="img"
            src={path}
            alt={`core-feature-${path}`}
            sx={{
              width: "50%",
              margin: "0 auto",
            }}
          />
        </Box>
      </Grid>
    </Grid>
  );
};

export default CoreFeaturePreview;
