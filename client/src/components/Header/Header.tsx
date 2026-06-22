"use client";

import React, { useEffect, useRef, useState } from "react";

import MenuIcon from "@mui/icons-material/Menu";
import {
  Box,
  Chip,
  ListItemIcon,
  MenuItem,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Link from "next/link";
import useTheme from "@mui/material/styles/useTheme";
import useMediaQuery from "@mui/material/useMediaQuery";

import { useAuth } from "@/context/auth-context";
import { BRAND_PALETTE } from "@/theme/brand-palette";

import { StyledBox, StyledContainer } from "./HeaderStyles";
import { discoverFlyoutItems, getMainMenuItems } from "./menuItems";

const HOVER_CLOSE_DELAY_MS = 120;

const Header = () => {
  const [openDrawer, setOpenDrawer] = useState(false);
  const theme = useTheme();
  const isCompactNav = useMediaQuery(theme.breakpoints.down("md"));
  const [mounted, setMounted] = useState(false);
  const [discoverOpen, setDiscoverOpen] = useState(false);
  const discoverCloseTimerRef = useRef<number | null>(null);
  const { user, isLoggedIn, hydrated } = useAuth();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    return () => {
      if (discoverCloseTimerRef.current != null) {
        window.clearTimeout(discoverCloseTimerRef.current);
      }
    };
  }, []);

  const showCompactNav = mounted ? isCompactNav : false;

  const mainMenuItems = getMainMenuItems(
    hydrated && isLoggedIn && user?.id ? { userId: String(user.id) } : undefined,
  );

  const handleOpenMenu = () => {
    setOpenDrawer((prev) => !prev);
  };

  const openDiscoverMenu = () => {
    if (discoverCloseTimerRef.current != null) {
      window.clearTimeout(discoverCloseTimerRef.current);
      discoverCloseTimerRef.current = null;
    }
    setDiscoverOpen(true);
  };

  const scheduleDiscoverClose = () => {
    if (discoverCloseTimerRef.current != null) {
      window.clearTimeout(discoverCloseTimerRef.current);
    }
    discoverCloseTimerRef.current = window.setTimeout(() => {
      setDiscoverOpen(false);
      discoverCloseTimerRef.current = null;
    }, HOVER_CLOSE_DELAY_MS);
  };

  return (
    <StyledContainer compactNav={showCompactNav}>
      {showCompactNav ? (
        <IconButton onClick={handleOpenMenu} aria-label="Open menu">
          <MenuIcon />
        </IconButton>
      ) : (
        <StyledBox sx={{ overflow: "visible" }}>
          <List sx={{ display: "flex", alignItems: "center" }}>
            {mainMenuItems.map((menu) => {
              if (menu.text === "Discover") {
                return (
                  <Box
                    key={menu.href}
                    onMouseEnter={openDiscoverMenu}
                    onMouseLeave={scheduleDiscoverClose}
                    sx={{ position: "relative", display: "inline-flex" }}
                  >
                    <MenuItem
                      component={Link}
                      href={menu.href}
                      sx={{ "&:hover": { backgroundColor: "#fff" } }}
                    >
                      <ListItem>
                        <ListItemText
                          primary={menu.text}
                          sx={{
                            color: "text.secondary",
                            "&:hover": { color: "#b1b1b1" },
                            "& .MuiListItemText-primary": { fontSize: 13 },
                          }}
                        />
                      </ListItem>
                    </MenuItem>

                    {discoverOpen ? (
                      <Paper
                        elevation={0}
                        onMouseEnter={openDiscoverMenu}
                        onMouseLeave={scheduleDiscoverClose}
                        sx={{
                          position: "absolute",
                          top: "100%",
                          left: 0,
                          zIndex: 1300,
                          mt: 0.5,
                          p: 2,
                          width: 420,
                          maxWidth: "calc(100vw - 32px)",
                          borderRadius: 1,
                          border: `1px solid ${BRAND_PALETTE.sage}`,
                          boxShadow: "0 12px 28px rgba(37,52,58,0.12)",
                        }}
                      >
                        <Stack spacing={1.5}>
                          <Typography variant="overline" sx={{ fontWeight: 700, color: BRAND_PALETTE.seafoam }}>
                            Discover
                          </Typography>
                          {discoverFlyoutItems.map((item) => (
                            <Box
                              key={item.href}
                              component={Link}
                              href={item.href}
                              sx={{
                                display: "flex",
                                gap: 1.5,
                                alignItems: "center",
                                textDecoration: "none",
                                color: "inherit",
                                borderRadius: 1,
                                p: 1,
                                "&:hover": { bgcolor: BRAND_PALETTE.mint },
                              }}
                            >
                              {"image" in item && item.image ? (
                                <Box
                                  component="img"
                                  src={item.image}
                                  alt=""
                                  sx={{
                                    width: 72,
                                    height: 72,
                                    flexShrink: 0,
                                    borderRadius: 1,
                                    objectFit: "cover",
                                    border: `1px solid ${BRAND_PALETTE.sage}`,
                                  }}
                                />
                              ) : null}
                              <Stack spacing={0.25} sx={{ minWidth: 0 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: BRAND_PALETTE.charcoal }}>
                                  {item.title}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.45 }}>
                                  {item.description}
                                </Typography>
                              </Stack>
                            </Box>
                          ))}
                        </Stack>
                      </Paper>
                    ) : null}
                  </Box>
                );
              }

              return (
                <MenuItem
                  key={menu.href}
                  component={Link}
                  href={menu.href}
                  sx={{ "&:hover": { backgroundColor: "#fff" } }}
                >
                  <ListItem>
                    <ListItemText
                      primary={menu.text}
                      sx={{
                        color: "text.secondary",
                        "&:hover": { color: "#b1b1b1" },
                        "& .MuiListItemText-primary": { fontSize: 13 },
                      }}
                    />
                    {menu.icon ? <ListItemIcon>{menu.icon}</ListItemIcon> : null}
                  </ListItem>
                </MenuItem>
              );
            })}
          </List>
        </StyledBox>
      )}

      {showCompactNav ? (
        <Drawer open={openDrawer} onClose={handleOpenMenu}>
          <List
            sx={{
              display: "flex",
              alignItems: "center",
              flexDirection: "column",
            }}
          >
            {mainMenuItems.map((menu) => (
              <MenuItem
                key={menu.href}
                component={Link}
                href={menu.href}
                onClick={() => setOpenDrawer(false)}
              >
                <ListItem>
                  <ListItemText
                    primary={menu.text}
                    sx={{
                      color: "text.secondary",
                      "&:hover": {
                        color: "#b1b1b1",
                      },
                      fontSize: 12,
                    }}
                  />
                  {menu.icon ? <ListItemIcon>{menu.icon}</ListItemIcon> : null}
                </ListItem>
              </MenuItem>
            ))}
            {discoverFlyoutItems.map((item) => (
              <MenuItem
                key={item.href}
                component={Link}
                href={item.href}
                onClick={() => setOpenDrawer(false)}
                sx={{ pl: 3 }}
              >
                <ListItem>
                  <ListItemText
                    primary={item.title}
                    secondary={item.description}
                    sx={{ "& .MuiListItemText-primary": { fontSize: 12 } }}
                  />
                </ListItem>
              </MenuItem>
            ))}
            <MenuItem
              component={Link}
              href={
                hydrated && isLoggedIn && user?.id
                  ? `/my-settings/${encodeURIComponent(String(user.id))}`
                  : "/signup"
              }
              onClick={() => setOpenDrawer(false)}
            >
              <ListItem>
                <ListItemText
                  primary={hydrated && isLoggedIn ? "Account" : "Sign in"}
                  sx={{
                    color: "text.secondary",
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                />
              </ListItem>
            </MenuItem>
            <Chip
              clickable
              label="Contact"
              color="primary"
              onClick={() => {
                window.location.href = "/contact-us";
              }}
            />
          </List>
        </Drawer>
      ) : null}
    </StyledContainer>
  );
};

export default Header;
