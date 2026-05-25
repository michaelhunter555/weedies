"use client";

import React, { useEffect, useState } from "react";

import MenuIcon from "@mui/icons-material/Menu";
import { Box, Chip, ListItemIcon } from "@mui/material";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import MenuItem from "@mui/material/MenuItem";
import Link from "next/link";
import useTheme from "@mui/material/styles/useTheme";
import useMediaQuery from "@mui/material/useMediaQuery";

import { useAuth } from "@/context/auth-context";

import { StyledBox, StyledContainer } from "./HeaderStyles";
import { getMainMenuItems } from "./menuItems";

const logoStyle = {
  width: "250px",
  height: "auto",
  cursor: "pointer",
};

type OpenMenuProps = {
  onMobileMenuClick: () => void;
};

const Header = () => {
  const [openDrawer, setOpenDrawer] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [mounted, setMounted] = useState(false);

  const { user, isLoggedIn, hydrated } = useAuth();

  useEffect(() => {
    setMounted(true);
  }, []);

  const effectiveIsMobile = mounted ? isMobile : false;

  const mainMenuItems = getMainMenuItems(
    hydrated && isLoggedIn && user?.id ? { userId: String(user.id) } : undefined,
  );

  // const handleLogout = () => {
  //   auth.logout();
  // };

  const handleOpenMenu = () => {
    setOpenDrawer((prev) => !prev);
  };

  return (
    <StyledContainer isMobile={effectiveIsMobile}>
      {effectiveIsMobile && (
        <IconButton onClick={handleOpenMenu}>
          <MenuIcon />
        </IconButton>
      )}
      {!effectiveIsMobile && (
        <StyledBox>
          <List sx={{ display: "flex", alignItems: "center" }}>
            {mainMenuItems.map((menu) => (
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
                      "&:hover": {
                        color: "#b1b1b1",
                      },
                      fontSize: 14,
                    }}
                  />
                  {menu.icon && <ListItemIcon>{menu.icon}</ListItemIcon>}
                </ListItem>
              </MenuItem>
            ))}
          </List>
        </StyledBox>
      )}

        {effectiveIsMobile && (
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
                    {menu.icon && <ListItemIcon>{menu.icon}</ListItemIcon>}
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
        )}
      
    </StyledContainer>
  );
};

export default Header;
