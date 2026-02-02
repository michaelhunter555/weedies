"use client";
import Box from "@mui/material/Box";
import CardMedia from "@mui/material/CardMedia";

const FeaturedBanner = () => {
  return (
    <Box sx={{ backgroundColor: "#3eb9bd", borderRadius: 5, marginTop: 2 }}>
      <CardMedia
        component="img"
        src="mihe_banner.svg"
        alt="home_banner"
        sx={{ width: "100%", height: "100%" }}
      />
    </Box>
  );
};

export default FeaturedBanner;
