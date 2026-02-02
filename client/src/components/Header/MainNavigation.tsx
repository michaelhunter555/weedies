"use client";

import React, { useContext, useState } from "react";

import { AuthContext } from "@/context/auth-context";
import { CartContext } from "@/context/cart/cart-context";
import { useMediaQuery, useTheme } from "@mui/material";
import CardMedia from "@mui/material/CardMedia";
import Grid2 from "@mui/material/Grid2";
import Stack from "@mui/material/Stack";

import CartModal from "../Cart/CartModal";
import Header from "./Header";

const MainNavigation = () => {
  const auth = useContext(AuthContext);
  const cart = useContext(CartContext);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.down("md"));
  const [openCartModal, setOpenCartModal] = useState<boolean>(false);

  return (
    <Grid2
      container
      sx={{
        flexDirection: { xs: "none", md: "row" },
        justifyContent: { xs: "normal", md: "space-between" },
        alignItems: "center",
        borderBottom: "1px solid #f1f1f1",
      }}
    >
      <CartModal open={openCartModal} onClose={() => setOpenCartModal(false)} />
      <Grid2 sx={{ width: "90%" }}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent={isMobile ? "space-between" : "initial"}
          spacing={5}
          sx={{ width: "100%", marginLeft: 5 }}
        >
          <Stack>
            <CardMedia
              src="mihe_logo.svg"
              alt="mihe-logo"
              component="img"
              sx={{
                width: isMobile ? 100 : 150,
                height: isMobile ? "auto" : 75,
              }}
            />
          </Stack>
          <Stack>
            <Header />
          </Stack>
        </Stack>
      </Grid2>

      {/* <Grid2 size={4}>
        <Stack direction="row" alignItems="center" spacing={3}>
          {!auth.isLoggedIn ? (
            <StyledNextLink route="/signup">
              <StyledText variant="subtitle2">Login/Sign-up</StyledText>
            </StyledNextLink>
          ) : (
            <StyledNextLink route="/signup">
              <StyledText variant="subtitle2">Logout</StyledText>
            </StyledNextLink>
          )}
          <Divider orientation="vertical" flexItem />
          <Chip
            onClick={() => setOpenCartModal((prev) => !prev)}
            component="button"
            clickable
            variant="outlined"
            label={
              <Stack direction="row" spacing={1}>
                <StyledText variant="subtitle1">
                  ${cart.totalPrice.toFixed(2)}
                </StyledText>
                <ShoppingCartIcon />
              </Stack>
            }
          />
        </Stack>
      </Grid2> */}
    </Grid2>
  );
};

export default MainNavigation;
