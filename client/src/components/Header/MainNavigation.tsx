"use client";

import React, { useContext, useEffect, useState } from "react";

import { AuthContext } from "@/context/auth-context";
import { CartContext } from "@/context/cart/cart-context";
import ShoppingBagOutlinedIcon from "@mui/icons-material/ShoppingBagOutlined";
import { Badge, Box, Button, Container, IconButton, Typography, useMediaQuery, useTheme } from "@mui/material";
import Stack from "@mui/material/Stack";

import CartModal from "../Cart/CartModal";
import Header from "./Header";
import { useRouter } from "next/navigation";
import ParkIcon from "@mui/icons-material/Park";

const MainNavigation = () => {
  const router = useRouter();
  const auth = useContext(AuthContext);
  const cart = useContext(CartContext);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.down("md"));
  const [openCartModal, setOpenCartModal] = useState<boolean>(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const effectiveIsMobile = mounted ? isMobile : false;
  const effectiveIsTablet = mounted ? isTablet : false;

  return (
    <Box sx={{ borderBottom: "1px solid #f1f1f1" }}>
      <CartModal open={openCartModal} onClose={() => setOpenCartModal(false)} />
      <Container maxWidth="lg" sx={{ py: 1 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
          <Stack direction="row" alignItems="center" spacing={1} onClick={() => router.push("/")} style={{ cursor: "pointer" }}>
            <ParkIcon />
            <Typography variant="h6">The Weedies</Typography>
          </Stack>
          <Stack sx={{ flex: 1, display: "flex", justifyContent: "center" }}>
            <Header />
          </Stack>

          {/* Right-side actions */}
          <Stack direction="row" alignItems="center">
            <Typography variant="subtitle2">$0.00</Typography>
            <IconButton
              aria-label="Open cart"
              onClick={() => setOpenCartModal(true)}
              color="inherit"

            >
              <Badge badgeContent={cart.quantity} color="success">
                <ShoppingBagOutlinedIcon />
              </Badge>
            </IconButton>

            {!effectiveIsMobile && (
              <>
                <Button
                  variant="text"
                  onClick={() => {
                    if (auth.isLoggedIn && auth.user?.id) {
                      router.push(`/my-settings/${auth.user.id}`);
                    } else {
                      router.push("/signup");
                    }
                  }}
                >
                  {auth.isLoggedIn ? "Account" : "Login"}
                </Button>
              </>
            )}
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
};

export default MainNavigation;
