"use client";

import React, { useContext, useEffect, useState } from "react";

import { AuthContext } from "@/context/auth-context";
import { CartContext } from "@/context/cart/cart-context";
import ShoppingBagOutlinedIcon from "@mui/icons-material/ShoppingBagOutlined";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import AddBoxRoundedIcon from "@mui/icons-material/AddBoxRounded";
import {
  Badge,
  Box,
  Button,
  Container,
  IconButton,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import Stack from "@mui/material/Stack";

import CartModal from "../Cart/CartModal";
import Header from "./Header";
import { useRouter } from "next/navigation";

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
    <Box
      sx={{
        borderBottom: "1px solid #ececec",
        backgroundColor: "#ffffff",
        position: "sticky",
        top: 0,
        zIndex: 1100,
        backdropFilter: "saturate(180%) blur(8px)",
      }}
    >
      <CartModal open={openCartModal} onClose={() => setOpenCartModal(false)} />
      <Container maxWidth="lg" sx={{ py: 1 }}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          spacing={2}
        >
          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            onClick={() => router.push("/")}
            style={{ cursor: "pointer" }}
          >
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: 2,
                background:
                  "linear-gradient(135deg, #7c3aed 0%, #ec4899 60%, #f59e0b 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
              }}
            >
              <AutoAwesomeIcon sx={{ fontSize: 18 }} />
            </Box>
            <Stack direction="column" spacing={0} sx={{ lineHeight: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1 }}>
                VibeStack
              </Typography>
              {!effectiveIsTablet && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ lineHeight: 1 }}
                >
                  marketplace for vibecoded apps
                </Typography>
              )}
            </Stack>
          </Stack>

          <Stack sx={{ flex: 1, display: "flex", justifyContent: "center" }}>
            <Header />
          </Stack>

          {/* Right-side actions */}
          <Stack direction="row" alignItems="center" spacing={1}>
            {!effectiveIsMobile && (
              <Button
                variant="contained"
                size="small"
                startIcon={<AddBoxRoundedIcon />}
                onClick={() => router.push("/products?list=new")}
                sx={{
                  borderRadius: 999,
                  textTransform: "none",
                  background:
                    "linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)",
                  boxShadow: "none",
                  px: 2,
                  "&:hover": {
                    boxShadow: "0 4px 14px rgba(124,58,237,0.35)",
                  },
                }}
              >
                List your app
              </Button>
            )}

            <IconButton
              aria-label="Open library"
              onClick={() => setOpenCartModal(true)}
              color="inherit"
            >
              <Badge badgeContent={cart.quantity} color="secondary">
                <ShoppingBagOutlinedIcon />
              </Badge>
            </IconButton>

            {!effectiveIsMobile && mounted && (
              <Button
                variant="text"
                onClick={() => {
                  if (auth.isLoggedIn && auth.user?.id) {
                    router.push(`/my-settings/${auth.user.id}`);
                  } else {
                    router.push("/signup");
                  }
                }}
                sx={{ textTransform: "none" }}
              >
                {auth.isLoggedIn ? "Account" : "Sign in"}
              </Button>
            )}
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
};

export default MainNavigation;
